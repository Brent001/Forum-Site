import type { RequestHandler } from './$types.js';
import { db } from '$lib/server/db/index.js';
import { users } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

interface ConnectedClient {
	id: string;
	userId?: string;
	username?: string;
	community?: string;
	controller: ReadableStreamDefaultController;
	lastActivity: number;
}

const clients = new Set<ConnectedClient>();
const onlineUsers = new Set<string>(); // Track unique online user IDs
const communityOnlineUsers = new Map<string, Set<string>>(); // Track users per community

// Broadcast online count to all connected clients
function broadcastOnlineCount() {
	const globalData = `data: ${JSON.stringify({ type: 'online_count', count: onlineUsers.size })}\n\n`;

	// Broadcast community-specific counts
	const communityData = Array.from(communityOnlineUsers.entries()).map(([community, users]) =>
		`data: ${JSON.stringify({ type: 'community_online_count', community, count: users.size })}\n\n`
	);

	clients.forEach(client => {
		try {
			client.controller.enqueue(new TextEncoder().encode(globalData));
			communityData.forEach(data => {
				client.controller.enqueue(new TextEncoder().encode(data));
			});
		} catch (e) {
			clients.delete(client);
			// Check if this user has any other connections
			if (client.userId) {
				checkUserConnections(client.userId);
			}
		}
	});
}

// Check if a user has any active connections, remove from onlineUsers if not
function checkUserConnections(userId: string) {
	const hasConnections = Array.from(clients).some(client => client.userId === userId);
	if (!hasConnections) {
		onlineUsers.delete(userId);
		// Remove user from all communities
		communityOnlineUsers.forEach(users => users.delete(userId));
		broadcastOnlineCount();
	}
}

// Update user's last seen time
async function updateLastSeen(userId: string) {
	try {
		await db
			.update(users)
			.set({ updatedAt: new Date() })
			.where(eq(users.id, userId));
	} catch (e) {
		console.error('Failed to update last seen:', e);
	}
}

export const GET: RequestHandler = async ({ request, locals, url }) => {
	const community = url.searchParams.get('community') || null;
	const stream = new ReadableStream({
		start(controller) {
			const clientId = `client_${Date.now()}_${Math.random()}`;
			const client: ConnectedClient = {
				id: clientId,
				userId: locals.user?.id,
				username: locals.user?.username,
				community: community || undefined,
				controller,
				lastActivity: Date.now()
			};

			clients.add(client);
			// Only count authenticated users for online count
			if (locals.user && !onlineUsers.has(locals.user.id)) {
				onlineUsers.add(locals.user.id);
			}

			// Track user in community if specified
			if (locals.user && community) {
				if (!communityOnlineUsers.has(community)) {
					communityOnlineUsers.set(community, new Set());
				}
				communityOnlineUsers.get(community)!.add(locals.user.id);
			}

			broadcastOnlineCount();

			// Update last seen if authenticated
			if (locals.user) {
				updateLastSeen(locals.user.id);
			}

			controller.enqueue(new TextEncoder().encode(': connected\n\n'));
		},
		cancel(controller) {
			// Find and remove the client
			for (const client of clients) {
				if (client.controller === controller) {
					clients.delete(client);
					// Remove user from community tracking
					if (client.userId && client.community) {
						const communityUsers = communityOnlineUsers.get(client.community);
						if (communityUsers) {
							communityUsers.delete(client.userId);
							// Clean up empty community sets
							if (communityUsers.size === 0) {
								communityOnlineUsers.delete(client.community);
							}
						}
					}
					// Check if this user has any other connections
					if (client.userId) {
						checkUserConnections(client.userId);
					}
					break;
				}
			}
		}
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'Connection': 'keep-alive',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Headers': 'Cache-Control',
		}
	});
};