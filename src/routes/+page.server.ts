import { desc, eq, inArray, sql, and } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communityMemberships, communities, posts, users, votes } from '$lib/server/db/schema.js';
import { serverCache, cacheKey } from '$lib/server/cache.js';
import type { PageServerLoad, Actions } from './$types.js';

export const load: PageServerLoad = async ({ locals, cookies, url, parent }) => {
  const cookieString = cookies.toString();
  const parentData = await parent();
  const { siteStats, trendingCommunities } = parentData.home;
  
  const sidebarCommunities = parentData.communities;

  let feedPosts: any[] = [];

  if (locals.user) {
    try {
      const context = await buildUserContext(locals.user.id, cookies, { isBottomRequest: false });
      feedPosts = await rankPostsSimple(context);
      
      if (feedPosts.length === 0) {
        feedPosts = await getTrendingPostsSimple(50);
      }

      if (feedPosts.length > 0) {
        const servedIds = new Set(context.servedIds);
        feedPosts.forEach((p) => servedIds.add(p.id));
        saveServedPostsToCookies(cookies, servedIds);
      }
    } catch (error) {
      console.error('[Home Feed] Error, falling back to trending:', error);
      feedPosts = await getTrendingPostsSimple(50);
    }
  } else {
    feedPosts = await getTrendingPostsSimple(50);
  }

  const authorIds = [...new Set(feedPosts.map((p) => p.authorId))];
  const communityIds = [...new Set(feedPosts.map((p) => p.communityId).filter(Boolean))];

  const [authorRows, communityRows] = await Promise.all([
    authorIds.length > 0 
      ? db.select({ id: users.id, username: users.username, image: users.image }).from(users).where(inArray(users.id, authorIds))
      : Promise.resolve([]),
    communityIds.length > 0
      ? db.select({ id: communities.id, name: communities.name, displayName: communities.displayName, icon: communities.icon }).from(communities).where(inArray(communities.id, communityIds))
      : Promise.resolve([]),
  ]);

  const authorMap = new Map(authorRows.map((u) => [u.id, u]));
  const communityMap = new Map(communityRows.map((c) => [c.id, c]));

  const pollVotes: Record<string, string> = {};
  const postIds = feedPosts.map((p) => p.id);
  postIds.forEach(pid => {
    const cookieKey = `poll_vote_${pid}`;
    if (cookieString.includes(cookieKey)) {
      const match = cookieString.match(new RegExp(cookieKey + '=([^;]+)'));
      if (match) pollVotes[pid] = match[1];
    }
  });

  const postDataRows = postIds.length > 0
    ? await db.select({
        id: posts.id, title: posts.title, type: posts.type, linkUrl: posts.linkUrl, linkPreview: posts.linkPreview,
        mediaUrls: posts.mediaUrls, upvotes: posts.upvotes, downvotes: posts.downvotes, score: posts.score,
        commentCount: posts.commentCount, isNsfw: posts.isNsfw, isSpoiler: posts.isSpoiler, isEdited: posts.isEdited,
        flair: posts.flair, flairColor: posts.flairColor, pollOptions: sql<any>`${posts.pollOptions}`,
        pollVotes: sql<any>`${posts.pollVotes}`, pollTotalVotes: posts.pollTotalVotes, pollEndsAt: posts.pollEndsAt,
        pollAllowMultiple: posts.pollAllowMultiple, pollAllowChange: posts.pollAllowChange,
      }).from(posts).where(inArray(posts.id, postIds))
    : [];

  const postDataMap = new Map(postDataRows.map((p) => [p.id, p]));

  const voteMap = new Map<string, number>();
  if (locals.user && postIds.length > 0) {
    const voteRows = await db
      .select({ targetId: votes.targetId, value: votes.value })
      .from(votes)
      .where(
        and(
          eq(votes.userId, locals.user.id),
          eq(votes.targetType, 'post'),
          inArray(votes.targetId, postIds)
        )
      );

    voteRows.forEach((vote) => voteMap.set(vote.targetId, Number(vote.value ?? 0)));
  }

  return {
    home: {
      siteStats,
      trendingCommunities,
    },
    currentUser: locals.user ? { id: locals.user.id, username: locals.user.username, email: locals.user.email } : null,
    posts: feedPosts.map((post) => {
      const author = authorMap.get(post.authorId);
      const community = communityMap.get(post.communityId || '');
      const postData = postDataMap.get(post.id);

      return {
        id: post.id,
        type: postData?.type ?? 'text',
        title: postData?.title ?? '',
        body: post.tweetText || '',
        mediaUrls: postData?.mediaUrls ?? [],
        linkUrl: postData?.linkUrl ?? '',
        linkPreview: postData?.linkPreview ?? null,
        pollOptions: postData?.pollOptions ?? null,
        pollVotes: (postData?.pollVotes as Record<string, number>) ?? null,
        pollTotalVotes: Number(postData?.pollTotalVotes ?? 0),
        pollEndsAt: postData?.pollEndsAt ?? null,
        pollAllowMultiple: Boolean(postData?.pollAllowMultiple),
        pollAllowChange: Boolean(postData?.pollAllowChange),
        userPollVote: postData?.type === 'poll' ? (pollVotes[post.id] || null) : null,
        author: {
          id: post.authorId,
          username: author?.username ?? 'anonymous',
          avatarUrl: author?.image ?? '',
        },
        community: {
          name: community?.name ?? 'general',
          displayName: community?.displayName ?? 'General',
          icon: community?.icon ?? '🌐',
        },
        upvotes: postData?.upvotes ?? 0,
        downvotes: postData?.downvotes ?? 0,
        score: Math.round(postData?.score ?? post.score ?? 0),
        commentCount: postData?.commentCount ?? 0,
        createdAt: post.createdAt,
        isNsfw: postData?.isNsfw ?? false,
        isSpoiler: postData?.isSpoiler ?? false,
        isEdited: postData?.isEdited ?? false,
        flair: postData?.flair ?? '',
        flairColor: postData?.flairColor ?? '#3b82f6',
        userVote: Number(voteMap.get(post.id) ?? 0),
        isBookmarked: false,
      };
    }),
    communities: sidebarCommunities,
  };
};

