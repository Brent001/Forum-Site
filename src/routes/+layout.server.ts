import { desc, eq, gt, sql } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { appSettings, communityMemberships, communities, posts, sessions, users } from '$lib/server/db/schema.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async ({ url, locals }) => {
	const pathname = url.pathname;
	const isSetupRoute = pathname === '/setup' || pathname.startsWith('/setup/');
	const isAuthRoute = pathname === '/login' || pathname.startsWith('/login/');

	let setupComplete = false;
	let siteName = 'Nexus Community';
	let tagline = 'The best conversations on the internet.';

	try {
		const settingsRow = await db
			.select({
				siteName: appSettings.siteName,
				tagline: appSettings.tagline,
				setupComplete: appSettings.setupComplete,
			})
			.from(appSettings)
			.limit(1);

		if (settingsRow.length > 0) {
			setupComplete = settingsRow[0].setupComplete;
			siteName = settingsRow[0].siteName ?? siteName;
			tagline = settingsRow[0].tagline ?? tagline;
		}
	} catch {
		setupComplete = false;
	}

	if (!setupComplete && !isSetupRoute && !isAuthRoute) {
		throw redirect(303, '/setup');
	}

	// Load site stats for RightPanel
	const [{ totalUsers }] = await db
		.select({ totalUsers: sql`count(*)` })
		.from(users);

	const [{ postsToday }] = await db
		.select({ postsToday: sql`count(*)` })
		.from(posts)
		.where(gt(posts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

	const [{ online }] = await db
		.select({ online: sql`count(*)` })
		.from(sessions)
		.where(gt(sessions.expiresAt, new Date()));

	// Load trending communities for RightPanel
	const trendingCommunities = await db
		.select({
			name: communities.name,
			displayName: communities.displayName,
			icon: communities.icon,
			members: communities.memberCount,
			postCount: communities.postCount,
		})
		.from(communities)
		.orderBy(desc(communities.memberCount))
		.limit(5);

	const sidebarCommunities = await db
		.select({
			id: communities.id,
			name: communities.name,
			displayName: communities.displayName,
			icon: communities.icon,
			members: communities.memberCount,
			postCount: communities.postCount,
		})
		.from(communities)
		.orderBy(desc(communities.memberCount))
		.limit(6);

	const memberCommunities = locals.user
		? await db
			.select({
				id: communities.id,
				name: communities.name,
				displayName: communities.displayName,
				icon: communities.icon,
				members: communities.memberCount,
				postCount: communities.postCount,
			})
			.from(communityMemberships)
			.leftJoin(communities, eq(communityMemberships.communityId, communities.id))
			.where(eq(communityMemberships.userId, locals.user.id))
			.orderBy(desc(communities.memberCount))
			.limit(6)
		: [];

	// Load community data if on a community page
	let community = null;
	const communityMatch = pathname.match(/^\/c\/([^\/]+)/);
	if (communityMatch) {
		const communityName = decodeURIComponent(communityMatch[1]);
		console.log(`[Root Layout] Found community in path: "${communityName}"`);
		if (communityName && communityName.trim()) {
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
					.where(eq(communities.name, communityName))
					.limit(1);

				console.log(`[Root Layout] Query returned ${communityRows?.length ?? 0} rows for "${communityName}"`);
				
				if (communityRows && communityRows.length > 0) {
					const communityRow = communityRows[0];
					community = {
						id: communityRow.id,
						name: communityRow.name,
						displayName: communityRow.displayName,
						description: communityRow.description ?? '',
						icon: communityRow.icon ?? '🌐',
						memberCount: Number(communityRow.memberCount ?? 0),
						postCount: Number(communityRow.postCount ?? 0),
					};
					console.log(`[Root Layout] Loaded community: ${community.displayName}`);
				}
			} catch (error) {
				console.error(`[Root Layout] Failed to load community "${communityName}":`, error);
			}
		}
	}

	return {
		user: locals.user ?? null,
		// Passed to +page.server.ts via parent() for home page use
		home: {
			siteName,
			tagline,
			siteStats: {
				members: Number(totalUsers ?? 0),
				postsToday: Number(postsToday ?? 0),
				online: Number(online ?? 0),
			},
			trendingCommunities: trendingCommunities.map((community) => ({
				...community,
				members: Number(community.members ?? 0),
				growth: `+${Math.max(0, Math.round((community.postCount ?? 0) / 1000))}%`,
			})),
		},
		community,
		communities: sidebarCommunities.map((community) => ({
			id: community.id,
			name: community.name,
			displayName: community.displayName,
			icon: community.icon ?? '🌐',
			members: Number(community.members ?? 0),
			postCount: Number(community.postCount ?? 0),
		})),
		memberCommunities: memberCommunities.map((community) => ({
			id: community.id,
			name: community.name,
			displayName: community.displayName,
			icon: community.icon ?? '🌐',
			members: Number(community.members ?? 0),
			postCount: Number(community.postCount ?? 0),
		})),
	};
};