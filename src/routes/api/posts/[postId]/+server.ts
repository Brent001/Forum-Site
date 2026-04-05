import { json } from '@sveltejs/kit';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { posts, users, communities, comments, votes } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

/**
 * GET /api/posts/[postId]
 * Get a single post with its comments and replies
 *
 * Query parameters:
 * - sort: 'hot' | 'new' | 'top' | 'old' (default: 'hot')
 * - limit: number (default: 50, max: 100)
 *
 * Response:
 * {
 *   post: { ...post data },
 *   comments: [ ...comment tree ],
 *   community: { ...community data }
 * }
 */
export const GET: RequestHandler = async ({ params, url, locals, request }) => {
	const { postId } = params;
	const sort = (url.searchParams.get('sort') || 'hot') as 'hot' | 'new' | 'top' | 'old';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);

	// Get poll vote from cookie
	const cookies = request.headers.get('cookie') || '';
	const pollCookieKey = `poll_vote_${postId}`;
	let userPollVote: string | null = null;
	
	if (cookies.includes(pollCookieKey)) {
		const cookieValue = cookies.split(pollCookieKey + '=')[1]?.split(';')[0];
		if (cookieValue) {
			userPollVote = cookieValue;
		}
	}

	try {
		// Get the post with author and community info
		const [post] = await db
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
				upvotes: posts.upvotes,
				downvotes: posts.downvotes,
				score: posts.score,
				commentCount: posts.commentCount,
				createdAt: posts.createdAt,
				isNsfw: posts.isNsfw,
				isSpoiler: posts.isSpoiler,
				flair: posts.flair,
				flairColor: posts.flairColor,
				userId: posts.userId,
				communityId: posts.communityId,
				// Author info
				authorUsername: users.username,
				authorImage: users.image,
				// Community info
				communityName: communities.name,
				communityDisplayName: communities.displayName,
				communityIcon: communities.icon,
				// User vote (if authenticated)
				userVote: locals.user ? sql<number>`COALESCE(${votes.value}, 0)` : sql<number>`0`,
			})
			.from(posts)
			.leftJoin(users, eq(users.id, posts.userId))
			.leftJoin(communities, eq(communities.id, posts.communityId))
			.leftJoin(votes, locals.user ? sql`${votes.userId} = ${locals.user.id} AND ${votes.targetId} = ${posts.id} AND ${votes.targetType} = 'post'` : sql`false`)
			.where(eq(posts.id, postId))
			.limit(1);

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		// Get comments with replies (hierarchical structure)
		let orderBy;
		switch (sort) {
			case 'new':
				orderBy = desc(comments.createdAt);
				break;
			case 'top':
				orderBy = desc(comments.score);
				break;
			case 'old':
				orderBy = comments.createdAt;
				break;
			case 'hot':
			default:
				// Hot sort: score / (time + 2)^1.8 (Reddit-style)
				orderBy = sql`${comments.score} / POWER(EXTRACT(EPOCH FROM (NOW() - ${comments.createdAt})) / 3600 + 2, 1.8) DESC`;
				break;
		}

		const commentsData = await db
			.select({
				id: comments.id,
				postId: comments.postId,
				parentCommentId: comments.parentCommentId,
				userId: comments.userId,
				body: comments.body,
				imageUrl: comments.imageUrl,
				gifUrl: comments.gifUrl,
				linkUrl: comments.linkUrl,
				linkTitle: comments.linkTitle,
				path: comments.path,
				depth: comments.depth,
				upvotes: comments.upvotes,
				downvotes: comments.downvotes,
				score: comments.score,
				replyCount: comments.replyCount,
				isDeleted: comments.isDeleted,
				isEdited: comments.isEdited,
				isBestAnswer: comments.isBestAnswer,
				createdAt: comments.createdAt,
				updatedAt: comments.updatedAt,
				// Author info
				authorUsername: users.username,
				authorImage: users.image,
				// User vote (if authenticated)
				userVote: locals.user ? sql<number>`COALESCE(${votes.value}, 0)` : sql<number>`0`,
			})
			.from(comments)
			.leftJoin(users, eq(users.id, comments.userId))
			.leftJoin(votes, locals.user ? sql`${votes.userId} = ${locals.user.id} AND ${votes.targetId} = ${comments.id} AND ${votes.targetType} = 'comment'` : sql`false`)
			.where(and(eq(comments.postId, postId), eq(comments.isDeleted, false)))
			.orderBy(orderBy)
			.limit(limit);

		// Build comment tree structure
		const commentMap = new Map();
		const rootComments: any[] = [];

		// First pass: create comment objects
		for (const comment of commentsData) {
			const commentObj = {
				...comment,
				replies: [],
				author: {
					username: comment.authorUsername || 'anonymous',
					avatarUrl: comment.authorImage || '',
				},
				userVote: comment.userVote || 0,
			};
			commentMap.set(comment.id, commentObj);
		}

		// Second pass: build tree structure
		for (const comment of commentsData) {
			const commentObj = commentMap.get(comment.id);

			if (comment.parentCommentId) {
				// This is a reply
				const parent = commentMap.get(comment.parentCommentId);
				if (parent) {
					parent.replies.push(commentObj);
				}
			} else {
				// This is a root comment
				rootComments.push(commentObj);
			}
		}

		// Sort replies within each comment by score/creation time
		const sortReplies = (comments: any[]) => {
			comments.forEach(comment => {
				if (comment.replies.length > 0) {
					comment.replies.sort((a: any, b: any) => b.score - a.score || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
					sortReplies(comment.replies);
				}
			});
		};
		sortReplies(rootComments);

		return json({
			post: {
				id: post.id,
				title: post.title,
				body: post.body,
				type: post.type,
				linkUrl: post.linkUrl,
				linkPreview: post.linkPreview,
				mediaUrls: post.mediaUrls,
				pollOptions: post.pollOptions,
				pollVotes: post.pollVotes as Record<string, number> | null,
				pollTotalVotes: post.pollTotalVotes,
				pollEndsAt: post.pollEndsAt,
				pollAllowMultiple: post.pollAllowMultiple,
				pollAllowChange: post.pollAllowChange,
				userPollVote: userPollVote,
				upvotes: post.upvotes,
				downvotes: post.downvotes,
				score: post.score,
				commentCount: post.commentCount,
				createdAt: post.createdAt,
				isNsfw: post.isNsfw,
				isSpoiler: post.isSpoiler,
				flair: post.flair,
				flairColor: post.flairColor,
				userVote: post.userVote || 0,
				author: {
					username: post.authorUsername || 'anonymous',
					avatarUrl: post.authorImage || '',
				},
				community: {
					name: post.communityName,
					displayName: post.communityDisplayName,
					icon: post.communityIcon,
				},
			},
			comments: rootComments,
			sort,
		});

	} catch (error) {
		console.error('Error fetching post:', error);
		return json({ error: 'Failed to fetch post' }, { status: 500 });
	}
};