import { desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communities } from '$lib/server/db/schema.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async () => {
	const communityRows = await db
		.select({
			id: communities.id,
			name: communities.name,
			displayName: communities.displayName,
			icon: communities.icon,
			banner: communities.banner,
			description: communities.description,
			members: communities.memberCount,
			postCount: communities.postCount,
			nsfw: communities.nsfw,
			archived: communities.archived,
			hideDiscovery: communities.hideDiscovery,
		})
		.from(communities)
		.where(sql`${communities.hideDiscovery} = false`)
		.orderBy(desc(communities.memberCount))
		.limit(20);

	return {
		communities: communityRows.map((community) => ({
			id: community.id,
			name: community.name,
			displayName: community.displayName,
			icon: community.icon ?? '🌐',
			members: Number(community.members ?? 0),
			postCount: Number(community.postCount ?? 0),
			nsfw: community.nsfw ?? false,
			archived: community.archived ?? false,
		})),
	};
};
