<script lang="ts">
  import CommentForm from '$lib/component/ui/CommentForm.svelte';
  import Comment from '$lib/component/ui/Comment.svelte';
  import Icon from '@iconify/svelte';

  let {
    comment, postId, depth = 0, onReply, onVote,
  }: { comment: any; postId: string; depth?: number; onReply?: (commentId: string) => void; onVote?: (commentId: string, newScore: number, userVote: number) => void; } = $props();

  let showReplyForm = $state(false);
  let collapsed = $state(false);
  let isVoting = $state(false);
  let isMinimized = $state(false);

  async function handleVote(value: number) {
    if (isVoting) return;
    isVoting = true;
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${comment.id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
      if (response.ok) {
        const result = await response.json();
        comment.score = result.newScore;
        comment.userVote = result.userVote;
        if (onVote) onVote(comment.id, result.newScore, result.userVote);
      }
    } catch (error) { console.error('Error voting on comment:', error); }
    finally { isVoting = false; }
  }

  async function handleReplySubmit(event: CustomEvent) {
    const { body, parentCommentId, imageUrl, gifUrl, linkUrl, linkTitle } = event.detail;
    try {
      const response = await fetch(`/api/posts/${postId}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body, parentCommentId, imageUrl, gifUrl, linkUrl, linkTitle }) });
      if (response.ok) { onReply?.(comment.id); showReplyForm = false; }
    } catch (error) { console.error('Error posting reply:', error); }
  }

  function formatTime(date: string) {
    const now = new Date(); const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function scoreLabel(score: number) { if (score >= 1000) return `${(score / 1000).toFixed(1)}k`; return String(score); }

  const THREAD_COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#db2777'];
  let threadColor = $derived(THREAD_COLORS[depth % THREAD_COLORS.length]);
  let isNested = $derived(depth > 0);
  let hasImage = $derived(comment.imageUrl && comment.imageUrl.length > 0);
  let hasGif = $derived(comment.gifUrl && comment.gifUrl.length > 0);
  let hasLink = $derived(comment.linkUrl && comment.linkUrl.length > 0);
</script>

{#if isMinimized}
  <div class="flex items-center gap-0 py-[0.3rem]" style:--thread-color={threadColor}>
    {#if isNested}<div class="w-0.5 h-5 rounded-xs shrink-0 mr-2 opacity-45" style:background={threadColor}></div>{/if}
    <div class="flex items-center gap-2">
      <button type="button" class="w-4.5 h-4.5 rounded bg-surface-raised border border-border cursor-pointer flex items-center justify-center text-text-muted hover:border-accent hover:text-accent transition-colors" onclick={() => isMinimized = false} aria-label="Expand comment" title="Expand thread">
        <Icon icon="lucide:plus-circle" width="14" height="14" />
      </button>
      <span class="text-[0.78rem] font-bold text-text-secondary">{comment.author.username}</span>
      <span class="text-[0.73rem] text-text-muted">{scoreLabel(comment.score)} pts</span>
      <span class="text-[0.73rem] text-text-muted">{formatTime(comment.createdAt)}</span>
      {#if comment.replies?.length > 0}
        <span class="text-[0.73rem] text-text-muted bg-surface-raised border border-border rounded px-1 py-[0.1rem]">{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
      {/if}
    </div>
  </div>
{:else}
  <div class="flex gap-0 py-2" class:py-[0.35rem]={isNested}>
    {#if isNested}
      <button class="w-6 shrink-0 bg-transparent border-none p-0 cursor-pointer flex justify-center pt-8 opacity-35 hover:opacity-100 transition-opacity" onclick={() => isMinimized = true} aria-label="Collapse thread" title="Collapse thread" style:--thread-color={threadColor}>
        <div class="w-0.5 min-h-5 rounded-xs flex-1" style:background={threadColor}></div>
      </button>
    {/if}

    <div class="flex-1 min-w-0 group">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-6 h-6 shrink-0">
          {#if comment.author.avatarUrl}
            <img src={comment.author.avatarUrl} alt={comment.author.username} class="w-6 h-6 rounded-full object-cover" />
          {:else}
            <div class="w-6 h-6 rounded-full bg-accent text-white text-[0.65rem] font-bold flex items-center justify-center border border-border">{(comment.author.username || '?').charAt(0).toUpperCase()}</div>
          {/if}
        </div>

        <div class="flex items-center gap-[0.35rem] flex-1 min-w-0 flex-wrap">
          <a href="/u/{comment.author.username}" class="text-[0.8rem] font-bold text-text-primary no-underline hover:text-accent transition-colors">{comment.author.username}</a>
          {#if comment.isBestAnswer}
            <span class="text-[0.65rem] font-bold px-1 py-[0.1rem] rounded uppercase tracking-wide bg-[#22c55e15%] text-[#16a34a] border border-[#22c55e30%] flex items-center gap-1">
              <Icon icon="lucide:check-circle" width="12" height="12" /> Best Answer
            </span>
          {/if}
          {#if comment.author.isOP}<span class="text-[0.65rem] font-bold px-1 py-[0.1rem] rounded uppercase tracking-wide bg-accent/15 text-accent border border-accent/25">OP</span>{/if}
          <span class="text-[0.75rem] text-text-muted">·</span>
          <time class="text-[0.75rem] text-text-muted" datetime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString()}>{formatTime(comment.createdAt)}</time>
          {#if comment.isEdited}<span class="text-[0.72rem] text-text-muted italic">(edited)</span>{/if}
        </div>

        <button class="ml-auto shrink-0 bg-transparent border-none text-text-muted cursor-pointer p-0.5 rounded flex items-center opacity-0 group-hover:opacity-100 hover:opacity-100 hover:text-text-primary transition-all" onclick={() => isMinimized = true} aria-label="Minimize comment" title="Minimize">
          <Icon icon="lucide:minus-circle" width="14" height="14" />
        </button>
      </div>

      {#if comment.body}
        <div class="text-[0.9rem] leading-[1.65] text-text-primary wrap-break-word mb-[0.6rem]">{@html comment.body.replace(/\n/g, '<br>')}</div>
      {/if}

      {#if hasImage}
        <div class="mb-[0.6rem] rounded-lg overflow-hidden inline-block max-w-full border border-border"><img src={comment.imageUrl} alt="" class="block max-w-full max-h-100 object-contain rounded-lg" loading="lazy" /></div>
      {/if}

      {#if hasGif}
        <div class="mb-[0.6rem] rounded-lg overflow-hidden inline-block max-w-full border border-border"><img src={comment.gifUrl} alt="" class="block max-w-full max-h-70 object-contain rounded-lg" loading="lazy" /></div>
      {/if}

      {#if hasLink}
        <a href={comment.linkUrl} target="_blank" rel="noopener noreferrer" class="flex items-center gap-2.5 p-2 bg-surface-raised border border-border rounded-lg text-text-primary no-underline mb-[0.6rem] transition-colors hover:border-accent hover:bg-accent/4 max-w-120">
          <div class="w-7 h-7 rounded-md bg-accent/12 text-accent flex items-center justify-center shrink-0">
            <Icon icon="lucide:link-2" width="14" height="14" />
          </div>
          <div class="flex-1 min-w-0 flex flex-col gap-0.5">
            <span class="text-[0.8rem] font-semibold text-text-primary truncate overflow-hidden whitespace-nowrap">{comment.linkTitle || comment.linkUrl}</span>
            <span class="text-[0.7rem] text-text-muted truncate overflow-hidden whitespace-nowrap">{comment.linkUrl}</span>
          </div>
          <div class="shrink-0 text-text-muted"><Icon icon="lucide:chevron-right" width="12" height="12" /></div>
        </a>
      {/if}

      <div class="flex items-center gap-0 flex-wrap">
        <div class="flex items-center gap-[0.15rem] bg-surface-raised border border-border rounded-full px-1.5 py-0.5">
          <button type="button" class="flex items-center justify-center w-6 h-6 rounded-md border-none bg-transparent cursor-pointer text-text-muted hover:bg-surface transition-colors" class:vote-up-active={comment.userVote === 1} aria-label="upvote" onclick={() => handleVote(comment.userVote === 1 ? 0 : 1)}>
            <Icon icon="lucide:chevron-up" width="16" height="16" />
          </button>
          <span class="text-[0.75rem] font-bold min-w-4.5 text-center text-text-muted" class:text-[#ef4444]={comment.score > 0} class:text-[#3b82f6]={comment.score < 0}>{scoreLabel(comment.score)}</span>
          <button type="button" class="flex items-center justify-center w-6 h-6 rounded-md border-none bg-transparent cursor-pointer text-text-muted hover:bg-surface transition-colors" class:vote-down-active={comment.userVote === -1} aria-label="downvote" onclick={() => handleVote(comment.userVote === -1 ? 0 : -1)}>
            <Icon icon="lucide:chevron-down" width="16" height="16" />
          </button>
        </div>

        <div class="w-px h-4 bg-border mx-1"></div>

        <button class="inline-flex items-center gap-1 bg-transparent border-none text-text-muted text-[0.75rem] font-bold cursor-pointer px-2 py-1.5 rounded-md font-inherit hover:bg-surface-raised hover:text-text-primary transition-colors" onclick={() => showReplyForm = !showReplyForm} aria-expanded={showReplyForm}>
          <Icon icon="lucide:message-square" width="13" height="13" />Reply
        </button>

        <button class="inline-flex items-center gap-1 bg-transparent border-none text-text-muted text-[0.75rem] font-bold cursor-pointer px-2 py-1.5 rounded-md font-inherit hover:bg-surface-raised hover:text-text-primary transition-colors">
          <Icon icon="lucide:share-2" width="13" height="13" />Share
        </button>

        <button class="p-1.5 bg-transparent border-none text-text-muted cursor-pointer rounded-md hover:bg-surface-raised hover:text-text-primary transition-colors" aria-label="More options">
          <Icon icon="lucide:more-horizontal" width="14" height="14" />
        </button>
      </div>

      {#if showReplyForm}
        <div class="mt-3 animate-[cm-slide-down_0.15s_ease-out]">
          <CommentForm {postId} parentCommentId={comment.id} placeholder="Reply to {comment.author.username}…" onSubmit={handleReplySubmit} onCancel={() => showReplyForm = false} compact={true} />
        </div>
      {/if}
    </div>
  </div>

  {#if comment.replies && comment.replies.length > 0}
    <div class="pl-4">
      {#each comment.replies as reply (reply.id)}
        <Comment comment={reply} {postId} depth={depth + 1} {onReply} />
      {/each}
    </div>
  {/if}
{/if}

<style>
  @keyframes cm-slide-down {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  :global(:root) {
    --thread-0: #7c3aed; --thread-1: #2563eb; --thread-2: #059669;
    --thread-3: #d97706; --thread-4: #db2777;
  }

  :global(.vote-btn:hover)       { background: var(--surface); }
  :global(.vote-btn.up:hover)    { color: var(--vote-up);   background: #ff450020; }
  :global(.vote-btn.down:hover)  { color: var(--vote-down); background: #7193ff20; }
  :global(.vote-btn.up.active)   { color: var(--vote-up);   background: #ff450030; font-weight: 600; }
  :global(.vote-btn.down.active) { color: var(--vote-down); background: #7193ff30; font-weight: 600; }

  .vote-up-active   { color: var(--vote-up)   !important; background: #ff450030 !important; font-weight: 600; }
  .vote-down-active { color: var(--vote-down) !important; background: #7193ff30 !important; font-weight: 600; }

  @media (max-width: 600px) {
    .pl-4 { padding-left: 0.75rem; }
    :global(.cm-thread-btn) { width: 20px; }
    :global(.cm-media-img)  { max-height: 260px; }
  }
</style>