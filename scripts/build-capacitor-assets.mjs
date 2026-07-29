// Build the source assets that Capacitor native icon/splash generation consumes.
// Run `npx @capacitor/assets generate` afterward when regenerating android/ios resources.
// Outputs to ./assets/.
//
// Inputs:  public/logo/logo_circle.png  (the NomNom badge)
// Outputs:
//   assets/icon.png                  1024x1024 — composite badge on parchment
//   assets/icon-foreground.png       1024x1024 — badge at 60% (adaptive safe zone)
//   assets/icon-background.png       1024x1024 — solid parchment
//   assets/icon-foreground-dark.png  1024x1024 — badge at 60%
//   assets/icon-background-dark.png  1024x1024 — solid dark surface
//   assets/splash.png                2732x2732 — badge centered on parchment
//   assets/splash-dark.png           2732x2732 — badge centered on dark surface

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const ASSETS_DIR = resolve(ROOT, 'assets');
const SRC_BADGE = resolve(ROOT, 'public', 'logo', 'logo_circle.png');

// Matches capacitor.config.ts backgroundColor + DESIGN.md parchment.
const LIGHT_BG = { r: 0xfa, g: 0xf7, b: 0xf2, alpha: 1 };
// Warm near-black from palette.marketing.surfaceDarker.
const DARK_BG = { r: 0x14, g: 0x14, b: 0x13, alpha: 1 };

const ICON_SIZE = 1024;
const SPLASH_SIZE = 2732;

const ADAPTIVE_SAFE_RATIO = 0.6;  // Android adaptive icons crop ~33% margin
const LEGACY_FILL_RATIO = 0.78;   // legacy iOS / pre-adaptive Android
const SPLASH_FILL_RATIO = 0.30;   // typical splash logo footprint

await mkdir(ASSETS_DIR, { recursive: true });

async function resizedBadge(targetSize) {
  return sharp(SRC_BADGE)
    .resize(targetSize, targetSize, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();
}

async function compose(width, height, bg, badgeBuf, outPath) {
  const canvas = sharp({
    create: { width, height, channels: 4, background: bg },
  });
  const pipe = badgeBuf
    ? canvas.composite([{ input: badgeBuf, gravity: 'center' }])
    : canvas;
  await pipe.png().toFile(outPath);
  console.log(`wrote ${outPath}`);
}

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

// --- Icons ---
const fgBadge = await resizedBadge(Math.round(ICON_SIZE * ADAPTIVE_SAFE_RATIO));
const legacyBadge = await resizedBadge(Math.round(ICON_SIZE * LEGACY_FILL_RATIO));

await compose(ICON_SIZE, ICON_SIZE, LIGHT_BG, legacyBadge, resolve(ASSETS_DIR, 'icon.png'));
await compose(ICON_SIZE, ICON_SIZE, transparent, fgBadge, resolve(ASSETS_DIR, 'icon-foreground.png'));
await compose(ICON_SIZE, ICON_SIZE, LIGHT_BG, null, resolve(ASSETS_DIR, 'icon-background.png'));
await compose(ICON_SIZE, ICON_SIZE, transparent, fgBadge, resolve(ASSETS_DIR, 'icon-foreground-dark.png'));
await compose(ICON_SIZE, ICON_SIZE, DARK_BG, null, resolve(ASSETS_DIR, 'icon-background-dark.png'));

// --- Splashes ---
const splashBadge = await resizedBadge(Math.round(SPLASH_SIZE * SPLASH_FILL_RATIO));
await compose(SPLASH_SIZE, SPLASH_SIZE, LIGHT_BG, splashBadge, resolve(ASSETS_DIR, 'splash.png'));
await compose(SPLASH_SIZE, SPLASH_SIZE, DARK_BG, splashBadge, resolve(ASSETS_DIR, 'splash-dark.png'));
