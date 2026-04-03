<script lang="ts">
  import Toast from './Toast.svelte';

  interface ToastItem {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
  }

  let toasts: ToastItem[] = $state([]);

  export function addToast(item: Omit<ToastItem, 'id'>) {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { ...item, id }];
  }

  function dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id);
  }
</script>

<div class="toast-container" aria-live="polite" aria-atomic="false">
  {#each toasts as toast (toast.id)}
    <Toast
      id={toast.id}
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      on:dismiss={(e) => dismiss(e.detail)}
    />
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }
  .toast-container :global(.toast) { pointer-events: auto; }

  @media (max-width: 480px) {
    .toast-container { left: 1rem; right: 1rem; bottom: 1rem; }
    .toast-container :global(.toast) { min-width: unset; max-width: unset; }
  }
</style>