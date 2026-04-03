import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db/index.js';
import * as schema from '$lib/server/db/schema.js';

export const auth = betterAuth({
	baseURL: env.ORIGIN,
	secret: env.BETTER_AUTH_SECRET,
	database: drizzleAdapter(db, { provider: 'pg', schema, usePlural: true }),
	emailAndPassword: { enabled: true },
	session: {
		cookieCache: {
			enabled: true,
			strategy: 'jwt',
			maxAge: 60 * 60 * 24 * 7, // 7 days
		},
	},
	user: {
		additionalFields: {
			username: {
				type: 'string',
				required: true,
				input: true,
			},
			role: {
				type: 'string',
				required: true,
				input: false,
				defaultValue: 'user',
			},
			theme: {
				type: 'string',
				required: false,
				input: false,
				defaultValue: 'light',
			},
			notificationsEnabled: {
				type: 'boolean',
				required: false,
				input: false,
				defaultValue: true,
			},
		},
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
