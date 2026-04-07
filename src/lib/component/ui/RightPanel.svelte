<script lang="ts">
  import Icon from '@iconify/svelte';
  import CommunityAvatar from '$lib/component/ui/CommunityAvatar.svelte';
  import { realtime } from '$lib/stores/realtime.js';

  const { user = null, home = null, community = null } = $props<{
    user?: { username: string; avatarUrl?: string } | null;
    home?: {
      siteName?: string;
      siteStats: { members: number; postsToday: number; online: number };
      trendingCommunities: Array<{ name: string; displayName: string; icon: string; members: number; growth: string }>;
    } | null;
    community?: { name: string; displayName: string; description: string; icon: string; memberCount: number; postCount: number } | null;
  }>();

  const defaultTrending = [
    { name: 'technology', displayName: 'Technology', icon: 'lucide:zap',           members: 124500, growth: '+12%' },
    { name: 'design',     displayName: 'Design',     icon: 'lucide:palette',        members: 87300,  growth: '+8%'  },
    { name: 'science',    displayName: 'Science',    icon: 'lucide:flask-conical',  members: 94200,  growth: '+15%' },
    { name: 'gaming',     displayName: 'Gaming',     icon: 'lucide:gamepad-2',      members: 312000, growth: '+5%'  },
    { name: 'art',        displayName: 'Art',        icon: 'lucide:image',          members: 45600,  growth: '+22%' },
  ];

  const siteStats = $derived(home?.siteStats ?? { members: 482193, postsToday: 1247, online: 3824 });
  const trendingCommunities = $derived(home?.trendingCommunities ?? defaultTrending);

  // Use real-time online count from WebSocket
  const onlineCount = $derived($realtime.onlineCount || siteStats.online);

  function fmt(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }

  function isIconifyId(icon: string) { return icon.includes(':'); }
</script>

