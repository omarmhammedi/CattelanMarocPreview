import assert from 'node:assert/strict';
import test from 'node:test';
import {homeHeroImageAttributes,homeCoverSizes} from '../src/lib/home-images.ts';
import {imageAttributes} from '../src/lib/images.ts';
test('hero preload and image keep the existing crop-aware responsive rendition at both breakpoints',()=>{for(const [width,height]of[[1080,1215],[2000,1000],[735,980]]){const image={src:'/_emdash/api/media/file/HERO.jpg',width,height};const sizes=`(max-width: 820px) max(calc(100vw - 40px), calc(${380*1.16}px * ${Number((width/height).toFixed(6))})), max(100vw, calc(116vh * ${Number((width/height).toFixed(6))}))`;assert.deepEqual(homeHeroImageAttributes(image),imageAttributes(image,sizes));assert.equal(homeCoverSizes(image,'100vw','116vh',380*1.16),sizes);}});
test('cleared hero emits no preload and incomplete metadata preserves the original URL',()=>{assert.equal(homeHeroImageAttributes(null),null);assert.deepEqual(homeHeroImageAttributes({src:'/new-photo.jpg'}),{src:'/new-photo.jpg',width:undefined,height:undefined});});
