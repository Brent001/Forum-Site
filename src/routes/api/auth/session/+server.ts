import { json } from '@sveltejs/kit';
import { auth } from '$lib/server/auth.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ request }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	return json(session);
};
