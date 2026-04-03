<script lang="ts">
  const { data = {} } = $props<{
    data?: {
      user?: { id: string; username: string };
    };
  }>();
</script>

<svelte:head>
  <title>Create Community — Nexus</title>
</svelte:head>

<div class="create-community-page">
  <div class="page-header">
    <p class="eyebrow">Create community</p>
    <h1>Launch a new space for your community.</h1>
    <p class="subtitle">Name your topic, add a description, and invite others to join.</p>
  </div>

  <form method="post" class="community-form">
    <label>
      <span>Community name</span>
      <input name="name" placeholder="technology" required />
    </label>

    <label>
      <span>Display name</span>
      <input name="displayName" placeholder="Technology" required />
    </label>

    <label>
      <span>Icon</span>
      <input name="icon" placeholder="🌐" />
    </label>

    <label>
      <span>Banner URL</span>
      <input name="banner" placeholder="https://example.com/banner.png" />
    </label>

    <label>
      <span>Description</span>
      <textarea name="description" rows="4" placeholder="What will your community be about?"></textarea>
    </label>

    <label>
      <span>Rules (one per line)</span>
      <textarea name="rules" rows="5" placeholder="Be nice\nNo spam\nStay on topic"></textarea>
    </label>

    <button type="submit" class="primary-btn">Create community</button>
  </form>
</div>

<style>
  .create-community-page { display: flex; flex-direction: column; gap: 1.5rem; }
  .eyebrow { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.16em; }
  h1 { font-size: 2rem; margin-top: 0.25rem; }
  .subtitle { color: var(--text-secondary); max-width: 42rem; margin-top: 0.5rem; }
  .community-form { display: grid; gap: 1rem; max-width: 560px; }
  label { display: grid; gap: 0.35rem; font-size: 0.9rem; color: var(--text-secondary); }
  input, textarea { width: 100%; padding: 0.95rem 1rem; border: 1px solid var(--border); border-radius: 14px; background: var(--surface); color: var(--text-primary); font: inherit; outline: none; transition: border-color 0.15s ease; }
  input:focus, textarea:focus { border-color: var(--accent); }
  .primary-btn { padding: 0.95rem 1.25rem; background: var(--accent); color: white; border: none; border-radius: 14px; font-weight: 700; cursor: pointer; transition: background 0.15s ease; }
  .primary-btn:hover { background: var(--accent-dark); }
</style>