async function getTrendingPostsSimple(limit: number): Promise<any[]> {
  const cacheKeyName = cacheKey('posts', 'trending', String(limit));
  const cached = serverCache.get<any[]>(cacheKeyName);
  if (cached) return cached;

  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      createdAt: posts.createdAt,
      score: posts.score,
      userId: posts.userId,
      communityId: posts.communityId,
    })
    .from(posts)
    .orderBy(desc(posts.score), desc(posts.createdAt))
    .limit(limit);

  const postsData = rows.map((p) => ({
    id: p.id,
    postId: p.id,
    authorId: p.userId,
    communityId: p.communityId ?? undefined,
    tweetText: p.body ?? undefined,
    createdAt: p.createdAt,
    score: Number(p.score),
  }));

  serverCache.set(cacheKeyName, postsData, 30);
  return postsData;
}

async function rankPostsSimple(context: any): Promise<any[]> {
  const followingIds = [...(context.followingIds || [])] as string[];
  const communityIds = [...(context.joinedCommunityIds || [])] as string[];
  
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  let rows: any[] = [];
  
  if (followingIds.length > 0) {
    rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        body: posts.body,
        createdAt: posts.createdAt,
        score: posts.score,
        commentCount: posts.commentCount,
        upvotes: posts.upvotes,
        userId: posts.userId,
        communityId: posts.communityId,
      })
      .from(posts)
      .where(inArray(posts.userId, followingIds))
      .orderBy(desc(posts.createdAt))
      .limit(50);
  }
  
  if (rows.length === 0 && communityIds.length > 0) {
    rows = await db
      .select({
        id: posts.id,
        title: posts.title,
        body: posts.body,
        createdAt: posts.createdAt,
        score: posts.score,
        commentCount: posts.commentCount,
        upvotes: posts.upvotes,
        userId: posts.userId,
        communityId: posts.communityId,
      })
      .from(posts)
      .where(inArray(posts.communityId, communityIds))
      .orderBy(desc(posts.score), desc(posts.createdAt))
      .limit(50);
  }
  
  if (rows.length === 0) {
    return getTrendingPostsSimple(50);
  }

  const filtered = rows.filter((p) => !context.seenIds.has(p.id) && !context.servedIds.has(p.id));
  
  return filtered.slice(0, 50).map((p) => ({
    id: p.id,
    postId: p.id,
    authorId: p.userId,
    communityId: p.communityId ?? undefined,
    tweetText: p.body ?? undefined,
    createdAt: p.createdAt,
    score: Number(p.score),
  }));
}

