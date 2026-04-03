<script lang="ts">
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);
  let showPassword = $state(false);

  async function signIn(event: Event) {
    event.preventDefault();
    error = '';
    loading = true;

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    loading = false;

    if (!response.ok) {
      error = result?.error || 'Unable to sign in. Please check your credentials.';
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
      <div class="strip-tagline">
        <p>The best conversations<br/>on the internet.</p>
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
        <header class="form-header">
          <h1 class="heading">Welcome back</h1>
          <p class="subheading">Sign in to continue to Nexus</p>
        </header>

        {#if error}
          <div class="error-banner" role="alert">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        {/if}

        <form onsubmit={signIn} class="auth-form">
          <div class="field">
            <label for="email">Email address</label>
            <div class="input-wrap">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="20" height="16" x="2" y="4" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
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
            <div class="label-row">
              <label for="password">Password</label>
              <a href="/forgot-password" class="forgot-link">Forgot?</a>
            </div>
            <div class="input-wrap">
              <svg class="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                bind:value={password}
                placeholder="••••••••"
                required
                autocomplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                class="toggle-pw"
                onclick={() => showPassword = !showPassword}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {#if showPassword}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                {:else}
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                {/if}
              </button>
            </div>
          </div>

          <button type="submit" class="submit-btn" disabled={loading}>
            {#if loading}
              <span class="spinner"></span>
              <span>Signing in…</span>
            {:else}
              <span>Sign in</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            {/if}
          </button>
        </form>

        <div class="divider"><span>or</span></div>

        <p class="register-prompt">
          New to Nexus?
          <a href="/register" class="register-link">Create an account →</a>
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
    max-width: 860px;
    min-height: 520px;
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
  }

  .strip-logo {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    position: relative;
    z-index: 1;
  }

  .strip-logo svg {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
  }

  .brand {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 1.5rem;
    color: white;
    letter-spacing: -0.02em;
  }

  .strip-tagline {
    margin-top: auto;
    position: relative;
    z-index: 1;
  }

  .strip-tagline p {
    font-size: 1.125rem;
    font-weight: 500;
    color: rgba(255,255,255,0.85);
    line-height: 1.5;
    margin: 0;
  }

  .strip-orbs {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .orb {
    position: absolute;
    border-radius: 50%;
    background: rgba(255,255,255,0.1);
  }

  .orb-1 { width: 200px; height: 200px; top: -60px; right: -80px; }
  .orb-2 { width: 120px; height: 120px; bottom: 60px; left: -40px; background: rgba(255,255,255,0.07); }
  .orb-3 { width: 60px; height: 60px; bottom: 30px; right: 20px; background: rgba(255,255,255,0.12); }

  /* ── Form Panel ── */
  .form-panel {
    flex: 1;
    background: var(--surface, #ffffff);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2.5rem;
  }

  .form-inner {
    width: 100%;
    max-width: 360px;
  }

  .form-header {
    margin-bottom: 2rem;
  }

  .heading {
    font-family: 'DM Serif Display', Georgia, serif;
    font-size: 2rem;
    font-weight: 400;
    color: var(--text-primary, #111);
    margin: 0 0 0.25rem;
    letter-spacing: -0.03em;
  }

  .subheading {
    font-size: 0.9rem;
    color: var(--text-muted, #888);
    margin: 0;
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
  .auth-form {
    display: flex;
    flex-direction: column;
    gap: 1.125rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-primary, #111);
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .forgot-link {
    font-size: 0.8rem;
    color: var(--accent, #4f6ef7);
    text-decoration: none;
    font-weight: 500;
  }

  .forgot-link:hover { text-decoration: underline; }

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
    flex-shrink: 0;
  }

  input {
    width: 100%;
    padding: 0.75rem 1rem 0.75rem 2.625rem;
    border: 1.5px solid var(--border, #e5e5e0);
    border-radius: 10px;
    background: var(--surface-raised, #fafafa);
    color: var(--text-primary, #111);
    font-size: 0.9375rem;
    font-family: 'DM Sans', sans-serif;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }

  input::placeholder { color: var(--text-muted, #bbb); }

  input:focus {
    outline: none;
    border-color: var(--accent, #4f6ef7);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent, #4f6ef7) 15%, transparent);
    background: var(--surface, #fff);
  }

  input:disabled { opacity: 0.55; cursor: not-allowed; }

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
    margin-top: 0.375rem;
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
  .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Divider & footer ── */
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

  .register-prompt {
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-muted, #888);
    margin: 0;
  }

  .register-link {
    color: var(--accent, #4f6ef7);
    text-decoration: none;
    font-weight: 600;
    margin-left: 0.25rem;
  }

  .register-link:hover { text-decoration: underline; }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .card { flex-direction: column; max-width: 400px; min-height: unset; border-radius: 16px; }
    .accent-strip { width: 100%; min-height: 140px; padding: 1.5rem; }
    .strip-tagline { margin-top: 1rem; }
    .form-panel { padding: 1.75rem 1.5rem; }
    .heading { font-size: 1.625rem; }
  }
</style>