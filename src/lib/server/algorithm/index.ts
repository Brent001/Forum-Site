/**
 * X Algorithm - TypeScript Port
 * Main entry point for the ranking algorithm
 * 
 * Exported from xai-org/x-algorithm (Apache 2.0 License)
 * Ported to TypeScript for SvelteKit integration
 */

// Types
export * from './types.js';

// Parameters
export * from './params.js';

// Scorers
export { computeWeightedScore, normalizeScore, scoreCandidate, scoreCandidates } from './scorers/weighted.js';
export { applyAuthorDiversity, shouldFilterAuthorDiversity, getAuthorDiversityStats } from './scorers/author_diversity.js';
export { applyOONScoring, selectOONPosts, getOONStats, rebalanceOON } from './scorers/oon.js';

// Filters
export { filterByAge, getAgeStats } from './filters/age.js';
export {
  filterByPreviouslySeen,
  filterByPreviouslyServed,
  markAsServed,
  SimpleBloomFilter,
} from './filters/seen.js';
export {
  filterByMutedKeywords,
  filterByDuplicates,
  filterRetweetDuplicates,
  filterBySocialgraph,
  filterSelfPosts,
} from './filters/keywords.js';

// Sources
export { ThunderSource, thunderSource, startThunderMaintenanceLoop } from './sources/thunder.js';

// Main Pipeline
export { homeMixer, rankPosts, getLastStats } from './home_mixer.js';
