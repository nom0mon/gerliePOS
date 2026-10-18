// Generates branded PWA icons using only Node built-ins (no native deps).
// Draws a coffee cup (cream) on the brand-brown background, pixel by pixel,
// with ~20% safe padding so the maskable icon isn't clipped on Android.
// Produces public/icon-192.png, public/icon-512.png, and a placeholder
// public/gcash-qr.png (replace that file with the real QR).
import { writeFileSync, existsSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

/** Encode an RGB pixel buffer (size*size*3) as a PNG. */
function encodePng(size, rgb) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolor RGB
  const rowLen = 1 + size * 3;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    const off = y * rowLen;
    raw[off] = 0; // filter: none
    rgb.copy(raw, off + 1, y * size * 3, (y + 1) * size * 3);
  }
  const idat = deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Palette
const BROWN = [111, 78, 55]; // #6f4e37 brand
const CREAM = [248, 244, 236]; // cup
const CREAM_SHADOW = [214, 201, 183];

/**
 * Draw the coffee-cup icon into an RGB buffer. Coordinates are normalized
 * (0..1) so the same design scales to any size. ~18% padding keeps the cup
 * inside the maskable safe zone.
 */
function drawIcon(size) {
  const rgb = Buffer.alloc(size * size * 3);
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const p = (y * size + x) * 3;
    rgb[p] = r;
    rgb[p + 1] = g;
    rgb[p + 2] = b;
  };

  // Background: solid brand brown.
  for (let i = 0; i < size * size; i++) {
    rgb[i * 3] = BROWN[0];
    rgb[i * 3 + 1] = BROWN[1];
    rgb[i * 3 + 2] = BROWN[2];
  }

  const N = (v) => Math.round(v * size); // normalized → px

  // Cup body: a rounded trapezoid-ish block (approximate with a rectangle +
  // rounded bottom). Safe zone ~ [0.22 .. 0.78].
  const bodyL = N(0.3);
  const bodyR = N(0.64);
  const bodyT = N(0.34);
  const bodyB = N(0.66);
  const radius = N(0.06);
  const inRoundedBottom = (x, y) => {
    if (y <= bodyB - radius) return x >= bodyL && x <= bodyR;
    // rounded bottom corners
    const dyB = y - (bodyB - radius);
    const curve = Math.sqrt(Math.max(0, radius * radius - dyB * dyB));
    return x >= bodyL + (radius - curve) && x <= bodyR - (radius - curve);
  };
  for (let y = bodyT; y <= bodyB; y++)
    for (let x = bodyL; x <= bodyR; x++)
      if (inRoundedBottom(x, y)) set(x, y, CREAM);

  // Coffee surface (slightly darker ellipse near the top of the body).
  const surfCx = (bodyL + bodyR) / 2;
  const surfCy = bodyT + N(0.015);
  const surfRx = (bodyR - bodyL) / 2;
  const surfRy = N(0.02);
  for (let y = surfCy - surfRy; y <= surfCy + surfRy; y++)
    for (let x = bodyL; x <= bodyR; x++) {
      const dx = (x - surfCx) / surfRx;
      const dy = (y - surfCy) / surfRy;
      if (dx * dx + dy * dy <= 1) set(x, y, CREAM_SHADOW);
    }

  // Handle: a ring on the right of the cup (drawn as an annulus).
  const hCx = bodyR + N(0.055);
  const hCy = (bodyT + bodyB) / 2;
  const hOuter = N(0.1);
  const hInner = N(0.055);
  for (let y = hCy - hOuter; y <= hCy + hOuter; y++)
    for (let x = hCx - hOuter; x <= hCx + hOuter; x++) {
      const d = Math.hypot(x - hCx, y - hCy);
      if (d <= hOuter && d >= hInner && x >= bodyR - N(0.01)) set(x, y, CREAM);
    }

  // Saucer: a thin rounded bar beneath the cup.
  const satY0 = bodyB + N(0.03);
  const satY1 = satY0 + N(0.035);
  const satL = N(0.24);
  const satR = N(0.72);
  for (let y = satY0; y <= satY1; y++)
    for (let x = satL; x <= satR; x++) set(x, y, CREAM);

  // Steam: two short wavy strokes above the cup.
  for (let i = 0; i < 2; i++) {
    const baseX = N(0.42) + i * N(0.1);
    for (let t = 0; t < N(0.12); t++) {
      const y = bodyT - N(0.04) - t;
      const x = baseX + Math.round(Math.sin(t / (size * 0.02)) * N(0.015));
      set(x, y, CREAM);
      set(x + 1, y, CREAM);
    }
  }

  return rgb;
}

for (const size of [192, 512]) {
  writeFileSync(`public/icon-${size}.png`, encodePng(size, drawIcon(size)));
}

// Placeholder GCash QR (white with a centered dark block) — only written if a
// real one isn't already present, so this never overwrites your real QR. Drop
// the real image at public/gcash-qr.png (keep the filename).
function placeholderQr(size) {
  const rgb = Buffer.alloc(size * size * 3, 255);
  const lo = Math.floor(size * 0.3);
  const hi = Math.floor(size * 0.7);
  for (let y = lo; y <= hi; y++)
    for (let x = lo; x <= hi; x++) {
      const p = (y * size + x) * 3;
      rgb[p] = rgb[p + 1] = rgb[p + 2] = 15;
    }
  return encodePng(size, rgb);
}
if (!existsSync('public/gcash-qr.png')) {
  writeFileSync('public/gcash-qr.png', placeholderQr(480));
}

console.log('Generated public/icon-192.png, public/icon-512.png (QR left as-is if present)');
