<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { createEventDispatcher, onMount } from 'svelte';

  let {
    message = '',
    type = 'info',
    duration = 4000,
    id = Math.random().toString(36),
  }: {
    message?: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    id?: string;
  } = $props();

  const dispatch = createEventDispatcher();

  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20,6 9,17 4,12"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };

  onMount(() => {
    if (duration > 0) {
      const t = setTimeout(() => dispatch('dismiss', id), duration);
      return () => clearTimeout(t);
    }
  });
</script>

<div
  class="toast toast-{type}"
  in:fly={{ y: 16, duration: 250 }}
  out:fade={{ duration: 200 }}
  role="alert"
>
  <span class="toast-icon">{@html icons[type]}</span>
  <p class="toast-message">{message}</p>
  <button class="toast-dismiss" on:click={() => dispatch('dismiss', id)} aria-label="Dismiss">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  </button>
</div>

<style>
  .toast {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border-radius: 14px;
    border: 1px solid;
    box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    min-width: 300px;
    max-width: 420px;
    backdrop-filter: blur(8px);
  }
  .toast-success { background: #f0fdf4; border-color: #bbf7d0; }
  .toast-error { background: #fef2f2; border-color: #fecaca; }
  .toast-info { background: #eff6ff; border-color: #bfdbfe; }
  .toast-warning { background: #fffbeb; border-color: #fde68a; }

  .toast-icon { display: flex; flex-shrink: 0; }
  .toast-icon :global(svg) { width: 18px; height: 18px; }
  .toast-success .toast-icon { color: #16a34a; }
  .toast-error .toast-icon { color: #ef4444; }
  .toast-info .toast-icon { color: #3b82f6; }
  .toast-warning .toast-icon { color: #f59e0b; }

  .toast-message { flex: 1; font-size: 0.875rem; font-weight: 500; color: var(--text-primary); }
  .toast-dismiss {
    display: flex; align-items: center; justify-content: center;
    width: 24px; height: 24px;
    border: none; background: none; cursor: pointer;
    color: var(--text-muted); border-radius: 6px;
    transition: all 0.1s ease; flex-shrink: 0;
  }
  .toast-dismiss:hover { background: rgba(0,0,0,0.05); }
  .toast-dismiss :global(svg) { width: 14px; height: 14px; }
</style>