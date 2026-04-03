import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { appSettings } from '$lib/server/db/schema.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ url }) => {
	const currentPath = url.pathname;
	if (currentPath !== '/setup') return;

	let setupComplete = false;
	try {
		const settingsRow = await db.select().from(appSettings).limit(1);
		setupComplete = settingsRow.length > 0 && settingsRow[0].setupComplete;
	} catch {
		setupComplete = false;
	}

	if (setupComplete) {
		throw redirect(303, '/');
	}

	return {};
};
