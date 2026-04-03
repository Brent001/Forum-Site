<script lang="ts">
  import VoteButton from '$lib/component/ui/VoteButton.svelte';
  import CommentForm from '$lib/component/ui/CommentForm.svelte';
  import * as Lucide from 'lucide-svelte';

  let {
    comment, postId, depth = 0, onReply,
  }: { comment: any; postId: string; depth?: number; onReply?: (commentId: string) => void; } = $props();

  let showReplyForm = $state(false);
  let collapsed = $state(false);
  let isVoting = $state(false);
  let isMinimized = $state(false);

  async function handleVote(value: number) {
    if (isVoting) return;
    isVoting = true;
    try {
      const response = await fetch(`/api/posts/${postId}/comments/${comment.id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
      if (response.ok) { const result = await response.json(); comment.score = result.newScore; comment.userVote = result.userVote; }
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

  const THREAD_COLORS = ['var(--thread-0)','var(--thread-1)','var(--thread-2)','var(--thread-3)','var(--thread-4)'];
  let threadColor = $derived(THREAD_COLORS[depth % THREAD_COLORS.length]);
  let isNested = $derived(depth > 0);
  let hasImage = $derived(comment.imageUrl && comment.imageUrl.length > 0);
  let hasGif = $derived(comment.gifUrl && comment.gifUrl.length > 0);
  let hasLink = $derived(comment.linkUrl && comment.linkUrl.length > 0);
</script>

{#if isMinimized}
  <div class="cm-minimized" style:--thread-color={threadColor}>
    {#if isNested}<div class="cm-thread-line minimized-line" style:background={threadColor}></div>{/if}
    <div class="cm-min-row">
      <button class="cm-expand-toggle" onclick={() => isMinimized = false} aria-label="Expand comment" title="Expand thread">
        <Lucide.ChevronRight size={12} strokeWidth={2.5} />
      </button>
      <span class="cm-min-author">{comment.author.username}</span>
      <span class="cm-min-score">{scoreLabel(comment.score)} pts</span>
      <span class="cm-min-time">{formatTime(comment.createdAt)}</span>
      {#if comment.replies?.length > 0}
        <span class="cm-min-replies">{comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}</span>
      {/if}
    </div>
  </div>
{:else}
  <div class="cm-root" class:nested={isNested}>
    {#if isNested}
      <button class="cm-thread-btn" onclick={() => isMinimized = true} aria-label="Collapse thread" title="Collapse thread" style:--thread-color={threadColor}>
        <div class="cm-thread-line" style:background={threadColor}></div>
      </button>
    {/if}

    <div class="cm-inner">
      <div class="cm-header">
        <div class="cm-avatar">
          {#if comment.author.avatarUrl}
            <img src={comment.author.avatarUrl} alt={comment.author.username} class="cm-avatar-img" />
          {:else}
            <div class="cm-avatar-placeholder">{comment.author.username.charAt(0).toUpperCase()}</div>
          {/if}
        </div>

          <div class="cm-meta">
            <a href="/u/{comment.author.username}" class="cm-username">{comment.author.username}</a>
            {#if comment.isBestAnswer}<span class="cm-badge cm-badge-best"><Lucide.CheckCircle size={12} /> Best Answer</span>{/if}
            {#if comment.author.isOP}<span class="cm-badge cm-badge-op">OP</span>{/if}
          <span class="cm-dot">·</span>
          <time class="cm-time" datetime={comment.createdAt} title={new Date(comment.createdAt).toLocaleString()}>{formatTime(comment.createdAt)}</time>
          {#if comment.isEdited}<span class="cm-edited">(edited)</span>{/if}
        </div>

        <button class="cm-collapse-btn" onclick={() => isMinimized = true} aria-label="Minimize comment" title="Minimize">
          <Lucide.ChevronUp size={13} strokeWidth={2.5} />
        </button>
      </div>

      {#if comment.body}
        <div class="cm-body">{@html comment.body.replace(/\n/g, '<br>')}</div>
      {/if}

      {#if hasImage}
        <div class="cm-media"><img src={comment.imageUrl} alt="Attached image" class="cm-media-img" loading="lazy" /></div>
      {/if}

      {#if hasGif}
        <div class="cm-media"><img src={comment.gifUrl} alt="GIF" class="cm-media-img cm-media-gif" loading="lazy" /></div>
      {/if}

      {#if hasLink}
        <a href={comment.linkUrl} target="_blank" rel="noopener noreferrer" class="cm-link-card">
          <div class="cm-link-icon"><Lucide.Link2 size={14} /></div>
          <div class="cm-link-text">
            <span class="cm-link-title">{comment.linkTitle || comment.linkUrl}</span>
            <span class="cm-link-url">{comment.linkUrl}</span>
          </div>
          <div class="cm-link-arrow"><Lucide.ChevronRight size={12} strokeWidth={2.5} /></div>
        </a>
      {/if}

      <div class="cm-actions">
        <div class="cm-vote-cluster">
          <VoteButton direction="up" active={comment.userVote === 1} onclick={() => handleVote(comment.userVote === 1 ? 0 : 1)} />
          <span class="cm-score" class:positive={comment.score > 0} class:negative={comment.score < 0}>{scoreLabel(comment.score)}</span>
          <VoteButton direction="down" active={comment.userVote === -1} onclick={() => handleVote(comment.userVote === -1 ? 0 : -1)} />
        </div>

        <div class="cm-action-divider"></div>

        <button class="cm-action-btn" onclick={() => showReplyForm = !showReplyForm} aria-expanded={showReplyForm}>
          <Lucide.MessageSquare size={13} strokeWidth={2.5} />Reply
        </button>

        <button class="cm-action-btn">
          <Lucide.Share2 size={13} strokeWidth={2.5} />Share
        </button>

        <button class="cm-action-btn cm-overflow-btn" aria-label="More options">
          <Lucide.MoreHorizontal size={14} strokeWidth={2.5} />
        </button>
      </div>

      {#if showReplyForm}
        <div class="cm-reply-form">
          <CommentForm {postId} parentCommentId={comment.id} placeholder="Reply to {comment.author.username}…" onSubmit={handleReplySubmit} onCancel={() => showReplyForm = false} compact={true} />
        </div>
      {/if}
    </div>
  </div>

  {#if comment.replies && comment.replies.length > 0}
    <div class="cm-replies">
      {#each comment.replies as reply (reply.id)}
        <svelte:self comment={reply} {postId} depth={depth + 1} {onReply} />
      {/each}
    </div>
  {/if}
{/if}

<style>
  :global(:root) {
    --thread-0: #7c3aed; --thread-1: #2563eb; --thread-2: #059669;
    --thread-3: #d97706; --thread-4: #db2777;
  }

  .cm-root { display: flex; gap: 0; padding: 0.5rem 0; }
  .cm-root.nested { padding: 0.35rem 0; }

  .cm-thread-btn { width: 24px; flex-shrink: 0; background: none; border: none; padding: 0; cursor: pointer; display: flex; justify-content: center; padding-top: 2rem; opacity: 0.35; transition: opacity 0.15s; }
  .cm-thread-btn:hover { opacity: 1; }
  .cm-thread-line { width: 2px; border-radius: 2px; min-height: 20px; flex: 1; }

  .cm-inner { flex: 1; min-width: 0; }

  .cm-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.4rem; }

  .cm-avatar { width: 24px; height: 24px; flex-shrink: 0; }
  .cm-avatar-img { width: 24px; height: 24px; border-radius: 50%; object-fit: cover; }
  .cm-avatar-placeholder { width: 24px; height: 24px; border-radius: 50%; background: var(--accent); color: white; font-size: 0.65rem; font-weight: 700; display: grid; place-items: center; border: 1px solid var(--border); }

  .cm-meta { display: flex; align-items: center; gap: 0.35rem; flex: 1; min-width: 0; flex-wrap: wrap; }
  .cm-username { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); text-decoration: none; transition: color 0.12s; }
  .cm-username:hover { color: var(--accent); }
  .cm-badge { font-size: 0.65rem; font-weight: 700; padding: 0.1rem 0.4rem; border-radius: 4px; letter-spacing: 0.02em; text-transform: uppercase; }
  .cm-badge-best { background: color-mix(in srgb, #22c55e 15%, transparent); color: #16a34a; border: 1px solid color-mix(in srgb, #22c55e 30%, transparent); }
  .cm-badge-op { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent); }
  .cm-dot { color: var(--text-muted); font-size: 0.75rem; }
  .cm-time { font-size: 0.75rem; color: var(--text-muted); }
  .cm-edited { font-size: 0.72rem; color: var(--text-muted); font-style: italic; }

  .cm-collapse-btn { margin-left: auto; flex-shrink: 0; background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px; border-radius: 4px; display: grid; place-items: center; opacity: 0; transition: opacity 0.15s, color 0.15s; }
  .cm-root:hover .cm-collapse-btn, .cm-inner:focus-within .cm-collapse-btn { opacity: 1; }
  .cm-collapse-btn:hover { color: var(--text-primary); }

  .cm-body { font-size: 0.9rem; line-height: 1.65; color: var(--text-primary); word-wrap: break-word; margin-bottom: 0.6rem; }
  .cm-media { margin-bottom: 0.6rem; border-radius: 8px; overflow: hidden; display: inline-block; max-width: 100%; border: 1px solid var(--border); }
  .cm-media-img { display: block; max-width: 100%; max-height: 400px; object-fit: contain; border-radius: 8px; }
  .cm-media-gif { max-height: 280px; }

  .cm-link-card { display: flex; align-items: center; gap: 0.625rem; padding: 0.5rem 0.75rem; background: var(--surface-raised); border: 1.5px solid var(--border); border-radius: 8px; text-decoration: none; color: inherit; margin-bottom: 0.6rem; transition: border-color 0.15s, background 0.15s; max-width: 480px; }
  .cm-link-card:hover { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 4%, var(--surface-raised)); }
  .cm-link-icon { flex-shrink: 0; width: 28px; height: 28px; border-radius: 6px; background: color-mix(in srgb, var(--accent) 12%, transparent); color: var(--accent); display: grid; place-items: center; }
  .cm-link-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  .cm-link-title { font-size: 0.8rem; font-weight: 600; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cm-link-url { font-size: 0.7rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cm-link-arrow { flex-shrink: 0; color: var(--text-muted); }

  .cm-actions { display: flex; align-items: center; gap: 0.1rem; flex-wrap: wrap; }
  .cm-vote-cluster { display: flex; align-items: center; gap: 0.15rem; background: var(--surface-raised); border: 1.5px solid var(--border); border-radius: 9999px; padding: 2px 6px; }
  .cm-score { font-size: 0.75rem; font-weight: 700; min-width: 18px; text-align: center; color: var(--text-muted); }
  .cm-score.positive { color: #ef4444; }
  .cm-score.negative { color: #3b82f6; }
  .cm-action-divider { width: 1px; height: 16px; background: var(--border); margin: 0 0.25rem; }
  .cm-action-btn { display: inline-flex; align-items: center; gap: 0.3rem; background: none; border: none; color: var(--text-muted); font-size: 0.75rem; font-weight: 700; cursor: pointer; padding: 0.35rem 0.5rem; border-radius: 6px; font-family: inherit; transition: background 0.12s, color 0.12s; letter-spacing: 0.01em; }
  .cm-action-btn:hover { background: var(--surface-raised); color: var(--text-primary); }
  .cm-overflow-btn { padding: 0.35rem 0.3rem; }

  .cm-reply-form { margin-top: 0.75rem; animation: cm-slide-down 0.15s ease-out; }
  @keyframes cm-slide-down { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }

  .cm-replies { padding-left: 1.125rem; }

  .cm-minimized { display: flex; align-items: center; gap: 0; padding: 0.3rem 0; }
  .minimized-line { width: 2px; height: 20px; border-radius: 2px; opacity: 0.45; flex-shrink: 0; margin-right: 0.5rem; }
  .cm-min-row { display: flex; align-items: center; gap: 0.5rem; }
  .cm-expand-toggle { width: 18px; height: 18px; border-radius: 4px; background: var(--surface-raised); border: 1.5px solid var(--border); cursor: pointer; display: grid; place-items: center; color: var(--text-muted); transition: border-color 0.12s; }
  .cm-expand-toggle:hover { border-color: var(--accent); color: var(--accent); }
  .cm-min-author { font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); }
  .cm-min-score, .cm-min-time, .cm-min-replies { font-size: 0.73rem; color: var(--text-muted); }
  .cm-min-replies { background: var(--surface-raised); border: 1px solid var(--border); border-radius: 4px; padding: 0.1rem 0.4rem; }

  @media (max-width: 600px) { .cm-replies { padding-left: 0.75rem; } .cm-thread-btn { width: 20px; } .cm-media-img { max-height: 260px; } }
</style>