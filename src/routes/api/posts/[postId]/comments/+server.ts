import { json } from '@sveltejs/kit';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { comments, posts, users, votes } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/posts/[postId]/comments
 * Create a new comment or reply to an existing comment
 *
 * Request body:
 * {
 *   body: string (required, max 10000 chars)
 *   parentCommentId?: string (optional, for replies)
 * }
 *
 * Response:
 * {
 *   comment: { ...comment data },
 *   success: true
 * }
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { postId } = params;

	// Check authentication
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const { body, parentCommentId, imageUrl, gifUrl, linkUrl, linkTitle } = await request.json();

		// Validate input - allow empty body if there's media content
		const hasImage = imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0;
		const hasGif = gifUrl && typeof gifUrl === 'string' && gifUrl.length > 0;
		const hasLink = linkUrl && typeof linkUrl === 'string' && linkUrl.length > 0;
		const hasMedia = hasImage || hasGif || hasLink;
		
		const bodyStr = (body === null || body === undefined) ? '' : String(body);
		
		// Allow comment with just a GIF (no body required)
		if (!hasMedia && bodyStr.trim().length === 0) {
			return json({ error: 'Comment body or media is required' }, { status: 400 });
		}

		if (bodyStr.length > 10000) {
			return json({ error: 'Comment body too long (max 10000 characters)' }, { status: 400 });
		}

		// Use body text or empty string if there's media
		const commentBody = bodyStr.trim().length > 0 ? bodyStr.trim() : '';

		// Verify post exists
		const [post] = await db
			.select({ id: posts.id })
			.from(posts)
			.where(eq(posts.id, postId))
			.limit(1);

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		// If this is a reply, verify parent comment exists and belongs to the same post
		let parentComment = null;
		let path = '';
		let depth = 0;

		if (parentCommentId) {
			[parentComment] = await db
				.select({
					id: comments.id,
					path: comments.path,
					depth: comments.depth,
					postId: comments.postId
				})
				.from(comments)
				.where(and(eq(comments.id, parentCommentId), eq(comments.isDeleted, false)))
				.limit(1);

			if (!parentComment) {
				return json({ error: 'Parent comment not found' }, { status: 404 });
			}

			if (parentComment.postId !== postId) {
				return json({ error: 'Parent comment does not belong to this post' }, { status: 400 });
			}

			// Build path for the new comment
			path = `${parentComment.path}.${parentCommentId}`;
			depth = parentComment.depth + 1;

			// Limit reply depth to prevent excessive nesting
			if (depth > 10) {
				return json({ error: 'Maximum reply depth exceeded' }, { status: 400 });
			}
		} else {
			// This is a root comment
			path = postId;
			depth = 0;
		}

		// Insert the comment with auto-upvote (user's own upvote)
		const [newComment] = await db
			.insert(comments)
			.values({
				postId,
				parentCommentId: parentCommentId || null,
				userId: locals.user.id,
				body: commentBody || '',
				imageUrl: imageUrl || null,
				gifUrl: gifUrl || null,
				linkUrl: linkUrl || null,
				linkTitle: linkTitle || null,
				path,
				depth,
				upvotes: 1, // Auto-upvote by author
				downvotes: 0,
				score: 1, // Start with 1 score (own upvote)
				replyCount: 0,
				isDeleted: false,
				isEdited: false,
				isBestAnswer: false,
			})
			.returning({
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
			});

		// Create auto-upvote vote record
		await db
			.insert(votes)
			.values({
				userId: locals.user.id,
				targetId: newComment.id,
				targetType: 'comment',
				value: 1,
			});

		// Update comment count on post
		await db
			.update(posts)
			.set({
				commentCount: sql`${posts.commentCount} + 1`,
				updatedAt: sql`NOW()`,
			})
			.where(eq(posts.id, postId));

		// If this is a reply, update reply count on parent comment
		if (parentCommentId) {
			await db
				.update(comments)
				.set({
					replyCount: sql`${comments.replyCount} + 1`,
					updatedAt: sql`NOW()`,
				})
				.where(eq(comments.id, parentCommentId));
		}

		// Get author info for the response
		const [author] = await db
			.select({
				username: users.username,
				image: users.image,
			})
			.from(users)
			.where(eq(users.id, locals.user.id))
			.limit(1);

		return json({
			comment: {
				...newComment,
				author: {
					username: author?.username || 'anonymous',
					avatarUrl: author?.image || '',
				},
				userVote: 1, // Author auto-upvoted their own comment
			},
			success: true,
		});

	} catch (error) {
		console.error('Error creating comment:', error);
		return json({ error: 'Failed to create comment' }, { status: 500 });
	}
};