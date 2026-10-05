import test from 'node:test';
import assert from 'node:assert/strict';
import { loadManifest, validateManifest, planProvenanceEntry, planModelProvenance, applyModelProvenance } from '../scripts/migrations/0028-model-provenance.mjs';
const manifest = await loadManifest();
const clone = value => structuredClone(value);
const schemas = {
  models: { supports: ['revisions'], fields: ['title', 'description', 'source_url', 'official_url'].map(slug => ({ slug, type: 'string' })).concat([{ slug: 'source_verified_at', type: 'datetime' }, { slug: 'technical_sheet', type: 'file' }]) },
  posts: { supports: ['revisions'], fields: [{ slug: 'sources', type: 'repeater' }, { slug: 'content', type: 'portableText' }, { slug: 'title', type: 'string' }] },
};
function response(collection, entry) {
  return { _rev: `rev-${entry.slug}`, item: { id: entry.slug, type: collection, slug: entry.slug, status: 'published', liveRevisionId: 'original-live', draftRevisionId: null, publishedAt: '2026-09-27', primaryBylineId: 'owner-byline', seo: { title: 'Owner title', description: 'Owner description' }, data: collection === 'models'
    ? { title: entry.title, description: 'Owner text', technical_sheet: { id: entry.evidence.nativeTechnicalSheetId, mimeType: 'application/pdf', filename: `cattelan-${entry.slug}-fiche-technique.pdf`, meta: { size: entry.evidence.nativeTechnicalSheetBytes } } }
    : { title: 'Owner article', content: [{ _type: 'block', children: [{ _type: 'span', text: 'Unchanged prose' }] }], sources: clone(entry.beforeSources) } } };
}
function fixture() {
  const state = { entries: new Map(), writes: [], backups: [], serial: 0 };
  for (const collection of ['models', 'posts']) for (const entry of manifest[collection]) state.entries.set(`${collection}/${entry.slug}`, response(collection, entry));
  const api = async (path, { method = 'GET', data } = {}) => {
    if (path.startsWith('/_emdash/api/schema/')) { assert.equal(method, 'GET'); return { item: clone(schemas[path.split('/').at(-1).split('?')[0]]) }; }
    const key = path.replace('/_emdash/api/content/', ''); const entry = state.entries.get(key); assert(entry, path);
    if (method !== 'GET') {
      assert.equal(method, 'PUT'); assert.equal(entry._rev, data._rev); assert.deepEqual(Object.keys(data).sort(), ['_rev', 'data']);
      state.writes.push(clone({ path, data })); entry.item.liveData = clone(entry.item.data);
      const normalized = clone(data.data);
      // Native CMS serialization normalizes datetime precision and timezone.
      for (const field of schemas[entry.item.type].fields.filter(field => field.type === 'datetime')) {
        if (normalized[field.slug] != null) normalized[field.slug] = new Date(normalized[field.slug]).toISOString();
      }
      Object.assign(entry.item.data, normalized); entry.item.draftRevisionId = `draft-${++state.serial}`; entry._rev = `rev-${++state.serial}`;
    }
    return clone(entry);
  };
  return { state, api };
}
test('manifest binds 12 exact manufacturer models and 14 article sources to verified PDF evidence', () => {
  assert.equal(manifest.models.length, 12); assert.equal(manifest.posts.reduce((n, e) => n + e.addSources.length, 0), 14);
  const changed = clone(manifest); changed.models[0].sourceUrl = 'https://example.com/fr/products/00000000-0000-0000-0000-000000000000'; assert.throws(() => validateManifest(changed));
  const mismatch = clone(manifest); mismatch.posts[0].addSources[0].url = mismatch.models.find(e => e.slug !== mismatch.posts[0].addSources[0].modelSlug).sourceUrl; assert.throws(() => validateManifest(mismatch));
});
test('rejects microsecond and offset timestamps before writes and uses the native millisecond representation', async () => {
  for (const entry of manifest.models) assert.equal(entry.verifiedAt, new Date(entry.verifiedAt).toISOString());
  assert.equal(manifest.models.find(entry => entry.slug === 'amsterdam').verifiedAt, '2026-10-05T12:45:28.577Z');
  for (const value of ['2026-10-05T12:45:28.577753+00:00', '2026-10-05T13:45:28.577+01:00', '2026-10-05T12:45:28Z']) {
    const invalid = clone(manifest); invalid.models[0].verifiedAt = value;
    const { api, state } = fixture();
    await assert.rejects(planModelProvenance(api, invalid), /native UTC millisecond datetime/u);
    assert.equal(state.writes.length, 0);
  }
});
test('refuses existing drafts, changed native PDFs, identities and source edits', () => {
  const entry = manifest.models[0];
  for (const mutate of [r => { r.item.draftRevisionId = 'owner-draft'; }, r => { r.item.data.technical_sheet.filename = 'replacement.pdf'; }, r => { r.item.data.title = 'Different model'; }, r => { r.item.data.source_url = 'https://example.com'; }]) {
    const r = response('models', entry); mutate(r); assert.throws(() => planProvenanceEntry(r, 'models', entry));
  }
  const r = response('posts', manifest.posts[0]); r.item.data.sources.push({ label: 'Owner source', url: 'https://example.com' }); assert.throws(() => planProvenanceEntry(r, 'posts', manifest.posts[0]), /sources changed/u);
});
test('creates 17 source-only drafts while preserving live content, SEO, dates, attribution, PDFs and article prose', async () => {
  const { api, state } = fixture(); const originals = clone(state.entries); const plan = await planModelProvenance(api, manifest);
  await applyModelProvenance(api, plan, { beforeWrite: async value => state.backups.push(clone(value)) });
  assert.equal(state.writes.length, 17); assert.equal(state.backups.length, 18);
  for (const [key, after] of state.entries) {
    const before = originals.get(key); assert.deepEqual(after.item.liveData, before.item.data); assert.deepEqual(after.item.seo, before.item.seo); assert.equal(after.item.liveRevisionId, before.item.liveRevisionId); assert.equal(after.item.publishedAt, before.item.publishedAt); assert.equal(after.item.primaryBylineId, before.item.primaryBylineId);
    if (after.item.type === 'models') { assert.deepEqual(after.item.data.technical_sheet, before.item.data.technical_sheet); assert.equal(after.item.data.description, before.item.data.description); }
    else { assert.deepEqual(after.item.data.content, before.item.data.content); assert.deepEqual(after.item.data.sources.slice(0, before.item.data.sources.length), before.item.data.sources); }
  }
});
test('detects concurrent model, article and schema changes before the first write', async () => {
  for (const key of ['models/butterfly', `posts/${manifest.posts[0].slug}`]) {
    const { api, state } = fixture(); const plan = await planModelProvenance(api, manifest); state.entries.get(key)._rev = 'owner-edit';
    await assert.rejects(applyModelProvenance(api, plan, { beforeWrite: async () => {} }), /concurrent/u); assert.equal(state.writes.length, 0);
  }
  const { api, state } = fixture(); const plan = await planModelProvenance(api, manifest); plan.schemas.models.fields.push({ slug: 'unknown' });
  await assert.rejects(applyModelProvenance(api, plan, { beforeWrite: async () => {} }), /schema changed/u); assert.equal(state.writes.length, 0);
});
test('requires successful private backups before mutations', async () => {
  const { api, state } = fixture(); const plan = await planModelProvenance(api, manifest);
  await assert.rejects(applyModelProvenance(api, plan, {}), /before-image/u);
  await assert.rejects(applyModelProvenance(api, plan, { beforeWrite: async () => { throw Error('backup unavailable'); } }), /backup unavailable/u); assert.equal(state.writes.length, 0);
});
test('is idempotent after separate publication, but never overwrites an unreviewed migration draft', async () => {
  const { api, state } = fixture(); const plan = await planModelProvenance(api, manifest);
  await applyModelProvenance(api, plan, { beforeWrite: async () => {} });
  await assert.rejects(planModelProvenance(api, manifest), /existing draft/u);
  for (const r of state.entries.values()) { r.item.liveRevisionId = r.item.draftRevisionId; r.item.draftRevisionId = null; delete r.item.liveData; }
  assert.equal((await planModelProvenance(api, manifest)).entries.filter(e => e.change).length, 0);
});
