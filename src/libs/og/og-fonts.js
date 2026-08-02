/**
 * Real NomNom typefaces for the `next/og` share cards.
 *
 * Satori cannot use what `next/font/google` produces — that pipeline emits hashed `.woff2`
 * into `.next/static/media`. The bundled `@vercel/og` runtime handles **TrueType/OpenType
 * only** (grep it: no `woff` anywhere), and it fails *soft* — an unreadable face is dropped
 * and the card silently renders in the fallback rather than erroring. So these are real
 * `.ttf` static instances (256 KB for all four, OFL, as Google Fonts serves them).
 *
 * Static instances, not the variable `AlbertSans[wght].ttf`: satori renders a variable font's
 * default instance, so 700/800 would come out fake-bolded — which DESIGN.md §3 rules out.
 *
 * Vendoring rather than fetching at render time also removes the outbound call satori was
 * otherwise making to `fonts.googleapis.com` on every cold render.
 *
 * `DESIGN.md` §3: Albert Sans is the UI face (400/700/800 are the weights the cards use — no
 * 900, which would fake-bold), JetBrains Mono carries `@handles`.
 *
 * NOTE: `next.config.js` must keep `./src/libs/og/fonts/**` in `outputFileTracingIncludes`.
 * NFT cannot trace a `process.cwd()` read, so without it the files are absent in the Vercel
 * bundle and every card silently drops to satori's fallback face.
 */

import fs from 'node:fs';
import path from 'node:path';

// ----------------------------------------------------------------------

export const OG_FONT_SANS = 'Albert Sans';
export const OG_FONT_MONO = 'JetBrains Mono';

const FONT_DIR = path.join(process.cwd(), 'src', 'libs', 'og', 'fonts');

/** @type {Array<{ file: string, name: string, weight: 400 | 700 | 800 }>} */
const FONT_FILES = [
  { file: 'AlbertSans-Regular.ttf', name: OG_FONT_SANS, weight: 400 },
  { file: 'AlbertSans-Bold.ttf', name: OG_FONT_SANS, weight: 700 },
  { file: 'AlbertSans-ExtraBold.ttf', name: OG_FONT_SANS, weight: 800 },
  { file: 'JetBrainsMono-Regular.ttf', name: OG_FONT_MONO, weight: 400 },
];

/**
 * Read once per process — these files never change at runtime.
 *
 * Only a *successful* read is cached. Memoising the failure too would mean one bad read at
 * boot pins every card in the fallback face for the life of the process, with no way back
 * short of a redeploy.
 */
let cachedFonts = null;

function loadFonts() {
  if (cachedFonts) return cachedFonts;
  try {
    cachedFonts = FONT_FILES.map((font) => ({
      name: font.name,
      weight: font.weight,
      style: 'normal',
      data: fs.readFileSync(path.join(FONT_DIR, font.file)),
    }));
    return cachedFonts;
  } catch (error) {
    // A missing font must not 500 the card — a preview in the wrong face still previews.
    console.error('[og-fonts] falling back to satori default face:', error);
    return [];
  }
}

/**
 * `ImageResponse` options for every card: canvas size plus the vendored fonts.
 *
 * Satori needs at least one font, so `fonts` is omitted entirely rather than passed empty
 * when the files could not be read.
 *
 * @param {{ width: number, height: number }} size
 * @returns {object}
 */
export function ogImageOptions(size) {
  const fonts = loadFonts();
  return fonts.length ? { ...size, fonts } : { ...size };
}
