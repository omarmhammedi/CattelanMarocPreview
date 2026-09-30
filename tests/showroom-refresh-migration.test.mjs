import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { applyShowroomRefresh, prepareShowroomRefresh, validateShowroomRefresh } from '../scripts/migrations/0009-showroom-refresh.mjs';

const originalManifest = JSON.parse(await readFile(new URL('../content/showroom-refresh.json', import.meta.url), 'utf8'));
const copy = JSON.parse(await readFile(new URL('../content/showroom-editorial-copy.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const imagePath = image => `/_emdash/api/media/file/${image.meta.storageKey}`;
const response = (type, slug, data) => ({ _rev: `revision-${slug}`, item: { id: `id-${slug}`, type, slug, status: 'published', authorId: 'existing-author', liveRevisionId: `live-${slug}`, draftRevisionId: `live-${slug}`, seo: null, publishedAt: '2026-09-01', data } });

function fixture() {
  const manifest = clone(originalManifest);
  const bytes = new Map();
  let serial = 0;
  const image = (description, alt = description.alt) => {
    const id = `media-${++serial}`;
    const data = Buffer.from([0xff, 0xd8, 0xff, serial, 0xff, 0xd9]);
    description.sha256 = digest(data);
    const value = { id, provider: 'local', filename: description.filename, mimeType: description.mimeType, width: description.width, height: description.height, alt, meta: { storageKey: `${id}.jpg` } };
    bytes.set(imagePath(value), data);
    return value;
  };
  const home = response('pages', 'home', {
    title: 'Keep home title', intro: 'Keep home intro', content: [], custom_editor_value: 'keep me',
    sections: [{ _key: 'brand-key', section_key: 'brand', heading: 'Independent editorial brand heading', custom: 'keep' }, { _key: 'showroom-key', ...clone(manifest.before.home.showroom_section), custom: 'keep too' }, { section_key: 'journal', heading: 'Unrelated content' }],
    showroom_invitation: manifest.before.home.showroom_invitation,
    brand_image: image(manifest.before.home.brand_image), brand_detail_image: image(manifest.before.home.brand_detail_image), showroom_image: image(manifest.before.home.showroom_image),
  });
  const showroom = response('pages', 'showroom-casablanca', { title: 'Keep showroom title', route_key: 'showroom', content: [], ...clone(manifest.before.showroom), sections: manifest.before.showroom.sections.map(row => ({ _key: `${row.section_key}-key`, ...clone(row) })), hero_image: image(manifest.before.showroom.hero_image) });
  const model = response('models', 'skorpio', { title: 'Skorpio unchanged', gallery: Array.from({ length: 8 }, () => ({ image: null, caption: 'Keep' })) });
  for (const asset of [manifest.assets.brand, manifest.assets.detail]) model.item.data.gallery[asset.gallery_index].image = image(asset, `Existing model alt ${asset.gallery_index}`);
  const photoBytes = Buffer.from([0xff, 0xd8, 0xff, 99, 0xff, 0xd9]);
  manifest.assets.showroom.sha256 = digest(photoBytes);
  manifest.assets.showroom.bytes = photoBytes.length;
  bytes.set(manifest.assets.showroom.url, photoBytes);
  const schema = { slug: 'pages', supports: ['drafts', 'revisions', 'seo'], fields: [
    ...Object.entries({ intro: 'text', showroom_invitation: 'text', brand_image: 'image', brand_detail_image: 'image', showroom_image: 'image', hero_image: 'image', seo_title: 'string', meta_description: 'text' }).map(([slug, type]) => ({ slug, type })),
    { slug: 'sections', type: 'repeater', validation: { subFields: ['section_key', 'cta_label', 'cta_href'].map(slug => ({ slug, type: 'string' })) } },
    { slug: 'related', type: 'reference', validation: { relation: 'links' } },
  ] };
  const state = { entries: { home, 'showroom-casablanca': showroom }, model, schema, writes: [], bytes, references: [{ id: 'preserved-related', collection: 'models', sortOrder: 0 }], serial: 0, reads: [] };
  const api = async (path, options = {}) => {
    const { method = 'GET', data, form } = options;
    if (method === 'GET') state.reads.push(path);
    if (path === '/_emdash/api/schema/collections/pages?includeFields=true') { assert.equal(method, 'GET'); return { item: clone(state.schema) }; }
    if (path === '/_emdash/api/content/models/skorpio') { assert.equal(method, 'GET'); return clone(state.model); }
    if (path.includes('/references/links/children?')) { assert.equal(method, 'GET'); return { children: clone(state.references) }; }
    if (path === '/_emdash/api/media') {
      assert.equal(method, 'POST');
      assert.equal(form.get('deduplicate'), 'true');
      assert.equal(form.get('ensureUniqueFilename'), 'true');
      assert.equal(form.get('file').name, manifest.assets.showroom.filename);
      assert.equal(form.get('file').type, 'image/jpeg');
      const uploaded = Buffer.from(await form.get('file').arrayBuffer());
      assert.deepEqual(uploaded, bytes.get(manifest.assets.showroom.url));
      state.writes.push({ path, method });
      const item = { id: 'new-photo', storageKey: 'new-photo.jpg', filename: manifest.assets.showroom.filename, mimeType: 'image/jpeg', size: uploaded.length, width: manifest.assets.showroom.width, height: manifest.assets.showroom.height };
      bytes.set('/_emdash/api/media/file/new-photo.jpg', uploaded);
      return { item, deduplicated: false };
    }
    const match = path.match(/^\/_emdash\/api\/content\/pages\/(home|showroom-casablanca)(\/publish)?$/);
    assert(match, `Unexpected request: ${method} ${path}`);
    const entry = state.entries[match[1]];
    if (method === 'GET') return clone(entry);
    assert.equal(data._rev, entry._rev, 'Native optimistic revision guard');
    state.writes.push({ path, method, data: clone(data) });
    if (method === 'PUT') {
      assert.deepEqual(Object.keys(data).sort(), ['_rev', 'data']);
      entry.item.data = { ...entry.item.data, ...clone(data.data) };
      entry._rev = `save-${++state.serial}`;
      entry.item.draftRevisionId = entry._rev;
    } else {
      assert.equal(method, 'POST'); assert(match[2]);
      entry.item.liveRevisionId = entry.item.draftRevisionId;
    }
    return clone(entry);
  };
  const readAsset = async url => { assert(bytes.has(url), `Unexpected asset: ${url}`); return bytes.get(url); };
  const prepare = () => prepareShowroomRefresh(api, manifest, copy, { readAsset });
  const apply = (plan, hooks = {}) => applyShowroomRefresh(api, plan, { readAsset, beforeWrite: async () => {}, ...hooks });
  return { manifest, state, api, readAsset, prepare, apply };
}

test('manifest restricts the copy, exact source URL, reused gallery slots and JPEG metadata', () => {
  assert.equal(validateShowroomRefresh(originalManifest, copy), originalManifest);
  for (const mutate of [value => { value.assets.showroom.url += '?unapproved=1'; }, value => { value.assets.showroom.bytes = 100000000; }, value => { value.assets.brand.gallery_index = 0; }, value => { value.assets.detail.source_url = 'https://example.test/image.jpg'; }, value => { value.before.home.brand_image.custom = true; }]) {
    const changed = clone(originalManifest); mutate(changed); assert.throws(() => validateShowroomRefresh(changed, copy));
  }
});

test('dry-run validates native image bytes and makes no writes or press download', async () => {
  const f = fixture();
  const reads = [];
  const plan = await prepareShowroomRefresh(f.api, f.manifest, copy, { readAsset: async url => { reads.push(url); return f.readAsset(url); } });
  assert.equal(plan.state, 'initial');
  assert.equal(plan.entries.length, 2);
  assert.equal(f.state.writes.length, 0);
  assert(reads.every(url => url.startsWith('/_emdash/api/media/file/')));
  assert.equal(reads.length, 6);
});

test('native apply backs up before media, preserves keys/SEO/unrelated content and is idempotent', async () => {
  const f = fixture();
  const before = clone(f.state.entries);
  const model = clone(f.state.model);
  const plan = await f.prepare();
  let backedUp = false;
  const result = await f.apply(plan, { beforeWrite: async snapshot => { assert.deepEqual(snapshot, plan); assert.equal(f.state.writes.length, 0); backedUp = true; }, afterMedia: async () => { assert(backedUp); } });
  assert.equal(result.completed.length, 2);
  assert.equal(f.state.writes.filter(call => call.path === '/_emdash/api/media').length, 1);
  assert.equal(f.state.writes.filter(call => call.path.endsWith('/publish')).length, 2);
  assert.deepEqual(f.state.model, model);
  for (const slug of ['home', 'showroom-casablanca']) {
    const entry = f.state.entries[slug];
    assert.equal(entry.item.title, before[slug].item.title);
    assert.equal(entry.item.data.title, before[slug].item.data.title);
    assert.deepEqual(entry.item.seo, before[slug].item.seo);
    assert.equal(entry.item.authorId, before[slug].item.authorId);
    assert.equal(entry.item.publishedAt, before[slug].item.publishedAt);
    assert.equal(entry.item.liveRevisionId, entry.item.draftRevisionId);
  }
  const home = f.state.entries.home.item.data;
  assert.deepEqual(home.sections[0], before.home.item.data.sections[0]);
  assert.deepEqual(home.sections[2], before.home.item.data.sections[2]);
  assert.equal(home.sections[1]._key, 'showroom-key');
  assert.equal(home.sections[1].custom, 'keep too');
  assert.equal(home.custom_editor_value, 'keep me');
  assert.equal(home.brand_image.id, model.item.data.gallery[5].image.id);
  assert.equal(home.brand_image.alt, f.manifest.assets.brand.alt);
  assert.deepEqual(home.showroom_image, f.state.entries['showroom-casablanca'].item.data.hero_image);
  assert.deepEqual(f.state.entries['showroom-casablanca'].item.data.sections.map(row => row._key), ['cities-key', 'visit-key', 'faq_1-key', 'faq_2-key']);
  const again = await f.prepare();
  assert.equal(again.state, 'complete');
  const count = f.state.writes.length;
  await f.apply(again, { beforeWrite: async () => assert.fail('An idempotent apply must not back up or write.') });
  assert.equal(f.state.writes.length, count);
  assert(f.state.writes.every(call => call.path === '/_emdash/api/media' || /^\/_emdash\/api\/content\/pages\/(home|showroom-casablanca)(\/publish)?$/.test(call.path)));
});

test('editor changes, clears, overrides, partial states and unpublished drafts are preserved', async () => {
  for (const mutate of [
    f => { f.state.entries.home.item.data.showroom_invitation = ''; },
    f => { f.state.entries.home.item.data.sections[1].text = 'An editor changed this'; },
    f => { f.state.entries.home.item.data.sections[0].image = f.state.entries.home.item.data.brand_image; },
    f => { f.state.entries['showroom-casablanca'].item.data.sections[2].text = ''; },
    f => { f.state.entries.home.item.draftRevisionId = 'unpublished-revision'; },
    f => { f.state.entries['showroom-casablanca'].item.status = 'draft'; },
    f => { f.state.entries.home.item.data.brand_image.alt = 'Editor crop'; },
    f => { f.state.entries.home.item.data.brand_image.focalPoint = { x: 0.2, y: 0.3 }; },
    f => { f.state.entries['showroom-casablanca'].item.data.intro = copy.showroom.intro; },
  ]) {
    const f = fixture(); mutate(f);
    await assert.rejects(f.prepare);
    assert.equal(f.state.writes.length, 0);
  }
});

test('completed clears and image replacements are never refilled', async () => {
  for (const mutate of [f => { f.state.entries.home.item.data.showroom_image = null; }, f => { f.state.entries.home.item.data.brand_image.alt = ''; }, f => { f.state.entries['showroom-casablanca'].item.data.sections[0].text = ''; }]) {
    const f = fixture(); await f.apply(await f.prepare());
    const count = f.state.writes.length; mutate(f);
    await assert.rejects(f.prepare);
    assert.equal(f.state.writes.length, count);
  }
});

test('changed native bytes and wrong source bytes fail before upload', async () => {
  const f = fixture();
  const path = imagePath(f.state.entries.home.item.data.brand_image);
  f.state.bytes.set(path, Buffer.from([0xff, 0xd8, 0xff, 123]));
  await assert.rejects(f.prepare, /SHA-256/);
  assert.equal(f.state.writes.length, 0);
  const other = fixture(); const plan = await other.prepare();
  other.state.bytes.set(other.manifest.assets.showroom.url, Buffer.from([0xff, 0xd8, 0xff, 124, 0xff, 0xd9]));
  await assert.rejects(() => other.apply(plan), /SHA-256/);
  assert.equal(other.state.writes.length, 0);
  const concurrent = fixture(); const prepared = await concurrent.prepare();
  concurrent.state.bytes.set(imagePath(concurrent.state.model.item.data.gallery[5].image), Buffer.from([0xff, 0xd8, 0xff, 125]));
  await assert.rejects(() => concurrent.apply(prepared), /SHA-256/);
  assert.equal(concurrent.state.writes.length, 0);
});

test('concurrent page/schema/model/reference changes and failed backup prevent all mutations', async () => {
  for (const mutate of [
    f => { f.state.entries.home._rev = 'concurrent'; },
    f => { f.state.entries['showroom-casablanca'].item.seo = { title: 'Concurrent SEO' }; },
    f => { f.state.schema.fields[0].type = 'string'; },
    f => { f.state.model.item.data.gallery[5].image.alt = 'Concurrent model edit'; },
    f => { f.state.references[0].sortOrder = 99; },
  ]) {
    const f = fixture(); const plan = await f.prepare(); mutate(f);
    await assert.rejects(() => f.apply(plan, { beforeWrite: async () => assert.fail('Do not back up a stale plan.') }));
    assert.equal(f.state.writes.length, 0);
  }
  const f = fixture(); const plan = await f.prepare();
  await assert.rejects(() => f.apply(plan, { beforeWrite: async () => { throw new Error('Backup unavailable'); } }), /Backup unavailable/);
  assert.equal(f.state.writes.length, 0);
});

test('a concurrent edit after media upload leaves the image intact and stops before content saves', async () => {
  const f = fixture(); const plan = await f.prepare();
  await assert.rejects(() => f.apply(plan, { afterMedia: async () => { f.state.entries.home._rev = 'editor-saved-during-upload'; } }), /concurrently/);
  assert.deepEqual(f.state.writes.map(call => call.path), ['/_emdash/api/media']);
  assert(f.state.bytes.has('/_emdash/api/media/file/new-photo.jpg'));
});

test('a concurrent schema or reference change after save stops before publish', async () => {
  for (const mutate of [f => { f.state.schema.fields[0].label = 'Concurrent label'; }, f => { f.state.references[0].sortOrder = 99; }, f => { f.state.entries.home._rev = 'Concurrent revision'; }]) {
    const f = fixture(); const plan = await f.prepare();
    const changingApi = async (path, options) => { const value = await f.api(path, options); if (options?.method === 'PUT') mutate(f); return value; };
    await assert.rejects(() => applyShowroomRefresh(changingApi, plan, { readAsset: f.readAsset, beforeWrite: async () => {} }));
    assert.equal(f.state.writes.filter(call => call.path.endsWith('/publish')).length, 0);
  }
});
