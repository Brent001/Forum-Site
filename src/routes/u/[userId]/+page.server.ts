import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { users, posts, communities, votes } from '$lib/server/db/schema.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, locals }) => {
	const [user] = await db
		.select({
			id: users.id,
			username: users.username,
			name: users.name,
			image: users.image,
			bio: users.bio,
			website: users.website,
			location: users.location,
			isAdmin: users.isAdmin,
			isModerator: users.isModerator,
			postCount: users.postCount,
			commentCount: users.commentCount,
			followerCount: users.followerCount,
			followingCount: users.followingCount,
			createdAt: users.createdAt,
		})
		.from(users)
		.where(eq(users.username, params.userId))
		.limit(1);

	if (!user) {
		return { user: null, posts: [] };
	}

	// Fetch user's posts
	const userPosts = await db
		.select({
			id: posts.id,
			title: posts.title,
			body: posts.body,
			type: posts.type,
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
			flair: posts.flair,
			flairColor: posts.flairColor,
			mediaUrls: posts.mediaUrls,
			linkUrl: posts.linkUrl,
			linkPreview: posts.linkPreview,
			userVote: locals.user ? sql<number>`COALESCE(${votes.value}, 0)` : sql<number>`0`,
		})
		.from(posts)
		.leftJoin(communities, eq(communities.id, posts.communityId))
		.leftJoin(votes, locals.user ? sql`${votes.userId} = ${locals.user.id} AND ${votes.targetId} = ${posts.id} AND ${votes.targetType} = 'post'` : sql`false`)
		.where(eq(posts.userId, user.id))
		.orderBy(desc(posts.createdAt))
		.limit(20);

	return {
		user: {
			id: user.id,
			username: user.username,
			name: user.name || user.username,
			image: user.image || '',
			bio: user.bio || '',
			website: user.website || '',
			location: user.location || '',
			isAdmin: user.isAdmin,
			isModerator: user.isModerator,
			postCount: Number(user.postCount ?? 0),
			commentCount: Number(user.commentCount ?? 0),
			followerCount: Number(user.followerCount ?? 0),
			followingCount: Number(user.followingCount ?? 0),
			createdAt: user.createdAt,
		},
		isOwnProfile: locals.user?.id === user.id,
		currentUser: locals.user ? { id: locals.user.id, username: locals.user.username } : null,
		posts: userPosts.map((post) => ({
			id: post.id,
			type: post.type,
			title: post.title,
			body: post.body ?? '',
			mediaUrls: post.mediaUrls ?? [],
			linkUrl: post.linkUrl ?? '',
			linkPreview: post.linkPreview ?? null,
			author: {
				username: user.username,
				avatarUrl: user.image || '',
			},
			community: {
				name: post.communityName ?? 'general',
				displayName: post.communityDisplayName ?? 'General',
				icon: post.communityIcon ?? '🌐',
			},
			upvotes: Number(post.upvotes ?? 0),
			downvotes: Number(post.downvotes ?? 0),
			score: Number(post.score ?? 0),
			commentCount: Number(post.commentCount ?? 0),
			createdAt: post.createdAt,
			isNsfw: Boolean(post.isNsfw),
			isSpoiler: Boolean(post.isSpoiler),
			flair: post.flair ?? '',
			flairColor: post.flairColor ?? '#3b82f6',
			userVote: Number(post.userVote ?? 0),
			isBookmarked: false,
		})),
	};
};
