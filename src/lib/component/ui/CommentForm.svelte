<script lang="ts">
  import * as Lucide from 'lucide-svelte';

  let {
    postId, parentCommentId = null, placeholder = 'What are your thoughts?',
    onSubmit, onCancel, compact = false,
  }: {
    postId: string; parentCommentId?: string | null; placeholder?: string;
    onSubmit?: (event: CustomEvent) => void; onCancel?: () => void; compact?: boolean;
  } = $props();

  type Tab = 'text' | 'image' | 'gif' | 'link';

  let body = $state('');
  let isSubmitting = $state(false);
  let activeTab = $state<Tab>('text');
  let imageUrl = $state('');
  let gifUrl = $state('');
  let linkUrl = $state('');
  let linkTitle = $state('');
  let gifSearch = $state('');
  let gifResults = $state<string[]>([]);
  let isSearchingGifs = $state(false);
  let selectedGif = $state('');
  let imageFile = $state<File | null>(null);
  let imagePreview = $state('');
  let isDragging = $state(false);
  let fileInput: HTMLInputElement;

  async function searchGifs() {
    if (!gifSearch.trim()) return;
    isSearchingGifs = true;
    await new Promise(r => setTimeout(r, 600));
    gifResults = [
      `https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif`,
      `https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif`,
      `https://media.giphy.com/media/xT9IgG50Lg7russbC8/giphy.gif`,
      `https://media.giphy.com/media/3oriO0OEd9QIDdllqo/giphy.gif`,
      `https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif`,
      `https://media.giphy.com/media/l0HlvtIPzPdt2usKs/giphy.gif`,
    ];
    isSearchingGifs = false;
  }

  function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    imageFile = file;
    const reader = new FileReader();
    reader.onload = e => { imagePreview = e.target?.result as string; };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: DragEvent) { e.preventDefault(); isDragging = false; const file = e.dataTransfer?.files[0]; if (file) handleImageFile(file); }
  function handleFileInput(e: Event) { const file = (e.target as HTMLInputElement).files?.[0]; if (file) handleImageFile(file); }
  function clearImage() { imageFile = null; imagePreview = ''; imageUrl = ''; }
  function selectGif(url: string) { selectedGif = url; gifUrl = url; }

  async function handleSubmit() {
    const hasContent = body.trim() || imagePreview || imageUrl || selectedGif || (linkUrl.trim());
    if (!hasContent || isSubmitting) return;
    isSubmitting = true;
    try {
      const detail: Record<string, any> = { body: body.trim(), parentCommentId };
      if (activeTab === 'image' && (imagePreview || imageUrl)) detail.imageUrl = imagePreview || imageUrl;
      if (activeTab === 'gif' && selectedGif) detail.gifUrl = selectedGif;
      if (activeTab === 'link' && linkUrl.trim()) { detail.linkUrl = linkUrl.trim(); detail.linkTitle = linkTitle.trim(); }
      onSubmit?.(new CustomEvent('submit', { detail }));
      body = ''; imageFile = null; imagePreview = ''; imageUrl = ''; gifUrl = '';
      selectedGif = ''; gifResults = []; gifSearch = ''; linkUrl = ''; linkTitle = ''; activeTab = 'text';
    } finally { isSubmitting = false; }
  }

  function handleCancel() {
    body = ''; imageFile = null; imagePreview = ''; imageUrl = ''; selectedGif = ''; gifResults = []; linkUrl = ''; linkTitle = ''; activeTab = 'text';
    onCancel?.();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); }
    else if (e.key === 'Escape') { handleCancel(); }
  }

  let hasContent = $derived(body.trim().length > 0 || imagePreview.length > 0 || imageUrl.trim().length > 0 || selectedGif.length > 0 || linkUrl.trim().length > 0);
</script>