async function buildUserContext(userId: string, cookies: any, options: { isBottomRequest: boolean }) {
  const followingIds = new Set<string>();
  const joinedCommunityIds = new Set<string>();
  const seenIds = new Set<string>();
  const servedIds = new Set<string>();
  const blockedUserIds = new Set<string>();
  const mutedUserIds = new Set<string>();
  const mutedKeywords: string[] = [];

  const memberRows = await db
    .select({ communityId: communityMemberships.communityId })
    .from(communityMemberships)
    .where(eq(communityMemberships.userId, userId));

  for (const row of memberRows) {
    if (row.communityId) joinedCommunityIds.add(row.communityId);
  }

  const cookieHeader = cookies.toString();
  const servedMatch = cookieHeader.match(/served_posts=([^;]+)/);
  if (servedMatch) {
    try {
      const ids = decodeURIComponent(servedMatch[1]).split(',').filter(Boolean);
      ids.forEach((id: string) => servedIds.add(id));
    } catch {}
  }

  return {
    userId,
    followingIds,
    joinedCommunityIds,
    seenIds,
    servedIds,
    blockedUserIds,
    mutedUserIds,
    mutedKeywords,
  };
}

function saveServedPostsToCookies(cookies: any, servedIds: Set<string>): void {
  const value = Array.from(servedIds).slice(0, 500).join(',');
  cookies.set('served_posts', encodeURIComponent(value), { path: '/', maxAge: 3600 * 24 });
}

export const actions: Actions = {
	vote: async ({ request, locals }) => {
		if (!locals.user) {
			return { success: false, error: 'Not authenticated' };
		}

		const form = await request.formData();
		const postId = String(form.get('postId') ?? '');
		const value = Number(form.get('value') ?? 0);

		if (!postId || ![-1, 0, 1].includes(value)) {
			return { success: false, error: 'Invalid vote data' };
		}

		try {
			// Check if user already voted
			const existingVote = await db
				.select()
				.from(votes)
				.where(sql`${votes.userId} = ${locals.user.id} AND ${votes.targetId} = ${postId} AND ${votes.targetType} = 'post'`)
				.limit(1);

			const previousValue = existingVote.length > 0 ? existingVote[0].value : 0;

			if (value === 0) {
				// Remove vote
				if (existingVote.length > 0) {
					await db.delete(votes).where(sql`${votes.userId} = ${locals.user.id} AND ${votes.targetId} = ${postId} AND ${votes.targetType} = 'post'`);
					
					// Update post counts
					if (previousValue === 1) {
						await db.update(posts).set({
							upvotes: sql`${posts.upvotes} - 1`,
							score: sql`${posts.score} - 1`
						}).where(eq(posts.id, postId));
					} else if (previousValue === -1) {
						await db.update(posts).set({
							downvotes: sql`${posts.downvotes} - 1`,
							score: sql`${posts.score} + 1`
						}).where(eq(posts.id, postId));
					}
				}
			} else {
				// Add or update vote
				if (existingVote.length > 0) {
					await db.update(votes).set({ value }).where(sql`${votes.userId} = ${locals.user.id} AND ${votes.targetId} = ${postId} AND ${votes.targetType} = 'post'`);
					
					// Update post counts based on change
					const change = value - previousValue;
					if (change === 2) { // -1 to 1
						await db.update(posts).set({
							upvotes: sql`${posts.upvotes} + 1`,
							downvotes: sql`${posts.downvotes} - 1`,
							score: sql`${posts.score} + 2`
						}).where(eq(posts.id, postId));
					} else if (change === -2) { // 1 to -1
						await db.update(posts).set({
							upvotes: sql`${posts.upvotes} - 1`,
							downvotes: sql`${posts.downvotes} + 1`,
							score: sql`${posts.score} - 2`
						}).where(eq(posts.id, postId));
					} else if (change === 1) { // 0 to 1 or -1 to 0 (but -1 to 0 is handled above)
						await db.update(posts).set({
							upvotes: sql`${posts.upvotes} + 1`,
							score: sql`${posts.score} + 1`
						}).where(eq(posts.id, postId));
					} else if (change === -1) { // 0 to -1 or 1 to 0 (but 1 to 0 is handled above)
						await db.update(posts).set({
							downvotes: sql`${posts.downvotes} + 1`,
							score: sql`${posts.score} - 1`
						}).where(eq(posts.id, postId));
					}
				} else {
					await db.insert(votes).values({
						userId: locals.user.id,
						targetId: postId,
						targetType: 'post',
						value
					});
					
					// Update post counts
					if (value === 1) {
						await db.update(posts).set({
							upvotes: sql`${posts.upvotes} + 1`,
							score: sql`${posts.score} + 1`
						}).where(eq(posts.id, postId));
					} else if (value === -1) {
						await db.update(posts).set({
							downvotes: sql`${posts.downvotes} + 1`,
							score: sql`${posts.score} - 1`
						}).where(eq(posts.id, postId));
					}
				}
			}

			return { success: true };
		} catch (error) {
			console.error('Vote error:', error);
			return { success: false, error: 'Failed to vote' };
		}
	}
};
