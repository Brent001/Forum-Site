import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { communities } from '$lib/server/db/schema.js';
import type { PageServerLoad } from './$types.ts';

export const load: PageServerLoad = async ({ params, fetch, url, locals }) => {
    const { postId, community: communityName } = params;
    const sort = url.searchParams.get('sort') || 'hot';

    try {
        // Fetch community info
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

        // Fetch post data from our API
        const response = await fetch(`/api/posts/${postId}?sort=${sort}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw error(404, 'Post not found');
            }
            throw error(500, 'Failed to load post');
        }

        const data = await response.json();

        const community = communityRows && communityRows.length > 0 ? communityRows[0] : null;

        return {
            post: data.post,
            comments: data.comments,
            sort,
            community: community ? {
                id: community.id,
                name: community.name,
                displayName: community.displayName,
                description: community.description || '',
                icon: community.icon || '🌐',
                memberCount: Number(community.memberCount || 0),
                postCount: Number(community.postCount || 0),
            } : null,
        };
    } catch (err) {
        console.error('Error loading post:', err);
        throw error(500, 'Failed to load post');
    }
};