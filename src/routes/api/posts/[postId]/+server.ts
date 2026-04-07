import { json } from '@sveltejs/kit';
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { posts, users, communities, comments, votes, communityMemberships } from '$lib/server/db/schema.js';
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
				isEdited: posts.isEdited,
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
				isEdited: post.isEdited,
				flair: post.flair,
				flairColor: post.flairColor,
				userVote: post.userVote || 0,
				author: {
					id: post.userId,
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

/**
 * DELETE /api/posts/[postId]
 * Delete a post (soft delete)
 * 
 * Permissions: poster, community owner, community moderator, or site admin
 * 
 * Response: { success: true } on success
 * Error: { error: string } on failure
 */
export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { postId } = params;

	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		// Get the post with community info
		const [post] = await db
			.select({
				id: posts.id,
				userId: posts.userId,
				communityId: posts.communityId,
				isDeleted: posts.isDeleted,
			})
			.from(posts)
			.where(eq(posts.id, postId))
			.limit(1);

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		if (post.isDeleted) {
			return json({ error: 'Post already deleted' }, { status: 400 });
		}

		// Check permissions
		let hasPermission = false;

		// 1. Poster can delete their own post
		if (post.userId === locals.user.id) {
			hasPermission = true;
		}

		// 2. Site admin can delete any post
		if (locals.user.isAdmin) {
			hasPermission = true;
		}

		// 3. Community owner/moderator can delete posts in their community
		if (post.communityId && !hasPermission) {
			const [membership] = await db
				.select()
				.from(communityMemberships)
				.where(and(
					eq(communityMemberships.userId, locals.user.id),
					eq(communityMemberships.communityId, post.communityId),
					sql`${communityMemberships.role} IN ('owner', 'moderator')`
				))
				.limit(1);

			if (membership) {
				hasPermission = true;
			}
		}

		if (!hasPermission) {
			return json({ error: 'You do not have permission to delete this post' }, { status: 403 });
		}

		// Soft delete the post
		await db
			.update(posts)
			.set({
				isDeleted: true,
				updatedAt: sql`NOW()`,
			})
			.where(eq(posts.id, postId));

		return json({ success: true });

	} catch (error) {
		console.error('Error deleting post:', error);
		return json({ error: 'Failed to delete post' }, { status: 500 });
	}
};

