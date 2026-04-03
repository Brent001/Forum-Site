/**
 * X Algorithm - TypeScript Port
 * Converted from xai-org/x-algorithm (Apache 2.0 License)
 * https://github.com/xai-org/x-algorithm
 */

/**
 * Phoenix Scores - All 19 action probability outputs from the Phoenix MLR model
 * Mirrors the scoring predictions from X's ranking pipeline
 */
export interface PhoenixScores {
  // Positive engagement signals
  favoriteScore?: number;           // 0: like/fav probability
  replyScore?: number;               // 1: reply probability
  retweetScore?: number;             // 2: retweet probability
  quoteScore?: number;               // 3: quote probability
  quotedClickScore?: number;         // 4: click on quoted tweet
  clickScore?: number;               // 5: general click probability
  profileClickScore?: number;        // 6: profile click probability
  shareScore?: number;               // 7: share/forward probability
  shareViaDmScore?: number;          // 8: DM share probability
  shareViaCopyLinkScore?: number;    // 9: copy link share probability
  dwellScore?: number;               // 10: dwell presence signal
  photoExpandScore?: number;         // 11: image expand probability
  videoPlayScore?: number;           // 12: video play probability
  followAuthorScore?: number;        // 13: follow author probability
  // Negative engagement signals
  notInterestedScore?: number;       // 14: "not interested" probability
  blockAuthorScore?: number;         // 15: block author probability
  muteAuthorScore?: number;          // 16: mute author probability
  reportScore?: number;              // 17: report probability
  // Continuous actions
  dwellTime?: number;                // 18: predicted dwell time (ms)
}

/**
 * Post candidate - represents a post being ranked
 */
export interface PostCandidate {
  id: string;                        // Post ID (UUID)
  postId: string;                    // Alternative post ID field
  authorId: string;                  // Author's user ID
  authorUsername?: string;           // Author's username
  authorFollowersCount?: number;     // Author's follower count
  communityId?: string;              // Community the post belongs to
  communityName?: string;            // Community name
  tweetText?: string;                // Post text/content
  inReplyToPostId?: string;          // If this is a reply
  retweetedPostId?: string;          // If this is a retweet
  retweetedUserId?: string;          // Original tweet author ID
  retweetedScreenName?: string;      // Original author username
  createdAt: Date;                   // Post creation timestamp
  score?: number;                    // Final ranking score
  weightedScore?: number;            // Score after weighted combination
  phoenixScores: PhoenixScores;      // Phoenix ML predictions
  videoDurationMs?: number;          // Video duration in ms
  inNetwork: boolean;                // Is post from followed users
  seenByUser: boolean;               // Has user already seen this post
  servedBefore: boolean;             // Has post been served before
  ancestors: string[];               // Thread ancestors (IDs)
  predictionRequestId?: string;      // Phoenix prediction request ID
  lastScoredAtMs?: number;           // Last scoring timestamp
  visibilityReason?: string;         // Why post is shown (filtering reason)
  subscriptionAuthorId?: string;     // If author is paid subscriber
}

/**
 * User context - information about the user making the request
 */
export interface UserContext {
  userId: string;                    // Current user ID
  userName?: string;                 // Current user's username
  clientAppId?: string;              // Client app ID (mobile, web, etc)
  countryCode?: string;              // User's country
  languageCode?: string;             // User's language
  isBottomRequest: boolean;          // Is this a pagination request
  inNetworkOnly: boolean;            // Only show in-network posts
  seenIds: Set<string>;              // Posts user has already seen
  servedIds: Set<string>;            // Posts already served to user
  followingIds: Set<string>;         // Users this user follows
  joinedCommunityIds: Set<string>;  // Communities user has joined
  blockedUserIds: Set<string>;       // Users this user has blocked
  mutedUserIds: Set<string>;         // Users this user has muted
  mutedKeywords: Set<string>;        // Keywords to filter out
  engagementHistory: EngagementEvent[];
}

/**
 * Engagement event - historical interaction with a post
 */
export interface EngagementEvent {
  postId: string;
  userId: string;
  actionType: 'favorite' | 'retweet' | 'reply' | 'quote' | 'click' | 'dwell' | 'report' | 'block' | 'mute';
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Pipeline execution result
 */
export interface PipelineResult {
  query: UserContext;
  selectedCandidates: PostCandidate[];
  pipelineStats: PipelineStats;
}

/**
 * Pipeline statistics for monitoring
 */
export interface PipelineStats {
  sourceCount: number;
  afterHydrationCount: number;
  afterFilterCount: number;
  afterScoringCount: number;
  afterSelectionCount: number;
  totalTimeMs: number;
  stageTimings: Record<string, number>;
}

/**
 * Filter result - tracks kept and removed candidates
 */
export interface FilterResult {
  kept: PostCandidate[];
  removed: PostCandidate[];
  reason?: string;
}

/**
 * Request query for scoring
 */
export interface ScoredPostsQuery {
  requestId: string;
  userId: string;
  viewerId: string;
  clientAppId?: string;
  countryCode?: string;
  languageCode?: string;
  seenIds: string[];
  servedIds: string[];
  inNetworkOnly: boolean;
  isBottomRequest: boolean;
  bloomFilterEntries: string[];
}
