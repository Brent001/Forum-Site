<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';

  let { open = false, title = '', size = 'md' }: { open?: boolean; title?: string; size?: 'sm' | 'md' | 'lg' | 'xl' } = $props();

  const dispatch = createEventDispatcher();

  function close() { dispatch('close'); }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && open) close();
  }

  onMount(() => {
    if (typeof document === 'undefined') return;

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <div class="modal-backdrop" transition:fade={{ duration: 150 }} on:click={close} role="dialog" aria-modal="true">
    <div
      class="modal-panel size-{size}"
      transition:scale={{ duration: 200, start: 0.95 }}
      on:click|stopPropagation
    >
      {#if title}
        <div class="modal-header">
          <h2 class="modal-title">{title}</h2>
          <button class="modal-close" on:click={close} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      {/if}
      <div class="modal-body">
        <slot/>
      </div>
      {#if $$slots.footer}
        <div class="modal-footer">
          <slot name="footer"/>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: 0 24px 64px rgba(0,0,0,0.2);
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .size-sm { max-width: 400px; }
  .size-md { max-width: 540px; }
  .size-lg { max-width: 720px; }
  .size-xl { max-width: 960px; }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem 0;
    flex-shrink: 0;
  }
  .modal-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  .modal-close {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--text-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.1s ease;
  }
  .modal-close:hover { background: var(--surface-raised); color: var(--text-primary); }
  .modal-close svg { width: 16px; height: 16px; }

  .modal-body { padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1; }

  .modal-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    flex-shrink: 0;
  }
</style>