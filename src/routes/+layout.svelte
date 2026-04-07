<script lang="ts">
  import './layout.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme.js';
  import { realtime } from '$lib/stores/realtime.js';
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

  // Page state - use browser location for client-side routing
  let currentPath = $derived($page.url.pathname);
  let isSetupOrLogin = $derived(
    currentPath.startsWith('/setup') ||
    currentPath.startsWith('/login') ||
    currentPath.startsWith('/register')
  );
  let isHomePage = $derived(currentPath === '/');

  $effect(() => {
    if (typeof window !== 'undefined') {
      const match = currentPath.match(/^\/c\/([^\/]+)/);
      const community = match ? match[1] : null;

      if (community) {
        realtime.connect(community);
      } else {
        realtime.connect();
      }
    }
  });

  onMount(() => {
    theme.init();
    // Initial connection will be handled by the effect above
  });

</script>

<div class={isSetupOrLogin ? 'app-root setup-mode' : 'app-root'}>
  {#if !isSetupOrLogin}
    <Topbar user={data?.user ?? null} />
  {/if}

<div class="app-body">
    {#if !isSetupOrLogin}
      <Sidebar user={data?.user ?? null} communities={data?.memberCommunities?.length ? data.memberCommunities : []} />
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

    /* Light theme - richer warmer colors */
    --surface: #faf8f4;
    --surface-raised: #f4f1eb;
    --surface-overlay: #e9e6df;
    --border: #d8d4ca;
    --border-hover: #c4bfb3;
    --text-primary: #1d1b17;
    --text-secondary: #555249;
    --text-muted: #86827a;

    /* Pastel accents for light mode */
    --surface-blue: #e8f0fe;
    --surface-green: #e6f4ea;
    --surface-yellow: #fef5d6;
    --surface-red: #fae8e8;
    --surface-purple: #f3edfe;
    --surface-pink: #fae8f0;
    --surface-orange: #fef0e4;
    --surface-cyan: #e4f4f8;
    --surface-teal: #e0f2ec;
    --surface-rose: #fae8ea;

    /* Colorful borders */
    --border-blue: #a8c5f2;
    --border-green: #a5d6a7;
    --border-yellow: #f0d48a;
    --border-red: #e8a5a5;
    --border-purple: #c4a8f0;
    --border-pink: #f0a8c4;
    --border-orange: #f0c4a0;
    --border-cyan: #a5d4e0;
    --border-teal: #a5d8c8;
    --border-rose: #e0a5ac;
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

    /* Dark pastel accents */
    --surface-blue: #1e3a5f;
    --surface-green: #14532d;
    --surface-yellow: #451a03;
    --surface-red: #450a0a;
    --surface-purple: #2e1065;
    --surface-pink: #500724;
    --surface-orange: #431407;
    --surface-cyan: #083344;

    --border-blue: #1e40af;
    --border-green: #166534;
    --border-yellow: #b45309;
    --border-red: #991b1b;
    --border-purple: #7c3aed;
    --border-pink: #be185d;
    --border-orange: #c2410c;
  }

  :global(html), :global(body) {
    font-family: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
    color: var(--text-primary);
    background: var(--surface-raised);
    -webkit-font-smoothing: antialiased;
    scroll-behavior: smooth;
    height: 100%;
    overflow: hidden;
  }

  /* Custom Scrollbar */
  :global(::-webkit-scrollbar) { width: 6px; height: 6px; }
  :global(::-webkit-scrollbar-track) { background: transparent; }
  :global(::-webkit-scrollbar-thumb) { background: var(--border); border-radius: 4px; }
  :global(::-webkit-scrollbar-thumb:hover) { background: var(--border-hover); }

  .app-root { height: 100vh; display: flex; flex-direction: column; overflow: hidden; }

  .app-body {
    display: flex;
    flex: 1;
    max-width: 1600px;
    margin: 0 auto;
    width: 100%;
    gap: 0.25rem;
    min-height: 0;
  }

  .app-main {
    flex: 1;
    min-width: 0;
    padding: 1rem 1rem;
    overflow-y: auto;
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