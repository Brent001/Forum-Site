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
					banner: communityRows[0].banner ?? '',
					logoUrl: communityRows[0].logoUrl ?? '',
					themeColor: communityRows[0].themeColor ?? '#4f46e5',
					rules: communityRows[0].rules ?? [],
					nsfw: communityRows[0].nsfw ?? false,
					requireApproval: communityRows[0].requireApproval ?? false,
					restrictPosting: communityRows[0].restrictPosting ?? false,
					hideDiscovery: communityRows[0].hideDiscovery ?? false,
					archived: communityRows[0].archived ?? false,
					allowLinks: communityRows[0].allowLinks ?? true,
					allowMedia: communityRows[0].allowMedia ?? true,
					allowPolls: communityRows[0].allowPolls ?? true,
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
