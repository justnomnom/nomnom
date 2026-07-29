import { ImageResponse } from 'next/og';

// Node.js avoids Vercel’s 1 MB Edge Function limit (`next/og` wasm exceeds it on Hobby).
export const runtime = 'nodejs';

export const alt = 'NomNom';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

/**
 * Default Open Graph / social share image (1200×630).
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'linear-gradient(145deg, #faf9f5 0%, #fff4ee 45%, #ffe8dc 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: 44,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: '#FF6B35',
        }}
      >
        NomNom
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            color: '#1a1a1a',
            maxWidth: 900,
          }}
        >
          Restaurant picks from people who know
        </div>
        <div
          style={{
            fontSize: 28,
            lineHeight: 1.35,
            color: '#5c5c5c',
            maxWidth: 820,
          }}
        >
          Follow creators and locals. Not algorithms.
        </div>
      </div>
    </div>,
    { ...size }
  );
}
