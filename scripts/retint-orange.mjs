// Retint every saturated-orange pixel in the NomNom logos to brand primary
// (#FF6B35). White letter pixels (in the badge) and transparent pixels are
// left untouched. Alpha channel is preserved so anti-aliased edges keep their
// shape.

import sharp from 'sharp';
import { resolve } from 'node:path';

const TARGET = { r: 0xFF, g: 0x6B, b: 0x35 };
const SAT_MIN = 30; // pixels with max-min RGB above this count as "colored"

async function retint(path) {
  const { data, info } = await sharp(path)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  let touched = 0;
  for (let i = 0; i < out.length; i += info.channels) {
    if (out[i + 3] === 0) continue;
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const sat = Math.max(r, g, b) - Math.min(r, g, b);
    if (sat < SAT_MIN) continue;
    out[i]     = TARGET.r;
    out[i + 1] = TARGET.g;
    out[i + 2] = TARGET.b;
    touched++;
  }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toFile(path);
  console.log(`retinted ${path}  (${touched} pixels)`);
}

const root = resolve(process.cwd(), 'public', 'logo');
await retint(resolve(root, 'logo_single.png'));
await retint(resolve(root, 'logo_circle.png'));
