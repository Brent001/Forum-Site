<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { createEventDispatcher, onMount } from 'svelte';
  import Icon from '@iconify/svelte';

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

  const icons: Record<string, string> = {
    success: 'lucide:check-circle',
    error:   'lucide:x-circle',
    info:    'lucide:info',
    warning: 'lucide:alert-triangle',
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
  <span class="toast-icon">
    <Icon icon={icons[type]} width="18" height="18" />
  </span>
  <p class="toast-message">{message}</p>
  <button class="toast-dismiss" onclick={() => dispatch('dismiss', id)} aria-label="Dismiss">
    <Icon icon="lucide:x" width="14" height="14" />
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
  .toast-error   { background: #fef2f2; border-color: #fecaca; }
  .toast-info    { background: #eff6ff; border-color: #bfdbfe; }
  .toast-warning { background: #fffbeb; border-color: #fde68a; }

  .toast-icon { display: flex; flex-shrink: 0; }
  .toast-success .toast-icon { color: #16a34a; }
  .toast-error   .toast-icon { color: #ef4444; }
  .toast-info    .toast-icon { color: #3b82f6; }
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
</style>