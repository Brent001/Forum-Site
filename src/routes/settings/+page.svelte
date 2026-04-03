<script lang="ts">
  import { onMount } from 'svelte';
  const data = $props<{ profile: { username: string; name: string; email: string; role: string; theme: string; notificationsEnabled: boolean } }>();

  let theme = $state('light');
  let notificationsEnabled = $state(true);
  let loading = $state(false);
  let success = $state(false);
  let error = $state('');

  onMount(() => {
    theme = data.profile.theme ?? 'light';
    notificationsEnabled = data.profile.notificationsEnabled;
  });

  async function saveSettings() {
    loading = true;
    error = '';
    success = false;

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme, notificationsEnabled }),
      });

      const result = await response.json();
      if (!response.ok) {
        error = result?.error || 'Unable to save your settings.';
      } else {
        success = true;
      }
    } catch (err) {
      error = 'Unable to save your settings. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Settings</title>
</svelte:head>

<div class="settings-shell">
  <div class="settings-panel">
    <div class="settings-header">
      <div>
        <p class="eyebrow">Account Settings</p>
        <h1>Customize your experience</h1>
        <p class="subtitle">Update your display preferences and notification settings for the forum.</p>
      </div>
    </div>

    <section class="card">
      <div class="card-section">
        <h2>Profile</h2>
        <div class="field-grid two-columns">
          <label>
            Username
            <input type="text" value={data.profile.username} disabled />
          </label>
          <label>
            Display name
            <input type="text" value={data.profile.name} disabled />
          </label>
          <label>
            Email
            <input type="email" value={data.profile.email} disabled />
          </label>
          <label>
            Role
            <input type="text" value={data.profile.role} disabled />
          </label>
        </div>
      </div>

      <div class="card-section">
        <h2>Preferences</h2>
        <div class="field-grid">
          <label>
            Theme
            <select bind:value={theme}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>

          <label class="toggle-row">
            <span>Notifications</span>
            <input type="checkbox" bind:checked={notificationsEnabled} />
          </label>
        </div>
      </div>

      {#if error}
        <div class="alert error">{error}</div>
      {/if}
      {#if success}
        <div class="alert success">Your preferences have been saved.</div>
      {/if}

      <div class="actions">
        <button class="primary" onclick={saveSettings} disabled={loading}>
          {loading ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </section>
  </div>
</div>

<style>
  .settings-shell {
    padding: 2rem;
    display: flex;
    justify-content: center;
  }

  .settings-panel {
    width: min(900px, 100%);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.75rem;
    color: #6366f1;
    margin-bottom: 0.5rem;
  }

  .subtitle {
    color: #4b5563;
    max-width: 38rem;
  }

  .card {
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 24px;
    padding: 1.75rem;
    box-shadow: 0 24px 80px rgba(15, 23, 42, 0.08);
  }

  .card-section + .card-section {
    margin-top: 1.5rem;
  }

  .card-section h2 {
    margin-bottom: 0.75rem;
    font-size: 1.1rem;
  }

  .field-grid {
    display: grid;
    gap: 1rem;
  }

  .two-columns {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-weight: 500;
    color: #111827;
  }

  input,
  select {
    width: 100%;
    border: 1px solid #d1d5db;
    border-radius: 0.75rem;
    padding: 0.85rem 1rem;
    background: #f9fafb;
    color: #111827;
    font-size: 0.95rem;
  }

  input:disabled {
    opacity: 0.7;
    background: #f3f4f6;
  }

  .toggle-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .alert {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 1rem;
    font-size: 0.95rem;
  }

  .alert.error {
    background: #fee2e2;
    color: #b91c1c;
  }

  .alert.success {
    background: #dcfce7;
    color: #166534;
  }

  .actions {
    margin-top: 1.25rem;
    display: flex;
    justify-content: flex-end;
  }

  .primary {
    background: #4338ca;
    color: #ffffff;
    border: none;
    border-radius: 0.9rem;
    padding: 0.95rem 1.35rem;
    font-weight: 600;
    cursor: pointer;
  }

  .primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
</style>
