<script lang="ts">
  // Fields from schema: username, email, password, retypePassword, name, bio, website, location
  let username   = $state('');
  let email      = $state('');
  let password   = $state('');
  let retypePassword = $state('');
  let name       = $state('');  // display name
  let bio        = $state('');
  let website    = $state('');
  let location   = $state('');

  let showPassword = $state(false);
  let error    = $state('');
  let loading  = $state(false);
  let step     = $state(1); // 1 = credentials, 2 = profile

  // Derived validation
  let usernameValid = $derived(username.length >= 3 && username.length <= 30 && /^[a-zA-Z0-9_]+$/.test(username));
  let emailValid    = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  let passwordValid = $derived(password.length >= 6);
  let retypeValid = $derived(password === retypePassword && retypePassword.length >= 6);
  let step1Valid    = $derived(usernameValid && emailValid && passwordValid && retypeValid);

  function goStep2(event: Event) {
    event.preventDefault();
    if (!step1Valid) return;
    error = '';
    step = 2;
  }

  async function register(event: Event) {
    event.preventDefault();
    error = '';
    loading = true;

    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username, email, password, retypePassword, name, bio, website, location }),
    });

    const result = await response.json();
    loading = false;

    if (!response.ok) {
      error = result?.error || 'Unable to create account. Please try again.';
      return;
    }

    window.location.href = result?.redirect || '/';
  }
</script>

