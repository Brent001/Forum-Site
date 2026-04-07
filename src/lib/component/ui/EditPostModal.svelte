<script lang="ts">
  import Modal from './Modal.svelte';

  type Post = {
    id: string;
    type: 'text' | 'link' | 'image' | 'video' | 'poll';
    title: string;
    body: string | null;
    linkUrl?: string | null;
    mediaUrls?: string[];
    isNsfw: boolean;
    isSpoiler: boolean;
    flair: string | null;
    flairColor?: string | null;
    pollOptions?: string[] | null;
    pollEndsAt?: string | Date | null;
    pollAllowMultiple?: boolean;
    pollAllowChange?: boolean;
  };

  let { post, open = false, onSave, onClose } = $props<{
    post?: Post;
    open?: boolean;
    onSave?: (data: {
      title: string;
      body: string | null;
      linkUrl?: string | null;
      mediaUrls?: string[];
      isNsfw: boolean;
      isSpoiler: boolean;
      flair: string | null;
      flairColor?: string | null;
      pollOptions?: string[] | null;
      pollEndsAt?: string | null;
      pollAllowMultiple?: boolean;
      pollAllowChange?: boolean;
    }) => void;
    onClose?: () => void;
  }>();

  let editTitle = $state('');
  let editBody = $state('');
  let editLinkUrl = $state('');
  let editMediaUrlsText = $state('');
  let editIsNsfw = $state(false);
  let editIsSpoiler = $state(false);
  let editFlair = $state('');
  let editFlairColor = $state('#000000');
  let editPollOptions = $state<string[]>([]);
  let editPollEndsAt = $state('');
  let editPollAllowMultiple = $state(false);
  let editPollAllowChange = $state(false);

  function toDate(value: string | Date | null | undefined) {
    if (!value) return null;
    return typeof value === 'string' ? new Date(value) : value;
  }

  function toDatetimeLocal(value: string | Date | null | undefined) {
    const date = toDate(value);
    if (!date) return '';
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - offset * 60000);
    return localDate.toISOString().slice(0, 16);
  }

  function formatMediaUrls(urls: string[] | null | undefined) {
    if (!urls?.length) return '';
    return urls.join('\n');
  }

  function parseMediaUrls(value: string) {
    return value
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter(Boolean);
  }

  $effect(() => {
    if (open && post) {
      editTitle = post.title || '';
      editBody = post.body || '';
      editLinkUrl = post.linkUrl || '';
      editMediaUrlsText = formatMediaUrls(post.mediaUrls);
      editIsNsfw = post.isNsfw || false;
      editIsSpoiler = post.isSpoiler || false;
      editFlair = post.flair || '';
      editFlairColor = post.flairColor || '#000000';
      editPollOptions = post.pollOptions?.length ? [...post.pollOptions] : [''];
      editPollEndsAt = toDatetimeLocal(post.pollEndsAt);
      editPollAllowMultiple = post.pollAllowMultiple || false;
      editPollAllowChange = post.pollAllowChange || false;
    }
  });

  function addPollOption() {
    editPollOptions = [...editPollOptions, ''];
  }

  function removePollOption(index: number) {
    editPollOptions = editPollOptions.filter((_, i) => i !== index);
  }

  function updatePollOption(index: number, value: string) {
    editPollOptions = editPollOptions.map((option, i) => (i === index ? value : option));
  }

  function handleSave() {
    if (!editTitle.trim()) {
      alert('Title cannot be empty');
      return;
    }

    const payload: any = {
      title: editTitle.trim(),
      body: editBody.trim() || null,
      isNsfw: editIsNsfw,
      isSpoiler: editIsSpoiler,
      flair: editFlair.trim() || null,
      flairColor: editFlairColor.trim() || null,
    };

    if (post?.type === 'link' || post?.type === 'video') {
      payload.linkUrl = editLinkUrl.trim() || null;
    }

    if (post?.type === 'image' || post?.type === 'video') {
      payload.mediaUrls = parseMediaUrls(editMediaUrlsText);
    }

    if (post?.type === 'poll') {
      const options = editPollOptions.map((option) => option.trim()).filter(Boolean);
      if (options.length < 2) {
        alert('Poll must have at least two options');
        return;
      }
      payload.pollOptions = options;
      payload.pollEndsAt = editPollEndsAt ? new Date(editPollEndsAt).toISOString() : null;
      payload.pollAllowMultiple = editPollAllowMultiple;
      payload.pollAllowChange = editPollAllowChange;
    }

    if (onSave) {
      onSave(payload);
    }
  }

  function handleClose() {
    if (onClose) onClose();
  }
</script>