<div class="cf-root" class:compact>
  <div class="cf-tabs" role="tablist">
    <button role="tab" class="cf-tab" class:active={activeTab === 'text'} onclick={() => activeTab = 'text'} aria-selected={activeTab === 'text'}>
      <Lucide.AlignLeft size={14} strokeWidth={2.5} />Text
    </button>
    <button role="tab" class="cf-tab" class:active={activeTab === 'image'} onclick={() => activeTab = 'image'} aria-selected={activeTab === 'image'}>
      <Lucide.Image size={14} strokeWidth={2.5} />Image
    </button>
    <button role="tab" class="cf-tab" class:active={activeTab === 'gif'} onclick={() => activeTab = 'gif'} aria-selected={activeTab === 'gif'}>
      <Lucide.Film size={14} strokeWidth={2.5} />GIF
    </button>
    <button role="tab" class="cf-tab" class:active={activeTab === 'link'} onclick={() => activeTab = 'link'} aria-selected={activeTab === 'link'}>
      <Lucide.Link2 size={14} strokeWidth={2.5} />Link
    </button>
  </div>

  <div class="cf-body">
    {#if activeTab === 'text'}
      <div class="cf-text-panel">
        <textarea bind:value={body} {placeholder} rows={compact ? 3 : 5} maxlength={10000} onkeydown={handleKeydown} disabled={isSubmitting} class="cf-textarea" aria-label="Comment text"></textarea>
        <div class="cf-textarea-footer">
          <span class="cf-charcount" class:near-limit={body.length > 9000}>{body.length}/10000</span>
          <span class="cf-hint">Ctrl+Enter to submit</span>
        </div>
      </div>

    {:else if activeTab === 'image'}
      <div class="cf-image-panel">
        {#if imagePreview}
          <div class="cf-preview-wrap">
            <img src={imagePreview} alt="Preview" class="cf-img-preview" />
            <button class="cf-remove-btn" onclick={clearImage} aria-label="Remove image"><Lucide.X size={14} strokeWidth={2.5} /></button>
          </div>
          <textarea bind:value={body} placeholder="Add a caption (optional)…" rows="2" class="cf-textarea cf-caption" onkeydown={handleKeydown}></textarea>
        {:else}
          <div class="cf-dropzone" class:dragging={isDragging}
            ondragover={(e) => { e.preventDefault(); isDragging = true; }}
            ondragleave={() => isDragging = false}
            ondrop={handleDrop}
            onclick={() => fileInput.click()}
            role="button" tabindex="0"
            onkeydown={(e) => e.key === 'Enter' && fileInput.click()}
            aria-label="Upload image"
          >
            <Lucide.Upload size={32} strokeWidth={1.5} class="cf-drop-icon" />
            <p class="cf-drop-title">Drop image here or <span class="cf-link-text">browse</span></p>
            <p class="cf-drop-sub">PNG, JPG, GIF, WEBP up to 20MB</p>
          </div>
          <input bind:this={fileInput} type="file" accept="image/*" onchange={handleFileInput} class="cf-hidden-input" aria-hidden="true" />
          <div class="cf-or-divider"><span>or paste URL</span></div>
          <input bind:value={imageUrl} type="url" placeholder="https://example.com/image.jpg" class="cf-url-input" aria-label="Image URL" />
        {/if}
      </div>

    {:else if activeTab === 'gif'}
      <div class="cf-gif-panel">
        <div class="cf-gif-search-row">
          <input bind:value={gifSearch} type="text" placeholder="Search GIFs…" class="cf-url-input cf-gif-input" onkeydown={(e) => e.key === 'Enter' && searchGifs()} aria-label="GIF search" />
          <button class="cf-search-btn" onclick={searchGifs} disabled={isSearchingGifs}>
            {#if isSearchingGifs}<span class="cf-spinner"></span>
            {:else}<Lucide.Search size={14} strokeWidth={2.5} />{/if}
          </button>
        </div>
        {#if selectedGif}
          <div class="cf-preview-wrap">
            <img src={selectedGif} alt="Selected GIF" class="cf-gif-selected" />
            <button class="cf-remove-btn" onclick={() => { selectedGif = ''; gifUrl = ''; }} aria-label="Remove GIF"><X size={14} strokeWidth={2.5} /></button>
          </div>
        {:else if gifResults.length > 0}
          <div class="cf-gif-grid">
            {#each gifResults as gif}
              <button class="cf-gif-thumb" onclick={() => selectGif(gif)}>
                <img src={gif} alt="GIF option" loading="lazy" />
              </button>
            {/each}
          </div>
        {:else}
          <div class="cf-gif-empty">
            <Film size={28} strokeWidth={1.5} />
            <span>Search for a GIF above</span>
          </div>
        {/if}
      </div>

    {:else if activeTab === 'link'}
      <div class="cf-link-panel">
        <label class="cf-field-label" for="cf-link-url">URL</label>
        <input id="cf-link-url" bind:value={linkUrl} type="url" placeholder="https://example.com" class="cf-url-input" aria-label="Link URL" />
        <label class="cf-field-label" for="cf-link-title">Title <span class="cf-optional">(optional)</span></label>
        <input id="cf-link-title" bind:value={linkTitle} type="text" placeholder="Describe the link…" class="cf-url-input" aria-label="Link title" />
      </div>
    {/if}
  </div>

  <div class="cf-actions">
    {#if onCancel}
      <button class="cf-btn cf-btn-cancel" onclick={handleCancel} disabled={isSubmitting}>Cancel</button>
    {/if}
    <button class="cf-btn cf-btn-submit" onclick={handleSubmit} disabled={!hasContent || isSubmitting}>
      {#if isSubmitting}<span class="cf-spinner cf-spinner-white"></span>{/if}
      {isSubmitting ? 'Posting…' : 'Post'}
    </button>
  </div>
</div>

<style>
  .cf-root { background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px; overflow: hidden; transition: border-color 0.15s; }
  .cf-root:focus-within { border-color: var(--accent); }
  .cf-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); background: var(--surface-raised); }
  .cf-tab { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.6rem 1rem; border: none; background: none; color: var(--text-muted); font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit; border-bottom: 2px solid transparent; transition: color 0.12s, border-color 0.12s; margin-bottom: -1px; }
  .cf-tab:hover { color: var(--text-primary); }
  .cf-tab.active { color: var(--accent); border-bottom-color: var(--accent); }
  .cf-body { padding: 0.875rem 1rem 0.5rem; }
  .cf-textarea { width: 100%; padding: 0.625rem 0.75rem; background: var(--surface-raised); border: 1.5px solid var(--border); border-radius: 6px; color: var(--text-primary); font-family: inherit; font-size: 0.875rem; line-height: 1.6; resize: vertical; min-height: 80px; box-sizing: border-box; transition: border-color 0.15s, box-shadow 0.15s; }
  .cf-textarea:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
  .cf-textarea:disabled { opacity: 0.55; cursor: not-allowed; }
  .cf-caption { margin-top: 0.625rem; min-height: 52px; }
  .cf-textarea-footer { display: flex; justify-content: space-between; padding: 0.3rem 0.1rem 0; font-size: 0.72rem; }
  .cf-charcount { color: var(--text-muted); }
  .cf-charcount.near-limit { color: #ef4444; font-weight: 600; }
  .cf-hint { color: var(--text-muted); opacity: 0.7; }
  .cf-dropzone { border: 2px dashed var(--border); border-radius: 8px; padding: 2rem 1rem; text-align: center; cursor: pointer; transition: border-color 0.15s, background 0.15s; display: flex; flex-direction: column; align-items: center; gap: 0.4rem; }
  .cf-dropzone:hover, .cf-dropzone.dragging { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 5%, transparent); }
  :global(.cf-drop-icon) { color: var(--text-muted); margin-bottom: 0.25rem; }
  .cf-drop-title { font-size: 0.875rem; color: var(--text-secondary); margin: 0; font-weight: 500; }
  .cf-drop-sub { font-size: 0.75rem; color: var(--text-muted); margin: 0; }
  .cf-link-text { color: var(--accent); font-weight: 600; }
  .cf-hidden-input { display: none; }
  .cf-preview-wrap { position: relative; display: inline-block; max-width: 100%; margin-bottom: 0.5rem; }
  .cf-img-preview, .cf-gif-selected { max-width: 100%; max-height: 300px; border-radius: 6px; display: block; object-fit: contain; border: 1.5px solid var(--border); }
  .cf-remove-btn { position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 50%; background: rgba(0,0,0,0.65); border: none; color: white; cursor: pointer; display: grid; place-items: center; transition: background 0.15s; }
  .cf-remove-btn:hover { background: rgba(0,0,0,0.85); }
  .cf-or-divider { display: flex; align-items: center; gap: 0.75rem; margin: 0.75rem 0; color: var(--text-muted); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; }
  .cf-or-divider::before, .cf-or-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .cf-url-input { width: 100%; padding: 0.575rem 0.75rem; background: var(--surface-raised); border: 1.5px solid var(--border); border-radius: 6px; color: var(--text-primary); font-family: inherit; font-size: 0.875rem; box-sizing: border-box; transition: border-color 0.15s, box-shadow 0.15s; margin-bottom: 0.5rem; }
  .cf-url-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }
  .cf-gif-search-row { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
  .cf-gif-input { flex: 1; margin-bottom: 0; }
  .cf-search-btn { padding: 0 0.875rem; background: var(--accent); border: none; border-radius: 6px; color: white; cursor: pointer; display: grid; place-items: center; min-width: 40px; transition: opacity 0.15s; }
  .cf-search-btn:hover:not(:disabled) { opacity: 0.85; }
  .cf-search-btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .cf-gif-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 0.75rem; max-height: 200px; overflow-y: auto; border-radius: 6px; }
  .cf-gif-thumb { background: var(--surface-raised); border: 1.5px solid var(--border); border-radius: 6px; overflow: hidden; cursor: pointer; padding: 0; aspect-ratio: 4/3; transition: border-color 0.15s, transform 0.1s; }
  .cf-gif-thumb:hover { border-color: var(--accent); transform: scale(1.03); }
  .cf-gif-thumb img { width: 100%; height: 100%; object-fit: cover; }
  .cf-gif-empty { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem; color: var(--text-muted); font-size: 0.8rem; border: 1.5px dashed var(--border); border-radius: 8px; margin-bottom: 0.75rem; }
  .cf-field-label { display: block; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 0.3rem; letter-spacing: 0.02em; }
  .cf-optional { font-weight: 400; color: var(--text-muted); }
  .cf-actions { display: flex; justify-content: flex-end; gap: 0.625rem; padding: 0.625rem 1rem 0.875rem; border-top: 1px solid var(--border); margin-top: 0.25rem; }
  .cf-btn { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.525rem 1.125rem; border-radius: 6px; font-size: 0.8rem; font-weight: 700; cursor: pointer; transition: all 0.15s; font-family: inherit; border: 1.5px solid transparent; letter-spacing: 0.01em; }
  .cf-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .cf-btn-cancel { background: transparent; border-color: var(--border); color: var(--text-secondary); }
  .cf-btn-cancel:hover:not(:disabled) { background: var(--surface-raised); color: var(--text-primary); }
  .cf-btn-submit { background: var(--accent); border-color: var(--accent); color: white; }
  .cf-btn-submit:hover:not(:disabled) { opacity: 0.88; }
  .cf-spinner { width: 12px; height: 12px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: cf-spin 0.6s linear infinite; display: inline-block; }
  .cf-spinner-white { border-color: rgba(255,255,255,0.3); border-top-color: white; }
  @keyframes cf-spin { to { transform: rotate(360deg); } }
</style>