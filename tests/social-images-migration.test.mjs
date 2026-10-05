import assert from 'node:assert/strict';
import test from 'node:test';
import { applySocialImages, loadManifest, planImageEntry, planSocialImages, validateManifest } from '../scripts/migrations/0029-social-images.mjs';

function response(slug) {
  return { _rev: `rev-${slug}`, item: { id: `id-${slug}`, type: 'pages', slug, status: 'published',
    draftRevisionId: null, liveRevisionId: `live-${slug}`, data: { title: slug, content: ['Keep this body'] },
    authorId: 'owner', publishedAt: '2026-09-29T12:00:00Z', seo: { title: 'Editorial title', description: 'Editorial description',
      image: null, canonical: '/editor-canonical/', noIndex: false } } };
}

async function fixture() {
  const manifest = await loadManifest(), records = new Map(), writes = [], backups = [];
  for (const source of manifest.sources) {
    const item = response(source.slug);
    item.item.data[source.field] = { id: source.mediaId, filename: source.filename, mimeType: 'image/jpeg', width: 1200, height: 735,
      meta: { storageKey: source.storageKey } };
    records.set(source.slug, item);
  }
  for (const entry of manifest.entries) records.set(entry.slug, response(entry.slug));
  const api = async (path, options = {}) => {
    assert(/^\/_emdash\/api\/content\/pages\/[a-z0-9-]+$/u.test(path));
    const key = path.split('/').at(-1).replace(/^id-/u, ''), entry = records.get(key);
    assert(entry, `Unexpected request ${path}`);
    if (options.method) {
      assert(backups.some(backup => backup.kind === 'entry' && backup.slug === key), 'Missing private entry before-image.');
      assert.equal(options.method, 'PUT');
      assert.deepEqual(Object.keys(options.data).sort(), ['_rev', 'seo']);
      assert.deepEqual(Object.keys(options.data.seo), ['image']);
      assert.equal(options.data._rev, entry._rev);
      writes.push(structuredClone({ path, ...options }));
      entry.item.seo.image = options.data.seo.image; entry._rev += '-saved'; entry.item.updatedAt = '2026-10-05T13:00:00Z';
    }
    return structuredClone(entry);
  };
  return { manifest, records, writes, backups, api, beforeWrite: value => backups.push(value) };
}

test('native images are filled only when empty; existing and already configured choices survive', () => {
  const entry = response('faq'), image = '/_emdash/api/media/file/image.jpg';
  assert.equal(planImageEntry(entry, { slug: 'faq' }, image).change, true);
  entry.item.seo.image = 'https://example.com/editor-image.jpg';
  assert.equal(planImageEntry(entry, { slug: 'faq' }, image).reason, 'editor-image-preserved');
  entry.item.seo.image = image;
  assert.equal(planImageEntry(entry, { slug: 'faq' }, image).reason, 'already-configured');
});

test('unknown scope, pending drafts, unpublished entries and replaced source assets are refused', async () => {
  const f = await fixture(), changed = structuredClone(f.manifest);
  changed.entries[0].slug = 'home'; assert.throws(() => validateManifest(changed), /Only the seven/u);
  f.records.get('faq').item.draftRevisionId = 'pending';
  await assert.rejects(planSocialImages(f.api, f.manifest), /existing draft/u);
  f.records.get('faq').item.draftRevisionId = null; f.records.get('faq').item.status = 'draft';
  await assert.rejects(planSocialImages(f.api, f.manifest), /unpublished/u);
  f.records.get('faq').item.status = 'published'; f.records.get('home').item.data.brand_detail_image.meta.storageKey = 'replacement.jpg';
  await assert.rejects(planSocialImages(f.api, f.manifest), /source image changed/u);
  assert.equal(f.writes.length, 0);
});

test('sparse native writes are backed up, preserve body/canonical/noindex and rerun without mutations', async () => {
  const f = await fixture(), before = structuredClone(f.records.get('faq').item);
  f.records.get('professionnels').item.seo.image = 'https://example.com/owner-choice.jpg';
  const plan = await planSocialImages(f.api, f.manifest);
  await applySocialImages(f.api, plan, { beforeWrite: f.beforeWrite });
  assert.equal(f.writes.length, 6);
  const saved = f.records.get('faq').item;
  for (const key of ['data', 'draftRevisionId', 'liveRevisionId', 'status', 'publishedAt', 'authorId']) assert.deepEqual(saved[key], before[key]);
  for (const key of ['title', 'description', 'canonical', 'noIndex']) assert.deepEqual(saved.seo[key], before.seo[key]);
  const rerun = await planSocialImages(f.api, f.manifest);
  assert(rerun.entries.every(entry => !entry.change));
  await applySocialImages(f.api, rerun, { beforeWrite: f.beforeWrite });
  assert.equal(f.writes.length, 6);
});

test('concurrent revision and before-image failure stop every write', async () => {
  const f = await fixture(), plan = await planSocialImages(f.api, f.manifest);
  f.records.get('faq')._rev = 'concurrent';
  await assert.rejects(applySocialImages(f.api, plan, { beforeWrite: f.beforeWrite }), /concurrent revision/u);
  f.records.get('faq')._rev = 'rev-faq';
  await assert.rejects(applySocialImages(f.api, plan, { beforeWrite: () => { throw new Error('private backup failed'); } }), /private backup failed/u);
  assert.equal(f.writes.length, 0);
});

test('a second-page race after an earlier save preserves the concurrently edited page', async () => {
  const f = await fixture(), plan = await planSocialImages(f.api, f.manifest);
  await assert.rejects(applySocialImages(f.api, plan, { beforeWrite: f.beforeWrite, afterEntry: () => {
    f.records.get('votre-projet')._rev = 'editor-revision';
    f.records.get('votre-projet').item.seo.image = 'https://example.com/new-owner-image.jpg';
  } }), /concurrent revision/u);
  assert.equal(f.writes.length, 1);
  assert.equal(f.records.get('votre-projet').item.seo.image, 'https://example.com/new-owner-image.jpg');
});
