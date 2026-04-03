import { json } from '@sveltejs/kit';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { votes, posts } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

/**
 * POST /api/posts/[postId]/vote
 * Vote on a post (upvote/downvote/remove vote)
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
	const { postId } = params;

	console.log('[Vote] Request received:', { postId, user: locals.user?.id });

	// Check authentication
	if (!locals.user) {
		console.log('[Vote] No user authenticated');
		return json({ error: 'Authentication required' }, { status: 401 });
	}

	try {
		let body;
		try {
			body = await request.json();
		} catch (parseErr) {
			console.error('[Vote] JSON parse error:', parseErr);
			return json({ error: 'Invalid JSON' }, { status: 400 });
		}
		const { value } = body;
		console.log('[Vote] Vote value:', value);

		// Validate vote value
		if (value !== 1 && value !== -1 && value !== 0) {
			return json({ error: 'Invalid vote value. Must be 1, -1, or 0' }, { status: 400 });
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

		// Check if user already voted on this post
		const [existingVote] = await db
			.select()
			.from(votes)
			.where(and(
				eq(votes.userId, locals.user.id),
				eq(votes.targetId, postId),
				eq(votes.targetType, 'post')
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
						eq(votes.targetId, postId),
						eq(votes.targetType, 'post')
					));
			} else {
				// Update vote
				await db
					.update(votes)
					.set({ value, updatedAt: sql`NOW()` })
					.where(and(
						eq(votes.userId, locals.user.id),
						eq(votes.targetId, postId),
						eq(votes.targetType, 'post')
					));
			}
		} else if (value !== 0) {
			// Create new vote (race-safe handling for possible concurrent inserts)
			try {
				await db
					.insert(votes)
					.values({
						userId: locals.user.id,
						targetId: postId,
						targetType: 'post',
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
							eq(votes.targetId, postId),
							eq(votes.targetType, 'post')
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
									eq(votes.targetId, postId),
									eq(votes.targetType, 'post')
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

		// Update post score
		const voteDiff = value - oldVoteValue;
		if (voteDiff !== 0) {
			if (voteDiff > 0) {
				newScore = await db
					.update(posts)
					.set({
						upvotes: sql`${posts.upvotes} + ${voteDiff}`,
						score: sql`${posts.score} + ${voteDiff}`,
						updatedAt: sql`NOW()`,
					})
					.where(eq(posts.id, postId))
					.returning({ score: posts.score })
					.then(rows => rows[0].score);
			} else {
				newScore = await db
					.update(posts)
					.set({
						downvotes: sql`${posts.downvotes} + ${Math.abs(voteDiff)}`,
						score: sql`${posts.score} + ${voteDiff}`,
						updatedAt: sql`NOW()`,
					})
					.where(eq(posts.id, postId))
					.returning({ score: posts.score })
					.then(rows => rows[0].score);
			}
		} else {
			// Get current score if no change
			const [currentPost] = await db
				.select({ score: posts.score })
				.from(posts)
				.where(eq(posts.id, postId))
				.limit(1);
			newScore = currentPost.score;
		}

		return json({
			success: true,
			newScore,
			userVote: value,
		});

	} catch (error) {
		console.error('[Vote] Error:', error);
		return json({ error: 'Failed to vote on post' }, { status: 500 });
	}
};