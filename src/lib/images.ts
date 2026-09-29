/** Responsive renditions of the current CMS asset, using EmDash's native endpoint.
 * Originals remain in R2; changing or clearing a CMS image changes this output too.
 * No remote URL is fetched and no image is cropped or enlarged here.
 */
export interface CmsImage { src: string; width?: number; height?: number }
interface ResponsiveImageAttributes extends CmsImage { srcset?: string; sizes?: string; 'data-original-src'?: string }

/** The source pixel width needed by object-fit:cover can exceed the frame's
 * visible width, especially when a landscape photograph fills a portrait card.
 */
export function coverSizes(image: CmsImage, mobileRatio: number, desktopRatio = mobileRatio, desktopVw = 100) {
  const sourceRatio = image.width && image.height ? image.width / image.height : 1;
  const factor = (ratio: number) => Number.isFinite(sourceRatio) && ratio > 0 ? Math.max(1, sourceRatio / ratio) : 1;
  return `(max-width: 850px) ${Math.ceil(100 * factor(mobileRatio))}vw, ${Math.ceil(desktopVw * factor(desktopRatio))}vw`;
}

export function imageAttributes(image: CmsImage, sizes = '100vw', maxWidth = 1600): ResponsiveImageAttributes {
  const original = { src: image.src, width: image.width, height: image.height };
  const width = image.width, height = image.height;
  if (!Number.isInteger(width) || !Number.isInteger(height) || !width || !height || width < 1 || height < 1) return original;
  // Match only the native local-media route and raster formats. Never transform
  // arbitrary URLs, PDFs, SVGs or animated GIFs through this presentation helper.
  if (!/^\/_emdash\/api\/media\/file\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp|avif)$/i.test(image.src)) return original;
  const cap = Math.min(width, Math.max(1, Math.min(2000, Math.floor(maxWidth) || 1600)));
  const widths = [...new Set([240, 480, 768, 1080, 1600, cap].filter(n => n <= cap))].sort((a, b) => a - b);
  const rendition = (w: number) => `/_image?${new URLSearchParams({ href: image.src, w: String(w), f: 'webp', q: '85' })}`;
  return {
    ...original,
    src: rendition(Math.min(cap, 1080)),
    srcset: widths.map(w => `${rendition(w)} ${w}w`).join(', '),
    sizes,
    'data-original-src': image.src,
  };
}
