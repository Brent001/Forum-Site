<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme';
  import { realtime } from '$lib/stores/realtime';
  import Topbar from '$lib/component/ui/Topbar.svelte';
  import Sidebar from '$lib/component/ui/Sidebar.svelte';
  import RightPanel from '$lib/component/ui/RightPanel.svelte';
  import MobileNav from '$lib/component/ui/MobileNav.svelte';
  import ToastContainer from '$lib/component/ui/ToastContainer.svelte';

  const { data = {}, children } = $props<{
    data?: {
      user?: { username: string; avatarUrl?: string } | null;
      home?: {
        siteStats: { members: number; postsToday: number; online: number };
        trendingCommunities: Array<{
          name: string;
          displayName: string;
          icon: string;
          members: number;
          growth: string;
        }>;
      } | null;
      community?: {
        id: string;
        name: string;
        displayName: string;
        description: string;
        icon: string;
        memberCount: number;
        postCount: number;
      } | null;
      communities?: Array<{ id: string; name: string; displayName: string; icon: string; members: number; postCount: number }>;
      memberCommunities?: Array<{ id: string; name: string; displayName: string; icon: string; members: number; postCount: number }>;
    } | null;
    children?: any;
  }>();

  let toastContainer = $state<ToastContainer>();

  // Derived booleans for cleaner template
  const isSetupOrLogin = $derived(
    $page.url.pathname.startsWith('/setup') || 
    $page.url.pathname.startsWith('/login') || 
    $page.url.pathname.startsWith('/register')
  );

  const isHomePage = $derived($page.url.pathname === '/');

  onMount(() => {
    theme.init();
    realtime.connect();
  });

</script>

<div class={isSetupOrLogin ? 'app-root setup-mode' : 'app-root'}>
  {#if !isSetupOrLogin}
    <Topbar user={data?.user ?? null} />
  {/if}

  <div class="app-body">
    {#if !isSetupOrLogin}
      <Sidebar communities={data?.memberCommunities?.length ? data.memberCommunities : data?.communities ?? []} />
    {/if}

    <main class={isSetupOrLogin ? 'setup-main' : 'app-main'}>
      {@render children?.()}
    </main>

    {#if !isSetupOrLogin}
      {#if isHomePage}
        <!-- Home page only: trending, stats, links -->
        <RightPanel user={data?.user ?? null} home={data?.home ?? null} community={null} />

      {/if}
    {/if}
  </div>

  {#if !isSetupOrLogin}
    <MobileNav notificationCount={3} />
    <ToastContainer bind:this={toastContainer} />
  {/if}
</div>

<style>
  :global(*), :global(*::before), :global(*::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(:root) {
    /* Colors */
    --accent: #4f6ef7;
    --accent-dark: #3d5ce0;
    --accent-light: #818cf8;
    --accent-subtle: #eef2ff;
    --accent-shadow: rgba(79, 110, 247, 0.25);
    --vote-up: #ff4500;
    --vote-down: #7193ff;

    /* Light theme */
    --surface: #ffffff;
    --surface-raised: #f8f9fa;
    --surface-overlay: #f1f3f5;
    --border: #e5e7eb;
    --border-hover: #d1d5db;
    --text-primary: #111827;
    --text-secondary: #374151;
    --text-muted: #9ca3af;
  }

  :global([data-theme="dark"]) {
    --surface: #0f1117;
    --surface-raised: #171b24;
    --surface-overlay: #1e2330;
    --border: #2a2f3e;
    --border-hover: #3a4055;
    --text-primary: #f1f5f9;
    --text-secondary: #94a3b8;
    --text-muted: #475569;
    --accent-subtle: #1e1f3a;
  }

  :global(html) {
    font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
    color: var(--text-primary);
    background: var(--surface-raised);
    -webkit-font-smoothing: antialiased;
    scroll-behavior: smooth;
  }

  :global(body) { background: var(--surface-raised); }

  /* Custom Scrollbar */
  :global(*) { scrollbar-width: thin; scrollbar-color: var(--border) var(--surface); }
  :global(::-webkit-scrollbar) { width: 8px; height: 8px; }
  :global(::-webkit-scrollbar-track) { background: var(--surface); }
  :global(::-webkit-scrollbar-thumb) { background: var(--border); border-radius: 4px; }
  :global(::-webkit-scrollbar-thumb:hover) { background: var(--border-hover); }

  .app-root { min-height: 100vh; display: flex; flex-direction: column; }

  .app-body {
    display: flex;
    flex: 1;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
    gap: 0.25rem;
  }

  /* ✅ Removed max-width: 740px — main now fills all available space */
  .app-main {
    flex: 1;
    min-width: 0;
    padding: 1rem 1rem;
  }

  .setup-main {
    flex: 1;
    min-width: 0;
    width: 100%;
    padding: 0;
    max-width: none;
  }


  @media (max-width: 1024px) {
    :global(.sidebar) { display: none !important; }
    :global(.panel) { width: 280px !important; }
    .app-main { padding: 1rem; padding-bottom: 80px; }
  }

  @media (max-width: 768px) {
    :global(.panel) { display: none !important; }
    .app-main { padding: 1rem; padding-bottom: 80px; }
  }
</style>