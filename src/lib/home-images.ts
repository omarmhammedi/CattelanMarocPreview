import {imageAttributes, type CmsImage} from './images.ts';

// Match the homepage's object-fit:cover frames, including the 116% image height.
// Both the visible hero and its head preload must use the same size calculation.
export const homeCoverWidth = (image:CmsImage|null, width:string, height:string) => image?.width && image.height
  ? `max(${width}, calc(${height} * ${Number((image.width / image.height).toFixed(6))}))` : width;
export const homeCoverSizes = (image:CmsImage|null, width:string, height:string, mobileHeight:number, mobileWidth='calc(100vw - 40px)') =>
  `(max-width: 820px) ${homeCoverWidth(image,mobileWidth,mobileHeight+'px')}, ${homeCoverWidth(image,width,height)}`;
export function homeHeroImageAttributes(image:CmsImage|null) {
  return image ? imageAttributes(image,homeCoverSizes(image,'100vw','116vh',380*1.16)) : null;
}

export const homeMobileMedia = '(max-width: 820px)';
export const homeDesktopMedia = 'not all and (max-width: 820px)';
// Fill the gaps that otherwise make a ~784px mobile hero select 1080px and a
// ~546px card select 768px. Original dimensions and the existing cap still apply.
const mobileWidths = [240, 360, 480, 640, 768, 800, 960, 1080, 1280, 1600];
export function homePhotoSources(image:CmsImage, sizes='100vw', maxWidth=1600) {
  const fallback = imageAttributes(image,sizes,maxWidth);
  // Never advertise an original/external/SVG/GIF as an AVIF rendition.
  if (!fallback.srcset) return {fallback,mobileAvif:null,mobileWebp:null};
  return {fallback,
    mobileAvif:imageAttributes(image,sizes,maxWidth,{format:'avif',widths:mobileWidths}),
    mobileWebp:imageAttributes(image,sizes,maxWidth,{format:'webp',widths:mobileWidths}),
  };
}
