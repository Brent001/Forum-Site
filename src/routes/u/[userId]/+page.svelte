<script lang="ts">
  import * as Lucide from 'lucide-svelte';
  import PostCard from '$lib/component/ui/PostCard.svelte';
  import UserAvatar from '$lib/component/ui/UserAvatar.svelte';

  const { data = {} } = $props<{
    data?: {
      user?: {
        id: string;
        username: string;
        name: string;
        image: string;
        bio: string;
        website: string;
        location: string;
        isAdmin: boolean;
        isModerator: boolean;
        postCount: number;
        commentCount: number;
        followerCount: number;
        followingCount: number;
        createdAt: string | Date;
      } | null;
      isOwnProfile?: boolean;
      currentUser?: { id: string; username: string } | null;
      posts?: Array<{
        id: string;
        title: string;
        body: string;
        type: string;
        mediaUrls: string[];
        linkUrl: string;
        linkPreview: { title: string; description: string; image: string; domain: string } | null;
        author: { username: string; avatarUrl: string };
        community: { name: string; displayName: string; icon: string };
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
    };
  }>();

  function formatDate(date: string | Date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function timeAgo(date: string | Date) {
    const createdAt = typeof date === 'string' ? new Date(date) : date;
    const diff = Math.floor((Date.now() - createdAt.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(date);
  }
</script>

<svelte:head>
  <title>{data.user ? `u/${data.user.username} — Nexus` : 'User not found'}</title>
</svelte:head>

{#if data.user}
  <!-- Banner -->
  <div class="user-banner">
    <div
      class="banner-bg"
      style={`background: linear-gradient(135deg,
        hsl(${Math.abs(data.user.username.charCodeAt(0) * 15) % 360}, 55%, 35%),
        hsl(${Math.abs(data.user.username.charCodeAt(1) * 20) % 360}, 60%, 25%));`}
    ></div>
  </div>

  <!-- User Header -->
  <div class="user-header-wrap">
    <div class="user-header-inner">
      <div class="user-identity">
        <div class="user-avatar-wrap">
          {#if data.user.image}
            <img src={data.user.image} alt={data.user.username} class="user-avatar-img" />
          {:else}
            <UserAvatar username={data.user.username} size="lg" />
          {/if}
        </div>
        <div class="user-title-block">
          <h1 class="user-display">{data.user.name}</h1>
          <span class="user-handle">u/{data.user.username}</span>
          {#if data.user.isAdmin}
            <span class="badge admin">Admin</span>
          {/if}
          {#if data.user.isModerator}
            <span class="badge moderator">Moderator</span>
          {/if}
        </div>
      </div>
      <div class="user-header-actions">
        {#if data.isOwnProfile}
          <a href="/settings" class="edit-profile-btn">Edit Profile</a>
        {:else if data.currentUser}
          <button class="follow-btn">Follow</button>
        {:else}
          <a href="/login" class="follow-btn">Follow</a>
        {/if}
      </div>
    </div>
  </div>

  <!-- User Info -->
  <div class="user-info-section">
    {#if data.user.bio}
      <p class="user-bio">{data.user.bio}</p>
    {/if}
    <div class="user-details">
      {#if data.user.location}
        <span class="detail-item">
          <Lucide.MapPin size={16} />
          {data.user.location}
        </span>
      {/if}
      {#if data.user.website}
        <a href={data.user.website} target="_blank" rel="noopener noreferrer" class="detail-item">
          <Lucide.Globe size={16} />
          {new URL(data.user.website).hostname}
        </a>
      {/if}
      <span class="detail-item">
        <Lucide.Calendar size={16} />
        Joined {formatDate(data.user.createdAt)}
      </span>
    </div>
    <div class="user-stats">
      <div class="stat-item">
        <strong>{data.user.postCount}</strong>
        <span>Posts</span>
      </div>
      <div class="stat-item">
        <strong>{data.user.commentCount}</strong>
        <span>Comments</span>
      </div>
      <div class="stat-item">
        <strong>{data.user.followerCount}</strong>
        <span>Followers</span>
      </div>
      <div class="stat-item">
        <strong>{data.user.followingCount}</strong>
        <span>Following</span>
      </div>
    </div>
  </div>

  <!-- Posts Section -->
  <div class="feed-column">
    <div class="posts-header">
      <h2>Posts</h2>
      {#if data.posts && data.posts.length > 0}
        <span class="post-count">{data.posts.length}</span>
      {/if}
    </div>

    {#if data.posts && data.posts.length > 0}
      <div class="posts-list">
        {#each data.posts as post (post.id)}
          <PostCard {post} />
        {/each}
      </div>
    {:else}
      <div class="empty-state">
        <p>No posts yet</p>
        <span class="empty-icon"><Lucide.FileText size={48} /></span>
      </div>
    {/if}
  </div>
{:else}
  <div class="user-not-found">
    <h2>User not found</h2>
    <p>The user you're looking for doesn't exist or has been deleted.</p>
    <a href="/" class="back-btn">Back to home</a>
  </div>
{/if}

<style>
  .user-banner {
    width: 100%;
    height: 200px;
    overflow: hidden;
    border-bottom: 1px solid var(--border);
  }
  .banner-bg {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
  }

  .user-header-wrap {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0 1.5rem;
  }
  .user-header-inner {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem 0;
  }

  .user-identity {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    flex: 1;
    min-width: 0;
  }

  .user-avatar-wrap {
    flex-shrink: 0;
    width: 120px;
    height: 120px;
    border-radius: 16px;
    overflow: hidden;
    background: var(--surface-raised);
    border: 3px solid var(--surface);
    margin-top: -60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 3rem;
  }
  .user-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .user-title-block {
    padding-top: 0.5rem;
  }
  .user-display {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0;
  }
  .user-handle {
    display: block;
    font-size: 1rem;
    color: var(--text-secondary);
    margin-top: 0.25rem;
  }

  .badge {
    display: inline-block;
    margin-top: 0.5rem;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    margin-right: 0.5rem;
  }
  .badge.admin {
    background: #fef2f2;
    color: #ef4444;
  }
  .badge.moderator {
    background: #fef3c7;
    color: #b45309;
  }

  .user-header-actions {
    flex-shrink: 0;
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .follow-btn {
    padding: 0.75rem 1.5rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 24px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.9375rem;
  }
  .follow-btn:hover {
    background: var(--accent-dark);
  }

  .edit-profile-btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: var(--surface-raised);
    color: var(--text-primary);
    border: 1px solid var(--border);
    border-radius: 24px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.9375rem;
    text-decoration: none;
  }
  .edit-profile-btn:hover {
    background: var(--border);
  }

  .user-info-section {
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 1.5rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .user-bio {
    font-size: 1rem;
    color: var(--text-primary);
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .user-details {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .detail-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9375rem;
    color: var(--text-secondary);
    text-decoration: none;
  }
  .detail-item:hover {
    color: var(--accent);
  }
  .detail-item :global(svg) {
    flex-shrink: 0;
  }

  .user-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.75rem;
    background: var(--surface-raised);
    border-radius: 8px;
    text-align: center;
  }
  .stat-item strong {
    font-size: 1.5rem;
    color: var(--text-primary);
  }
  .stat-item span {
    font-size: 0.75rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
  }

  .feed-column {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
  }

  .posts-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }
  .posts-header h2 {
    font-size: 1.5rem;
    margin: 0;
  }
  .post-count {
    font-size: 0.875rem;
    background: var(--surface-raised);
    color: var(--text-secondary);
    padding: 0.375rem 0.75rem;
    border-radius: 999px;
  }

  .posts-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 3rem 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 16px;
    text-align: center;
  }
  .empty-state p {
    font-size: 1rem;
    color: var(--text-secondary);
    margin: 0;
  }
  .empty-icon {
    font-size: 3rem;
  }

  .user-not-found {
    text-align: center;
    padding: 3rem 1rem;
  }
  .user-not-found h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  .user-not-found p {
    color: var(--text-secondary);
    margin-bottom: 1.5rem;
  }
  .back-btn {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background: var(--accent);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    transition: all 0.15s ease;
  }
  .back-btn:hover {
    background: var(--accent-dark);
  }

  @media (max-width: 768px) {
    .user-header-inner {
      flex-direction: column;
      align-items: center;
    }
    .user-identity {
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .user-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
