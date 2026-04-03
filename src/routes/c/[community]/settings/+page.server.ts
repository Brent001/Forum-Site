import { redirect, fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communityMemberships, communities } from '$lib/server/db/schema.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const [community] = await db
		.select({
			id: communities.id,
			name: communities.name,
			displayName: communities.displayName,
			description: communities.description,
			icon: communities.icon,
			banner: communities.banner,
			rules: communities.rules,
		})
		.from(communities)
		.where(eq(communities.name, params.community))
		.limit(1);

	if (!community) {
		throw redirect(303, '/');
	}

	const [membership] = await db
		.select({ role: communityMemberships.role })
		.from(communityMemberships)
		.where(
			and(
				eq(communityMemberships.communityId, community.id),
				eq(communityMemberships.userId, locals.user.id)
			)
		)
		.limit(1);

	if (!membership || !['owner', 'moderator'].includes(membership.role)) {
		throw redirect(303, `/c/${params.community}`);
	}

	return {
		community: {
			id: community.id,
			name: community.name,
			displayName: community.displayName,
			description: community.description ?? '',
			icon: community.icon ?? '🌐',
			banner: community.banner ?? '',
			rules: community.rules ?? [],
		},
	};
};

export const actions: Actions = {
	default: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const displayName = String(form.get('displayName') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const icon = String(form.get('icon') ?? '').trim() || '🌐';
		const banner = String(form.get('banner') ?? '').trim() || null;
		const rulesInput = String(form.get('rules') ?? '').trim();
		const rules = rulesInput
			? rulesInput.split('\n').map((line) => line.trim()).filter(Boolean).map((title) => ({ title, description: '' }))
			: [];

		if (!displayName) {
			return fail(400, { error: 'Display name is required.' });
		}

		const [community] = await db
			.select({ id: communities.id })
			.from(communities)
			.where(eq(communities.name, params.community))
			.limit(1);

		if (!community) {
			return fail(404, { error: 'Community not found.' });
		}

		const [membership] = await db
			.select({ role: communityMemberships.role })
			.from(communityMemberships)
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, locals.user.id)
				)
			)
			.limit(1);

		if (!membership || !['owner', 'moderator'].includes(membership.role)) {
			return fail(403, { error: 'Only moderators and owners can edit community settings.' });
		}

		await db
			.update(communities)
			.set({ displayName, description, icon, banner, rules })
			.where(eq(communities.id, community.id));

		throw redirect(303, `/c/${params.community}`);
	},
};
