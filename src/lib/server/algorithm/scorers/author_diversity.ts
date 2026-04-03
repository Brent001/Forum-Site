/**
 * Author Diversity Scorer - Ensure a diverse set of authors in the feed
 * Ported from: home-mixer/scorers/author_diversity_scorer.rs
 */

import type { PostCandidate } from '../types.js';
import * as params from '../params.js';

/**
 * Calculate decay multiplier based on author repetition
 * First post from author gets 1.0x, second gets decay factor, etc.
 */
function calculateMultiplier(position: number): number {
  // multiplier = (1 - floor) * decay^position + floor
  // This ensures we never go below the floor value
  return (1.0 - params.AUTHOR_DIVERSITY_FLOOR) * Math.pow(params.AUTHOR_DIVERSITY_DECAY, position) + params.AUTHOR_DIVERSITY_FLOOR;
}

/**
 * Apply author diversity decay to candidate scores
 * Posts from the same author get progressively lower scores
 */
export function applyAuthorDiversity(candidates: PostCandidate[]): PostCandidate[] {
  // Track how many posts we've seen from each author
  const authorCounts = new Map<string, number>();

  // Create array of (index, candidate) pairs
  const indexed: Array<[number, PostCandidate]> = candidates.map((c, i) => [i, c]);

  // Sort by score descending (highest scored posts first)
  indexed.sort((a, b) => {
    const scoreA = a[1].weightedScore ?? Number.NEGATIVE_INFINITY;
    const scoreB = b[1].weightedScore ?? Number.NEGATIVE_INFINITY;
    return scoreB - scoreA;
  });

  // Apply diversity multipliers
  const result: PostCandidate[] = Array(candidates.length);

  for (const [originalIdx, candidate] of indexed) {
    const authorId = candidate.authorId;

    // Get current count for this author (0 if first post)
    const position = authorCounts.get(authorId) ?? 0;
    authorCounts.set(authorId, position + 1);

    // Calculate adjusted score with diversity decay
    const multiplier = calculateMultiplier(position);
    const adjustedScore = (candidate.score ?? 0) * multiplier;

    // Store adjusted candidate in original position
    result[originalIdx] = {
      ...candidate,
      score: adjustedScore,
    };
  }

  return result;
}

/**
 * Check if an author has exceeded the max posts per author limit
 */
export function shouldFilterAuthorDiversity(
  candidates: PostCandidate[],
  authorId: string,
  maxPostsPerAuthor: number = params.MAX_POSTS_PER_AUTHOR
): boolean {
  const count = candidates.filter((c) => c.authorId === authorId).length;
  return count >= maxPostsPerAuthor;
}

/**
 * Get author diversity statistics for a candidate set
 */
export function getAuthorDiversityStats(candidates: PostCandidate[]) {
  const authorCounts = new Map<string, number>();
  let maxAuthorCount = 0;
  let uniqueAuthors = 0;

  for (const candidate of candidates) {
    const count = (authorCounts.get(candidate.authorId) ?? 0) + 1;
    authorCounts.set(candidate.authorId, count);
    maxAuthorCount = Math.max(maxAuthorCount, count);
  }

  uniqueAuthors = authorCounts.size;

  return {
    uniqueAuthors,
    maxAuthorCount,
    averagePostsPerAuthor: candidates.length / uniqueAuthors,
    diversityRatio: uniqueAuthors / candidates.length, // higher = more diverse
  };
}
