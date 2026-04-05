<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '@iconify/svelte';

  const { data = {} } = $props<{
    data?: {
      user?: { username: string } | null;
      community?: {
        id: string;
        name: string;
        displayName: string;
      } | null;
    };
  }>();

  let postType = $state<'text' | 'link' | 'image' | 'poll'>('text');
  let title = $state('');
  let body = $state('');
  let linkUrl = $state('');
  let isNsfw = $state(false);
  let isSpoiler = $state(false);
  let flair = $state<string>('');
  let isSubmitting = $state(false);
  let error = $state('');

  // Poll state
  let pollOptions = $state<string[]>(['', '']);
  let pollDays = $state(1);
  let pollAllowMultiple = $state(false);
  let pollAllowChange = $state(false);

  function addPollOption() {
    if (pollOptions.length < 6) {
      pollOptions = [...pollOptions, ''];
    }
  }

  function removePollOption(index: number) {
    if (pollOptions.length > 2) {
      pollOptions = pollOptions.filter((_, i) => i !== index);
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (!data.community) return;

    isSubmitting = true;
    error = '';

    // Validate poll
    if (postType === 'poll') {
      const validOptions = pollOptions.filter(o => o.trim().length > 0);
      if (validOptions.length < 2) {
        error = 'Poll requires at least 2 options';
        isSubmitting = false;
        return;
      }
    }

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          communityName: data.community.name,
          type: postType,
          title: title.trim(),
          body: body.trim() || undefined,
          linkUrl: linkUrl.trim() || undefined,
          isNsfw,
          isSpoiler,
          flair: flair || undefined,
          pollOptions: postType === 'poll' ? pollOptions.filter(o => o.trim()).map(o => o.trim()) : undefined,
          pollDays: postType === 'poll' ? pollDays : undefined,
          pollAllowMultiple: postType === 'poll' ? pollAllowMultiple : undefined,
          pollAllowChange: postType === 'poll' ? pollAllowChange : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        error = errorData.error || 'Failed to create post';
        isSubmitting = false;
        return;
      }

      const post = await response.json();
      await goto(`/c/${data.community.name}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'An unexpected error occurred';
      isSubmitting = false;
    }
  }

  const charCount = $derived(title.length);

  const flairOptions: string[] = ['Discussion', 'Question', 'News', 'Tutorial', 'Showcase', 'Help', 'Meme', 'AMA'];

  const typeOptions = [
    {
      key: 'text',
      label: 'Text Post',
      description: 'Share a discussion or write your thoughts',
      icon: 'lucide:file-text'
    },
    {
      key: 'link',
      label: 'Share a Link',
      description: 'Share an interesting article or website',
      icon: 'lucide:link'
    },
    {
      key: 'image',
      label: 'Images & Video',
      description: 'Upload photos, GIFs, or videos',
      icon: 'lucide:image'
    },
    {
      key: 'poll',
      label: 'Poll',
      description: 'Ask the community a question',
      icon: 'lucide:bar-chart-3'
    },
  ] as const;

  const canSubmit = $derived(
    !isSubmitting &&
    (postType !== 'link' || linkUrl.trim() !== '') &&
    (postType !== 'poll' || pollOptions.filter(o => o.trim()).length >= 2)
  );
</script>

<svelte:head>
  <title>Submit to c/{data.community?.name ?? 'community'} — Nexus</title>
</svelte:head>

{#if data.community}
  <div class="submit-page">
    <div class="submit-layout">

      <!-- Main content -->
      <main class="submit-main">

        <!-- Breadcrumb + heading -->
        <div class="page-header">
          <h1>Create a Post</h1>
          <a href="/c/{data.community.name}" class="community-pill">
            <span class="community-icon">c/</span>
            {data.community.name}
          </a>
        </div>

        <!-- Type selector — Step 1 -->
        <div class="type-selector-card">
          <div class="type-selector-title">Choose post type</div>
          <div class="type-selector-grid">
            {#each typeOptions as opt}
              <button
                type="button"
                class="type-selector-btn {postType === opt.key ? 'active' : ''}"
                onclick={() => postType = opt.key as 'text' | 'link' | 'image'}
              >
                <div class="type-icon"><Icon icon={opt.icon} width="18" height="18" /></div>
                <div class="type-info">
                  <div class="type-label">{opt.label}</div>
                  <div class="type-description">{opt.description}</div>
                </div>
              </button>
            {/each}
          </div>
        </div>

        <!-- Error banner -->
        {#if error}
          <div class="error-banner" role="alert">
            <Icon icon="lucide:alert-circle" width="16" height="16" />
            {error}
          </div>
        {/if}

        <!-- Form card -->
        <div class="form-card">
          <form onsubmit={handleSubmit}>
            <input type="hidden" name="type" value={postType} />
            <input type="hidden" name="flair" value={flair} />

            <!-- Title field -->
            <div class="title-wrap">
              <textarea
                class="title-input"
                name="title"
                placeholder="Title"
                maxlength="300"
                rows="2"
                bind:value={title}
                required
              ></textarea>
              <span class="char-count {charCount > 270 ? 'warn' : ''}">{charCount}/300</span>
            </div>

            <!-- Flair row -->
            <div class="flair-section">
              <div class="flair-pills">
                {#each flairOptions as f}
                  <button
                    type="button"
                    class="flair-pill {flair === f ? 'active' : ''}"
                    onclick={() => flair = flair === f ? '' : f}
                  >
                    {f}
                  </button>
                {/each}
              </div>
            </div>

            <!-- Body / Link content — Step 2: Content -->
            <div class="content-section">
              {#if postType === 'text'}
                <div class="content-header">
                  <h4>Write your post</h4>
                  <span class="content-hint">Markdown supported</span>
                </div>
                <textarea
                  class="body-input"
                  name="body"
                  placeholder="Share your thoughts, ask a question, or start a discussion..."
                  rows="9"
                  bind:value={body}
                ></textarea>

              {:else if postType === 'link'}
                <div class="content-header">
                  <h4>Share a link</h4>
                  <span class="content-hint">Paste a URL</span>
                </div>
                <input
                  id="link-url"
                  type="url"
                  class="link-input"
                  name="linkUrl"
                  placeholder="https://example.com"
                  bind:value={linkUrl}
                  required
                />
                {#if linkUrl}
                  <div class="link-preview">
                    <Icon icon="lucide:info" width="14" height="14" />
                    <span>Link preview will generate when you post</span>
                  </div>
                {/if}
                <div class="optional-section">
                  <h5>Optional description</h5>
                  <textarea
                    class="body-input small"
                    name="body"
                    placeholder="Add context or comment about this link..."
                    rows="4"
                    bind:value={body}
                  ></textarea>
                </div>

              {:else if postType === 'image'}
                <div class="content-header">
                  <h4>Upload media</h4>
                  <span class="content-hint">Images, GIFs, videos</span>
                </div>
                <div class="upload-zone">
                  <Icon icon="lucide:cloud-upload" width="48" height="48" />
                  <p class="upload-text">Drag & drop or click to select</p>
                  <span class="upload-hint">PNG, JPG, GIF, MP4 up to 1 GB</span>
                </div>
                <div class="optional-section">
                  <h5>Add a caption</h5>
                  <textarea
                    class="body-input small"
                    name="body"
                    placeholder="Tell the story behind this image..."
                    rows="4"
                    bind:value={body}
                  ></textarea>
                </div>

              {:else if postType === 'poll'}
                <div class="content-header">
                  <h4>Create a poll</h4>
                  <span class="content-hint">Ask your community</span>
                </div>
                
                <div class="poll-options-section">
                  <label class="poll-label">Poll options</label>
                  <div class="poll-options-list">
                    {#each pollOptions as option, index}
                      <div class="poll-option-row">
                        <span class="poll-option-number">{index + 1}</span>
                        <input
                          type="text"
                          class="poll-option-input"
                          placeholder="Option {index + 1}"
                          bind:value={pollOptions[index]}
                        />
                        {#if pollOptions.length > 2}
                          <button
                            type="button"
                            class="poll-remove-btn"
                            onclick={() => removePollOption(index)}
                          >
                            <Icon icon="lucide:x" width="16" height="16" />
                          </button>
                        {/if}
                      </div>
                    {/each}
                  </div>
                  {#if pollOptions.length < 6}
                    <button type="button" class="add-option-btn" onclick={addPollOption}>
                      <Icon icon="lucide:plus" width="16" height="16" />
                      Add option
                    </button>
                  {/if}
                </div>

                <div class="poll-settings">
                  <div class="poll-setting-row">
                    <label class="poll-label">Duration</label>
                    <select class="poll-select" bind:value={pollDays}>
                      <option value={1}>1 day</option>
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </div>
                  
                  <div class="poll-checkbox-row">
                    <label class="poll-checkbox-label">
                      <input type="checkbox" bind:checked={pollAllowMultiple} />
                      <span>Allow multiple choices</span>
                    </label>
                  </div>
                  
                  <div class="poll-checkbox-row">
                    <label class="poll-checkbox-label">
                      <input type="checkbox" bind:checked={pollAllowChange} />
                      <span>Allow changing vote</span>
                    </label>
                  </div>
                </div>

                <div class="optional-section">
                  <h5>Add context (optional)</h5>
                  <textarea
                    class="body-input small"
                    name="body"
                    placeholder="What do you want to ask?"
                    rows="3"
                    bind:value={body}
                  ></textarea>
                </div>
              {/if}
            </div>

            <!-- Bottom toolbar: tags + submit -->
            <div class="form-footer">
              <div class="footer-left">
                <label class="tag-btn {isNsfw ? 'tag-nsfw' : ''}">
                  <input type="checkbox" class="sr-only" name="isNsfw" bind:checked={isNsfw} />
                  <Icon icon="lucide:alert-triangle" width="14" height="14" />
                  NSFW
                </label>
                <label class="tag-btn {isSpoiler ? 'tag-spoiler' : ''}">
                  <input type="checkbox" class="sr-only" name="isSpoiler" bind:checked={isSpoiler} />
                  <Icon icon="lucide:eye-off" width="14" height="14" />
                  Spoiler
                </label>
              </div>

              <div class="footer-right">
                <a href="/c/{data.community.name}" class="btn-ghost">Cancel</a>
                <button type="submit" class="btn-submit" disabled={!canSubmit}>
                  {#if isSubmitting}
                    <span class="spinner"></span> Posting…
                  {:else}
                    Post
                  {/if}
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>

      <!-- Sidebar -->
      <aside class="submit-sidebar">
        <!-- Community card -->
        <div class="sidebar-card community-card">
          <div class="community-banner"></div>
          <div class="community-info">
            <div class="community-avatar">c/</div>
            <h3 class="community-name">c/{data.community.name}</h3>
            <p class="community-label">{data.community.displayName}</p>
          </div>
        </div>

        <!-- Rules card -->
        <div class="sidebar-card rules-card">
          <h4 class="sidebar-heading">Posting to Nexus</h4>
          <ol class="rules-list">
            <li>Remember the human</li>
            <li>Behave like you would in real life</li>
            <li>Look for the original source of content</li>
            <li>Search for duplicates before posting</li>
            <li>Read the community's rules</li>
          </ol>
        </div>

        <p class="footer-note">
          Please be mindful of Nexus's <a href="#">content policy</a> and practice good <a href="#">reddiquette</a>.
        </p>
      </aside>

    </div>
  </div>

{:else}
  <div class="not-found">
    <p>Community not found.</p>
    <a href="/">Go home</a>
  </div>
{/if}

<style>
  /* ─── Layout ─────────────────────────────────────── */
  .submit-page {
    min-height: 100vh;
    padding: 2.5rem 1rem 4rem;
    background: var(--surface-raised);
  }

  .submit-layout {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;
    max-width: 720px;
    margin: 0 auto;
  }

  @media (max-width: 960px) {
    .submit-layout { grid-template-columns: 1fr; }
    .submit-sidebar { display: none; }
  }

  /* ─── Page header ────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .page-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
    letter-spacing: -0.02em;
  }

  .community-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--surface-raised);
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .community-pill:hover {
    border-color: var(--accent);
    background: var(--surface-overlay);
    color: var(--accent);
  }

  .community-icon {
    color: var(--accent);
    font-weight: 800;
  }

  /* ─── Type selector ──────────────────────────────── */
  .type-selector-card {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }

  .type-selector-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 1rem;
    letter-spacing: -0.01em;
  }

  .type-selector-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.75rem;
  }

  .type-selector-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 1.25rem 1rem;
    border: 2px solid var(--border);
    background: var(--surface);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    font-family: inherit;
  }

  .type-selector-btn:hover {
    border-color: var(--accent);
    background: var(--surface-raised);
  }

  .type-selector-btn.active {
    border-color: var(--accent);
    background: rgba(79, 110, 247, 0.08);
    box-shadow: inset 0 0 0 1px var(--accent);
  }

  .type-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent);
    opacity: 0.9;
  }

  .type-info {
    text-align: center;
  }

  .type-label {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--text-primary);
    line-height: 1.2;
  }

  .type-description {
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.3;
    margin-top: 0.25rem;
  }

  /* ─── Error banner ───────────────────────────────── */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    margin-bottom: 1.5rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.4);
    border-radius: 6px;
    font-size: 0.9rem;
    color: #dc2626;
  }

  /* ─── Form card ──────────────────────────────────── */
  .form-card {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: visible;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  }

  /* ─── Title field ────────────────────────────────── */
  .title-wrap {
    position: relative;
    border-bottom: 1px solid var(--border);
    padding: 1.5rem;
  }

  .title-input {
    width: 100%;
    box-sizing: border-box;
    padding: 0 0 0.5rem;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-size: 1.35rem;
    font-weight: 700;
    font-family: inherit;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .title-input::placeholder {
    color: var(--text-muted);
  }

  .char-count {
    position: absolute;
    bottom: 1.5rem;
    right: 1.5rem;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-muted);
    pointer-events: none;
  }

  .char-count.warn {
    color: #f59e0b;
  }

  /* ─── Flair ──────────────────────────────────────── */
  .flair-section {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  .flair-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }

  .flair-pill {
    padding: 0.45rem 1rem;
    border: 1px solid var(--border);
    background: transparent;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    color: var(--text-secondary);
    transition: all 0.2s ease;
  }

  .flair-pill:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(79, 110, 247, 0.05);
  }

  .flair-pill.active {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  /* ─── Content section ───────────────────────────── */
  .content-section {
    border-bottom: 1px solid var(--border);
    padding: 1.5rem;
  }

  .content-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
  }

  .content-header h4 {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .content-hint {
    font-size: 0.75rem;
    color: var(--text-muted);
    font-weight: 500;
  }

  .optional-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
  }

  .optional-section h5 {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .link-preview {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.75rem 1rem;
    background: var(--surface);
    border-left: 3px solid var(--accent);
    border-radius: 4px;
    font-size: 0.825rem;
    color: var(--text-secondary);
  }

  .link-preview svg {
    color: var(--accent);
    flex-shrink: 0;
  }

  .body-input {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    outline: none;
    resize: vertical;
    min-height: 240px;
    font-size: 0.95rem;
    font-family: inherit;
    color: var(--text-primary);
    line-height: 1.7;
    border-radius: 6px;
    transition: border-color 0.2s ease;
  }

  .body-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(79, 110, 247, 0.1);
  }

  .body-input::placeholder {
    color: var(--text-muted);
  }

  .body-input.small {
    min-height: 120px;
  }

  .link-input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.9rem 1.1rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text-primary);
    font-size: 0.95rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .link-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(79, 110, 247, 0.1);
  }

  .link-input::placeholder {
    color: var(--text-muted);
  }

  /* upload */
  .upload-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    min-height: 180px;
    border: 2px dashed var(--border);
    border-radius: 8px;
    background: var(--surface);
    cursor: pointer;
    color: var(--text-muted);
    transition: all 0.2s ease;
    padding: 2rem;
  }

  .upload-zone:hover {
    border-color: var(--accent);
    background: rgba(79, 110, 247, 0.03);
  }

  .upload-zone svg {
    color: var(--accent);
    opacity: 0.7;
  }

  .upload-text {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
  }

  .upload-hint {
    font-size: 0.8125rem;
    color: var(--text-muted);
  }

  /* ─── Footer toolbar ─────────────────────────────── */
  .form-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem;
    gap: 1.25rem;
    flex-wrap: wrap;
    background: var(--surface-raised);
    border-top: 1px solid var(--border);
  }

  .footer-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .footer-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: auto;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0,0,0,0);
    white-space: nowrap;
    border-width: 0;
  }

  .tag-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.825rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    color: var(--text-secondary);
    background: transparent;
    transition: all 0.2s ease;
    user-select: none;
  }

  .tag-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
    background: rgba(79, 110, 247, 0.05);
  }

  .tag-btn.tag-nsfw {
    border-color: #dc2626;
    background: rgba(220, 38, 38, 0.08);
    color: #dc2626;
  }

  .tag-btn.tag-spoiler {
    border-color: #f59e0b;
    background: rgba(245, 158, 11, 0.08);
    color: #f59e0b;
  }

  .btn-ghost {
    padding: 0.65rem 1.7rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-ghost:hover {
    background: var(--surface-overlay);
    border-color: var(--text-primary);
  }

  .btn-submit {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 2.2rem;
    border: none;
    border-radius: 6px;
    background: var(--accent);
    font-size: 0.9rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-submit:hover:not(:disabled) {
    background: var(--accent-dark);
    opacity: 1;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(79, 110, 247, 0.3);
  }

  .btn-submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    background: var(--accent);
    color: #fff;
  }

  .btn-submit:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ─── Sidebar (hidden in Reddit-like redesign) ────── */
  .submit-sidebar {
    display: none;
  }

  .sidebar-card {
    background: var(--surface-raised);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .community-banner {
    height: 48px;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-dark) 100%);
    opacity: 0.7;
  }

  .community-info {
    padding: 0.875rem 1rem 1rem;
  }

  .community-avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid var(--surface-raised);
    background: var(--accent);
    color: #fff;
    font-weight: 900;
    font-size: 0.8rem;
    margin-top: -1.5rem;
    margin-bottom: 0.5rem;
  }

  .community-name {
    margin: 0 0 0.125rem;
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .community-label {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-secondary);
  }

  .rules-card {
    padding: 1rem;
  }

  .sidebar-heading {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 0.875rem;
    padding-bottom: 0.625rem;
    border-bottom: 1px solid var(--border);
  }

  .rules-list {
    margin: 0;
    padding-left: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .rules-list li {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.4;
  }

  .footer-note {
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.6;
    padding: 0 0.25rem;
    margin: 0;
  }

  .footer-note a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 500;
  }

  .footer-note a:hover {
    text-decoration: underline;
  }

  /* ─── Not found ──────────────────────────────────── */
  .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    gap: 1rem;
    color: var(--text-secondary);
  }

  .not-found a {
    color: var(--accent);
    text-decoration: none;
    font-weight: 600;
    transition: opacity 0.2s;
  }

  .not-found a:hover {
    opacity: 0.8;
  }

  /* ─── Poll Styles ──────────────────────────────────── */
  .poll-options-section {
    margin-bottom: 1.5rem;
  }

  .poll-label {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.75rem;
  }

  .poll-options-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .poll-option-row {
    display: flex;
    align-items: center;
    gap: 0.625rem;
  }

  .poll-option-number {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--surface);
    border: 1px solid var(--border);
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .poll-option-input {
    flex: 1;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text-primary);
    font-size: 0.9rem;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .poll-option-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(79, 110, 247, 0.1);
  }

  .poll-option-input::placeholder {
    color: var(--text-muted);
  }

  .poll-remove-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    transition: all 0.2s;
  }

  .poll-remove-btn:hover {
    background: rgba(220, 38, 38, 0.1);
    color: #dc2626;
  }

  .add-option-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding: 0.5rem 1rem;
    border: 1px dashed var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--accent);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .add-option-btn:hover {
    border-color: var(--accent);
    background: rgba(79, 110, 247, 0.05);
  }

  .poll-settings {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin-bottom: 1rem;
  }

  .poll-setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .poll-select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--surface-raised);
    color: var(--text-primary);
    font-size: 0.875rem;
    cursor: pointer;
    outline: none;
  }

  .poll-select:focus {
    border-color: var(--accent);
  }

  .poll-checkbox-row {
    display: flex;
    align-items: center;
  }

  .poll-checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    font-size: 0.875rem;
    color: var(--text-secondary);
    cursor: pointer;
  }

  .poll-checkbox-label input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--accent);
    cursor: pointer;
  }
</style>