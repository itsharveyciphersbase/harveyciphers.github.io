/**
 * Renders the blog list from data/posts.json at runtime.
 *
 * "Static host" is not the same as "hardcoded markup": the JSON is a static
 * asset, but the page assembles itself from it, which is the same shape as a
 * headless CMS build without the CMS.
 */
let cache = null;

/** Fetches and memoises the post collection. Resolves relative to the page. */
export async function loadPosts() {
  if (cache) return cache;

  const url = new URL('data/posts.json', document.baseURI);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`Could not load posts (HTTP ${response.status})`);
  }

  const payload = await response.json();
  cache = payload.posts.slice().sort((a, b) => b.date.localeCompare(a.date));
  return cache;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
});

function formatDate(iso) {
  // Parse as UTC so the rendered day never shifts with the reader's timezone.
  const [year, month, day] = iso.split('-').map(Number);
  return dateFormatter.format(new Date(Date.UTC(year, month - 1, day)));
}

function renderPost(post) {
  const item = document.createElement('li');
  item.dataset.topic = post.topic;
  item.dataset.postId = post.id;

  const topic = document.createElement('span');
  topic.className = 'post-topic';
  topic.textContent = post.topic;

  const title = document.createElement('span');
  title.className = 'post-title';
  title.textContent = post.title;

  const meta = document.createElement('span');
  meta.className = 'post-meta';
  meta.textContent = `${formatDate(post.date)} · ${post.readingMinutes} min read`;

  item.append(topic, title, meta);
  return item;
}

export async function initBlog() {
  const list = document.querySelector('.post-list');
  const status = document.querySelector('[data-blog-status]');
  const filters = document.querySelectorAll('.post-filter');
  if (!list) return;

  list.setAttribute('aria-busy', 'true');
  if (status) status.textContent = 'Fetching posts from data/posts.json…';

  let posts;
  try {
    posts = await loadPosts();
  } catch (error) {
    list.setAttribute('aria-busy', 'false');
    if (status) {
      status.textContent =
        'Could not reach data/posts.json. Open the page over http:// rather than file:// — fetch is blocked on the file protocol.';
    }
    console.error('[blog]', error);
    return;
  }

  list.replaceChildren(...posts.map(renderPost));
  list.setAttribute('aria-busy', 'false');
  if (status) {
    status.textContent = `${posts.length} posts rendered from JSON at runtime.`;
  }

  // Rebuild the topic filters from the data rather than trusting the markup.
  const topics = ['all', ...new Set(posts.map((post) => post.topic))];
  const filterBar = document.querySelector('.post-filters');

  if (filterBar) {
    filterBar.replaceChildren(
      ...topics.map((topic, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = index === 0 ? 'post-filter is-active' : 'post-filter';
        button.dataset.filter = topic;
        button.setAttribute('aria-pressed', String(index === 0));
        button.textContent = topic === 'all' ? 'All' : topic[0].toUpperCase() + topic.slice(1);
        return button;
      })
    );
  }

  applyFilters(filterBar || { querySelectorAll: () => filters }, list, status, posts.length);
}

function applyFilters(container, list, status, total) {
  const buttons = container.querySelectorAll('.post-filter');

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;

      buttons.forEach((other) => {
        const isActive = other === button;
        other.classList.toggle('is-active', isActive);
        other.setAttribute('aria-pressed', String(isActive));
      });

      let shown = 0;
      list.querySelectorAll('li').forEach((item) => {
        const matches = filter === 'all' || item.dataset.topic === filter;
        item.hidden = !matches;
        if (matches) shown += 1;
      });

      if (status) {
        status.textContent =
          filter === 'all'
            ? `${total} posts rendered from JSON at runtime.`
            : `Showing ${shown} of ${total} posts tagged “${filter}”.`;
      }
    });
  });
}
