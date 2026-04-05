import { GIPHY_API_KEY } from '$env/static/private';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const FALLBACK_GIFS = [
  'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif',
  'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif',
  'https://media.giphy.com/media/xT9IgG50Lg7russbC8/giphy.gif',
  'https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif',
  'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif',
  'https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif',
];

export const GET: RequestHandler = async ({ url }) => {
  const search = url.searchParams.get('q') || '';
  const limit = parseInt(url.searchParams.get('limit') || '25');
  const offset = parseInt(url.searchParams.get('offset') || '0');
  const apiKey = GIPHY_API_KEY;

  if (!apiKey) {
    return json({ gifs: FALLBACK_GIFS.map(url => ({ url })), source: 'fallback' });
  }

  const giphyUrl = new URL('https://api.giphy.com/v1/gifs/search');
  giphyUrl.searchParams.set('api_key', apiKey);
  giphyUrl.searchParams.set('q', search || 'reaction');
  giphyUrl.searchParams.set('limit', String(Math.min(limit, 50)));
  giphyUrl.searchParams.set('offset', String(offset));
  giphyUrl.searchParams.set('rating', 'g');

  try {
    const response = await fetch(giphyUrl.toString());
    if (!response.ok) {
      return json({ gifs: FALLBACK_GIFS.map(url => ({ url })), source: 'fallback' });
    }
    const data = await response.json();
    if (data.data && data.data.length > 0) {
      const gifs = data.data.map((gif: any) => ({
        id: gif.id,
        url: gif.images.fixed_width.url,
        preview: gif.images.fixed_width_still.url,
        title: gif.title,
      }));
      return json({ gifs, source: 'giphy' });
    }
    return json({ gifs: FALLBACK_GIFS.map(url => ({ url })), source: 'fallback' });
  } catch (err) {
    return json({ gifs: FALLBACK_GIFS.map(url => ({ url })), source: 'fallback' });
  }
};
