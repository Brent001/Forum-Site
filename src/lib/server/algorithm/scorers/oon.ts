/**
 * Out-of-Network (OON) Scorer - Balance in-network vs out-of-network posts
 * Ported from: home-mixer/scorers/oon_scorer.rs
 */

import type { PostCandidate } from '../types.js';
import * as params from '../params.js';

/**
 * Apply OON scoring adjustment
 * Out-of-network posts get slightly lower scores to prioritize in-network content
 * but still show good OON content for discovery
 */
export function applyOONScoring(candidates: PostCandidate[]): PostCandidate[] {
  return candidates.map((candidate) => {
    if (!candidate.inNetwork) {
      return {
        ...candidate,
        score: (candidate.score ?? 0) * params.OON_SCORE_MULTIPLIER,
      };
    }
    return candidate;
  });
}

/**
 * Calculate the optimal ratio of in-network to out-of-network posts
 * Returns indices of OON posts that should be included in final feed
 */
export function selectOONPosts(
  candidates: PostCandidate[],
  targetFeedSize: number,
  targetOONRatio: number = 0.2 // 20% OON by default
): PostCandidate[] {
  const inNetworkPosts = candidates.filter((c) => c.inNetwork);
  const oonPosts = candidates.filter((c) => !c.inNetwork);

  const targetInNetworkCount = Math.floor(targetFeedSize * (1 - targetOONRatio));
  const targetOONCount = targetFeedSize - targetInNetworkCount;

  // Sort each group by score descending
  inNetworkPosts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  oonPosts.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // Take top N from each group
  const selectedInNetwork = inNetworkPosts.slice(0, targetInNetworkCount);
  const selectedOON = oonPosts.slice(0, targetOONCount);

  // Merge back together
  return [...selectedInNetwork, ...selectedOON];
}

/**
 * Get OON statistics for a candidate set
 */
export function getOONStats(candidates: PostCandidate[]) {
  const inNetworkCount = candidates.filter((c) => c.inNetwork).length;
  const oonCount = candidates.filter((c) => !c.inNetwork).length;
  const total = candidates.length;

  const inNetworkAvgScore =
    candidates
      .filter((c) => c.inNetwork)
      .reduce((sum, c) => sum + (c.score ?? 0), 0) / Math.max(1, inNetworkCount) || 0;

  const oonAvgScore =
    candidates
      .filter((c) => !c.inNetwork)
      .reduce((sum, c) => sum + (c.score ?? 0), 0) / Math.max(1, oonCount) || 0;

  return {
    inNetworkCount,
    oonCount,
    inNetworkRatio: inNetworkCount / total,
    oonRatio: oonCount / total,
    inNetworkAvgScore,
    oonAvgScore,
    scoreGap: inNetworkAvgScore - oonAvgScore,
  };
}

/**
 * Rebalance feed if OON ratio is outside acceptable range
 */
export function rebalanceOON(
  candidates: PostCandidate[],
  minOONRatio: number = 0.1,
  maxOONRatio: number = 0.3
): PostCandidate[] {
  const stats = getOONStats(candidates);

  // If OON ratio is within acceptable range, return as is
  if (stats.oonRatio >= minOONRatio && stats.oonRatio <= maxOONRatio) {
    return candidates;
  }

  // Otherwise, rebalance
  const targetRatio = (minOONRatio + maxOONRatio) / 2;
  return selectOONPosts(candidates, candidates.length, targetRatio);
}
