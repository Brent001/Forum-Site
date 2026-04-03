import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { posts } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

interface PollVoteRequest {
	optionIndex: number;
}

/**
 * POST /api/posts/[postId]/poll/vote
 * Vote on a poll option
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const { postId } = params;

	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	let payload: PollVoteRequest;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	const { optionIndex } = payload;

	if (typeof optionIndex !== 'number' || optionIndex < 0) {
		return json({ error: 'Invalid option index' }, { status: 400 });
	}

	try {
		const [post] = await db
			.select({
				id: posts.id,
				type: posts.type,
				pollOptions: posts.pollOptions,
				pollVotes: posts.pollVotes,
				pollTotalVotes: posts.pollTotalVotes,
				pollAllowChange: posts.pollAllowChange,
			})
			.from(posts)
			.where(eq(posts.id, postId))
			.limit(1);

		if (!post) {
			return json({ error: 'Post not found' }, { status: 404 });
		}

		if (post.type !== 'poll') {
			return json({ error: 'Not a poll post' }, { status: 400 });
		}

		if (!post.pollOptions || post.pollOptions.length === 0) {
			return json({ error: 'Poll has no options' }, { status: 400 });
		}

		if (optionIndex >= post.pollOptions.length) {
			return json({ error: 'Invalid option index' }, { status: 400 });
		}

		// Get user's current vote from cookie
		const cookieKey = `poll_vote_${postId}`;
		const cookies = request.headers.get('cookie') || '';
		const userVoteKey = cookies.includes(cookieKey) 
			? cookies.split(cookieKey + '=')[1]?.split(';')[0] 
			: null;

		const newOptionKey = `option_${optionIndex}`;

		// Check if user already voted
		if (userVoteKey && !post.pollAllowChange) {
			return json({ error: 'Cannot change vote' }, { status: 400 });
		}

		// Build updated poll votes
		const currentVotes = (post.pollVotes as Record<string, number>) || {};
		
		// Decrement previous vote if changing
		if (userVoteKey && currentVotes[userVoteKey] !== undefined) {
			currentVotes[userVoteKey] = Math.max(0, (currentVotes[userVoteKey] || 0) - 1);
		}

		// Increment new vote
		currentVotes[newOptionKey] = (currentVotes[newOptionKey] || 0) + 1;
		
		const newTotalVotes = (post.pollTotalVotes || 0) + (userVoteKey ? 0 : 1);

		// Update post
		await db
			.update(posts)
			.set({
				pollVotes: currentVotes,
				pollTotalVotes: newTotalVotes,
			})
			.where(eq(posts.id, postId));

		// Return updated poll data and set cookie
		return json(
			{ 
				pollVotes: currentVotes,
				pollTotalVotes: newTotalVotes,
				userPollVote: newOptionKey,
			},
			{
				status: 200,
				headers: {
					'Set-Cookie': `${cookieKey}=${newOptionKey}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`,
				},
			}
		);
	} catch (error) {
		console.error('Poll vote error:', error);
		return json({ error: 'Failed to vote' }, { status: 500 });
	}
};