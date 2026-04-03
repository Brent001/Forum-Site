/**
 * Phoenix Source - Trending/Explore posts for content discovery
 * Ported from: home-mixer/src/sources/phoenix_source.rs
 * Provides out-of-network content and trending posts
 */

import type { PostCandidate, UserContext } from '../types.js';
import { db } from '$lib/server/db/index.js';
import { posts, users, communities } from '$lib/server/db/schema.js';
import { eq, inArray, desc, gte, sql, and } from 'drizzle-orm';
import * as params from '../params.js';

export interface PhoenixConfig {
  maxCandidates?: number;
  freshnessHours?: number;
}

export interface TrendingScoreParams {
  decayHours: number;
  gravity: number;
  minScore: number;
}

const DEFAULT_TRENDING_PARAMS: TrendingScoreParams = {
  decayHours: 24,
  gravity: 1.8,
  minScore: 1,
};

class PhoenixSource {
  private maxCandidates: number;
  private freshnessHours: number;

  constructor(config: PhoenixConfig = {}) {
    this.maxCandidates = config.maxCandidates ?? params.MAX_CANDIDATES;
    this.freshnessHours = config.freshnessHours ?? 24;
  }

  /**
   * Fetch trending/recommended posts from the database
   * Phoenix provides out-of-network content for discovery
   */
  async fetch(context: UserContext, limit: number): Promise<PostCandidate[]> {
    const cutoff = new Date(Date.now() - (this.freshnessHours * 60 * 60 * 1000));
    
    // Get community IDs the user has joined (to potentially exclude or weight differently)
    const userCommunityIds = Array.from(context.joinedCommunityIds || []);

    try {
      // Fetch trending posts based on engagement metrics
      // Score = (upvotes + comments * 2) / time_decay
      const rows = await db
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
          communityName: communities.name,
          communityDisplayName: communities.displayName,
        })
        .from(posts)
        .innerJoin(users, eq(posts.userId, users.id))
        .leftJoin(communities, eq(posts.communityId, communities.id))
        .where(
          and(
            gte(posts.createdAt, cutoff),
            // Exclude posts from blocked/muted users
            context.blockedUserIds.size > 0 
              ? sql`${posts.userId} NOT IN ${Array.from(context.blockedUserIds)}`
              : undefined
          )
        )
        .orderBy(desc(posts.score), desc(posts.commentCount), desc(posts.createdAt))
        .limit(limit * 2); // Fetch more to allow filtering

      const candidates: PostCandidate[] = [];
      const seenPostIds = new Set(context.seenIds);
      const servedPostIds = new Set(context.servedIds);
      const blockedAuthors = context.blockedUserIds;
      const mutedAuthors = context.mutedUserIds;

      for (const row of rows) {
        // Skip if already seen or served
        if (seenPostIds.has(row.id) || servedPostIds.has(row.id)) {
          continue;
        }

        // Skip blocked/muted authors
        if (blockedAuthors.has(row.authorId) || mutedAuthors.has(row.authorId)) {
          continue;
        }

        // Check muted keywords
        if (context.mutedKeywords.size > 0) {
          const textLower = ((row.body ?? '') + ' ' + (row.title ?? '')).toLowerCase();
          let hasMutedKeyword = false;
          for (const keyword of context.mutedKeywords) {
            if (textLower.includes(keyword.toLowerCase())) {
              hasMutedKeyword = true;
              break;
            }
          }
          if (hasMutedKeyword) continue;
        }

        // Calculate trending score
        const ageHours = (Date.now() - new Date(row.createdAt).getTime()) / (1000 * 60 * 60);
        const engagementScore = (Number(row.upvotes) || 0) + (Number(row.commentCount) || 0) * 2;
        const trendingScore = engagementScore / Math.pow(ageHours + 2, DEFAULT_TRENDING_PARAMS.gravity);

        // Skip if below minimum trending score
        if (trendingScore < DEFAULT_TRENDING_PARAMS.minScore) {
          continue;
        }

        candidates.push({
          id: row.id,
          postId: row.id,
          authorId: row.authorId,
          authorUsername: row.authorName,
          authorFollowersCount: 0,
          communityId: row.communityId ?? undefined,
          communityName: row.communityName ?? undefined,
          tweetText: row.body ?? undefined,
          createdAt: row.createdAt,
          phoenixScores: {
            favoriteScore: row.upvotes ? Number(row.upvotes) * 0.1 : 0,
            replyScore: row.commentCount ? Number(row.commentCount) * 0.2 : 0,
            clickScore: trendingScore * 0.05,
          },
          inNetwork: false,
          seenByUser: seenPostIds.has(row.id),
          servedBefore: servedPostIds.has(row.id),
          ancestors: [],
          score: trendingScore,
        });

        if (candidates.length >= limit) break;
      }

      // Apply author diversity scoring
      const authorCounts = new Map<string, number>();
      for (const candidate of candidates) {
        const count = authorCounts.get(candidate.authorId) || 0;
        authorCounts.set(candidate.authorId, count + 1);
      }

      // Apply diversity penalty for repeated authors
      for (const candidate of candidates) {
        const authorCount = authorCounts.get(candidate.authorId) || 0;
        if (authorCount > 1) {
          const penalty = Math.pow(params.AUTHOR_DIVERSITY_DECAY, authorCount - 1);
          candidate.score = (candidate.score || 0) * Math.max(penalty, params.AUTHOR_DIVERSITY_FLOOR);
        }
      }

      // Re-sort by score after diversity adjustment
      candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      return candidates;
    } catch (error) {
      console.error('[PhoenixSource] Error fetching posts:', error);
      return [];
    }
  }

  /**
   * Fetch personalized recommendations based on user engagement
   */
  async fetchRecommendations(
    context: UserContext, 
    limit: number,
    engagementHistory?: { postId: string; actionType: string }[]
  ): Promise<PostCandidate[]> {
    // For now, use trending as base
    // In production, would use ML model to score based on engagement history
    return this.fetch(context, limit);
  }
}

export { PhoenixSource };
export const phoenixSource = new PhoenixSource();