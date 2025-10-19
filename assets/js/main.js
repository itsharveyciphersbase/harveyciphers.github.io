const navToggle = document.querySelector('.nav-toggle');
const navMenu = document.querySelector('.main-nav ul');
const yearEl = document.getElementById('year');

if (navToggle && navMenu) {
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navMenu.setAttribute('aria-expanded', String(!expanded));
    navToggle.classList.toggle('is-open');
  });

  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 960) {
        navToggle.setAttribute('aria-expanded', 'false');
        navMenu.setAttribute('aria-expanded', 'false');
        navToggle.classList.remove('is-open');
      }
    });
  });
}

if (yearEl) {
  yearEl.textContent = String(new Date().getFullYear());
}

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (event) => {
    const targetId = anchor.getAttribute('href');
    if (!targetId || targetId === '#') return;

    const targetElement = document.querySelector(targetId);
    if (targetElement) {
      event.preventDefault();
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

const baseInput = document.getElementById('color-base');
const accentInput = document.getElementById('color-accent');
const angleInput = document.getElementById('gradient-angle');
const randomizeButton = document.getElementById('randomize-gradient');
const gradientPreview = document.querySelector('.playground-preview');
const gradientCode = document.getElementById('gradient-code');
const copyButton = document.querySelector('.copy-gradient');
const copyFeedback = document.querySelector('.copy-feedback');

function updateGradient() {
  if (!baseInput || !accentInput || !angleInput || !gradientPreview || !gradientCode) {
    return;
  }

  const baseColor = baseInput.value;
  const accentColor = accentInput.value;
  const angle = angleInput.value;
  const gradient = `linear-gradient(${angle}deg, ${baseColor}, ${accentColor})`;

  gradientPreview.style.background = gradient;
  gradientCode.textContent = `background: ${gradient};`;
}

function randomColor() {
  return `#${Math.floor(Math.random() * 0xffffff)
    .toString(16)
    .padStart(6, '0')}`;
}

if (baseInput && accentInput && angleInput) {
  updateGradient();

  [baseInput, accentInput, angleInput].forEach((input) => {
    input.addEventListener('input', updateGradient);
  });
}

if (randomizeButton) {
  randomizeButton.addEventListener('click', () => {
    if (!baseInput || !accentInput || !angleInput) {
      return;
    }

    baseInput.value = randomColor();
    accentInput.value = randomColor();
    angleInput.value = String(Math.floor(Math.random() * 361));
    updateGradient();
  });
}

if (copyButton && gradientCode) {
  copyButton.addEventListener('click', async () => {
    const cssSnippet = (gradientCode.textContent || '').trim();
    if (!cssSnippet) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cssSnippet);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = cssSnippet;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      if (copyFeedback) {
        copyFeedback.textContent = 'CSS copied to clipboard!';
      }
    } catch (error) {
      if (copyFeedback) {
        copyFeedback.textContent = 'Press Ctrl+C to copy manually.';
      }
    }

    if (copyFeedback) {
      setTimeout(() => {
        copyFeedback.textContent = '';
      }, 2500);
    }
  });
}

const postFilters = document.querySelectorAll('.post-filter');
const postItems = document.querySelectorAll('.post-list li');

if (postFilters.length && postItems.length) {
  postFilters.forEach((button) => {
    button.setAttribute('aria-pressed', button.classList.contains('is-active') ? 'true' : 'false');
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;

      postFilters.forEach((btn) => {
        const isActive = btn === button;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });

      postItems.forEach((item) => {
        const topic = item.dataset.topic;
        const matches = !filter || filter === 'all' || topic === filter;
        item.hidden = !matches;
      });
    });
  });
}

const codeTabs = document.querySelectorAll('.code-tab');
const codePanels = document.querySelectorAll('.code-panel');

if (codeTabs.length && codePanels.length) {
  codeTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.target;

      codeTabs.forEach((btn) => {
        const isActive = btn === tab;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      codePanels.forEach((panel) => {
        panel.classList.toggle('is-active', panel.id === targetId);
      });
    });
  });
}

const themeToggles = document.querySelectorAll('.theme-toggle');
const systemCard = document.querySelector('.system-card');

if (systemCard && themeToggles.length) {
  themeToggles.forEach((toggle) => {
    toggle.setAttribute('aria-pressed', toggle.classList.contains('is-active') ? 'true' : 'false');
    toggle.addEventListener('click', () => {
      const theme = toggle.dataset.theme || 'light';
      systemCard.setAttribute('data-theme', theme);

      themeToggles.forEach((btn) => {
        const isActive = btn === toggle;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
    });
  });
}