<div class="page">
  <div class="card">
    <!-- Left accent strip -->
    <div class="accent-strip">
      <div class="strip-logo">
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="32" height="32" rx="8" fill="white" fill-opacity="0.15"/>
          <path d="M8 10h10M8 16h16M8 22h10" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="24" cy="10" r="3" fill="white" fill-opacity="0.7"/>
        </svg>
        <span class="brand">Nexus</span>
      </div>

      <div class="steps-display">
        <div class="step-item" class:done={step > 1} class:active={step === 1}>
          <div class="step-dot">
            {#if step > 1}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {:else}
              1
            {/if}
          </div>
          <div class="step-text">
            <span class="step-label">Your account</span>
            <span class="step-sub">Username, email & password</span>
          </div>
        </div>
        <div class="step-connector"></div>
        <div class="step-item" class:active={step === 2}>
          <div class="step-dot">{step > 2 ? '✓' : '2'}</div>
          <div class="step-text">
            <span class="step-label">Your profile</span>
            <span class="step-sub">Name, bio & extras</span>
          </div>
        </div>
      </div>

      <div class="strip-tagline">
        <p>Join thousands of conversations happening right now.</p>
      </div>

      <div class="strip-orbs">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
    </div>

    <!-- Right form panel -->
    <div class="form-panel">
      <div class="form-inner">

        {#if step === 1}
          <header class="form-header">
            <h1 class="heading">Create account</h1>
            <p class="subheading">Step 1 of 2 — Account credentials</p>
          </header>

          {#if error}
            <div class="error-banner" role="alert">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
              <span>{error}</span>
            </div>
          {/if}

          <form onsubmit={goStep2} class="auth-form">
            <div class="field">
              <label for="username">
                Username
                {#if username.length > 0}
                  <span class="field-status" class:valid={usernameValid} class:invalid={!usernameValid}>
                    {usernameValid ? '✓' : username.length < 3 ? 'Min 3 chars' : !/^[a-zA-Z0-9_]+$/.test(username) ? 'Letters, numbers & _ only' : 'Max 30 chars'}
                  </span>
                {/if}
              </label>
              <div class="input-wrap">
                <span class="input-prefix">@</span>
                <input
                  id="username"
                  type="text"
                  bind:value={username}
                  placeholder="yourhandle"
                  required
                  minlength="3"
                  maxlength="30"
                  pattern="[a-zA-Z0-9_]+"
                  autocomplete="username"
                  disabled={loading}
                  class:has-prefix={true}
                />
              </div>
            </div>

            <div class="field">
              <label for="email">Email address</label>
              <div class="input-wrap">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                </svg>
                <input
                  id="email"
                  type="email"
                  bind:value={email}
                  placeholder="you@example.com"
                  required
                  autocomplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div class="field">
              <label for="password">
                Password
                {#if password.length > 0}
                  <span class="field-status" class:valid={passwordValid} class:invalid={!passwordValid}>
                    {passwordValid ? '✓ Strong enough' : 'Min 6 characters'}
                  </span>
                {/if}
              </label>
              <div class="input-wrap">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  bind:value={password}
                  placeholder="••••••••"
                  required
                  minlength="6"
                  autocomplete="new-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  class="toggle-pw"
                  onclick={() => showPassword = !showPassword}
                  aria-label={showPassword ? 'Hide' : 'Show'}
                >
                  {#if showPassword}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  {:else}
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  {/if}
                </button>
              </div>
            </div>

            <div class="field">
              <label for="retypePassword">
                Confirm password
                {#if retypePassword.length > 0}
                  <span class="field-status" class:valid={retypeValid} class:invalid={!retypeValid && retypePassword.length > 0}>
                    {retypeValid ? '✓' : 'Passwords do not match'}
                  </span>
                {/if}
              </label>
              <div class="input-wrap">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                <input
                  id="retypePassword"
                  type={showPassword ? 'text' : 'password'}
                  bind:value={retypePassword}
                  placeholder="••••••••"
                  required
                  autocomplete="new-password"
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" class="submit-btn" disabled={!step1Valid || loading}>
              <span>Continue</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </form>

        {:else}
          <header class="form-header">
            <button class="back-btn" onclick={() => { step = 1; error = ''; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back
            </button>
            <h1 class="heading">Your profile</h1>
            <p class="subheading">Step 2 of 2 — Tell us about yourself <span class="optional-tag">Optional</span></p>
          </header>

          {#if error}
            <div class="error-banner" role="alert">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>
              <span>{error}</span>
            </div>
          {/if}

          <form onsubmit={register} class="auth-form">
            <div class="field">
              <label for="name">Display name <span class="label-hint">optional</span></label>
              <div class="input-wrap">
                <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="5"/><path d="M3 21v-1a8 8 0 0 1 16 0v1"/>
                </svg>
                <input id="name" type="text" bind:value={name} placeholder="Your full name" maxlength="100" disabled={loading}/>
              </div>
            </div>

            <div class="field">
              <label for="bio">Bio <span class="label-hint">optional</span></label>
              <textarea
                id="bio"
                bind:value={bio}
                placeholder="Tell the community a little about yourself…"
                rows="3"
                maxlength="300"
                disabled={loading}
              ></textarea>
              <span class="char-count">{bio.length}/300</span>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="website">Website <span class="label-hint">optional</span></label>
                <div class="input-wrap">
                  <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                  </svg>
                  <input id="website" type="url" bind:value={website} placeholder="https://yoursite.com" disabled={loading}/>
                </div>
              </div>

              <div class="field">
                <label for="location">Location <span class="label-hint">optional</span></label>
                <div class="input-wrap">
                  <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <input id="location" type="text" bind:value={location} placeholder="City, Country" maxlength="100" disabled={loading}/>
                </div>
              </div>
            </div>

            <button type="submit" class="submit-btn" disabled={loading}>
              {#if loading}
                <span class="spinner"></span>
                <span>Creating account…</span>
              {:else}
                <span>Create account</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              {/if}
            </button>

            <p class="tos-note">
              By creating an account you agree to our
              <a href="/terms">Terms of Service</a> and
              <a href="/privacy">Privacy Policy</a>.
            </p>
          </form>
        {/if}

        <div class="divider"><span>or</span></div>

        <p class="login-prompt">
          Already have an account?
          <a href="/login" class="login-link">Sign in →</a>
        </p>
      </div>
    </div>
  </div>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

  .page {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface, #f8f8f6);
    padding: 1rem;
    font-family: 'DM Sans', sans-serif;
  }

  .card {
    display: flex;
    width: 100%;
    max-width: 900px;
    min-height: 580px;
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
    border: 1px solid var(--border, #e5e5e0);
  }

  /* ── Accent Strip ── */
  .accent-strip {
    width: 280px;
    flex-shrink: 0;
    background: var(--accent, #4f6ef7);
    padding: 2.5rem 2rem;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
    gap: 0;
  }

  .strip-logo {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    position: relative;
    z-index: 1;
    margin-bottom: 2rem;
  }

  .strip-logo svg { width: 32px; height: 32px; flex-shrink: 0; }

  .brand {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1.5rem;
    color: white;
    letter-spacing: -0.02em;
  }

  /* Steps */
  .steps-display {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .step-item {
    display: flex;
    align-items: flex-start;
    gap: 0.875rem;
    opacity: 0.5;
    transition: opacity 0.2s;
  }

  .step-item.active, .step-item.done { opacity: 1; }

  .step-dot {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    color: white;
    font-size: 0.8rem;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .step-item.active .step-dot { background: white; color: var(--accent, #4f6ef7); }
  .step-item.done .step-dot { background: rgba(255,255,255,0.35); }

  .step-text {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    padding-top: 0.2rem;
  }

  .step-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: white;
  }

  .step-sub {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.65);
  }

  .step-connector {
    width: 1px;
    height: 24px;
    background: rgba(255,255,255,0.25);
    margin: 6px 0 6px 13px;
  }

  .strip-tagline {
    margin-top: auto;
    position: relative;
    z-index: 1;
    padding-top: 2rem;
  }

  .strip-tagline p {
    font-size: 1rem;
    font-weight: 500;
    color: rgba(255,255,255,0.8);
    line-height: 1.5;
    margin: 0;
  }

  .strip-orbs { position: absolute; inset: 0; pointer-events: none; }
  .orb { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.08); }
  .orb-1 { width: 200px; height: 200px; top: -60px; right: -80px; }
  .orb-2 { width: 120px; height: 120px; bottom: 60px; left: -40px; }
  .orb-3 { width: 60px; height: 60px; bottom: 30px; right: 20px; background: rgba(255,255,255,0.12); }

  /* ── Form Panel ── */
  .form-panel {
    flex: 1;
    background: var(--surface, #ffffff);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2.5rem;
    overflow-y: auto;
  }

  .form-inner {
    width: 100%;
    max-width: 400px;
  }

  .form-header { margin-bottom: 1.75rem; }

  .back-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.825rem;
    font-weight: 600;
    color: var(--text-muted, #888);
    padding: 0;
    margin-bottom: 0.75rem;
    font-family: 'DM Sans', sans-serif;
    transition: color 0.15s;
  }

  .back-btn:hover { color: var(--text-primary, #111); }

  .heading {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1.875rem;
    font-weight: 400;
    color: var(--text-primary, #111);
    margin: 0 0 0.2rem;
    letter-spacing: -0.03em;
  }

  .subheading {
    font-size: 0.875rem;
    color: var(--text-muted, #888);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .optional-tag {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    background: color-mix(in srgb, var(--accent, #4f6ef7) 12%, transparent);
    color: var(--accent, #4f6ef7);
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
  }

  /* ── Error ── */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem 1rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 10px;
    color: #b91c1c;
    font-size: 0.875rem;
    margin-bottom: 1.25rem;
  }

  /* ── Form ── */
  .auth-form { display: flex; flex-direction: column; gap: 1rem; }

  .field { display: flex; flex-direction: column; gap: 0.4rem; }

  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }

  label {
    font-size: 0.775rem;
    font-weight: 700;
    color: var(--text-primary, #111);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .label-hint {
    font-size: 0.7rem;
    font-weight: 500;
    color: var(--text-muted, #aaa);
    text-transform: none;
    letter-spacing: 0;
  }

  .field-status {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
    margin-left: auto;
  }

  .field-status.valid { color: #16a34a; }
  .field-status.invalid { color: #dc2626; }

  .input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 0.875rem;
    color: var(--text-muted, #aaa);
    pointer-events: none;
  }

  .input-prefix {
    position: absolute;
    left: 0.875rem;
    color: var(--text-muted, #aaa);
    font-weight: 600;
    font-size: 0.9375rem;
    pointer-events: none;
    z-index: 1;
  }

  input {
    width: 100%;
    padding: 0.7rem 1rem 0.7rem 2.625rem;
    border: 1.5px solid var(--border, #e5e5e0);
    border-radius: 10px;
    background: var(--surface-raised, #fafafa);
    color: var(--text-primary, #111);
    font-size: 0.9375rem;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  input.has-prefix { padding-left: 1.875rem; }
  input::placeholder { color: var(--text-muted, #bbb); }
  input:focus {
    outline: none;
    border-color: var(--accent, #4f6ef7);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #4f6ef7) 15%, transparent);
    background: var(--surface, #fff);
  }
  input:disabled { opacity: 0.55; cursor: not-allowed; }

  textarea {
    width: 100%;
    padding: 0.7rem 1rem;
    border: 1.5px solid var(--border, #e5e5e0);
    border-radius: 10px;
    background: var(--surface-raised, #fafafa);
    color: var(--text-primary, #111);
    font-size: 0.9375rem;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
    resize: vertical;
    min-height: 72px;
  }

  textarea::placeholder { color: var(--text-muted, #bbb); }
  textarea:focus {
    outline: none;
    border-color: var(--accent, #4f6ef7);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #4f6ef7) 15%, transparent);
    background: var(--surface, #fff);
  }
  textarea:disabled { opacity: 0.55; cursor: not-allowed; }

  .char-count {
    font-size: 0.7rem;
    color: var(--text-muted, #aaa);
    text-align: right;
    margin-top: -0.2rem;
  }

  .toggle-pw {
    position: absolute;
    right: 0.875rem;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted, #aaa);
    padding: 0;
    display: flex;
    align-items: center;
    transition: color 0.15s;
  }

  .toggle-pw:hover { color: var(--text-primary, #111); }

  /* ── Submit ── */
  .submit-btn {
    width: 100%;
    margin-top: 0.25rem;
    padding: 0.8125rem 1rem;
    background: var(--accent, #4f6ef7);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 0.9375rem;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background 0.15s, transform 0.15s, box-shadow 0.15s;
  }

  .submit-btn:hover:not(:disabled) {
    background: var(--accent-dark, #3b59e8);
    transform: translateY(-1px);
    box-shadow: 0 6px 20px color-mix(in srgb, var(--accent, #4f6ef7) 35%, transparent);
  }

  .submit-btn:active:not(:disabled) { transform: translateY(0); }
  .submit-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .tos-note {
    text-align: center;
    font-size: 0.775rem;
    color: var(--text-muted, #aaa);
    margin: 0;
    line-height: 1.5;
  }

  .tos-note a { color: var(--accent, #4f6ef7); text-decoration: none; }
  .tos-note a:hover { text-decoration: underline; }

  /* ── Divider ── */
  .divider {
    position: relative;
    text-align: center;
    margin: 1.5rem 0 1.25rem;
  }

  .divider::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 0; right: 0;
    height: 1px;
    background: var(--border, #e5e5e0);
  }

  .divider span {
    position: relative;
    background: var(--surface, #fff);
    padding: 0 0.75rem;
    font-size: 0.8rem;
    color: var(--text-muted, #aaa);
    font-weight: 500;
  }

  .login-prompt {
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-muted, #888);
    margin: 0;
  }

  .login-link {
    color: var(--accent, #4f6ef7);
    text-decoration: none;
    font-weight: 600;
    margin-left: 0.25rem;
  }

  .login-link:hover { text-decoration: underline; }

  /* ── Responsive ── */
  @media (max-width: 700px) {
    .card { flex-direction: column; max-width: 420px; min-height: unset; border-radius: 16px; }
    .accent-strip { width: 100%; min-height: 160px; padding: 1.5rem; }
    .steps-display { flex-direction: row; align-items: center; gap: 0.5rem; }
    .step-connector { width: 24px; height: 1px; margin: 0; }
    .strip-tagline { display: none; }
    .form-panel { padding: 1.75rem 1.5rem; }
    .heading { font-size: 1.5rem; }
    .field-row { grid-template-columns: 1fr; }
  }
</style>