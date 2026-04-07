import { db } from '$lib/server/db/index.js';
import { communities } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const [community] = await db
			.select({
				id: communities.id,
				name: communities.name,
				displayName: communities.displayName,
				description: communities.description,
				icon: communities.icon,
				banner: communities.banner,
				logoUrl: communities.logoUrl,
				themeColor: communities.themeColor,
				rules: communities.rules,
				nsfw: communities.nsfw,
				requireApproval: communities.requireApproval,
				restrictPosting: communities.restrictPosting,
				hideDiscovery: communities.hideDiscovery,
				archived: communities.archived,
				allowLinks: communities.allowLinks,
				allowMedia: communities.allowMedia,
				allowPolls: communities.allowPolls,
				memberCount: communities.memberCount,
				postCount: communities.postCount,
				createdAt: communities.createdAt,
				updatedAt: communities.updatedAt,
			})
			.from(communities)
			.where(eq(communities.id, params.comm_id))
			.limit(1);

		if (!community) {
			return json(
				{ error: 'Community not found' },
				{ status: 404 }
			);
		}

		return json(community);
	} catch (error) {
		console.error('Error fetching community:', error);
		return json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
};
