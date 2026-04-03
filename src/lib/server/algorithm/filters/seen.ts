/**
 * Previously Seen Posts Filter - Remove posts the user has already seen
 * Ported from: home-mixer/filters/previously_seen_posts_filter.rs
 */

import type { PostCandidate, FilterResult, UserContext } from '../types.js';

/**
 * Filter out posts the user has already seen
 */
export function filterByPreviouslySeen(
  candidates: PostCandidate[],
  seenIds: Set<string>
): FilterResult {
  const kept: PostCandidate[] = [];
  const removed: PostCandidate[] = [];

  for (const candidate of candidates) {
    if (seenIds.has(candidate.id) || seenIds.has(candidate.postId)) {
      removed.push(candidate);
    } else {
      kept.push(candidate);
    }
  }

  return {
    kept,
    removed,
    reason: 'Previously seen filter',
  };
}

/**
 * Filter out posts that have already been served to the user in this session
 * Ported from: home-mixer/filters/previously_served_posts_filter.rs
 */
export function filterByPreviouslyServed(
  candidates: PostCandidate[],
  servedIds: Set<string>
): FilterResult {
  const kept: PostCandidate[] = [];
  const removed: PostCandidate[] = [];

  for (const candidate of candidates) {
    if (servedIds.has(candidate.id) || servedIds.has(candidate.postId)) {
      removed.push(candidate);
      candidate.seenByUser = true;
      candidate.servedBefore = true;
    } else {
      kept.push(candidate);
    }
  }

  return {
    kept,
    removed,
    reason: 'Previously served filter',
  };
}

/**
 * Mark candidates as seen by updating the set
 */
export function markAsServed(candidates: PostCandidate[], servedIds: Set<string>): void {
  for (const candidate of candidates) {
    servedIds.add(candidate.id);
    servedIds.add(candidate.postId);
    candidate.servedBefore = true;
  }
}

/**
 * Get bloom filter for efficient duplicate checking
 * Simulates Twitter's bloom filter for large-scale dedup
 */
export class SimpleBloomFilter {
  private set: Set<string>;
  private size: number;

  constructor(initialSize: number = 10000) {
    this.set = new Set();
    this.size = initialSize;
  }

  add(item: string): void {
    this.set.add(this.hash(item));
  }

  contains(item: string): boolean {
    return this.set.has(this.hash(item));
  }

  private hash(item: string): string {
    // Simple hash function - in prod would use multiple hash functions
    let hash = 0;
    for (let i = 0; i < item.length; i++) {
      const char = item.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString();
  }

  size_(): number {
    return this.set.size;
  }

  clear(): void {
    this.set.clear();
  }
}
