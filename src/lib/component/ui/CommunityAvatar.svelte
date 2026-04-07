<script lang="ts">
  const {
    icon = '🌐',
    size = 'md',
    name = '',
  }: {
    icon?: string;
    size?: 'sm' | 'md' | 'lg' | string;
    name?: string;
  } = $props();

  const sizes = { sm: 32, md: 48, lg: 64 };
  const px = $derived(typeof size === 'string' && sizes[size as keyof typeof sizes] ? sizes[size as keyof typeof sizes] : parseInt(size) || 48);

  // Check if icon is a URL (contains http/https or other URL patterns)
  const isUrl = $derived(icon && (icon.includes('http') || icon.includes('://') || icon.includes('data:')));
</script>

<div class="community-avatar" style="width:{px}px;height:{px}px">
  {#if isUrl}
    <img src={icon} alt={name ? `${name} icon` : 'Community icon'} class="avatar-image" />
  {:else}
    <div class="avatar-emoji">{icon || '🌐'}</div>
  {/if}
</div>

<style>
  .community-avatar {
    border-radius: 12px;
    background: var(--surface-raised);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  .avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatar-emoji {
    font-size: 1.5em;
    line-height: 1;
  }
</style>