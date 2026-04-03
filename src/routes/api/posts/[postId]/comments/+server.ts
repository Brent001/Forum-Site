import { json } from '@sveltejs/kit';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { comments, posts, users } from '$lib/server/db/schema.js';
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
		const { body, parentCommentId } = await request.json();

		// Validate input
		if (!body || typeof body !== 'string' || body.trim().length === 0) {
			return json({ error: 'Comment body is required' }, { status: 400 });
		}

		if (body.length > 10000) {
			return json({ error: 'Comment body too long (max 10000 characters)' }, { status: 400 });
		}

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

		// Insert the comment
		const [newComment] = await db
			.insert(comments)
			.values({
				postId,
				parentCommentId: parentCommentId || null,
				userId: locals.user.id,
				body: body.trim(),
				path,
				depth,
				upvotes: 0,
				downvotes: 0,
				score: 0,
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
				userVote: 0, // New comment, no vote yet
			},
			success: true,
		});

	} catch (error) {
		console.error('Error creating comment:', error);
		return json({ error: 'Failed to create comment' }, { status: 500 });
	}
};