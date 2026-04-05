<script lang="ts">
  import { page } from '$app/stores';
  import Icon from '@iconify/svelte';

  let { notificationCount = 3 }: { notificationCount?: number } = $props();

  const tabs = [
    { href: '/',              label: 'Home',    icon: 'lucide:home',        special: false, badge: false },
    { href: '/popular',       label: 'Popular', icon: 'lucide:trending-up', special: false, badge: false },
    { href: '/submit',        label: 'Post',    icon: 'lucide:plus',        special: true,  badge: false },
    { href: '/notifications', label: 'Alerts',  icon: 'lucide:bell',        special: false, badge: true  },
    { href: '/u/me',          label: 'Profile', icon: 'lucide:user',        special: false, badge: false },
  ];
</script>

<nav class="mobile-nav" aria-label="Mobile navigation">
  {#each tabs as tab}
    {@const isActive = $page.url.pathname === tab.href}
    <a
      href={tab.href}
      class="mobile-tab"
      class:active={isActive}
      class:special={tab.special}
      aria-label={tab.label}
      aria-current={isActive ? 'page' : undefined}
    >
      <span class="mobile-tab-icon">
        <Icon icon={tab.icon} width={tab.special ? 20 : 22} height={tab.special ? 20 : 22} />
        {#if tab.badge && notificationCount > 0}
          <span class="tab-badge">{notificationCount}</span>
        {/if}
      </span>
      {#if !tab.special}
        <span class="mobile-tab-label">{tab.label}</span>
      {/if}
    </a>
  {/each}
</nav>

<style>
  .mobile-nav { display: none; position: fixed; bottom: 0; left: 0; right: 0; height: 60px; background: var(--surface); border-top: 1px solid var(--border); padding: 0 0.5rem; padding-bottom: env(safe-area-inset-bottom, 0); z-index: 200; align-items: center; justify-content: space-around; }
  @media (max-width: 768px) { .mobile-nav { display: flex; } }
  .mobile-tab { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; padding: 0.375rem 1rem; border-radius: 10px; text-decoration: none; color: var(--text-muted); transition: all 0.15s ease; position: relative; }
  .mobile-tab:hover { color: var(--text-primary); }
  .mobile-tab.active { color: var(--accent); }
  .mobile-tab.special { background: var(--accent); color: white; width: 44px; height: 44px; border-radius: 14px; padding: 0; justify-content: center; }
  .mobile-tab.special:hover { background: var(--accent-dark); }
  .mobile-tab-icon { position: relative; display: flex; align-items: center; justify-content: center; }
  .tab-badge { position: absolute; top: -4px; right: -6px; width: 16px; height: 16px; background: #ef4444; color: white; font-size: 0.625rem; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid var(--surface); }
  .mobile-tab-label { font-size: 0.625rem; font-weight: 500; }
</style>