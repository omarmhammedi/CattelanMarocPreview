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
