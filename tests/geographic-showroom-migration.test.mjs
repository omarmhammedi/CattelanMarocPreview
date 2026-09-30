import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  FIELD_DEFINITIONS, applyGeographicShowroom, assertGeographicSchema,
  planGeographicValues, prepareGeographicShowroom, validateGeographicManifest,
} from '../scripts/migrations/0006-geographic-showroom-map.mjs';

const clone = value => structuredClone(value);
const manifest = JSON.parse(await readFile(new URL('../content/showroom-geography.json', import.meta.url), 'utf8'));
const globalEntry = () => ({ _rev: 'original-revision', item: {
  id: 'global-native-id', type: 'site_content', slug: 'global', status: 'published', liveRevisionId: 'original-revision', draftRevisionId: 'original-revision',
  authorId: 'original-editor', publishedAt: '2026-09-28T00:00:00.000Z', seo: { title: 'Keep SEO', noIndex: true },
  data: { title: 'Keep title', map_note: manifest.before.map_note, address: 'Keep address', hours: 'Keep local hours', contact_phone: 'Keep phone', map_url: 'https://www.google.com/maps/dir/?api=1&destination=keep', map_embed_url: manifest.source.embed_url, public_email: '', whatsapp_url: null, logo_light: { id: 'keep-image', provider: 'local', meta: { storageKey: 'media/original.png' } }, unknown_editor_value: 'keep' },
} });
const schema = () => ({ slug: 'site_content', label: 'Existing label', supports: ['drafts', 'revisions', 'seo'], fields: [
  ...Object.entries({ title: 'string', address: 'text', hours: 'text', contact_phone: 'string', map_url: 'url', map_note: 'text', map_embed_url: 'url' }).map(([slug, type]) => ({ slug, type, required: false })),
  { slug: 'active_catalogue', type: 'reference', validation: { relation: 'global_catalogue' } },
] });

function fixture() {
  const state = { schema: schema(), entry: globalEntry(), mutations: [], serial: 0, references: [{ id: 'original-catalogue', collection: 'catalogues', translationGroup: 'original-group', locale: 'fr', sortOrder: 0 }] };
  const api = async (path, { method = 'GET', data } = {}) => {
    if (path.includes('/references/global_catalogue/children?')) return { children: clone(state.references) };
    if (path === '/_emdash/api/schema/collections/site_content?includeFields=true') { assert.equal(method, 'GET'); return { item: clone(state.schema) }; }
    if (path === '/_emdash/api/schema/collections/site_content/fields') {
      assert.equal(method, 'POST');
      assert(!state.schema.fields.some(field => field.slug === data.slug));
      state.mutations.push({ path, method, data: clone(data) });
      state.schema.fields.push(clone(data));
      return { item: clone(data) };
    }
    assert(['/_emdash/api/content/site_content/global', '/_emdash/api/content/site_content/global/publish'].includes(path), 'Only global content may be requested.');
    if (method === 'GET') return clone(state.entry);
    assert.equal(data._rev, state.entry._rev, 'Native optimistic revision check');
    state.mutations.push({ path, method, data: clone(data) });
    if (method === 'PUT') {
      assert.deepEqual(Object.keys(data).sort(), ['_rev', 'data']);
      state.entry.item.data = { ...state.entry.item.data, ...clone(data.data) };
      state.entry._rev = `saved-${++state.serial}`;
      state.entry.item.draftRevisionId = state.entry._rev;
    } else {
      assert.equal(method, 'POST');
      assert(path.endsWith('/publish'));
      state.entry.item.liveRevisionId = state.entry.item.draftRevisionId;
    }
    return clone(state.entry);
  };
  return { state, api };
}

test('manifest uses the actual approved place pin and rejects viewport center or unrelated fields', () => {
  assert.equal(validateGeographicManifest(manifest), manifest);
  for (const modify of [
    value => { value.after.showroom_longitude = -7.6452543873414465; },
    value => { value.after.showroom_latitude = -7.6426741; value.after.showroom_longitude = 33.5927007; },
    value => { value.after.showroom_latitude = '33.5927007'; },
    value => { value.after.map_url = 'https://example.test'; },
    value => { value.before.map_note = ''; },
    value => { value.source.place_id = 'another-place'; },
    value => { value.source.embed_url = value.source.embed_url.replace('www.google.com', 'www.google.com.evil.test'); },
  ]) {
    const modified = clone(manifest);
    modify(modified);
    assert.throws(() => validateGeographicManifest(modified));
  }
});

test('planner initializes only the exact 0005 baseline and preserves completed coordinates', () => {
  const before = globalEntry();
  const untouched = clone(before);
  assert.deepEqual(planGeographicValues(before, manifest), manifest.after);
  assert.deepEqual(before, untouched);
  const completed = clone(before);
  Object.assign(completed.item.data, manifest.after);
  assert.deepEqual(planGeographicValues(completed, manifest), {});
  for (const field of Object.keys(manifest.after)) for (const value of [null, '', 'Editor change']) {
    const changed = clone(completed);
    changed.item.data[field] = value;
    assert.throws(() => planGeographicValues(changed, manifest), /Preserve the editor change\/clear/);
  }
  before.item.data.showroom_latitude = 33.5;
  assert.throws(() => planGeographicValues(before, manifest), /exact 0005 baseline/);
});

