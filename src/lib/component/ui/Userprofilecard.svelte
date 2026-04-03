<script lang="ts">
  const { user } = $props<{
    user: { username: string; avatarUrl?: string } | null;
  }>();
</script>

<div class="sidebar-card user-card">
  <div class="sidebar-card-header">
    <span class="sidebar-card-label">My Profile</span>
  </div>
  <div class="sidebar-card-body">
    <div class="user-card-inner">
      <div class="user-card-avatar">
        {user?.username?.charAt(0).toUpperCase() ?? '?'}
      </div>
      <div>
        <p class="user-card-name">u/{user?.username}</p>
        <p class="user-card-sub">Nexus member</p>
      </div>
    </div>
    <a href="/submit" class="cta-btn primary" style="margin-top: 0.75rem; display:block; text-align:center;">
      Create Post
    </a>
    <a href="/submit?type=community" class="cta-btn outlined" style="margin-top: 0.5rem; display:block; text-align:center;">
      Create Community
    </a>
  </div>
</div>

<style>
  .sidebar-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    overflow: hidden;
  }

  .sidebar-card-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface-raised);
  }

  .sidebar-card-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .sidebar-card-body {
    padding: 1rem;
  }

  .user-card-inner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.875rem;
  }

  .user-card-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    display: grid;
    place-items: center;
    font-size: 1.1rem;
    font-weight: 700;
    flex-shrink: 0;
  }

  .user-card-name {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 0.1rem;
  }

  .user-card-sub {
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0;
  }

  .cta-btn {
    display: block;
    padding: 0.625rem;
    border-radius: 9999px;
    font-size: 0.875rem;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    transition: opacity 0.15s;
    cursor: pointer;
    border: none;
    font-family: inherit;
  }

  .cta-btn.primary {
    background: var(--accent);
    color: white;
  }

  .cta-btn.outlined {
    background: transparent;
    border: 1.5px solid var(--border);
    color: var(--text-primary);
  }

  .cta-btn:hover {
    opacity: 0.85;
  }
</style>