<script lang="ts">
	import { invalidateAll, invalidate } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import PostCard from '$lib/component/ui/PostCard.svelte';
	import CommentForm from '$lib/component/ui/CommentForm.svelte';
	import Comment from '$lib/component/ui/Comment.svelte';

	let { data }: { data: any } = $props();
	
	// Use $derived so changes in data automatically propagate
	let post = $derived(data.post);
	let comments = $derived(data.comments);
	let sort = $derived(data.sort);

	let showCommentForm = $state(false);
	let replyToCommentId = $state<string | null>(null);
	let commentSort = $state(sort);

	$effect(() => {
		commentSort = sort;
	});

	// Handle vote on post
	async function handlePostVote(value: number) {
		try {
			const response = await fetch(`/api/posts/${post.id}/vote`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ value }),
			});

			if (response.ok) {
				// Invalidate to refresh data
				await invalidateAll();
			} else {
				console.error('Failed to vote on post');
			}
		} catch (error) {
			console.error('Error voting on post:', error);
		}
	}

	// Handle new comment submission
	async function handleCommentSubmit(event: CustomEvent) {
		const { body, parentCommentId } = event.detail;

		try {
			const response = await fetch(`/api/posts/${post.id}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body, parentCommentId }),
			});

			if (response.ok) {
				// Refresh the page data
				await invalidateAll();
				showCommentForm = false;
				replyToCommentId = null;
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to post comment');
			}
		} catch (error) {
			console.error('Error posting comment:', error);
			alert('Failed to post comment');
		}
	}

	// Handle sort change
	async function handleSortChange(newSort: string) {
		commentSort = newSort;
		const url = new URL($page.url);
		url.searchParams.set('sort', newSort);
		await goto(url.toString(), { replaceState: true });
	}

	// Handle reply to comment
	function handleReply(commentId: string) {
		replyToCommentId = commentId;
		showCommentForm = true;
	}
</script>

<svelte:head>
	<title>{post.title} - Sumer</title>
	<meta name="description" content={post.body?.substring(0, 160) || post.title} />
</svelte:head>

<div class="post-detail">
	<!-- Post Content -->
	<div class="post-container">
		<PostCard {post} currentUser={data.currentUser} />
	</div>

	<!-- Comment Section -->
	<div class="comments-section">
		<div class="comments-header">
			<h2>{post.commentCount} Comments</h2>

			<!-- Sort Controls -->
			<div class="sort-controls">
				<label for="comment-sort">Sort by:</label>
				<select
					id="comment-sort"
					bind:value={commentSort}
					onchange={(e) => handleSortChange((e.target as HTMLSelectElement).value)}
				>
					<option value="hot">Hot</option>
					<option value="new">New</option>
					<option value="top">Top</option>
					<option value="old">Old</option>
				</select>
			</div>
		</div>

		<!-- Add Comment Button -->
		<div class="add-comment-section">
			{#if !showCommentForm}
				<button
					class="add-comment-btn"
					onclick={() => { showCommentForm = true; replyToCommentId = null; }}
				>
					Add a comment
				</button>
			{:else}
				<CommentForm
					postId={post.id}
					parentCommentId={replyToCommentId}
					placeholder={replyToCommentId ? 'Write a reply...' : 'Write a comment...'}
					onSubmit={handleCommentSubmit}
					onCancel={() => { showCommentForm = false; replyToCommentId = null; }}
				/>
			{/if}
		</div>

		<!-- Comments List -->
		<div class="comments-list">
			{#each comments as comment (comment.id)}
				<Comment
					{comment}
					postId={post.id}
					onReply={handleReply}
				/>
			{:else}
				<div class="no-comments">
					<p>No comments yet. Be the first to comment!</p>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.post-detail {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
	}

	@media (min-width: 768px) {
		.post-detail {
			grid-template-columns: 1fr 300px;
		}
	}

	.post-container {
		grid-column: 1;
	}

	.comments-section {
		grid-column: 1;
	}

	.comments-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.comments-header h2 {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
	}

	.sort-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
	}

	.sort-controls select {
		padding: 0.25rem 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		background: var(--bg-color);
		color: var(--text-color);
	}

	.add-comment-section {
		margin-bottom: 2rem;
	}

	.add-comment-btn {
		background: var(--primary-color);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.add-comment-btn:hover {
		background: var(--primary-hover);
	}

	.comments-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.no-comments {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-secondary);
	}

	.no-comments p {
		margin: 0;
		font-style: italic;
	}
</style>