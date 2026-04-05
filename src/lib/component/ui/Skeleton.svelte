<script lang="ts">
  let {
    variant = 'post',
    count = 1,
  }: {
    variant?: 'post' | 'text' | 'avatar' | 'community';
    count?: number;
  } = $props();
</script>

{#each Array(count) as _}
  {#if variant === 'post'}
    <div class="skeleton-post">
      <div class="skel-vote">
        <div class="skel skel-circle" style="width:28px;height:28px"></div>
        <div class="skel" style="width:24px;height:14px;border-radius:4px"></div>
        <div class="skel skel-circle" style="width:28px;height:28px"></div>
      </div>
      <div class="skel-body">
        <div class="skel-meta">
          <div class="skel" style="width:120px;height:12px;border-radius:6px"></div>
          <div class="skel" style="width:80px;height:12px;border-radius:6px"></div>
        </div>
        <div class="skel" style="width:85%;height:20px;border-radius:6px;margin-bottom:8px"></div>
        <div class="skel" style="width:60%;height:20px;border-radius:6px;margin-bottom:12px"></div>
        <div class="skel" style="width:100%;height:14px;border-radius:6px;margin-bottom:6px"></div>
        <div class="skel" style="width:75%;height:14px;border-radius:6px;margin-bottom:16px"></div>
        <div class="skel-actions">
          {#each [80, 72, 60] as w}
            <div class="skel" style="width:{w}px;height:30px;border-radius:8px"></div>
          {/each}
        </div>
      </div>
    </div>
  {:else if variant === 'text'}
    <div class="skel" style="width:100%;height:14px;border-radius:6px"></div>
  {:else if variant === 'avatar'}
    <div class="skel skel-circle" style="width:36px;height:36px"></div>
  {:else if variant === 'community'}
    <div class="skeleton-community">
      <div class="skel skel-circle" style="width:40px;height:40px"></div>
      <div style="flex:1">
        <div class="skel" style="width:120px;height:14px;border-radius:6px;margin-bottom:6px"></div>
        <div class="skel" style="width:80px;height:12px;border-radius:6px"></div>
      </div>
    </div>
  {/if}
{/each}

<style>
  .skel {
    background: linear-gradient(90deg, var(--surface-raised) 25%, var(--surface-overlay) 50%, var(--surface-raised) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    display: block;
  }
  @keyframes shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .skel-circle { border-radius: 50% !important; }

  .skeleton-post {
    display: flex;
    gap: 0.75rem;
    padding: 0.875rem 1rem;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
  }

  .skel-vote {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.375rem;
    padding-top: 0.125rem;
    min-width: 36px;
  }

  .skel-body { flex: 1; }

  .skel-meta {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .skel-actions {
    display: flex;
    gap: 0.25rem;
  }

  .skeleton-community {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 12px;
  }
</style>