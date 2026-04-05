<script lang="ts">
  import Icon from '@iconify/svelte';
  import PostCard from '$lib/component/ui/PostCard.svelte';

  const { data = {} } = $props<{
    data?: {
      user?: { username: string; avatarUrl?: string } | null;
      community?: {
        id: string;
        name: string;
        displayName: string;
        description: string;
        icon: string;
        memberCount: number;
        postCount: number;
        banner?: string;
        rules?: string[];
      } | null;
      posts?: Array<{
        id: string;
        title: string;
        body: string;
        community: { name: string; displayName: string; icon: string };
        author: { username: string; avatarUrl: string };
        upvotes: number;
        downvotes: number;
        score: number;
        commentCount: number;
        createdAt: string | Date;
        isNsfw: boolean;
        isSpoiler: boolean;
        flair: string;
        flairColor: string;
        userVote: -1 | 0 | 1;
        isBookmarked: boolean;
      }>;
      joined?: boolean;
      membershipRole?: 'owner' | 'moderator' | 'member' | null;
    };
  }>();

  let activeSort = $state<'hot' | 'new' | 'top' | 'rising'>('hot');
  let joined = $state(data.joined ?? false);
  let membershipRole = $state<'owner' | 'moderator' | 'member' | null>(data.membershipRole ?? null);

  const sortOptions = [
    { key: 'hot',    label: 'Hot',    icon: 'lucide:flame' },
    { key: 'new',    label: 'New',    icon: 'lucide:sparkles' },
    { key: 'top',    label: 'Top',    icon: 'lucide:trending-up' },
    { key: 'rising', label: 'Rising', icon: 'lucide:rocket' },
  ] as const;

  const displayPosts = $derived(
    activeSort === 'new'
      ? [...(data.posts ?? [])].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      : activeSort === 'top'
      ? [...(data.posts ?? [])].sort((a, b) => b.score - a.score)
      : (data.posts ?? [])
  );

  const rules = data.community?.rules?.length
    ? data.community.rules
    : ['Be respectful and civil', 'No spam or self-promotion', 'Stay on topic', 'Follow site-wide rules', 'Use appropriate flairs'];
</script>

<svelte:head>
  <title>{data.community ? `c/${data.community.name} — Nexus` : 'Community not found'}</title>
</svelte:head>

