<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import UserAvatar from './UserAvatar.svelte';
  import CommunityAvatar from './CommunityAvatar.svelte';
  import EditPostModal from './EditPostModal.svelte';
  import Icon from '@iconify/svelte';
  import { realtime } from '$lib/stores/realtime.js';

  type Post = {
    id: string;
    type: 'text' | 'link' | 'image' | 'video' | 'poll';
    title: string;
    body: string | null;
    mediaUrls: string[];
    linkUrl: string | null;
    linkPreview: { title: string; description: string; image: string; domain: string } | null;
    author: { id?: string; username: string; avatarUrl: string };
    community: { name: string; displayName: string; icon: string };
    upvotes: number;
    downvotes: number;
    score: number;
    commentCount: number;
    createdAt: string | Date;
    isNsfw: boolean;
    isSpoiler: boolean;
    isEdited: boolean;
    isDeleted?: boolean;
    flair: string | null;
    flairColor: string | null;
    userVote: -1 | 0 | 1;
    isBookmarked: boolean;
    pollOptions?: string[] | null;
    pollVotes?: Record<string, number> | null;
    pollTotalVotes?: number;
    pollEndsAt?: string | Date | null;
    pollAllowMultiple?: boolean;
    pollAllowChange?: boolean;
    userPollVote?: string | null;
  };

  function toDate(value: string | Date) {
    return typeof value === 'string' ? new Date(value) : value;
  }

  let { post: postProp, compact = false, postUrl: postUrlProp, currentUser = null } = $props<{ post?: Post; compact?: boolean; postUrl?: string; currentUser?: { id: string; username: string; email: string } | null; }>();

  const defaultPost: Post = {
    id: '1', type: 'text',
    title: 'The future of AI-powered developer tools',
    body: 'A deep dive into how language models are reshaping the way we write, debug, and ship software.',
    mediaUrls: [], linkUrl: '', linkPreview: null,
    author: { id: '1', username: 'threedots', avatarUrl: '' },
    community: { name: 'technology', displayName: 'Technology', icon: '⚡' },
    upvotes: 1284, downvotes: 43, score: 1241, commentCount: 87,
    createdAt: new Date(Date.now() - 3600000 * 2),
    isNsfw: false, isSpoiler: false, isEdited: false, flair: 'Discussion', flairColor: '#3b82f6',
    userVote: 0, isBookmarked: false,
  };

  let localPost = $state<Post>(structuredClone(defaultPost));
  let postUrl = $state('');

  $effect(() => {
    localPost = structuredClone(postProp ?? defaultPost);
  });

  $effect(() => {
    postUrl = postUrlProp ?? `/c/${localPost?.community?.name}/p/${localPost?.id}`;
  });

  let showMoreMenu = $state(false);
  let showDeleteConfirm = $state(false);
  let showLoginPrompt = $state(false);
  let showEditModal = $state(false);

  let unsubscribe: (() => void) | null = null;

  onMount(() => {
    if (!localPost?.id) return;
    realtime.requestUpdate(localPost.id);
    unsubscribe = realtime.on((event) => {
      if ('postId' in event && event.postId !== localPost.id) return;
      if (event.type === 'vote_update') {
        localPost.score = event.score;
        localPost.userVote = event.userVote as -1 | 0 | 1;
      } else if (event.type === 'post_update') {
        if (event.updates?.score !== undefined) localPost.score = event.updates.score;
        if (event.updates?.userVote !== undefined) localPost.userVote = event.updates.userVote as -1 | 0 | 1;
        if (event.updates?.upvotes !== undefined) localPost.upvotes = event.updates.upvotes;
        if (event.updates?.downvotes !== undefined) localPost.downvotes = event.updates.downvotes;
        if (event.updates?.commentCount !== undefined) localPost.commentCount = event.updates.commentCount;
      }
    });

    // Add click outside listener only in browser
    if (browser) {
      document.addEventListener('click', handleClickOutside);
    }
  });

  onDestroy(() => { 
    if (unsubscribe) unsubscribe();
    if (browser) {
      document.removeEventListener('click', handleClickOutside);
    }
  });

  function toggleBookmark() { localPost.isBookmarked = !localPost.isBookmarked; }

  function startEdit() {
    showEditModal = true;
  }

  async function handleVote(value: -1 | 0 | 1) {
    const nextVote = localPost.userVote === value ? 0 : value;
    try {
      const response = await fetch(`/api/posts/${localPost.id}/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: nextVote }) });
      if (!response.ok) { const error = await response.json(); console.error('[Vote] Error:', error); return; }
      const data = await response.json();
      localPost.score = data.newScore;
      localPost.userVote = data.userVote;
    } catch (e) { console.error('[Vote] Network error:', e); }
  }

  function formatScore(score: number): string {
    if (score >= 1000000) return (score / 1000000).toFixed(1) + 'M';
    if (score >= 1000) return (score / 1000).toFixed(1) + 'K';
    return score.toString();
  }

  function getTimeAgo(date: string | Date): string {
    const now = new Date();
    const then = toDate(date);
    const diff = now.getTime() - then.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  }

  function shouldShowEmbed(url: string | null): boolean {
    if (typeof url !== 'string') return false;
    const embedHosts = ['youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv', 'spotify.com', 'soundcloud.com'];
    const safeUrl = url;
    try {
      const parsed = new URL(safeUrl);
      return embedHosts.some(host => parsed.hostname.includes(host));
    } catch {
      return false;
    }
  }

  function getEmbedUrl(url: string | null): string | null {
    if (!url) return null;
    const safeUrl = url;
    try {
      const parsed = new URL(safeUrl);
      if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
        const videoId = parsed.searchParams.get('v') || parsed.pathname.split('/').pop();
        return `https://www.youtube.com/embed/${videoId}`;
      }
      if (parsed.hostname.includes('vimeo.com')) {
        const videoId = parsed.pathname.split('/').pop();
        return `https://player.vimeo.com/video/${videoId}`;
      }
    } catch {}
    return null;
  }

  async function handlePollVote(optionIndex: number) {
    const response = await fetch(`/api/posts/${localPost.id}/poll/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionIndex })
    });
    if (response.ok) {
      const data = await response.json();
      localPost.pollVotes = data.pollVotes;
      localPost.pollTotalVotes = data.pollTotalVotes;
      localPost.userPollVote = data.userPollVote;
    } else if (response.status === 401) {
      showLoginPrompt = true;
    }
  }

  function getPollPercentage(optionIndex: number): number {
    if (!localPost.pollVotes || !localPost.pollTotalVotes || localPost.pollTotalVotes === 0) return 0;
    const key = `option_${optionIndex}`;
    return Math.round((localPost.pollVotes[key] || 0) / localPost.pollTotalVotes * 100);
  }

  function getPollTimeRemaining(): string {
    if (!localPost.pollEndsAt) return '';
    const now = new Date();
    const ends = toDate(localPost.pollEndsAt);
    const diff = ends.getTime() - now.getTime();
    if (diff <= 0) return 'Ended';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  }

  function getOptionKey(index: number): string { return `option_${index}`; }

  const pollEnded = $derived(localPost.pollEndsAt && toDate(localPost.pollEndsAt).getTime() < Date.now());
  const canChangeVote = $derived(localPost.pollAllowChange === true);
  const userSelectedOption = $derived(localPost.userPollVote);
  const hasVoted = $derived(userSelectedOption !== null && userSelectedOption !== undefined && userSelectedOption !== '');
  const showResults = $derived(true);
  const canVote = $derived(!hasVoted || canChangeVote || pollEnded);

  function timeAgo(date: string | Date) { return getTimeAgo(date); }

  function toggleMoreMenu(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    showMoreMenu = !showMoreMenu;
  }

  // Close menu when clicking outside
  function handleClickOutside(event: MouseEvent) {
    if (showMoreMenu && event.target && !(event.target as Element).closest('.more-menu') && !(event.target as Element).closest('.action-btn.more')) {
      showMoreMenu = false;
    }
  }

  async function deletePost() {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/posts/${localPost.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Post deleted successfully');
        showMoreMenu = false;
        localPost.isDeleted = true;
      } else if (response.status === 401) {
        alert('You must be logged in to delete');
      } else if (response.status === 403) {
        alert('You do not have permission to delete this post');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to delete post'}`);
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  }

  function reportPost() {
    // For now, just show an alert. In a real app, you'd open a report modal
    alert('Report functionality coming soon!');
  }
