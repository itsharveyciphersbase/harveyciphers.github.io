/**
 * <token-swatch> — a design-system swatch as a real custom element.
 *
 * Web Components need no framework and no build step, which makes them a
 * natural fit for a design system published on GitHub Pages: one script tag and
 * the documentation site and the consuming app share the same component.
 *
 * Usage:
 *   <token-swatch name="--color-primary" value="#6366f1" on="#ffffff"></token-swatch>
 */
const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font: inherit;
    }
    .chip {
      height: 3.25rem;
      border-radius: 0.65rem;
      border: 1px solid rgba(15, 23, 42, 0.14);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.25);
    }
    .name {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.75rem;
      font-weight: 600;
      word-break: break-all;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      gap: 0.5rem;
      font-size: 0.7rem;
      opacity: 0.75;
      font-variant-numeric: tabular-nums;
    }
    .grade[data-pass='fail'] { color: #dc2626; font-weight: 700; }
    .grade[data-pass='aa']   { color: #b45309; font-weight: 700; }
    .grade[data-pass='aaa']  { color: #047857; font-weight: 700; }
  </style>
  <div class="chip" part="chip"></div>
  <span class="name"></span>
  <span class="meta">
    <span class="value"></span>
    <span class="grade"></span>
  </span>
`;

/** sRGB channel to linear light, per WCAG 2.1 relative luminance. */
function channelLuminance(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function parseHex(hex) {
  const clean = hex.trim().replace('#', '');
  const full =
    clean.length === 3
      ? clean.split('').map((c) => c + c).join('')
      : clean;
  if (full.length !== 6) return null;
  const int = Number.parseInt(full, 16);
  return Number.isNaN(int) ? null : [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

function relativeLuminance(rgb) {
  const [r, g, b] = rgb.map(channelLuminance);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground, background) {
  const fg = parseHex(foreground);
  const bg = parseHex(background);
  if (!fg || !bg) return null;
  const light = Math.max(relativeLuminance(fg), relativeLuminance(bg));
  const dark = Math.min(relativeLuminance(fg), relativeLuminance(bg));
  return (light + 0.05) / (dark + 0.05);
}

class TokenSwatch extends HTMLElement {
  static observedAttributes = ['name', 'value', 'on'];

  #root;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: 'open' });
    this.#root.append(template.content.cloneNode(true));
  }

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.#root) this.#render();
  }

  #render() {
    const name = this.getAttribute('name') || '--token';
    const value = this.getAttribute('value') || '#000000';
    const on = this.getAttribute('on') || '#ffffff';

    this.#root.querySelector('.chip').style.background = value;
    this.#root.querySelector('.name').textContent = name;
    this.#root.querySelector('.value').textContent = value.toUpperCase();

    const grade = this.#root.querySelector('.grade');
    const ratio = contrastRatio(value, on);

    if (ratio === null) {
      grade.textContent = '';
      grade.removeAttribute('data-pass');
      return;
    }

    // WCAG 2.1: 4.5:1 for normal text (AA), 7:1 (AAA).
    const level = ratio >= 7 ? 'aaa' : ratio >= 4.5 ? 'aa' : 'fail';
    grade.textContent = `${ratio.toFixed(2)}:1 ${level.toUpperCase()}`;
    grade.dataset.pass = level;
    grade.title = `Contrast against ${on}`;
  }
}

if (!customElements.get('token-swatch')) {
  customElements.define('token-swatch', TokenSwatch);
}
