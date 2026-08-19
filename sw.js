/**
 * Service worker for the GitHub Pages Playground.
 *
 * A service worker is a plain static file, which is why an installable,
 * offline-capable app is possible on a host that runs no code of its own.
 *
 * Scope note: every URL below is resolved against `self.location`, so the same
 * file works whether the site is served from a user page (owner.github.io) or a
 * project page (owner.github.io/repo/).
 */
const VERSION = 'v1';
const SHELL_CACHE = `pages-lab-shell-${VERSION}`;
const RUNTIME_CACHE = `pages-lab-runtime-${VERSION}`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './capabilities.html',
  './404.html',
  './manifest.webmanifest',
  './assets/css/styles.css',
  './assets/js/main.js',
  './assets/js/modules/theme.js',
  './assets/js/modules/blog.js',
  './assets/js/modules/search.js',
  './assets/js/modules/reveal.js',
  './assets/js/modules/canvas.js',
  './assets/js/modules/wasm.js',
  './assets/js/modules/pwa.js',
  './assets/js/components/token-swatch.js',
  './assets/js/components/copy-button.js',
  './assets/img/favicon.svg',
  './assets/img/icon-192.png',
  './assets/img/profile-placeholder.svg',
  './data/posts.json',
].map((path) => new URL(path, self.location).href);

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // addAll() is atomic: one 404 aborts the install. Cache individually so a
      // single missing asset cannot brick the whole worker.
      await Promise.all(
        SHELL_ASSETS.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch (error) {
            console.warn('[sw] could not precache', url, error);
          }
        })
      );
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('pages-lab-') && key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

/** Let the page trigger an immediate update instead of waiting for a reload. */
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') {
    self.skipWaiting();
  }
});

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = (await cache.match(request)) || (await caches.match(request));
    if (cached) return cached;

    // Offline and never visited: fall back to the cached shell entry point.
    const shell = await caches.match(new URL('./index.html', self.location).href);
    if (shell) return shell;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache the SPA redirect shim's query-string variants.
  if (url.searchParams.has('spa-route')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Cross-origin (the Google Fonts stylesheet and font files): cache-first,
  // because those URLs are content-addressed and effectively immutable.
  if (url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