<Modal {open} title="Edit Post" size="lg" on:close={handleClose}>
  {#snippet children()}
    <div class="edit-modal-content">
      <div class="edit-field">
        <label for="edit-title" class="edit-label">Title</label>
        <input
          id="edit-title"
          type="text"
          class="edit-input"
          bind:value={editTitle}
          placeholder="Post title"
          maxlength="300"
        />
      </div>

      <div class="edit-field">
        <label for="edit-body" class="edit-label">Content</label>
        <textarea
          id="edit-body"
          class="edit-textarea"
          bind:value={editBody}
          placeholder="Post content (optional)"
          rows="6"
        ></textarea>
      </div>

      {#if post?.type === 'link' || post?.type === 'video'}
        <div class="edit-field">
          <label for="edit-link-url" class="edit-label">Link URL</label>
          <input
            id="edit-link-url"
            type="text"
            class="edit-input"
            bind:value={editLinkUrl}
            placeholder="https://example.com/video or article"
          />
        </div>
      {/if}

      {#if post?.type === 'image' || post?.type === 'video'}
        <div class="edit-field">
          <label for="edit-media-urls" class="edit-label">Media URLs</label>
          <textarea
            id="edit-media-urls"
            class="edit-textarea"
            bind:value={editMediaUrlsText}
            placeholder="One media URL per line"
            rows="4"
          ></textarea>
        </div>
      {/if}

      {#if post?.type === 'poll'}
        <div class="poll-edit-section">
          <h3 class="poll-edit-heading">Poll Options</h3>
          {#each editPollOptions as option, index}
            <div class="poll-option-row">
              <input
                type="text"
                class="edit-input poll-option-input"
                value={option}
                placeholder={`Option ${index + 1}`}
                oninput={(event) => updatePollOption(index, (event.target as HTMLInputElement).value)}
              />
              {#if editPollOptions.length > 2}
                <button type="button" class="btn-remove-option" onclick={() => removePollOption(index)}>
                  Remove
                </button>
              {/if}
            </div>
          {/each}
          <button type="button" class="btn-add-option" onclick={addPollOption}>
            Add option
          </button>

          <div class="edit-field">
            <label for="edit-poll-ends-at" class="edit-label">Poll ends at</label>
            <input
              id="edit-poll-ends-at"
              type="datetime-local"
              class="edit-input"
              bind:value={editPollEndsAt}
            />
          </div>

          <div class="edit-options">
            <label class="edit-option">
              <input type="checkbox" bind:checked={editPollAllowMultiple} />
              <span>Allow multiple answers</span>
            </label>
            <label class="edit-option">
              <input type="checkbox" bind:checked={editPollAllowChange} />
              <span>Allow changing vote</span>
            </label>
          </div>
        </div>
      {/if}

      <div class="edit-options">
        <label class="edit-option">
          <input type="checkbox" bind:checked={editIsNsfw} />
          <span>Mark as NSFW</span>
        </label>
        <label class="edit-option">
          <input type="checkbox" bind:checked={editIsSpoiler} />
          <span>Mark as spoiler</span>
        </label>
      </div>

      <div class="edit-field">
        <label for="edit-flair" class="edit-label">Flair</label>
        <input
          id="edit-flair"
          type="text"
          class="edit-input flair-input"
          bind:value={editFlair}
          placeholder="Flair (optional)"
          maxlength="50"
        />
      </div>

      <div class="edit-field">
        <label for="edit-flair-color" class="edit-label">Flair color</label>
        <input
          id="edit-flair-color"
          type="color"
          class="edit-input color-input"
          bind:value={editFlairColor}
        />
      </div>
    </div>
  {/snippet}

  {#snippet footer()}
    <div class="edit-modal-footer">
      <button type="button" class="btn-cancel" onclick={handleClose}>Cancel</button>
      <button type="button" class="btn-save" onclick={handleSave}>Save Changes</button>
    </div>
  {/snippet}
</Modal>

<style>
  .edit-modal-content { display: flex; flex-direction: column; gap: 1.25rem; }
  .edit-field { display: flex; flex-direction: column; gap: 0.5rem; }
  .edit-label { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
  .edit-input { padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-size: 1rem; color: var(--text-primary); background: var(--surface); font-family: inherit; }
  .edit-input:focus { outline: none; border-color: var(--accent); }
  .edit-textarea { padding: 0.75rem; border: 1px solid var(--border); border-radius: 8px; font-size: 0.875rem; color: var(--text-secondary); background: var(--surface); font-family: inherit; resize: vertical; min-height: 120px; }
  .edit-textarea:focus { outline: none; border-color: var(--accent); }
  .edit-options { display: flex; flex-wrap: wrap; gap: 1rem; }
  .edit-option { display: flex; align-items: center; gap: 0.375rem; font-size: 0.8125rem; color: var(--text-secondary); cursor: pointer; }
  .edit-option input[type="checkbox"] { margin: 0; }
  .flair-input { max-width: 200px; }
  .edit-modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; }
  .btn-cancel { padding: 0.5rem 1rem; border: 1px solid var(--border); border-radius: 6px; background: var(--surface); color: var(--text-secondary); font-size: 0.875rem; font-weight: 500; cursor: pointer; }
  .btn-cancel:hover { background: var(--surface-overlay); }
  .btn-save { padding: 0.5rem 1rem; border: none; border-radius: 6px; background: var(--accent); color: white; font-size: 0.875rem; font-weight: 500; cursor: pointer; }
  .btn-save:hover { opacity: 0.9; }
</style>