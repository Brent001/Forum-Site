<script lang="ts">
  let { children }: { children?: any } = $props();
  // Minimal layout for the setup page.
</script>

<div class="setup-shell">
  {@render children?.()}
</div>

<style>
  .setup-shell {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
    padding: 2rem 1rem;
  }
</style>
