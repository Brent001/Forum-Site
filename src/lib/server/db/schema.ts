import {
	pgTable,
	text,
	timestamp,
	integer,
	boolean,
	json,
	index,
	primaryKey,
	serial,
	decimal,
	customType,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

const tsvectorType = customType<{ data: string; driverData: string }>({
	dataType: () => 'tsvector',
	toDriver(value) {
		return value;
	},
	fromDriver(value) {
		return value;
	},
});

// ============================================================================
// AUTH TABLES (managed by better-auth)
// ============================================================================

export const users = pgTable('users', {
	id: text('id').primaryKey(),
	username: text('username').notNull().unique(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	name: text('name'),
	image: text('image'),
	bio: text('bio'),
	website: text('website'),
	location: text('location'),
	
	// Account status
	isAdmin: boolean('is_admin').notNull().default(false),
	isModerator: boolean('is_moderator').notNull().default(false),
	role: text('role').notNull().default('user'),
	isBanned: boolean('is_banned').notNull().default(false),
	banReason: text('ban_reason'),
	banExpiresAt: timestamp('ban_expires_at'),
	
	// Stats
	postCount: integer('post_count').notNull().default(0),
	commentCount: integer('comment_count').notNull().default(0),
	followerCount: integer('follower_count').notNull().default(0),
	followingCount: integer('following_count').notNull().default(0),
	
	// Preferences
	theme: text('theme').default('light'),
	notificationsEnabled: boolean('notifications_enabled').notNull().default(true),
	
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	accountType: text('account_type').notNull().default('email'),
	providerId: text('provider_id').notNull().default('email'),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at'),
	updatedAt: timestamp('updated_at'),
});

// ============================================================================
// COMMUNITIES
// ============================================================================

export const communities = pgTable(
	'communities',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull().unique(),
		displayName: text('display_name').notNull(),
		description: text('description'),
		icon: text('icon'),
		banner: text('banner'),
		logoUrl: text('logo_url'),
		
		// Settings
		isPrivate: boolean('is_private').notNull().default(false),
		nsfw: boolean('nsfw').notNull().default(false),
		rules: json('rules').$type<Array<{ title: string; description: string }>>(),
		
		// Stats
		memberCount: integer('member_count').notNull().default(0),
		postCount: integer('post_count').notNull().default(0),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(t) => ({
		nameIdx: index('communities_name_idx').on(t.name),
	})
);

export const communityMemberships = pgTable(
	'community_memberships',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		communityId: text('community_id')
			.notNull()
			.references(() => communities.id, { onDelete: 'cascade' }),
		role: text('role').notNull().default('member'), // 'owner', 'moderator', 'member'
		joinedAt: timestamp('joined_at').notNull().defaultNow(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.communityId] }),
		userIdx: index('community_memberships_user_idx').on(t.userId),
		communityIdx: index('community_memberships_community_idx').on(t.communityId),
	})
);

// ============================================================================
// POSTS
// ============================================================================

