<script lang="ts">
  import * as Lucide from 'lucide-svelte';
  import { theme } from '$lib/stores/theme';
  import { onMount } from 'svelte';

  const { user = null, notificationCount = 3 } = $props<{ user?: { username: string; avatarUrl?: string } | null; notificationCount?: number }>();

  let currentTheme = $state<'light' | 'dark'>('light');
  let searchQuery = $state('');
  let searchFocused = $state(false);
  let avatarMenuOpen = $state(false);

  onMount(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    currentTheme = saved || 'light';
    return theme.subscribe(t => currentTheme = t);
  });

  async function signOut() {
    await fetch('/api/auth/sign-out', { method: 'POST' });
    window.location.href = '/';
  }

  function handleSearch(e: SubmitEvent) {
    e.preventDefault();
    if (searchQuery.trim()) window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
  }

  function toggleAvatarMenu() { avatarMenuOpen = !avatarMenuOpen; }
  function closeMenu() { avatarMenuOpen = false; }
  function getInitials(name: string) { return name.slice(0, 2).toUpperCase(); }
</script>

<svelte:window on:click={(e) => { if (!(e.target as HTMLElement).closest('.avatar-menu-wrapper')) closeMenu(); }}/>

<header class="topbar">
  <a href="/" class="mobile-logo">
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="var(--accent)"/>
      <path d="M8 10h10M8 16h16M8 22h10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="24" cy="10" r="3" fill="var(--accent-light)"/>
    </svg>
    <span>Nexus</span>
  </a>

  <form class="search-form" class:focused={searchFocused} onsubmit={handleSearch}>
    <div class="search-icon"><Lucide.Search size={16} /></div>
    <input type="text" placeholder="Find anything..." bind:value={searchQuery}
      onfocus={() => searchFocused = true} onblur={() => searchFocused = false} class="search-input" />
    <kbd class="search-kbd">/</kbd>
  </form>

  <div class="topbar-actions">
    <button 
      class="theme-toggle" 
      onclick={() => theme.toggle()} 
      aria-label="Toggle theme"
    >
      {#if currentTheme === 'dark'}
        <Lucide.Sun size={20} />
      {:else}
        <Lucide.Moon size={20} />
      {/if}
    </button>

    {#if user}
      <a href="/notifications" class="icon-btn" aria-label="Notifications">
        <Lucide.Bell size={20} />
        {#if notificationCount > 0}<span class="notif-badge">{notificationCount}</span>{/if}
      </a>

      <a href="/submit" class="topbar-create-btn" aria-label="Create post">
        <Lucide.Plus size={14} strokeWidth={2.5} /><span>Ask</span>
      </a>

      <div class="avatar-menu-wrapper">
        <button class="avatar-btn" onclick={toggleAvatarMenu} aria-label="User menu">
          {#if user.avatarUrl}
            <img src={user.avatarUrl} alt={user.username} class="avatar-img"/>
          {:else}
            <span class="avatar-initials">{getInitials(user.username)}</span>
          {/if}
          <span class="avatar-caret" class:open={avatarMenuOpen}><Lucide.ChevronDown size={14} strokeWidth={2.5} /></span>
        </button>

        {#if avatarMenuOpen}
          <div class="avatar-dropdown">
            <div class="dropdown-header"><p class="dropdown-username">u/{user.username}</p></div>
            <div class="dropdown-divider"></div>
            <a href="/u/{user.username}" class="dropdown-item" onclick={closeMenu}><Lucide.User size={16} />Profile</a>
            <a href="/bookmarks" class="dropdown-item" onclick={closeMenu}><Lucide.Bookmark size={16} />Bookmarks</a>
            <a href="/settings" class="dropdown-item" onclick={closeMenu}><Lucide.Settings size={16} />Settings</a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item danger" onclick={() => { signOut(); closeMenu(); }}><Lucide.LogOut size={16} />Sign out</button>
          </div>
        {/if}
      </div>
    {:else}
      <a href="/login" class="auth-btn ghost">Log in</a>
      <a href="/register" class="auth-btn solid">Sign up</a>
    {/if}
  </div>
</header>

<style>
  .topbar { position: sticky; top: 0; z-index: 100; display: flex; align-items: center; gap: 1rem; padding: 0 1.25rem; height: 56px; background: var(--surface); border-bottom: 1px solid var(--border); backdrop-filter: blur(12px); }
  .mobile-logo { display: none; align-items: center; gap: 0.5rem; text-decoration: none; flex-shrink: 0; }
  .mobile-logo svg { width: 28px; height: 28px; }
  .mobile-logo span { font-family: 'DM Serif Display', Georgia, serif; font-size: 1.25rem; color: var(--text-primary); }
  .search-form { flex: 1; max-width: 500px; display: flex; align-items: center; gap: 0.5rem; background: var(--surface-raised); border: 1.5px solid transparent; border-radius: 12px; padding: 0 0.875rem; height: 38px; transition: all 0.15s ease; }
  .search-form.focused { border-color: var(--accent); background: var(--surface); }
  .search-icon { display: flex; color: var(--text-muted); }
  .search-input { flex: 1; border: none; background: transparent; font-size: 0.9375rem; color: var(--text-primary); outline: none; font-family: inherit; }
  .search-input::placeholder { color: var(--text-muted); }
  .search-kbd { font-size: 0.6875rem; color: var(--text-muted); background: var(--surface-overlay); border: 1px solid var(--border); border-radius: 4px; padding: 0.125rem 0.375rem; font-family: inherit; pointer-events: none; }
  .topbar-actions { display: flex; align-items: center; gap: 0.5rem; margin-left: auto; flex-shrink: 0; }
  .theme-toggle { display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; color: var(--text-secondary); background: none; border: none; cursor: pointer; transition: all 0.15s ease; }
  .theme-toggle:hover { background: var(--surface-raised); color: var(--text-primary); }
  .icon-btn { position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; color: var(--text-secondary); text-decoration: none; transition: all 0.15s ease; }
  .icon-btn:hover { background: var(--surface-raised); color: var(--text-primary); }
  .notif-badge { position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; background: #ef4444; color: white; font-size: 0.625rem; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); }
  .topbar-create-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.4rem 0.875rem; background: var(--accent); color: white; border-radius: 10px; text-decoration: none; font-size: 0.875rem; font-weight: 600; transition: all 0.15s ease; }
  .topbar-create-btn:hover { background: var(--accent-dark); }
  .avatar-menu-wrapper { position: relative; }
  .avatar-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.25rem; background: none; border: none; cursor: pointer; border-radius: 10px; transition: all 0.15s ease; }
  .avatar-btn:hover { background: var(--surface-raised); }
  .avatar-img { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
  .avatar-initials { width: 32px; height: 32px; background: var(--accent); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; }
  .avatar-caret { display: flex; align-items: center; color: var(--text-muted); transition: transform 0.2s ease; }
  .avatar-caret.open { transform: rotate(180deg); }
  .avatar-dropdown { position: absolute; top: calc(100% + 8px); right: 0; min-width: 200px; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.15); overflow: hidden; animation: dropdownIn 0.15s ease-out; }
  @keyframes dropdownIn { from { opacity: 0; transform: translateY(-4px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .dropdown-header { padding: 0.75rem 1rem; }
  .dropdown-username { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
  .dropdown-divider { height: 1px; background: var(--border); margin: 0.25rem 0; }
  .dropdown-item { display: flex; align-items: center; gap: 0.625rem; padding: 0.625rem 1rem; font-size: 0.875rem; color: var(--text-secondary); text-decoration: none; background: none; border: none; width: 100%; text-align: left; cursor: pointer; transition: all 0.1s ease; font-family: inherit; }
  .dropdown-item:hover { background: var(--surface-raised); color: var(--text-primary); }
  .dropdown-item.danger:hover { background: #fef2f2; color: #ef4444; }
  .auth-btn { padding: 0.4rem 1rem; border-radius: 10px; font-size: 0.875rem; font-weight: 600; text-decoration: none; transition: all 0.15s ease; }
  .auth-btn.ghost { color: var(--text-primary); border: 1.5px solid var(--border); }
  .auth-btn.ghost:hover { border-color: var(--text-secondary); }
  .auth-btn.solid { background: var(--accent); color: white; }
  .auth-btn.solid:hover { background: var(--accent-dark); }
  @media (max-width: 768px) { .mobile-logo { display: flex; } .search-kbd { display: none; } .topbar-create-btn span { display: none; } .topbar-create-btn { padding: 0.4rem 0.5rem; } }
</style>