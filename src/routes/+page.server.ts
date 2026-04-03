import { desc, eq, gt, sql, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communityMemberships, communities, posts, sessions, users, votes } from '$lib/server/db/schema.js';
import { rankPosts } from '$lib/server/algorithm/home_mixer.js';
import { buildUserContext, markPostsViewed, saveServedPostsToCookies } from '$lib/server/algorithm/utils.js';
import type { UserContext, PostCandidate } from '$lib/server/algorithm/types.js';
import type { PageServerLoad, Actions } from './$types.js';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	const cookieString = cookies.toString();
	
	const [{ totalUsers }] = await db
		.select({ totalUsers: sql`count(*)` })
		.from(users);

	const [{ postsToday }] = await db
		.select({ postsToday: sql`count(*)` })
		.from(posts)
		.where(gt(posts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

	const [{ online }] = await db
		.select({ online: sql`count(*)` })
		.from(sessions)
		.where(gt(sessions.expiresAt, new Date()));

	const trendingCommunities = await db
		.select({
			name: communities.name,
			displayName: communities.displayName,
			icon: communities.icon,
			members: communities.memberCount,
			postCount: communities.postCount,
		})
		.from(communities)
		.orderBy(desc(communities.memberCount))
		.limit(5);

	const sidebarCommunities = await db
		.select({
			id: communities.id,
			name: communities.name,
			displayName: communities.displayName,
			icon: communities.icon,
			members: communities.memberCount,
			postCount: communities.postCount,
		})
		.from(communities)
		.orderBy(desc(communities.memberCount))
		.limit(6);

	let feedPosts: PostCandidate[] = [];
	let context: UserContext | null = null;

	// ========== USE RANKING ALGORITHM FOR AUTHENTICATED USERS ==========
	if (locals.user) {
		try {
			context = await buildUserContext(locals.user.id, cookies, { isBottomRequest: false });
			feedPosts = await rankPosts(context);
			console.log(`[Home Feed] Ranked ${feedPosts.length} posts for user ${locals.user.id}`);

			// If algorithm returns empty, fall back to trending posts
			if (feedPosts.length === 0) {
				console.warn('[Home Feed] Algorithm returned no posts, falling back to trending');
				const trendingFallback = await db
					.select({
						id: posts.id,
						title: posts.title,
						body: posts.body,
						type: posts.type,
						linkUrl: posts.linkUrl,
						linkPreview: posts.linkPreview,
						mediaUrls: posts.mediaUrls,
						createdAt: posts.createdAt,
						score: posts.score,
						upvotes: posts.upvotes,
						downvotes: posts.downvotes,
						commentCount: posts.commentCount,
						userId: posts.userId,
						communityId: posts.communityId,
					})
					.from(posts)
					.orderBy(desc(posts.score), desc(posts.createdAt))
					.limit(50);

				feedPosts = trendingFallback.map((p) => ({
					id: p.id,
					postId: p.id,
					authorId: p.userId,
					communityId: p.communityId ?? undefined,
					tweetText: p.body ?? undefined,
					createdAt: p.createdAt,
					score: Number(p.score),
					phoenixScores: {},
					inNetwork: false,
					seenByUser: context!.seenIds.has(p.id),
					servedBefore: context!.servedIds.has(p.id),
					ancestors: [],
				}));
			}
		} catch (error) {
			console.error('[Home Feed] Algorithm error, falling back to trending:', error);
			// Fallback to trending posts
			context = await buildUserContext(locals.user.id, cookies, { isBottomRequest: false });
			const fallback = await db
				.select({
					id: posts.id,
					title: posts.title,
					body: posts.body,
					type: posts.type,
					linkUrl: posts.linkUrl,
					linkPreview: posts.linkPreview,
					mediaUrls: posts.mediaUrls,
					createdAt: posts.createdAt,
					score: posts.score,
					upvotes: posts.upvotes,
					downvotes: posts.downvotes,
					commentCount: posts.commentCount,
					userId: posts.userId,
					communityId: posts.communityId,
				})
				.from(posts)
				.orderBy(desc(posts.score), desc(posts.createdAt))
				.limit(50);

			feedPosts = fallback.map((p) => ({
				id: p.id,
				postId: p.id,
				authorId: p.userId,
				communityId: p.communityId ?? undefined,
				tweetText: p.body ?? undefined,
				createdAt: p.createdAt,
				score: Number(p.score),
				phoenixScores: {},
				inNetwork: false,
				seenByUser: context!.seenIds.has(p.id),
				servedBefore: context!.servedIds.has(p.id),
				ancestors: [],
			}));
		}

		// Save served posts
		if (feedPosts.length > 0 && context) {
			const servedIds = new Set(context.servedIds);
			feedPosts.forEach((p) => servedIds.add(p.id));
			saveServedPostsToCookies(cookies, servedIds);
		}
	} else {
		// ========== SHOW TRENDING POSTS FOR ANONYMOUS USERS ==========
		const trendingPosts = await db
			.select({
				id: posts.id,
				title: posts.title,
				body: posts.body,
				type: posts.type,
				linkUrl: posts.linkUrl,
				linkPreview: posts.linkPreview,
				mediaUrls: posts.mediaUrls,
				createdAt: posts.createdAt,
				score: posts.score,
				upvotes: posts.upvotes,
				downvotes: posts.downvotes,
				commentCount: posts.commentCount,
				userId: posts.userId,
				communityId: posts.communityId,
			})
			.from(posts)
			.orderBy(desc(posts.score), desc(posts.createdAt))
			.limit(50);

		feedPosts = trendingPosts.map((p) => ({
			id: p.id,
			postId: p.id,
			authorId: p.userId,
			communityId: p.communityId ?? undefined,
			tweetText: p.body ?? undefined,
			createdAt: p.createdAt,
			score: Number(p.score),
			phoenixScores: {},
			inNetwork: false,
			seenByUser: false,
			servedBefore: false,
			ancestors: [],
		}));
	}

	// ========== ENRICH POSTS WITH AUTHOR & COMMUNITY DATA ==========
	const authorIds = [...new Set(feedPosts.map((p) => p.authorId))];
	const communityIds = [...new Set(feedPosts.map((p) => p.communityId).filter((id): id is string => Boolean(id)))];

	const authorMap = new Map(
		(
			await db
				.select({ id: users.id, username: users.username, image: users.image })
				.from(users)
				.where(authorIds.length > 0 ? inArray(users.id, authorIds) : sql`1=0`)
		).map((u) => [u.id, u])
	);

	const communityMap = new Map(
		(
			await db
				.select({ id: communities.id, name: communities.name, displayName: communities.displayName, icon: communities.icon })
				.from(communities)
				.where(communityIds.length > 0 ? inArray(communities.id, communityIds) : sql`1=0`)
		).map((c) => [c.id, c])
	);

	// ========== ENRICH POSTS WITH LINK DATA ==========
	const postIds = feedPosts.map((p) => p.id);
	
	// Get poll votes from cookies
	const pollVotes: Record<string, string> = {};
	if (postIds.length > 0) {
		postIds.forEach(pid => {
			const cookieKey = `poll_vote_${pid}`;
			if (cookieString.includes(cookieKey)) {
				const match = cookieString.match(new RegExp(cookieKey + '=([^;]+)'));
				if (match) {
					pollVotes[pid] = match[1];
				}
			}
		});
	}
	
	const postDataMap = new Map(
		(
			await db
				.select({
					id: posts.id,
					title: posts.title,
					type: posts.type,
					linkUrl: posts.linkUrl,
					linkPreview: posts.linkPreview,
					mediaUrls: posts.mediaUrls,
					upvotes: posts.upvotes,
					downvotes: posts.downvotes,
					score: posts.score,
					commentCount: posts.commentCount,
					isNsfw: posts.isNsfw,
					isSpoiler: posts.isSpoiler,
					flair: posts.flair,
					flairColor: posts.flairColor,
					pollOptions: sql<any>`${posts.pollOptions}`,
					pollVotes: sql<any>`${posts.pollVotes}`,
					pollTotalVotes: posts.pollTotalVotes,
					pollEndsAt: posts.pollEndsAt,
					pollAllowMultiple: posts.pollAllowMultiple,
					pollAllowChange: posts.pollAllowChange,
				})
				.from(posts)
				.where(postIds.length > 0 ? inArray(posts.id, postIds) : sql`1=0`)
		).map((p) => [p.id, p])
	);

	return {
		home: {
			siteStats: {
				members: Number(totalUsers ?? 0),
				postsToday: Number(postsToday ?? 0),
				online: Number(online ?? 0),
			},
			trendingCommunities: trendingCommunities.map((community) => ({
				...community,
				growth: `+${Math.max(0, Math.round((community.postCount ?? 0) / 1000))}%`,
			})),
		},
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
				flair: postData?.flair ?? '',
				flairColor: postData?.flairColor ?? '#3b82f6',
				userVote: 0 as const,
				isBookmarked: false,
			};
		}),
		communities: sidebarCommunities.map((community) => ({
			id: community.id,
			name: community.name,
			displayName: community.displayName,
			icon: community.icon ?? '🌐',
			members: Number(community.members ?? 0),
			postCount: Number(community.postCount ?? 0),
		})),
	};
};

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