export const posts = pgTable(
	'posts',
	{
		id: text('id').primaryKey().default(sql`gen_random_uuid()`),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		communityId: text('community_id').references(() => communities.id, { onDelete: 'set null' }),
		
		// Content
		type: text('type').notNull().default('text'), // 'text', 'link', 'image', 'video', 'poll'
		title: text('title').notNull(),
		body: text('body'),
		mediaUrls: json('media_urls').$type<string[]>().default([]),
		linkUrl: text('link_url'),
		linkPreview: json('link_preview').$type<{
			title: string;
			description: string;
			image: string;
			domain: string;
		} | null>(),
		
		// Poll fields
		pollOptions: json('poll_options').$type<string[] | null>(),
		pollVotes: json('poll_votes').$type<Record<string, number> | null>(),
		pollTotalVotes: integer('poll_total_votes').notNull().default(0),
		pollEndsAt: timestamp('poll_ends_at'),
		pollAllowMultiple: boolean('poll_allow_multiple').notNull().default(false),
		pollAllowChange: boolean('poll_allow_change').notNull().default(false),
		
		// Content metadata
		isNsfw: boolean('is_nsfw').notNull().default(false),
		isSpoiler: boolean('is_spoiler').notNull().default(false),
		flair: text('flair'),
		flairColor: text('flair_color'),
		
		// Engagement stats
		upvotes: integer('upvotes').notNull().default(0),
		downvotes: integer('downvotes').notNull().default(0),
		score: integer('score').notNull().default(0),
		commentCount: integer('comment_count').notNull().default(0),
		
		// Algorithm scores (for ranking)
		hotScore: decimal('hot_score', { precision: 12, scale: 6 }).notNull().default('0'),
		newScore: decimal('new_score', { precision: 12, scale: 6 }).notNull().default('0'),
		topScore: decimal('top_score', { precision: 12, scale: 6 }).notNull().default('0'),
		risingScore: decimal('rising_score', { precision: 12, scale: 6 }).notNull().default('0'),
		bestScore: decimal('best_score', { precision: 12, scale: 6 }).notNull().default('0'),
		
		// Phoenix ML scores (X algorithm)
		phoenixScores: json('phoenix_scores').$type<{
			favorite?: number;
			reply?: number;
			retweet?: number;
			quote?: number;
			quotedClick?: number;
			click?: number;
			profileClick?: number;
			share?: number;
			shareViaDm?: number;
			shareViaCopy?: number;
			dwellTime?: number;
			notInterested?: number;
			blockAuthor?: number;
			muteAuthor?: number;
			report?: number;
		}>(),
		
		// For full-text search
		searchVector: tsvectorType('search_vector'),
		
		// Flags
		isDeleted: boolean('is_deleted').notNull().default(false),
		isPinned: boolean('is_pinned').notNull().default(false),
		isLocked: boolean('is_locked').notNull().default(false),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(t) => ({
		userIdx: index('posts_user_idx').on(t.userId),
		communityIdx: index('posts_community_idx').on(t.communityId),
		createdAtIdx: index('posts_created_at_idx').on(t.createdAt.desc()),
		hotScoreIdx: index('posts_hot_score_idx').on(t.hotScore.desc()),
		newScoreIdx: index('posts_new_score_idx').on(t.newScore.desc()),
		topScoreIdx: index('posts_top_score_idx').on(t.topScore.desc()),
		risingScoreIdx: index('posts_rising_score_idx').on(t.risingScore.desc()),
		bestScoreIdx: index('posts_best_score_idx').on(t.bestScore.desc()),
		scoreIdx: index('posts_score_idx').on(t.score.desc()),
		searchIdx: index('posts_search_idx').using('gin', t.searchVector),
		notDeletedIdx: index('posts_not_deleted_idx').on(t.isDeleted),
	})
);

// ============================================================================
// COMMENTS
// ============================================================================

export const comments: any = pgTable(
	'comments',
	{
		id: text('id').primaryKey().default(sql`gen_random_uuid()`),
		postId: text('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		parentCommentId: text('parent_comment_id').references(() => comments.id, { onDelete: 'cascade' }),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		
		// Content
		body: text('body').notNull(),
		
		// Hierarchical path (materialized path pattern): "id1.id2.id3"
		path: text('path').notNull(),
		depth: integer('depth').notNull().default(0),
		
		// Engagement
		upvotes: integer('upvotes').notNull().default(0),
		downvotes: integer('downvotes').notNull().default(0),
		score: integer('score').notNull().default(0),
		replyCount: integer('reply_count').notNull().default(0),
		
		// Flags
		isDeleted: boolean('is_deleted').notNull().default(false),
		isEdited: boolean('is_edited').notNull().default(false),
		isBestAnswer: boolean('is_best_answer').notNull().default(false),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(t) => ({
		postIdx: index('comments_post_idx').on(t.postId),
		userIdx: index('comments_user_idx').on(t.userId),
		parentIdx: index('comments_parent_idx').on(t.parentCommentId),
		pathIdx: index('comments_path_idx').on(t.path),
		createdAtIdx: index('comments_created_at_idx').on(t.createdAt.desc()),
		scoreIdx: index('comments_score_idx').on(t.score.desc()),
	})
);

// ============================================================================
// VOTES
// ============================================================================

export const votes = pgTable(
	'votes',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		targetId: text('target_id').notNull(), // post or comment ID
		targetType: text('target_type').notNull(), // 'post' or 'comment'
		value: integer('value').notNull(), // 1 (upvote), -1 (downvote), 0 (neutral/removed)
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.targetId, t.targetType] }),
		userIdx: index('votes_user_idx').on(t.userId),
		targetIdx: index('votes_target_idx').on(t.targetId),
	})
);

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const notifications = pgTable(
	'notifications',
	{
		id: text('id').primaryKey().default(sql`gen_random_uuid()`),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		
		type: text('type').notNull(), // 'post_reply', 'comment_reply', 'post_upvote', 'follow', etc.
		title: text('title').notNull(),
		description: text('description'),
		
		// Context
		relatedPostId: text('related_post_id').references(() => posts.id, { onDelete: 'set null' }),
		relatedCommentId: text('related_comment_id').references(() => comments.id, { onDelete: 'set null' }),
		relatedUserId: text('related_user_id').references(() => users.id, { onDelete: 'set null' }),
		
		isRead: boolean('is_read').notNull().default(false),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => ({
		userIdx: index('notifications_user_idx').on(t.userId),
		isReadIdx: index('notifications_is_read_idx').on(t.isRead),
		createdAtIdx: index('notifications_created_at_idx').on(t.createdAt.desc()),
	})
);

// ============================================================================
// FOLLOWS (X-style user follows)
// ============================================================================

export const follows = pgTable(
	'follows',
	{
		followerId: text('follower_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		followingId: text('following_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.followerId, t.followingId] }),
		followerIdx: index('follows_follower_idx').on(t.followerId),
		followingIdx: index('follows_following_idx').on(t.followingId),
	})
);

