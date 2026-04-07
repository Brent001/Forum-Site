import { and, desc, eq, sql } from 'drizzle-orm';
import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { communityMemberships, communities, posts, users, votes } from '$lib/server/db/schema.js';
import { filterByAge } from '$lib/server/algorithm/filters/age.js';
import { filterByDuplicates } from '$lib/server/algorithm/filters/keywords.js';
import type { PostCandidate } from '$lib/server/algorithm/types.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [community] = await db
		.select({
			id: communities.id,
			name: communities.name,
			displayName: communities.displayName,
			description: communities.description,
			icon: communities.icon,
			banner: communities.banner,
			logoUrl: communities.logoUrl,
			themeColor: communities.themeColor,
			rules: communities.rules,
			nsfw: communities.nsfw,
			requireApproval: communities.requireApproval,
			restrictPosting: communities.restrictPosting,
			hideDiscovery: communities.hideDiscovery,
			archived: communities.archived,
			allowLinks: communities.allowLinks,
			allowMedia: communities.allowMedia,
			allowPolls: communities.allowPolls,
			memberCount: communities.memberCount,
			postCount: communities.postCount,
		})
		.from(communities)
		.where(eq(communities.name, params.community))
		.limit(1);

if (!community) {
	return { community: null, posts: [], joined: false, membershipRole: null, owner: null, isSiteAdmin: false, moderators: [] };
}

// Fetch the community owner
const [ownerRecord] = await db
	.select({
		userId: communityMemberships.userId,
		username: users.username,
		image: users.image,
	})
	.from(communityMemberships)
	.leftJoin(users, eq(users.id, communityMemberships.userId))
	.where(
		and(
			eq(communityMemberships.communityId, community.id),
			eq(communityMemberships.role, 'owner')
		)
	)
	.limit(1);

let joined = false;
let membershipRole: 'owner' | 'moderator' | 'member' | null = null;
let isSiteAdmin = false;

if (locals.user) {
	const [membership] = await db
		.select({
			role: communityMemberships.role,
		})
		.from(communityMemberships)
		.where(
			and(
				eq(communityMemberships.communityId, community.id),
				eq(communityMemberships.userId, locals.user.id)
			)
		)
		.limit(1);

	if (membership) {
		joined = true;
		membershipRole = membership.role as 'owner' | 'moderator' | 'member';
	}

	if (locals.user.isAdmin) {
		isSiteAdmin = true;
	}
}

