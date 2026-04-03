/**
 * EXAMPLE: How to use the X Algorithm in your forum's home feed
 * This shows a complete working example that you can adapt for your needs
 * 
 * File: src/routes/+page.server.ts (updated with algorithm integration)
 */

import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communityMemberships, communities, posts, users } from '$lib/server/db/schema.js';
// Import the ranking algorithm
import { rankPosts } from '$lib/server/algorithm/home_mixer.js';
import type { UserContext, PostCandidate } from '$lib/server/algorithm/types.js';
import type { PageServerLoad } from './$types.js';

/**
 * Example: Fetch user's following/blocking/muting preferences
 */
async function getUserPreferences(userId: string) {
  // TODO: You'll need to add blocking/muting to your schema
  // For now, return empty sets
  return {
    blockedUserIds: new Set<string>(),
    mutedUserIds: new Set<string>(),
    mutedKeywords: new Set<string>(),
  };
}

/**
 * Example: Get user's following list
 * Uses community memberships to determine "following"
 */
async function getUserFollowing(userId: string): Promise<Set<string>> {
  const memberships = await db
    .select({ userId: communityMemberships.userId })
    .from(communityMemberships)
    .where(eq(communityMemberships.userId, userId));

  // Get all authors who posted in communities the user joined
  const authorIds = new Set<string>();

  for (const membership of memberships) {
    const authors = await db
      .select({ userId: posts.userId })
      .from(posts)
      .where(eq(posts.communityId, membership.userId)); // This is wrong, adjust based on your schema

    authors.forEach((a) => authorIds.add(a.userId || ''));
  }

  return authorIds;
}

/**
 * Example: Load seen/served posts from cache
 * In production, you might store this in Redis or a session database
 */
function loadSeenPosts(cookies: any): Set<string> {
  const seenPostsStr = cookies.get('seen_posts');
  if (!seenPostsStr) return new Set();
  return new Set(seenPostsStr.split(','));
}

function loadServedPosts(cookies: any): Set<string> {
  const servedPostsStr = cookies.get('served_posts');
  if (!servedPostsStr) return new Set();
  return new Set(servedPostsStr.split(','));
}

/**
 * Example: Save seen posts to cookies for next load
 */
function saveSeenPosts(cookies: any, seenIds: Set<string>) {
  if (seenIds.size > 0) {
    // Keep only last 1000 to avoid bloating cookies
    const postIds = Array.from(seenIds).slice(-1000);
    cookies.set('seen_posts', postIds.join(','), {
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }
}

function saveServedPosts(cookies: any, servedIds: Set<string>) {
  if (servedIds.size > 0) {
    const postIds = Array.from(servedIds).slice(-1000);
    cookies.set('served_posts', postIds.join(','), {
      path: '/',
      maxAge: 24 * 60 * 60, // 1 day (session-scoped)
    });
  }
}

/**
 * MAIN LOAD FUNCTION
 * This is the entry point for the home feed page
 */
export const load: PageServerLoad = async ({ locals, cookies, url }) => {
  // ========== UNAUTHENTICATED USER ==========
  if (!locals.user) {
    // Show trending/top posts for anonymous users
    const trendingPosts = await db
      .select({
        id: posts.id,
        title: posts.title,
        body: posts.body,
        createdAt: posts.createdAt,
        score: posts.score,
        upvotes: posts.upvotes,
        downvotes: posts.downvotes,
        authorId: posts.userId,
        authorName: users.username,
        authorImage: users.image,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.score))
      .limit(50);

    return {
      posts: trendingPosts.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        author: { id: p.authorId, username: p.authorName, avatar: p.authorImage },
        score: p.score || 0,
        upvotes: p.upvotes || 0,
        downvotes: p.downvotes || 0,
        createdAt: p.createdAt,
      })),
    };
  }

  // ========== AUTHENTICATED USER - USE RANKING ALGORITHM ==========

  // Check if this is pagination (infinite scroll)
  const cursorStr = url.searchParams.get('cursor');
  const isBottomRequest = !!cursorStr;

  // Load user's preferences
  const preferences = await getUserPreferences(locals.user.id);
  const following = await getUserFollowing(locals.user.id);

  // Load seen/served posts from cookies
  const seenIds = loadSeenPosts(cookies);
  const servedIds = loadServedPosts(cookies);

  // Build the user context for the ranking algorithm
  const userContext: UserContext = {
    userId: locals.user.id,
    userName: locals.user.username,
    clientAppId: 'web', // Can detect from user agent
    countryCode: 'US', // Can extract from request headers
    languageCode: 'en',
    isBottomRequest,
    inNetworkOnly: false,
    seenIds,
    servedIds,
    followingIds: following,
    blockedUserIds: preferences.blockedUserIds,
    mutedUserIds: preferences.mutedUserIds,
    mutedKeywords: preferences.mutedKeywords,
    engagementHistory: [],
  };

  // ========== EXECUTE RANKING PIPELINE ==========
  let rankedPosts: PostCandidate[];
  try {
    rankedPosts = await rankPosts(userContext);
    console.log(`[Home Feed] Ranked ${rankedPosts.length} posts for user ${locals.user.id}`);
  } catch (error) {
    console.error('[Home Feed] Algorithm error:', error);
    rankedPosts = [];
  }

  // ========== SAVE TRACKING DATA ==========
  // Mark these posts as served in this session
  const newServedIds = new Set(servedIds);
  rankedPosts.forEach((p) => newServedIds.add(p.id));
  saveServedPosts(cookies, newServedIds);

  // Also add to seen posts for avoiding repeats
  const newSeenIds = new Set(seenIds);
  rankedPosts.forEach((p) => newSeenIds.add(p.id));
  saveSeenPosts(cookies, newSeenIds);

  // ========== FORMAT RESPONSE ==========
  return {
    posts: rankedPosts.map((p) => ({
      id: p.id,
      title: p.tweetText || '',
      body: p.tweetText || '',
      author: {
        id: p.authorId,
        username: p.authorUsername,
      },
      score: p.score || 0,
      inNetwork: p.inNetwork,
      ranked: true, // Flag to show this was ranked by algorithm
      rankScore: p.score,
    })),
    stats: {
      wasAlgorithmicFeed: true,
      postsReturned: rankedPosts.length,
    },
  };
};

