import { redirect, fail } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communityMemberships, communities, users } from '$lib/server/db/schema.js';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(303, '/login');
	}

	const [community] = await db
		.select({
			id: communities.id,
			name: communities.name,
			displayName: communities.displayName,
			description: communities.description,
			icon: communities.icon,
			banner: communities.banner,
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
		})
		.from(communities)
		.where(eq(communities.name, params.community))
		.limit(1);

	if (!community) {
		throw redirect(303, '/');
	}

	const [membership] = await db
		.select({ role: communityMemberships.role })
		.from(communityMemberships)
		.where(
			and(
				eq(communityMemberships.communityId, community.id),
				eq(communityMemberships.userId, locals.user.id)
			)
		)
		.limit(1);

	const isAdmin = locals.user?.isAdmin;
	if (!membership && !isAdmin) {
		throw redirect(303, `/c/${params.community}`);
	}

	if (!isAdmin && !['owner', 'moderator'].includes(membership?.role ?? '')) {
		throw redirect(303, `/c/${params.community}`);
	}

	const moderators = await db
		.select({
			userId: communityMemberships.userId,
			username: users.username,
			isAdmin: users.isAdmin,
			role: communityMemberships.role,
		})
		.from(communityMemberships)
		.leftJoin(users, eq(users.id, communityMemberships.userId))
		.where(
			and(
				eq(communityMemberships.communityId, community.id),
				sql`${communityMemberships.role} IN ('owner', 'moderator')`
			)
		)
		.orderBy(users.username);

	const isOwner = membership?.role === 'owner';

	return {
		community: {
			id: community.id,
			name: community.name,
			displayName: community.displayName,
			description: community.description ?? '',
			icon: community.icon ?? '🌐',
			banner: community.banner ?? '',
			themeColor: community.themeColor ?? '#4f46e5',
			rules: community.rules ?? [],
			nsfw: community.nsfw ?? false,
			requireApproval: community.requireApproval ?? false,
			restrictPosting: community.restrictPosting ?? false,
			hideDiscovery: community.hideDiscovery ?? false,
			archived: community.archived ?? false,
			allowLinks: community.allowLinks ?? true,
			allowMedia: community.allowMedia ?? true,
			allowPolls: community.allowPolls ?? true,
		},
		moderators: moderators.map((mod) => ({
			id: mod.userId,
			username: mod.username,
			role: mod.role,
			isAdmin: mod.isAdmin ?? false,
		})),
		isAdmin,
		isOwner,
		canManageModerators: isAdmin || isOwner,
	};
};

