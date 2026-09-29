import assert from 'node:assert/strict';
import test from 'node:test';
import { coverSizes, imageAttributes } from '../src/lib/images.ts';

test('cover slot accounts for height when a wide photograph fills a narrow frame', () => {
  assert.equal(coverSizes({src:'photo',width:1200,height:600},1,1.25,50),'(max-width: 850px) 200vw, 80vw');
  assert.equal(coverSizes({src:'photo',width:600,height:1200},1,1.25,50),'(max-width: 850px) 100vw, 50vw');
});

test('renditions preserve original dimensions and never crop or upscale a CMS photograph', () => {
  const img = { src: '/_emdash/api/media/file/PHOTO.jpg', width: 735, height: 980 };
  const result = imageAttributes(img, '(max-width: 760px) 100vw, 48vw');
  assert.equal(result.width, 735); assert.equal(result.height, 980);
  assert.equal(result['data-original-src'], img.src);
  assert.equal(result.sizes, '(max-width: 760px) 100vw, 48vw');
  for (const item of result.srcset!.split(', ')) {
    const [src, descriptor] = item.split(' '), url = new URL(src, 'https://site.test');
    assert.equal(url.pathname, '/_image');
    assert.equal(url.searchParams.get('href'), img.src);
    assert.equal(url.searchParams.get('f'), 'webp');
    assert.equal(url.searchParams.get('h'), null);
    assert(Number(url.searchParams.get('w')) <= 735);
    assert.equal(descriptor, `${url.searchParams.get('w')}w`);
  }
  const thumbnail = imageAttributes(img, '88px', 176);
  assert(thumbnail.srcset!.endsWith('176w'));
  assert(!thumbnail.srcset!.includes('240w'));
});

test('external, mutable URL query, non-raster, animated and incomplete image values pass through unchanged', () => {
  for (const src of ['https://other.test/image.jpg', '//other.test/image.jpg', '/image.jpg', '/_emdash/api/media/file/image.svg', '/_emdash/api/media/file/image.gif', '/_emdash/api/media/file/photo.jpg?version=2', '/_emdash/api/media/file/..%2fprivate.jpg']) {
    const img = { src, width: 500, height: 600 };
    assert.deepEqual(imageAttributes(img), img);
  }
  assert.deepEqual(imageAttributes({src:'/_emdash/api/media/file/new.jpg'}), {src:'/_emdash/api/media/file/new.jpg',width:undefined,height:undefined});
});
