import { json } from '@sveltejs/kit';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { votes, comments } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/posts/[postId]/comments/[commentId]/vote
 * Vote on a comment (upvote/downvote/remove vote)
 *
 * Request body:
 * {
 *   value: 1 | -1 | 0 (1=upvote, -1=downvote, 0=remove vote)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   newScore: number,
 *   userVote: number
 * }
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { postId, commentId } = params;

	// Check authentication
	if (!locals.user) {
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		const { value } = await request.json();

		// Validate vote value
		if (value !== 1 && value !== -1 && value !== 0) {
			return json({ error: 'Invalid vote value. Must be 1, -1, or 0' }, { status: 400 });
		}

		// Verify comment exists and belongs to the post
		const [comment] = await db
			.select({ id: comments.id })
			.from(comments)
			.where(and(eq(comments.id, commentId), eq(comments.postId, postId), eq(comments.isDeleted, false)))
			.limit(1);

		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		// Check if user already voted on this comment
		const [existingVote] = await db
			.select()
			.from(votes)
			.where(and(
				eq(votes.userId, locals.user.id),
				eq(votes.targetId, commentId),
				eq(votes.targetType, 'comment')
			))
			.limit(1);

		let oldVoteValue = 0;
		let newScore: number;

		if (existingVote) {
			oldVoteValue = existingVote.value;

			if (value === 0) {
				// Remove vote
				await db
					.delete(votes)
					.where(and(
						eq(votes.userId, locals.user.id),
						eq(votes.targetId, commentId),
						eq(votes.targetType, 'comment')
					));
			} else {
				// Update vote
				await db
					.update(votes)
					.set({ value, updatedAt: sql`NOW()` })
					.where(and(
						eq(votes.userId, locals.user.id),
						eq(votes.targetId, commentId),
						eq(votes.targetType, 'comment')
					));
			}
		} else if (value !== 0) {
			// Create new vote (race-safe handling for possible concurrent inserts)
			try {
				await db
					.insert(votes)
					.values({
						userId: locals.user.id,
						targetId: commentId,
						targetType: 'comment',
						value,
					});
			} catch (error: any) {
				const isUniqueConflict = error?.cause?.code === '23505' || (error?.message && error.message.includes('duplicate key value'));
				if (isUniqueConflict) {
					const [reloadedVote] = await db
						.select()
						.from(votes)
						.where(and(
							eq(votes.userId, locals.user.id),
							eq(votes.targetId, commentId),
							eq(votes.targetType, 'comment')
						))
						.limit(1);
					if (reloadedVote) {
						oldVoteValue = reloadedVote.value;
						if (reloadedVote.value !== value) {
							await db
								.update(votes)
								.set({ value, updatedAt: sql`NOW()` })
								.where(and(
									eq(votes.userId, locals.user.id),
									eq(votes.targetId, commentId),
									eq(votes.targetType, 'comment')
								));
						}
					} else {
						throw error;
					}
				} else {
					throw error;
				}
			}
		}

		// If removing vote and user is the author, prevent removing the auto-upvote
		// Authors cannot remove their own auto-upvote - they can only change to downvote
		if (value === 0 && oldVoteValue !== 0) {
			const [commentAuthor] = await db
				.select({ userId: comments.userId })
				.from(comments)
				.where(eq(comments.id, commentId))
				.limit(1);
			
			if (commentAuthor && commentAuthor.userId === locals.user.id) {
				// Author cannot remove their auto-upvote - just update the vote to neutral but keep the comment score
				await db
					.update(votes)
					.set({ value: 0, updatedAt: sql`NOW()` })
					.where(and(
						eq(votes.userId, locals.user.id),
						eq(votes.targetId, commentId),
						eq(votes.targetType, 'comment')
					));
				
				// Get current score and return it
				const [currentComment] = await db
					.select({ score: comments.score })
					.from(comments)
					.where(eq(comments.id, commentId))
					.limit(1);
				
				return json({
					success: true,
					newScore: currentComment?.score || 0,
					userVote: 0,
				});
			}
		}

		const voteDiff = value - oldVoteValue;
		if (voteDiff !== 0) {
			if (voteDiff > 0) {
				newScore = await db
					.update(comments)
					.set({
						upvotes: sql`${comments.upvotes} + ${voteDiff}`,
						score: sql`${comments.score} + ${voteDiff}`,
						updatedAt: sql`NOW()`,
					})
					.where(eq(comments.id, commentId))
					.returning({ score: comments.score })
					.then(rows => rows[0].score);
			} else {
				newScore = await db
					.update(comments)
					.set({
						downvotes: sql`${comments.downvotes} + ${Math.abs(voteDiff)}`,
						score: sql`${comments.score} + ${voteDiff}`,
						updatedAt: sql`NOW()`,
					})
					.where(eq(comments.id, commentId))
					.returning({ score: comments.score })
					.then(rows => rows[0].score);
			}
		} else {
			// Get current score if no change
			const [currentComment] = await db
				.select({ score: comments.score })
				.from(comments)
				.where(eq(comments.id, commentId))
				.limit(1);
			newScore = currentComment.score;
		}

		return json({
			success: true,
			newScore,
			userVote: value,
		});

	} catch (error) {
		console.error('Error voting on comment:', error);
		return json({ error: 'Failed to vote on comment' }, { status: 500 });
	}
};