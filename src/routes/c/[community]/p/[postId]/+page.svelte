<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import * as Lucide from 'lucide-svelte';
	import PostCard from '$lib/component/ui/PostCard.svelte';
	import CommentForm from '$lib/component/ui/CommentForm.svelte';
	import Comment from '$lib/component/ui/Comment.svelte';

	let { data }: { data: any } = $props();
	let post = $derived(data.post);
	let comments = $derived(data.comments);
	let sort = $derived(data.sort);

	let showCommentForm = $state(false);
	let replyToCommentId = $state<string | null>(null);
	let commentSort = $state(sort);

	$effect(() => {
		commentSort = sort;
	});

	async function handlePostVote(value: number) {
		try {
			const response = await fetch(`/api/posts/${post.id}/vote`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ value }),
			});
			if (response.ok) {
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error voting on post:', error);
		}
	}

	async function handleCommentSubmit(event: CustomEvent) {
		const { body, parentCommentId, imageUrl, gifUrl, linkUrl, linkTitle } = event.detail;
		try {
			const response = await fetch(`/api/posts/${post.id}/comments`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ body, parentCommentId, imageUrl, gifUrl, linkUrl, linkTitle }),
			});
			if (response.ok) {
				await invalidateAll();
				showCommentForm = false;
				replyToCommentId = null;
			} else {
				const error = await response.json();
				alert(error.error || 'Failed to post comment');
			}
		} catch (error) {
			alert('Failed to post comment');
		}
	}

	async function handleSortChange(newSort: string) {
		commentSort = newSort;
		const url = new URL($page.url);
		url.searchParams.set('sort', newSort);
		await goto(url.toString(), { replaceState: true });
	}

	function handleReply(commentId: string) {
		replyToCommentId = commentId;
		showCommentForm = false; // replies are handled inline in Comment.svelte
	}

	const SORT_OPTIONS = [
		{ value: 'hot',  label: 'Hot',  icon: Lucide.Flame },
		{ value: 'new',  label: 'New',  icon: Lucide.Sparkles },
		{ value: 'top',  label: 'Top',  icon: Lucide.TrendingUp },
		{ value: 'old',  label: 'Old',  icon: Lucide.Clock },
	];
</script>

<svelte:head>
	<title>{post.title} - Nexus</title>
	<meta name="description" content={post.body?.substring(0, 160) || post.title} />
</svelte:head>

