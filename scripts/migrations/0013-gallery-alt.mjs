/** Verified gallery descriptions only. Native EmDash saves/publications; no media or schema writes. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {assertNoDraft} from './0003-model-detail-pages.mjs';
import {readReferences} from './0004-collection-editorial.mjs';
import {authenticatedApi, origin} from './0011-seo-editorial.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const migration = '0013-gallery-alt';
const schemaPath = '/_emdash/api/schema/collections/models?includeFields=true';
const pathFor = slug => `/_emdash/api/content/models/${encodeURIComponent(slug)}`;
const slugs = ['skorpio', 'napoleon-keramik', 'rhonda', 'greta', 'ruby', 'ruby-lounge', 'chelsea', 'airport', 'bloom', 'napoleon-keramik-outdoor', 'greta-outdoor'];
const imageKeys = ['index', 'sourceUrl', 'sourceSha256', 'expectedImage', 'beforeAlt', 'afterAlt'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const withoutAlt = image => {const value = structuredClone(image); delete value.alt; return value;};
function keys(value, expected, label) {
  assert(object(value), `${label}: object required.`);
  assert.deepEqual(Object.keys(value).sort(), [...expected].sort(), `${label}: unexpected or missing fields.`);
}

function validateImage(change, label) {
  keys(change, imageKeys, label);
  assert(Number.isInteger(change.index) && change.index >= 0 && change.index < 100, `${label}: invalid gallery index.`);
  const url = new URL(change.sourceUrl);
  assert(url.protocol === 'https:' && url.hostname === 'download.cattelanitalia.com' && !url.username && !url.password && !url.port
    && /^\/multimedia\/(?:generic|hd|ld)\/[a-zA-Z0-9-]+\.(?:jpe?g|png|webp)$/i.test(url.pathname), `${label}: unsupported verified source.`);
  assert(/^[a-f0-9]{64}$/.test(change.sourceSha256), `${label}: source SHA-256 required.`);
  const image = change.expectedImage;
  assert(object(image) && !Object.hasOwn(image, 'alt'), `${label}: expected image must exclude only alt.`);
  assert(typeof image.id === 'string' && /^[a-zA-Z0-9_-]+$/.test(image.id) && image.provider === 'local', `${label}: native image identity required.`);
  assert(object(image.meta) && typeof image.meta.storageKey === 'string' && /^[a-zA-Z0-9._-]+\.(?:jpe?g|png|webp|avif)$/i.test(image.meta.storageKey), `${label}: storage identity required.`);
  assert(Number.isInteger(image.width) && image.width > 0 && Number.isInteger(image.height) && image.height > 0, `${label}: original dimensions required.`);
  assert(typeof change.beforeAlt === 'string' && /^[^<>\r\n]+ — photographie officielle [1-9][0-9]*$/.test(change.beforeAlt)
    && change.beforeAlt.endsWith(` — photographie officielle ${change.index + 1}`), `${label}: only the exact generic imported alt is eligible.`);
  assert(typeof change.afterAlt === 'string' && change.afterAlt.trim() === change.afterAlt && change.afterAlt.length > 0
    && change.afterAlt.length <= 300 && !/[<>\r\n]/.test(change.afterAlt) && change.afterAlt !== change.beforeAlt, `${label}: invalid descriptive alt.`);
}

export function validateGalleryAltManifest(manifest) {
  keys(manifest, ['version', 'entries'], 'Gallery alt manifest');
  assert.equal(manifest.version, 1);
  assert(Array.isArray(manifest.entries) && manifest.entries.length > 0 && manifest.entries.length <= slugs.length);
  const seen = new Set();
  for (const entry of manifest.entries) {
    keys(entry, ['slug', 'gallery', ...(Object.hasOwn(entry, 'image') ? ['image'] : [])], 'Model entry');
    assert(slugs.includes(entry.slug) && !seen.has(entry.slug), 'Unexpected or duplicate model.'); seen.add(entry.slug);
    assert(Array.isArray(entry.gallery) && entry.gallery.length > 0 && entry.gallery.length <= 100);
    entry.gallery.forEach((image, index) => {validateImage(image, `${entry.slug}.gallery[${index}]`); assert.equal(image.index, index, 'Gallery indices must be complete and ordered.');});
    if (entry.image) {
      validateImage(entry.image, `${entry.slug}.image`);
      const same = entry.gallery[entry.image.index];
      assert(same && same.sourceUrl === entry.image.sourceUrl && same.sourceSha256 === entry.image.sourceSha256
        && same.expectedImage.id === entry.image.expectedImage.id && same.expectedImage.meta.storageKey === entry.image.expectedImage.meta.storageKey
        && same.beforeAlt === entry.image.beforeAlt && same.afterAlt === entry.image.afterAlt, `${entry.slug}: hero must describe the identical verified gallery image.`);
    }
  }
  return manifest;
}

export async function loadGalleryAlt() {
  const manifest = validateGalleryAltManifest(JSON.parse(await readFile(join(root, 'content/gallery-alt-2026-09-30.json'), 'utf8')));
  assert.deepEqual(manifest.entries.map(entry => entry.slug).sort(), [...slugs].sort());
  assert.equal(manifest.entries.reduce((sum, entry) => sum + entry.gallery.length, 0), 129);
  return manifest;
}

export function planGalleryAlt(response, entry) {
  validateGalleryAltManifest({version: 1, entries: [entry]});
  assertNoDraft(response?.item);
  assert.equal(response.item.status, 'published', 'Preserve unpublished models.');
  assert(typeof response._rev === 'string' && response._rev && response.item.type === 'models' && response.item.slug === entry.slug, 'Native model identity/revision mismatch.');
  const data = response.item.data;
  assert(Array.isArray(data.gallery) && data.gallery.length === entry.gallery.length, `${entry.slug}: gallery length changed; preserve it.`);
  const states = [];
  function checkImage(actual, expected, label) {
    assert(object(actual), `${label}: image was cleared.`);
    assert.deepEqual(withoutAlt(actual), expected.expectedImage, `${label}: source identity or metadata changed; preserve it.`);
    assert([expected.beforeAlt, expected.afterAlt].includes(actual.alt), `${label}: customized/cleared alt; nothing overwritten.`);
    states.push(actual.alt === expected.afterAlt ? 'after' : 'before');
  }
  entry.gallery.forEach((change, index) => checkImage(data.gallery[index]?.image, change, `${entry.slug}.gallery[${index}]`));
  if (entry.image) checkImage(data.image, entry.image, `${entry.slug}.image`);
  assert(states.every(state => state === states[0]), `${entry.slug}: partially changed alt values; review this entry before continuing.`);
  if (states[0] === 'after') return {change: false, values: {}};
  const gallery = structuredClone(data.gallery);
  entry.gallery.forEach((change, index) => {gallery[index].image.alt = change.afterAlt;});
  return {change: true, values: {gallery, ...(entry.image ? {image: {...structuredClone(data.image), alt: entry.image.afterAlt}} : {})}};
}

function assertSchema(schema) {
  assert(schema?.supports?.includes('revisions') && Array.isArray(schema.fields), 'Models must retain native revisions and fields.');
  const gallery = schema.fields.find(field => field.slug === 'gallery');
  assert(gallery?.type === 'repeater' && gallery.validation?.subFields?.some(field => field.slug === 'image' && field.type === 'image'), 'Native gallery image schema changed.');
  assert.equal(schema.fields.find(field => field.slug === 'image')?.type, 'image');
}

async function readParents(api, item) {
  // This existing reverse relation has no exposed child-side field on models.
  // Read it directly rather than changing the schema or touching family edges.
  const parents = [], seen = new Set();
  let cursor;
  do {
    const query = new URLSearchParams({limit: '100', ...(cursor ? {cursor} : {})});
    const page = await api(`${pathFor(item.id)}/references/family_models/parents?${query}`);
    assert(Array.isArray(page.parents), 'Native family parents missing.');
    for (const parent of page.parents) {
      assert(parent.id && parent.collection && !seen.has(`id:${parent.id}`), 'Invalid or repeated family parent.');
      seen.add(`id:${parent.id}`);
      parents.push({id: parent.id, collection: parent.collection, translationGroup: parent.translationGroup, locale: parent.locale,
        ...(parent.sortOrder == null ? {} : {sortOrder: parent.sortOrder})});
    }
    cursor = page.nextCursor;
    assert(!cursor || (typeof cursor === 'string' && !seen.has(`cursor:${cursor}`)), 'Family pagination repeated a cursor.');
    if (cursor) seen.add(`cursor:${cursor}`);
    assert(parents.length <= 10000 && seen.size <= 11000, 'Family pagination exceeded its bound.');
  } while (cursor);
  return parents;
}

export async function prepareGalleryAlt(api, manifest) {
  validateGalleryAltManifest(manifest);
  const schema = (await api(schemaPath)).item; assertSchema(schema);
  const plans = [];
  for (const entry of manifest.entries) {
    const before = await api(pathFor(entry.slug));
    const result = planGalleryAlt(before, entry);
    plans.push({entry, before, ...result, references: await readReferences(api, 'models', before.item, schema.fields), parents: await readParents(api, before.item)});
  }
  return {manifest, schema, plans};
}

function assertPreserved(after, before, values) {
  const allowed = new Set(['data', 'liveData', 'updatedAt', 'version', 'liveRevisionId', 'draftRevisionId']);
  const stable = item => Object.fromEntries(Object.entries(item).filter(([key]) => !allowed.has(key)));
  assert.deepEqual(stable(after.item), stable(before.item), 'Native metadata, SEO, attribution or status changed.');
  assert.deepEqual(after.item.data, {...before.item.data, ...values}, 'A data field, caption or image metadata changed beyond the approved alt values.');
  // Native GET exposes the unchanged published snapshot beside a pending draft.
  // This is response bookkeeping, not another field to save or an ignored edit.
  if (Object.hasOwn(after.item, 'liveData')) assert.deepEqual(after.item.liveData, before.item.data, 'Published data changed while its draft was being checked.');
}

async function unchanged(api, plan, schema) {
  const fresh = await api(pathFor(plan.entry.slug)); assertNoDraft(fresh.item);
  assert.deepEqual(fresh, plan.before, `${plan.entry.slug}: entry changed concurrently; nothing overwritten.`);
  assert.deepEqual(await readReferences(api, 'models', fresh.item, schema.fields), plan.references, 'References changed concurrently.');
  assert.deepEqual(await readParents(api, fresh.item), plan.parents, 'Family parents changed concurrently.');
  return fresh;
}

export async function applyGalleryAlt(api, plan, {beforeWrite, afterEntry = async () => {}} = {}) {
  if (!plan.plans.some(entry => entry.change)) return;
  assert(typeof beforeWrite === 'function', 'Persist a private backup before any native save.');
  assert.deepEqual((await api(schemaPath)).item, plan.schema, 'Schema changed during preparation.');
  for (const item of plan.plans) await unchanged(api, item, plan.schema);
  await beforeWrite();
  for (const item of plan.plans.filter(entry => entry.change)) {
    const path = pathFor(item.entry.slug);
    assert.deepEqual((await api(schemaPath)).item, plan.schema, 'Schema changed before save.');
    const fresh = await unchanged(api, item, plan.schema);
    assert.deepEqual(planGalleryAlt(fresh, item.entry).values, item.values, 'Prepared changes were altered.');
    const saved = await api(path, {method: 'PUT', data: {_rev: fresh._rev, data: item.values}});
    assert(typeof saved._rev === 'string' && saved._rev, 'Native save omitted its revision.');
    const pending = await api(path);
    assert.equal(pending._rev, saved._rev, 'Draft changed before publication; leave it untouched.');
    assert.equal(pending.item.liveRevisionId, fresh.item.liveRevisionId, 'Published revision changed before draft publication.');
    assert.deepEqual((await api(schemaPath)).item, plan.schema, 'Schema changed before publication; draft preserved.');
    assertPreserved(pending, fresh, item.values);
    assert.deepEqual(await readReferences(api, 'models', pending.item, plan.schema.fields), item.references);
    assert.deepEqual(await readParents(api, pending.item), item.parents);
    await api(`${path}/publish`, {method: 'POST', data: {_rev: saved._rev}});
    const after = await api(path); assertNoDraft(after.item);
    assertPreserved(after, fresh, item.values);
    assert.deepEqual(await readReferences(api, 'models', after.item, plan.schema.fields), item.references);
    assert.deepEqual(await readParents(api, after.item), item.parents);
    assert.equal(planGalleryAlt(after, item.entry).change, false);
    await afterEntry({collection: 'models', slug: item.entry.slug, galleryAlts: item.entry.gallery.length, heroAlt: !!item.entry.image, revision: after._rev});
  }
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.length <= 1 && flags.every(flag => ['--dry-run', '--apply'].includes(flag)), 'Use --dry-run (default) or --apply.');
  const manifest = await loadGalleryAlt(), api = await authenticatedApi();
  const plan = await prepareGalleryAlt(api, manifest), changes = plan.plans.filter(entry => entry.change);
  console.log(JSON.stringify({origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run', entries: changes.map(item => ({slug: item.entry.slug, galleryAlts: item.entry.gallery.length, heroAlt: !!item.entry.image}))}));
  if (!flags.includes('--apply') || !changes.length) return;
  const dir = join(root, '.wrangler/migrations/0013-gallery-alt'), lock = join(dir, '.publication-lock');
  await mkdir(dir, {recursive: true, mode: 0o700}); await mkdir(lock, {mode: 0o700});
  const prefix = join(dir, new Date().toISOString().replaceAll(/[:.]/g, '-'));
  const report = {origin, migration, startedAt: new Date().toISOString(), manifestSha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'), entries: [], complete: false};
  try {
    await applyGalleryAlt(api, plan, {
      beforeWrite: () => writeFile(`${prefix}-backup.json`, JSON.stringify(plan, null, 2), {mode: 0o600, flag: 'wx'}),
      afterEntry: async entry => {report.entries.push(entry); await writeFile(`${prefix}-report.json`, JSON.stringify(report, null, 2), {mode: 0o600}); console.log(`Published models/${entry.slug}`);},
    });
    report.complete = true;
  } catch (error) {report.error = error instanceof Error ? error.message : 'Native publication failed'; throw error;}
  finally {await writeFile(`${prefix}-report.json`, JSON.stringify({...report, finishedAt: new Date().toISOString()}, null, 2), {mode: 0o600}); await rm(lock, {recursive: true});}
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {console.error(error.message); process.exitCode = 1;});
