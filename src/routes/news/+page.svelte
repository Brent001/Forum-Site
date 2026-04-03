<script lang="ts">
  const { data = {} } = $props<{ data?: { user?: { username: string } | null } }>();
</script>

<section class="news-page">
  <div class="news-shell">
    <header class="news-header">
      <h1>News</h1>
      <p>Community updates, trending stories, and the latest headlines from Nexus.</p>
    </header>

    <div class="news-empty">
      <p>Stay tuned — this page will show the biggest stories and breaking posts soon.</p>
      <a href="/popular" class="news-link">View popular posts</a>
    </div>
  </div>
</section>

<style>
  .news-page {
    padding: 1.5rem;
    max-width: 880px;
    margin: 0 auto;
  }

  .news-shell {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 2rem;
  }

  .news-header h1 {
    margin: 0;
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .news-header p {
    margin: 0.75rem 0 0;
    color: var(--text-secondary);
    line-height: 1.75;
  }

  .news-empty {
    margin-top: 2rem;
    padding: 1.5rem;
    border: 1px dashed var(--border);
    border-radius: 16px;
    color: var(--text-secondary);
  }

  .news-link {
    display: inline-block;
    margin-top: 1rem;
    color: var(--accent);
    font-weight: 600;
    text-decoration: none;
  }
  .news-link:hover { text-decoration: underline; }
</style>
