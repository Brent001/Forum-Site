import { redirect, fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communityMemberships, communities, posts, votes } from '$lib/server/db/schema.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const communityName = String(url.searchParams.get('community') ?? '').trim();
	const joinedCommunities = await db
		.select({
			id: communities.id,
			name: communities.name,
			displayName: communities.displayName,
		})
		.from(communityMemberships)
		.leftJoin(communities, eq(communityMemberships.communityId, communities.id))
		.where(eq(communityMemberships.userId, locals.user.id))
		.orderBy(desc(communities.memberCount));

	const selectedCommunityId = joinedCommunities.find((community) => community.name === communityName)?.id ?? joinedCommunities[0]?.id ?? '';

	return {
		user: {
			id: locals.user.id,
			username: locals.user.username,
		},
		communities: joinedCommunities.map((community) => ({
			id: community.id,
			name: community.name,
			displayName: community.displayName,
		})),
		selectedCommunityId,
		defaultType: String(url.searchParams.get('type') ?? 'text'),
	};
};

export const actions: Actions = {
	create: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const body = String(form.get('body') ?? '').trim();
		const communityId = String(form.get('communityId') ?? '').trim();
		const type = String(form.get('type') ?? 'text');

		if (!title) {
			return fail(400, { error: 'A title is required.', title, body, communityId, type });
		}

		if (!communityId) {
			return fail(400, { error: 'Please choose a community.', title, body, communityId, type });
		}

		const selectedCommunity = await db
			.select({ name: communities.name })
			.from(communities)
			.where(eq(communities.id, communityId))
			.limit(1);

		if (selectedCommunity.length === 0) {
			return fail(400, { error: 'Selected community was not found.', title, body, communityId, type });
		}

		const postId = crypto.randomUUID();

		await db.insert(posts).values({
			id: postId,
			userId: locals.user.id,
			communityId,
			type,
			title,
			body,
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
		

		throw redirect(303, `/c/${selectedCommunity[0].name}`);
	},
};
