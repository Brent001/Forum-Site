# X Algorithm - TypeScript Port for Your Forum

This is a complete TypeScript port of the [X (Twitter) open-source ranking algorithm](https://github.com/xai-org/x-algorithm) (Apache 2.0 License). It powers your forum's feed ranking system.

## 📋 Overview

The algorithm implements X's Home Mixer pipeline - a sophisticated ranking system that:

1. **Retrieves candidates** from multiple sources (in-network, out-of-network recommendations)
2. **Filters** inappropriate/duplicate content
3. **Scores** posts using ML predictions and engagement signals
4. **Ranks** by composite score with diversity weighting
5. **Selects** the top N posts for the feed

## 🏗️ Architecture

```
User Request
    ↓
[SOURCES] → Thunder (in-network), Phoenix (recommendations)
    ↓
[HYDRATORS] → Enrich with author data, engagement history
    ↓
[FILTERS] → Age, seen posts, blocked users, duplicates, keywords
    ↓
[SCORERS] → WeightedScorer, AuthorDiversity, OON Balancing
    ↓
[SELECTOR] → Top K by score
    ↓
User's Ranked Feed
```

## 📁 File Structure

```
src/lib/server/algorithm/
├── types.ts                 # TypeScript interfaces for the algorithm
├── params.ts                # Algorithmic weights and constants
├── index.ts                 # Main exports
├── home_mixer.ts            # Pipeline orchestrator
├── INTEGRATION.md           # Integration guide
├── scorers/
│   ├── weighted.ts          # WeightedScorer (combines Phoenix ML scores)
│   ├── author_diversity.ts  # AuthorDiversityScorer (ensures variety)
│   └── oon.ts               # OONScorer (in-network vs recommendations)
├── filters/
│   ├── age.ts               # AgeFilter (removes old posts)
│   ├── seen.ts              # PreviouslySeenFilter & ServedFilter
│   └── keywords.ts          # Dedup, keyword mute, socialgraph filters
├── sources/
│   └── thunder.ts           # Thunder source (in-network candidate retrieval)
└── hydrators/               # (Placeholder for future enrichment)
```

## 🎯 Quick Integration

### 1. In your home feed route handler (`+page.server.ts`):

```typescript
import { rankPosts } from '$lib/server/algorithm';
import type { UserContext } from '$lib/server/algorithm/types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    // Anonymous user - return trending feed
    return { posts: [] };
  }

  // Build user context
  const context: UserContext = {
    userId: locals.user.id,
    userName: locals.user.username,
    isBottomRequest: false,
    inNetworkOnly: false,
    seenIds: new Set(/* load from cache */),
    servedIds: new Set(/* load from session */),
    followingIds: new Set(/* load from followers table */),
    blockedUserIds: new Set(/* load from user preferences */),
    mutedUserIds: new Set(/* load from user preferences */),
    mutedKeywords: new Set(/* load from user preferences */),
    engagementHistory: [],
  };

  // Rank posts using the algorithm
  const rankedPosts = await rankPosts(context);

  return { posts: rankedPosts };
};
```

### 2. Store seen posts to avoid repetition:

```typescript
// Save after rendering
const seenPostIds = rankedPosts.map(p => p.id);
cookies.set('seen_posts', seenPostIds.join(','), { path: '/' });
```

## 📊 How Scoring Works

### Weighted Score (WeightedScorer)

Combines 19 different engagement probability signals from the Phoenix ML model:

```
final_score = weight[favorite] * favorite_prob
            + weight[reply] * reply_prob           (reply = strongest signal, weight=1.0)
            + weight[retweet] * retweet_prob
            + weight[quote] * quote_prob
            + weight[click] * click_prob
            + ... (14 more engagement types)
            - penalty[not_interested]              (negative signal)
            - penalty[block_author]                (strongest negative)
            - penalty[mute_author]
            - penalty[report]
```

**Key weights** (from `params.ts`):
- `REPLY_WEIGHT = 1.0` - Replies are the strongest engagement signal
- `FAVORITE_WEIGHT = 0.5` - Likes are important but weaker than replies
- `BLOCK_AUTHOR_WEIGHT = -1.0` - Strongest negative signal
- `OON_SCORE_MULTIPLIER = 0.8` - Out-of-network posts score 20% lower

### Author Diversity

Ensures your feed isn't dominated by one author:

```
position_0_multiplier = 1.0         (first post from author)
position_1_multiplier = 0.75        (decay factor = 0.75)
position_2_multiplier = 0.56        (0.75^2)
position_3_multiplier = 0.42        (0.75^3)
... (min floor = 0.3)
```

Posts from repeated authors get progressively lower scores.

### Out-of-Network (OON) Balancing

Balances discovery recommendations with in-network content:

```
20% of feed = out-of-network recommendations
80% of feed = in-network posts from followed users
```

This ratio is tunable in `applyOONScoring()`.

## 🔧 Tuning the Algorithm

Edit `src/lib/server/algorithm/params.ts`:

```typescript
// Increase to favor likes more
export const FAVORITE_WEIGHT = 0.5;  // default

// Increase to emphasize author diversity
export const AUTHOR_DIVERSITY_DECAY = 0.75;  // apply 75% penalty per repeat

// Increase to show more recommendations
export const OON_SCORE_MULTIPLIER = 0.8;     // OON posts 80% of in-network

// Reduce to show older posts
export const MAX_POST_AGE_HOURS = 72;        // default: drop posts > 72h old
```

## 🏃 Pipeline Stages

### Stage 1: Candidate Retrieval (Sources)
- **Thunder Source**: Fetches recent posts from users you follow
- **Default**: ~100-500 posts retrieved
- **Complexity**: O(n) database query

### Stage 2: Candidate Hydration
- Enriches posts with author metadata, visibility scores, etc.
- Currently minimal (data comes pre-hydrated from DB)
- **Complexity**: O(n) parallel lookups

### Stage 3: Filtering
Applied progressively, each removes some candidates:
1. **Age filter**: Remove posts > 72h old
2. **Seen filter**: Remove posts user already viewed
3. **Served filter**: Remove posts shown this session
4. **Socialgraph filter**: Remove blocked/muted authors
5. **Keyword filter**: Remove posts with muted keywords
6. **Duplicate filter**: Remove exact duplicates
7. **Retweet dedup**: Remove multiple retweets of same post

**Output**: ~50-500 posts after all filters
**Complexity**: O(n) - each filter is linear

### Stage 4: Scoring
1. **WeightedScorer**: Combine 19 ML scores into one score
2. **AuthorDiversityScorer**: Decay scores for repeated authors
3. **OONScorer**: Lower scores for out-of-network posts

**Complexity**: O(n log n) - includes sorting

### Stage 5: Selection
- Sort by final score (descending)
- Take top 50 posts
- Rebalance OON ratio if needed (20% recommendations)

**Output**: ~50 posts for feed
**Complexity**: O(n log n)

## 📈 Monitoring & Debugging

Enable debug logging to see pipeline decisions:

```typescript
import { getDebugLog, exportStats } from '$lib/server/algorithm';

// After ranking:
const stats = exportStats();
console.log(`Ranked ${stats.totalCandidatesProcessed} posts in ${stats.totalTimeMs}ms`);
console.log(`Removed ${stats.totalCandidatesRemoved} candidates through filters`);

const debugLog = getDebugLog();
debugLog.forEach(entry => {
  console.log(`[${entry.stage}] ${entry.candidatesIn} → ${entry.candidatesOut} (${entry.timeMs}ms)`);
});
```

## 🔌 Integration Points

The algorithm integrates with your existing database schema:

- **Posts table**: `id`, `userId`, `createdAt`, `upvotes`, `downvotes`, `score`, `commentCount`
- **Users table**: `id`, `username`, `image`
- **User preferences**: blocking, muting, keyword filters (you may need to add these)

## 🚀 Performance Characteristics

| Stage | Candidates | Time (est) | 
|-------|-----------|-----------|
| Sources | 500 | 100ms |
| Filters | 200 | 50ms |
| Scorers | 200 | 150ms |
| Selection | 50 | 10ms |
| **Total** | **50 posts** | **~310ms** |

## 📝 License

This TypeScript port converts the X Algorithm (Apache 2.0) for use in your forum platform.
Original: https://github.com/xai-org/x-algorithm

## 🔗 References

- [X Algorithm GitHub](https://github.com/xai-org/x-algorithm)
- Original Rust implementation in `../../x-algorithm/`
- Integration guide: `INTEGRATION.md`
