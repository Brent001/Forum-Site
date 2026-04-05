<script lang="ts">
  import Icon from '@iconify/svelte';

  const { user = null, home = null, community = null } = $props<{
    user?: { username: string; avatarUrl?: string } | null;
    home?: {
      siteName?: string;
      siteStats: { members: number; postsToday: number; online: number };
      trendingCommunities: Array<{ name: string; displayName: string; icon: string; members: number; growth: string }>;
    } | null;
    community?: { name: string; displayName: string; description: string; icon: string; memberCount: number; postCount: number } | null;
  }>();

  // icon can be a string emoji/text OR a lucide icon name string
  const defaultTrending = [
    { name: 'technology', displayName: 'Technology', icon: 'lucide:zap',           members: 124500, growth: '+12%' },
    { name: 'design',     displayName: 'Design',     icon: 'lucide:palette',        members: 87300,  growth: '+8%'  },
    { name: 'science',    displayName: 'Science',    icon: 'lucide:flask-conical',  members: 94200,  growth: '+15%' },
    { name: 'gaming',     displayName: 'Gaming',     icon: 'lucide:gamepad-2',      members: 312000, growth: '+5%'  },
    { name: 'art',        displayName: 'Art',        icon: 'lucide:image',          members: 45600,  growth: '+22%' },
  ];

  const siteStats = $derived(home?.siteStats ?? { members: 482193, postsToday: 1247, online: 3824 });
  const trendingCommunities = $derived(home?.trendingCommunities ?? defaultTrending);

  function fmt(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return n.toString();
  }

  // Detect if an icon string is an iconify id (contains ':') or an emoji/text
  function isIconifyId(icon: string): boolean {
    return icon.includes(':');
  }
</script>

<aside class="panel">

  <!-- Auth CTA (guest only) -->
  {#if !user}
    <div class="card auth-card">
      <div class="auth-body">
        <p class="auth-heading">Join Nexus</p>
        <p class="auth-sub">The best conversations on the internet. Sign in to get your personalized feed.</p>
        <div class="auth-btns">
          <a href="/register" class="btn btn-primary">Sign up</a>
          <a href="/login"    class="btn btn-ghost">Log in</a>
        </div>
      </div>
    </div>
  {/if}

  <!-- Site Stats -->
  <div class="card">
    <div class="card-header">NEXUS TODAY</div>
    <div class="stats-grid">
      <div class="stat-item">
        <strong>{fmt(siteStats.members)}</strong>
        <span>Members</span>
      </div>
      <div class="stat-item">
        <strong>{fmt(siteStats.postsToday)}</strong>
        <span>Posts today</span>
      </div>
      <div class="stat-item">
        <strong class="online">{fmt(siteStats.online)}</strong>
        <span>Online now</span>
      </div>
    </div>
  </div>

  <!-- Trending Communities -->
  <div class="card">
    <div class="card-header-row">
      <span class="card-header">TRENDING</span>
      <a href="/communities" class="see-all">See all</a>
    </div>
    <div class="trending-list">
      {#each trendingCommunities as c, i}
        <a href="/c/{c.name}" class="trending-item">
          <span class="rank">{i + 1}</span>
          <span class="t-icon">
            {#if isIconifyId(c.icon)}
              <Icon icon={c.icon} width="16" height="16" />
            {:else}
              {c.icon}
            {/if}
          </span>
          <div class="t-info">
            <span class="t-name">c/{c.name}</span>
            <span class="t-members">{fmt(c.members)} members</span>
          </div>
          <span class="t-growth">{c.growth}</span>
        </a>
      {/each}
    </div>
  </div>

  <!-- Create community -->
  <div class="card create-card">
    <div class="create-icon"><Icon icon="lucide:globe" width="24" height="24" /></div>
    <p class="create-title">Start a community</p>
    <p class="create-desc">Build your own space for anything you're passionate about.</p>
    <a href="/communities/create" class="btn btn-primary btn-full">Create community</a>
  </div>

  <!-- Footer links -->
  <div class="footer-links">
    {#each ['Help', 'Guidelines', 'Privacy', 'Terms', 'Advertise'] as link}
      <a href="/{link.toLowerCase()}">{link}</a>
    {/each}
  </div>

</aside>

<style>
  .panel {
    width: 340px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 0.5rem 0.75rem 0 0;
    position: sticky;
    top: 56px;
    max-height: calc(100vh - 56px);
    overflow-y: auto;
  }

  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }

  .card-header {
    display: block;
    padding: 0.65rem 1rem;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    color: var(--text-muted);
    border-bottom: 1px solid var(--border);
    background: var(--surface-raised);
  }

  .card-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.65rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface-raised);
  }
  .card-header-row .card-header { padding: 0; border: none; background: none; }
  .see-all { font-size: 0.75rem; font-weight: 600; color: var(--accent); text-decoration: none; }
  .see-all:hover { text-decoration: underline; }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.48rem 1rem;
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
  .btn-full { width: 100%; }

  .auth-card { border: 1px solid var(--border); }
  .auth-body { padding: 1.1rem 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .auth-heading { font-size: 0.95rem; font-weight: 800; color: var(--text-primary); margin: 0; }
  .auth-sub { font-size: 0.8rem; color: var(--text-muted); line-height: 1.5; margin: 0; }
  .auth-btns { display: flex; gap: 0.5rem; }

  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; padding: 0.875rem 1rem; }
  .stat-item { display: flex; flex-direction: column; gap: 0.15rem; text-align: center; }
  .stat-item:not(:last-child) { border-right: 1px solid var(--border); }
  .stat-item strong { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
  .stat-item span { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
  .online { color: #16a34a !important; }

  .trending-list { padding: 0.25rem 0; }
  .trending-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 1rem; text-decoration: none; transition: background 0.1s; }
  .trending-item:hover { background: var(--surface-raised); }
  .rank { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); width: 14px; text-align: center; flex-shrink: 0; }
  .t-icon { display: flex; align-items: center; justify-content: center; flex-shrink: 0; color: var(--accent); }
  .t-info { flex: 1; min-width: 0; }
  .t-name { display: block; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
  .t-members { font-size: 0.72rem; color: var(--text-muted); }
  .t-growth { font-size: 0.75rem; font-weight: 700; color: #16a34a; white-space: nowrap; flex-shrink: 0; }

  .create-card { padding: 1.1rem 1rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
  .create-icon { display: flex; align-items: center; justify-content: center; color: var(--accent); }
  .create-title { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  .create-desc { font-size: 0.78rem; color: var(--text-muted); line-height: 1.5; margin: 0 0 0.25rem; }

  .footer-links { display: flex; flex-wrap: wrap; gap: 0.3rem 0.7rem; padding: 0 0.25rem; margin-top: 0.25rem; }
  .footer-links a { font-size: 0.72rem; color: var(--text-muted); text-decoration: none; font-weight: 500; transition: color 0.15s; }
  .footer-links a:hover { color: var(--accent); }
</style>