<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import * as Lucide from 'lucide-svelte';
  import PostCard from '$lib/component/ui/PostCard.svelte';
  import FeedTabs from '$lib/component/ui/FeedTabs.svelte';
  import Skeleton from '$lib/component/ui/Skeleton.svelte';
  import Modal from '$lib/component/ui/Modal.svelte';
  import type { PageData } from './$types.js';

  let { data = {} as PageData } = $props<{ data?: PageData }>();
  
  $effect(() => {
    console.log('[Home] Received data:', { 
      hasUser: !!data?.user, 
      postsCount: data?.posts?.length ?? 0,
      communitiesCount: data?.communities?.length ?? 0
    });
  });

  let activeSort = $state<'hot' | 'new' | 'top' | 'rising' | 'best'>('hot');
  let loading = $state(false);
  let newPostsAvailable = $state(0);
  let shortcutsOpen = $state(false);

  const sortOptions = [
    { key: 'hot',    label: 'Hot',    icon: Lucide.Flame },
    { key: 'new',    label: 'New',    icon: Lucide.Sparkles },
    { key: 'top',    label: 'Top',    icon: Lucide.TrendingUp },
    { key: 'rising', label: 'Rising', icon: Lucide.Rocket },
    { key: 'best',   label: 'Best',   icon: Lucide.Star },
  ] as const;

  const feedTitle = $derived(data.user ? `Welcome back, u/${data.user.username}` : 'Top posts today');

  const initialPosts = $derived(data?.posts ?? []);

  const displayPosts = $derived(
    activeSort === 'new'
      ? [...initialPosts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : activeSort === 'top'
      ? [...initialPosts].sort((a, b) => b.score - a.score)
      : initialPosts
  );

  async function changeSort(newSort: typeof activeSort) {
    activeSort = newSort;
    loading = true;
    await new Promise(r => setTimeout(r, 500));
    loading = false;
  }

  function loadNewPosts() {
    newPostsAvailable = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onMount(() => {
    function handleKeys(e: KeyboardEvent) {
      if (e.key === '?' && !(e.target as HTMLElement)?.matches?.('input, textarea')) shortcutsOpen = true;
      if (e.key === 'Escape') shortcutsOpen = false;
    }
    document.addEventListener('keydown', handleKeys);
    return () => { document.removeEventListener('keydown', handleKeys); };
  });
</script>

<svelte:head>
  <title>Nexus — Home</title>
  <meta name="description" content="The best conversations on the internet." />
</svelte:head>

<div class="home">

  <!-- New posts notification -->
  {#if newPostsAvailable > 0}
    <button class="new-posts-pill" onclick={loadNewPosts} transition:fade>
      <Lucide.ChevronUp size={14} />
      {newPostsAvailable} new posts
    </button>
  {/if}

  <!-- Guest banner -->
  {#if !data.user}
    <div class="guest-banner">
      <div class="guest-text">
        <strong>Join Nexus</strong>
        <span>Create an account to personalize your feed, save posts, and join the conversation.</span>
      </div>
      <div class="guest-actions">
        <a href="/login" class="btn btn-ghost">Log in</a>
        <a href="/register" class="btn btn-primary">Sign up free</a>
      </div>
    </div>
  {/if}

  <!-- Sort bar -->
  <div class="sort-bar">
    <span class="sort-label">View</span>
    <div class="sort-tabs">
      {#each sortOptions as opt}
        <button
          class="sort-tab {activeSort === opt.key ? 'active' : ''}"
          onclick={() => changeSort(opt.key)}
        >
          <svelte:component this={opt.icon} size={14} /> {opt.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Feed -->
  <div class="feed">
    {#if loading}
      <Skeleton variant="post" count={4} />
    {:else if displayPosts.length > 0}
      {#each displayPosts as post (post.id)}
        <div class="post-wrap" transition:fade={{ duration: 180 }}>
          <PostCard post={{ ...post, type: (post.type as 'image' | 'text' | 'link' | 'video') || 'text' }} />
        </div>
      {/each}

      <div class="load-more">
        <button
          class="load-more-btn"
          onclick={() => { loading = true; setTimeout(() => loading = false, 700); }}
        >
          Load more
        </button>
      </div>
    {:else}
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <p>No posts to show. Check back later!</p>
      </div>
    {/if}
  </div>

  <!-- Keyboard shortcuts modal -->
  <Modal open={shortcutsOpen} title="Keyboard Shortcuts" size="sm" on:close={() => shortcutsOpen = false}>
    <div class="shortcuts-grid">
      {#each [
        ['/', 'Focus search'],
        ['j / k', 'Navigate posts'],
        ['Enter', 'Open post'],
        ['u', 'Upvote'],
        ['d', 'Downvote'],
        ['c', 'Jump to comments'],
        ['n', 'New post'],
        ['?', 'Show shortcuts'],
        ['Esc', 'Close modal'],
      ] as [key, label]}
        <div class="shortcut-item">
          <kbd>{key}</kbd>
          <span>{label}</span>
        </div>
      {/each}
    </div>
  </Modal>

</div>

<style>
  .home {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
    max-width: 100%;
    width: 100%;
  }

  /* New posts pill */
  .new-posts-pill {
    position: sticky;
    top: 68px;
    z-index: 50;
    align-self: center;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 9999px;
    font-size: 0.82rem;
    font-weight: 700;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 2px 12px var(--accent-shadow);
    animation: slideDown 0.25s ease-out;
    transition: opacity 0.15s;
  }
  .new-posts-pill:hover { opacity: 0.88; }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* Guest banner */
  .guest-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    flex-wrap: wrap;
  }
  .guest-text {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }
  .guest-text strong {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
  }
  .guest-text span {
    font-size: 0.82rem;
    color: var(--text-muted);
    line-height: 1.5;
  }
  .guest-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    padding: 0.45rem 1rem;
    border-radius: 9999px;
    font-size: 0.85rem;
    font-weight: 700;
    text-decoration: none;
    border: none;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover { opacity: 0.88; }
  .btn-ghost { background: var(--surface-raised); color: var(--text-secondary); border: 1.5px solid var(--border); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

  /* Sort bar */
  .sort-bar {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.4rem 0.6rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .sort-label {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0 0.25rem;
    white-space: nowrap;
  }
  .sort-tabs { display: flex; gap: 0.2rem; }
  .sort-tab {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.38rem 0.75rem;
    border-radius: 7px;
    font-size: 0.82rem;
    font-weight: 600;
    border: none;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.13s;
    white-space: nowrap;
  }
  .sort-tab:hover { background: var(--surface-raised); color: var(--text-primary); }
  .sort-tab.active { background: var(--accent); color: white; }

  /* Feed */
  .feed {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .post-wrap {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 10px;
    overflow: hidden;
    transition: border-color 0.15s;
  }
  .post-wrap:hover { border-color: var(--border-hover); }

  /* Load more */
  .load-more {
    display: flex;
    justify-content: center;
    padding: 1.25rem 0 0.5rem;
  }
  .load-more-btn {
    padding: 0.55rem 2rem;
    background: var(--surface);
    border: 1.5px solid var(--border);
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
  }
  .load-more-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* Shortcuts modal */
  .shortcuts-grid { display: flex; flex-direction: column; gap: 0.5rem; }
  .shortcut-item { display: flex; align-items: center; gap: 0.75rem; }
  .shortcut-item kbd {
    font-size: 0.75rem;
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: 5px;
    padding: 0.2rem 0.5rem;
    font-family: inherit;
    color: var(--text-secondary);
    min-width: 64px;
    text-align: center;
    white-space: nowrap;
  }
  .shortcut-item span { font-size: 0.875rem; color: var(--text-secondary); }

  @media (max-width: 600px) {
    .guest-banner { flex-direction: column; align-items: flex-start; }
    .sort-tab { padding: 0.35rem 0.55rem; font-size: 0.78rem; }
    .sort-label { display: none; }
  }
</style>