{#if data.community}

  <!-- ══════════════════════════════════════════
       FULL-WIDTH HERO: Banner + Sticky Header
       Breaks out of .app-main padding
  ═══════════════════════════════════════════ -->
  <div class="community-hero">

    <!-- Banner -->
    <div class="banner">
      {#if data.community.banner}
        <img src={data.community.banner} alt="Community banner" class="banner-img" />
      {:else}
        <div class="banner-gradient"></div>
      {/if}
    </div>

    <!-- Sticky identity + actions bar -->
    <div class="community-header">
      <div class="header-inner">

        <div class="identity">
          <div class="avatar-wrap">
            <div class="avatar">{data.community.icon}</div>
          </div>
          <div class="identity-text">
            <div class="name-row">
              <h1 class="display-name">{data.community.displayName}</h1>
              {#if membershipRole}
                <span class="role-badge role-{membershipRole}">
                  {#if membershipRole === 'owner'}
                    <Icon icon="lucide:crown" width="12" height="12" /> Owner
                  {:else if membershipRole === 'moderator'}
                    <Icon icon="lucide:shield" width="12" height="12" /> Mod
                  {:else}
                    <Icon icon="lucide:check" width="12" height="12" /> Member
                  {/if}
                </span>
              {/if}
            </div>
            <span class="handle">c/{data.community.name}</span>
          </div>
        </div>

        <div class="actions">
          {#if membershipRole === 'owner' || membershipRole === 'moderator'}
            <a href="/c/{data.community.name}/settings" class="btn btn-ghost">
              <Icon icon="lucide:settings" width="13" height="13" /> Settings
            </a>
          {/if}

          {#if data.user}
            <a href="/c/{data.community.name}/submit" class="btn btn-ghost">
              <Icon icon="lucide:pen-square" width="13" height="13" /> Create Post
            </a>
            <form method="POST" action="?/join" style="display:contents">
              <button
                class="btn {joined ? 'btn-joined' : 'btn-primary'}"
                type="submit"
              >
                {#if joined}
                  <Icon icon="lucide:check" width="14" height="14" /> Joined
                {:else}
                  Join
                {/if}
              </button>
            </form>
            {#if joined}
              <form method="POST" action="?/leave" style="display:contents">
                <button class="btn btn-ghost" type="submit">Leave</button>
              </form>
            {/if}
          {:else}
            <a href="/login" class="btn btn-primary">Join</a>
          {/if}
        </div>

      </div>
    </div>

    <!-- About bar: description + quick stats, full-width below header -->
    <div class="about-bar">
      <div class="about-bar-inner">
        {#if data.community.description}
          <p class="about-desc">{data.community.description}</p>
          <span class="about-sep"></span>
        {/if}
        <div class="about-stats">
          <div class="about-stat">
            <strong>{data.community.memberCount.toLocaleString()}</strong>
            <span>Members</span>
          </div>
          <div class="stat-divider"></div>
          <div class="about-stat">
            <strong>{data.community.postCount.toLocaleString()}</strong>
            <span>Posts</span>
          </div>
          <div class="stat-divider"></div>
          <div class="about-stat active-stat">
            <span class="pulse-dot"></span>
            <span>Community is active</span>
          </div>
        </div>
      </div>
    </div>

  </div><!-- /community-hero -->

  <!-- ══════════════════════════════════════════
       MAIN CONTENT: Feed (left) + Sidebar (right)
  ═══════════════════════════════════════════ -->
  <div class="page-body">

    <!-- Feed column -->
    <div class="feed-col">

      <!-- Sort Bar -->
      <div class="sort-bar">
        <span class="view-label">View</span>
        {#each sortOptions as opt}
          <button
            class="sort-btn {activeSort === opt.key ? 'active' : ''}"
            onclick={() => (activeSort = opt.key)}
          >
            <Icon icon={opt.icon} width="14" height="14" /> {opt.label}
          </button>
        {/each}
      </div>

      <!-- Posts -->
      {#if displayPosts.length}
        <div class="posts-list">
          {#each displayPosts as post}
            <div class="post-card">
              <PostCard {post} postUrl={`/c/${data.community.name}/p/${post.id}`} />
            </div>
          {/each}
        </div>
      {:else}
        <div class="empty">
          <div class="empty-icon"><Icon icon="lucide:inbox" width="40" height="40" /></div>
          <h3>No posts yet</h3>
          <p>Be the first to post in c/{data.community.name}</p>
          {#if data.user}
            <a href="/submit?community={data.community.name}" class="btn btn-primary">Create post</a>
          {/if}
        </div>
      {/if}

    </div><!-- /feed-col -->

    <!-- Sidebar column -->
    <aside class="sidebar-col">

      <!-- About card -->
      <div class="s-card">
        <div class="s-card-head">About Community</div>
        <div class="s-card-body">
          <p class="s-desc">{data.community.description || 'Welcome to the community!'}</p>

          <div class="s-stats">
            <div class="s-stat">
              <strong>{data.community.memberCount.toLocaleString()}</strong>
              <span>Members</span>
            </div>
            <div class="s-stat-div"></div>
            <div class="s-stat">
              <strong>{data.community.postCount.toLocaleString()}</strong>
              <span>Posts</span>
            </div>
          </div>

          <div class="s-active">
            <span class="pulse-dot"></span>
            Community is active
          </div>

          <div class="s-divider"></div>

          <div class="s-meta">
            <Icon icon="lucide:calendar" width="13" height="13" />
            Created by <a href="/u/admin" class="s-link">u/admin</a>
          </div>

          {#if data.user}
            <a href="/c/{data.community.name}/submit" class="s-cta">+ Create Post</a>
          {:else}
            <a href="/login" class="s-cta s-cta-outline">Join Community</a>
          {/if}
        </div>
      </div>

      <!-- Rules card -->
      <div class="s-card">
        <div class="s-card-head">Community Rules</div>
        <div class="s-rules">
          {#each rules as rule, i}
            <div class="s-rule">
              <span class="s-rule-num">{i + 1}</span>
              <span class="s-rule-text">{rule}</span>
            </div>
          {/each}
        </div>
      </div>

      <!-- Moderators card -->
      <div class="s-card">
        <div class="s-card-head">Moderators</div>
        <div class="s-card-body">
          <div class="s-mod">
            <div class="s-mod-avatar">👤</div>
            <a href="/u/automod" class="s-link">u/automod</a>
          </div>
        </div>
      </div>

    </aside><!-- /sidebar-col -->

  </div><!-- /page-body -->

{:else}
  <div class="not-found">
    <Icon icon="lucide:ghost" width="56" height="56" />
    <h2>Community not found</h2>
    <p>This community doesn't exist or may have been removed.</p>
    <a href="/communities" class="btn btn-primary">Browse communities</a>
  </div>
{/if}

<style>
  /* ─── Hero: full-width bleed out of .app-main padding ─── */
  .community-hero {
    margin: -1.25rem -1.5rem 0;
  }
  @media (max-width: 768px) {
    .community-hero { margin: -1rem -1rem 0; }
  }

  /* Banner */
  .banner {
    height: 180px;
    overflow: hidden;
    background: var(--surface-overlay);
  }
  .banner-img { width: 100%; height: 100%; object-fit: cover; }
  .banner-gradient {
    width: 100%; height: 100%;
    background: linear-gradient(135deg, #3b4fd4 0%, #1e3a8a 100%);
    opacity: 0.85;
  }
  @media (max-width: 768px) { .banner { height: 120px; } }

  /* Sticky identity + actions */
  .community-header {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 60px;
    z-index: 40;
    padding: 0 1.5rem;
  }
  @media (max-width: 768px) { .community-header { padding: 0 1rem; } }

  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0;
    flex-wrap: wrap;
  }

  .identity { display: flex; align-items: center; gap: 0.875rem; }

  .avatar-wrap {
    margin-top: -1.75rem;
    flex-shrink: 0;
  }

  .avatar {
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--surface);
    border: 3px solid var(--surface);
    display: grid; place-items: center;
    font-size: 2rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.18);
  }

  .identity-text { display: flex; flex-direction: column; gap: 0.1rem; }

  .name-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .display-name { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); margin: 0; line-height: 1.2; }
  .handle { font-size: 0.8rem; color: var(--text-muted); }

  .role-badge {
    display: inline-flex; align-items: center; gap: 0.2rem;
    padding: 0.15rem 0.55rem; border-radius: 9999px;
    font-size: 0.72rem; font-weight: 700;
  }
  .role-owner     { background: #fef3c7; color: #92400e; }
  .role-moderator { background: var(--accent-subtle); color: var(--accent); }
  .role-member    { background: #dcfce7; color: #166534; }

  .actions { display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0; }

  /* About bar */
  .about-bar {
    background: var(--surface-raised);
    border-bottom: 1px solid var(--border);
    padding: 0 1.5rem;
  }
  @media (max-width: 768px) { .about-bar { padding: 0 1rem; } }

  .about-bar-inner {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.6rem 0;
    flex-wrap: wrap;
  }

  .about-desc {
    margin: 0;
    font-size: 0.825rem;
    color: var(--text-secondary);
    line-height: 1.4;
    flex: 1;
    min-width: 160px;
  }

  .about-sep {
    width: 1px; height: 20px;
    background: var(--border);
    flex-shrink: 0;
  }

  .about-stats { display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0; }

  .about-stat { display: flex; align-items: center; gap: 0.3rem; }
  .about-stat strong { font-size: 0.9rem; font-weight: 800; color: var(--text-primary); }
  .about-stat span  { font-size: 0.76rem; color: var(--text-muted); }

  .stat-divider { width: 1px; height: 14px; background: var(--border); flex-shrink: 0; }

  .active-stat { color: #16a34a; font-size: 0.76rem; font-weight: 500; gap: 0.4rem; }
  .active-stat span { color: #16a34a; }

  .pulse-dot {
    width: 7px; height: 7px;
    border-radius: 50%; background: #22c55e;
    flex-shrink: 0;
    animation: pulse 2.5s ease-in-out infinite;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 2px rgba(34,197,94,0.25); }
    50%       { box-shadow: 0 0 0 4px rgba(34,197,94,0.05); }
  }

  /* ─── Page body: feed + sidebar ─── */
  .page-body {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1.25rem;
    padding-top: 1.25rem;
    align-items: start;
  }
  @media (max-width: 1024px) {
    .page-body { grid-template-columns: 1fr; }
    .sidebar-col { display: none; } /* hidden on mobile — about bar covers it */
  }

  /* ─── Buttons ─── */
  .btn {
    display: inline-flex; align-items: center; gap: 0.35rem;
    padding: 0.45rem 1rem; border-radius: 9999px;
    font-size: 0.85rem; font-weight: 700;
    cursor: pointer; border: none;
    font-family: inherit; text-decoration: none;
    transition: all 0.15s; white-space: nowrap;
  }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover { opacity: 0.88; }
  .btn-joined {
    background: var(--surface-overlay); color: var(--text-secondary);
    border: 1.5px solid var(--border);
  }
  .btn-joined:hover { border-color: #ef4444; color: #ef4444; }
  .btn-ghost {
    background: var(--surface-raised); color: var(--text-secondary);
    border: 1.5px solid var(--border);
  }
  .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

  /* ─── Feed column ─── */
  .feed-col { display: flex; flex-direction: column; gap: 0.75rem; min-width: 0; }

  .sort-bar {
    display: flex; align-items: center; gap: 0.25rem;
    padding: 0.4rem 0.6rem;
    background: var(--surface); border: 1px solid var(--border); border-radius: 10px;
  }
  .view-label {
    font-size: 0.72rem; font-weight: 700; color: var(--text-muted);
    text-transform: uppercase; letter-spacing: 0.06em;
    padding: 0 0.4rem; white-space: nowrap;
  }
  .sort-btn {
    display: inline-flex; align-items: center; gap: 0.3rem;
    padding: 0.4rem 0.8rem; border-radius: 7px;
    font-size: 0.83rem; font-weight: 600;
    border: none; background: transparent; color: var(--text-muted);
    cursor: pointer; font-family: inherit; transition: all 0.15s;
  }
  .sort-btn:hover { background: var(--surface-raised); color: var(--text-primary); }
  .sort-btn.active { background: var(--accent); color: white; }

  .posts-list { display: flex; flex-direction: column; gap: 0.5rem; }
  .post-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; overflow: hidden; transition: border-color 0.15s;
  }
  .post-card:hover { border-color: var(--border-hover); }

  .empty {
    display: flex; flex-direction: column; align-items: center;
    padding: 4rem 2rem; background: var(--surface);
    border: 1px solid var(--border); border-radius: 12px;
    text-align: center; gap: 0.5rem;
  }
  .empty-icon { color: var(--text-muted); opacity: 0.5; margin-bottom: 0.5rem; }
  .empty h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text-primary); }
  .empty p { margin: 0 0 1rem; color: var(--text-muted); font-size: 0.875rem; }

  /* ─── Sidebar column ─── */
  .sidebar-col {
    display: flex; flex-direction: column; gap: 0.75rem;
    position: sticky;
    top: calc(60px + 53px + 45px); /* topbar + community-header + about-bar */
  }

  .s-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; overflow: hidden;
  }
  .s-card-head {
    padding: 0.65rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface-raised);
    font-size: 0.72rem; font-weight: 700;
    letter-spacing: 0.07em; color: var(--text-muted);
    text-transform: uppercase;
  }
  .s-card-body { padding: 1rem; }

  .s-desc { font-size: 0.875rem; color: var(--text-secondary); line-height: 1.6; margin: 0 0 1rem; }

  .s-stats { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.75rem; }
  .s-stat { display: flex; flex-direction: column; gap: 0.1rem; }
  .s-stat strong { font-size: 1.1rem; font-weight: 800; color: var(--text-primary); }
  .s-stat span { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 500; }
  .s-stat-div { width: 1px; height: 2rem; background: var(--border); flex-shrink: 0; }

  .s-active {
    display: flex; align-items: center; gap: 0.45rem;
    font-size: 0.8rem; color: #16a34a; font-weight: 500; margin-bottom: 0.875rem;
  }

  .s-divider { height: 1px; background: var(--border); margin: 0 0 0.875rem; }

  .s-meta {
    display: flex; align-items: center; gap: 0.4rem;
    font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.875rem;
  }
  .s-link { color: var(--accent); text-decoration: none; font-weight: 600; font-size: 0.85rem; }
  .s-link:hover { text-decoration: underline; }

  .s-cta {
    display: block; width: 100%; padding: 0.65rem;
    border-radius: 9999px; background: var(--accent);
    color: white; font-weight: 700; font-size: 0.875rem;
    text-align: center; text-decoration: none; transition: opacity 0.15s;
  }
  .s-cta:hover { opacity: 0.87; }
  .s-cta-outline {
    background: transparent; border: 1.5px solid var(--accent); color: var(--accent);
  }
  .s-cta-outline:hover { background: var(--accent-subtle); opacity: 1; }

  .s-rules { display: flex; flex-direction: column; }
  .s-rule {
    display: flex; align-items: flex-start; gap: 0.7rem;
    padding: 0.55rem 1rem; border-bottom: 1px solid var(--border);
  }
  .s-rule:last-child { border-bottom: none; }
  .s-rule-num {
    width: 20px; height: 20px; border-radius: 50%;
    background: var(--surface-raised); border: 1px solid var(--border);
    display: grid; place-items: center;
    font-size: 0.68rem; font-weight: 800; color: var(--text-muted); flex-shrink: 0;
  }
  .s-rule-text { font-size: 0.83rem; color: var(--text-secondary); line-height: 1.5; }

  .s-mod { display: flex; align-items: center; gap: 0.6rem; }
  .s-mod-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--surface-raised); border: 1px solid var(--border);
    display: grid; place-items: center; font-size: 0.9rem; flex-shrink: 0;
  }

  /* ─── Not found ─── */
  .not-found {
    display: flex; flex-direction: column; align-items: center;
    padding: 5rem 2rem; text-align: center; gap: 0.5rem;
  }
  .not-found :global(svg) { color: var(--text-muted); opacity: 0.5; margin-bottom: 0.75rem; }
  .not-found h2 { margin: 0; font-size: 1.4rem; font-weight: 800; color: var(--text-primary); }
  .not-found p { margin: 0 0 1.25rem; color: var(--text-muted); }
</style>