</script>

<article class="post-card" class:compact={compact}>
  <!-- Vote Rail -->
  <div class="vote-rail">
    <button type="button" class="vote-btn up" class:active={localPost.userVote === 1} aria-label="upvote" onclick={() => handleVote(1)}>
      <Icon icon="lucide:chevron-up" width="16" height="16" />
    </button>
    <span class="vote-score" class:positive={localPost.score > 0} class:negative={localPost.score < 0}>{formatScore(localPost.score)}</span>
    <button type="button" class="vote-btn down" class:active={localPost.userVote === -1} aria-label="downvote" onclick={() => handleVote(-1)}>
      <Icon icon="lucide:chevron-down" width="16" height="16" />
    </button>
  </div>

  <!-- Content -->
  <div class="post-content">
    <!-- Meta -->
    <div class="post-meta">
      <a href="/c/{localPost.community.name}" class="meta-community">
        <CommunityAvatar icon={localPost.community.icon} size="sm" name={localPost.community.name} />
        c/{localPost.community.name}
      </a>
      <span class="meta-dot">·</span>
      <span class="meta-author">Posted by <a href="/u/{localPost.author.username}" class="meta-user">u/{localPost.author.username}</a></span>
      <span class="meta-dot">·</span>
      <span class="meta-time">{timeAgo(localPost.createdAt)}</span>
      {#if localPost.isEdited}
        <span class="meta-dot">·</span>
        <span class="meta-edited">edited</span>
      {/if}
      {#if localPost.flair}
        <span class="meta-dot">·</span>
        {@const flairColor = localPost.flairColor || '#7c3aed'}
        <span class="post-flair" style="background: {flairColor}22; color: {flairColor}; border-color: {flairColor}44">{localPost.flair}</span>
      {/if}
      {#if localPost.isNsfw}<span class="post-tag nsfw">NSFW</span>{/if}
    </div>

    <!-- Title -->
    <a href={postUrl} class="post-title-link">
      <h2 class="post-title">{localPost.title}</h2>
    </a>

    <!-- Body preview -->
    {#if localPost.body && !compact}<p class="post-body">{localPost.body}</p>{/if}

    <!-- Media -->
    {#if localPost.mediaUrls && localPost.mediaUrls.length > 0}
      <div class="post-media grid-{Math.min(localPost.mediaUrls.length, 4)}">
        {#each localPost.mediaUrls.slice(0, 4) as url, i}
          <img src={url} alt="Post media {i+1}" class="media-img"/>
        {/each}
      </div>
    {/if}

    <!-- Link Preview -->
    {#if localPost.linkPreview}
      <a href={localPost.linkUrl} class="link-preview" target="_blank" rel="noopener noreferrer">
        {#if localPost.linkPreview.image}<img src={localPost.linkPreview.image} alt="" class="link-thumb"/>{/if}
        <div class="link-text">
          <span class="link-domain">{localPost.linkPreview.domain}</span>
          <span class="link-title">{localPost.linkPreview.title}</span>
        </div>
        <Icon icon="lucide:external-link" width="16" height="16" class="link-arrow" />
      </a>
    {/if}

    <!-- Poll -->
    {#if localPost.type === 'poll' && localPost.pollOptions && localPost.pollOptions.length > 0}
      <div class="poll-container">
        <div class="poll-header">
          <Icon icon="lucide:bar-chart-3" width="16" height="16" />
          <span>Poll</span>
          {#if localPost.pollTotalVotes}
            <span class="poll-votes">{localPost.pollTotalVotes} votes</span>
          {/if}
          {#if localPost.pollEndsAt}
            <span class="poll-timer">{getPollTimeRemaining()}</span>
          {/if}
        </div>
        <div class="poll-options">
          {#each localPost.pollOptions as option, index}
            {@const percentage = getPollPercentage(index)}
            {@const isSelected = localPost.userPollVote === getOptionKey(index)}
            <button
              type="button"
              class="poll-option"
              class:selected={isSelected}
              class:voted={hasVoted || pollEnded}
              onclick={() => canVote && handlePollVote(index)}
              disabled={!canVote}
            >
              <div class="poll-option-bar" style="width: {showResults ? percentage : 0}%"></div>
              <span class="poll-option-text">{option}</span>
              {#if showResults}
                <span class="poll-option-percent">{percentage}%</span>
              {/if}
            </button>
          {/each}
        </div>
      </div>

      {#if showLoginPrompt}
        <div class="poll-login-prompt">
          <a href="/login" class="poll-login-btn">Log in to vote</a>
          <span class="poll-login-text">or <a href="/register">create an account</a></span>
        </div>
      {/if}
    {/if}

    <!-- Embedded Content -->
    {#if localPost.linkUrl && shouldShowEmbed(localPost.linkUrl)}
      {@const embedUrl = getEmbedUrl(localPost.linkUrl)}
      {#if embedUrl}
        <div class="embed-container">
          <iframe src={embedUrl} title="Embedded content" class="embed-iframe" allowfullscreen loading="lazy"></iframe>
        </div>
      {/if}
    {/if}

    <!-- Actions -->
    <div class="post-actions">
      <a href="/c/{localPost.community.name}/p/{localPost.id}#comments" class="action-btn">
        <Icon icon="lucide:message-square" width="16" height="16" />
        {localPost.commentCount} Comments
      </a>

      <button type="button" class="action-btn" onclick={() => navigator.share?.({ url: `/c/${localPost.community.name}/p/${localPost.id}` })}>
        <Icon icon="lucide:share-2" width="16" height="16" />
        Share
      </button>

      {#if !showEditModal}
        <button type="button" class="action-btn" class:bookmarked={localPost.isBookmarked} onclick={toggleBookmark}>
          <Icon icon={localPost.isBookmarked ? 'lucide:bookmark' : 'lucide:bookmark'} width="16" height="16" />
          {localPost.isBookmarked ? 'Saved' : 'Save'}
        </button>
      {/if}

      <button type="button" class="action-btn more" onclick={toggleMoreMenu} aria-label="More post actions">
        <Icon icon="lucide:more-horizontal" width="16" height="16" />
      </button>

      <!-- More Menu Dropdown -->
      {#if showMoreMenu}
        <div class="more-menu">
          {#if browser}
            {@const user = currentUser || (window.localStorage?.getItem('user') ? JSON.parse(window.localStorage?.getItem('user') || '{}') : null)}
            {@const authorId = localPost.author?.id}
            {@const authorUsername = localPost.author?.username?.toLowerCase()?.trim() ?? ''}
            {@const currentId = user?.id}
            {@const currentUsername = user?.username?.toLowerCase()?.trim() ?? ''}
            {@const isAuthor = Boolean((authorId && currentId && authorId === currentId) || (authorUsername && currentUsername && authorUsername === currentUsername))}
            {#if isAuthor}
              <button type="button" class="menu-item edit" onclick={() => { startEdit(); showMoreMenu = false; }}>
                <Icon icon="lucide:edit" width="16" height="16" />
                Edit Post
              </button>
              <div class="menu-divider"></div>
              <button type="button" class="menu-item delete" onclick={deletePost}>
                <Icon icon="lucide:trash-2" width="16" height="16" />
                Delete Post
              </button>
            {:else if user}
              <button type="button" class="menu-item delete" onclick={deletePost}>
                <Icon icon="lucide:trash-2" width="16" height="16" />
                Delete Post
              </button>
            {/if}
          {/if}
          <button type="button" class="menu-item report" onclick={reportPost}>
            <Icon icon="lucide:flag" width="16" height="16" />
            Report Post
          </button>
        </div>
      {/if}
    </div>
  </div>
</article>

<!-- Edit Modal -->
<EditPostModal 
  post={localPost} 
  open={showEditModal} 
  onSave={async (data) => {
    try {
      const response = await fetch(`/api/posts/${localPost.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        localPost = {
          ...localPost,
          ...data,
          body: data.body ?? localPost.body,
          linkUrl: data.linkUrl ?? localPost.linkUrl,
          flair: data.flair ?? localPost.flair,
          flairColor: data.flairColor ?? localPost.flairColor,
          isEdited: true,
        };
        showEditModal = false;
        alert('Post updated successfully!');
      } else if (response.status === 401) {
        alert('You must be logged in to edit');
      } else if (response.status === 403) {
        alert('You can only edit your own posts');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Failed to update post'}`);
      }
    } catch (error) {
      console.error('Error editing post:', error);
      alert('Failed to update post');
    }
  }} 
  onClose={() => showEditModal = false} 
/>

<style>
  .post-card { display: flex; gap: 0.75rem; padding: 0.875rem 1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; transition: all 0.15s ease; cursor: default; }
  .post-card:hover { border-color: var(--border-hover); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
  .vote-rail { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; padding-top: 0.125rem; flex-shrink: 0; min-width: 36px; }
  .vote-score { font-size: 0.8125rem; font-weight: 700; color: var(--text-muted); min-width: 24px; text-align: center; }
  .vote-score.positive { color: var(--vote-up); }
  .vote-score.negative { color: var(--vote-down); }
  .post-content { flex: 1; min-width: 0; }
  .post-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 0.25rem 0.375rem; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.375rem; }
  .meta-community { display: flex; align-items: center; gap: 0.25rem; font-weight: 600; color: var(--text-secondary); text-decoration: none; transition: color 0.1s ease; }
  .meta-community:hover { color: var(--accent); }
  .meta-community :global(.community-avatar) { width: 20px; height: 20px; }
  .meta-dot { color: var(--text-muted); opacity: 0.5; }
  .meta-user { color: var(--text-secondary); text-decoration: none; }
  .meta-user:hover { text-decoration: underline; }
  .meta-edited { font-size: 0.6875rem; color: var(--text-muted); font-style: italic; }
  .post-flair { font-size: 0.6875rem; font-weight: 600; padding: 0.125rem 0.5rem; border-radius: 999px; border: 1px solid; }
  .post-tag { font-size: 0.6875rem; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 4px; }
  .post-tag.nsfw { background: var(--surface-red); color: #dc2626; border-color: var(--border-red); }
  .post-title-link { text-decoration: none; display: block; }
  .post-title { font-size: 1rem; font-weight: 600; color: var(--text-primary); line-height: 1.4; margin: 0 0 0.5rem; transition: color 0.1s ease; }
  .post-title-link:hover .post-title { color: var(--accent); }
  .post-body { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 0.75rem; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  .post-media { display: grid; gap: 0.25rem; border-radius: 12px; overflow: hidden; margin-bottom: 0.75rem; }
  .post-media.grid-1 { grid-template-columns: 1fr; }
  .post-media.grid-2 { grid-template-columns: 1fr 1fr; }
  .post-media.grid-3 { grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; }
  .post-media.grid-4 { grid-template-columns: 1fr 1fr; }
  .media-img { width: 100%; height: 200px; object-fit: cover; display: block; }
  .link-preview { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; background: var(--surface-blue); border: 1px solid var(--border-blue); border-radius: 12px; text-decoration: none; margin-bottom: 0.75rem; transition: all 0.15s ease; }
  .link-preview:hover { border-color: var(--accent); background: var(--surface); }
  .link-thumb { width: 64px; height: 48px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
  .link-text { flex: 1; min-width: 0; }
  .link-domain { display: block; font-size: 0.6875rem; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .link-title { display: block; font-size: 0.875rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  :global(.link-arrow) { color: var(--accent); flex-shrink: 0; }
  .embed-container { margin-bottom: 0.75rem; border-radius: 12px; overflow: hidden; background: var(--surface-raised); border: 1px solid var(--border); }
  .embed-iframe { width: 100%; height: 315px; border: none; display: block; }
  .post-actions { display: flex; align-items: center; gap: 0.125rem; flex-wrap: wrap; position: relative; }
  .action-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.625rem; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: var(--text-muted); background: none; border: none; cursor: pointer; text-decoration: none; transition: all 0.1s ease; white-space: nowrap; font-family: inherit; }
  .action-btn:hover { background: var(--surface-overlay); color: var(--text-secondary); }
  .action-btn.bookmarked { color: var(--accent); }
  .action-btn.edit-save { color: var(--accent); font-weight: 600; }
  .action-btn.edit-cancel { color: var(--text-muted); }
  .vote-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; border: none; background: none; cursor: pointer; color: var(--text-muted); transition: all 0.15s ease; }
  .vote-btn:hover { background: var(--surface-overlay); }
  .vote-btn.up:hover   { color: var(--vote-up);   background: var(--surface-red); }
  .vote-btn.down:hover { color: var(--vote-down); background: var(--surface-purple); }
  .vote-btn.up.active   { color: var(--vote-up);   background: var(--surface-red); }
  .vote-btn.down.active { color: var(--vote-down); background: var(--surface-purple); }

  /* Poll */
  .poll-container { margin-bottom: 0.75rem; padding: 1rem; background: var(--surface-yellow); border: 1px solid var(--border-yellow); border-radius: 12px; }
  .poll-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
  .poll-header :global(svg) { color: var(--accent); }
  .poll-votes { margin-left: auto; font-weight: 500; color: var(--text-muted); }
  .poll-timer { padding: 0.25rem 0.5rem; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: var(--accent); }
  .poll-options { display: flex; flex-direction: column; gap: 0.5rem; }
  .poll-option { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; border: 1px solid var(--border); border-radius: 8px; background: var(--surface); cursor: pointer; transition: all 0.2s ease; overflow: hidden; font-family: inherit; text-align: left; }
  .poll-option:not(.voted):hover { border-color: var(--accent); background: var(--surface); }
  .poll-option.selected { border-color: var(--accent); background: var(--accent-subtle); }
  .poll-option.voted { cursor: default; }
  .poll-option:disabled { cursor: not-allowed; }
  .poll-option-bar { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent-subtle); transition: width 0.3s ease; border-radius: 7px 0 0 7px; }
  .poll-option.selected .poll-option-bar { background: var(--accent-light); }
  .poll-option-text { position: relative; z-index: 1; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
  .poll-option-percent { position: relative; z-index: 1; font-size: 0.8125rem; font-weight: 600; color: var(--accent); }
  .poll-login-prompt { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; background: var(--surface-yellow); border: 1px solid var(--border-yellow); border-radius: 8px; margin-top: 0.5rem; }
  .poll-login-btn { padding: 0.4rem 1rem; background: var(--accent); color: white; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; text-decoration: none; }
  .poll-login-btn:hover { opacity: 0.9; }
  .poll-login-text { font-size: 0.8125rem; color: var(--text-muted); }
  .poll-login-text a { color: var(--accent); text-decoration: none; }

  /* More Menu */
  .more-menu { position: absolute; left: 50%; transform: translateX(-50%); bottom: 100%; z-index: 1000; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.15); min-width: 180px; margin-bottom: 0.5rem; overflow: hidden; }
  .menu-item { display: flex; align-items: center; gap: 0.75rem; width: 100%; padding: 0.75rem 1rem; border: none; background: none; color: var(--text-primary); font-size: 0.875rem; font-weight: 500; cursor: pointer; text-align: left; transition: all 0.15s ease; }
  .menu-item:hover { background: var(--surface-overlay); }
  .menu-item.edit { color: var(--accent); }
  .menu-item.edit:hover { background: var(--surface); }
  .menu-item.delete { color: var(--error); }
  .menu-item.delete:hover { background: var(--surface-red); color: var(--error); }
  .menu-item.report { color: var(--text-secondary); }
  .menu-item.report:hover { background: var(--surface-overlay); color: var(--text-primary); }
  .menu-divider { height: 1px; background: var(--border); margin: 0.25rem 0; }
</style>