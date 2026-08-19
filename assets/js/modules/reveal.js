/**
 * Scroll-driven reveal animations via IntersectionObserver.
 *
 * Purely presentational, so it degrades to "everything is visible" whenever the
 * API is missing or the visitor has asked for reduced motion.
 */
export function initReveal() {
  const targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }

  // Fail open. The elements start transparent, so anything that stops the
  // observer from reporting — an embedded webview, a prerenderer, a browser
  // that never composites the page — would otherwise leave the visitor staring
  // at a blank page. A working observer always invokes its callback once on
  // setup, so silence past this deadline means it is not going to fire at all.
  let callbackRan = false;
  const revealAll = () => targets.forEach((el) => el.classList.add('is-revealed'));

  const observer = new IntersectionObserver(
    (entries) => {
      callbackRan = true;
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target); // reveal once, then stop watching
      });
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));

  setTimeout(() => {
    if (callbackRan) return;
    observer.disconnect();
    revealAll();
  }, 1500);
}

/** Highlights the nav link for whichever section is currently on screen. */
export function initScrollSpy() {
  const links = Array.from(document.querySelectorAll('#nav-menu a[href^="#"]'));
  if (!links.length || !('IntersectionObserver' in window)) return;

  const byId = new Map(
    links.map((link) => [link.getAttribute('href').slice(1), link])
  );
  const sections = Array.from(byId.keys())
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if (!sections.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const link = byId.get(entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          links.forEach((other) => other.removeAttribute('aria-current'));
          link.setAttribute('aria-current', 'true');
        }
      });
    },
    { rootMargin: '-45% 0px -50% 0px' }
  );

  sections.forEach((section) => observer.observe(section));
}