const communityPosts = await db
	.select({
		id: posts.id,
		title: posts.title,
		body: posts.body,
		type: posts.type,
		linkUrl: posts.linkUrl,
		linkPreview: posts.linkPreview,
		mediaUrls: posts.mediaUrls,
		pollOptions: sql<any>`${posts.pollOptions}`,
		pollVotes: sql<any>`${posts.pollVotes}`,
		pollTotalVotes: posts.pollTotalVotes,
		pollEndsAt: posts.pollEndsAt,
		pollAllowMultiple: posts.pollAllowMultiple,
		pollAllowChange: posts.pollAllowChange,
		communityName: communities.name,
		communityDisplayName: communities.displayName,
		communityIcon: communities.icon,
		upvotes: posts.upvotes,
		downvotes: posts.downvotes,
		score: posts.score,
		commentCount: posts.commentCount,
		createdAt: posts.createdAt,
		isNsfw: posts.isNsfw,
		isSpoiler: posts.isSpoiler,
		isEdited: posts.isEdited,
		flair: posts.flair,
		flairColor: posts.flairColor,
		authorId: posts.userId,
		authorUsername: users.username,
		authorImage: users.image,
		userVote: locals.user ? sql<number>`COALESCE(${votes.value}, 0)` : sql<number>`0`,
	})
	.from(posts)
	.leftJoin(users, eq(users.id, posts.userId))
	.leftJoin(communities, eq(communities.id, posts.communityId))
	.leftJoin(votes, locals.user ? sql`${votes.userId} = ${locals.user.id} AND ${votes.targetId} = ${posts.id} AND ${votes.targetType} = 'post'` : sql`false`)
	.where(eq(posts.communityId, community.id))
	.orderBy(desc(posts.score), desc(posts.createdAt))
	.limit(50);

	// Apply algorithm filters to community posts
	let algorithmCandidates: PostCandidate[] = communityPosts.map((p) => ({
		id: p.id,
		postId: p.id,
		authorId: '', // Not used for community feed
		communityId: community.id,
		communityName: p.communityName ?? undefined,
		tweetText: p.body ?? undefined,
		createdAt: p.createdAt,
		score: Number(p.score || 0),
		phoenixScores: {},
		inNetwork: true,
		seenByUser: false,
		servedBefore: false,
		ancestors: [],
	}));

	// For community feed, just use all posts without aggressive filtering
	const filteredPostIds = new Set(algorithmCandidates.map((c) => c.postId));
	const filteredPosts = communityPosts.filter((p) => filteredPostIds.has(p.id));

	return {
		community: {
			id: community.id,
			name: community.name,
			displayName: community.displayName,
			description: community.description ?? '',
			icon: community.icon ?? '🌐',
			banner: community.banner ?? '',
			logoUrl: community.logoUrl ?? '',
			themeColor: community.themeColor ?? '#4f46e5',
			rules: community.rules ?? [],
			nsfw: community.nsfw ?? false,
			requireApproval: community.requireApproval ?? false,
			restrictPosting: community.restrictPosting ?? false,
			hideDiscovery: community.hideDiscovery ?? false,
			archived: community.archived ?? false,
			allowLinks: community.allowLinks ?? true,
			allowMedia: community.allowMedia ?? true,
			allowPolls: community.allowPolls ?? true,
			memberCount: Number(community.memberCount ?? 0),
			postCount: Number(community.postCount ?? 0),
		},
		owner: ownerRecord ? { username: ownerRecord.username, avatarUrl: ownerRecord.image ?? '' } : null,
		isSiteAdmin,
		joined,
		membershipRole,
		currentUser: locals.user ? { id: locals.user.id, username: locals.user.username, email: locals.user.email } : null,
		posts: filteredPosts.map((post) => ({
	id: post.id,
	title: post.title,
	body: post.body ?? '',
	type: post.type ?? 'text',
	linkUrl: post.linkUrl ?? '',
	linkPreview: post.linkPreview,
	mediaUrls: post.mediaUrls ?? [],
	pollOptions: post.pollOptions as string[] | null,
	pollVotes: post.pollVotes as Record<string, number> | null,
	pollTotalVotes: Number(post.pollTotalVotes ?? 0),
	pollEndsAt: post.pollEndsAt,
	pollAllowMultiple: Boolean(post.pollAllowMultiple),
	pollAllowChange: Boolean(post.pollAllowChange),
	userPollVote: null,
	community: {
		name: post.communityName ?? community.name,
		displayName: post.communityDisplayName ?? community.displayName,
		icon: post.communityIcon ?? community.icon ?? '🌐',
	},
	author: {
		id: post.authorId,
		username: post.authorUsername ?? 'anonymous',
		avatarUrl: post.authorImage ?? '',
	},
	upvotes: Number(post.upvotes ?? 0),
	downvotes: Number(post.downvotes ?? 0),
	score: Number(post.score ?? 0),
	commentCount: Number(post.commentCount ?? 0),
	createdAt: post.createdAt,
	isNsfw: Boolean(post.isNsfw),
	isSpoiler: Boolean(post.isSpoiler),
	isEdited: Boolean(post.isEdited),
	flair: post.flair ?? '',
	flairColor: post.flairColor ?? '#3b82f6',
	userVote: Number(post.userVote ?? 0),
	isBookmarked: false,
})),
};
};
export const actions: Actions = {
	join: async ({ request, params, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();

		const [community] = await db
			.select({ id: communities.id, memberCount: communities.memberCount })
			.from(communities)
			.where(eq(communities.name, params.community))
			.limit(1);

		if (!community) {
			return fail(404, { error: 'Community not found.' });
		}

		const [membership] = await db
			.select({ role: communityMemberships.role })
			.from(communityMemberships)
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, locals.user.id)
				)
			)
			.limit(1);

		if (!membership) {
			await db.insert(communityMemberships).values({
				userId: locals.user.id,
				communityId: community.id,
				role: 'member',
			});

			await db
				.update(communities)
				.set({ memberCount: Number(community.memberCount ?? 0) + 1 })
				.where(eq(communities.id, community.id));
		}

		throw redirect(303, `/c/${params.community}`);
	},
	leave: async ({ params, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const [community] = await db
			.select({ id: communities.id, memberCount: communities.memberCount })
			.from(communities)
			.where(eq(communities.name, params.community))
			.limit(1);

		if (!community) {
			return fail(404, { error: 'Community not found.' });
		}

		const [membership] = await db
			.select({ role: communityMemberships.role })
			.from(communityMemberships)
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, locals.user.id)
				)
			)
			.limit(1);

		if (!membership) {
			return fail(400, { error: 'Not a member.' });
		}

		if (membership.role === 'owner') {
			return fail(400, { error: 'Owner cannot leave their community.' });
		}

		await db
			.delete(communityMemberships)
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, locals.user.id)
				)
			);

		await db
			.update(communities)
			.set({ memberCount: Math.max(0, Number(community.memberCount ?? 0) - 1) })
			.where(eq(communities.id, community.id));

		throw redirect(303, `/c/${params.community}`);
	},
	vote: async ({ request, locals, params }) => {
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