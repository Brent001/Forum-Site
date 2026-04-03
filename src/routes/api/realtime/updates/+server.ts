import { eq, gt, sql, inArray, desc } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { posts, votes } from '$lib/server/db/schema.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request, url, locals }) => {
  const postId = url.searchParams.get('postId');
  
  if (!postId) {
    return Response.json({ error: 'postId required' }, { status: 400 });
  }

  try {
    const [post] = await db
      .select({
        id: posts.id,
        score: posts.score,
        upvotes: posts.upvotes,
        downvotes: posts.downvotes,
        commentCount: posts.commentCount,
      })
      .from(posts)
      .where(eq(posts.id, postId))
      .limit(1);

    if (!post) {
      return Response.json({ error: 'Post not found' }, { status: 404 });
    }

    let userVote = 0;
    if (locals.user) {
      const [vote] = await db
        .select()
        .from(votes)
        .where(sql`${votes.userId} = ${locals.user.id} AND ${votes.targetId} = ${postId} AND ${votes.targetType} = 'post'`)
        .limit(1);
      userVote = vote?.value ?? 0;
    }

    return Response.json({
      type: 'post_update',
      postId,
      updates: {
        score: Number(post.score),
        upvotes: Number(post.upvotes),
        downvotes: Number(post.downvotes),
        commentCount: Number(post.commentCount),
        userVote,
      }
    });
  } catch (error) {
    console.error('[Realtime] Update fetch error:', error);
    return Response.json({ error: 'Failed to fetch updates' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url, locals }) => {
  const since = url.searchParams.get('since');
  const postIds = url.searchParams.get('postIds');

  if (!postIds) {
    return Response.json({ updates: [] });
  }

  try {
    const ids = postIds.split(',').slice(0, 50);
    
    const postsData = await db
      .select({
        id: posts.id,
        score: posts.score,
        upvotes: posts.upvotes,
        downvotes: posts.downvotes,
        commentCount: posts.commentCount,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(inArray(posts.id, ids));

    const updates: any[] = [];
    
    for (const post of postsData) {
      if (since) {
        const updated = new Date(post.updatedAt!).getTime();
        if (updated < parseInt(since)) continue;
      }

      let userVote = 0;
      if (locals.user) {
        const [vote] = await db
          .select()
          .from(votes)
          .where(sql`${votes.userId} = ${locals.user.id} AND ${votes.targetId} = ${post.id} AND ${votes.targetType} = 'post'`)
          .limit(1);
        userVote = vote?.value ?? 0;
      }

      updates.push({
        type: 'post_update',
        postId: post.id,
        updates: {
          score: Number(post.score),
          upvotes: Number(post.upvotes),
          downvotes: Number(post.downvotes),
          commentCount: Number(post.commentCount),
          userVote,
        }
      });
    }

    return Response.json({ updates });
  } catch (error) {
    console.error('[Realtime] Updates fetch error:', error);
    return Response.json({ updates: [], error: 'Failed to fetch updates' }, { status: 500 });
  }
};