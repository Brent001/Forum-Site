/**
 * Thunder Source - Fetch in-network posts from followed users
 * Ported from: thunder/src/lib.rs and thunder/src/main.rs
 * Mirrors Thunder's in-memory store of user's followed posts
 */

import type { PostCandidate, UserContext } from '../types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, communityMemberships } from '$lib/server/db/schema.js';
import { eq, inArray, desc, gte, and } from 'drizzle-orm';
import * as params from '../params.js';

/**
 * Thunder source configuration
 */
export interface ThunderConfig {
  cacheTTLMs?: number;
  maxCandidates?: number;
}

/**
 * In-memory cache for recently fetched posts
 */
class PostCache {
  cache = new Map<string, { candidates: PostCandidate[]; fetchedAt: number }>();
  private ttlMs: number;

  constructor(ttlMs: number = params.THUNDER_CACHE_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  get(userId: string): PostCandidate[] | null {
    const cached = this.cache.get(userId);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.fetchedAt > this.ttlMs) {
      this.cache.delete(userId);
      return null;
    }

    return cached.candidates;
  }

  set(userId: string, candidates: PostCandidate[]): void {
    this.cache.set(userId, {
      candidates,
      fetchedAt: Date.now(),
    });
  }

  clear(): void {
    this.cache.clear();
  }

  prune(): void {
    const now = Date.now();
    for (const [userId, data] of this.cache.entries()) {
      if (now - data.fetchedAt > this.ttlMs) {
        this.cache.delete(userId);
      }
    }
  }
}

class ThunderSource {
  private cache: PostCache;
  private maxCandidates: number;

  constructor(config: ThunderConfig = {}) {
    this.cache = new PostCache(config.cacheTTLMs);
    this.maxCandidates = config.maxCandidates ?? params.MAX_CANDIDATES;
  }

  /**
   * Fetch in-network posts from the database
   * In-network = posts from users that the current user follows
   */
  async fetch(context: UserContext, limit: number): Promise<PostCandidate[]> {
    // Check cache first
    const cached = this.cache.get(context.userId);
    if (cached) {
      return cached.slice(0, limit);
    }

    // Get user's following list
    const followingIds = Array.from(context.followingIds);

    // If no following, try to get active users from communities user joined
    let useFallback = followingIds.length === 0;
    
    const cutoff = new Date(Date.now() - params.MAX_POST_AGE_MS);

    try {
      let rows: any[];

      if (!useFallback) {
        // Fetch recent posts from followed users
        rows = await db
          .select({
            id: posts.id,
            authorId: posts.userId,
            title: posts.title,
            body: posts.body,
            createdAt: posts.createdAt,
            upvotes: posts.upvotes,
            downvotes: posts.downvotes,
            score: posts.score,
            commentCount: posts.commentCount,
            authorName: users.username,
            authorImage: users.image,
            communityId: posts.communityId,
          })
          .from(posts)
          .innerJoin(users, eq(posts.userId, users.id))
          .where(and(inArray(posts.userId, followingIds), gte(posts.createdAt, cutoff)))
          .orderBy(desc(posts.createdAt))
          .limit(limit);
      } else {
        // Fallback: Fetch popular posts from user's communities (if any)
        // or just popular recent posts
        const communityIds = Array.from(context.joinedCommunityIds || []);
        
        if (communityIds.length > 0) {
          rows = await db
            .select({
              id: posts.id,
              authorId: posts.userId,
              title: posts.title,
              body: posts.body,
              createdAt: posts.createdAt,
              upvotes: posts.upvotes,
              downvotes: posts.downvotes,
              score: posts.score,
              commentCount: posts.commentCount,
              authorName: users.username,
              authorImage: users.image,
              communityId: posts.communityId,
            })
            .from(posts)
            .innerJoin(users, eq(posts.userId, users.id))
            .where(and(inArray(posts.communityId, communityIds), gte(posts.createdAt, cutoff)))
            .orderBy(desc(posts.score), desc(posts.createdAt))
            .limit(limit);
        } else {
          // No communities either, get trending posts
          rows = await db
            .select({
              id: posts.id,
              authorId: posts.userId,
              title: posts.title,
              body: posts.body,
              createdAt: posts.createdAt,
              upvotes: posts.upvotes,
              downvotes: posts.downvotes,
              score: posts.score,
              commentCount: posts.commentCount,
              authorName: users.username,
              authorImage: users.image,
              communityId: posts.communityId,
            })
            .from(posts)
            .innerJoin(users, eq(posts.userId, users.id))
            .where(gte(posts.createdAt, cutoff))
            .orderBy(desc(posts.score), desc(posts.createdAt))
            .limit(limit);
        }
      }

      const candidates: PostCandidate[] = rows.map((row) => ({
        id: row.id,
        postId: row.id,
        authorId: row.authorId,
        authorUsername: row.authorName,
        authorFollowersCount: 0, // Would fetch from users table if needed
        communityId: row.communityId ?? undefined,
        tweetText: row.body ?? undefined,
        createdAt: row.createdAt,
        phoenixScores: {
          favoriteScore: row.upvotes ? row.upvotes * 0.1 : 0,
          replyScore: row.commentCount ? row.commentCount * 0.2 : 0,
        },
        inNetwork: true,
        seenByUser: context.seenIds.has(row.id),
        servedBefore: context.servedIds.has(row.id),
        ancestors: [],
      }));

      // Cache the results
      this.cache.set(context.userId, candidates);

      return candidates;
    } catch (error) {
      console.error('[ThunderSource] Error fetching posts:', error);
      return [];
    }
  }

  /**
   * Clear cache for a specific user or globally
   */
  clearCache(userId?: string): void {
    if (userId) {
      this.cache.cache.delete(userId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Periodic maintenance to clear expired cache entries
   */
  prune(): void {
    this.cache.prune();
  }
}

export { ThunderSource };
export const thunderSource = new ThunderSource();

/**
 * Start periodic pruning of Thunder cache
 */
export function startThunderMaintenanceLoop(intervalMs: number = 5 * 60_000): NodeJS.Timeout {
  return setInterval(() => {
    thunderSource.prune();
  }, intervalMs);
}
