import { desc, eq, gt, sql } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { appSettings, communityMemberships, communities, posts, sessions, users } from '$lib/server/db/schema.js';
import { serverCache, cacheKey } from '$lib/server/cache.js';
import type { LayoutServerLoad } from './$types.js';

const STATS_CACHE_TTL = 30;
const COMMUNITIES_CACHE_TTL = 120;

async function getSiteStats() {
  const key = cacheKey('site', 'stats');
  const cached = serverCache.get<{ members: number; postsToday: number; online: number }>(key);
  if (cached) return cached;

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

  const stats = {
    members: Number(totalUsers ?? 0),
    postsToday: Number(postsToday ?? 0),
    online: Number(online ?? 0),
  };
  
  serverCache.set(key, stats, STATS_CACHE_TTL);
  return stats;
}

async function getSidebarCommunities() {
  const key = cacheKey('communities', 'sidebar');
  const cached = serverCache.get<any[]>(key);
  if (cached) return cached;

  const rows = await db
    .select({
      id: communities.id,
      name: communities.name,
      displayName: communities.displayName,
      icon: communities.icon,
      memberCount: communities.memberCount,
      postCount: communities.postCount,
    })
    .from(communities)
    .orderBy(desc(communities.memberCount))
    .limit(6);

  const communitiesData = rows.map((c) => ({
    id: c.id,
    name: c.name,
    displayName: c.displayName,
    icon: c.icon ?? '🌐',
    members: Number(c.memberCount ?? 0),
    postCount: Number(c.postCount ?? 0),
  }));

  serverCache.set(key, communitiesData, COMMUNITIES_CACHE_TTL);
  return communitiesData;
}

async function getTrendingCommunities() {
  const key = cacheKey('communities', 'trending');
  const cached = serverCache.get<any[]>(key);
  if (cached) return cached;

  const rows = await db
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

  const trending = rows.map((c) => ({
    name: c.name,
    displayName: c.displayName,
    icon: c.icon ?? '🌐',
    members: Number(c.members ?? 0),
    postCount: Number(c.postCount ?? 0),
    growth: `+${Math.max(0, Math.round((c.postCount ?? 0) / 1000))}%`,
  }));

  serverCache.set(key, trending, COMMUNITIES_CACHE_TTL);
  return trending;
}

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

  const [siteStats, trendingCommunities, sidebarCommunities] = await Promise.all([
    getSiteStats(),
    getTrendingCommunities(),
    getSidebarCommunities(),
  ]);

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

  let community = null;
  const communityMatch = pathname.match(/^\/c\/([^\/]+)/);
  if (communityMatch) {
    const communityName = decodeURIComponent(communityMatch[1]);
    const cacheKeyName = cacheKey('community', communityName);
    community = serverCache.get(cacheKeyName);
    
    if (!community && communityName && communityName.trim()) {
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
          serverCache.set(cacheKeyName, community, COMMUNITIES_CACHE_TTL);
        }
      } catch (error) {
        console.error(`[Root Layout] Failed to load community "${communityName}":`, error);
      }
    }
  }

  return {
    user: locals.user ?? null,
    home: {
      siteName,
      tagline,
      siteStats,
      trendingCommunities,
    },
    community,
    communities: sidebarCommunities,
    memberCommunities: memberCommunities.map((c) => ({
      id: c.id,
      name: c.name,
      displayName: c.displayName,
      icon: c.icon ?? '🌐',
      members: Number(c.members ?? 0),
      postCount: Number(c.postCount ?? 0),
    })),
  };
};