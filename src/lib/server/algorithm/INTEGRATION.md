/**
 * X Algorithm Integration Guide
 * How to use the ranking algorithm in your SvelteKit forum
 */

import type { PostCandidate, UserContext, PipelineResult } from './types.js';
import { homeMixer, rankPosts } from './home_mixer.js';

/**
 * ============================================================
 * QUICK START - Using the Algorithm in Your Route Handlers
 * ============================================================
 */

/**
 * Example: In +page.server.ts for the home feed
 * 
 * import { rankPosts } from '$lib/server/algorithm';
 * 
 * export const load: PageServerLoad = async ({ locals }) => {
 *   if (!locals.user) {
 *     // Anonymous user - return fallback feed (in-network only)
 *     return { posts: [] };
 *   }
 * 
 *   // Build user context
 *   const userContext: UserContext = {
 *     userId: locals.user.id,
 *     userName: locals.user.username,
 *     isBottomRequest: false,
 *     inNetworkOnly: false,
 *     seenIds: new Set(), // Load from user session/cache
 *     servedIds: new Set(), // Load from user session/cache
 *     followingIds: new Set(userFollowingIds), // Load from DB
 *     blockedUserIds: new Set(userBlockedIds),
 *     mutedUserIds: new Set(userMutedIds),
 *     mutedKeywords: new Set(userMutedKeywords),
 *     engagementHistory: [],
 *   };
 * 
 *   // Rank posts using algorithm
 *   const rankedPosts = await rankPosts(userContext);
 * 
 *   return {
 *     posts: rankedPosts.map(post => ({
 *       id: post.id,
 *       title: post.tweetText,
 *       author: { id: post.authorId, name: post.authorUsername },
 *       score: post.score || 0,
 *       // ... other fields
 *     }))
 *   };
 * };
 */

/**
 * ============================================================
 * STAGE-BY-STAGE BREAKDOWN
 * ============================================================
 */

/**
 * Stage 1: CANDIDATE RETRIEVAL
 * Fetches posts from all sources (in-network + recommendations)
 * 
 * Sources:
 * - Thunder: In-network posts from followed users
 * - Phoenix: Out-of-network recommendation posts
 */
export async function getCandidates(
  userId: string,
  followingIds: string[],
  limit: number = 1500
): Promise<PostCandidate[]> {
  // This is called internally by the pipeline
  // You can customize candidate sources here
  const candidates: PostCandidate[] = [];

  // Fetch in-network posts
  // await db.select().from(posts).where(inArray(posts.userId, followingIds));

  // Fetch recommended posts (via Phoenix embeddings or alternative)
  // await db.select().from(posts).orderBy(desc(posts.hotScore));

  return candidates;
}

/**
 * Stage 2: HYDRATION
 * Enriches candidates with additional data (author info, engagement scores, etc.)
 */
export function hydrateCandidate(candidate: PostCandidate): PostCandidate {
  // Add author metadata
  // Add engagement history
  // Add visibility metadata
  return candidate;
}

/**
 * Stage 3: FILTERING
 * Progressive filtering to remove posts that shouldn't be shown
 * 
 * Filters in order:
 * 1. Age filter (posts > 72h old)
 * 2. Previously seen (user already viewed)
 * 3. Previously served (already shown in this session)
 * 4. Socialgraph (blocked/muted authors)
 * 5. Muted keywords
 * 6. Duplicate detection
 * 7. Retweet deduplication
 */
export function buildFilterChain(userContext: UserContext) {
  return [
    { name: 'age', removedCount: 0 },
    { name: 'seen', removedCount: 0 },
    { name: 'served', removedCount: 0 },
    { name: 'socialgraph', removedCount: 0 },
    { name: 'keywords', removedCount: 0 },
    { name: 'duplicates', removedCount: 0 },
    { name: 'retweets', removedCount: 0 },
  ];
}

/**
 * Stage 4: SCORING
 * Combines multiple scoring signals into final ranking score
 * 
 * The Phoenix ML model outputs 19 probability scores:
 * - favorite_score: probability user will like
 * - reply_score: probability user will reply
 * - retweet_score: probability user will retweet
 * - etc.
 * 
 * WeightedScorer combines these with configurable weights
 * AuthorDiversityScorer ensures variety of authors
 * OONScorer balances in-network vs recommendations
 */