export const actions: Actions = {
	updateSettings: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const displayName = String(form.get('displayName') ?? '').trim();
		const description = String(form.get('description') ?? '').trim();
		const icon = String(form.get('icon') ?? '').trim() || '🌐';
		const banner = String(form.get('banner') ?? '').trim() || null;
		const themeColor = String(form.get('themeColor') ?? '').trim() || '#4f46e5';
		const rulesInput = String(form.get('rules') ?? '').trim();
		const rules = rulesInput
			? rulesInput.split('\n').map((line) => line.trim()).filter(Boolean).map((title) => ({ title, description: '' }))
			: [];
		
		// Parse checkbox settings
		const nsfw = form.get('nsfw') === 'on';
		const requireApproval = form.get('requireApproval') === 'on';
		const restrictPosting = form.get('restrictPosting') === 'on';
		const hideDiscovery = form.get('hideDiscovery') === 'on';
		const archived = form.get('archived') === 'on';
		const allowLinks = form.get('allowLinks') === 'on' || form.get('allowLinks') !== 'off';
		const allowMedia = form.get('allowMedia') === 'on' || form.get('allowMedia') !== 'off';
		const allowPolls = form.get('allowPolls') === 'on' || form.get('allowPolls') !== 'off';

		if (!displayName) {
			return fail(400, { error: 'Display name is required.' });
		}

		const [community] = await db
			.select({ id: communities.id })
			.from(communities)
			.where(eq(communities.name, params.community))
			.limit(1);

		if (!community) {
			return fail(404, { error: 'Community not found.' });
		}

		const [membership] = await db
			.select({ role: communityMemberships.role })
			.from(communityMemberships)
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, locals.user.id)
				)
			)
			.limit(1);

		const isAdmin = locals.user?.isAdmin;
		if (!isAdmin && (!membership || !['owner', 'moderator'].includes(membership.role))) {
			return fail(403, { error: 'Only community moderators, owners, or site admins can edit settings.' });
		}

		await db
			.update(communities)
			.set({
				displayName,
				description,
				icon,
				banner,
				themeColor,
				rules,
				nsfw,
				requireApproval,
				restrictPosting,
				hideDiscovery,
				archived,
				allowLinks,
				allowMedia,
				allowPolls,
				updatedAt: new Date(),
			})
			.where(eq(communities.id, community.id));

		// Return updated community data instead of redirecting
		const [updatedCommunity] = await db
			.select({
				id: communities.id,
				name: communities.name,
				displayName: communities.displayName,
				description: communities.description,
				icon: communities.icon,
				banner: communities.banner,
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
			})
			.from(communities)
			.where(eq(communities.id, community.id))
			.limit(1);

		return {
			community: {
				id: updatedCommunity.id,
				name: updatedCommunity.name,
				displayName: updatedCommunity.displayName,
				description: updatedCommunity.description ?? '',
				icon: updatedCommunity.icon ?? '🌐',
				banner: updatedCommunity.banner ?? '',
				themeColor: updatedCommunity.themeColor ?? '#4f46e5',
				rules: updatedCommunity.rules ?? [],
				nsfw: updatedCommunity.nsfw ?? false,
				requireApproval: updatedCommunity.requireApproval ?? false,
				restrictPosting: updatedCommunity.restrictPosting ?? false,
				hideDiscovery: updatedCommunity.hideDiscovery ?? false,
				archived: updatedCommunity.archived ?? false,
				allowLinks: updatedCommunity.allowLinks ?? true,
				allowMedia: updatedCommunity.allowMedia ?? true,
				allowPolls: updatedCommunity.allowPolls ?? true,
			}
		};
	},
	addModerator: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();

		if (!username) {
			return fail(400, { error: 'Username is required.' });
		}

		const [community] = await db
			.select({ id: communities.id, memberCount: communities.memberCount })
			.from(communities)
			.where(eq(communities.name, params.community))
			.limit(1);

		if (!community) {
			return fail(404, { error: 'Community not found.' });
		}

		const [membership] = await db
			.select({ role: communityMemberships.role })
			.from(communityMemberships)
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, locals.user.id)
				)
			)
			.limit(1);

		const isAdmin = locals.user?.isAdmin;
		const isOwner = membership?.role === 'owner';
		if (!isAdmin && !isOwner) {
			return fail(403, { error: 'Only community owners or site admins can add moderators.' });
		}

		const [user] = await db
			.select({ id: users.id, isAdmin: users.isAdmin })
			.from(users)
			.where(eq(users.username, username))
			.limit(1);

		if (!user) {
			return fail(404, { error: 'User not found.' });
		}

		const [existing] = await db
			.select({ role: communityMemberships.role })
			.from(communityMemberships)
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, user.id)
				)
			)
			.limit(1);

		if (!existing) {
			return fail(400, { error: 'User must be a member of this community first.' });
		}

		if (existing?.role === 'owner') {
			return fail(400, { error: 'Cannot change the community owner role.' });
		}

		if (existing?.role === 'moderator') {
			return fail(400, { error: 'User is already a moderator.' });
		}

		await db
			.update(communityMemberships)
			.set({ role: 'moderator' })
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, user.id)
				)
			);

		throw redirect(303, `/c/${params.community}/settings`);
	},
	removeModerator: async ({ request, locals, params }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const form = await request.formData();
		const userId = String(form.get('userId') ?? '').trim();

		if (!userId) {
			return fail(400, { error: 'User is required.' });
		}

		const [community] = await db
			.select({ id: communities.id })
			.from(communities)
			.where(eq(communities.name, params.community))
			.limit(1);

		if (!community) {
			return fail(404, { error: 'Community not found.' });
		}

		const [membership] = await db
			.select({ role: communityMemberships.role })
			.from(communityMemberships)
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, locals.user.id)
				)
			)
			.limit(1);

		const isAdmin = locals.user?.isAdmin;
		const isOwner = membership?.role === 'owner';
		if (!isAdmin && !isOwner) {
			return fail(403, { error: 'Only community owners or site admins can remove moderators.' });
		}

		const [targetUser] = await db
			.select({ id: users.id, isAdmin: users.isAdmin })
			.from(users)
			.where(eq(users.id, userId))
			.limit(1);

		if (!targetUser) {
			return fail(404, { error: 'User not found.' });
		}

		const [existing] = await db
			.select({ role: communityMemberships.role })
			.from(communityMemberships)
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, userId)
				)
			)
			.limit(1);

		if (!existing || existing.role !== 'moderator') {
			return fail(400, { error: 'User is not a moderator.' });
		}

		if (targetUser.isAdmin) {
			return fail(400, { error: 'Site admins cannot be removed from moderator roles.' });
		}

		await db
			.update(communityMemberships)
			.set({ role: 'member' })
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					eq(communityMemberships.userId, userId)
				)
			);

		throw redirect(303, `/c/${params.community}/settings`);
	},
	searchMembers: async ({ request, locals, params }) => {
		if (!locals.user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const form = await request.formData();
		const query = String(form.get('query') ?? '').trim().toLowerCase();

		if (!query || query.length < 1) {
			return { members: [] };
		}

		const [community] = await db
			.select({ id: communities.id })
			.from(communities)
			.where(eq(communities.name, params.community))
			.limit(1);

		if (!community) {
			return fail(404, { error: 'Community not found' });
		}

		// Get all members (excluding moderators and owner) with usernames matching the query
		const members = await db
			.select({
				userId: communityMemberships.userId,
				username: users.username,
				role: communityMemberships.role,
			})
			.from(communityMemberships)
			.leftJoin(users, eq(users.id, communityMemberships.userId))
			.where(
				and(
					eq(communityMemberships.communityId, community.id),
					sql`${communityMemberships.role} = 'member'`,
					sql`LOWER(${users.username}) LIKE ${`%${query}%`}`
				)
			)
			.orderBy(users.username)
			.limit(10);

		return {
			members: members.map((m) => ({
				id: m.userId,
				username: m.username,
			})),
		};
	},
};
