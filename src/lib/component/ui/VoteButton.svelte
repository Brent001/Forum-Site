<script lang="ts">
  import Icon from '@iconify/svelte';

  let { direction = 'up', active = false, onclick }: { direction?: 'up' | 'down'; active?: boolean; onclick?: () => void } = $props();
</script>

<button
  type="button"
  class="vote-btn {direction}"
  class:active
  aria-label="{direction}vote"
  {onclick}
>
  {#if direction === 'up'}
    <Icon icon="lucide:chevron-up" width="16" height="16" />
  {:else}
    <Icon icon="lucide:chevron-down" width="16" height="16" />
  {/if}
</button>

<style>
  .vote-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 8px; border: none; background: none; cursor: pointer; color: var(--text-muted); transition: all 0.15s ease; }
  .vote-btn:hover { background: var(--surface-raised); }
  .vote-btn.up:hover { color: var(--vote-up); background: #ff450020; }
  .vote-btn.down:hover { color: var(--vote-down); background: #7193ff20; }
  .vote-btn.up.active { color: var(--vote-up); background: #ff450030; font-weight: 600; }
  .vote-btn.down.active { color: var(--vote-down); background: #7193ff30; font-weight: 600; }
</style>