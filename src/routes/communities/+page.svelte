<script lang="ts">
  import CommunityAvatar from '$lib/component/ui/CommunityAvatar.svelte';
  const { data = {} } = $props<{
    data?: {
      communities?: Array<{
        id: string;
        name: string;
        displayName: string;
        icon: string;
        banner?: string;
        description?: string;
        members: number;
        postCount: number;
        nsfw?: boolean;
        archived?: boolean;
      }>;
    };
  }>();

  let search = $state('');

  const filteredCommunities = $derived(
    (() => {
      const term = search.trim().toLowerCase();
      const list = data.communities ?? [];

      if (!term) return list;

      return list.filter((community: { name: string; displayName: string; description?: string }) =>
        community.name.toLowerCase().includes(term) ||
        community.displayName.toLowerCase().includes(term) ||
        (community.description ?? '').toLowerCase().includes(term)
      );
    })()
  );
</script>

<svelte:head>
  <title>Communities — Nexus</title>
</svelte:head>

<div class="communities-page">
  <div class="page-header">
    <div>
      <p class="eyebrow">Communities</p>
      <h1>Explore community spaces</h1>
      <p class="subtitle">Browse the most active communities and discover new places to join.</p>
      <input
        type="search"
        class="community-search"
        placeholder="Search communities"
        bind:value={search}
        aria-label="Search communities"
      />
    </div>
    <a href="/communities/create" class="create-community-btn">Create community</a>
  </div>

  <div class="communities-grid">
    {#if filteredCommunities.length}
      {#each filteredCommunities as community}
        <a href="/c/{community.name}" class="community-card">
          <div
            class="community-banner-card"
            style={community.banner ? `background-image: url('${community.banner}');` : ''}
          ></div>
          <CommunityAvatar icon={community.icon} size="md" name={community.name} />
          <div class="community-content">
            <div class="community-header">
              <strong>c/{community.name}</strong>
              {#if community.nsfw}
                <span class="community-badge nsfw">NSFW</span>
              {/if}
              {#if community.archived}
                <span class="community-badge archived">Archived</span>
              {/if}
            </div>
            <span>{community.displayName}</span>
            {#if community.description}
              <p class="community-description">{community.description}</p>
            {/if}
          </div>
          <div class="community-meta">
            <span>{community.members.toLocaleString()} members</span>
            <span>{community.postCount.toLocaleString()} posts</span>
          </div>
        </a>
      {/each}
    {:else}
      <div class="empty-state">
        <p>No communities have been created yet.</p>
        <a href="/communities/create" class="create-community-btn">Create the first community</a>
      </div>
    {/if}
  </div>
</div>

<style>
  .communities-page { display: flex; flex-direction: column; gap: 1.5rem; }
  .page-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .eyebrow { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.16em; }
  h1 { font-size: 2rem; margin-top: 0.25rem; }
  .subtitle { color: var(--text-secondary); max-width: 42rem; margin-top: 0.5rem; }
  .create-community-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.85rem 1.1rem; background: var(--accent); color: white; border-radius: 14px; text-decoration: none; font-weight: 600; transition: background 0.15s ease; }
  .create-community-btn:hover { background: var(--accent-dark); }
  .community-search { margin-top: 0.8rem; width: min(100%, 420px); padding: 0.7rem 0.9rem; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); color: var(--text-primary); outline: none; }
  .community-search:focus { border-color: var(--accent); }
  .communities-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
  .community-card { position: relative; display: grid; grid-template-columns: auto 1fr; gap: 1rem; padding: 1.1rem; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; text-decoration: none; color: inherit; transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; overflow: hidden; }
  .community-card:hover { transform: translateY(-2px); border-color: var(--border-hover); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
  .community-banner-card { position: absolute; inset: 0; opacity: 0.12; background-size: cover; background-position: center; }
  .community-card:hover .community-banner-card { opacity: 0.2; }
  .community-card :global(.community-avatar) { z-index: 1; }
  .community-content { display: flex; flex-direction: column; gap: 0.25rem; z-index: 1; }
  .community-description { margin: 0; color: var(--text-secondary); font-size: 0.9rem; line-height: 1.3; }
  .community-content strong { font-size: 1rem; }
  .community-content span { font-size: 0.9rem; color: var(--text-secondary); }
  .community-meta { display: flex; flex-wrap: wrap; gap: 0.75rem; font-size: 0.875rem; color: var(--text-muted); margin-top: 0.5rem; }
  .empty-state { grid-column: 1 / -1; padding: 2rem; text-align: center; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; }
  .empty-state p { font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 1rem; }

  .community-header { display: flex; align-items: center; gap: 0.5rem; }
  .community-badge {
    padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.65rem; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  .community-badge.nsfw { background: #fef2f2; color: #dc2626; }
  .community-badge.archived { background: #fef3c7; color: #d97706; }
</style>
