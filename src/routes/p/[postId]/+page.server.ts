import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types.ts';

export const load: PageServerLoad = async ({ params, fetch, url }) => {
	const { postId } = params;
	const sort = url.searchParams.get('sort') || 'hot';

	try {
		// Fetch post data from our API
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
		};
	} catch (err) {
		console.error('Error loading post:', err);
		throw error(500, 'Failed to load post');
	}
};