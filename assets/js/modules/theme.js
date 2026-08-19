/**
 * Site-wide theming.
 *
 * Demonstrates three things a static host gives you for free:
 *   - `prefers-color-scheme` for the default,
 *   - `localStorage` for persistence across reloads (no session, no server),
 *   - the View Transitions API for a cross-fade between the two.
 */
const STORAGE_KEY = 'pages-lab:theme';
const MODES = ['system', 'light', 'dark'];

const media = window.matchMedia('(prefers-color-scheme: dark)');

function readStoredMode() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(stored) ? stored : 'system';
  } catch {
    // Storage can throw in private browsing modes; fall back to the default.
    return 'system';
  }
}

function persistMode(mode) {
  try {
    if (mode === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* Persistence is a nicety, not a requirement. */
  }
}

function resolve(mode) {
  if (mode === 'system') return media.matches ? 'dark' : 'light';
  return mode;
}

function apply(mode) {
  const resolved = resolve(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0b1120' : '#6366f1');
}

/** Wraps a DOM mutation in a View Transition where the browser supports it. */
function withTransition(mutate) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || typeof document.startViewTransition !== 'function') {
    mutate();
    return;
  }

  const transition = document.startViewTransition(mutate);

  // An aborted transition — the document was hidden, or a second theme change
  // interrupted the first — rejects some of these promises. The DOM mutation
  // still happened, so there is nothing to report; allSettled marks every one
  // of them as handled so no unhandled rejection reaches the console.
  Promise.allSettled([transition.ready, transition.finished, transition.updateCallbackDone]);
}

export function initTheme() {
  let mode = readStoredMode();
  apply(mode);

  // Following the system preference means reacting when it changes mid-session.
  media.addEventListener('change', () => {
    if (mode === 'system') apply(mode);
  });

  const buttons = document.querySelectorAll('[data-theme-mode]');

  function sync() {
    buttons.forEach((button) => {
      const isActive = button.dataset.themeMode === mode;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    const status = document.querySelector('[data-theme-status]');
    if (status) {
      status.textContent =
        mode === 'system'
          ? `Following your system preference (${resolve(mode)}).`
          : `Locked to ${mode}, saved in localStorage.`;
    }
  }

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      mode = button.dataset.themeMode;
      persistMode(mode);
      withTransition(() => {
        apply(mode);
        sync();
      });
    });
  });

  sync();
}

/**
 * Applied before first paint by an inline script in the document head so the
 * page never flashes the wrong theme. Exported for reuse and testing.
 */
export function currentTheme() {
  return resolve(readStoredMode());
}
