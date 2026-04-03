import { json, redirect } from '@sveltejs/kit';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communities, communityMemberships, posts } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

interface CreatePostRequest {
	communityName: string;
	type: 'text' | 'link' | 'image' | 'video' | 'poll';
	title: string;
	body?: string;
	linkUrl?: string;
	isNsfw?: boolean;
	isSpoiler?: boolean;
	flair?: string;
	mediaUrls?: string[];
	pollOptions?: string[];
	pollDays?: number;
	pollAllowMultiple?: boolean;
	pollAllowChange?: boolean;
}

/**
 * POST /api/posts
 * Create a new post in a community
 * 
 * Request body:
 * {
 *   "communityName": "community-name",
 *   "type": "text",
 *   "title": "Post title",
 *   "body": "Post body (optional for links)",
 *   "linkUrl": "https://example.com (for link type)",
 *   "isNsfw": false,
 *   "isSpoiler": false,
 *   "flair": "Discussion"
 * }
 * 
 * For polls:
 * {
 *   "type": "poll",
 *   "title": "What's your choice?",
 *   "pollOptions": ["Option 1", "Option 2"],
 *   "pollDays": 7,
 *   "pollAllowMultiple": false,
 *   "pollAllowChange": true
 * }
 * 
 * Response: { id, title, communityId, ... } on success
 * Error: { error: string } on failure
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Check authentication
	if (!locals.user) {
		return json(
			{ error: 'Unauthorized. Please log in to post.' },
			{ status: 401 }
		);
	}

	// Parse request body
	let payload: CreatePostRequest;
	try {
		payload = await request.json();
	} catch {
		return json(
			{ error: 'Invalid request body. Expected JSON.' },
			{ status: 400 }
		);
	}

	// Validate required fields
	const { 
		communityName, 
		type, 
		title, 
		body, 
		linkUrl, 
		isNsfw = false, 
		isSpoiler = false, 
		flair = '',
		pollOptions,
		pollDays,
		pollAllowMultiple,
		pollAllowChange
	} = payload;

	if (!communityName || !type || !title) {
		return json(
			{ error: 'Missing required fields: communityName, type, title' },
			{ status: 400 }
		);
	}

	if (title.trim().length < 3) {
		return json(
			{ error: 'Title must be at least 3 characters long' },
			{ status: 400 }
		);
	}

	if (type === 'link' && !linkUrl?.trim()) {
		return json(
			{ error: 'Link posts require a linkUrl' },
			{ status: 400 }
		);
	}

	if (type === 'poll') {
		if (!pollOptions || pollOptions.length < 2) {
			return json(
				{ error: 'Poll requires at least 2 options' },
				{ status: 400 }
			);
		}
	}

	// Validate type
	if (!['text', 'link', 'image', 'video', 'poll'].includes(type)) {
		return json(
			{ error: 'Invalid post type. Must be text, link, image, video, or poll.' },
			{ status: 400 }
		);
	}

	try {
		// Get the community
		const [community] = await db
			.select({ id: communities.id })
			.from(communities)
			.where(eq(communities.name, communityName))
			.limit(1);

		if (!community) {
			return json(
				{ error: `Community "${communityName}" not found.` },
				{ status: 404 }
			);
		}

		// Check if user is a member of this community
		const [membership] = await db
			.select()
			.from(communityMemberships)
			.where(
				and(
					eq(communityMemberships.userId, locals.user.id),
					eq(communityMemberships.communityId, community.id)
				)
			)
			.limit(1);

		if (!membership) {
			// Auto-join the user if they're not a member
			await db.insert(communityMemberships).values({
				userId: locals.user.id,
				communityId: community.id,
				role: 'member',
			});
		}

		// Build poll settings
		let pollEndsAt = null;
		if (type === 'poll' && pollDays) {
			pollEndsAt = new Date(Date.now() + pollDays * 24 * 60 * 60 * 1000);
		}

		// Initialize poll votes
		let pollVotes: Record<string, number> | null = null;
		if (type === 'poll' && pollOptions) {
			pollVotes = {};
			pollOptions.forEach((_, index) => {
				pollVotes![`option_${index}`] = 0;
			});
		}

		// Create the post
		const postId = crypto.randomUUID();
		await db.insert(posts).values({
			id: postId,
			userId: locals.user.id,
			communityId: community.id,
			type,
			title: title.trim(),
			body: body?.trim() || null,
			linkUrl: linkUrl?.trim() || null,
			isNsfw: Boolean(isNsfw),
			isSpoiler: Boolean(isSpoiler),
			flair: flair?.trim() || null,
			flairColor: '#3b82f6', // Default blue color
			pollOptions: type === 'poll' ? pollOptions : null,
			pollVotes: pollVotes,
			pollTotalVotes: 0,
			pollEndsAt: pollEndsAt,
			pollAllowMultiple: type === 'poll' ? Boolean(pollAllowMultiple) : false,
			pollAllowChange: type === 'poll' ? Boolean(pollAllowChange) : false,
		});

		// Fetch the created post to return
		const [createdPost] = await db
			.select()
			.from(posts)
			.where(eq(posts.id, postId))
			.limit(1);

		return json(createdPost, { status: 201 });
	} catch (error) {
		console.error('Error creating post:', error);
		return json(
			{ error: 'Failed to create post. Please try again later.' },
			{ status: 500 }
		);
	}
};

/**
 * GET /api/posts
 * Fetch posts from a community (optional query parameter: community)
 */
export const GET: RequestHandler = async ({ url }) => {
	const communityName = url.searchParams.get('community');
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50);
	const offset = parseInt(url.searchParams.get('offset') || '0');

	try {
		const selectPostData = {
			id: posts.id,
			title: posts.title,
			body: posts.body,
			type: posts.type,
			linkUrl: posts.linkUrl,
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
		};

		let results;

		if (communityName) {
			results = await db
				.select(selectPostData)
				.from(posts)
				.leftJoin(communities, eq(communities.id, posts.communityId))
				.where(eq(communities.name, communityName))
				.orderBy(desc(posts.createdAt))
				.limit(limit)
				.offset(offset);
		} else {
			results = await db
				.select(selectPostData)
				.from(posts)
				.orderBy(desc(posts.createdAt))
				.limit(limit)
				.offset(offset);
		}

		return json(results);
	} catch (error) {
		console.error('Error fetching posts:', error);
		return json(
			{ error: 'Failed to fetch posts' },
			{ status: 500 }
		);
	}
};
