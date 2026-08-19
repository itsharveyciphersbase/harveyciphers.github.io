/**
 * Applies the saved theme before first paint.
 *
 * Loaded as a synchronous classic script in <head> — deliberately NOT inline
 * and NOT deferred. Inline would force `script-src 'unsafe-inline'` into the
 * Content Security Policy; deferring would let the page paint in the wrong
 * theme first and flash.
 */
(function () {
  // Marks the document as script-capable. Reveal animations key off this class
  // so that a visitor without JavaScript sees the content rather than a page of
  // permanently transparent blocks.
  document.documentElement.classList.add('js');

  try {
    var stored = localStorage.getItem('pages-lab:theme');
    var resolved =
      stored === 'light' || stored === 'dark'
        ? stored
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch (error) {
    // Storage unavailable (private mode); the CSS media query still applies.
  }
})();
