/**
 * A small generative canvas piece.
 *
 * Canvas, WebGL, and Web Audio all run entirely client-side, so anything you can
 * draw in a browser you can host on Pages. Honours reduced-motion by painting a
 * single static frame instead of animating.
 */
const PARTICLE_COUNT = 46;
const LINK_DISTANCE = 130;

export function initCanvas() {
  const canvas = document.querySelector('[data-canvas]');
  if (!canvas || !canvas.getContext) return;

  const context = canvas.getContext('2d');
  const toggle = document.querySelector('[data-canvas-toggle]');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  let particles = [];
  let frame = null;
  let width = 0;
  let height = 0;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height || 260;

    // Back the canvas with real device pixels so the lines stay crisp.
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function seed() {
    particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1 + Math.random() * 2,
    }));
  }

  function draw() {
    context.clearRect(0, 0, width, height);

    const styles = getComputedStyle(document.documentElement);
    const primary = styles.getPropertyValue('--color-primary').trim() || '#6366f1';
    const accent = styles.getPropertyValue('--color-accent').trim() || '#22d3ee';

    for (let i = 0; i < particles.length; i += 1) {
      for (let j = i + 1; j < particles.length; j += 1) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const distance = Math.hypot(dx, dy);
        if (distance > LINK_DISTANCE) continue;

        context.globalAlpha = (1 - distance / LINK_DISTANCE) * 0.4;
        context.strokeStyle = primary;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(particles[i].x, particles[i].y);
        context.lineTo(particles[j].x, particles[j].y);
        context.stroke();
      }
    }

    context.globalAlpha = 0.9;
    context.fillStyle = accent;
    for (const particle of particles) {
      context.beginPath();
      context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function step() {
    for (const particle of particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;
    }
    draw();
    frame = requestAnimationFrame(step);
  }

  function start() {
    if (frame !== null) return;
    frame = requestAnimationFrame(step);
    if (toggle) {
      toggle.textContent = 'Pause animation';
      toggle.setAttribute('aria-pressed', 'true');
    }
  }

  function stop() {
    if (frame === null) return;
    cancelAnimationFrame(frame);
    frame = null;
    if (toggle) {
      toggle.textContent = 'Play animation';
      toggle.setAttribute('aria-pressed', 'false');
    }
  }

  resize();
  seed();
  draw();

  if (!reduced.matches) start();

  window.addEventListener('resize', () => {
    resize();
    seed();
    if (frame === null) draw();
  });

  // Do not burn battery animating a canvas nobody is looking at.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!reduced.matches) start();
  });

  if (toggle) {
    toggle.addEventListener('click', () => (frame === null ? start() : stop()));
  }
}
