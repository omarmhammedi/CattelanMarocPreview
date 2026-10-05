import assert from 'node:assert/strict';
import test from 'node:test';
import {homeHeroImageAttributes,homeCoverSizes,homePhotoSources} from '../src/lib/home-images.ts';
import {imageAttributes} from '../src/lib/images.ts';
test('hero preload and image keep the existing crop-aware responsive rendition at both breakpoints',()=>{for(const [width,height]of[[1080,1215],[2000,1000],[735,980]]){const image={src:'/_emdash/api/media/file/HERO.jpg',width,height};const sizes=`(max-width: 820px) max(calc(100vw - 40px), calc(${380*1.16}px * ${Number((width/height).toFixed(6))})), max(100vw, calc(116vh * ${Number((width/height).toFixed(6))}))`;assert.deepEqual(homeHeroImageAttributes(image),imageAttributes(image,sizes));assert.equal(homeCoverSizes(image,'100vw','116vh',380*1.16),sizes);}});
test('cleared hero emits no preload and incomplete metadata preserves the original URL',()=>{assert.equal(homeHeroImageAttributes(null),null);assert.deepEqual(homeHeroImageAttributes({src:'/new-photo.jpg'}),{src:'/new-photo.jpg',width:undefined,height:undefined});});

test('mobile formats fill candidate gaps without changing the desktop rendition or CMS source',()=>{
 const image={src:'/_emdash/api/media/file/HERO.jpg',width:1080,height:1215};
 const sizes=homeHeroImageAttributes(image)!.sizes!;
 const sources=homePhotoSources(image,sizes);
 assert.deepEqual(sources.fallback,imageAttributes(image,sizes));
 for(const [format,result] of [['avif',sources.mobileAvif],['webp',sources.mobileWebp]] as const){
  assert(result?.srcset);assert.equal(result.width,1080);assert.equal(result.height,1215);
  assert.equal(result['data-original-src'],image.src);assert.equal(result.sizes,sizes);
  const widths=[];
  for(const candidate of result.srcset.split(', ')){
   const [src,descriptor]=candidate.split(' ');const url=new URL(src,'https://fixture.test');
   assert.equal(url.searchParams.get('href'),image.src);assert.equal(url.searchParams.get('f'),format);
   assert.equal(url.searchParams.get('q'),'85');assert.equal(url.searchParams.get('h'),null);
   assert.equal(url.searchParams.get('fit'),null);
   const width=Number(url.searchParams.get('w'));assert(width<=image.width);assert.equal(descriptor,`${width}w`);widths.push(width);
  }
  assert(widths.includes(640)&&widths.includes(800)&&widths.includes(960));
 }
 const capped=homePhotoSources({...image,width:735,height:735},sizes);
 assert(capped.mobileAvif!.srcset!.endsWith('735w'));
 assert(!capped.mobileAvif!.srcset!.includes('800w'));
});

test('non-native, animated, SVG and incomplete originals never advertise unsupported image formats',()=>{
 for(const image of [
  {src:'https://example.test/photo.jpg',width:1080,height:1215},
  {src:'/_emdash/api/media/file/logo.svg',width:1080,height:1215},
  {src:'/_emdash/api/media/file/animation.gif',width:1080,height:1215},
  {src:'/_emdash/api/media/file/photo.jpg?version=2',width:1080,height:1215},
  {src:'/_emdash/api/media/file/photo.jpg'},
 ]){
  const sources=homePhotoSources(image);
  assert.deepEqual(sources.fallback,imageAttributes(image));
  assert.equal(sources.mobileAvif,null);assert.equal(sources.mobileWebp,null);
 }
});
