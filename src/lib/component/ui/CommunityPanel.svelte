<script lang="ts">
  import Icon from '@iconify/svelte';

  const { community, user } = $props<{
    community: { id: string; name: string; displayName: string; description: string; icon: string; memberCount: number; postCount: number; } | null | undefined;
    user?: { username: string; avatarUrl?: string } | null;
  }>();
</script>

{#if community}
  <aside class="panel">
    <div class="card">
      <div class="card-header">ABOUT COMMUNITY</div>
      <div class="card-body">
        <p class="desc">{community.description || 'Welcome to the community!'}</p>

        <div class="stats-row">
          <div class="stat">
            <strong>{community.memberCount.toLocaleString()}</strong>
            <span>Members</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat">
            <strong>{community.postCount.toLocaleString()}</strong>
            <span>Posts</span>
          </div>
        </div>

        <div class="active-row">
          <span class="pulse-dot"></span>
          <span>Community is active</span>
        </div>

        <div class="divider"></div>

        <div class="meta-row">
          <Icon icon="lucide:calendar" width="13" height="13" />
          <span>Created by <a href="/u/admin" class="link">u/admin</a></span>
        </div>

        {#if user}
          <a href="/submit?community={community.name}" class="cta-btn">+ Create Post</a>
        {:else}
          <a href="/login" class="cta-btn cta-secondary">Join Community</a>
        {/if}
      </div>
    </div>

    <div class="card">
      <div class="card-header">COMMUNITY RULES</div>
      <div class="card-body rules-body">
        {#each ['Be respectful and civil', 'No spam or self-promotion', 'Stay on topic', 'Follow site-wide rules', 'Use appropriate flairs'] as rule, i}
          <div class="rule-row">
            <span class="rule-num">{i + 1}</span>
            <span class="rule-text">{rule}</span>
          </div>
        {/each}
      </div>
    </div>

    <div class="card">
      <div class="card-header">MODERATORS</div>
      <div class="card-body">
        <div class="mod-row">
          <div class="mod-avatar">👤</div>
          <a href="/u/automod" class="link">u/automod</a>
        </div>
      </div>
    </div>
  </aside>
{/if}

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    position: sticky;
    top: 80px;
    align-self: start;
    max-height: calc(100vh - 80px);
    overflow-y: auto;
    padding-top: 1.25rem;
    padding-bottom: 1.25rem;
  }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .card-header { padding: 0.65rem 1rem; border-bottom: 1px solid var(--border); background: var(--surface-raised); font-size: 0.72rem; font-weight: 700; letter-spacing: 0.07em; color: var(--text-muted); }
  .card-body { padding: 1rem; }
  .desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0 0 1rem; }
  .stats-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
  .stat { display: flex; flex-direction: column; gap: 0.1rem; }
  .stat strong { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
  .stat span { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
  .stat-divider { width: 1px; height: 2rem; background: var(--border); flex-shrink: 0; }
  .active-row { display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; color: #16a34a; font-weight: 500; margin-bottom: 0.875rem; }
  .pulse-dot { width: 7px; height: 7px; border-radius: 50%; background: #22c55e; flex-shrink: 0; animation: pulse 2.5s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25); } 50% { box-shadow: 0 0 0 4px rgba(34,197,94,0.05); } }
  .divider { height: 1px; background: var(--border); margin: 0 0 0.875rem; }
  .meta-row { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.875rem; }
  .link { color: var(--accent); text-decoration: none; font-weight: 600; font-size: 0.85rem; }
  .link:hover { text-decoration: underline; }
  .cta-btn { display: block; width: 100%; padding: 0.65rem; border-radius: 9999px; background: var(--accent); color: white; font-weight: 700; font-size: 0.875rem; text-align: center; text-decoration: none; transition: opacity 0.15s; }
  .cta-btn:hover { opacity: 0.87; }
  .cta-secondary { background: transparent; border: 1.5px solid var(--accent); color: var(--accent); }
  .cta-secondary:hover { background: var(--accent-subtle); opacity: 1; }
  .rules-body { display: flex; flex-direction: column; }
  .rule-row { display: flex; align-items: flex-start; gap: 0.7rem; padding: 0.55rem 0; border-bottom: 1px solid var(--border); }
  .rule-row:last-child { border-bottom: none; padding-bottom: 0; }
  .rule-num { width: 20px; height: 20px; border-radius: 50%; background: var(--surface-raised); border: 1px solid var(--border); display: grid; place-items: center; font-size: 0.68rem; font-weight: 800; color: var(--text-muted); flex-shrink: 0; }
  .rule-text { font-size: 0.83rem; color: var(--text-secondary); line-height: 1.5; }
  .mod-row { display: flex; align-items: center; gap: 0.6rem; }
  .mod-avatar { width: 28px; height: 28px; border-radius: 50%; background: var(--surface-raised); border: 1px solid var(--border); display: grid; place-items: center; font-size: 0.9rem; flex-shrink: 0; }
</style>