// ============================================================================
// BOOKMARKS
// ============================================================================

export const bookmarks = pgTable(
	'bookmarks',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		postId: text('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.postId] }),
		userIdx: index('bookmarks_user_idx').on(t.userId),
		postIdx: index('bookmarks_post_idx').on(t.postId),
	})
);

// ============================================================================
// MUTED & BLOCKED USERS
// ============================================================================

export const mutedUsers = pgTable(
	'muted_users',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		mutedUserId: text('muted_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.mutedUserId] }),
		userIdx: index('muted_users_user_idx').on(t.userId),
	})
);

export const blockedUsers = pgTable(
	'blocked_users',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		blockedUserId: text('blocked_user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.blockedUserId] }),
		userIdx: index('blocked_users_user_idx').on(t.userId),
	})
);

// ============================================================================
// MUTED KEYWORDS & COMMUNITIES
// ============================================================================

export const mutedKeywords = pgTable(
	'muted_keywords',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		keyword: text('keyword').notNull(),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => ({
		userIdx: index('muted_keywords_user_idx').on(t.userId),
	})
);

export const mutedCommunities = pgTable(
	'muted_communities',
	{
		userId: text('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		communityId: text('community_id')
			.notNull()
			.references(() => communities.id, { onDelete: 'cascade' }),
		
		createdAt: timestamp('created_at').notNull().defaultNow(),
	},
	(t) => ({
		pk: primaryKey({ columns: [t.userId, t.communityId] }),
		userIdx: index('muted_communities_user_idx').on(t.userId),
		communityIdx: index('muted_communities_community_idx').on(t.communityId),
	})
);

// ============================================================================
// APP SETTINGS (single-row table)
// ============================================================================

export const appSettings = pgTable('app_settings', {
	id: integer('id').primaryKey().default(1),
	
	siteName: text('site_name').notNull().default('Nexus Community'),
	tagline: text('tagline').default('The best conversations on the internet.'),
	logoUrl: text('logo_url'),
	brandColor: text('brand_color').default('#4f6ef7'),
	
	// Features
	allowPublicRegistration: boolean('allow_public_registration').notNull().default(true),
	requireEmailVerification: boolean('require_email_verification').notNull().default(false),
	enableNsfwCommunities: boolean('enable_nsfw_communities').notNull().default(true),
	enableRealTimeFeed: boolean('enable_realtime_feed').notNull().default(true),
	
	// Defaults
	defaultSortAlgorithm: text('default_sort_algorithm').default('hot'), // 'hot', 'top', 'new', 'best', 'rising'
	postsPerHourLimit: integer('posts_per_hour_limit').default(10),
	
	// Moderation
	maxPostLength: integer('max_post_length').default(10000),
	maxCommentLength: integer('max_comment_length').default(5000),
	
	setupComplete: boolean('setup_complete').notNull().default(false),
	
	updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many, one }) => ({
	posts: many(posts),
	comments: many(comments),
	sessions: many(sessions),
	accounts: many(accounts),
	followers: many(follows, { relationName: 'followers' }),
	following: many(follows, { relationName: 'following' }),
	bookmarks: many(bookmarks),
	votes: many(votes),
	notifications: many(notifications),
	communityMemberships: many(communityMemberships),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(users, { fields: [posts.userId], references: [users.id] }),
	community: one(communities, { fields: [posts.communityId], references: [communities.id] }),
	comments: many(comments),
	votes: many(votes),
	bookmarks: many(bookmarks),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
	post: one(posts, { fields: [comments.postId], references: [posts.id] }),
	author: one(users, { fields: [comments.userId], references: [users.id] }),
	parent: one(comments, {
		fields: [comments.parentCommentId],
		references: [comments.id],
		relationName: 'replies',
	}),
	votes: many(votes),
}));

export const communitiesRelations = relations(communities, ({ many }) => ({
	members: many(communityMemberships),
	posts: many(posts),
}));

export const communityMembershipsRelations = relations(communityMemberships, ({ one }) => ({
	user: one(users, {
		fields: [communityMemberships.userId],
		references: [users.id],
	}),
	community: one(communities, {
		fields: [communityMemberships.communityId],
		references: [communities.id],
	}),
}));

export *  from './auth.schema.js';
