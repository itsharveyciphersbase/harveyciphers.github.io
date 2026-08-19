/**
 * Entry point for the GitHub Pages Playground.
 *
 * Loaded as an ES module (<script type="module">), which gives us real imports
 * with no bundler — the browser fetches the dependency graph itself. Modules are
 * deferred by default, so the DOM is ready by the time this runs.
 */
import { initTheme } from './modules/theme.js';
import { initBlog } from './modules/blog.js';
import { initSearch } from './modules/search.js';
import { initReveal, initScrollSpy } from './modules/reveal.js';
import { initCanvas } from './modules/canvas.js';
import { initWasm } from './modules/wasm.js';
import { initPwa } from './modules/pwa.js';

// Custom elements self-register on import.
import './components/token-swatch.js';
import './components/copy-button.js';

// --- Navigation --------------------------------------------------------------
function initNav() {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.main-nav ul');
  if (!navToggle || !navMenu) return;

  function setOpen(open) {
    // aria-expanded belongs on the control, not on the list it reveals.
    navToggle.setAttribute('aria-expanded', String(open));
    navMenu.dataset.open = String(open);
    navToggle.classList.toggle('is-open', open);
  }

  setOpen(false);

  navToggle.addEventListener('click', () => {
    setOpen(navToggle.getAttribute('aria-expanded') !== 'true');
  });

  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 960) setOpen(false);
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      navToggle.focus();
    }
  });
}

// --- Smooth scrolling --------------------------------------------------------
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (event) => {
      const targetId = anchor.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });

      // Keep the URL shareable and the back button meaningful — the previous
      // implementation swallowed the hash entirely.
      history.pushState(null, '', targetId);

      // scrollIntoView does not move focus, which strands keyboard users.
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
}

// --- Gradient builder --------------------------------------------------------
function initGradientBuilder() {
  const baseInput = document.getElementById('color-base');
  const accentInput = document.getElementById('color-accent');
  const angleInput = document.getElementById('gradient-angle');
  const randomizeButton = document.getElementById('randomize-gradient');
  const preview = document.querySelector('.playground-preview');
  const code = document.getElementById('gradient-code');

  if (!baseInput || !accentInput || !angleInput || !preview || !code) return;

  function update() {
    const gradient = `linear-gradient(${angleInput.value}deg, ${baseInput.value}, ${accentInput.value})`;
    preview.style.background = gradient;
    code.textContent = `background: ${gradient};`;

    const angleLabel = document.querySelector('[data-angle-value]');
    if (angleLabel) angleLabel.textContent = `${angleInput.value} degrees`;
  }

  function randomChannel() {
    return `#${Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, '0')}`;
  }

  [baseInput, accentInput, angleInput].forEach((input) => {
    input.addEventListener('input', update);
  });

  if (randomizeButton) {
    randomizeButton.addEventListener('click', () => {
      baseInput.value = randomChannel();
      accentInput.value = randomChannel();
      angleInput.value = String(Math.floor(Math.random() * 361));
      update();
    });
  }

  update();
}

// --- Tabbed code samples -----------------------------------------------------
function initCodeTabs() {
  const tablist = document.querySelector('.code-tabs');
  if (!tablist) return;

  const tabs = Array.from(tablist.querySelectorAll('.code-tab'));
  const panels = Array.from(document.querySelectorAll('.code-panel'));
  if (!tabs.length || !panels.length) return;

  function select(tab, { focus = true } = {}) {
    tabs.forEach((other) => {
      const isActive = other === tab;
      other.classList.toggle('is-active', isActive);
      other.setAttribute('aria-selected', String(isActive));
      // Roving tabindex: only the selected tab is in the tab order, so Tab
      // moves past the tablist rather than through every tab inside it.
      other.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    panels.forEach((panel) => {
      panel.classList.toggle('is-active', panel.id === tab.dataset.target);
    });

    if (focus) tab.focus();
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => select(tab, { focus: false })));

  // The ARIA tabs pattern requires arrow-key navigation; declaring role="tab"
  // without it is worse than using plain buttons.
  tablist.addEventListener('keydown', (event) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    const destinations = {
      ArrowRight: (currentIndex + 1) % tabs.length,
      ArrowLeft: (currentIndex - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    };

    if (!(event.key in destinations)) return;
    event.preventDefault();
    select(tabs[destinations[event.key]]);
  });

  const initial = tabs.find((tab) => tab.classList.contains('is-active')) || tabs[0];
  select(initial, { focus: false });
}

// --- Design-system theme preview --------------------------------------------
// Scoped to the demo card only; the site-wide theme lives in modules/theme.js.
function initSystemCardTheme() {
  const card = document.querySelector('.system-card');
  const toggles = document.querySelectorAll('.theme-toggle');
  if (!card || !toggles.length) return;

  toggles.forEach((toggle) => {
    toggle.setAttribute('aria-pressed', String(toggle.classList.contains('is-active')));
    toggle.addEventListener('click', () => {
      card.setAttribute('data-theme', toggle.dataset.theme || 'light');
      toggles.forEach((other) => {
        const isActive = other === toggle;
        other.classList.toggle('is-active', isActive);
        other.setAttribute('aria-pressed', String(isActive));
      });
    });
  });
}

function initFooterYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
}

// --- Boot --------------------------------------------------------------------
initTheme();
initNav();
initSmoothScroll();
initGradientBuilder();
initCodeTabs();
initSystemCardTheme();
initFooterYear();
initReveal();
initScrollSpy();
initCanvas();
initWasm();
initPwa();

// These two touch the network; a failure must not take the rest of the page down.
initBlog()
  .then(() => initSearch())
  .catch((error) => console.error('[main]', error));
