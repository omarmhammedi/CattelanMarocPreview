import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  FIELD_DEFINITIONS, applyShowroomLocation, assertShowroomSchema, planGlobalLocation,
  planShowroomContact, prepareShowroomLocation, validateShowroomManifest,
} from '../scripts/migrations/0005-showroom-location.mjs';

const manifest = JSON.parse(await readFile(new URL('../content/showroom-location.json', import.meta.url), 'utf8'));
const clone = value => structuredClone(value);
const response = (collection, slug, data) => ({ _rev: `revision-${slug}`, item: { id: `id-${slug}`, type: collection, slug, status: 'published', liveRevisionId: `live-${slug}`, draftRevisionId: `live-${slug}`, authorId: 'existing-editor', publishedAt: '2026-09-01T00:00:00.000Z', seo: { title: 'Existing SEO', image: 'existing-image' }, data: clone(data) } });
const globalEntry = () => response('site_content', 'global', { title: 'Global', address: '', hours: '', contact_phone: '', map_url: null, public_email: 'kept@example.test', whatsapp_url: 'https://example.test/preserved', image: { id: 'unchanged-media' }, unknown_editor_field: 'keep' });
const showroomEntry = () => response('pages', 'showroom-casablanca', { title: 'Le showroom', sections: [{ _key: 'visit-native-key', section_key: 'visit', heading: 'Heading edited independently', text: 'Unchanged text', cta_label: 'Contacter le showroom', cta_href: '/showroom-casablanca/', custom: 'preserve' }, { section_key: 'other', heading: 'Custom section', image: { id: 'existing-media' } }] });
const schemas = () => ({
  site_content: { slug: 'site_content', supports: ['drafts', 'revisions', 'seo'], fields: [{ slug: 'address', type: 'text' }, { slug: 'hours', type: 'text' }, { slug: 'contact_phone', type: 'string' }, { slug: 'map_url', type: 'url', required: false }] },
  pages: { slug: 'pages', supports: ['drafts', 'revisions', 'seo'], fields: [{ slug: 'sections', type: 'repeater', validation: { subFields: ['section_key', 'cta_label', 'cta_href'].map(slug => ({ slug, type: 'string' })) } }] },
});

function fixture() {
  const state = { schemas: schemas(), entries: { 'site_content/global': globalEntry(), 'pages/showroom-casablanca': showroomEntry() }, mutations: [], serial: 0 };
  const api = async (path, { method = 'GET', data } = {}) => {
    assert(path.startsWith('/_emdash/api/'));
    const schema = path.match(/^\/_emdash\/api\/schema\/collections\/(site_content|pages)(?:\?includeFields=true|\/fields)$/);
    if (schema) {
      if (method === 'GET') return { item: clone(state.schemas[schema[1]]) };
      assert.equal(method, 'POST');
      assert(!state.schemas[schema[1]].fields.some(field => field.slug === data.slug));
      state.mutations.push({ path, method, data: clone(data) });
      state.schemas[schema[1]].fields.push(clone(data));
      return { item: clone(data) };
    }
    const content = path.match(/^\/_emdash\/api\/content\/(site_content\/global|pages\/showroom-casablanca)(\/publish)?$/);
    assert(content, `Unexpected API path: ${path}`);
    const entry = state.entries[content[1]];
    if (method === 'GET') return clone(entry);
    assert.equal(data._rev, entry._rev, 'Native optimistic revision check');
    state.mutations.push({ path, method, data: clone(data) });
    if (method === 'PUT') {
      assert.deepEqual(Object.keys(data).sort(), ['_rev', 'data']);
      entry.item.data = { ...entry.item.data, ...clone(data.data) };
      entry._rev = `new-${++state.serial}`;
      entry.item.draftRevisionId = entry._rev;
    } else {
      assert.equal(method, 'POST');
      assert(content[2]);
      entry.item.liveRevisionId = entry.item.draftRevisionId;
    }
    return clone(entry);
  };
  return { state, api };
}

test('approved manifest contains the supplied place, local hours and only scoped fields', () => {
  assert.equal(validateShowroomManifest(manifest), manifest);
  assert.equal(manifest.sources.hours_timezone, 'Africa/Casablanca');
  const invalid = change => { const value = clone(manifest); change(value); return value; };
  for (const modified of [
    invalid(value => { value.global.after.whatsapp_url = 'https://wa.me/123'; }),
    invalid(value => { value.global.after.map_embed_url = '<iframe src="https://www.google.com/maps/embed?pb=anything"></iframe>'; }),
    invalid(value => { value.global.after.map_embed_url = value.global.after.map_embed_url.replace('www.google.com', 'www.google.com.evil.test'); }),
    invalid(value => { value.global.after.map_embed_url += '&other=1'; }),
    invalid(value => { value.global.after.map_url = value.global.after.map_url.replace('ChIJnXzIEVjTpw0RXul0XQgeEHw', 'other-place'); }),
    invalid(value => { value.global.after.contact_phone = '+123456789'; }),
    invalid(value => { value.global.before.address = 'Existing address'; }),
  ]) assert.throws(() => validateShowroomManifest(modified));
});

test('global baseline is initialized atomically and completed values are idempotent', () => {
  const before = globalEntry();
  const untouched = clone(before);
  assert.deepEqual(planGlobalLocation(before, manifest), manifest.global.after);
  assert.deepEqual(before, untouched);
  const after = clone(before);
  Object.assign(after.item.data, manifest.global.after);
  assert.deepEqual(planGlobalLocation(after, manifest), {});
  for (const key of Object.keys(manifest.global.after)) {
    const cleared = clone(after);
    cleared.item.data[key] = '';
    assert.throws(() => planGlobalLocation(cleared, manifest), /Preserve the editor change\/clear/);
  }
  before.item.data.address = 'Custom editor address';
  assert.throws(() => planGlobalLocation(before, manifest), /empty baseline/);
});

