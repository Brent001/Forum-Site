/**
 * Weighted Scorer - Combines Phoenix ML predictions into a single composite score
 * This is the core scoring logic from X's ranking algorithm
 * Ported from: home-mixer/scorers/weighted_scorer.rs
 */

import type { PostCandidate } from '../types.js';
import * as params from '../params.js';

/**
 * Apply a weight to a score, defaulting to 0 if score is undefined
 */
function applyWeight(score: number | undefined, weight: number): number {
  return (score ?? 0.0) * weight;
}

/**
 * Determine if video qualifies for VQV (Video Quality View) weight
 */
function vqvWeightEligibility(candidate: PostCandidate): number {
  if (candidate.videoDurationMs && candidate.videoDurationMs > params.MIN_VIDEO_DURATION_MS) {
    return params.VQV_WEIGHT;
  }
  return 0.0;
}

/**
 * Apply score offset/bias term
 */
function offsetScore(score: number): number {
  return (score + params.SCORE_OFFSET) * params.SCORE_SCALE;
}

/**
 * Compute the weighted combination of all Phoenix scores
 * This mirrors the WeightedScorer from the original Rust codebase
 */
export function computeWeightedScore(candidate: PostCandidate): number {
  const scores = candidate.phoenixScores;
  const vqvWeight = vqvWeightEligibility(candidate);

  // Combine all positive and negative signals with their weights
  const combinedScore =
    applyWeight(scores.favoriteScore, params.FAVORITE_WEIGHT) +
    applyWeight(scores.replyScore, params.REPLY_WEIGHT) +
    applyWeight(scores.retweetScore, params.RETWEET_WEIGHT) +
    applyWeight(scores.photoExpandScore, params.PHOTO_EXPAND_WEIGHT) +
    applyWeight(scores.clickScore, params.CLICK_WEIGHT) +
    applyWeight(scores.profileClickScore, params.PROFILE_CLICK_WEIGHT) +
    applyWeight(scores.videoPlayScore, vqvWeight) +
    applyWeight(scores.shareScore, params.SHARE_WEIGHT) +
    applyWeight(scores.shareViaDmScore, params.SHARE_VIA_DM_WEIGHT) +
    applyWeight(scores.shareViaCopyLinkScore, params.SHARE_VIA_COPY_LINK_WEIGHT) +
    applyWeight(scores.dwellScore, params.DWELL_WEIGHT) +
    applyWeight(scores.quoteScore, params.QUOTE_WEIGHT) +
    applyWeight(scores.quotedClickScore, params.QUOTED_CLICK_WEIGHT) +
    applyWeight(scores.dwellTime, params.CONT_DWELL_TIME_WEIGHT) +
    applyWeight(scores.followAuthorScore, params.FOLLOW_AUTHOR_WEIGHT) +
    applyWeight(scores.notInterestedScore, params.NOT_INTERESTED_WEIGHT) +
    applyWeight(scores.blockAuthorScore, params.BLOCK_AUTHOR_WEIGHT) +
    applyWeight(scores.muteAuthorScore, params.MUTE_AUTHOR_WEIGHT) +
    applyWeight(scores.reportScore, params.REPORT_WEIGHT);

  return offsetScore(combinedScore);
}

/**
 * Normalize score based on engagement likelihood
 * Posts with high engagement are ranked higher
 */
export function normalizeScore(candidate: PostCandidate, weightedScore: number): number {
  // Apply out-of-network penalty if post is from outside user's network
  if (!candidate.inNetwork) {
    return weightedScore * params.OON_SCORE_MULTIPLIER;
  }
  return weightedScore;
}

/**
 * Apply final score to candidate
 */
export function scoreCandidate(candidate: PostCandidate): PostCandidate {
  const weightedScore = computeWeightedScore(candidate);
  const finalScore = normalizeScore(candidate, weightedScore);

  return {
    ...candidate,
    weightedScore,
    score: finalScore,
  };
}

/**
 * Score multiple candidates (batch operation)
 */
export function scoreCandidates(candidates: PostCandidate[]): PostCandidate[] {
  return candidates.map(scoreCandidate);
}
