<script lang="ts">
  const { data = {} } = $props<{
    data?: {
      community?: {
        id: string;
        name: string;
        displayName: string;
        description: string;
        icon: string;
        banner: string;
        rules: string[];
      } | null;
      error?: string;
    };
  }>();

  let displayName = $state(data.community?.displayName ?? '');
  let description = $state(data.community?.description ?? '');
  let icon = $state(data.community?.icon ?? '🌐');
  let banner = $state(data.community?.banner ?? '');
  let rules = $state((data.community?.rules ?? []).join('\n'));
  let error = $state('');
</script>

<svelte:head>
  <title>Edit c/{data.community?.name ?? ''} — Nexus</title>
</svelte:head>

{#if data.community}
  <div class="settings-page">
    <div class="settings-header">
      <h1>Edit community settings</h1>
      <p>Update icon, banner, description and rules for c/{data.community.name}.</p>
    </div>

    {#if error}
      <div class="error-banner" role="alert">{error}</div>
    {/if}

    <form method="post" class="settings-form" on:submit={() => error = ''}>
      <label>
        <span>Community name</span>
        <input value={data.community.name} disabled />
      </label>

      <label>
        <span>Display name</span>
        <input name="displayName" bind:value={displayName} required />
      </label>

      <label>
        <span>Icon</span>
        <input name="icon" bind:value={icon} />
      </label>

      <label>
        <span>Banner URL</span>
        <input name="banner" bind:value={banner} placeholder="https://example.com/banner.png" />
      </label>

      <label>
        <span>Description</span>
        <textarea name="description" rows="4" bind:value={description}></textarea>
      </label>

      <label>
        <span>Rules (one per line)</span>
        <textarea name="rules" rows="5" bind:value={rules}></textarea>
      </label>

      <div class="buttons">
        <a href="/c/{data.community.name}" class="btn-ghost">Cancel</a>
        <button type="submit" class="primary-btn">Save changes</button>
      </div>
    </form>
  </div>
{:else}
  <div class="not-found">
    <p>Community not found.</p>
    <a href="/communities" class="primary-btn">Back to communities</a>
  </div>
{/if}

<style>
  .settings-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 640px; }
  .settings-header h1 { margin: 0; font-size: 1.75rem; }
  .settings-header p { margin: 0.3rem 0 0; color: var(--text-secondary); }
  .settings-form { display: grid; gap: 1rem; }
  label { display: grid; gap: 0.35rem; color: var(--text-secondary); }
  input, textarea { width: 100%; padding: 0.95rem 1rem; border: 1px solid var(--border); border-radius: 12px; background: var(--surface); color: var(--text-primary); outline: none; transition: border-color 0.15s ease; font: inherit; }
  input:focus, textarea:focus { border-color: var(--accent); }
  .buttons { display: flex; gap: 0.75rem; align-items: center; justify-content: flex-end; }
  .btn-ghost { padding: 0.7rem 1.3rem; border: 1px solid var(--border); border-radius: 10px; background: transparent; color: var(--text-primary); text-decoration: none; }
  .primary-btn { padding: 0.7rem 1.3rem; background: var(--accent); color: white; border: none; border-radius: 10px; }
  .error-banner { color: var(--danger, #dc2626); background: rgba(220, 38, 38, 0.08); border: 1px solid rgba(220, 38, 38, 0.4); padding: 0.75rem 1rem; border-radius: 10px; }
</style>