/**
 * PATCH /api/posts/[postId]
 * Edit a post
 * 
 * Permissions: ONLY the poster can edit their own post
 * 
 * Request body:
 * {
 *   "title": "Updated title",
 *   "body": "Updated body",
 *   "isNsfw": false,
 *   "isSpoiler": false,
 *   "flair": "Updated flair"
 * }
 * 
 * Response: { success: true } on success
 * Error: { error: string } on failure
 */
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	const { postId } = params;

	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		// Get the post
		const [post] = await db
			.select({
				id: posts.id,
				userId: posts.userId,
				isDeleted: posts.isDeleted,
				type: posts.type,
				linkUrl: posts.linkUrl,
				pollOptions: posts.pollOptions,
				pollVotes: posts.pollVotes,
			})
			.from(posts)
			.where(eq(posts.id, postId))
			.limit(1);

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		if (post.isDeleted) {
			return json({ error: 'Cannot edit deleted post' }, { status: 400 });
		}

		// Check permissions: ONLY the poster can edit
		if (post.userId !== locals.user.id) {
			return json({ error: 'You can only edit your own posts' }, { status: 403 });
		}

		// Parse request body
		const body = await request.json();
		const updates: any = {};

		// Validate and prepare updates
		if (body.title !== undefined) {
			if (typeof body.title !== 'string' || body.title.trim().length === 0) {
				return json({ error: 'Title must be a non-empty string' }, { status: 400 });
			}
			updates.title = body.title.trim();
		}

		if (body.body !== undefined) {
			updates.body = body.body === null ? null : String(body.body).trim();
		}

		if (body.isNsfw !== undefined) {
			if (typeof body.isNsfw !== 'boolean') {
				return json({ error: 'isNsfw must be a boolean' }, { status: 400 });
			}
			updates.isNsfw = body.isNsfw;
		}

		if (body.isSpoiler !== undefined) {
			if (typeof body.isSpoiler !== 'boolean') {
				return json({ error: 'isSpoiler must be a boolean' }, { status: 400 });
			}
			updates.isSpoiler = body.isSpoiler;
		}

		if (body.flair !== undefined) {
			updates.flair = body.flair === null ? null : String(body.flair).trim();
		}

		if (body.flairColor !== undefined) {
			updates.flairColor = body.flairColor === null ? null : String(body.flairColor).trim();
		}

		if (body.linkUrl !== undefined) {
			if (body.linkUrl === null || body.linkUrl === '') {
				updates.linkUrl = null;
			} else if (typeof body.linkUrl !== 'string') {
				return json({ error: 'linkUrl must be a string' }, { status: 400 });
			} else {
				const trimmedUrl = body.linkUrl.trim();
				updates.linkUrl = trimmedUrl || null;
				if (trimmedUrl !== (post.linkUrl || '')) {
					updates.linkPreview = null;
				}
			}
		}

		if (body.mediaUrls !== undefined) {
			if (!Array.isArray(body.mediaUrls) || !body.mediaUrls.every((item: any) => typeof item === 'string')) {
				return json({ error: 'mediaUrls must be an array of strings' }, { status: 400 });
			}
			updates.mediaUrls = body.mediaUrls.map((url: string) => url.trim()).filter(Boolean);
		}

		if (body.pollOptions !== undefined) {
			if (!Array.isArray(body.pollOptions) || !body.pollOptions.every((item: any) => typeof item === 'string')) {
				return json({ error: 'pollOptions must be an array of strings' }, { status: 400 });
			}
			const options = body.pollOptions.map((option: string) => option.trim()).filter(Boolean);
			if (post.type === 'poll' && options.length < 2) {
				return json({ error: 'Poll must have at least two options' }, { status: 400 });
			}
			updates.pollOptions = options.length > 0 ? options : null;
			if (post.type === 'poll' && post.pollOptions && post.pollOptions.length !== options.length) {
				updates.pollVotes = null;
				updates.pollTotalVotes = 0;
			}
		}

		if (body.pollEndsAt !== undefined) {
			if (body.pollEndsAt === null || body.pollEndsAt === '') {
				updates.pollEndsAt = null;
			} else if (typeof body.pollEndsAt !== 'string') {
				return json({ error: 'pollEndsAt must be a valid date string or null' }, { status: 400 });
			} else {
				const endsAt = new Date(body.pollEndsAt);
				if (Number.isNaN(endsAt.getTime())) {
					return json({ error: 'pollEndsAt must be a valid date' }, { status: 400 });
				}
				updates.pollEndsAt = endsAt;
			}
		}

		if (body.pollAllowMultiple !== undefined) {
			if (typeof body.pollAllowMultiple !== 'boolean') {
				return json({ error: 'pollAllowMultiple must be a boolean' }, { status: 400 });
			}
			updates.pollAllowMultiple = body.pollAllowMultiple;
		}

		if (body.pollAllowChange !== undefined) {
			if (typeof body.pollAllowChange !== 'boolean') {
				return json({ error: 'pollAllowChange must be a boolean' }, { status: 400 });
			}
			updates.pollAllowChange = body.pollAllowChange;
		}

		if (Object.keys(updates).length === 0) {
			return json({ error: 'No valid updates provided' }, { status: 400 });
		}

		// Add updated timestamp
		updates.updatedAt = sql`NOW()`;

		// Mark as edited
		updates.isEdited = true;

		// Update the post
		await db
			.update(posts)
			.set(updates)
			.where(eq(posts.id, postId));

		return json({ success: true });

	} catch (error) {
		console.error('Error updating post:', error);
		return json({ error: 'Failed to update post' }, { status: 500 });
	}
};