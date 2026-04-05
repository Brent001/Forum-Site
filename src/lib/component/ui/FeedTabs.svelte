<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from '@iconify/svelte';

  let { activeSort = 'hot' }: { activeSort?: 'hot' | 'new' | 'top' | 'rising' | 'best' } = $props();
  const dispatch = createEventDispatcher();

  const tabs = [
    { id: 'hot',    label: 'Hot',    icon: 'lucide:flame' },
    { id: 'new',    label: 'New',    icon: 'lucide:clock' },
    { id: 'top',    label: 'Top',    icon: 'lucide:trending-up' },
    { id: 'rising', label: 'Rising', icon: 'lucide:arrow-up-right' },
    { id: 'best',   label: 'Best',   icon: 'lucide:star' },
  ] as const;
</script>

<div class="feed-tabs" role="tablist">
  {#each tabs as tab}
    <button
      class="feed-tab"
      class:active={activeSort === tab.id}
      role="tab"
      aria-selected={activeSort === tab.id}
      onclick={() => { dispatch('change', tab.id); }}
    >
      <span class="tab-icon"><Icon icon={tab.icon} width="15" height="15" /></span>
      <span class="tab-label">{tab.label}</span>
    </button>
  {/each}
</div>

<style>
  .feed-tabs { display: flex; align-items: center; gap: 0.25rem; padding: 0.25rem; background: var(--surface-raised); border-radius: 12px; border: 1px solid var(--border); }
  .feed-tab { display: flex; align-items: center; gap: 0.375rem; padding: 0.4375rem 0.875rem; border-radius: 9px; border: none; background: none; cursor: pointer; font-size: 0.875rem; font-weight: 500; color: var(--text-muted); transition: all 0.15s ease; font-family: inherit; white-space: nowrap; }
  .feed-tab:hover { color: var(--text-primary); background: var(--surface); }
  .feed-tab.active { background: var(--surface); color: var(--text-primary); font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  .tab-icon { display: flex; }
  @media (max-width: 480px) { .tab-label { display: none; } .feed-tab { padding: 0.4375rem 0.625rem; } }
</style>