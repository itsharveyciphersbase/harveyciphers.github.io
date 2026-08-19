# GitHub Pages Playground

A single static site that demonstrates, with working code, what you can actually ship on GitHub
Pages — and what you cannot. Every capability claimed on the
[capabilities page](capabilities.html) has a live demo behind it in this repository.

No build step, no dependencies, no framework. Open `index.html` in a browser and it works.

## Quick start

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>. Use a real server rather than opening the file directly:
`fetch()`, ES modules, and WebAssembly are all blocked on the `file://` protocol.

## What is demonstrated, and where

### Platform features

| Capability | Files |
| --- | --- |
| Custom 404 page, served at any depth | `404.html` (self-contained: relative URLs would break at deep paths) |
| SPA deep links that survive a refresh | `404.html` redirect shim + `demos/spa/index.html` |
| Deploy via GitHub Actions | `.github/workflows/deploy.yml` |
| Jekyll: layouts, includes, collections, data files, plugins | `examples/jekyll/` + `.github/workflows/jekyll-example.yml` |
| Meta-refresh redirects (no `301` is possible) | `demos/redirect-from/old-url.html` |
| Atom feed, sitemap, robots | `feed.xml`, `sitemap.xml`, `robots.txt` |
| Custom domain | `CNAME.example` (inert on purpose — see below) |
| Skipping the Jekyll build | `.nojekyll` |

### Browser techniques

| Capability | Files |
| --- | --- |
| Data-driven rendering from static JSON | `data/posts.json` → `assets/js/modules/blog.js` |
| Client-side full-text search with ranking and highlighting | `assets/js/modules/search.js` |
| Installable, offline-capable PWA | `manifest.webmanifest`, `sw.js`, `assets/js/modules/pwa.js` |
| Site-wide theming: `prefers-color-scheme`, `localStorage`, View Transitions | `assets/js/modules/theme.js`, `assets/js/theme-init.js` |
| Web Components with shadow DOM | `assets/js/components/token-swatch.js`, `copy-button.js` |
| WebAssembly from a committed binary | `assets/wasm/demo.wasm` ← `scripts/build-wasm.mjs` |
| Canvas rendering at device pixel ratio | `assets/js/modules/canvas.js` |
| `IntersectionObserver` reveals and scroll spy | `assets/js/modules/reveal.js` |
| ES modules with no bundler | `assets/js/main.js` and everything it imports |
| SEO: Open Graph, Twitter cards, canonical, JSON-LD | `index.html` head |
| Content Security Policy via `<meta>` | `index.html`, `capabilities.html` |

### Original showcase sections

The portfolio, blog, docs, launch, playground, and design-system layouts from the original
playground are all still there, in `index.html` and `assets/css/styles.css`.

## Generated files

Two committed binaries are generated rather than hand-made. Both scripts are deterministic and
dependency-free, and `deploy.yml` fails the build if the committed copies drift:

```bash
node scripts/build-wasm.mjs      # assets/wasm/demo.wasm  (103 bytes, hand-assembled)
node scripts/generate-icons.mjs  # PWA icons + the Open Graph card
bash scripts/check-syntax.sh     # parses every JS file without executing it
```

`build-wasm.mjs` emits the WebAssembly binary byte by byte and asserts `fib(30) == 832040` before
writing it. `generate-icons.mjs` draws the artwork and encodes PNGs using only `node:zlib`.

## Important: this repository is a *project* page

The repo is named `harveyciphers.github.io` but owned by `itsharveyciphersbase`. A user page
requires the repo name to match the owner (`itsharveyciphersbase.github.io`), so this site is
served from a **subpath**:

```
https://itsharveyciphersbase.github.io/harveyciphers.github.io/
```

Every asset reference in this repository is therefore **relative**, never root-absolute. A single
`/assets/css/styles.css` would 404 in production while working perfectly on localhost. If you
rename the repository or move it to a matching owner, nothing needs to change — relative URLs work
in both layouts.

Three places hardcode the absolute URL because the spec requires it (canonical links, Open Graph
tags, sitemap entries, and the feed). Update these together if the domain changes:

- `index.html` and `capabilities.html` — `<link rel="canonical">`, `og:url`, `og:image`
- `sitemap.xml` — every `<loc>`
- `feed.xml` — `<id>` and `<link>`
- `robots.txt` — the `Sitemap:` line
- `examples/jekyll/_config.yml` — `url` and `baseurl`

## Enabling the deployment

1. **Settings → Pages → Source**: choose **GitHub Actions**.
2. Push to `main`. `deploy.yml` verifies the generated assets, checks JS syntax, and publishes.

To use a custom domain, rename `CNAME.example` to `CNAME` and set the domain in Settings → Pages.
It is deliberately not named `CNAME` in this repository: a live `CNAME` file pointing at a domain
nobody controls would break the deployed site.

## Deliberately not done

- **Self-hosted fonts.** The site still loads Inter and Space Grotesk from Google Fonts, which
  costs two blocking requests to a third party. Self-hosting is strictly better: download the
  `woff2` files into `assets/fonts/`, replace the `<link>` tags with an `@font-face` block using
  `font-display: swap`, and drop `fonts.googleapis.com` and `fonts.gstatic.com` from the CSP and
  the `preconnect` hints. It was left as-is because it requires downloading binary font files.
- **Live forms and comments.** Formspree and giscus both need an account and an endpoint. The
  exact markup for each is on the capabilities page, ready to copy, but is not wired to a real
  service.
- **A text-bearing Open Graph image.** `assets/img/og-image.png` is generated without a font
  rasteriser, so it is the logo mark and no wordmark.

## Notes on correctness

A few things worth knowing if you copy code out of here:

- **CSP and WebAssembly.** `script-src 'self'` blocks `WebAssembly.instantiate` and reports it as
  an `unsafe-eval` violation. You need `'wasm-unsafe-eval'`.
- **CSP via `<meta>` is weaker than the header.** `frame-ancestors`, `report-uri`, and
  report-only mode are all ignored in meta form, so a static host cannot defend against
  clickjacking.
- **Reveal animations must fail open.** Elements that start at `opacity: 0` and wait for
  `IntersectionObserver` become a permanently blank page anywhere the observer does not fire.
  `reveal.js` reveals everything if the observer has not reported within 1.5 seconds, and the
  hidden state is scoped to a `.js` class so a no-script visitor is never affected.
- **`aria-expanded` belongs on the control**, not on the menu it reveals. The nav uses
  `data-open` on the list for styling.
- **`role="tab"` is a promise.** Declaring the ARIA tabs pattern commits you to arrow-key
  navigation and a roving `tabindex`; without them, plain buttons would have been better.

## Licence

MIT — see [LICENSE](LICENSE).
