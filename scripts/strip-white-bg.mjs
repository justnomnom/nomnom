// Strip the white BACKGROUND from a logo PNG while preserving:
//   - white pixels that are interior to a colored shape (e.g. the white
//     letters inside the orange circle of the NomNom badge)
//   - clean anti-aliased edges with no white halo
//
// Strategy:
//   1. Flood-fill from the image borders. Any near-white pixel reachable
//      from an edge is "outside" -> alpha 0.
//   2. For non-filled pixels adjacent to filled ones, treat them as the
//      anti-aliased boundary: derive alpha from saturation and
//      decontaminate the RGB by removing the white contribution.
//   3. Everything else (interior pixels, including the white letters
//      sealed inside the orange circle) is left fully opaque.

import sharp from 'sharp';
import { resolve } from 'node:path';

const WHITE_THRESHOLD = 232; // min(R,G,B) >= this counts as background-white
const EDGE_MIN = 80;         // min(R,G,B) below this -> definitely fg, skip edge processing
const SAT_FULL_OPAQUE = 200; // saturation at/above this -> fully opaque brand color

// mode:
//   'flood'        - only nuke white pixels connected to the image border.
//                    Inner whites (letters inside a colored badge) stay opaque.
//   'flood+inside' - flood-fill from borders AND zero any other near-white
//                    pixel. Catches enclosed counters (o-holes in wordmarks)
//                    without exposing background JPEG noise.
async function strip(inputPath, outputPath, { mode } = { mode: 'flood' }) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.from(data);

  // --- 1. Flood-fill from borders ---
  const filled = new Uint8Array(width * height);
  const stack = [];

  const tryPush = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx = y * width + x;
    if (filled[idx]) return;
    const p = idx * channels;
    const minRGB = Math.min(data[p], data[p + 1], data[p + 2]);
    if (minRGB < WHITE_THRESHOLD) return;
    filled[idx] = 1;
    stack.push(x, y);
  };

  for (let x = 0; x < width; x++) {
    tryPush(x, 0);
    tryPush(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    tryPush(0, y);
    tryPush(width - 1, y);
  }

  while (stack.length) {
    const y = stack.pop();
    const x = stack.pop();
    tryPush(x + 1, y);
    tryPush(x - 1, y);
    tryPush(x, y + 1);
    tryPush(x, y - 1);
  }

  // Mark filled pixels transparent.
  for (let i = 0; i < width * height; i++) {
    if (filled[i]) out[i * channels + 3] = 0;
  }

  // --- 1b. Optionally also zero enclosed near-white regions (o-counters etc.) ---
  if (mode === 'flood+inside') {
    for (let i = 0; i < width * height; i++) {
      if (filled[i]) continue;
      const p = i * channels;
      const minRGB = Math.min(out[p], out[p + 1], out[p + 2]);
      if (minRGB >= WHITE_THRESHOLD) {
        out[p + 3] = 0;
        filled[i] = 1;
      }
    }
  }

  // --- 2. Edge decontamination pass ---
  // For each non-filled pixel adjacent to a filled pixel, derive partial
  // alpha + remove white contribution.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (filled[idx]) continue;

      let adjacent = false;
      if (x > 0 && filled[idx - 1]) adjacent = true;
      else if (x + 1 < width && filled[idx + 1]) adjacent = true;
      else if (y > 0 && filled[idx - width]) adjacent = true;
      else if (y + 1 < height && filled[idx + width]) adjacent = true;
      if (!adjacent) continue;

      const p = idx * channels;
      const r = out[p];
      const g = out[p + 1];
      const b = out[p + 2];
      const minRGB = Math.min(r, g, b);
      const maxRGB = Math.max(r, g, b);

      // Pure fg color -> leave alone.
      if (minRGB < EDGE_MIN) continue;

      const sat = maxRGB - minRGB;
      // Alpha proportional to saturation: white has sat=0, brand orange has sat ~225.
      const a = Math.min(255, Math.round((sat * 255) / SAT_FULL_OPAQUE));
      if (a <= 0) {
        out[p + 3] = 0;
        continue;
      }

      out[p + 3] = a;
      // Decontaminate: original = fg*(a/255) + white*(1 - a/255)
      // -> fg = (original - 255*(1 - a/255)) / (a/255)
      const af = a / 255;
      const inv = 1 - af;
      out[p]     = clamp((r - 255 * inv) / af);
      out[p + 1] = clamp((g - 255 * inv) / af);
      out[p + 2] = clamp((b - 255 * inv) / af);
    }
  }

  await sharp(out, { raw: { width, height, channels } }).png().toFile(outputPath);
  console.log(`stripped (flood) ${outputPath}`);
}

function clamp(v) {
  if (v < 0) return 0;
  if (v > 255) return 255;
  return Math.round(v);
}

const root = resolve(process.cwd(), 'public', 'logo');
// Wordmark: outer background AND enclosed counters become transparent.
await strip(resolve(root, 'logo_single.png'), resolve(root, 'logo_single.png'), { mode: 'flood+inside' });
// Badge: only outer background — white letters inside the orange circle must stay opaque.
await strip(resolve(root, 'logo_circle.png'), resolve(root, 'logo_circle.png'), { mode: 'flood' });
