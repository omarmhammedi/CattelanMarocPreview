import test from 'node:test';
import assert from 'node:assert/strict';
import { loadManifest, articleContent, planJournalEntry, planJournalSeo, applyJournalSeo } from '../scripts/migrations/0027-journal-seo-links.mjs';

const manifest = await loadManifest();
const clone = value => structuredClone(value);
const fields = [{ slug: 'content', type: 'portableText' }, { slug: 'sources', type: 'repeater' }, { slug: 'title', type: 'text' }, { slug: 'excerpt', type: 'text' }, { slug: 'cta_href', type: 'text' }];
const schema = { supports: ['revisions', 'seo'], fields };
function response(entry) {
  return { _rev: `revision-${entry.slug}`, item: { id: entry.slug, type: 'posts', slug: entry.slug, status: 'published', liveRevisionId: `live-${entry.slug}`, draftRevisionId: null,
    publishedAt: '2026-09-27T20:09:28.000Z', createdAt: '2026-09-27T20:09:28.000Z', authorId: 'unchanged-author', primaryBylineId: 'unchanged-byline',
    seo: { title: entry.seoTitle?.before || 'Existing native title', description: 'Existing description', image: null, canonical: null, noIndex: false },
    data: { title: 'Approved visible title', excerpt: 'Approved introduction', content: clone(entry.beforeContent), sources: [{ label: 'Existing official reference', url: 'https://www.cattelanitalia.com/fr/catalogues' }], cta_href: '/collections/tables/' } } };
}
function fixture() {
  const entries = new Map(manifest.entries.map(entry => [`posts/${entry.slug}`, response(entry)]));
  for (const entry of manifest.entries) for (const link of entry.links) {
    const slug = link.href.split('/')[2], source = entry.sources.find(source => source.modelSlug === slug);
    entries.set(`models/${slug}`, { _rev: `model-${slug}`, item: { id: slug, type: 'models', slug, status: 'published', liveRevisionId: 'live-model', draftRevisionId: null,
      seo: { noIndex: false }, data: { source_url: source?.url } } });
  }
  const state = { entries, writes: [], saved: [], serial: 0 };
  const api = async (path, { method = 'GET', data } = {}) => {
    if (path.startsWith('/_emdash/api/schema/')) { assert.equal(method, 'GET'); return { item: clone(schema) }; }
    const key = path.replace('/_emdash/api/content/', '');
    const entry = entries.get(key); assert(entry, `Fixture path: ${path}`);
    if (method !== 'GET') {
      assert.equal(method, 'PUT'); assert.equal(data._rev, entry._rev);
      assert(!('status' in data) && !path.endsWith('/publish'));
      state.writes.push({ path, data: clone(data) });
      if (data.data) { entry.item.liveData = clone(entry.item.data); Object.assign(entry.item.data, clone(data.data)); entry.item.draftRevisionId = `draft-${++state.serial}`; }
      if (data.seo) Object.assign(entry.item.seo, clone(data.seo));
      entry._rev = `written-${++state.serial}`;
    }
    return clone(entry);
  };
  return { api, state };
}

test('adds 24 contextual model links and five related-guide links without replacing the articles', () => {
  let models = 0;
  for (const entry of manifest.entries) {
    const body = articleContent(entry);
    assert.equal(body.length, entry.beforeContent.length + 1);
    assert.deepEqual(body.slice(0, -1).map(block => block._key), entry.beforeContent.map(block => block._key));
    for (let i = 0; i < entry.beforeContent.length; i++) {
      let expected = entry.beforeContent[i].children.map(span => span.text).join('');
      for (const replacement of entry.replacements) expected = expected.replace(replacement.before, replacement.after);
      assert.equal(body[i].children.map(span => span.text).join(''), expected);
    }
    const links = body.flatMap(block => block.markDefs.filter(mark => mark._type === 'link'));
    for (const link of entry.links) assert(links.some(mark => mark.href === link.href));
    assert(links.some(mark => mark.href === entry.related.href));
    models += entry.links.length;
  }
  assert.equal(models, 24);
});

test('narrow corrections remove the unsupported wood combination and identify Airport shelf lengths', () => {
  const material = articleContent(manifest.entries[2]).flatMap(block => block.children.map(span => span.text)).join('');
  assert(!material.includes('Adrian Wood réunit les deux essences'));
  assert(material.includes('Botero Wood Round'));
  const storage = articleContent(manifest.entries[4]).flatMap(block => block.children.map(span => span.text)).join('');
  assert(storage.includes('ses étagères mesurent de 60 à 310 cm'));
});

