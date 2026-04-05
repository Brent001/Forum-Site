<script lang="ts">
  import { page } from '$app/stores';
  import Icon from '@iconify/svelte';

  const { user = null, communities = [] } = $props<{ 
    user?: { username: string; avatarUrl?: string } | null;
    communities?: Array<{ id: string; name: string; displayName: string; icon: string; members: number }> 
  }>();

  const displayedCommunities = $derived(communities);
  const isLoggedIn = $derived(!!user);
  const hasCommunities = $derived(displayedCommunities.length > 0);

  const navItems = [
    { href: '/',              label: 'Home',          icon: 'lucide:home' },
    { href: '/popular',       label: 'Popular',       icon: 'lucide:trending-up' },
    { href: '/news',          label: 'News',          icon: 'lucide:newspaper' },
    { href: '/explore',       label: 'Explore',       icon: 'lucide:search' },
    { href: '/notifications', label: 'Notifications', icon: 'lucide:bell' },
    { href: '/bookmarks',     label: 'Bookmarks',     icon: 'lucide:bookmark' },
    { href: '/settings',      label: 'Settings',      icon: 'lucide:settings' },
  ];

  function formatMembers(n: number) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toString();
  }
</script>

<aside class="sidebar">
  <!-- Logo -->
  <div class="sidebar-logo">
    <div class="logo-mark">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="var(--accent)"/>
        <path d="M8 10h10M8 16h16M8 22h10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="24" cy="10" r="3" fill="var(--accent-light)"/>
      </svg>
    </div>
    <span class="logo-text">Nexus</span>
  </div>

  <!-- Primary Nav -->
  <nav class="sidebar-nav">
    {#each navItems as item}
      {@const isActive = $page.url.pathname === item.href}
      <a href={item.href} class="nav-item" class:active={isActive}>
        <span class="nav-icon">
          <Icon icon={item.icon} width="20" height="20" />
        </span>
        <span class="nav-label">{item.label}</span>
        {#if item.label === 'Notifications'}
          <span class="nav-badge">3</span>
        {/if}
      </a>
    {/each}
  </nav>

  <div class="sidebar-divider"></div>

  <!-- New Post Button -->
  <a href="/submit" class="create-btn">
    <Icon icon="lucide:plus" width="16" height="16" />
    Create Post
  </a>

  <div class="sidebar-divider"></div>

  <!-- Communities - only show for logged in users -->
  {#if isLoggedIn}
    <div class="sidebar-section">
      <div class="section-header">
        <span>Your Communities</span>
        <a href="/communities" class="section-link">Browse</a>
      </div>
      <div class="communities-list">
        {#if hasCommunities}
          {#each displayedCommunities as community}
            {@const isActive = $page.url.pathname === `/c/${community.name}`}
            <a href="/c/{community.name}" class="community-item" class:active={isActive}>
              <span class="community-icon">{community.icon}</span>
              <div class="community-info">
                <span class="community-name">c/{community.name}</span>
                <span class="community-members">{formatMembers(community.members)} members</span>
              </div>
            </a>
          {/each}
        {:else}
          <div class="empty-state">
            <p>You haven't joined any communities yet.</p>
            <a href="/communities" class="empty-link">Browse communities</a>
          </div>
        {/if}
      </div>
    </div>
  {:else}
    <!-- Guest section - show for non-logged in users -->
    <div class="sidebar-section">
      <div class="section-header">
        <span>Join the Conversation</span>
      </div>
      <div class="guest-state">
        <p>Create an account to join communities and participate in discussions.</p>
        <a href="/register" class="guest-btn-primary">Sign Up</a>
        <a href="/login" class="guest-btn-secondary">Log In</a>
      </div>
    </div>
  {/if}

  <!-- Footer -->
  <div class="sidebar-footer">
    <p>© 2025 Nexus. All rights reserved.</p>
    <div class="footer-links">
      <a href="/terms">Terms</a>
      <a href="/privacy">Privacy</a>
      <a href="/help">Help</a>
    </div>
  </div>
</aside>

<style>
  .sidebar { width: 240px; height: 100vh; position: sticky; top: 0; display: flex; flex-direction: column; padding: 1rem 0.75rem; gap: 0.25rem; border-right: 1px solid var(--border); background: var(--surface); flex-shrink: 0; }
  .sidebar-logo { display: flex; align-items: center; gap: 0.625rem; padding: 0.5rem 0.75rem 1rem; }
  .logo-mark svg { width: 32px; height: 32px; }
  .logo-text { font-family: 'DM Serif Display', Georgia, serif; font-size: 1.375rem; font-weight: 400; color: var(--text-primary); letter-spacing: -0.02em; }
  .sidebar-nav { display: flex; flex-direction: column; gap: 0.125rem; }
  .nav-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.75rem; border-radius: 10px; color: var(--text-secondary); text-decoration: none; font-size: 0.9375rem; font-weight: 500; transition: all 0.15s ease; position: relative; }
  .nav-item:hover { background: var(--surface-raised); color: var(--text-primary); }
  .nav-item.active { background: var(--accent-subtle); color: var(--accent); }
  .nav-item.active .nav-icon { color: var(--accent); }
  .nav-icon { width: 20px; height: 20px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: var(--text-muted); transition: color 0.15s ease; }
  .nav-item:hover .nav-icon { color: var(--accent); }
  .nav-label { flex: 1; }
  .nav-badge { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; font-size: 0.6875rem; font-weight: 700; padding: 0.125rem 0.375rem; border-radius: 999px; min-width: 18px; text-align: center; box-shadow: 0 2px 4px rgba(239, 68, 68, 0.3); }
  .sidebar-divider { height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 0.5rem 0; }
  .create-btn { display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.625rem 1rem; background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%); color: white; border-radius: 10px; text-decoration: none; font-size: 0.9375rem; font-weight: 600; transition: all 0.15s ease; margin: 0.25rem 0; box-shadow: 0 2px 8px var(--accent-shadow); }
  .create-btn:hover { background: var(--accent-dark); transform: translateY(-1px); box-shadow: 0 4px 12px var(--accent-shadow); }
  .sidebar-section { flex: 1; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
  .section-header { display: flex; align-items: center; justify-content: space-between; padding: 0.25rem 0.75rem 0.5rem; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); flex-shrink: 0; }
  .section-link { color: var(--accent); text-decoration: none; text-transform: none; font-weight: 500; letter-spacing: 0; }
  .section-link:hover { text-decoration: underline; }
  .communities-list { display: flex; flex-direction: column; gap: 0.125rem; overflow-y: auto; max-height: 500px; padding-bottom: 0.5rem; }
  .empty-state { padding: 1rem 0.75rem; border-radius: 12px; background: var(--surface-raised); color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; border: 1px dashed var(--border); }
  .empty-state p { margin: 0 0 0.75rem; }
  .empty-link { display: inline-block; color: var(--accent); text-decoration: none; font-weight: 600; }
  .empty-link:hover { text-decoration: underline; }
  .community-item { display: flex; align-items: center; gap: 0.625rem; padding: 0.5rem 0.75rem; border-radius: 8px; text-decoration: none; transition: all 0.15s ease; }
  .community-item:hover { background: var(--surface-raised); }
  .community-item.active { background: var(--accent-subtle); }
  .community-icon { font-size: 1.125rem; width: 24px; text-align: center; }
  .community-info { display: flex; flex-direction: column; gap: 0.0625rem; }
  .community-name { font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
  .community-members { font-size: 0.75rem; color: var(--text-muted); }
  .sidebar-footer { padding: 0.75rem; border-top: 1px solid var(--border); margin-top: auto; }
  .sidebar-footer p { font-size: 0.6875rem; color: var(--text-muted); margin-bottom: 0.375rem; }
  .footer-links { display: flex; gap: 0.75rem; }
  .footer-links a { font-size: 0.6875rem; color: var(--text-muted); text-decoration: none; }
  .footer-links a:hover { color: var(--accent); }

  /* Guest State */
  .guest-state { padding: 1rem 0.75rem; border-radius: 12px; background: var(--surface-raised); color: var(--text-secondary); font-size: 0.875rem; line-height: 1.5; border: 1px dashed var(--border); }
  .guest-state p { margin: 0 0 1rem; }
  .guest-btn-primary { display: block; width: 100%; padding: 0.5rem 1rem; background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%); color: white; border-radius: 8px; text-decoration: none; font-size: 0.875rem; font-weight: 600; text-align: center; box-shadow: 0 2px 8px var(--accent-shadow); margin-bottom: 0.5rem; }
  .guest-btn-primary:hover { background: var(--accent-dark); transform: translateY(-1px); }
  .guest-btn-secondary { display: block; width: 100%; padding: 0.5rem 1rem; background: var(--surface); color: var(--text-primary); border: 1px solid var(--border); border-radius: 8px; text-decoration: none; font-size: 0.875rem; font-weight: 600; text-align: center; }
  .guest-btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
</style>