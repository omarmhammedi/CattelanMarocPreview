import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertEditorialSchema, assertPreservedEntry, assertUnchangedEntry, planEditorialEntry,
  readReferences, validateEditorialManifest,
} from '../scripts/migrations/0004-collection-editorial.mjs';

const block = (text, link = false) => ({ _type: 'block', _key: 'p1', style: 'normal', markDefs: link ? [{ _key: 'link1', _type: 'link', href: '/modeles/skorpio/' }] : [], children: [{ _type: 'span', _key: 's1', text, marks: link ? ['link1'] : [] }] });
const entry = { slug: 'skorpio', sources: ['https://www.cattelanitalia.com/fr/products/example'], before: { description: 'Ancienne présentation.', content: [block('Ancien détail.')] }, after: { description: 'Piètement en acier et plateau en verre.', content: [block('Détail documenté.')] } };
const manifest = { version: 1, collection: 'models', entries: [entry] };
const native = (data = entry.before) => ({ _rev: 'revision-one', item: { id: 'model-one', type: 'models', slug: 'skorpio', status: 'published', liveRevisionId: 'live-one', draftRevisionId: 'live-one', data: { title: 'Skorpio', source_verified_at: '2026-09-28T20:49:10.551Z', ...structuredClone(data) } } });
const fields = [{ slug: 'description', type: 'text' }, { slug: 'content', type: 'portableText' }, { slug: 'source_verified_at', type: 'datetime' }];

test('editorial migration changes only an exact known baseline and preserves its inputs', () => {
  const source = native();
  const original = structuredClone(source);
  const plan = planEditorialEntry(source, entry, 'models');
  assert.deepEqual(plan, entry.after);
  assert.deepEqual(source, original);
  plan.content[0].children[0].text = 'Plan changed in memory';
  assert.equal(entry.after.content[0].children[0].text, 'Détail documenté.');
});

test('completed entries are idempotent while custom copy, clears and mixed states conflict', () => {
  assert.deepEqual(planEditorialEntry(native(entry.after), entry, 'models'), {});
  for (const data of [
    { ...entry.before, description: 'Une modification de l’éditeur' },
    { ...entry.before, description: '' },
    { ...entry.after, content: [] },
    { ...entry.before, description: entry.after.description },
    { ...entry.after, content: entry.before.content },
  ]) assert.throws(() => planEditorialEntry(native(data), entry, 'models'), /exact initial or completed state/);
});

test('native SEO title and description share the exact copy baseline and never replace custom metadata', () => {
  const withSeo = { ...structuredClone(entry), beforeSeo: { title: null, description: null }, afterSeo: { title: 'Skorpio — table en verre', description: 'Piètement en acier et plateau en verre.' } };
  assert.doesNotThrow(() => validateEditorialManifest({ ...manifest, entries: [withSeo] }));
  assert.deepEqual(planEditorialEntry(native(), withSeo, 'models'), withSeo.after, 'Undefined native SEO matches the explicit null baseline.');
  const ready = native();
  ready.item.seo = { title: null, description: null, image: 'existing-image', canonical: 'https://example.com/page', noIndex: true };
  assert.deepEqual(planEditorialEntry(ready, withSeo, 'models'), withSeo.after);
  const done = native(withSeo.after);
  done.item.seo = { ...ready.item.seo, ...withSeo.afterSeo };
  assert.deepEqual(planEditorialEntry(done, withSeo, 'models'), {});
  assert.doesNotThrow(() => assertPreservedEntry(done, ready, withSeo.after, fields, withSeo.afterSeo));
  for (const seo of [{ title: 'Custom', description: null }, withSeo.afterSeo, { title: '', description: null }]) {
    const changed = native();
    changed.item.seo = seo;
    assert.throws(() => planEditorialEntry(changed, withSeo, 'models'), /exact initial or completed state/);
  }
  const cleared = structuredClone(done);
  cleared.item.seo.description = null;
  assert.throws(() => planEditorialEntry(cleared, withSeo, 'models'), /exact initial or completed state/);
  const wrongImage = structuredClone(done);
  wrongImage.item.seo.image = 'replacement-image';
  assert.throws(() => assertPreservedEntry(wrongImage, ready, withSeo.after, fields, withSeo.afterSeo), /unedited SEO field/);
});

test('pending drafts, unknown entries and missing prerequisite migration abort planning', () => {
  const response = native();
  assert.throws(() => planEditorialEntry({ ...response, item: { ...response.item, draftRevisionId: 'pending' } }, entry, 'models'), /unpublished edits/);
  assert.throws(() => planEditorialEntry({ ...response, item: { ...response.item, status: 'archived' } }, entry, 'models'), /unsupported publication status/);
  assert.throws(() => planEditorialEntry({ ...response, _rev: '' }, entry, 'models'), /safely identify/);
  assert.throws(() => planEditorialEntry({ ...response, item: { ...response.item, type: 'families' } }, entry, 'models'), /safely identify/);
  assert.throws(() => planEditorialEntry(native({ ...entry.before, source_verified_at: '' }), entry, 'models'), /apply 0003/);
  assert.throws(() => planEditorialEntry(native({ ...entry.after, source_verified_at: null }), entry, 'models'), /apply 0003/);
  assert.doesNotThrow(() => planEditorialEntry({ ...response, item: { ...response.item, status: 'draft', liveRevisionId: null, draftRevisionId: null } }, entry, 'models'));
});

