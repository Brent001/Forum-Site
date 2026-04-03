<script lang="ts">
  type SortOption = 'hot' | 'new' | 'top' | 'rising' | 'best';

  const steps = ['Platform message', 'Admin account', 'Community settings', 'Review & launch'];
  let step = $state(0);
  let loading = $state(false);
  let error = $state('');
  let success = $state(false);

  let tagline = $state('The best conversations on the internet.');

  let adminUsername = $state('');
  let adminName = $state('');
  let adminEmail = $state('');
  let adminPassword = $state('');
  let confirmPassword = $state('');

  let allowPublicRegistration = $state(true);
  let requireEmailVerification = $state(false);
  let enableNsfwCommunities = $state(true);
  let enableRealTimeFeed = $state(true);
  let defaultSortAlgorithm: SortOption = $state('hot');
  let postsPerHourLimit = $state(10);

  function canContinue() {
    if (step === 0) {
      return tagline.trim().length > 0;
    }

    if (step === 1) {
      return (
        adminUsername.trim().length >= 3 &&
        adminEmail.includes('@') &&
        adminPassword.length >= 8 &&
        adminPassword === confirmPassword
      );
    }

    return true;
  }

  function nextStep() {
    if (!canContinue()) return;
    if (step < steps.length - 1) {
      step += 1;
      error = '';
    } else {
      submitSetup();
    }
  }

  function previousStep() {
    if (step > 0) {
      step -= 1;
      error = '';
    }
  }

  async function submitSetup() {
    loading = true;
    error = '';

    try {
      const response = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagline,
          allowPublicRegistration,
          requireEmailVerification,
          enableNsfwCommunities,
          enableRealTimeFeed,
          defaultSortAlgorithm,
          postsPerHourLimit,
          adminUsername,
          adminName: adminName || adminUsername,
          adminEmail,
          adminPassword,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        error = result?.error || 'Could not complete setup.';
        return;
      }

      success = true;
      setTimeout(() => {
        window.location.href = '/';
      }, 1200);
    } catch (err) {
      error = 'Unable to reach the setup server. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Setup Nexus Community</title>
</svelte:head>

<div class="setup-shell">
  <div class="setup-panel">
    <div class="setup-header">
      <div>
        <p class="eyebrow">First-run setup</p>
        <h1>Launch your forum</h1>
        <p class="subtitle">Configure your community, create the first admin, and start the platform with the same look and feel as Nexus Home.</p>
      </div>
      <div class="progress-pill">Step {step + 1} of {steps.length}</div>
    </div>

    <div class="progress-bar">
      <div class="progress-fill" style="width: {(100 / (steps.length - 1)) * step}%"></div>
    </div>

    <section class="wizard-card">
      <h2>{steps[step]}</h2>
      {#if step === 0}
        <p class="section-copy">Set a welcoming message for your forum and launch with a simple, polished onboarding flow.</p>
        <div class="field-grid">
          <label>
            Tagline
            <input type="text" bind:value={tagline} placeholder="The best conversations on the internet." />
          </label>
        </div>
      {:else if step === 1}
        <p class="section-copy">Create the platform administrator account for the first login.</p>
        <div class="field-grid">
          <label>
            Admin username
            <input type="text" bind:value={adminUsername} placeholder="admin" />
          </label>
          <label>
            Display name
            <input type="text" bind:value={adminName} placeholder="Admin User" />
          </label>
          <label>
            Email address
            <input type="email" bind:value={adminEmail} placeholder="admin@example.com" />
          </label>
          <label>
            Password
            <input type="password" bind:value={adminPassword} placeholder="Minimum 8 characters" />
          </label>
          <label>
            Confirm password
            <input type="password" bind:value={confirmPassword} placeholder="Repeat password" />
          </label>
        </div>
      {:else if step === 2}
        <p class="section-copy">Choose the default community behavior and membership settings.</p>
        <div class="setting-list">
          <label class="setting-row">
            <span>Allow public registration</span>
            <input type="checkbox" bind:checked={allowPublicRegistration} />
          </label>
          <label class="setting-row">
            <span>Require email verification</span>
            <input type="checkbox" bind:checked={requireEmailVerification} />
          </label>
          <label class="setting-row">
            <span>Enable NSFW communities</span>
            <input type="checkbox" bind:checked={enableNsfwCommunities} />
          </label>
          <label class="setting-row">
            <span>Enable real-time feed</span>
            <input type="checkbox" bind:checked={enableRealTimeFeed} />
          </label>
          <label>
            Default feed sort
            <select bind:value={defaultSortAlgorithm}>
              <option value="hot">Hot</option>
              <option value="new">New</option>
              <option value="top">Top</option>
              <option value="rising">Rising</option>
              <option value="best">Best</option>
            </select>
          </label>
          <label>
            Posts per hour limit
            <input type="number" bind:value={postsPerHourLimit} min="1" />
          </label>
        </div>
      {:else}
        <p class="section-copy">Review your configuration before launching the site.</p>
        <div class="review-grid">
          <div class="review-card">
            <strong>Community</strong>
            <p>{tagline}</p>
          </div>
          <div class="review-card">
            <strong>Admin account</strong>
            <p>{adminUsername}</p>
            <p>{adminEmail}</p>
          </div>
          <div class="review-card">
            <strong>Platform defaults</strong>
            <p>Public registration: {allowPublicRegistration ? 'Yes' : 'No'}</p>
            <p>Email verification: {requireEmailVerification ? 'Yes' : 'No'}</p>
            <p>Real-time feed: {enableRealTimeFeed ? 'Yes' : 'No'}</p>
            <p>Default sort: {defaultSortAlgorithm}</p>
            <p>Max posts / hour: {postsPerHourLimit}</p>
          </div>
        </div>
      {/if}

      {#if error}
        <div class="alert error">{error}</div>
      {/if}
      {#if success}
        <div class="alert success">Setup complete! Redirecting to home…</div>
      {/if}

      <div class="wizard-actions">
        <button class="secondary" onclick={previousStep} disabled={step === 0 || loading}>Back</button>
        <button class="primary" onclick={nextStep} disabled={loading || !canContinue()}>
          {#if step === steps.length - 1}
            Launch platform
          {:else}
            Continue
          {/if}
        </button>
      </div>
    </section>
  </div>
</div>

<style>
  .setup-shell {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem 1rem;
    background: linear-gradient(180deg, #f8fbff 0%, #ffffff 100%);
  }

  .setup-panel {
    width: min(980px, 100%);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .setup-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: flex-start;
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 0.75rem;
    color: #6366f1;
    margin-bottom: 0.5rem;
  }

  h1 {
    font-size: clamp(2rem, 2.4vw, 2.8rem);
    margin: 0;
    line-height: 1.05;
    color: #111827;
  }

  .subtitle {
    max-width: 720px;
    margin-top: 0.75rem;
    color: #4b5563;
    line-height: 1.6;
  }

  .progress-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.75rem 1rem;
    background: rgba(79, 110, 247, 0.1);
    color: #4338ca;
    border-radius: 999px;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .progress-bar {
    height: 10px;
    background: #e5e7eb;
    border-radius: 999px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #4f6ef7;
    border-radius: 999px;
    transition: width 0.25s ease;
  }

  .wizard-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 28px;
    padding: 2rem;
    box-shadow: 0 32px 80px rgba(15, 23, 42, 0.08);
  }

  .wizard-card h2 {
    margin: 0 0 0.75rem;
    font-size: 1.5rem;
    color: #111827;
  }

  .section-copy {
    margin: 0 0 1.5rem;
    color: #6b7280;
    line-height: 1.7;
  }

  .field-grid {
    display: grid;
    gap: 1rem;
  }

  label {
    display: grid;
    gap: 0.55rem;
    font-size: 0.95rem;
    color: #374151;
  }

  input[type='text'],
  input[type='email'],
  input[type='password'],
  input[type='number'],
  select {
    width: 100%;
    min-height: 46px;
    border-radius: 16px;
    border: 1px solid #d1d5db;
    padding: 0.9rem 1rem;
    font-size: 0.95rem;
    color: #111827;
    background: #f9fafb;
  }


  .setting-list {
    display: grid;
    gap: 1rem;
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.15rem;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    color: #111827;
  }

  .review-grid {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .review-card {
    padding: 1.15rem 1.25rem;
    border: 1px solid #e5e7eb;
    border-radius: 18px;
    background: #f8fafc;
  }

  .review-card strong {
    display: block;
    margin-bottom: 0.8rem;
    color: #111827;
  }

  .alert {
    margin-top: 1.25rem;
    padding: 1rem 1.25rem;
    border-radius: 16px;
    font-weight: 600;
  }

  .alert.error {
    background: #fee2e2;
    color: #991b1b;
  }

  .alert.success {
    background: #ecfdf5;
    color: #065f46;
  }

  .wizard-actions {
    margin-top: 1.8rem;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.85rem;
  }

  .primary,
  .secondary {
    min-width: 140px;
    border: none;
    border-radius: 14px;
    padding: 0.95rem 1.2rem;
    font-weight: 700;
    cursor: pointer;
  }

  .primary {
    background: #4f6ef7;
    color: white;
  }

  .secondary {
    background: #f8fafc;
    color: #374151;
  }

  .primary:disabled,
  .secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 860px) {
    .review-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
