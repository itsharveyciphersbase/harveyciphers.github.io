/**
 * Generates the PWA icons, favicon raster fallback, and Open Graph card.
 *
 * Everything is drawn by hand and encoded straight to PNG (zlib is in Node's
 * stdlib), so the repository stays dependency-free and the images stay
 * reproducible: `node scripts/generate-icons.mjs` rewrites them byte for byte.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const BRAND_START = [99, 102, 241]; // --color-primary  #6366f1
const BRAND_END = [34, 211, 238]; // --color-accent   #22d3ee
const SUPERSAMPLE = 4; // rendered at 4x, box-filtered down for smooth edges

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0; // filter type: None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Signed distance from a point to a rounded rectangle; negative means inside. */
function roundedRectDistance(px, py, x, y, w, h, radius) {
  const cx = Math.abs(px - (x + w / 2)) - (w / 2 - radius);
  const cy = Math.abs(py - (y + h / 2)) - (h / 2 - radius);
  const outside = Math.hypot(Math.max(cx, 0), Math.max(cy, 0));
  return outside + Math.min(Math.max(cx, cy), 0) - radius;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/**
 * Draws the shared artwork: a brand gradient with three offset "sheets"
 * stacked like pages. `shapes` are painted in order, each fully opaque.
 */
function render(width, height, { padding = 0, rounded = true, bars = false }) {
  const w = width * SUPERSAMPLE;
  const h = height * SUPERSAMPLE;
  const pad = padding * SUPERSAMPLE;
  const hi = Buffer.alloc(w * h * 4);

  const cornerRadius = rounded ? Math.min(w, h) * 0.22 : 0;
  const markSize = Math.min(w - pad * 2, h - pad * 2) * (bars ? 0.52 : 0.56);
  const sheetW = markSize * 0.74;
  const sheetH = markSize * 0.9;
  const step = markSize * 0.13;
  const markX = bars ? pad + (w - pad * 2) * 0.08 : (w - sheetW - step * 2) / 2;
  const markY = (h - sheetH - step * 2) / 2;

  const sheets = [
    { x: markX, y: markY, alpha: 0.35 },
    { x: markX + step, y: markY + step, alpha: 0.6 },
    { x: markX + step * 2, y: markY + step * 2, alpha: 1 },
  ];

  const barX = pad + (w - pad * 2) * 0.46;
  const barWidths = [0.44, 0.36, 0.26];
  const barH = h * 0.055;
  const barGap = h * 0.045;
  const barTop = (h - (barH * 3 + barGap * 2)) / 2;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;

      // Diagonal brand gradient.
      const t = Math.min(1, Math.max(0, (x / w) * 0.65 + (y / h) * 0.35));
      let [r, g, b] = mix(BRAND_START, BRAND_END, t);
      let a = 255;

      if (rounded && roundedRectDistance(x, y, 0, 0, w, h, cornerRadius) > 0) {
        a = 0;
      }

      // Soft highlight in the upper-left for depth.
      const glow = Math.max(0, 1 - Math.hypot(x - w * 0.18, y - h * 0.1) / (w * 0.75));
      [r, g, b] = mix([r, g, b], [255, 255, 255], glow * 0.18);

      for (const sheet of sheets) {
        if (roundedRectDistance(x, y, sheet.x, sheet.y, sheetW, sheetH, sheetW * 0.12) <= 0) {
          [r, g, b] = mix([r, g, b], [255, 255, 255], sheet.alpha);
        }
      }

      if (bars) {
        for (let n = 0; n < barWidths.length; n += 1) {
          const by = barTop + n * (barH + barGap);
          const bw = (w - pad * 2) * barWidths[n];
          if (roundedRectDistance(x, y, barX, by, bw, barH, barH / 2) <= 0) {
            [r, g, b] = mix([r, g, b], [255, 255, 255], n === 0 ? 0.92 : 0.55);
          }
        }
      }

      hi[i] = r;
      hi[i + 1] = g;
      hi[i + 2] = b;
      hi[i + 3] = a;
    }
  }

  // Box-filter down to the target size for anti-aliased edges.
  const out = Buffer.alloc(width * height * 4);
  const samples = SUPERSAMPLE * SUPERSAMPLE;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const i = ((y * SUPERSAMPLE + sy) * w + (x * SUPERSAMPLE + sx)) * 4;
          r += hi[i];
          g += hi[i + 1];
          b += hi[i + 2];
          a += hi[i + 3];
        }
      }
      const o = (y * width + x) * 4;
      out[o] = Math.round(r / samples);
      out[o + 1] = Math.round(g / samples);
      out[o + 2] = Math.round(b / samples);
      out[o + 3] = Math.round(a / samples);
    }
  }
  return encodePng(width, height, out);
}

const targets = [
  ['assets/img/icon-192.png', render(192, 192, {})],
  ['assets/img/icon-512.png', render(512, 512, {})],
  // Maskable icons are cropped to a circle by some launchers, so the artwork
  // is inset into the 80% safe zone and the background bleeds to the edges.
  ['assets/img/icon-maskable-512.png', render(512, 512, { padding: 64, rounded: false })],
  ['assets/img/og-image.png', render(1200, 630, { padding: 80, rounded: false, bars: true })],
];

for (const [path, buffer] of targets) {
  writeFileSync(path, buffer);
  console.log(`${path} — ${buffer.length.toLocaleString()} bytes`);
}
