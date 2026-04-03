import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const [profile] = await db
		.select({
			id: users.id,
			username: users.username,
			name: users.name,
			email: users.email,
			role: users.role,
			theme: users.theme,
			notificationsEnabled: users.notificationsEnabled,
		})
		.from(users)
		.where(eq(users.id, locals.user.id));

	return { profile };
};
