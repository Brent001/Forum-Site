<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  let {
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    href = null,
    type = 'button',
  }: {
    variant?: 'primary' | 'ghost' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    href?: string | null;
    type?: 'button' | 'submit' | 'reset';
  } = $props();

  const dispatch = createEventDispatcher();

  function handleClick(event: MouseEvent) {
    if (disabled || loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    dispatch('click', event);
  }
</script>

{#if href}
  <a
    {href}
    class="btn btn-{variant} btn-{size}"
    class:disabled
    onclick={handleClick}
  >
    {#if loading}<span class="spinner"/>{/if}
    <slot/>
  </a>
{:else}
  <button
    {type}
    {disabled}
    class="btn btn-{variant} btn-{size}"
    class:loading
    onclick={handleClick}
  >
    {#if loading}<span class="spinner"/>{/if}
    <slot/>
  </button>
{/if}

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    text-decoration: none;
    font-family: inherit;
    transition: all 0.15s ease;
    white-space: nowrap;
    position: relative;
    outline: none;
  }
  .btn:focus-visible { box-shadow: 0 0 0 3px var(--accent-shadow); }
  .btn:disabled, .btn.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }

  .btn-sm { padding: 0.375rem 0.75rem; font-size: 0.8125rem; }
  .btn-md { padding: 0.5rem 1rem; font-size: 0.9375rem; }
  .btn-lg { padding: 0.625rem 1.25rem; font-size: 1rem; }

  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover { background: var(--accent-dark); transform: translateY(-1px); box-shadow: 0 4px 12px var(--accent-shadow); }

  .btn-ghost { background: transparent; color: var(--text-secondary); }
  .btn-ghost:hover { background: var(--surface-raised); color: var(--text-primary); }

  .btn-outline { background: transparent; color: var(--text-primary); border: 1.5px solid var(--border); }
  .btn-outline:hover { border-color: var(--text-secondary); }

  .btn-danger { background: #ef4444; color: white; }
  .btn-danger:hover { background: #dc2626; }

  .spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>