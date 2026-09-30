/** In-memory safety tests: never authenticate, fetch or open a CMS fixture. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateGalleryAltManifest, planGalleryAlt, prepareGalleryAlt, applyGalleryAlt } from '../scripts/migrations/0013-gallery-alt.mjs';

const load = async () => JSON.parse(await readFile(new URL('../content/gallery-alt-2026-09-30.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
function responseFor(entry, completed = false) {
  return {_rev: `revision-${entry.slug}`, item: {
    id: `id-${entry.slug}`, type: 'models', slug: entry.slug, status: 'published', liveRevisionId: 'live', draftRevisionId: 'live',
    authorId: 'preserved-author', primaryBylineId: 'preserved-byline', bylines: [{id: 'preserved-byline'}], createdAt: '2026-09-01T10:00:00Z', publishedAt: '2026-09-02T10:00:00Z', locale: 'fr', translationGroup: 'preserved-group',
    seo: {title: 'Preserved SEO', description: 'Preserved description', noIndex: true, canonical: 'https://example.test/preserved/'},
    data: {
      title: 'Preserved model title', description: 'Preserved description', independent_field: 'Preserved owner value',
      gallery: entry.gallery.map(item => ({image: {...clone(item.expectedImage), alt: completed ? item.afterAlt : item.beforeAlt}, caption: `Existing caption ${item.index}`, owner_note: `Existing note ${item.index}`})),
      ...(entry.image ? {image: {...clone(entry.image.expectedImage), alt: completed ? entry.image.afterAlt : entry.image.beforeAlt}} : {}),
    },
  }};
}

test('gallery manifest is bounded to eleven models and 129 continuous gallery entries', async () => {
  const manifest = await load();
  assert.doesNotThrow(() => validateGalleryAltManifest(manifest));
  assert.equal(manifest.version, 1);
  assert.equal(manifest.entries.length, 11);
  assert.equal(manifest.entries.reduce((count, entry) => count + entry.gallery.length, 0), 129);
  for (const entry of manifest.entries) assert.deepEqual(entry.gallery.map(item => item.index), entry.gallery.map((_, index) => index));
});

test('manifest refuses unexpected edits, identities, source URLs, hashes and gallery ordering', async () => {
  const original = await load();
  for (const mutate of [
    m => {m.version = 2;},
    m => {m.unrequested = true;},
    m => {m.entries[0].title = 'Unrequested title';},
    m => {m.entries[0].slug = '../another';},
    m => {m.entries.push(clone(m.entries[0]));},
    m => {m.entries[0].gallery[0].unexpected = true;},
    m => {m.entries[0].gallery[0].sourceUrl = 'https://other.example/image.jpg';},
    m => {m.entries[0].gallery[0].sourceUrl = 'javascript:alert(1)';},
    m => {m.entries[0].gallery[0].sourceSha256 = 'not-a-sha256';},
    m => {m.entries[0].gallery[0].index = -1;},
    m => {m.entries[0].gallery[1].index = 0;},
    m => {m.entries[0].gallery.reverse();},
    m => {m.entries[0].gallery[0].expectedImage.alt = 'An alt outside the guarded fields';},
    m => {m.entries[0].gallery[0].afterAlt = '';},
  ]) {
    const manifest = clone(original); mutate(manifest);
    assert.throws(() => validateGalleryAltManifest(manifest));
  }
});

test('planning copies only gallery and selected image alt values while preserving captions and all media metadata', async () => {
  const {entries} = await load();
  for (const entry of entries) {
    const response = responseFor(entry), snapshot = clone(response), manifestSnapshot = clone(entry);
    const plan = planGalleryAlt(response, entry);
    assert.equal(plan.change, true);
    assert.deepEqual(Object.keys(plan.values).sort(), ['gallery', ...(entry.image ? ['image'] : [])].sort());
    const expected = clone(response.item.data.gallery);
    for (const change of entry.gallery) expected[change.index].image.alt = change.afterAlt;
    assert.deepEqual(plan.values.gallery, expected);
    if (entry.image) assert.deepEqual(plan.values.image, {...response.item.data.image, alt: entry.image.afterAlt});
    assert.deepEqual(response, snapshot, 'Planning must not mutate the source response.');
    assert.deepEqual(entry, manifestSnapshot, 'Planning must not mutate its manifest.');
    plan.values.gallery[0].caption = 'Mutation of the proposed write';
    assert.deepEqual(response, snapshot, 'Proposed values must not alias live response objects.');
  }
});

test('only exact complete states are recognized, without native API calls or writes on repeat', async () => {
  const {entries} = await load();
  const plans = entries.map(entry => {
    const before = responseFor(entry, true), snapshot = clone(before), proposed = planGalleryAlt(before, entry);
    assert.equal(proposed.change, false);
    assert.deepEqual(before, snapshot);
    return {entry, before, ...proposed};
  });
  await applyGalleryAlt(async () => assert.fail('A completed migration must not call the API.'), {plans});
});

test('custom, cleared, partially migrated and inconsistent main-image alts are preserved by refusal', async () => {
  const {entries} = await load(), entry = entries.find(item => item.gallery.length > 1);
  for (const mutate of [
    r => {r.item.data.gallery[0].image.alt = 'Independent owner description';},
    r => {r.item.data.gallery[0].image.alt = '';},
    r => {delete r.item.data.gallery[0].image.alt;},
    r => {r.item.data.gallery[0].image.alt = entry.gallery[0].afterAlt;},
  ]) {
    const response = responseFor(entry); mutate(response); const snapshot = clone(response);
    assert.throws(() => planGalleryAlt(response, entry)); assert.deepEqual(response, snapshot);
  }
  const withImage = entries.find(item => item.image); assert(withImage, 'The real manifest includes its selected main-image alt fixes.');
  for (const complete of [false, true]) {
    const response = responseFor(withImage, complete);
    response.item.data.image.alt = complete ? withImage.image.beforeAlt : withImage.image.afterAlt;
    assert.throws(() => planGalleryAlt(response, withImage));
  }
});

test('changed media identities, storage, dimensions, metadata, gallery order and count stop planning', async () => {
  const {entries} = await load(), entry = entries.find(item => item.gallery.length > 1);
  for (const mutate of [
    r => {r.item.data.gallery[0].image.id = 'another-media-id';},
    r => {r.item.data.gallery[0].image.provider = 'external';},
    r => {r.item.data.gallery[0].image.filename = 'replacement.jpg';},
    r => {r.item.data.gallery[0].image.width += 1;},
    r => {r.item.data.gallery[0].image.height += 1;},
    r => {r.item.data.gallery[0].image.mimeType = 'image/png';},
    r => {r.item.data.gallery[0].image.meta.storageKey = 'replacement.jpg';},
    r => {r.item.data.gallery[0].image.meta.caption = 'Changed media-library caption';},
    r => {r.item.data.gallery[0].image.meta.unexpected = 'New metadata';},
    r => {delete r.item.data.gallery[0].image.meta;},
    r => {r.item.data.gallery.reverse();},
    r => {r.item.data.gallery.pop();},
    r => {r.item.data.gallery.push(clone(r.item.data.gallery[0]));},
  ]) {
    const response = responseFor(entry); mutate(response); const snapshot = clone(response);
    assert.throws(() => planGalleryAlt(response, entry)); assert.deepEqual(response, snapshot);
  }
});

test('native drafts, unpublished entries, changed identities and missing revisions are rejected', async () => {
  const {entries} = await load(), entry = entries[0];
  for (const mutate of [
    r => {r.item.draftRevisionId = 'independent-pending-draft';},
    r => {r.item.status = 'draft';},
    r => {r.item.status = 'archived';},
    r => {r.item.type = 'families';},
    r => {r.item.slug = 'another-model';},
    r => {r._rev = '';},
  ]) {
    const response = responseFor(entry); mutate(response);
    assert.throws(() => planGalleryAlt(response, entry));
  }
});

function memoryApi(manifest) {
  const state = {entries: Object.fromEntries(manifest.entries.map(entry => [entry.slug, responseFor(entry)])), schema: {
    slug: 'models', supports: ['revisions', 'drafts', 'seo'], fields: [
      {slug: 'gallery', type: 'repeater', validation: {subFields: [{slug: 'image', type: 'image'}, {slug: 'caption', type: 'text'}]}}, {slug: 'image', type: 'image'}, {slug: 'title', type: 'string'},
    ],
  }, parents: Object.fromEntries(manifest.entries.map(entry => [`id-${entry.slug}`, [{id: `family-${entry.slug}`, collection: 'families', locale: 'fr', sortOrder: 0}]])), writes: [], reads: [], serial: 0, onWrite: null};
  const api = async (path, {method = 'GET', data} = {}) => {
    if (method === 'GET') state.reads.push(path);
    if (path === '/_emdash/api/schema/collections/models?includeFields=true') {assert.equal(method, 'GET'); return {item: clone(state.schema)};}
    const parent = path.match(/^\/_emdash\/api\/content\/models\/([^/]+)\/references\/family_models\/parents\?limit=100$/);
    if (parent) {assert.equal(method, 'GET'); assert(state.parents[parent[1]]); return {parents: clone(state.parents[parent[1]])};}
    const match = path.match(/^\/_emdash\/api\/content\/models\/([a-z0-9-]+)(\/publish)?$/); assert(match, `Unexpected in-memory request: ${path}`);
    const entry = state.entries[match[1]]; assert(entry);
    if (method === 'GET') return clone(entry);
    assert.equal(data._rev, entry._rev, 'Native revision guard');
    if (method === 'PUT') {
      assert(!match[2]); assert.deepEqual(Object.keys(data).sort(), ['_rev', 'data']);
      assert(Object.keys(data.data).every(key => ['image', 'gallery'].includes(key)));
      entry.item.liveData = clone(entry.item.data);
      entry.item.data = {...entry.item.data, ...clone(data.data)};
      entry._rev = `saved-${++state.serial}`; entry.item.draftRevisionId = entry._rev;
    } else {
      assert.equal(method, 'POST'); assert(match[2]); assert.deepEqual(Object.keys(data), ['_rev']);
      entry.item.liveRevisionId = entry.item.draftRevisionId;
      delete entry.item.liveData;
    }
    const call = {path, method, data: clone(data)}; state.writes.push(call);
    const result = clone(entry); await state.onWrite?.(call, state); return result;
  };
  return {api, state};
}

test('native preparation is read-only and requires the existing gallery/image schema', async () => {
  const manifest = await load(), {api, state} = memoryApi(manifest), snapshot = clone({entries: state.entries, schema: state.schema});
  const plan = await prepareGalleryAlt(api, manifest);
  assert.equal(plan.plans.filter(item => item.change).length, 11);
  assert.deepEqual({entries: state.entries, schema: state.schema}, snapshot); assert.equal(state.writes.length, 0);
  state.schema.fields.find(field => field.slug === 'gallery').type = 'text';
  await assert.rejects(() => prepareGalleryAlt(api, manifest)); assert.equal(state.writes.length, 0);
});

test('publication backs up first, saves only alts and retains source metadata, captions, SEO and author fields', async () => {
  const manifest = await load(), {api, state} = memoryApi(manifest), original = clone(state.entries);
  const plan = await prepareGalleryAlt(api, manifest); let backedUp = false; const updated = [];
  state.onWrite = () => assert(backedUp, 'All writes must follow the backup.');
  await applyGalleryAlt(api, plan, {beforeWrite: async () => {assert.equal(state.writes.length, 0); backedUp = true;}, afterEntry: item => updated.push(item)});
  assert.equal(updated.length, 11); assert.equal(state.writes.length, 22);
  for (const entry of manifest.entries) {
    const current = state.entries[entry.slug], expected = responseFor(entry, true);
    assert.deepEqual(current.item.data, expected.item.data);
    assert.deepEqual(current.item.seo, original[entry.slug].item.seo);
    for (const key of ['id', 'type', 'slug', 'status', 'authorId', 'primaryBylineId', 'bylines', 'createdAt', 'publishedAt', 'locale', 'translationGroup']) assert.deepEqual(current.item[key], original[entry.slug].item[key]);
    assert.equal(current.item.liveRevisionId, current.item.draftRevisionId);
  }
});

test('changed revisions, schema or captions before writes and changes after draft save prevent publication', async () => {
  const manifest = await load(), slug = manifest.entries[0].slug;
  for (const mutate of [
    state => {state.entries[slug]._rev = 'concurrent-owner-revision';},
    state => {state.schema.fields[0].label = 'Concurrent schema edit';},
    state => {state.entries[slug].item.data.gallery[0].caption = 'Concurrent caption edit';},
    state => {state.parents[`id-${slug}`][0].sortOrder = 2;},
  ]) {
    const {api, state} = memoryApi(manifest), plan = await prepareGalleryAlt(api, manifest); mutate(state);
    let backedUp = false;
    await assert.rejects(() => applyGalleryAlt(api, plan, {beforeWrite: async () => {backedUp = true;}}));
    assert.equal(backedUp, false, 'A changed plan must stop before requesting its backup.'); assert.equal(state.writes.length, 0);
  }
  for (const mutate of [
    state => {state.entries[slug]._rev = 'concurrent-owner-revision';},
    state => {state.schema.fields[0].label = 'Concurrent schema edit';},
    state => {state.entries[slug].item.data.gallery[0].caption = 'Concurrent caption edit';},
    state => {state.entries[slug].item.data.gallery[0].image.meta.storageKey = 'wrong.jpg';},
    state => {state.entries[slug].item.seo.title = 'Unexpected SEO change';},
    state => {state.parents[`id-${slug}`][0].sortOrder = 2;},
    state => {state.entries[slug].item.liveData.gallery[0].caption = 'Published caption changed while draft pending';},
    state => {state.entries[slug].item.liveRevisionId = 'another-published-revision';},
  ]) {
    const {api, state} = memoryApi(manifest), plan = await prepareGalleryAlt(api, manifest);
    state.onWrite = call => {if (call.method === 'PUT') mutate(state);};
    await assert.rejects(() => applyGalleryAlt(api, plan, {beforeWrite: async () => {}})); assert.deepEqual(state.writes.map(call => call.method), ['PUT']);
  }
});
