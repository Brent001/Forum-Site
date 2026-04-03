import { redirect, fail } from '@sveltejs/kit';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communities, communityMemberships, posts, votes } from '$lib/server/db/schema.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	// Get the community
	const [community] = await db
		.select({
			id: communities.id,
			name: communities.name,
			displayName: communities.displayName,
		})
		.from(communities)
		.where(eq(communities.name, params.community))
		.limit(1);

	if (!community) {
		throw redirect(303, '/');
	}

	// Check if user is a member of this community
	const [membership] = await db
		.select()
		.from(communityMemberships)
		.where(and(
			eq(communityMemberships.userId, locals.user.id),
			eq(communityMemberships.communityId, community.id)
		))
		.limit(1);

	if (!membership) {
		// Auto-join the user if they're not a member
		await db.insert(communityMemberships).values({
			userId: locals.user.id,
			communityId: community.id,
			role: 'member',
		});
	}

	return {
		user: {
			id: locals.user.id,
			username: locals.user.username,
		},
		community: {
			id: community.id,
			name: community.name,
			displayName: community.displayName,
		},
	};
};

export const actions: Actions = {
	create: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		const type = String(form.get('type') ?? 'text');
		const isNsfw = form.get('isNsfw') === 'on';
		const isSpoiler = form.get('isSpoiler') === 'on';
		const flair = String(form.get('flair') ?? '').trim();

		if (!title) {
			return fail(400, { error: 'A title is required.', title, body, type });
		}

		// Get the community
		const [community] = await db
			.select({ id: communities.id })
			.from(communities)
			.where(eq(communities.name, params.community))
			.limit(1);

		if (!community) {
			return fail(400, { error: 'Community not found.', title, body, type });
		}

		// Check if user is a member
		const [membership] = await db
			.select()
			.from(communityMemberships)
			.where(and(
				eq(communityMemberships.userId, locals.user.id),
				eq(communityMemberships.communityId, community.id)
			))
			.limit(1);

		if (!membership) {
			return fail(403, { error: 'You must be a member of this community to post.', title, body, type });
		}

		// Create the post
		const postId = crypto.randomUUID();
		await db.insert(posts).values({
			id: postId,
			userId: locals.user.id,
			communityId: community.id,
			type,
			title,
			body: body || null,
			isNsfw,
			isSpoiler,
			flair: flair || null,
		});

		// Auto-upvote the post (like Reddit)
		await db.insert(votes).values({
			userId: locals.user.id,
			targetId: postId,
			targetType: 'post',
			value: 1,
		});

		// Update post vote counts
		await db.update(posts).set({
			upvotes: sql`${posts.upvotes} + 1`,
			score: sql`${posts.score} + 1`
		}).where(eq(posts.id, postId));

		throw redirect(303, `/c/${params.community}`);
	},
};
