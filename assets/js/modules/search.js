/**
 * Client-side full-text search.
 *
 * The canonical answer to "how do I search a site with no backend": ship a
 * prebuilt index as a static asset and query it in the browser. Libraries like
 * Pagefind or Lunr do this at scale; the index here is small enough to score
 * with a few lines, and the mechanics are identical.
 *
 * The UI follows the ARIA combobox pattern, so it is fully keyboard operable.
 */
import { loadPosts } from './blog.js';

/** Field weights — a title hit should outrank a passing mention in a summary. */
const WEIGHTS = { title: 10, tags: 6, topic: 4, summary: 2 };

function buildIndex(posts) {
  return posts.map((post) => ({
    post,
    haystack: {
      title: post.title.toLowerCase(),
      tags: post.tags.join(' ').toLowerCase(),
      topic: post.topic.toLowerCase(),
      summary: post.summary.toLowerCase(),
    },
  }));
}

function score(entry, terms) {
  let total = 0;

  for (const term of terms) {
    let termScore = 0;
    for (const [field, weight] of Object.entries(WEIGHTS)) {
      const value = entry.haystack[field];
      const position = value.indexOf(term);
      if (position === -1) continue;
      // Prefix matches are worth more than matches buried mid-word.
      const isPrefix = position === 0 || value[position - 1] === ' ';
      termScore = Math.max(termScore, weight * (isPrefix ? 1.5 : 1));
    }
    // Every term must appear somewhere: this is an AND search, not an OR.
    if (termScore === 0) return 0;
    total += termScore;
  }

  return total;
}

/** Builds a text node / <mark> mix without ever assigning innerHTML. */
function highlight(text, terms) {
  const fragment = document.createDocumentFragment();
  const lower = text.toLowerCase();

  const ranges = [];
  for (const term of terms) {
    let from = lower.indexOf(term);
    while (from !== -1) {
      ranges.push([from, from + term.length]);
      from = lower.indexOf(term, from + term.length);
    }
  }

  if (!ranges.length) {
    fragment.append(text);
    return fragment;
  }

  ranges.sort((a, b) => a[0] - b[0]);

  const merged = [ranges[0]];
  for (const [start, end] of ranges.slice(1)) {
    const last = merged[merged.length - 1];
    if (start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) fragment.append(text.slice(cursor, start));
    const mark = document.createElement('mark');
    mark.textContent = text.slice(start, end);
    fragment.append(mark);
    cursor = end;
  }
  if (cursor < text.length) fragment.append(text.slice(cursor));

  return fragment;
}

export async function initSearch() {
  const input = document.querySelector('[data-search-input]');
  const results = document.querySelector('[data-search-results]');
  const status = document.querySelector('[data-search-status]');
  if (!input || !results) return;

  let index = [];
  try {
    index = buildIndex(await loadPosts());
  } catch (error) {
    if (status) status.textContent = 'Search index unavailable offline.';
    console.error('[search]', error);
    return;
  }

  if (status) {
    status.textContent = `Index ready — ${index.length} documents, queried entirely in the browser.`;
  }

  let activeIndex = -1;
  let current = [];

  function close() {
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }

  function setActive(next) {
    const options = Array.from(results.querySelectorAll('[role="option"]'));
    if (!options.length) return;

    activeIndex = (next + options.length) % options.length;
    options.forEach((option, i) => {
      const isActive = i === activeIndex;
      option.classList.toggle('is-active', isActive);
      option.setAttribute('aria-selected', String(isActive));
      if (isActive) {
        input.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  function render(query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    if (!terms.length) {
      close();
      results.replaceChildren();
      if (status) {
        status.textContent = `Index ready — ${index.length} documents, queried entirely in the browser.`;
      }
      return;
    }

    current = index
      .map((entry) => ({ entry, value: score(entry, terms) }))
      .filter((hit) => hit.value > 0)
      .sort((a, b) => b.value - a.value || b.entry.post.date.localeCompare(a.entry.post.date))
      .slice(0, 6);

    results.replaceChildren(
      ...current.map((hit, i) => {
        const option = document.createElement('li');
        option.id = `search-option-${i}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.dataset.postId = hit.entry.post.id;

        const title = document.createElement('span');
        title.className = 'search-result-title';
        title.append(highlight(hit.entry.post.title, terms));

        const summary = document.createElement('span');
        summary.className = 'search-result-summary';
        summary.append(highlight(hit.entry.post.summary, terms));

        const meta = document.createElement('span');
        meta.className = 'search-result-meta';
        meta.textContent = `${hit.entry.post.topic} · score ${hit.value.toFixed(0)}`;

        option.append(title, summary, meta);
        return option;
      })
    );

    if (!current.length) {
      const empty = document.createElement('li');
      empty.className = 'search-empty';
      empty.textContent = 'No matches. Try “wasm”, “offline”, or “actions”.';
      results.replaceChildren(empty);
    }

    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    activeIndex = -1;

    if (status) {
      status.textContent = current.length
        ? `${current.length} match${current.length === 1 ? '' : 'es'} for “${query}”.`
        : `No matches for “${query}”.`;
    }
  }

  input.addEventListener('input', () => render(input.value.trim()));

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex > -1) {
      event.preventDefault();
      results.querySelectorAll('[role="option"]')[activeIndex]?.click();
    } else if (event.key === 'Escape') {
      close();
      input.value = '';
      render('');
    }
  });

  results.addEventListener('click', (event) => {
    const option = event.target.closest('[role="option"]');
    if (!option) return;
    const item = document.querySelector(`.post-list [data-post-id="${option.dataset.postId}"]`);
    if (item) {
      item.scrollIntoView({ behavior: 'smooth', block: 'center' });
      item.classList.add('is-flashed');
      setTimeout(() => item.classList.remove('is-flashed'), 1600);
    }
    close();
  });

  document.addEventListener('click', (event) => {
    if (!results.contains(event.target) && event.target !== input) close();
  });
}
