<script lang="ts">
  const { communities = [], selectedCommunityId = '', defaultType = 'text' } = $props<{ communities?: Array<{ id: string; name: string; displayName: string }>; selectedCommunityId?: string; defaultType?: string }>();

  let title = $state('');
  let body = $state('');
  let communityId = $state(() => selectedCommunityId || communities[0]?.id || '');
  let type = $state(() => defaultType);
</script>

<section class="submit-page">
  <div class="submit-panel">
    <div class="submit-header">
      <div>
        <h1>Create a post</h1>
        <p>Choose a community and share what’s on your mind.</p>
      </div>
      <a href="/communities" class="browse-link">Browse communities</a>
    </div>

    {#if communities.length > 0}
      <form method="post" action="?/create" class="submit-form">
        <label class="field-group">
          <span>Community</span>
          <select name="communityId" bind:value={communityId} required>
            {#each communities as community}
              <option value={community.id}>{community.displayName}</option>
            {/each}
          </select>
        </label>

        <label class="field-group">
          <span>Post title</span>
          <input
            type="text"
            name="title"
            bind:value={title}
            placeholder="Write a clear, descriptive title"
            required
          />
        </label>

        <label class="field-group">
          <span>Body</span>
          <textarea
            name="body"
            bind:value={body}
            rows="8"
            placeholder="Share more details, links, or images"
          ></textarea>
        </label>

        <input type="hidden" name="type" value={type} />

        <button type="submit" class="submit-button">Publish post</button>
      </form>
    {:else}
      <div class="empty-state">
        <p>You are not a member of any community yet.</p>
        <a href="/communities" class="empty-link">Browse communities to join</a>
      </div>
    {/if}
  </div>
</section>

<style>
  .submit-page {
    padding: 1.5rem;
    max-width: 900px;
    margin: 0 auto;
  }

  .submit-panel {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 2rem;
    box-shadow: 0 20px 60px rgba(0,0,0,0.03);
  }

  .submit-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.75rem;
  }

  .submit-header h1 {
    margin: 0;
    font-size: 2rem;
    color: var(--text-primary);
  }

  .submit-header p {
    margin: 0.5rem 0 0;
    color: var(--text-secondary);
    max-width: 46rem;
  }

  .browse-link {
    color: var(--accent);
    font-weight: 600;
    text-decoration: none;
    align-self: center;
  }

  .submit-form {
    display: grid;
    gap: 1.25rem;
  }

  .field-group {
    display: grid;
    gap: 0.5rem;
    font-size: 0.95rem;
    color: var(--text-secondary);
  }

  .field-group span {
    font-weight: 700;
    color: var(--text-primary);
  }

  input,
  select,
  textarea {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface-raised);
    color: var(--text-primary);
    padding: 0.9rem 1rem;
    font: inherit;
    outline: none;
  }

  textarea { resize: vertical; min-height: 180px; }

  .submit-button {
    width: fit-content;
    padding: 0.85rem 1.5rem;
    background: var(--accent);
    color: white;
    border: none;
    border-radius: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .submit-button:hover { background: var(--accent-dark); }

  .empty-state {
    padding: 2rem;
    border: 1px solid var(--border);
    border-radius: 16px;
    text-align: center;
  }

  .empty-link {
    display: inline-block;
    margin-top: 1rem;
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
  }
</style>
