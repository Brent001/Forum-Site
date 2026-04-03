/**
 * X Algorithm Home Mixer - Main Pipeline Orchestrator
 * Ported from: home-mixer/src/home_mixer.rs
 * 
 * This is the main ranking pipeline that orchestrates all sources, hydrators, filters, and scorers
 */

import type { PostCandidate, UserContext, PipelineResult, PipelineStats } from './types.js';
import { thunderSource } from './sources/thunder.js';
import { phoenixSource } from './sources/phoenix.js';
import { scoreCandidates, normalizeScore } from './scorers/weighted.js';
import { applyAuthorDiversity } from './scorers/author_diversity.js';
import { applyOONScoring, selectOONPosts, rebalanceOON } from './scorers/oon.js';
import { filterByAge } from './filters/age.js';
import { filterByPreviouslySeen, filterByPreviouslyServed, markAsServed } from './filters/seen.js';
import { filterByMutedKeywords, filterByDuplicates, filterRetweetDuplicates, filterBySocialgraph } from './filters/keywords.js';
import * as params from './params.js';

class HomeMixer {
  /**
   * Main ranking pipeline execution
   * Orchestrates the complete ranking algorithm
   */
  async execute(query: UserContext): Promise<PipelineResult> {
    const startTime = Date.now();
    const stats: PipelineStats = {
      sourceCount: 0,
      afterHydrationCount: 0,
      afterFilterCount: 0,
      afterScoringCount: 0,
      afterSelectionCount: 0,
      totalTimeMs: 0,
      stageTimings: {},
    };

    let candidates: PostCandidate[] = [];

    // ========== STAGE 1: CANDIDATE RETRIEVAL (SOURCES) ==========
    let stageStart = Date.now();
    
    const fetchFromSources = async (): Promise<PostCandidate[]> => {
      const [thunderCandidates, phoenixCandidates] = await Promise.allSettled([
        thunderSource.fetch(query, params.MAX_CANDIDATES),
        phoenixSource.fetch(query, params.MAX_CANDIDATES),
      ]);

      const allCandidates: PostCandidate[] = [];

      // Add in-network posts from Thunder
      if (thunderCandidates.status === 'fulfilled') {
        allCandidates.push(...thunderCandidates.value);
      } else {
        console.error('[HomeMixer] Thunder source failed:', thunderCandidates.reason);
      }

      // Add out-of-network posts from Phoenix
      if (phoenixCandidates.status === 'fulfilled') {
        allCandidates.push(...phoenixCandidates.value);
      } else {
        console.error('[HomeMixer] Phoenix source failed:', phoenixCandidates.reason);
      }

      return allCandidates;
    };

    try {
      candidates = await fetchFromSources();
    } catch (error) {
      console.error('[HomeMixer] Error fetching candidates:', error);
      candidates = [];
    }

    stats.sourceCount = candidates.length;
    stats.stageTimings.sources = Date.now() - stageStart;

    if (candidates.length === 0) {
      console.warn('[HomeMixer] No candidates from any source, attempting fallback...');
      // Last resort: fetch recent posts directly without filters
      try {
        candidates = await phoenixSource.fetch(query, params.FINAL_FEED_SIZE);
      } catch {
        console.error('[HomeMixer] All sources exhausted, returning empty feed');
      }
    }

    // ========== STAGE 2: CANDIDATE HYDRATION ==========
    stageStart = Date.now();
    // Hydrate candidates with additional data if needed
    // In this implementation, data comes pre-hydrated from the database
    stats.afterHydrationCount = candidates.length;
    stats.stageTimings.hydration = Date.now() - stageStart;

    // ========== STAGE 3: FILTERING PIPELINE ==========
    stageStart = Date.now();

    // Filter 1: Age filter (remove old posts)
    let ageResult = filterByAge(candidates, params.MAX_POST_AGE_MS);
    candidates = ageResult.kept;

    // Filter 2: Previously seen (remove posts user has already seen)
    let seenResult = filterByPreviouslySeen(candidates, query.seenIds);
    candidates = seenResult.kept;

    // Filter 3: Previously served (remove posts already in this session)
    let servedResult = filterByPreviouslyServed(candidates, query.servedIds);
    candidates = servedResult.kept;

    // Filter 4: Socialgraph (remove blocked/muted authors)
    let socialgraphResult = filterBySocialgraph(candidates, query.blockedUserIds, query.mutedUserIds);
    candidates = socialgraphResult.kept;

    // Filter 5: Muted keywords
    let keywordResult = filterByMutedKeywords(candidates, query.mutedKeywords);
    candidates = keywordResult.kept;

    // Filter 6: Duplicate detection
    let dedupResult = filterByDuplicates(candidates);
    candidates = dedupResult.kept;

    // Filter 7: Retweet deduplication
    let retweetResult = filterRetweetDuplicates(candidates, 12);
    candidates = retweetResult.kept;

    stats.afterFilterCount = candidates.length;
    stats.stageTimings.filtering = Date.now() - stageStart;

    // ========== STAGE 4: SCORING PIPELINE ==========
    stageStart = Date.now();

    // Score 1: Weighted scoring (combine Phoenix ML scores)
    candidates = scoreCandidates(candidates);

    // Score 2: Author diversity
    candidates = applyAuthorDiversity(candidates);

    // Score 3: Out-of-network balancing
    candidates = applyOONScoring(candidates);

    stats.afterScoringCount = candidates.length;
    stats.stageTimings.scoring = Date.now() - stageStart;

    // ========== STAGE 5: SELECTION ==========
    stageStart = Date.now();

    // Sort by score descending
    candidates.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Select top N posts
    let selected = candidates.slice(0, params.FINAL_FEED_SIZE);

    // Rebalance OON if needed
    if (selected.length > 0) {
      selected = rebalanceOON(selected, 0.1, 0.3);
    }

    stats.afterSelectionCount = selected.length;
    stats.stageTimings.selection = Date.now() - stageStart;

    // Mark selected posts as served in this session
    markAsServed(selected, query.servedIds);

    stats.totalTimeMs = Date.now() - startTime;

    return {
      query,
      selectedCandidates: selected,
      pipelineStats: stats,
    };
  }
}

// Export singleton instance
export const homeMixer = new HomeMixer();

/**
 * Convenience function to execute the full ranking pipeline
 */
export async function rankPosts(query: UserContext): Promise<PostCandidate[]> {
  const result = await homeMixer.execute(query);
  return result.selectedCandidates;
}

/**
 * Debugging/monitoring: Get stats from last execution
 */
export function getLastStats(): PipelineStats | null {
  // This could be extended to track stats across executions
  return null;
}
