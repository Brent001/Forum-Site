<script lang="ts">
  import Icon from '@iconify/svelte';
  import CommunityAvatar from '$lib/component/ui/CommunityAvatar.svelte';

  const { data = {} } = $props<{
    data?: {
      community?: {
        id: string;
        name: string;
        displayName: string;
        description: string;
        icon: string;
        banner: string;
        themeColor: string;
        rules: Array<{ title: string; description?: string }>;
        nsfw?: boolean;
        requireApproval?: boolean;
        restrictPosting?: boolean;
        hideDiscovery?: boolean;
        archived?: boolean;
        allowLinks?: boolean;
        allowMedia?: boolean;
        allowPolls?: boolean;
        memberCount?: number;
        postCount?: number;
      } | null;
      error?: string;
    };
  }>();

  let activeTab = $state('basics');

  // Basics
  let displayName = $state(data.community?.displayName || '');
  let description = $state(data.community?.description || '');
  
  // Rules: parse from array of {title, description} back to array of titles
  let rules = $state<string[]>(
    data.community?.rules?.length 
      ? data.community.rules.map((r: { title: string; description?: string } | string) => typeof r === 'string' ? r : r.title)
      : ['']
  );
  
  let error = $state('');
  let saveSuccess = $state(false);

  // Appearance
  let iconMode = $state<'emoji' | 'upload' | 'url'>(
    data.community?.icon && (data.community.icon.includes('http') || data.community.icon.includes('://')) ? 'url' : 'emoji'
  );
  let iconEmoji = $state(
    data.community?.icon && !data.community.icon.includes('http') && !data.community.icon.includes('://') ? data.community.icon : '🌐'
  );
  let iconUrl = $state(
    data.community?.icon && (data.community.icon.includes('http') || data.community.icon.includes('://')) ? data.community.icon : ''
  );
  let iconFile = $state<File | null>(null);
  let iconPreview = $state('');
  let iconInputEl = $state<HTMLInputElement | null>(null);

  let bannerMode = $state<'upload' | 'url' | 'none'>(
    data.community?.banner ? 'url' : 'none'
  );
  let bannerUrl = $state(data.community?.banner || '');
  let bannerFile = $state<File | null>(null);
  let bannerPreview = $state(data.community?.banner || '');
  let bannerInputEl = $state<HTMLInputElement | null>(null);

  let themeColor = $state(data.community?.themeColor || '#4f46e5');

  // Settings
  let nsfw = $state(data.community?.nsfw || false);
  let restrictPosting = $state(data.community?.restrictPosting || false);
  let requireApproval = $state(data.community?.requireApproval || false);
  let hideDiscovery = $state(data.community?.hideDiscovery || false);
  let allowLinks = $state(data.community?.allowLinks ?? true);
  let allowMedia = $state(data.community?.allowMedia ?? true);
  let allowPolls = $state(data.community?.allowPolls ?? true);
  let archived = $state(data.community?.archived || false);

  let searchQuery = $state('');
  let searchResults = $state<Array<{ id: string; username: string }>>([]);
  let selectedMember = $state<{ id: string; username: string } | null>(null);
  let isSearching = $state(false);

  const emojiPresets = [
    '🌐','⚡','🔥','🎮','🎨','🔬','📰','🎵','🏆','🚀',
    '💡','📚','🌿','🤖','🎭','🌊','💻','🔭','🎯','✨',
  ];

  const tabs = [
    { id: 'basics',     label: 'Basics',     icon: 'lucide:info' },
    { id: 'appearance', label: 'Appearance',  icon: 'lucide:palette' },
    { id: 'rules',      label: 'Rules',       icon: 'lucide:shield' },
    { id: 'settings',   label: 'Settings',    icon: 'lucide:settings-2' },
  ];

  if (data.canManageModerators) {
    tabs.push({ id: 'moderators', label: 'Moderators', icon: 'lucide:user-plus' });
  }

  // Sync state variables with data prop when it changes
  $effect(() => {
    if (data.community) {
      displayName = data.community.displayName || '';
      description = data.community.description || '';
      rules = data.community.rules?.length 
        ? data.community.rules.map((r: { title: string; description?: string } | string) => typeof r === 'string' ? r : r.title)
        : [''];
      
      // Update appearance state
      iconMode = data.community.icon && (data.community.icon.includes('http') || data.community.icon.includes('://')) ? 'url' : 'emoji';
      iconEmoji = data.community.icon && !data.community.icon.includes('http') && !data.community.icon.includes('://') ? data.community.icon : '🌐';
      iconUrl = data.community.icon && (data.community.icon.includes('http') || data.community.icon.includes('://')) ? data.community.icon : '';
      bannerMode = data.community.banner ? 'url' : 'none';
      bannerUrl = data.community.banner || '';
      bannerPreview = data.community.banner || '';
      themeColor = data.community.themeColor || '#4f46e5';
      
      // Update settings state
      nsfw = data.community.nsfw || false;
      restrictPosting = data.community.restrictPosting || false;
      requireApproval = data.community.requireApproval || false;
      hideDiscovery = data.community.hideDiscovery || false;
      allowLinks = data.community.allowLinks ?? true;
      allowMedia = data.community.allowMedia ?? true;
      allowPolls = data.community.allowPolls ?? true;
      archived = data.community.archived || false;
    }
  });

  function handleIconFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    iconFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => { iconPreview = ev.target?.result as string; };
    reader.readAsDataURL(file);
  }

  function handleBannerFile(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    bannerFile = file;
    const reader = new FileReader();
    reader.onload = (ev) => { bannerPreview = ev.target?.result as string; };
    reader.readAsDataURL(file);
  }

  function clearBanner() { bannerFile = null; bannerPreview = ''; bannerUrl = ''; bannerMode = 'none'; }
  function clearIcon()  { iconFile = null; iconPreview = ''; iconUrl = ''; iconMode = 'emoji'; }

  function addRule()             { rules = [...rules, '']; }
  function removeRule(i: number) { if (rules.length > 1) rules = rules.filter((_, idx) => idx !== i); }
  function updateRule(i: number, v: string) { rules = rules.map((r, idx) => idx === i ? v : r); }
  function moveUp(i: number)   { if (i === 0) return; [rules[i-1], rules[i]] = [rules[i], rules[i-1]]; rules = [...rules]; }
  function moveDown(i: number) { if (i === rules.length - 1) return; [rules[i], rules[i+1]] = [rules[i+1], rules[i]]; rules = [...rules]; }

  let currentIconSrc = $derived(
    iconMode === 'upload' && iconPreview ? iconPreview :
    iconMode === 'url'    && iconUrl     ? iconUrl : ''
  );

  let currentBannerSrc = $derived(
    bannerMode === 'upload' && bannerPreview ? bannerPreview :
    bannerMode === 'url'    && bannerUrl     ? bannerUrl : ''
  );

  let previewIcon = $derived(
    iconMode === 'emoji' ? iconEmoji :
    currentIconSrc || '🌐'
  );

  let rulesValue = $derived(rules.filter(r => r.trim()).join('\n'));

  async function handleSubmit(e: Event) {
    e.preventDefault();
    error = '';
    saveSuccess = false;

    try {
      const formData = new FormData();
      
      // Add basic fields
      formData.append('displayName', displayName);
      formData.append('description', description);
      formData.append('themeColor', themeColor);
      formData.append('rules', rulesValue);
      
      // Add appearance fields based on mode
      if (iconMode === 'emoji') {
        formData.append('icon', iconEmoji);
      } else if (iconMode === 'url') {
        formData.append('icon', iconUrl);
      } else if (iconMode === 'upload' && iconFile) {
        formData.append('icon', iconFile);
      }
      
      if (bannerMode === 'url') {
        formData.append('banner', bannerUrl);
      } else if (bannerMode === 'upload' && bannerFile) {
        formData.append('banner', bannerFile);
      }
      
      // Add settings
      formData.append('nsfw', nsfw ? 'on' : 'off');
      formData.append('requireApproval', requireApproval ? 'on' : 'off');
      formData.append('restrictPosting', restrictPosting ? 'on' : 'off');
      formData.append('hideDiscovery', hideDiscovery ? 'on' : 'off');
      formData.append('archived', archived ? 'on' : 'off');
      formData.append('allowLinks', allowLinks ? 'on' : 'off');
      formData.append('allowMedia', allowMedia ? 'on' : 'off');
      formData.append('allowPolls', allowPolls ? 'on' : 'off');

      const response = await fetch('?/updateSettings', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        saveSuccess = true;
        // Clear file inputs and previews after successful save
        iconFile = null;
        bannerFile = null;
        iconPreview = '';
        bannerPreview = '';
        if (iconInputEl) iconInputEl.value = '';
        if (bannerInputEl) bannerInputEl.value = '';
        setTimeout(() => saveSuccess = false, 3000);
      } else {
        const result = await response.json().catch(() => ({}));
        error = result.error || 'Failed to save changes';
      }
    } catch (err) {
      error = 'Network error occurred';
      console.error('Form submission error:', err);
    }
  }