test('schema changes and concurrent revision or identity changes stop writes', () => {
  const schema = { supports: ['drafts', 'revisions'], fields };
  assert.doesNotThrow(() => assertEditorialSchema(schema, 'models'));
  assert.throws(() => assertEditorialSchema({ ...schema, fields: fields.map(field => ({ ...field, type: 'string' })) }, 'models'), /another type/);
  assert.throws(() => assertEditorialSchema({ ...schema, fields: fields.slice(0, 2) }, 'models'), /verification field/);
  assert.throws(() => assertEditorialSchema({ ...schema, supports: [] }, 'models'), /native revisions/);
  assert.doesNotThrow(() => assertUnchangedEntry(native(), native(), 'model'));
  assert.throws(() => assertUnchangedEntry({ ...native(), _rev: 'other' }, native(), 'model'), /concurrently/);
  assert.throws(() => assertUnchangedEntry({ ...native(), item: { ...native().item, id: 'other' } }, native(), 'model'), /another entry/);
});

test('manifest accepts sourced native text and local links but rejects fields/media/scripts outside scope', () => {
  assert.equal(validateEditorialManifest(manifest), manifest);
  const linked = structuredClone(manifest);
  linked.entries[0].after.content = [block('Voir Skorpio', true)];
  assert.doesNotThrow(() => validateEditorialManifest(linked));
  const altered = change => { const value = structuredClone(manifest); change(value); return value; };
  assert.throws(() => validateEditorialManifest(altered(value => { value.entries[0].after.image = { id: 'unrelated' }; })), /unexpected or missing keys/);
  assert.throws(() => validateEditorialManifest(altered(value => { value.entries[0].sources[0] = 'https://untrusted.example/'; })), /Unapproved official source/);
  assert.throws(() => validateEditorialManifest(altered(value => { value.entries.push(value.entries[0]); })), /duplicated/);
  assert.throws(() => validateEditorialManifest(altered(value => { value.entries[0].after.content[0]._type = 'html'; })), /invalid or duplicate text block/);
  for (const href of ['javascript:alert(1)', '//untrusted.example/', '/\\evil', '/%2f%2fevil', 'https://untrusted.example/']) {
    const value = structuredClone(linked);
    value.entries[0].after.content[0].markDefs[0].href = href;
    assert.throws(() => validateEditorialManifest(value), `Reject ${href}`);
  }
});

test('native references are read through every cursor and retain order and identity', async () => {
  const fields = [{ slug: 'models', type: 'reference', validation: { relation: 'family_models' } }];
  const ref = id => ({ id, collection: 'models', translationGroup: `group-${id}`, locale: 'fr', title: 'Mutable presentation excluded from identity check' });
  const requests = [];
  const snapshot = await readReferences(async path => {
    requests.push(path);
    return path.includes('cursor=next') ? { children: [ref('two')] } : { children: [ref('one')], nextCursor: 'next' };
  }, 'families', { id: 'tables-id', slug: 'tables' }, fields);
  assert.equal(requests.length, 2);
  assert.match(requests[0], /tables-id\/references\/family_models\/children\?limit=100/);
  assert.deepEqual(snapshot.models.map(item => item.id), ['one', 'two']);
  assert(!('title' in snapshot.models[0]));
  await assert.rejects(() => readReferences(async () => ({ children: [ref('one')], nextCursor: 'same' }), 'families', { id: 'tables-id', slug: 'tables' }, fields), /duplicate or incomplete reference/);
});

test('post-save comparison protects untouched media, source markers, SEO, attribution and publication state', () => {
  const before = native();
  before.item.seo = { title: 'Titre conservé' };
  before.item.publishedAt = '2026-09-26T12:00:00.000Z';
  before.item.authorId = 'original-editor';
  before.item.data.gallery = [{ image: { id: 'original-image', provider: 'local', meta: { storageKey: 'media/image.jpg' } }, caption: 'Légende conservée' }];
  const after = structuredClone(before);
  after.item.data = { ...after.item.data, ...structuredClone(entry.after) };
  assert.doesNotThrow(() => assertPreservedEntry(after, before, entry.after, fields));
  for (const change of [
    value => { value.item.data.gallery[0].image.id = 'replaced-image'; },
    value => { value.item.data.gallery[0].caption = 'Replaced caption'; },
    value => { value.item.data.source_verified_at = null; },
    value => { value.item.seo.title = 'Replaced'; },
    value => { value.item.authorId = 'different-editor'; },
    value => { value.item.status = 'draft'; },
    value => { value.item.data.unexpected = 'new-field'; },
  ]) {
    const altered = structuredClone(after);
    change(altered);
    assert.throws(() => assertPreservedEntry(altered, before, entry.after, fields));
  }
});
