import Image from 'next/image';

type ImageGalleryProps = {
  images: string[];
  alt?: string;
};

/**
 * Simple responsive gallery for MDX (expects public URLs or absolute paths).
 */
export function ImageGallery({ images, alt = 'Gallery image' }: ImageGalleryProps) {
  if (!images?.length) return null;

  return (
    <div className="not-prose my-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((src, i) => (
        <div
          key={`${src}-${i}`}
          className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted"
        >
          <Image
            src={src}
            alt={`${alt} ${i + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 33vw"
          />
        </div>
      ))}
    </div>
  );
}
