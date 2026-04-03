import { redirect, fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communities, communityMemberships } from '$lib/server/db/schema.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	return {
		user: {
			id: locals.user.id,
			username: locals.user.username,
		},
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const rawName = String(form.get('name') ?? '').trim();
		const displayName = String(form.get('displayName') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const icon = String(form.get('icon') ?? '🌐').trim() || '🌐';

		if (!rawName || !displayName) {
			return fail(400, { error: 'Community name and display name are required.' });
		}

		const name = rawName
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9-]/g, '')
			.replace(/-+/g, '-');

		if (!name) {
			return fail(400, { error: 'Community name must contain letters or numbers.' });
		}

		const existing = await db.select().from(communities).where(eq(communities.name, name)).limit(1);
		if (existing.length > 0) {
			return fail(400, { error: 'A community with that name already exists.' });
		}

		const id = crypto.randomUUID();
		const banner = String(form.get('banner') ?? '').trim() || null;
		const rulesInput = String(form.get('rules') ?? '').trim();
		const rules = rulesInput
			? rulesInput.split('\n').map((line) => line.trim()).filter(Boolean).map((title) => ({ title, description: '' }))
			: [];

		await db.insert(communities).values({
			id,
			name,
			displayName,
			description,
			icon,
			banner,
			memberCount: 1,
			postCount: 0,
			rules,
			isPrivate: false,
			nsfw: false,
		});

		await db.insert(communityMemberships).values({
			userId: locals.user.id,
			communityId: id,
			role: 'owner',
		});

		throw redirect(303, `/c/${name}`);
	},
};