</script>

<svelte:head>
  <title>Mod Tools · c/{data.community?.name ?? ''} — Nexus</title>
</svelte:head>

{#if data.community}

<div class="mod-page">

  <!-- Page header -->
  <div class="mod-header">
    <div class="mod-header-left">
      <a href="/c/{data.community.name}" class="back-btn">
        <Icon icon="lucide:arrow-left" width="14" height="14" />
      </a>
      <div class="community-chip">
        <div class="chip-av">
          {#if currentIconSrc}
            <img src={currentIconSrc} alt="" />
          {:else}
            <span>{iconEmoji}</span>
          {/if}
        </div>
        <span class="chip-name">c/{data.community.name}</span>
      </div>
      <Icon icon="lucide:chevron-right" width="12" height="12" class="sep-icon" />
      <span class="page-title">Mod tools</span>
    </div>
  </div>

  <!-- Main shell -->
  <div class="mod-shell">

    <!-- Shell header: banner + meta + tab bar -->
    <div class="shell-header">
      <div class="shell-banner">
        {#if currentBannerSrc}
          <img src={currentBannerSrc} alt="" class="shell-banner-img" />
        {/if}
      </div>
      <div class="shell-meta">
        <div class="shell-av">
          {#if currentIconSrc}
            <img src={currentIconSrc} alt="" />
          {:else}
            <span>{iconEmoji}</span>
          {/if}
        </div>
        <div>
          <p class="shell-name">{displayName || data.community.name}</p>
          <p class="shell-sub">
            c/{data.community.name} ·
            {(data.community.memberCount ?? 1248).toLocaleString()} members ·
            {(data.community.postCount ?? 4302).toLocaleString()} posts
          </p>
        </div>
      </div>

      <!-- Horizontal tab bar -->
      <div class="tab-bar">
        {#each tabs as tab}
          <button
            class="tab-btn"
            class:active={activeTab === tab.id}
            onclick={() => activeTab = tab.id}
          >
            <Icon icon={tab.icon} width="14" height="14" />
            {tab.label}
          </button>
        {/each}
      </div>
    </div>

    <!-- Panel content -->
    <div class="panel">

      {#if saveSuccess}
        <div class="alert success">
          <Icon icon="lucide:check-circle" width="14" height="14" />
          Changes saved successfully.
        </div>
      {/if}
      {#if error}
        <div class="alert error">
          <Icon icon="lucide:alert-circle" width="14" height="14" />
          {error}
        </div>
      {/if}

      {#if activeTab !== 'moderators'}
        <form onsubmit={handleSubmit}>
          <!-- Hidden inputs removed since we're handling form data manually -->

        <!-- ═ BASICS ═ -->
        {#if activeTab === 'basics'}
          <div class="two-col">
            <div class="field">
              <label class="field-label">Community name</label>
              <div class="name-wrap">
                <span class="name-prefix">c/</span>
                <input class="input name-input" value={data.community.name} disabled readonly />
                <span class="locked-badge">
                  <Icon icon="lucide:lock" width="11" height="11" /> Locked
                </span>
              </div>
              <p class="hint">Community names can't be changed after creation.</p>
            </div>
            <div class="field">
              <label class="field-label">
                Display name
                <input name="displayName" class="input" bind:value={displayName} maxlength="50" placeholder="e.g. Technology Enthusiasts" />
                <div class="char-count">{displayName.length}/50</div>
              </label>
            </div>
          </div>
          <div class="field" style="margin-top: 1rem">
            <label class="field-label">
              Description
              <textarea name="description" class="textarea" bind:value={description} rows="5" maxlength="500" placeholder="Tell potential members what this community is about..."></textarea>
              <div class="char-count">{description.length}/500</div>
            </label>
          </div>
          <div class="panel-actions">
            <a href="/c/{data.community.name}" class="btn-ghost">Cancel</a>
            <button type="submit" class="btn-primary">
              <Icon icon="lucide:save" width="13" height="13" /> Save changes
            </button>
          </div>

        <!-- ═ APPEARANCE ═ -->
        {:else if activeTab === 'appearance'}
          <div class="two-col">
            <div class="field">
              <p class="field-label-plain">Banner image</p>
              <div class="banner-area">
                {#if currentBannerSrc}
                  <img src={currentBannerSrc} alt="banner" class="banner-img" />
                  <button type="button" class="banner-remove" onclick={clearBanner}>
                    <Icon icon="lucide:x" width="12" height="12" />
                  </button>
                {:else}
                  <div class="banner-empty">
                    <Icon icon="lucide:image" width="20" height="20" />
                    <p>No banner set</p>
                  </div>
                {/if}
              </div>
              <div class="mode-tabs">
                <button type="button" class="mode-tab" class:active={bannerMode === 'upload'} onclick={() => bannerMode = 'upload'}>
                  <Icon icon="lucide:upload" width="12" height="12" /> Upload
                </button>
                <button type="button" class="mode-tab" class:active={bannerMode === 'url'} onclick={() => { 
                  bannerMode = 'url'; 
                  bannerUrl = data.community?.banner || bannerUrl || ''; 
                }}>
                  <Icon icon="lucide:link" width="12" height="12" /> URL
                </button>
              </div>
              {#if bannerMode === 'upload'}
                <div class="dropzone" onclick={() => bannerInputEl?.click()} role="button" tabindex="0">
                  <Icon icon="lucide:image-plus" width="18" height="18" />
                  <span>{bannerFile ? bannerFile.name : 'Click or drag to upload'}</span>
                  <span class="dropzone-hint">JPG, PNG · 1920×320 recommended</span>
                  <input bind:this={bannerInputEl} type="file" accept="image/*" class="file-hidden" onchange={handleBannerFile} />
                </div>
              {:else if bannerMode === 'url'}
                <div class="url-row">
                  <Icon icon="lucide:link-2" width="14" height="14" />
                  <input name="banner" class="input" bind:value={bannerUrl} type="url" placeholder="https://example.com/banner.png" />
                </div>
              {/if}
            </div>

            <div class="field">
              <p class="field-label-plain">Community icon</p>
              <div class="icon-preview-row">
                <CommunityAvatar icon={previewIcon} size="lg" name={data.community.name} />
                <div>
                  <p class="hint" style="max-width:220px">Appears next to your community name throughout Nexus.</p>
                  <button type="button" class="btn-ghost-sm" onclick={() => { clearIcon(); iconMode = 'emoji'; }}>
                    <Icon icon="lucide:refresh-ccw" width="11" height="11" /> Reset
                  </button>
                </div>
              </div>
              <div class="mode-tabs">
                <button type="button" class="mode-tab" class:active={iconMode === 'emoji'}  onclick={() => iconMode = 'emoji'}>
                  <Icon icon="lucide:smile" width="12" height="12" /> Emoji
                </button>
                <button type="button" class="mode-tab" class:active={iconMode === 'upload'} onclick={() => iconMode = 'upload'}>
                  <Icon icon="lucide:upload" width="12" height="12" /> Upload
                </button>
                <button type="button" class="mode-tab" class:active={iconMode === 'url'}    onclick={() => { 
                  iconMode = 'url'; 
                  iconUrl = (data.community?.icon && (data.community.icon.includes('http') || data.community.icon.includes('://'))) 
                    ? data.community.icon 
                    : iconUrl || ''; 
                }}>
                  <Icon icon="lucide:link" width="12" height="12" /> URL
                </button>
              </div>
              {#if iconMode === 'emoji'}
                <div class="emoji-grid">
                  {#each emojiPresets as preset}
                    <button type="button" class="emoji-btn" class:selected={iconEmoji === preset && !currentIconSrc}
                      onclick={() => { iconEmoji = preset; iconUrl = ''; iconMode = 'emoji'; }}>
                      {preset}
                    </button>
                  {/each}
                </div>
                <div class="custom-emoji-row">
                  <span class="field-label-sm">Custom</span>
                  <input name="icon" class="input emoji-input" bind:value={iconEmoji} maxlength="4" placeholder="🌐" oninput={() => { iconUrl = ''; iconMode = 'emoji'; }} />
                </div>
              {:else if iconMode === 'upload'}
                <div class="dropzone dropzone-sm" onclick={() => iconInputEl?.click()} role="button" tabindex="0">
                  <Icon icon="lucide:image-plus" width="18" height="18" />
                  <span>{iconFile ? iconFile.name : 'Click or drag to upload icon'}</span>
                  <span class="dropzone-hint">PNG · Square · Min 256×256px</span>
                  <input bind:this={iconInputEl} type="file" accept="image/*" class="file-hidden" onchange={handleIconFile} />
                </div>
              {:else if iconMode === 'url'}
                <div class="url-row">
                  <Icon icon="lucide:link-2" width="14" height="14" />
                  <input name="icon" class="input" bind:value={iconUrl} type="url" placeholder="https://example.com/icon.png" />
                </div>
              {/if}
            </div>
          </div>

          <div class="field" style="margin-top:1rem">
            <p class="field-label-plain">Community color</p>
            <div class="color-row">
              <input type="color" class="color-swatch" bind:value={themeColor} />
              <input type="text" class="input color-text" bind:value={themeColor} maxlength="7" placeholder="#4f46e5" />
              <p class="hint">Used for accent highlights and member badges.</p>
            </div>
          </div>
          <div class="panel-actions">
            <a href="/c/{data.community.name}" class="btn-ghost">Cancel</a>
            <button type="submit" class="btn-primary">
              <Icon icon="lucide:save" width="13" height="13" /> Save changes
            </button>
          </div>

        <!-- ═ RULES ═ -->
        {:else if activeTab === 'rules'}
          <div class="rules-list">
            {#each rules as rule, i}
              <div class="rule-card">
                <div class="rule-header">
                  <span class="rule-num">Rule {i + 1}</span>
                  <div class="rule-btns">
                    <button type="button" class="rule-btn" onclick={() => moveUp(i)} disabled={i === 0}>
                      <Icon icon="lucide:chevron-up" width="13" height="13" />
                    </button>
                    <button type="button" class="rule-btn" onclick={() => moveDown(i)} disabled={i === rules.length - 1}>
                      <Icon icon="lucide:chevron-down" width="13" height="13" />
                    </button>
                    <button type="button" class="rule-btn rule-remove" onclick={() => removeRule(i)} disabled={rules.length <= 1}>
                      <Icon icon="lucide:trash-2" width="12" height="12" />
                    </button>
                  </div>
                </div>
                <input type="text" class="input" value={rule}
                  placeholder="Describe rule {i + 1}…"
                  oninput={(e) => updateRule(i, (e.target as HTMLInputElement).value)} />
              </div>
            {/each}
          </div>
          <button type="button" class="add-rule-btn" onclick={addRule}>
            <Icon icon="lucide:plus-circle" width="14" height="14" /> Add a rule
          </button>
          <input type="hidden" name="rules" value={rulesValue} />
          <div class="panel-actions">
            <a href="/c/{data.community.name}" class="btn-ghost">Cancel</a>
            <button type="submit" class="btn-primary">
              <Icon icon="lucide:save" width="13" height="13" /> Save changes
            </button>
          </div>

        <!-- ═ SETTINGS ═ -->
        {:else if activeTab === 'settings'}
          <div class="two-col" style="gap: 1.25rem">
            <div>
              <p class="sec-label">Visibility &amp; access</p>
              <div class="toggle-list" style="margin-bottom:1rem">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <p class="toggle-label"><Icon icon="lucide:user-check" width="13" height="13" /> Require approval to join</p>
                    <p class="toggle-desc">New members must be approved by a moderator.</p>
                  </div>
                  <label class="switch"><input type="checkbox" bind:checked={requireApproval} /><span class="track"><span class="thumb"></span></span></label>
                </div>
                <div class="toggle-row">
                  <div class="toggle-info">
                    <p class="toggle-label"><Icon icon="lucide:lock" width="13" height="13" /> Restrict posting</p>
                    <p class="toggle-desc">Only approved members can submit new posts.</p>
                  </div>
                  <label class="switch"><input type="checkbox" bind:checked={restrictPosting} /><span class="track"><span class="thumb"></span></span></label>
                </div>
                <div class="toggle-row">
                  <div class="toggle-info">
                    <p class="toggle-label"><Icon icon="lucide:eye-off" width="13" height="13" /> Hide from discovery</p>
                    <p class="toggle-desc">Won't appear in search or recommended feeds.</p>
                  </div>
                  <label class="switch"><input type="checkbox" bind:checked={hideDiscovery} /><span class="track"><span class="thumb"></span></span></label>
                </div>
              </div>
              <p class="sec-label">Community status</p>
              <div class="toggle-list">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <p class="toggle-label"><Icon icon="lucide:archive" width="13" height="13" /> Archive community</p>
                    <p class="toggle-desc">No new posts or comments. Content stays visible.</p>
                  </div>
                  <label class="switch"><input type="checkbox" bind:checked={archived} /><span class="track"><span class="thumb"></span></span></label>
                </div>
              </div>
            </div>
            <div>
              <p class="sec-label">Content permissions</p>
              <div class="toggle-list" style="margin-bottom:1rem">
                <div class="toggle-row">
                  <div class="toggle-info">
                    <p class="toggle-label"><Icon icon="lucide:triangle-alert" width="13" height="13" /> NSFW community</p>
                    <p class="toggle-desc">Mark as 18+. Users must opt in to see posts.</p>
                  </div>
                  <label class="switch"><input type="checkbox" bind:checked={nsfw} /><span class="track"><span class="thumb"></span></span></label>
                </div>
                <div class="toggle-row">
                  <div class="toggle-info">
                    <p class="toggle-label"><Icon icon="lucide:link" width="13" height="13" /> Allow link posts</p>
                    <p class="toggle-desc">Members can submit external link posts.</p>
                  </div>
                  <label class="switch"><input type="checkbox" bind:checked={allowLinks} /><span class="track"><span class="thumb"></span></span></label>
                </div>
                <div class="toggle-row">
                  <div class="toggle-info">
                    <p class="toggle-label"><Icon icon="lucide:image" width="13" height="13" /> Allow image &amp; video posts</p>
                    <p class="toggle-desc">Members can attach media to submissions.</p>
                  </div>
                  <label class="switch"><input type="checkbox" bind:checked={allowMedia} /><span class="track"><span class="thumb"></span></span></label>
                </div>
                <div class="toggle-row">
                  <div class="toggle-info">
                    <p class="toggle-label"><Icon icon="lucide:bar-chart-2" width="13" height="13" /> Allow polls</p>
                    <p class="toggle-desc">Members can create poll posts in this community.</p>
                  </div>
                  <label class="switch"><input type="checkbox" bind:checked={allowPolls} /><span class="track"><span class="thumb"></span></span></label>
                </div>
              </div>
              <div class="danger-zone">
                <div class="danger-header">
                  <Icon icon="lucide:triangle-alert" width="13" height="13" /> Danger zone
                </div>
                <div class="danger-body">
                  <div class="danger-row">
                    <div>
                      <p class="danger-title">Delete this community</p>
                      <p class="danger-desc">Permanently removes the community and all its content. Cannot be undone.</p>
                    </div>
                    <button type="button" class="btn-danger">
                      <Icon icon="lucide:trash-2" width="12" height="12" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="panel-actions">
            <a href="/c/{data.community.name}" class="btn-ghost">Cancel</a>
            <button type="submit" class="btn-primary">
              <Icon icon="lucide:save" width="13" height="13" /> Save changes
            </button>
          </div>
        {/if}

      </form>
      {/if}

      <!-- ═ MODERATORS ═ -->
      {#if activeTab === 'moderators' && data.canManageModerators}
        <div class="mod-content">
          <p class="sec-label">Add moderator</p>
          <div class="search-section">
            <div class="search-input-wrapper">
              <input
                type="text"
                class="input"
                bind:value={searchQuery}
                placeholder="Search community members..."
                maxlength="32"
                oninput={async (e) => {
                  const query = (e.target as HTMLInputElement).value.trim();
                  if (query.length < 1) {
                    searchResults = [];
                    return;
                  }
                  isSearching = true;
                  try {
                    const formData = new FormData();
                    formData.append('query', query);
                    const response = await fetch('?/searchMembers', {
                      method: 'POST',
                      body: formData
                    });
                    if (response.ok) {
                      const result = await response.json() as { members: Array<{ id: string; username: string }> };
                      searchResults = result.members || [];
                    } else {
                      searchResults = [];
                    }
                  } catch (err) {
                    console.error('Search error:', err);
                    searchResults = [];
                  } finally {
                    isSearching = false;
                  }
                }}
              />
              {#if isSearching}
                <div class="search-spinner">
                  <Icon icon="lucide:loader" width="16" height="16" />
                </div>
              {/if}
            </div>

            {#if searchResults.length > 0}
              <div class="search-results">
                {#each searchResults as member (member.id)}
                  <button
                    type="button"
                    class="search-result-item"
                    class:selected={selectedMember?.id === member.id}
                    onclick={() => {
                      selectedMember = member;
                      searchQuery = member.username;
                      searchResults = [];
                    }}
                  >
                    <Icon icon="lucide:user" width="14" height="14" />
                    <span class="username">{member.username}</span>
                  </button>
                {/each}
              </div>
            {/if}
          </div>

          {#if selectedMember}
            <div class="selected-member">
              <div class="member-chip">
                <Icon icon="lucide:user-circle" width="16" height="16" />
                <span>{selectedMember.username}</span>
              </div>
              <form onsubmit={async (e) => {
                e.preventDefault();
                if (!selectedMember) return;
                error = '';
                try {
                  const formData = new FormData();
                  formData.append('username', selectedMember.username);
                  const response = await fetch('?/addModerator', {
                    method: 'POST',
                    body: formData
                  });
                  if (response.ok) {
                    selectedMember = null;
                    searchQuery = '';
                    searchResults = [];
                    // Reload page to update moderator list
                    window.location.reload();
                  } else {
                    const result = await response.json().catch(() => ({}));
                    error = result.error || 'Failed to add moderator';
                  }
                } catch (err) {
                  error = 'Network error occurred';
                  console.error('Add moderator error:', err);
                }
              }} class="add-mod-form">
                <button type="submit" class="btn-primary">
                  <Icon icon="lucide:user-plus" width="13" height="13" /> Add as moderator
                </button>
                <button
                  type="button"
                  class="btn-ghost"
                  onclick={() => {
                    selectedMember = null;
                    searchQuery = '';
                    searchResults = [];
                  }}
                >
                  Cancel
                </button>
              </form>
            </div>
          {/if}
          <p class="hint">Search and select a community member to promote to moderator.</p>

          <p class="sec-label" style="margin-top: 1.5rem">Current moderators</p>
          {#if data.moderators && data.moderators.length > 0}
            <div class="mod-list">
              {#each data.moderators as mod}
                <div class="mod-item">
                  <div class="mod-info">
                    <p class="mod-username">{mod.username}</p>
                    <div class="mod-badges">
                      <span class="badge" class:badge-owner={mod.role === 'owner'} class:badge-mod={mod.role === 'moderator'}>
                        {mod.role === 'owner' ? 'Owner' : 'Moderator'}
                      </span>
                      {#if mod.isAdmin}
                        <span class="badge badge-admin">Site Admin</span>
                      {/if}
                    </div>
                  </div>
                  {#if mod.role !== 'owner' && !mod.isAdmin && data.canManageModerators}
                    <form onsubmit={async (e) => {
                      e.preventDefault();
                      error = '';
                      try {
                        const formData = new FormData();
                        formData.append('userId', mod.id);
                        const response = await fetch('?/removeModerator', {
                          method: 'POST',
                          body: formData
                        });
                        if (response.ok) {
                          // Reload page to update moderator list
                          window.location.reload();
                        } else {
                          const result = await response.json().catch(() => ({}));
                          error = result.error || 'Failed to remove moderator';
                        }
                      } catch (err) {
                        error = 'Network error occurred';
                        console.error('Remove moderator error:', err);
                      }
                    }} class="remove-mod-form">
                      <button type="submit" class="btn-ghost-sm btn-remove">
                        <Icon icon="lucide:trash-2" width="12" height="12" /> Remove
                      </button>
                    </form>
                  {/if}
                </div>
              {/each}
            </div>
          {:else}
            <div class="empty-state">
              <Icon icon="lucide:users" width="24" height="24" />
              <p>No moderators yet</p>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

{:else}
  <div class="not-found">
    <Icon icon="lucide:search-x" width="40" height="40" />
    <h2>Community not found</h2>
    <p>This community doesn't exist or you don't have permission to edit it.</p>
    <a href="/communities" class="btn-primary">Browse communities</a>
  </div>
{/if}

<style>
  .mod-page { padding: 1rem 0; }

  .mod-header {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
  }
  .mod-header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
  }
  .back-btn {
    width: 28px; height: 28px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text-secondary);
    display: flex; align-items: center; justify-content: center;
    text-decoration: none;
    transition: background 0.12s;
    flex-shrink: 0;
  }
  .back-btn:hover { background: var(--surface-raised); }
  .community-chip {
    display: flex; align-items: center; gap: 5px;
    padding: 3px 8px 3px 4px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: var(--surface);
    font-size: 0.8rem; font-weight: 600;
    color: var(--text-secondary);
  }
  .chip-av {
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--surface-raised);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.65rem; overflow: hidden;
  }
  .chip-av img { width: 100%; height: 100%; object-fit: cover; }
  .chip-name { color: var(--text-primary); }
  :global(.sep-icon) { color: var(--border); }
  .page-title { font-weight: 700; color: var(--text-primary); }

  /* Shell */
  .mod-shell {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 14px;
    overflow: hidden;
  }

  /* Shell header */
  .shell-header {
    border-bottom: 1px solid var(--border);
  }
  .shell-banner {
    height: 80px;
    background: var(--surface-raised);
    overflow: hidden;
  }
  .shell-banner-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .shell-meta {
    display: flex; align-items: flex-end; gap: 12px;
    padding: 0 1.25rem 0.875rem;
  }
  .shell-av {
    width: 48px; height: 48px; border-radius: 50%;
    border: 3px solid var(--surface);
    background: var(--surface-raised);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.375rem; overflow: hidden; flex-shrink: 0;
    margin-top: -24px; position: relative; z-index: 1;
  }
  .shell-av img { width: 100%; height: 100%; object-fit: cover; }
  .shell-name { font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0; }
  .shell-sub { font-size: 0.775rem; color: var(--text-muted); margin: 0.15rem 0 0; }

  /* Tab bar */
  .tab-bar {
    display: flex;
    padding: 0 1.25rem;
    overflow-x: auto;
  }
  .tab-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 0.625rem 1rem;
    border: none; background: none;
    color: var(--text-secondary);
    font-size: 0.8125rem; font-weight: 500;
    font-family: inherit; cursor: pointer;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: color 0.12s, border-color 0.12s;
  }
  .tab-btn:hover { color: var(--text-primary); }
  .tab-btn.active { color: var(--accent); font-weight: 700; border-bottom-color: var(--accent); }

  /* Panel */
  .panel { padding: 1.375rem 1.5rem; }

  .alert {
    display: flex; align-items: center; gap: 6px;
    padding: 0.625rem 0.875rem;
    border-radius: 9px; font-size: 0.8125rem; font-weight: 500;
    margin-bottom: 1rem;
  }
  .alert.success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
  .alert.error   { background: #fef2f2; color: #b91c1c; border: 1px solid #fecaca; }

  /* Two-column layout */
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }

  /* Fields */
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label {
    display: flex; flex-direction: column; gap: 5px;
    font-size: 0.8125rem; font-weight: 600; color: var(--text-primary);
  }
  .field-label-plain { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin: 0; }
  .field-label-sm { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
  .hint { font-size: 0.75rem; color: var(--text-muted); margin: 0; line-height: 1.4; }
  .char-count { font-size: 0.7rem; color: var(--text-muted); text-align: right; }

  .sec-label {
    font-size: 0.68rem; font-weight: 800;
    text-transform: uppercase; letter-spacing: 0.08em;
    color: var(--text-muted);
    margin: 0 0 0.625rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  .input, .textarea {
    width: 100%;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface-raised);
    color: var(--text-primary);
    font-size: 0.8125rem;
    padding: 0.575rem 0.8rem;
    font-family: inherit;
    transition: border-color 0.15s, box-shadow 0.15s;
    box-sizing: border-box;
  }
  .input:focus, .textarea:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
  }
  .input:disabled { opacity: 0.55; cursor: not-allowed; background: var(--surface); }
  .textarea { resize: vertical; min-height: 100px; }

  .name-wrap { position: relative; display: flex; align-items: center; }
  .name-prefix { position: absolute; left: 0.75rem; color: var(--text-muted); font-size: 0.8125rem; pointer-events: none; z-index: 1; }
  .name-input { padding-left: 1.75rem !important; }
  .locked-badge {
    position: absolute; right: 0.625rem;
    display: flex; align-items: center; gap: 3px;
    font-size: 0.7rem; color: var(--text-muted);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 5px; padding: 2px 6px;
  }

  /* Mode tabs */
  .mode-tabs {
    display: flex; gap: 3px;
    background: var(--surface-raised);
    border-radius: 8px; padding: 3px;
    width: fit-content; border: 1px solid var(--border);
    margin-bottom: 8px;
  }
  .mode-tab {
    display: flex; align-items: center; gap: 4px;
    padding: 4px 10px;
    border-radius: 6px; border: none; background: none;
    color: var(--text-secondary);
    font-size: 0.75rem; font-weight: 600;
    cursor: pointer; font-family: inherit;
    transition: background 0.1s, color 0.1s;
  }
  .mode-tab:hover { color: var(--text-primary); }
  .mode-tab.active { background: var(--surface); color: var(--accent); box-shadow: 0 1px 3px rgba(0,0,0,0.07); }

  /* Banner */
  .banner-area {
    height: 110px; border-radius: 9px;
    background: var(--surface-raised); border: 1px solid var(--border);
    overflow: hidden; display: flex; align-items: center; justify-content: center;
    position: relative; margin-bottom: 8px;
  }
  .banner-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .banner-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--text-muted); font-size: 0.8rem; }
  .banner-remove {
    position: absolute; top: 6px; right: 6px;
    width: 22px; height: 22px; border-radius: 50%;
    background: rgba(0,0,0,0.5); color: white; border: none;
    display: flex; align-items: center; justify-content: center; cursor: pointer;
  }

  /* Dropzone */
  .dropzone {
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
    border: 1.5px dashed var(--border); border-radius: 9px;
    padding: 1.25rem; cursor: pointer;
    color: var(--text-muted); font-size: 0.8rem; text-align: center;
    background: var(--surface-raised); transition: border-color 0.12s, color 0.12s;
  }
  .dropzone:hover { border-color: var(--accent); color: var(--accent); }
  .dropzone-hint { font-size: 0.7rem; color: var(--text-muted); }
  .file-hidden { display: none; }

  /* Icon */
  .icon-preview-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .icon-preview-row :global(.community-avatar) { width: 56px; height: 56px; }
  .emoji-grid { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; margin-bottom: 8px; }
  .emoji-btn {
    aspect-ratio: 1; border-radius: 7px; border: 1px solid var(--border);
    background: var(--surface-raised); font-size: 1rem;
    display: grid; place-items: center; cursor: pointer;
    transition: border-color 0.1s, transform 0.1s;
  }
  .emoji-btn:hover { border-color: var(--accent); transform: scale(1.1); }
  .emoji-btn.selected { border-color: var(--accent); background: color-mix(in srgb, var(--accent) 12%, var(--surface)); }
  .custom-emoji-row { display: flex; align-items: center; gap: 8px; }
  .emoji-input { max-width: 80px; text-align: center; }
  .url-row { display: flex; align-items: center; gap: 6px; color: var(--text-muted); }
  .url-row .input { flex: 1; }
  .color-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .color-swatch { width: 36px; height: 36px; padding: 2px; border-radius: 8px; border: 1px solid var(--border); background: var(--surface-raised); cursor: pointer; }
  .color-text { max-width: 100px; }

  /* Rules */
  .rules-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
  .rule-card {
    border: 1px solid var(--border); border-radius: 9px;
    padding: 10px 12px; background: var(--surface-raised);
    display: flex; flex-direction: column; gap: 6px;
  }
  .rule-header { display: flex; align-items: center; justify-content: space-between; }
  .rule-num { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
  .rule-btns { display: flex; gap: 2px; }
  .rule-btn {
    width: 24px; height: 24px; border-radius: 6px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text-muted); display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: color 0.1s, border-color 0.1s;
  }
  .rule-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); }
  .rule-btn.rule-remove:hover:not(:disabled) { color: #ef4444; border-color: #ef4444; }
  .rule-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .add-rule-btn {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 12px;
    border-radius: 8px; border: 1.5px dashed var(--border);
    background: none; color: var(--accent);
    font-size: 0.8rem; font-weight: 600; cursor: pointer; font-family: inherit;
    transition: background 0.1s, border-color 0.1s;
  }
  .add-rule-btn:hover { background: color-mix(in srgb, var(--accent) 6%, transparent); border-color: var(--accent); }

  /* Toggles */
  .toggle-list { border: 1px solid var(--border); border-radius: 9px; overflow: hidden; }
  .toggle-row {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 10px 13px; border-bottom: 1px solid var(--border);
    background: var(--surface-raised);
  }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-info { flex: 1; }
  .toggle-label { display: flex; align-items: center; gap: 5px; font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin: 0 0 2px; }
  .toggle-desc { font-size: 0.75rem; color: var(--text-muted); margin: 0; line-height: 1.4; }
  .switch { position: relative; display: inline-flex; cursor: pointer; flex-shrink: 0; }
  .switch input { position: absolute; opacity: 0; width: 0; height: 0; }
  .track { width: 36px; height: 20px; background: var(--border); border-radius: 999px; position: relative; transition: background 0.18s; }
  .switch input:checked ~ .track { background: var(--accent); }
  .thumb { position: absolute; top: 3px; left: 3px; width: 14px; height: 14px; background: white; border-radius: 50%; transition: transform 0.18s; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
  .switch input:checked ~ .track .thumb { transform: translateX(16px); }

  /* Danger zone */
  .danger-zone { border: 1px solid #fecaca; border-radius: 9px; overflow: hidden; }
  .danger-header { display: flex; align-items: center; gap: 5px; padding: 7px 12px; background: #fef2f2; color: #b91c1c; font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; border-bottom: 1px solid #fecaca; }
  .danger-body { padding: 12px; }
  .danger-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .danger-title { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin: 0 0 2px; }
  .danger-desc { font-size: 0.75rem; color: var(--text-muted); margin: 0; line-height: 1.4; }

  /* Buttons */
  .panel-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 1rem; border-top: 1px solid var(--border); margin-top: 1rem; }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 0.55rem 1.125rem;
    border-radius: 8px; border: none; background: var(--accent); color: white;
    font-size: 0.8125rem; font-weight: 700; cursor: pointer; font-family: inherit;
    text-decoration: none; transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.88; }
  .btn-ghost {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 0.55rem 1rem;
    border-radius: 8px; border: 1px solid var(--border);
    background: var(--surface); color: var(--text-secondary);
    font-size: 0.8125rem; font-weight: 600; cursor: pointer; font-family: inherit;
    text-decoration: none; transition: background 0.12s, color 0.12s;
  }
  .btn-ghost:hover { background: var(--surface-raised); color: var(--text-primary); }
  .btn-ghost-sm {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 3px 8px; border-radius: 6px;
    border: 1px solid var(--border); background: var(--surface);
    color: var(--text-muted); font-size: 0.72rem; font-weight: 600;
    cursor: pointer; font-family: inherit; transition: color 0.1s, border-color 0.1s;
  }
  .btn-ghost-sm:hover { color: var(--text-primary); border-color: var(--accent); }
  .btn-danger {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 5px 10px; border-radius: 8px;
    border: 1px solid #fecaca; background: #fef2f2; color: #b91c1c;
    font-size: 0.8rem; font-weight: 700; cursor: pointer; font-family: inherit;
    white-space: nowrap; flex-shrink: 0; transition: background 0.12s;
  }
  .btn-danger:hover { background: #fee2e2; }
  .btn-remove { color: #ef4444; border-color: #fecaca; }
  .btn-remove:hover { color: #dc2626; border-color: #fca5a5; }

  /* Moderators */
  .mod-content { padding-bottom: 1rem; }
  .search-section { position: relative; margin-bottom: 1rem; }
  .search-input-wrapper { position: relative; }
  .search-spinner { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); animation: spin 1s linear infinite; }
  @keyframes spin { from { transform: translateY(-50%) rotate(0deg); } to { transform: translateY(-50%) rotate(360deg); } }
  .search-results {
    position: absolute; top: 100%; left: 0; right: 0;
    background: var(--surface); border: 1px solid var(--border);
    border-top: none; border-radius: 0 0 8px 8px;
    max-height: 300px; overflow-y: auto;
    z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }
  .search-result-item {
    width: 100%; display: flex; align-items: center; gap: 8px;
    padding: 10px 12px; border: none; background: none;
    color: var(--text-primary); font-size: 0.8125rem;
    cursor: pointer; text-align: left;
    transition: background 0.1s;
    border-bottom: 1px solid var(--border);
  }
  .search-result-item:last-child { border-bottom: none; }
  .search-result-item:hover { background: var(--surface-raised); }
  .search-result-item.selected { background: color-mix(in srgb, var(--accent) 15%, transparent); }
  .search-result-item .username { flex: 1; font-weight: 500; }
  .selected-member { margin-bottom: 1rem; padding: 12px; border-radius: 9px; border: 1px solid var(--border); background: var(--surface-raised); }
  .member-chip { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 8px 12px; border-radius: 8px; background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); font-size: 0.8125rem; font-weight: 600; }
  .add-mod-form { display: flex; gap: 8px; align-items: center; }
  .mod-list { display: flex; flex-direction: column; gap: 8px; }
  .mod-item {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    padding: 12px; border-radius: 9px;
    border: 1px solid var(--border); background: var(--surface-raised);
  }
  .mod-info { flex: 1; }
  .mod-username { font-size: 0.8125rem; font-weight: 600; color: var(--text-primary); margin: 0 0 4px; }
  .mod-badges { display: flex; gap: 5px; flex-wrap: wrap; }
  .badge {
    display: inline-flex; align-items: center;
    padding: 3px 7px; border-radius: 5px;
    font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .badge-owner { background: #fef3c7; color: #92400e; }
  .badge-mod { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); }
  .badge-admin { background: #e0e7ff; color: #3730a3; }
  .remove-mod-form { display: flex; }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 2rem 1rem; text-align: center; color: var(--text-muted); }
  .empty-state p { margin: 0; font-size: 0.875rem; }

  /* Not found */
  .not-found { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 4rem 2rem; text-align: center; color: var(--text-muted); }
  .not-found h2 { margin: 0; color: var(--text-primary); }
  .not-found p { margin: 0; max-width: 36rem; font-size: 0.875rem; line-height: 1.6; }

  /* Responsive */
  @media (max-width: 680px) {
    .two-col { grid-template-columns: 1fr; }
    .emoji-grid { grid-template-columns: repeat(7, 1fr); }
    .danger-row { flex-direction: column; align-items: flex-start; }
  }
</style>