test('only the known visit action changes, keeping all editorial text, row keys and other sections', () => {
  const before = showroomEntry();
  const untouched = clone(before);
  const result = planShowroomContact(before, manifest);
  assert.equal(result.sections[0].cta_href, '#showroom-contact');
  assert.deepEqual({ ...result.sections[0], cta_href: '/showroom-casablanca/' }, before.item.data.sections[0]);
  assert.deepEqual(result.sections[1], before.item.data.sections[1]);
  assert.deepEqual(before, untouched);
  const after = clone(before);
  after.item.data.sections = result.sections;
  assert.deepEqual(planShowroomContact(after, manifest), {});
  for (const field of ['cta_label', 'cta_href']) {
    const edited = clone(before);
    edited.item.data.sections[0][field] = '';
    assert.throws(() => planShowroomContact(edited, manifest), /edited\/cleared/);
  }
  before.item.data.sections.push(clone(before.item.data.sections[0]));
  assert.throws(() => planShowroomContact(before, manifest), /missing or duplicated/);
});

test('unpublished edits, draft entries and incompatible existing fields abort planning', () => {
  const draft = globalEntry();
  draft.item.draftRevisionId = 'unpublished-edit';
  assert.throws(() => planGlobalLocation(draft, manifest), /unpublished edits/);
  draft.item.draftRevisionId = draft.item.liveRevisionId;
  draft.item.status = 'draft';
  assert.throws(() => planGlobalLocation(draft, manifest), /published native entry/);
  const schema = schemas().site_content;
  schema.fields.push({ slug: 'map_embed_url', type: 'string' });
  assert.throws(() => assertShowroomSchema(schema, 'site_content'), /incompatible field type/);
  schema.fields.at(-1).type = 'url';
  schema.fields.at(-1).required = true;
  assert.throws(() => assertShowroomSchema(schema, 'site_content'), /optional/);
});

test('dry-run planning makes no native writes', async () => {
  const { api, state } = fixture();
  const plan = await prepareShowroomLocation(api, manifest);
  assert.deepEqual(plan.fields, FIELD_DEFINITIONS);
  assert.equal(plan.entries.length, 2);
  assert.equal(state.mutations.length, 0);
});

test('native apply backs up before mutation, preserves unrelated data and is idempotent', async () => {
  const { api, state } = fixture();
  const before = clone(state.entries);
  const plan = await prepareShowroomLocation(api, manifest);
  const snapshots = [];
  const result = await applyShowroomLocation(api, plan, {
    beforeWrite: async value => { assert.equal(state.mutations.length, 0); assert.deepEqual(value, plan); snapshots.push(clone(value)); },
    afterEntry: async value => { snapshots.push(clone(value)); },
  });
  assert.equal(result.completed.length, 2);
  assert.deepEqual(result.addedFields, ['map_note', 'map_embed_url']);
  assert.equal(snapshots.length, 3);
  const afterGlobal = state.entries['site_content/global'];
  for (const key of ['public_email', 'whatsapp_url', 'image', 'unknown_editor_field']) assert.deepEqual(afterGlobal.item.data[key], before['site_content/global'].item.data[key]);
  for (const entry of Object.values(state.entries)) {
    assert.equal(entry.item.status, 'published');
    assert.equal(entry.item.draftRevisionId, entry.item.liveRevisionId);
    assert.deepEqual(entry.item.seo, before[`${entry.item.type}/${entry.item.slug}`].item.seo);
  }
  const again = await prepareShowroomLocation(api, manifest);
  assert.equal(again.fields.length, 0);
  assert(again.entries.every(entry => Object.keys(entry.values).length === 0));
  const count = state.mutations.length;
  await applyShowroomLocation(api, again, { beforeWrite: async () => {} });
  assert.equal(state.mutations.length, count);
  assert(state.mutations.every(call => !/(setup|seed|auth|media|users|settings|contacts)/.test(call.path)));
});

test('concurrent revisions and schemas fail before any mutation', async () => {
  for (const mutate of [
    state => { state.entries['site_content/global']._rev = 'another-revision'; },
    state => { state.entries['pages/showroom-casablanca'].item.draftRevisionId = 'new-draft'; },
    state => { state.schemas.site_content.fields[0].label = 'Editor change'; },
  ]) {
    const { api, state } = fixture();
    const plan = await prepareShowroomLocation(api, manifest);
    mutate(state);
    await assert.rejects(() => applyShowroomLocation(api, plan, { beforeWrite: async () => {} }));
    assert.equal(state.mutations.length, 0);
  }
});

test('a failed backup prevents all mutation and concurrent saves cannot be published', async () => {
  const { api, state } = fixture();
  const plan = await prepareShowroomLocation(api, manifest);
  await assert.rejects(() => applyShowroomLocation(api, plan, { beforeWrite: async () => { throw new Error('backup failed'); } }), /backup failed/);
  assert.equal(state.mutations.length, 0);
  const staleApi = async (path, options) => {
    const result = await api(path, options);
    if (options?.method === 'PUT') state.entries['site_content/global']._rev = 'concurrent-editor-save';
    return result;
  };
  await assert.rejects(() => applyShowroomLocation(staleApi, plan, { beforeWrite: async () => {} }), /optimistic revision check/);
  assert.equal(state.mutations.filter(call => call.path.endsWith('/publish')).length, 0);
});
