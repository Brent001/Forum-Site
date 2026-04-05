import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.ts';

export const load: PageServerLoad = async ({ params, fetch, url, parent }) => {
    const { postId } = params;
    const sort = url.searchParams.get('sort') || 'hot';

    const parentData = await parent();
    const communityData = parentData.community;

    try {
        const response = await fetch(`/api/posts/${postId}?sort=${sort}`);

        if (!response.ok) {
            if (response.status === 404) {
                throw error(404, 'Post not found');
            }
            throw error(500, 'Failed to load post');
        }

        const data = await response.json();

        return {
            post: data.post,
            comments: data.comments,
            sort,
            community: communityData,
        };
    } catch (err) {
        console.error('Error loading post:', err);
        throw error(500, 'Failed to load post');
    }
};