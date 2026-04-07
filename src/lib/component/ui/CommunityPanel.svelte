<script lang="ts">
  import Icon from '@iconify/svelte';
  import { realtime } from '$lib/stores/realtime.js';

  const { community, user } = $props<{
    community: { id: string; name: string; displayName: string; description: string; icon: string; memberCount: number; postCount: number; } | null | undefined;
    user?: { username: string; avatarUrl?: string } | null;
  }>();
</script>

{#if community}
  <aside class="right-panel">

    <!-- About -->
    <div class="widget">
      <p class="widget-label">ABOUT COMMUNITY</p>
      <p class="about-desc">{community.description || 'Welcome to the community!'}</p>

      <div class="stat-grid">
        <div class="stat">
          <strong>{community.memberCount.toLocaleString()}</strong>
          <span>Members</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat">
          <strong>{community.postCount.toLocaleString()}</strong>
          <span>Posts</span>
        </div>
        <div class="stat-sep"></div>
        <div class="stat stat-online">
          <strong>{$realtime.communityOnlineCounts[community.name] || 0}</strong>
          <span><span class="pulse"></span> Online now</span>
        </div>
      </div>

      <div class="meta-line">
        <Icon icon="lucide:calendar" width="13" height="13" />
        <span>Created by <a href="/u/admin" class="link">u/admin</a></span>
      </div>

      {#if user}
        <a href="/submit?community={community.name}" class="cta-btn">+ Create Post</a>
      {:else}
        <a href="/login" class="cta-btn cta-outline">Join Community</a>
      {/if}
    </div>

    <!-- Rules -->
    <div class="widget">
      <p class="widget-label">COMMUNITY RULES</p>
      <ul class="rules-list">
        {#each ['Be respectful and civil', 'No spam or self-promotion', 'Stay on topic', 'Follow site-wide rules', 'Use appropriate flairs'] as rule, i}
          <li class="rule-item">
            <span class="rule-num">{i + 1}</span>
            <span class="rule-text">{rule}</span>
          </li>
        {/each}
      </ul>
    </div>

    <!-- Moderators -->
    <div class="widget">
      <p class="widget-label">MODERATORS</p>
      <div class="mod-row">
        <div class="mod-avatar">👤</div>
        <a href="/u/automod" class="link mod-name">u/automod</a>
      </div>
    </div>

  </aside>
{/if}

<style>
  /* ── Panel shell — mirrors RightPanel exactly ── */
  .right-panel {
    width: 320px;
    flex-shrink: 0;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 16px 12px 16px 8px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;
    transition: scrollbar-color 0.2s;
    border-left: 1px solid var(--border);
    background: var(--surface);
  }
  .right-panel:hover { scrollbar-color: var(--border) transparent; }
  .right-panel::-webkit-scrollbar-thumb { background: transparent; border-radius: 4px; }
  .right-panel:hover::-webkit-scrollbar-thumb { background: var(--border); }

  /* ── Widget card ── */
  .widget {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 14px 16px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .widget-label {
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  /* ── About ── */
  .about-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; }

  .stat-grid  { display: flex; align-items: center; }
  .stat       { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .stat strong { font-size: 1.05rem; font-weight: 800; color: var(--text-primary); }
  .stat span   { font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; display: flex; align-items: center; gap: 6px; }
  .stat-online { color: var(--text-primary); }
  .stat-online span { color: var(--text-muted); }
  .stat-sep    { width: 1px; height: 32px; background: var(--border); flex-shrink: 0; }

  .pulse {
    width: 7px; height: 7px; border-radius: 50%;
    background: #22c55e; flex-shrink: 0;
    animation: pulse 2.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,.25); }
    50%       { box-shadow: 0 0 0 5px rgba(34,197,94,.05); }
  }

  .meta-line {
    display: flex; align-items: center; gap: 6px;
    font-size: 0.8rem; color: var(--text-muted);
  }
  .link { color: var(--accent); text-decoration: none; font-weight: 600; }
  .link:hover { text-decoration: underline; }

  .cta-btn {
    display: block; width: 100%; padding: 0.6rem;
    border-radius: 999px; text-align: center; text-decoration: none;
    font-size: 0.875rem; font-weight: 700;
    background: var(--accent); color: white;
    transition: background 0.13s;
  }
  .cta-btn:hover { background: var(--accent-dark); }
  .cta-outline {
    background: transparent;
    border: 1.5px solid var(--accent);
    color: var(--accent);
  }
  .cta-outline:hover { background: var(--accent-subtle); }

  /* ── Rules ── */
  .rules-list { display: flex; flex-direction: column; gap: 0; list-style: none; }
  .rule-item  {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 9px 0; border-bottom: 1px solid var(--border);
  }
  .rule-item:last-child { border-bottom: none; padding-bottom: 0; }
  .rule-num {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--surface-overlay); border: 1px solid var(--border);
    display: grid; place-items: center;
    font-size: 0.67rem; font-weight: 800; color: var(--text-muted);
    flex-shrink: 0;
  }
  .rule-text { font-size: 0.84rem; color: var(--text-secondary); line-height: 1.5; }

  /* ── Mods ── */
  .mod-row    { display: flex; align-items: center; gap: 10px; }
  .mod-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: var(--surface-overlay); border: 1px solid var(--border);
    display: grid; place-items: center; font-size: 0.95rem; flex-shrink: 0;
  }
  .mod-name { font-size: 0.875rem; }
</style>