/**
 * Algorithm Integration Utilities
 * Reusable functions for applying the ranking algorithm across all pages
 */

import { db } from '$lib/server/db/index.js';
import { eq, inArray, sql } from 'drizzle-orm';
import { users, communityMemberships, communities, posts } from '$lib/server/db/schema.js';
import type { UserContext, PostCandidate } from './types.js';

/**
 * Load user's blocking and muting preferences
 * TODO: These tables need to be created in your schema
 * For now, return empty sets - can be extended when blocking/muting is implemented
 */
export async function loadUserPreferences(userId: string) {
  // TODO: Query actual blocked/muted users when those features are implemented
  // For now, return empty sets
  return {
    blockedUserIds: new Set<string>(),
    mutedUserIds: new Set<string>(),
    mutedKeywords: new Set<string>(),
  };
}

/**
 * Load user's joined communities
 */
export async function getUserCommunities(userId: string): Promise<Set<string>> {
  try {
    const memberships = await db
      .select({ communityId: communityMemberships.communityId })
      .from(communityMemberships)
      .where(eq(communityMemberships.userId, userId));
    
    return new Set(memberships.map(m => m.communityId));
  } catch (error) {
    console.error('[getUserCommunities] Error:', error);
    return new Set();
  }
}

/**
 * Get user's following list
 * Returns users that the current user follows (from community memberships as proxy)
 */
export async function getUserFollowing(userId: string): Promise<Set<string>> {
  try {
    // Get users who posted in communities the user has joined
    const userCommunities = await getUserCommunities(userId);
    
    if (userCommunities.size === 0) {
      return new Set<string>();
    }

    // Get unique authors from those communities
    const communityIds = Array.from(userCommunities);
    const authors = await db
      .selectDistinct({ authorId: posts.userId })
      .from(posts)
      .where(inArray(posts.communityId, communityIds))
      .limit(500);
    
    return new Set(authors.map(a => a.authorId));
  } catch (error) {
    console.error('[getUserFollowing] Error:', error);
    return new Set();
  }
}

/**
 * Load seen posts from cookies
 */
export function loadSeenPostsFromCookies(cookies: any): Set<string> {
  const seenStr = cookies.get('seen_posts');
  if (!seenStr) return new Set();
  return new Set(seenStr.split(',').filter(Boolean));
}

/**
 * Load served posts from cookies (current session)
 */
export function loadServedPostsFromCookies(cookies: any): Set<string> {
  const servedStr = cookies.get('served_posts');
  if (!servedStr) return new Set();
  return new Set(servedStr.split(',').filter(Boolean));
}

/**
 * Save seen posts to cookies
 */
export function saveSeenPostsToCookies(cookies: any, seenIds: Set<string>) {
  if (seenIds.size > 0) {
    // Keep only last 500 to avoid bloating cookies
    const postIds = Array.from(seenIds).slice(-500).join(',');
    cookies.set('seen_posts', postIds, {
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  }
}

/**
 * Save served posts to cookies (session-scoped)
 */
export function saveServedPostsToCookies(cookies: any, servedIds: Set<string>) {
  if (servedIds.size > 0) {
    const postIds = Array.from(servedIds).slice(-500).join(',');
    cookies.set('served_posts', postIds, {
      path: '/',
      maxAge: 24 * 60 * 60, // 1 day
    });
  }
}

/**
 * Build UserContext for ranking algorithm
 */
export async function buildUserContext(
  userId: string | null,
  cookies: any,
  options: {
    isBottomRequest?: boolean;
    inNetworkOnly?: boolean;
  } = {}
): Promise<UserContext> {
  if (!userId) {
    return {
      userId: 'anonymous',
      isBottomRequest: options.isBottomRequest ?? false,
      inNetworkOnly: options.inNetworkOnly ?? false,
      seenIds: new Set(),
      servedIds: new Set(),
      followingIds: new Set(),
      joinedCommunityIds: new Set(),
      blockedUserIds: new Set(),
      mutedUserIds: new Set(),
      mutedKeywords: new Set(),
      engagementHistory: [],
    };
  }

  const [userRecord] = await db.select({ username: users.username }).from(users).where(eq(users.id, userId)).limit(1);

  const preferences = await loadUserPreferences(userId);
  const following = await getUserFollowing(userId);
  const joinedCommunities = await getUserCommunities(userId);
  const seenIds = loadSeenPostsFromCookies(cookies);
  const servedIds = loadServedPostsFromCookies(cookies);

  return {
    userId,
    userName: userRecord?.username,
    isBottomRequest: options.isBottomRequest ?? false,
    inNetworkOnly: options.inNetworkOnly ?? false,
    seenIds,
    servedIds,
    followingIds: following,
    joinedCommunityIds: joinedCommunities,
    blockedUserIds: preferences.blockedUserIds,
    mutedUserIds: preferences.mutedUserIds,
    mutedKeywords: preferences.mutedKeywords,
    engagementHistory: [],
  };
}

/**
 * Format PostCandidate for Svelte component
 */
export function formatPostForUI(post: PostCandidate) {
  return {
    id: post.id,
    type: 'text',
    title: post.tweetText || '',
    body: post.tweetText || '',
    mediaUrls: [],
    linkUrl: '',
    linkPreview: null,
    author: {
      username: post.authorUsername || 'Anonymous',
      avatarUrl: '',
    },
    community: {
      name: post.communityName || 'general',
      displayName: post.communityName || 'General',
      icon: '🌐',
    },
    upvotes: 0,
    downvotes: 0,
    score: Math.round(post.score || 0),
    commentCount: 0,
    createdAt: post.createdAt,
    isNsfw: false,
    isSpoiler: false,
    flair: '',
    flairColor: '#3b82f6',
    userVote: 0 as const,
    isBookmarked: false,
  };
}

/**
 * Mark posts as viewed
 */
export function markPostsViewed(seenIds: Set<string>, servedIds: Set<string>, postIds: string[]) {
  for (const id of postIds) {
    seenIds.add(id);
    servedIds.add(id);
  }
}
