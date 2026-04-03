import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communities } from '$lib/server/db/schema.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ params, parent }) => {
	const parentData = await parent();

	try {
		const communityRows = await db
			.select({
				id: communities.id,
				name: communities.name,
				displayName: communities.displayName,
				description: communities.description,
				icon: communities.icon,
				memberCount: communities.memberCount,
				postCount: communities.postCount,
			})
			.from(communities)
			.where(eq(communities.name, params.community))
			.limit(1);

		const communityData = communityRows && communityRows.length > 0
			? {
					id: communityRows[0].id,
					name: communityRows[0].name,
					displayName: communityRows[0].displayName,
					description: communityRows[0].description ?? '',
					icon: communityRows[0].icon ?? '🌐',
					memberCount: Number(communityRows[0].memberCount ?? 0),
					postCount: Number(communityRows[0].postCount ?? 0),
				}
			: null;

		return {
			...parentData,
			community: communityData,
		};
	} catch (error) {
		console.error(`Failed to load community "${params.community}":`, error);
		return {
			...parentData,
			community: null,
		};
	}
};
