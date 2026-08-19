/**
 * Progressive web app wiring: service worker, install prompt, update flow, and
 * connectivity status.
 *
 * All of it is static-host friendly. The only server requirement is HTTPS,
 * which GitHub Pages provides on both *.github.io and custom domains.
 */
export function initPwa() {
  const status = document.querySelector('[data-pwa-status]');
  const installButton = document.querySelector('[data-pwa-install]');
  const updateBanner = document.querySelector('[data-pwa-update]');
  const updateButton = document.querySelector('[data-pwa-update-action]');
  const connection = document.querySelector('[data-connection-status]');

  function report(message) {
    if (status) status.textContent = message;
  }

  // --- Connectivity ---------------------------------------------------------
  function syncConnection() {
    if (!connection) return;
    const online = navigator.onLine;
    connection.textContent = online ? 'Online' : 'Offline — serving from cache';
    connection.dataset.state = online ? 'online' : 'offline';
  }
  window.addEventListener('online', syncConnection);
  window.addEventListener('offline', syncConnection);
  syncConnection();

  // --- Install prompt -------------------------------------------------------
  // Chromium fires beforeinstallprompt and lets you defer it to your own button.
  // Safari and Firefox do not, so the button stays hidden and the copy explains
  // the manual route rather than promising something that will not happen.
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    if (installButton) {
      installButton.hidden = false;
      installButton.disabled = false;
    }
  });

  if (installButton) {
    installButton.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      installButton.disabled = true;
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      report(
        outcome === 'accepted'
          ? 'Installed. The manifest supplied the name, icons, and start URL.'
          : 'Install dismissed — the prompt can only be shown once per gesture.'
      );
      deferredPrompt = null;
      installButton.hidden = true;
    });
  }

  window.addEventListener('appinstalled', () => {
    report('Installed from a static host. No app store, no build server.');
    if (installButton) installButton.hidden = true;
  });

  if (window.matchMedia('(display-mode: standalone)').matches) {
    report('Running as an installed app.');
    if (installButton) installButton.hidden = true;
  }

  // --- Service worker -------------------------------------------------------
  if (!('serviceWorker' in navigator)) {
    report('This browser has no service worker support, so offline mode is unavailable.');
    return;
  }

  // Service workers require a secure context. file:// and plain http:// on a
  // remote host will not register, and that is a browser rule, not a Pages one.
  if (!window.isSecureContext) {
    report('Service workers need HTTPS (or localhost). Open the deployed site to see offline mode.');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register(
        new URL('sw.js', document.baseURI),
        { scope: './' }
      );

      report(
        registration.active
          ? 'Service worker active — reload with the network off and the site still loads.'
          : 'Service worker installing — the app shell is being cached now.'
      );

      // A waiting worker means a new version is ready but the old one still
      // controls the page. Offer the reload rather than forcing it.
      function watch(worker) {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            if (updateBanner) updateBanner.hidden = false;
          }
        });
      }

      if (registration.waiting && updateBanner) updateBanner.hidden = false;
      watch(registration.installing);
      registration.addEventListener('updatefound', () => watch(registration.installing));

      if (updateButton) {
        updateButton.addEventListener('click', () => {
          const worker = registration.waiting || registration.installing;
          if (worker) worker.postMessage('skip-waiting');
        });
      }

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (error) {
      report(`Service worker registration failed: ${error.message}`);
      console.error('[pwa]', error);
    }
  });
}