test('refuses existing drafts, edited content, missing revision state and custom SEO titles', () => {
  const entry = manifest.entries[0];
  for (const mutate of [r => { r.item.draftRevisionId = 'editor-draft'; }, r => { delete r.item.liveRevisionId; }, r => { r.item.data.content[1].children[0].text += ' Owner edit.'; }, r => { r.item.seo.title = 'Owner title'; }]) {
    const r = response(entry); mutate(r); assert.throws(() => planJournalEntry(r, entry));
  }
});

test('native draft writes leave live content, publication dates, byline, unedited fields and SEO metadata intact', async () => {
  const { api, state } = fixture();
  const originals = clone([...state.entries]);
  const plan = await planJournalSeo(api, manifest);
  await applyJournalSeo(api, plan, { beforeWrite: async value => state.saved.push(value), afterEntry: async value => state.saved.push(value) });
  assert.equal(state.writes.length, 7); // five drafts; two immediate native SEO title changes
  assert.equal(state.saved.filter(value => value.kind === 'plan').length, 1);
  for (const entry of manifest.entries) {
    const after = state.entries.get(`posts/${entry.slug}`), before = originals.find(([key]) => key === `posts/${entry.slug}`)[1];
    assert.deepEqual(after.item.liveData, before.item.data);
    assert.equal(after.item.liveRevisionId, before.item.liveRevisionId);
    assert.equal(after.item.publishedAt, before.item.publishedAt);
    assert.equal(after.item.primaryBylineId, before.item.primaryBylineId);
    assert.equal(after.item.data.title, before.item.data.title);
    assert.equal(after.item.seo.description, before.item.seo.description);
    assert.equal(after.item.seo.title, entry.seoTitle?.after || before.item.seo.title);
    assert(after.item.draftRevisionId);
  }
});

test('no write happens on a concurrent article edit or destination change', async () => {
  for (const key of ['posts/associer-table-chaises-salle-a-manger', 'models/skorpio']) {
    const { api, state } = fixture(); const plan = await planJournalSeo(api, manifest);
    state.entries.get(key)._rev = 'concurrent-editor-revision';
    await assert.rejects(applyJournalSeo(api, plan, { beforeWrite: async () => {} }), /concurrent|changed/u);
    assert.equal(state.writes.length, 0);
  }
});

test('backup failure blocks every mutation, and no backup writer is accepted by omission', async () => {
  const { api, state } = fixture(); const plan = await planJournalSeo(api, manifest);
  await assert.rejects(applyJournalSeo(api, plan, {}), /before-image/u);
  await assert.rejects(applyJournalSeo(api, plan, { beforeWrite: async () => { throw Error('disk unavailable'); } }), /disk unavailable/u);
  assert.equal(state.writes.length, 0);
});

test('completed published content is idempotent; a matching unreviewed draft remains protected', async () => {
  const { api, state } = fixture(); const plan = await planJournalSeo(api, manifest);
  await applyJournalSeo(api, plan, { beforeWrite: async () => {} });
  await assert.rejects(planJournalSeo(api, manifest), /existing draft/u);
  // A separate authorized publication, represented here without adding publication to the migration.
  for (const entry of state.entries.values()) if (entry.item.type === 'posts') {
    entry.item.liveRevisionId = entry.item.draftRevisionId; entry.item.draftRevisionId = null; delete entry.item.liveData;
  }
  const after = await planJournalSeo(api, manifest);
  assert.equal(after.entries.filter(entry => entry.change).length, 0);
});

test('preserves an existing explicit source and refuses a source URL different from the published model', async () => {
  const entry = manifest.entries.find(entry => entry.sources.length);
  if (!entry) return;
  const r = response(entry), source = entry.sources[0];
  r.item.data.sources.push({ label: 'Owner source label', url: source.url });
  const change = planJournalEntry(r, entry);
  assert.equal(change.data.sources?.filter(value => value.url === source.url).length ?? 1, 1);
  const { api, state } = fixture(); state.entries.get(`models/${source.modelSlug}`).item.data.source_url = 'https://www.cattelanitalia.com/fr/products/DIFFERENT';
  await assert.rejects(planJournalSeo(api, manifest), /source differs/u);
  assert.equal(state.writes.length, 0);
});