test('pending drafts, draft-only global entries and malformed coordinate schemas are protected', () => {
  const before = globalEntry();
  before.item.draftRevisionId = 'pending-editor-draft';
  assert.throws(() => planGeographicValues(before, manifest), /unpublished edits/);
  before.item.draftRevisionId = before.item.liveRevisionId;
  before.item.status = 'draft';
  assert.throws(() => planGeographicValues(before, manifest), /published native global/);
  for (const modify of [
    field => { field.type = 'string'; },
    field => { field.required = true; },
    field => { field.defaultValue = 0; },
    field => { field.validation = { min: -1, max: 1 }; },
  ]) {
    const existing = schema();
    const field = clone(FIELD_DEFINITIONS[0]);
    modify(field);
    existing.fields.push(field);
    assert.throws(() => assertGeographicSchema(existing));
  }
  assert.throws(() => assertGeographicSchema(schema(), true), /native number field/);
});

test('dry planning uses native reads and retains existing reference identities', async () => {
  const { api, state } = fixture();
  const plan = await prepareGeographicShowroom(api, manifest);
  assert.deepEqual(plan.fields, FIELD_DEFINITIONS);
  assert.deepEqual(plan.entries[0].references.active_catalogue, state.references);
  assert.deepEqual(plan.entries[0].values, manifest.after);
  assert.equal(state.mutations.length, 0);
});

test('native apply backs up first and preserves all unrelated global data, metadata and relations', async () => {
  const { api, state } = fixture();
  const before = clone(state.entry);
  const beforeReferences = clone(state.references);
  const plan = await prepareGeographicShowroom(api, manifest);
  const snapshots = [];
  const result = await applyGeographicShowroom(api, plan, {
    beforeWrite: async value => { assert.equal(state.mutations.length, 0); snapshots.push(clone(value)); },
    afterEntry: async value => { snapshots.push(clone(value)); },
  });
  assert.equal(snapshots.length, 2);
  assert.equal(result.completed.length, 1);
  assert.deepEqual(result.addedFields, ['showroom_latitude', 'showroom_longitude']);
  assert.deepEqual(state.entry.item.data, { ...before.item.data, ...manifest.after });
  assert.deepEqual(state.entry.item.seo, before.item.seo);
  assert.equal(state.entry.item.authorId, before.item.authorId);
  assert.equal(state.entry.item.publishedAt, before.item.publishedAt);
  assert.equal(state.entry.item.status, 'published');
  assert.equal(state.entry.item.liveRevisionId, state.entry.item.draftRevisionId);
  assert.deepEqual(state.references, beforeReferences);
  assert.deepEqual(state.mutations.map(call => call.method), ['POST', 'POST', 'PUT', 'POST']);
  assert(state.mutations.every(call => !/(setup|seed|auth|media|users|settings|contacts)/.test(call.path)));
  const again = await prepareGeographicShowroom(api, manifest);
  assert.equal(again.fields.length, 0);
  assert.deepEqual(again.entries[0].values, {});
  const count = state.mutations.length;
  await applyGeographicShowroom(api, again, { beforeWrite: async () => {} });
  assert.equal(state.mutations.length, count);
});

test('stale schema, revisions or references stop all writes', async () => {
  for (const mutate of [
    state => { state.entry._rev = 'concurrent-revision'; },
    state => { state.schema.label = 'Changed schema'; },
    state => { state.references[0].id = 'different-catalogue'; },
    state => { state.entry.item.data.map_note = 'Changed without revision'; },
  ]) {
    const { api, state } = fixture();
    const plan = await prepareGeographicShowroom(api, manifest);
    mutate(state);
    await assert.rejects(() => applyGeographicShowroom(api, plan, { beforeWrite: async () => {} }));
    assert.equal(state.mutations.length, 0);
  }
});

test('backup failure and invalid created coordinate schema prevent content writes', async () => {
  const { api, state } = fixture();
  const plan = await prepareGeographicShowroom(api, manifest);
  await assert.rejects(() => applyGeographicShowroom(api, plan, { beforeWrite: async () => { throw new Error('Backup failed'); } }), /Backup failed/);
  assert.equal(state.mutations.length, 0);
  const incompatibleApi = async (path, options) => {
    const result = await api(path, options);
    if (path.endsWith('/fields') && options?.method === 'POST') state.schema.fields.at(-1).type = 'string';
    return result;
  };
  await assert.rejects(() => applyGeographicShowroom(incompatibleApi, plan, { beforeWrite: async () => {} }), /native number field/);
  assert(!state.mutations.some(call => call.method === 'PUT'));
});

test('native publication condition rejects an intervening editor save', async () => {
  const { api, state } = fixture();
  const plan = await prepareGeographicShowroom(api, manifest);
  const racingApi = async (path, options) => {
    const result = await api(path, options);
    if (options?.method === 'PUT') state.entry._rev = 'concurrent-editor-save';
    return result;
  };
  await assert.rejects(() => applyGeographicShowroom(racingApi, plan, { beforeWrite: async () => {} }), /optimistic revision check/);
  assert(!state.mutations.some(call => call.path.endsWith('/publish')));
});