export function getScoreCombination() {
  return {
    weighted: {
      favoriteWeight: 0.5,
      replyWeight: 1.0, // Replies are strongest signal
      retweetWeight: 0.5,
      // ... other weights
    },
    authorDiversity: {
      decayFactor: 0.75, // 2nd post from same author scores 75% of 1st
      floor: 0.3, // Never go below 30% of score
    },
    oon: {
      multiplier: 0.8, // Out-of-network posts score 80% of in-network
    },
  };
}

/**
 * Stage 5: SELECTION
 * Final ranking and deduplication to prepare feed
 */
export function selectFinalFeed(candidates: PostCandidate[], feedSize: number = 50): PostCandidate[] {
  // Sort by score descending
  candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Take top N
  return candidates.slice(0, feedSize);
}

/**
 * ============================================================
 * ADVANCED - DEBUGGING & MONITORING
 * ============================================================
 */

/**
 * Enable algorithm debugging to see decision-making at each stage
 */
export interface AlgorithmDebugInfo {
  stage: string;
  candidatesIn: number;
  candidatesOut: number;
  reason?: string;
  topScores?: number[];
  timeMs: number;
}

let debugLog: AlgorithmDebugInfo[] = [];

export function getDebugLog(): AlgorithmDebugInfo[] {
  return debugLog;
}

export function clearDebugLog(): void {
  debugLog = [];
}

export function addDebugEntry(entry: AlgorithmDebugInfo): void {
  debugLog.push(entry);
}

/**
 * Export algorithm stats for monitoring
 */
export function exportStats() {
  return {
    stagesRun: debugLog.length,
    totalCandidatesProcessed: debugLog.reduce((sum, log) => sum + log.candidatesIn, 0),
    totalCandidatesRemoved: debugLog.reduce((sum, log) => sum + (log.candidatesIn - log.candidatesOut), 0),
    totalTimeMs: debugLog.reduce((sum, log) => sum + log.timeMs, 0),
    averageTimePerStage: debugLog.reduce((sum, log) => sum + log.timeMs, 0) / debugLog.length,
  };
}

/**
 * ============================================================
 * INTEGRATION WITH +page.server.ts
 * ============================================================
 * 
 * Here's a complete example of how to use the algorithm in your feed page:
 */

/*
import { homeMixer } from '$lib/server/algorithm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    // Fall back to trending posts for anonymous users
    const trendingPosts = await db
      .select()
      .from(posts)
      .orderBy(desc(posts.score))
      .limit(50);
    
    return { posts: trendingPosts };
  }

  // Get user's following list
  const userFollowing = await db
    .select({ userId: communityMemberships.userId })
    .from(communityMemberships)
    .where(eq(communityMemberships.userId, locals.user.id));

  const followingIds = userFollowing.map(f => f.userId);

  // Get user's muted/blocked lists
  const userPreferences = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, locals.user.id));

  // Build context
  const context: UserContext = {
    userId: locals.user.id,
    userName: locals.user.username,
    isBottomRequest: false,
    inNetworkOnly: false,
    seenIds: new Set(cookies.get('seen_posts')?.split(',') || []),
    servedIds: new Set(),
    followingIds: new Set(followingIds),
    blockedUserIds: new Set(userPreferences.blockedUserIds || []),
    mutedUserIds: new Set(userPreferences.mutedUserIds || []),
    mutedKeywords: new Set(userPreferences.mutedKeywords || []),
    engagementHistory: [],
  };

  // Execute ranking pipeline
  const result = await homeMixer.execute(context);

  // Log stats
  console.log(`[Feed] Ranked ${result.selectedCandidates.length} posts in ${result.pipelineStats.totalTimeMs}ms`);
  console.log(`[Feed] Filtering removed ${result.pipelineStats.sourceCount - result.pipelineStats.afterFilterCount} candidates`);

  return {
    posts: result.selectedCandidates,
    stats: result.pipelineStats,
  };
};
*/
