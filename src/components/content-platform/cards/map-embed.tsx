type MapEmbedProps = {
  lat: number;
  lng: number;
  label?: string;
  height?: number;
};

/**
 * Static map preview using OpenStreetMap embed (no API key). For Mapbox, swap the iframe URL.
 */
export function MapEmbed({ lat, lng, label, height = 280 }: MapEmbedProps) {
  const zoom = 14;
  const bboxPad = 0.02;
  const left = lng - bboxPad;
  const bottom = lat - bboxPad;
  const right = lng + bboxPad;
  const top = lat + bboxPad;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${lat}%2C${lng}`;

  return (
    <figure className="not-prose my-8 overflow-hidden rounded-2xl border border-border shadow-sm">
      {label ? (
        <figcaption className="border-b border-neutral-100 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-800">
          {label}
        </figcaption>
      ) : null}
      <iframe
        title={label || 'Map'}
        width="100%"
        height={height}
        src={src}
        className="block w-full border-0"
        loading="lazy"
      />
    </figure>
  );
}
