import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  FIELD_DEFINITIONS, assertCompatibleSchema, assertContentValue, assertNoDraft, cliAuthentication, detectedMime,
  mediaLeaves, officialUrl, planValues, validateManifest,
} from '../scripts/migrations/0003-model-detail-pages.mjs';

const image = { $media: { url: 'https://download.cattelanitalia.com/example.jpg', filename: 'example.jpg', alt: 'Exemple' } };
const model = { slug: 'example', source_url: 'https://www.cattelanitalia.com/fr/products/example', gallery: [{ image, caption: '', original_url: 'https://download.cattelanitalia.com/original.jpg' }], finishes: [{ group: 'Base', name: 'Bronze', image, zoom_url: 'https://download.cattelanitalia.com/zoom.jpg' }] };
const manifest = { version: 1, verified_at: '2026-09-28', models: [model] };
const schema = { urlPattern: '/collections/', fields: [{ slug: 'image', type: 'image' }] };

test('native CLI credentials are read only for this project and must be unexpired', () => {
  const now = Date.parse('2026-09-28T00:00:00.000Z');
  const origin = new URL('http://localhost:4321');
  const entry = { accessToken: 'synthetic-test-token', refreshToken: 'never-sent', expiresAt: '2026-09-28T01:00:00.000Z', customHeaders: { 'X-Unrelated': 'never-sent' } };
  const store = { 'path:/test/project': entry, 'path:/another/project': { ...entry, accessToken: 'other-project' } };
  const before = structuredClone(store);
  const auth = cliAuthentication(store, origin, '/test/project', now);
  assert.deepEqual(auth.headers, { Authorization: 'Bearer synthetic-test-token' });
  assert.deepEqual(store, before, 'Credentials must never be refreshed or mutated.');
  assert.throws(() => cliAuthentication(store, origin, '/missing/project', now), /No native CLI login/);
  assert.throws(() => cliAuthentication(store, new URL('https://example.com'), '/test/project', now), /local development origin/);
  assert.throws(() => cliAuthentication({ 'http://localhost:4321': entry }, origin, '/test/project', now), /No native CLI login/, 'No fallback to an origin or another project.');
  assert.throws(() => cliAuthentication(store, origin, '/test/project', now + 3_600_000), /expired/);
  assert.throws(() => cliAuthentication({ 'path:/test/project': { ...entry, expiresAt: 'invalid' } }, origin, '/test/project', now), /expired/);
  assert.throws(() => cliAuthentication({ 'path:/test/project': { ...entry, url: 'http://localhost:4331' } }, origin, '/test/project', now), /exact local origin/);
  assert.throws(() => cliAuthentication({ 'path:/test/project': { ...entry, accessToken: 'bad\r\nheader' } }, origin, '/test/project', now), /invalid access token/);
  assert.doesNotThrow(() => cliAuthentication({ 'path:/test/project': { ...entry, url: origin.href } }, origin, '/test/project', now));
});

test('checked-in official manifest follows the imported schema without CMS access', async () => {
  const content = JSON.parse(await readFile(new URL('../content/model-details.json', import.meta.url), 'utf8'));
  assert.equal(validateManifest(content), content);
  for (const entry of content.models) {
    const plan = planValues({}, entry, content.verified_at);
    assert(plan.image?.$media, `${entry.slug} needs a cover from the first official photograph.`);
    assert(plan.content.length, `${entry.slug} needs sourced French content.`);
    for (const leaf of mediaLeaves(plan)) assert(leaf.source.url.startsWith('https://'));
  }
});

test('only empty model fields are filled, preserving editorial text, images and complete lists', () => {
  const original = { title: 'Notre titre', description: 'Notre description', official_url: 'https://example.com/editor', image: { id: 'editor-image' }, gallery: [{ image: { id: 'editor-gallery' } }], content: [{ _type: 'block', children: [] }], source_url: 'https://example.com/editor-source' };
  const before = structuredClone(original);
  const plan = planValues(original, { ...model, content: [{ _type: 'block', children: [{ _type: 'span', text: 'Source' }] }] }, manifest.verified_at);
  for (const key of Object.keys(original)) assert(!(key in plan), `Must preserve ${key}`);
  assert.deepEqual(original, before, 'Planning must not mutate CMS content.');
  assert.deepEqual(planValues({ finishes: [] }, model, manifest.verified_at).image, image);
  assert.equal(plan.source_verified_at, '2026-09-28T00:00:00.000Z');
  assert(!('zoom_url' in plan.finishes[0]));
  assert('zoom_url' in model.finishes[0], 'Planning must not mutate the source manifest.');
});

test('fully populated content produces an idempotent empty plan', () => {
  const once = planValues({}, model, manifest.verified_at);
  assert.deepEqual(planValues(once, model, manifest.verified_at), {});
  assert(!('original_url' in once.gallery[0]));
  assert.equal(mediaLeaves(once).length, 3, 'Cover, gallery and material are separate references to one shared URL.');
  assert.deepEqual(planValues({ ...once, image: null, content: [], gallery: [], finishes: [], technical_sheet: null }, model, manifest.verified_at), {}, 'Editors can intentionally clear imported content without reruns resurrecting it.');
});

