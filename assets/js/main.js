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
