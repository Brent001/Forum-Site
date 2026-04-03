import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { auth } from '$lib/server/auth.js';
import { db } from '$lib/server/db/index.js';
import { appSettings, users, accounts } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	const payload = await request.json();

	const tagline = String(payload.tagline ?? '').trim();
	const allowPublicRegistration = Boolean(payload.allowPublicRegistration ?? true);
	const requireEmailVerification = Boolean(payload.requireEmailVerification ?? false);
	const enableNsfwCommunities = Boolean(payload.enableNsfwCommunities ?? true);
	const enableRealTimeFeed = Boolean(payload.enableRealTimeFeed ?? true);
	const defaultSortAlgorithm = String(payload.defaultSortAlgorithm ?? 'hot');
	const postsPerHourLimit = Number(payload.postsPerHourLimit ?? 10);

	const adminUsername = String(payload.adminUsername ?? '').trim();
	const adminEmail = String(payload.adminEmail ?? '').trim().toLowerCase();
	const adminName = String(payload.adminName ?? adminUsername).trim();
	const adminPassword = String(payload.adminPassword ?? '').trim();

	if (!tagline || !adminUsername || !adminEmail || !adminPassword) {
		return json({ error: 'Please fill in all required fields.' }, { status: 400 });
	}

	const settingsRow = await db.select().from(appSettings).limit(1);
	if (settingsRow.length > 0 && settingsRow[0].setupComplete) {
		return json({ error: 'Setup has already been completed.' }, { status: 409 });
	}

	let adminUserId: string | undefined;
	try {
		const signup = (await auth.api.signUpEmail({
			headers: { 'content-type': 'application/json' },
			body: {
				username: adminUsername,
				name: adminName || adminUsername,
				email: adminEmail,
				password: adminPassword,
				rememberMe: false,
				callbackURL: '/',
			},
		})) as any;

		const account = signup?.account as Record<string, any> | undefined;
		adminUserId = signup?.user?.id;
		if (!adminUserId) {
			return json({ error: 'Failed to create admin account.' }, { status: 500 });
		}

		await db.update(users).set({ isAdmin: true, isModerator: true, role: 'admin' }).where(eq(users.id, adminUserId));

		const [existingAccount] = await db.select().from(accounts).where(eq(accounts.userId, adminUserId)).limit(1);
		if (!existingAccount) {
			const accountId = account?.id ?? `${adminUserId}-email`;
			await db.insert(accounts).values({
				id: accountId,
				accountId,
				providerId: account?.providerId ?? 'email',
				userId: adminUserId,
				accountType: account?.accountType ?? 'email',
				accessToken: account?.accessToken ?? null,
				refreshToken: account?.refreshToken ?? null,
				idToken: account?.idToken ?? null,
				accessTokenExpiresAt: account?.accessTokenExpiresAt ? new Date(account.accessTokenExpiresAt) : null,
				refreshTokenExpiresAt: account?.refreshTokenExpiresAt ? new Date(account.refreshTokenExpiresAt) : null,
				scope: account?.scope ?? null,
				password: null,
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to create admin account.';
		return json({ error: message }, { status: 400 });
	}

	const settingsValues = {
		id: 1,
		tagline,
		allowPublicRegistration,
		requireEmailVerification,
		enableNsfwCommunities,
		enableRealTimeFeed,
		defaultSortAlgorithm,
		postsPerHourLimit,
		setupComplete: true,
		updatedAt: new Date(),
	};

	if (settingsRow.length === 0) {
		await db.insert(appSettings).values(settingsValues);
	} else {
		await db.update(appSettings).set(settingsValues).where(eq(appSettings.id, 1));
	}

	return json({ success: true });
};