<div class="post-page">

	<!-- Breadcrumb -->
	<nav class="breadcrumb" aria-label="Breadcrumb">
		<a href="/">Home</a>
		<Lucide.ChevronRight size={12} />
		<a href="/c/{post.community?.name ?? ''}">c/{post.community?.name ?? 'community'}</a>
		<Lucide.ChevronRight size={12} />
		<span class="bc-current" aria-current="page">Post</span>
	</nav>

	<!-- Post Card -->
	<div class="post-card-wrapper">
		<PostCard {post} />
	</div>

	<!-- Comments Section -->
	<div class="comments-section">

		<!-- Toolbar -->
		<div class="comments-toolbar">
			<div class="toolbar-left">
				<Lucide.MessageSquare size={16} />
				<span class="comment-count-label">
					{post.commentCount ?? 0}
					{(post.commentCount ?? 0) === 1 ? 'Comment' : 'Comments'}
				</span>
			</div>
			<div class="toolbar-right">
				<span class="sort-label">Sort by</span>
				<div class="sort-tabs" role="group" aria-label="Sort comments">
					{#each SORT_OPTIONS as opt}
						<button
							class="sort-tab"
							class:active={commentSort === opt.value}
							onclick={() => handleSortChange(opt.value)}
							aria-pressed={commentSort === opt.value}
						>
							<svelte:component this={opt.icon} size={12} />
							{opt.label}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Comment Composer -->
		<div class="composer-wrapper">
			{#if !showCommentForm}
				<button
					type="button"
					class="composer-trigger"
					onclick={() => { showCommentForm = true; replyToCommentId = null; }}
					aria-label="Write a comment"
				>
					<div class="composer-avatar" aria-hidden="true">
						<Lucide.User size={16} />
					</div>
					<span class="composer-placeholder">Add a comment…</span>
					<span class="composer-cta-pill">Comment</span>
				</button>
			{:else}
				<div class="comment-form-wrapper">
					<CommentForm
						postId={post.id}
						parentCommentId={null}
						placeholder="What are your thoughts?"
						onSubmit={handleCommentSubmit}
						onCancel={() => { showCommentForm = false; replyToCommentId = null; }}
					/>
				</div>
			{/if}
		</div>

		<!-- Comments List -->
		<div class="comments-list" role="list" aria-label="Comments">
			{#each comments as comment (comment.id)}
				<div class="comment-item" role="listitem">
					<Comment
						{comment}
						postId={post.id}
						onReply={handleReply}
					/>
				</div>
			{:else}
				<!-- Empty state -->
				<div class="empty-state">
					<div class="empty-icon" aria-hidden="true">
						<Lucide.MessageSquarePlus size={44} />
					</div>
					<p class="empty-title">No comments yet</p>
					<p class="empty-sub">Be the first to share what you think!</p>
					<button
						class="empty-cta"
						onclick={() => { showCommentForm = true; replyToCommentId = null; }}
					>
						Add a comment
					</button>
				</div>
			{/each}
		</div>

	</div>
</div>

<style>
	.post-page {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		max-width: 860px;
	}

	/* ── Breadcrumb ── */
	.breadcrumb {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.775rem;
		color: var(--text-muted);
		padding: 0 0.125rem;
	}

	.breadcrumb a {
		color: var(--text-muted);
		text-decoration: none;
		transition: color 0.12s;
	}

	.breadcrumb a:hover { color: var(--accent); }

	.breadcrumb svg { color: var(--border); flex-shrink: 0; }

	.bc-current {
		color: var(--text-secondary);
		font-weight: 500;
	}

	/* ── Post Card ── */
	.post-card-wrapper {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		overflow: hidden;
		transition: border-color 0.12s;
	}

	.post-card-wrapper:hover { border-color: var(--border-hover); }

	/* ── Comments Section ── */
	.comments-section {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: 12px;
		overflow: hidden;
	}

	/* ── Toolbar ── */
	.comments-toolbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.125rem;
		border-bottom: 1px solid var(--border);
		gap: 1rem;
		flex-wrap: wrap;
	}

	.toolbar-left {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		color: var(--text-muted);
	}

	.comment-count-label {
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.toolbar-right {
		display: flex;
		align-items: center;
		gap: 0.625rem;
	}

	.sort-label {
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.07em;
	}

	.sort-tabs {
		display: flex;
		background: var(--surface-raised);
		border: 1.5px solid var(--border);
		border-radius: 8px;
		overflow: hidden;
	}

	.sort-tab {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.3rem 0.7rem;
		font-size: 0.775rem;
		font-weight: 700;
		color: var(--text-muted);
		background: none;
		border: none;
		border-right: 1px solid var(--border);
		cursor: pointer;
		transition: background 0.12s, color 0.12s;
		font-family: inherit;
		white-space: nowrap;
		letter-spacing: 0.01em;
	}

	.sort-tab:last-child { border-right: none; }

	.sort-tab:hover {
		background: var(--surface-overlay);
		color: var(--text-primary);
	}

	.sort-tab.active {
		background: color-mix(in srgb, var(--accent) 12%, var(--surface-raised));
		color: var(--accent);
	}

	.sort-tab :global(svg) {
		opacity: 0.8;
	}

	/* ── Composer ── */
	.composer-wrapper {
		padding: 0.875rem 1.125rem;
		border-bottom: 1px solid var(--border);
	}

	.composer-trigger {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		width: 100%;
		background: var(--surface-raised);
		border: 1.5px solid var(--border);
		border-radius: 8px;
		padding: 0.55rem 0.875rem;
		cursor: pointer;
		transition: border-color 0.12s, box-shadow 0.12s;
		text-align: left;
	}

	.composer-trigger:hover {
		border-color: var(--accent);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 10%, transparent);
	}

	.composer-avatar {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: var(--surface-overlay);
		border: 1.5px solid var(--border);
		display: grid;
		place-items: center;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.composer-placeholder {
		flex: 1;
		font-size: 0.875rem;
		color: var(--text-muted);
	}

	.composer-cta-pill {
		font-size: 0.75rem;
		font-weight: 800;
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		padding: 0.275rem 0.75rem;
		border-radius: 9999px;
		border: 1.5px solid color-mix(in srgb, var(--accent) 25%, transparent);
		white-space: nowrap;
		letter-spacing: 0.01em;
	}

	.comment-form-wrapper {
		animation: slide-down 0.14s ease-out;
	}

	@keyframes slide-down {
		from { opacity: 0; transform: translateY(-5px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	/* ── Comments List ── */
	.comments-list {
		padding: 0.375rem 0;
	}

	.comment-item {
		padding: 0.5rem 1.125rem;
		border-bottom: 1px solid var(--border);
		transition: background 0.1s;
	}

	.comment-item:last-child { border-bottom: none; }

	.comment-item:hover {
		background: color-mix(in srgb, var(--surface-raised) 60%, transparent);
	}

	/* ── Empty State ── */
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 3.5rem 1rem;
		gap: 0.4rem;
	}

	.empty-icon {
		color: var(--text-muted);
		opacity: 0.3;
		margin-bottom: 0.5rem;
	}

	.empty-title {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text-secondary);
		margin: 0;
	}

	.empty-sub {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin: 0 0 0.875rem;
	}

	.empty-cta {
		background: var(--accent);
		color: white;
		border: none;
		padding: 0.575rem 1.5rem;
		border-radius: 9999px;
		font-weight: 800;
		font-size: 0.85rem;
		cursor: pointer;
		transition: opacity 0.15s, transform 0.1s;
		font-family: inherit;
	}

	.empty-cta:hover {
		opacity: 0.88;
		transform: translateY(-1px);
	}

	/* ── Responsive ── */
	@media (max-width: 600px) {
		.comments-toolbar { flex-direction: column; align-items: flex-start; }
		.sort-label { display: none; }
		.sort-tab { padding: 0.3rem 0.5rem; font-size: 0.72rem; }
		.comment-item { padding: 0.5rem 0.75rem; }
		.composer-wrapper { padding: 0.75rem; }
	}
</style>