<aside class="right-panel">

  <!-- Auth banner (logged-out only) -->
  {#if !user}
    <div class="widget auth-widget">
      <div class="auth-top">
        <p class="auth-title">Join Nexus</p>
        <p class="auth-sub">The best conversations on the internet. Sign in to get your personalized feed.</p>
      </div>
      <div class="auth-actions">
        <a href="/register" class="btn btn-primary">Sign up</a>
        <a href="/login"    class="btn btn-ghost">Log in</a>
      </div>
    </div>
  {/if}

  <!-- Site stats -->
  <div class="widget">
    <p class="widget-label">NEXUS TODAY</p>
    <div class="stats-row">
      <div class="stat">
        <strong>{fmt(siteStats.members)}</strong>
        <span>Members</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat">
        <strong>{fmt(siteStats.postsToday)}</strong>
        <span>Posts today</span>
      </div>
      <div class="stat-sep"></div>
      <div class="stat">
        <strong class="online">{fmt(onlineCount)}</strong>
        <span>Online</span>
      </div>
    </div>
  </div>

  <!-- Trending communities -->
  <div class="widget">
    <div class="widget-header">
      <p class="widget-label">TRENDING</p>
      <a href="/communities" class="see-all">See all</a>
    </div>
    <div class="trending-list">
      {#each trendingCommunities as c, i}
        <a href="/c/{c.name}" class="trending-row">
          <span class="t-rank">{i + 1}</span>
          <span class="t-icon">
            <CommunityAvatar icon={c.icon} size="15px" />
          </span>
          <div class="t-meta">
            <span class="t-name">c/{c.name}</span>
            <span class="t-members">{fmt(c.members)} members</span>
          </div>
          <span class="t-growth">{c.growth}</span>
        </a>
      {/each}
    </div>
  </div>

  <!-- Create community CTA -->
  <div class="widget cta-widget">
    <div class="cta-icon"><Icon icon="lucide:globe" width="22" height="22" /></div>
    <p class="cta-title">Start a community</p>
    <p class="cta-sub">Build your own space for anything you're passionate about.</p>
    <a href="/communities/create" class="btn btn-primary btn-block">Create community</a>
  </div>

  <!-- Footer links -->
  <nav class="panel-footer">
    {#each ['Help', 'Guidelines', 'Privacy', 'Terms', 'Advertise'] as lnk}
      <a href="/{lnk.toLowerCase()}">{lnk}</a>
    {/each}
    <span class="footer-year">© 2025 Nexus</span>
  </nav>

</aside>

<style>
  /* ── Panel shell ──
     Fixed width, full height of the flex row.
     Scrolls independently when hovered.
  ── */
  .right-panel {
    width: 320px;
    flex-shrink: 0;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px 12px 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.2s;
    border-left: 1px solid var(--border);
    background: var(--surface);
  }
  .right-panel:hover { scrollbar-color: var(--border) transparent; }
  .right-panel::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
  .right-panel:hover::-webkit-scrollbar-thumb { background: var(--border); }

  /* ── Widget card ── */
  .widget {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 16px;
    flex-shrink: 0;
  }
  .widget-label {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    text-transform: uppercase;
    margin-bottom: 12px;
  }
  .widget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .widget-header .widget-label { margin-bottom: 0; }
  .see-all { font-size: 0.78rem; font-weight: 600; color: var(--accent); text-decoration: none; }
  .see-all:hover { text-decoration: underline; }

  /* ── Auth widget ── */
  .auth-widget { background: linear-gradient(135deg, var(--accent-subtle) 0%, var(--surface-raised) 100%); border-color: var(--border-blue); }
  .auth-top   { margin-bottom: 14px; }
  .auth-title { font-size: 1rem; font-weight: 800; color: var(--text-primary); margin-bottom: 6px; }
  .auth-sub   { font-size: 0.8rem; color: var(--text-secondary); line-height: 1.55; }
  .auth-actions { display: flex; gap: 8px; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; justify-content: center;
    padding: 0.45rem 1.1rem;
    border-radius: 999px;
    font-size: 0.84rem; font-weight: 700;
    text-decoration: none; border: none; cursor: pointer;
    font-family: inherit; transition: opacity 0.13s, background 0.13s;
    white-space: nowrap;
  }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover { background: var(--accent-dark); }
  .btn-ghost  { background: transparent; color: var(--text-primary); border: 1.5px solid var(--border); }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
  .btn-block  { width: 100%; margin-top: 4px; }

  /* ── Stats ── */
  .stats-row { display: flex; align-items: center; gap: 0; }
  .stat { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .stat strong { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
  .stat span   { font-size: 0.67rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
  .stat-sep    { width: 1px; height: 32px; background: var(--border); flex-shrink: 0; }
  .online { color: #16a34a !important; }

  /* ── Trending ── */
  .trending-list { display: flex; flex-direction: column; margin-top: 4px; }
  .trending-row  {
    display: flex; align-items: center; gap: 9px;
    padding: 9px 6px; border-radius: 10px;
    text-decoration: none; transition: background 0.1s;
  }
  .trending-row:hover { background: var(--surface-overlay); }
  .t-rank    { font-size: 0.7rem; font-weight: 800; color: var(--text-muted); width: 14px; text-align: center; flex-shrink: 0; }
  .t-icon    { display: flex; align-items: center; justify-content: center; color: var(--accent); width: 22px; flex-shrink: 0; }
  .t-meta    { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  .t-name    { font-size: 0.84rem; font-weight: 600; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .t-members { font-size: 0.7rem; color: var(--text-muted); }
  .t-growth  { font-size: 0.73rem; font-weight: 700; color: #16a34a; white-space: nowrap; flex-shrink: 0; }

  /* ── CTA widget ── */
  .cta-widget { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .cta-icon  { color: var(--accent); display: flex; align-items: center; justify-content: center; }
  .cta-title { font-size: 0.92rem; font-weight: 800; color: var(--text-primary); }
  .cta-sub   { font-size: 0.78rem; color: var(--text-muted); line-height: 1.5; }

  /* ── Footer ── */
  .panel-footer {
    display: flex; flex-wrap: wrap; gap: 5px 10px;
    padding: 0 4px;
    flex-shrink: 0;
  }
  .panel-footer a {
    font-size: 0.7rem; color: var(--text-muted); text-decoration: none; font-weight: 500;
    transition: color 0.13s;
  }
  .panel-footer a:hover { color: var(--accent); }
  .footer-year { font-size: 0.7rem; color: var(--text-muted); }
</style>