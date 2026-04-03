<script lang="ts">
  let {
    username = 'user',
    avatarUrl = null,
    size = 'md',
    online = false,
  }: {
    username?: string;
    avatarUrl?: string | null;
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    online?: boolean;
  } = $props();

  const sizes = { xs: 20, sm: 28, md: 36, lg: 48, xl: 64 };
  const px = $derived(sizes[size]);
  const initials = $derived(username.slice(0, 2).toUpperCase());

  // Deterministic color from username
  const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#6366f1'];
  const color = $derived(colors[username.charCodeAt(0) % colors.length]);
</script>

<div class="avatar-wrapper" style="width:{px}px;height:{px}px">
  {#if avatarUrl}
    <img src={avatarUrl} alt={username} class="avatar-img" style="width:{px}px;height:{px}px"/>
  {:else}
    <div class="avatar-fallback" style="width:{px}px;height:{px}px;background:{color};font-size:{px*0.35}px">
      {initials}
    </div>
  {/if}
  {#if online}
    <span class="online-dot" style="width:{px*0.28}px;height:{px*0.28}px"/>
  {/if}
</div>

<style>
  .avatar-wrapper { position: relative; flex-shrink: 0; }
  .avatar-img { border-radius: 50%; object-fit: cover; display: block; }
  .avatar-fallback {
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: white;
    font-weight: 700;
    letter-spacing: -0.01em;
  }
  .online-dot {
    position: absolute;
    bottom: 0; right: 0;
    border-radius: 50%;
    background: #22c55e;
    border: 2px solid var(--surface);
  }
</style>