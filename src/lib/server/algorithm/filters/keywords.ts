/**
 * Muted Keyword Filter - Filter out posts containing user's muted keywords
 * Ported from: home-mixer/filters/muted_keyword_filter.rs
 */

import type { PostCandidate, FilterResult } from '../types.js';

/**
 * Check if post contains any muted keywords
 */
function containsMutedKeyword(text: string, mutedKeywords: Set<string>): boolean {
  if (mutedKeywords.size === 0) return false;

  const lowerText = text.toLowerCase();

  for (const keyword of mutedKeywords) {
    const lowerKeyword = keyword.toLowerCase();
    if (lowerText.includes(lowerKeyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Filter posts containing muted keywords
 */
export function filterByMutedKeywords(
  candidates: PostCandidate[],
  mutedKeywords: Set<string>
): FilterResult {
  const kept: PostCandidate[] = [];
  const removed: PostCandidate[] = [];

  for (const candidate of candidates) {
    const text = candidate.tweetText || '';
    if (containsMutedKeyword(text, mutedKeywords)) {
      removed.push(candidate);
    } else {
      kept.push(candidate);
    }
  }

  return {
    kept,
    removed,
    reason: 'Muted keyword filter',
  };
}

/**
 * Duplicate Detection Filter - Remove duplicate/retweet chains
 * Ported from: home-mixer/filters/drop_duplicates_filter.rs
 */
export function filterByDuplicates(
  candidates: PostCandidate[],
  dedupWindowSize: number = 50
): FilterResult {
  const kept: PostCandidate[] = [];
  const removed: PostCandidate[] = [];
  const seenPostIds = new Set<string>();
  const seenRetweetIds = new Set<string>();

  for (const candidate of candidates.slice(0, dedupWindowSize)) {
    const postId = candidate.id || candidate.postId;

    // Check if we've already seen this post
    if (seenPostIds.has(postId)) {
      removed.push(candidate);
      continue;
    }

    // Check if we've already seen the retweeted post (if this is a retweet)
    if (candidate.retweetedPostId && seenRetweetIds.has(candidate.retweetedPostId)) {
      removed.push(candidate);
      continue;
    }

    // Also check if a retweet of this post already exists
    if (seenRetweetIds.has(postId)) {
      removed.push(candidate);
      continue;
    }

    seenPostIds.add(postId);
    if (candidate.retweetedPostId) {
      seenRetweetIds.add(candidate.retweetedPostId);
    }

    kept.push(candidate);
  }

  // Add remaining candidates that are outside dedup window
  kept.push(...candidates.slice(dedupWindowSize));

  return {
    kept,
    removed,
    reason: 'Duplicate detection filter',
  };
}

/**
 * Retweet Deduplication Filter - Remove multiple retweets of same post within time window
 * Ported from: home-mixer/filters/retweet_deduplication_filter.rs
 */
export function filterRetweetDuplicates(
  candidates: PostCandidate[],
  windowHours: number = 12
): FilterResult {
  const kept: PostCandidate[] = [];
  const removed: PostCandidate[] = [];
  const seenOriginalPosts = new Map<string, Date>();
  const now = new Date();
  const windowMs = windowHours * 60 * 60 * 1000;

  for (const candidate of candidates) {
    if (!candidate.retweetedPostId) {
      // Not a retweet, always keep
      kept.push(candidate);
      continue;
    }

    const originalPostId = candidate.retweetedPostId;
    const lastSeen = seenOriginalPosts.get(originalPostId);

    if (lastSeen && now.getTime() - lastSeen.getTime() < windowMs) {
      // This is a duplicate retweet within the time window
      removed.push(candidate);
    } else {
      // New retweet or outside time window
      seenOriginalPosts.set(originalPostId, now);
      kept.push(candidate);
    }
  }

  return {
    kept,
    removed,
    reason: `Retweet dedup filter (${windowHours}h window)`,
  };
}

/**
 * Author Socialgraph Filter - Hide posts from blocked/muted authors
 * Ported from: home-mixer/filters/author_socialgraph_filter.rs
 */
export function filterBySocialgraph(
  candidates: PostCandidate[],
  blockedUserIds: Set<string>,
  mutedUserIds: Set<string>
): FilterResult {
  const kept: PostCandidate[] = [];
  const removed: PostCandidate[] = [];

  for (const candidate of candidates) {
    // Check if post is from blocked user
    if (blockedUserIds.has(candidate.authorId)) {
      removed.push(candidate);
      continue;
    }

    // Check if post is from muted user
    if (mutedUserIds.has(candidate.authorId)) {
      removed.push(candidate);
      continue;
    }

    // Check if retweet is from blocked/muted user
    if (candidate.retweetedUserId) {
      if (blockedUserIds.has(candidate.retweetedUserId) || mutedUserIds.has(candidate.retweetedUserId)) {
        removed.push(candidate);
        continue;
      }
    }

    kept.push(candidate);
  }

  return {
    kept,
    removed,
    reason: 'Socialgraph filter (blocked/muted)',
  };
}

/**
 * Self-Post Filter - Hide user's own posts (optional)
 * Ported from: home-mixer/filters/self_tweet_filter.rs
 */
export function filterSelfPosts(candidates: PostCandidate[], userId: string): FilterResult {
  const kept: PostCandidate[] = [];
  const removed: PostCandidate[] = [];

  for (const candidate of candidates) {
    if (candidate.authorId === userId) {
      removed.push(candidate);
    } else {
      kept.push(candidate);
    }
  }

  return {
    kept,
    removed,
    reason: 'Self-post filter',
  };
}