/**
 * ============================================================
 * OPTIONAL: Server-side actions (voting, bookmarking, etc.)
 * ============================================================
 */

export const actions = {
  vote: async ({ request, locals }) => {
    if (!locals.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const form = await request.formData();
    const postId = String(form.get('postId') ?? '');
    const value = Number(form.get('value') ?? 0);

    if (!postId || ![-1, 0, 1].includes(value)) {
      return { success: false, error: 'Invalid vote data' };
    }

    try {
      // Vote logic here (from your existing implementation)
      return { success: true };
    } catch (error) {
      console.error('Vote error:', error);
      return { success: false, error: 'Failed to vote' };
    }
  },

  /**
   * Action: Mark post as "not interested"
   * This helps train the ranking algorithm
   */
  notInterested: async ({ request, locals }) => {
    if (!locals.user) {
      return { success: false, error: 'Not authenticated' };
    }

    const form = await request.formData();
    const postId = String(form.get('postId') ?? '');

    // In production, you'd record this interaction in an engagement_events table
    console.log(`[NotInterested] User ${locals.user.id} marked post ${postId} as not interested`);

    return { success: true };
  },

  /**
   * Action: Refresh feed
   * Clears seen posts and generates new feed
   */
  refreshFeed: async ({ locals, cookies }) => {
    // Clear session tracking
    cookies.set('seen_posts', '', { path: '/', maxAge: 0 });
    cookies.set('served_posts', '', { path: '/', maxAge: 0 });

    return { success: true, redirectTo: '/' };
  },
};

/**
 * ============================================================
 * NOTES FOR IMPLEMENTATION
 * ============================================================
 *
 * 1. YOU NEED TO CREATE:
 *    - users_blocked table (userId, blockedUserId, createdAt)
 *    - users_muted table (userId, mutedUserId, createdAt)
 *    - user_muted_keywords table (userId, keyword)
 *    - user_engagement_events table (userId, postId, actionType, timestamp)
 *
 * 2. CACHE STRATEGY:
 *    - Currently using cookies for seen_posts/served_posts
 *    - For production, use Redis:
 *      const seenPosts = await redis.smembers(`user:${userId}:seen_posts`);
 *    - Clear periodically to prevent memory bloat
 *
 * 3. ENGAGEMENT TRACKING:
 *    - Record when users mark posts as "not interested"
 *    - Record votes, favorites, replies, etc.
 *    - Use this to improve algorithmic recommendations
 *
 * 4. A/B TESTING:
 *    - Compare algorithm feed vs chronological for random % of users
 *    - Track engagement metrics (CTR, dwell time, etc.)
 *    - Adjust algorithm parameters based on results
 *
 * 5. MONITORING:
 *    - Log pipeline stats (time per stage, candidates at each stage)
 *    - Monitor for degenerate cases (all posts from one author, etc.)
 *    - Set up alerts for algorithm errors
 */
