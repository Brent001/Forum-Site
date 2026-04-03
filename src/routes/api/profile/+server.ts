import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const [user] = await db
		.select({
			id: users.id,
			username: users.username,
			email: users.email,
			name: users.name,
			role: users.role,
			theme: users.theme,
			notificationsEnabled: users.notificationsEnabled,
		})
		.from(users)
		.where(eq(users.id, locals.user.id));

	if (!user) {
		return json({ error: 'User not found' }, { status: 404 });
	}

	return json({ user });
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const payload = await request.json();
	const theme = String(payload.theme ?? 'light');
	const notificationsEnabled = Boolean(payload.notificationsEnabled ?? true);

	if (!['light', 'dark', 'system'].includes(theme)) {
		return json({ error: 'Invalid theme selection.' }, { status: 400 });
	}

	await db.update(users).set({ theme, notificationsEnabled }).where(eq(users.id, locals.user.id));

	return json({ success: true });
};