test('unpublished revisions and unsupported statuses prevent imports', () => {
  const item = { slug: 'example', data: {}, status: 'published', liveRevisionId: 'one', draftRevisionId: 'one' };
  assert.doesNotThrow(() => assertNoDraft(item));
  assert.throws(() => assertNoDraft({ ...item, draftRevisionId: 'two' }), /unpublished edits/);
  assert.throws(() => assertNoDraft({ ...item, status: 'draft', liveRevisionId: null }), /unpublished edits/);
  assert.throws(() => assertNoDraft({ ...item, status: 'trash' }), /unsupported publication status/);
});

test('custom routes and incompatible preexisting schema are never replaced', () => {
  assert.doesNotThrow(() => assertCompatibleSchema(schema));
  assert.doesNotThrow(() => assertCompatibleSchema({ ...schema, urlPattern: '/modeles/{slug}/', fields: [...schema.fields, ...FIELD_DEFINITIONS] }));
  assert.throws(() => assertCompatibleSchema({ ...schema, urlPattern: '/custom/{slug}/' }), /custom URL pattern/);
  assert.throws(() => assertCompatibleSchema({ ...schema, fields: [...schema.fields, { slug: 'content', type: 'text' }] }), /another field type/);
  const changed = structuredClone(FIELD_DEFINITIONS);
  changed.find((field) => field.slug === 'gallery').validation.subFields[0].required = true;
  assert.throws(() => assertCompatibleSchema({ ...schema, fields: [...schema.fields, ...changed] }), /different repeater structure/);
});

test('media and redirects are restricted to verified HTTPS official hosts', () => {
  for (const url of ['http://download.cattelanitalia.com/a.jpg', 'https://evil.example/a.jpg', 'https://download.cattelanitalia.com.evil.example/a.jpg', 'https://user:pass@download.cattelanitalia.com/a.jpg', 'https://download.cattelanitalia.com:444/a.jpg', 'https://127.0.0.1/a.jpg']) assert.throws(() => officialUrl(url));
  assert.doesNotThrow(() => officialUrl(image.$media.url));
  assert.throws(() => validateManifest({ ...manifest, models: [{ ...model, unknown_typo: 'text' }] }), /Unknown model field/);
  assert.throws(() => validateManifest({ ...manifest, models: [model, model] }), /Duplicate/);
  assert.throws(() => validateManifest({ ...manifest, models: [{ ...model, image: { $media: { ...image.$media, filename: '../secret' } } }] }), /safe basename/);
  assert.throws(() => validateManifest({ ...manifest, models: [{ ...model, dimensions: [{ label: 'A', seats: '4' }] }] }), /must be an integer/);
});

test('bytes, not extensions or server headers, identify allowed raster images and PDF', () => {
  assert.equal(detectedMime(Buffer.from('%PDF-1.7\n')), 'application/pdf');
  assert.equal(detectedMime(Buffer.from([255, 216, 255, 224])), 'image/jpeg');
  assert.equal(detectedMime(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), 'image/png');
  assert.throws(() => detectedMime(Buffer.from('<html>Access denied</html>')), /not a supported/);
  assert.throws(() => detectedMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), /not a supported/);
});

test('native computed media metadata is allowed while editorial content and media identity remain strict', () => {
  const reference = { provider: 'local', id: 'image-one', filename: 'model.jpg', mimeType: 'image/jpeg', alt: 'Texte éditorial', width: 1600, height: 900, meta: { storageKey: 'media/model.jpg', caption: 'Légende existante' } };
  const expected = [{ image: reference, caption: 'Notre légende', label: 'Configuration A' }];
  const actual = structuredClone(expected);
  Object.assign(actual[0].image, { blurhash: 'computed', dominantColor: '#abcdef' });
  Object.assign(actual[0].image.meta, { blurhash: 'computed', dominantColor: '#abcdef' });
  assert.doesNotThrow(() => assertContentValue(actual, expected));
  for (const [key, replacement] of Object.entries({ id: 'another', filename: 'other.jpg', alt: 'Écrasé', width: 100, height: 200 })) {
    const altered = structuredClone(actual);
    altered[0].image[key] = replacement;
    assert.throws(() => assertContentValue(altered, expected), `Must detect changed ${key}.`);
  }
  for (const key of ['storageKey', 'caption']) {
    const altered = structuredClone(actual);
    altered[0].image.meta[key] = 'Changed';
    assert.throws(() => assertContentValue(altered, expected), `Must preserve existing meta.${key}.`);
  }
  const changedText = structuredClone(actual);
  changedText[0].caption = 'Changed';
  assert.throws(() => assertContentValue(changedText, expected));
  assert.throws(() => assertContentValue([{ ...actual[0], extra: 'unexpected' }], expected), 'Unknown additions are not silently accepted.');
  const pdf = { provider: 'local', id: 'pdf-one', filename: 'model.pdf', mimeType: 'application/pdf', meta: { storageKey: 'media/model.pdf', size: 12000 } };
  assert.doesNotThrow(() => assertContentValue({ ...pdf, meta: { ...pdf.meta, caption: null, blurhash: null, dominantColor: null } }, pdf));
  assert.throws(() => assertContentValue({ ...pdf, meta: { ...pdf.meta, size: 11000 } }, pdf), 'PDF byte count must survive normalization.');
  assert.throws(() => assertContentValue({ ...reference, blurhash: 'new' }, { ...reference, blurhash: 'existing' }), 'Previously stored computed metadata is also preserved.');
});
