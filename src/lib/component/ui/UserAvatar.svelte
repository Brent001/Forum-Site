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

  const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#ef4444','#6366f1'];
  const color = $derived(colors[username.charCodeAt(0) % colors.length]);
</script>

<div class="relative shrink-0" style="width:{px}px;height:{px}px">
  {#if avatarUrl}
    <img src={avatarUrl} alt={username} class="rounded-full object-cover block" style="width:{px}px;height:{px}px" />
  {:else}
    <div
      class="rounded-full flex items-center justify-center text-white font-bold tracking-tight"
      style="width:{px}px;height:{px}px;background:{color};font-size:{px*0.35}px"
    >
      {initials}
    </div>
  {/if}
  {#if online}
    <span
      class="absolute bottom-0 right-0 rounded-full bg-green-400 border-2 border-(--surface)"
      style="width:{px*0.28}px;height:{px*0.28}px"
    />
  {/if}
</div>