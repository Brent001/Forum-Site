/**
 * Age Filter - Remove posts older than a specified duration
 * Ported from: home-mixer/filters/age_filter.rs
 */

import type { PostCandidate, FilterResult } from '../types.js';
import * as params from '../params.js';

/**
 * Check if a post is within the acceptable age window
 */
function isWithinAge(post: PostCandidate, maxAgeMs: number = params.MAX_POST_AGE_MS): boolean {
  const now = new Date().getTime();
  const postAge = now - new Date(post.createdAt).getTime();
  return postAge <= maxAgeMs;
}

/**
 * Filter candidates by age
 * Older posts are removed to prioritize fresh content
 */
export function filterByAge(
  candidates: PostCandidate[],
  maxAgeMs: number = params.MAX_POST_AGE_MS
): FilterResult {
  const kept: PostCandidate[] = [];
  const removed: PostCandidate[] = [];

  for (const candidate of candidates) {
    if (isWithinAge(candidate, maxAgeMs)) {
      kept.push(candidate);
    } else {
      removed.push(candidate);
    }
  }

  return {
    kept,
    removed,
    reason: `Age filter (max ${params.MAX_POST_AGE_HOURS}h)`,
  };
}

/**
 * Get age distribution stats for debugging
 */
export function getAgeStats(candidates: PostCandidate[]) {
  const now = new Date().getTime();
  const ages = candidates.map((c) => now - new Date(c.createdAt).getTime());

  if (ages.length === 0) {
    return { minAgeMs: 0, maxAgeMs: 0, avgAgeMs: 0, medianAgeMs: 0 };
  }

  ages.sort((a, b) => a - b);
  const minAgeMs = ages[0];
  const maxAgeMs = ages[ages.length - 1];
  const avgAgeMs = ages.reduce((a, b) => a + b, 0) / ages.length;
  const medianAgeMs = ages[Math.floor(ages.length / 2)];

  return {
    minAgeMs,
    maxAgeMs,
    avgAgeMs,
    medianAgeMs,
    hoursOld: {
      min: minAgeMs / (1000 * 60 * 60),
      max: maxAgeMs / (1000 * 60 * 60),
      avg: avgAgeMs / (1000 * 60 * 60),
      median: medianAgeMs / (1000 * 60 * 60),
    },
  };
}
