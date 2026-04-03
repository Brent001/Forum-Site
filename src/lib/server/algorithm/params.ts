/**
 * X Algorithm Parameters - TypeScript Port
 * Algorithmic weights and thresholds from the original Rust implementation
 */

// ============ POSITIVE ENGAGEMENT WEIGHTS ============
export const FAVORITE_WEIGHT = 0.5;
export const REPLY_WEIGHT = 1.0;           // Replies are the strongest positive signal
export const RETWEET_WEIGHT = 0.5;
export const QUOTE_WEIGHT = 0.5;
export const QUOTED_CLICK_WEIGHT = 0.3;
export const CLICK_WEIGHT = 0.2;
export const PROFILE_CLICK_WEIGHT = 0.2;
export const SHARE_WEIGHT = 0.3;
export const SHARE_VIA_DM_WEIGHT = 0.3;    // DM share is a strong signal
export const SHARE_VIA_COPY_LINK_WEIGHT = 0.1;
export const DWELL_WEIGHT = 0.1;
export const FOLLOW_AUTHOR_WEIGHT = 0.5;
export const PHOTO_EXPAND_WEIGHT = 0.1;
export const VIDEO_PLAY_WEIGHT = 0.15;

// ============ NEGATIVE ENGAGEMENT WEIGHTS ============
export const NOT_INTERESTED_WEIGHT = -0.8;
export const BLOCK_AUTHOR_WEIGHT = -1.0;   // Strongest negative signal
export const MUTE_AUTHOR_WEIGHT = -0.8;
export const REPORT_WEIGHT = -1.0;

// ============ VIDEO QUALITY VIEW (VQV) ============
export const VQV_WEIGHT = 0.5;
export const MIN_VIDEO_DURATION_MS = 2_000;  // 2 seconds minimum

// ============ DWELL TIME (CONTINUOUS ACTION) ============
export const CONT_DWELL_TIME_WEIGHT = 0.1;
export const MIN_DWELL_TIME_MS = 500;
export const MAX_DWELL_TIME_MS = 60_000;

// ============ OUT-OF-NETWORK (OON) PENALTY ============
export const OON_SCORE_MULTIPLIER = 0.8;    // OON posts score 20% lower than in-network

// ============ SCORE NORMALIZATION ============
export const SCORE_OFFSET = 0.0;
export const SCORE_SCALE = 1.0;

// ============ AUTHOR DIVERSITY ============
export const AUTHOR_DIVERSITY_DECAY = 0.75; // Decay factor per repeated author
export const AUTHOR_DIVERSITY_FLOOR = 0.3;  // Floor of decay curve
export const MAX_POSTS_PER_AUTHOR = 3;      // Max posts from single author

// ============ PIPELINE LIMITS ============
export const MAX_CANDIDATES = 1500;         // Max candidates fetched from sources
export const FINAL_FEED_SIZE = 50;          // Final feed size after selection
export const CHUNK_SIZE = 100;              // Processing chunk size
export const MAX_GRPC_MESSAGE_SIZE = 100 * 1024 * 1024; // 100MB

// ============ AGE FILTERS ============
export const MAX_POST_AGE_HOURS = 72;       // Drop posts older than 72 hours
export const MAX_POST_AGE_MS = MAX_POST_AGE_HOURS * 60 * 60 * 1000;

// ============ CACHE SETTINGS ============
export const CACHE_TTL_MINUTES = 1;         // Cache TTL for candidates
export const THUNDER_CACHE_TTL_MS = 60_000; // Thunder source cache

// ============ CANDIDATE HYDRATION ============
export const PHOENIX_REQUEST_TIMEOUT_MS = 30_000;
export const PHOENIX_BATCH_SIZE = 500;

// ============ VISIBILITY FILTERING ============
export const VF_SCORE_THRESHOLD = 0.3;      // Minimum visibility score

// ============ SOCIALGRAPH SETTINGS ============
export const SOCIALGRAPH_FETCH_TIMEOUT_MS = 5_000;

// ============ DUPLICATE DETECTION ============
export const DEDUP_WINDOW_SIZE = 50;        // Check for duplicates in last 50 posts
export const RETWEET_DEDUP_WINDOW = 12;     // Hours to check for duplicate retweets

// Helper function to get all params as an object
export function getAllParams() {
  return {
    // Positive weights
    FAVORITE_WEIGHT,
    REPLY_WEIGHT,
    RETWEET_WEIGHT,
    QUOTE_WEIGHT,
    QUOTED_CLICK_WEIGHT,
    CLICK_WEIGHT,
    PROFILE_CLICK_WEIGHT,
    SHARE_WEIGHT,
    SHARE_VIA_DM_WEIGHT,
    SHARE_VIA_COPY_LINK_WEIGHT,
    DWELL_WEIGHT,
    FOLLOW_AUTHOR_WEIGHT,
    PHOTO_EXPAND_WEIGHT,
    VIDEO_PLAY_WEIGHT,
    // Negative weights
    NOT_INTERESTED_WEIGHT,
    BLOCK_AUTHOR_WEIGHT,
    MUTE_AUTHOR_WEIGHT,
    REPORT_WEIGHT,
    // Video and dwell
    VQV_WEIGHT,
    MIN_VIDEO_DURATION_MS,
    CONT_DWELL_TIME_WEIGHT,
    MIN_DWELL_TIME_MS,
    MAX_DWELL_TIME_MS,
    // OON and diversity
    OON_SCORE_MULTIPLIER,
    AUTHOR_DIVERSITY_DECAY,
    AUTHOR_DIVERSITY_FLOOR,
    MAX_POSTS_PER_AUTHOR,
    // Limits
    MAX_CANDIDATES,
    FINAL_FEED_SIZE,
    CHUNK_SIZE,
    MAX_GRPC_MESSAGE_SIZE,
    // Age
    MAX_POST_AGE_HOURS,
    MAX_POST_AGE_MS,
    // Cache
    CACHE_TTL_MINUTES,
    THUNDER_CACHE_TTL_MS,
    // Timeouts
    PHOENIX_REQUEST_TIMEOUT_MS,
    PHOENIX_BATCH_SIZE,
    VF_SCORE_THRESHOLD,
    SOCIALGRAPH_FETCH_TIMEOUT_MS,
    DEDUP_WINDOW_SIZE,
    RETWEET_DEDUP_WINDOW,
  };
}
