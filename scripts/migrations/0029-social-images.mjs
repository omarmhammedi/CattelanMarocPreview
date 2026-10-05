/**
 * Fill seven empty native page SEO images from already published CMS assets.
 * Native SEO saves immediately. Never sends body data, status or publication.
 * The explicit SEO panel remains authoritative; clearing its image later works.
 * Run without a flag to inventory; --apply records private before-images first.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';

export const migration = '0029-social-images';
export const previewOrigin = 'https://cattelan-maroc-preview.cattelan.workers.dev';
const root = fileURLToPath(new URL('../../', import.meta.url));
const pathFor = id => `/_emdash/api/content/pages/${encodeURIComponent(id)}`;
const targets = ['a-propos', 'votre-projet', 'faq', 'mentions-legales', 'confidentialite', 'sur-mesure', 'professionnels'];

export function validateManifest(manifest) {
  assert.equal(manifest.version, 1);
  assert.equal(manifest.collection, 'pages');
  assert.deepEqual(manifest.entries.map(entry => entry.slug).sort(), [...targets].sort(), 'Only the seven audited pages are in scope.');
  assert.equal(manifest.sources.length, 2);
  assert.deepEqual(manifest.sources.map(source => `${source.slug}/${source.field}`).sort(), ['home/brand_detail_image', 'showroom-casablanca/hero_image']);
  const keys = new Set();
  for (const source of manifest.sources) {
    assert(/^[a-z]+$/u.test(source.key) && !keys.has(source.key), 'Source keys must be unique.');
    keys.add(source.key);
    assert(/^[0-9A-HJKMNP-TV-Z]{26}$/u.test(source.mediaId), 'Native media ID required.');
    assert(/^[0-9A-HJKMNP-TV-Z]{26}\.jpg$/u.test(source.storageKey), 'Existing JPEG storage key required.');
    assert(/^[0-9a-f]{64}$/u.test(source.sha256) && source.filename && source.reason, 'Source evidence required.');
  }
  for (const entry of manifest.entries) assert(keys.has(entry.source), 'Unknown image source.');
  return manifest;
}

function assertCleanPublished(response, slug) {
  const item = response?.item;
  assert(item?.type === 'pages' && item.slug === slug && item.id && response._rev, `${slug}: native identity/revision required.`);
  assert.equal(item.status, 'published', `${slug}: unpublished content must be preserved.`);
  assert(Object.hasOwn(item, 'draftRevisionId') && item.liveRevisionId, `${slug}: missing revision state.`);
  assert(!item.draftRevisionId || item.draftRevisionId === item.liveRevisionId, `${slug}: existing draft must be preserved.`);
  assert(item.seo && typeof item.seo === 'object', `${slug}: native SEO required.`);
}

function sourceImage(response, source) {
  assertCleanPublished(response, source.slug);
  const image = response.item.data?.[source.field];
  assert(image?.id === source.mediaId && image.meta?.storageKey === source.storageKey && image.filename === source.filename,
    `${source.slug}: published source image changed; re-review the asset.`);
  assert(image.mimeType === 'image/jpeg' && image.width >= 600 && image.height >= 315, 'Published social image must be a sufficiently sized JPEG.');
  // A relative native media path survives the production-domain cutover.
  return `/_emdash/api/media/file/${source.storageKey}`;
}

export function planImageEntry(response, entry, image) {
  assertCleanPublished(response, entry.slug);
  const current = response.item.seo.image;
  assert(current === undefined || current === null || typeof current === 'string', 'Unexpected native SEO image shape.');
  const change = current === undefined || current === null || current === '';
  return { slug: entry.slug, image, before: structuredClone(response), change,
    reason: change ? 'empty-native-image' : current === image ? 'already-configured' : 'editor-image-preserved' };
}

export async function planSocialImages(api, manifest) {
  validateManifest(manifest);
  const sources = [];
  for (const source of manifest.sources) {
    const response = await api(pathFor(source.slug));
    sources.push({ source, image: sourceImage(response, source), before: structuredClone(response) });
  }
  const entries = [];
  for (const entry of manifest.entries) {
    const source = sources.find(value => value.source.key === entry.source);
    entries.push(planImageEntry(await api(pathFor(entry.slug)), entry, source.image));
  }
  return { migration, sources, entries };
}

async function assertUnchanged(api, entry) {
  const fresh = await api(pathFor(entry.before.item.id));
  assertCleanPublished(fresh, entry.slug);
  assert.equal(fresh._rev, entry.before._rev, `${entry.slug}: concurrent revision; repeat inventory.`);
  assert.deepEqual(fresh.item, entry.before.item, `${entry.slug}: native entry changed; preserve it.`);
  return fresh;
}

/** Only the empty native image is changed; all draft/live body state is invariant. */
export async function applySocialImages(api, plan, { beforeWrite, afterEntry = async () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private before-image writer is required.');
  for (const source of plan.sources) {
    const fresh = await assertUnchanged(api, { ...source, slug: source.source.slug });
    assert.equal(sourceImage(fresh, source.source), source.image);
  }
  for (const entry of plan.entries) await assertUnchanged(api, entry);
  await beforeWrite({ kind: 'plan', ...plan });
  for (const entry of plan.entries.filter(value => value.change)) {
    const fresh = await assertUnchanged(api, entry);
    assert.equal(planImageEntry(fresh, entry, entry.image).change, true, 'Native image is no longer empty.');
    await beforeWrite({ kind: 'entry', slug: entry.slug, response: fresh, seo: { image: entry.image } });
    await api(pathFor(fresh.item.id), { method: 'PUT', data: { _rev: fresh._rev, seo: { image: entry.image } } });
    const saved = await api(pathFor(fresh.item.id));
    assert.deepEqual(saved.item.seo, { ...fresh.item.seo, image: entry.image }, `${entry.slug}: native SEO changed unexpectedly.`);
    for (const key of new Set([...Object.keys(fresh.item), ...Object.keys(saved.item)])) {
      if (['seo', 'updatedAt', 'version'].includes(key)) continue;
      assert.deepEqual(saved.item[key], fresh.item[key], `${entry.slug}: ${key} changed during metadata-only save.`);
    }
    await afterEntry({ slug: entry.slug, before: fresh, after: saved });
  }
}

export async function loadManifest() {
  return validateManifest(JSON.parse(await readFile(join(root, 'content/social-images-2026-10-05.json'), 'utf8')));
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for inventory, or --apply for immediate native SEO.');
  const origin = new URL(process.env.EMDASH_BASE_URL || previewOrigin);
  assert(!origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash, 'Use a bare origin.');
  assert(origin.origin === previewOrigin || ['localhost', '127.0.0.1'].includes(origin.hostname), 'Pinned Cattelan preview or local CMS required.');
  const nativeApi = await authenticatedApi(origin, /^\/_emdash\/api\/content\/pages\/[a-z0-9-]+$/iu);
  const api = (path, options = {}) => {
    const method = options.method || 'GET';
    assert(['GET', 'PUT'].includes(method), 'Only page reads and sparse native SEO updates are allowed.');
    if (method === 'PUT') {
      assert.deepEqual(Object.keys(options.data || {}).sort(), ['_rev', 'seo']);
      assert.deepEqual(Object.keys(options.data.seo), ['image']);
    }
    return nativeApi(path, options);
  };
  const plan = await planSocialImages(api, await loadManifest());
  console.log(JSON.stringify({ migration, origin: origin.origin, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    pages: plan.entries.map(({ slug, change, reason, image }) => ({ slug, change, reason, image })) }, null, 2));
  if (!flags.includes('--apply') || !plan.entries.some(entry => entry.change)) return;
  const dir = join(root, '.wrangler/migrations', migration, new Date().toISOString().replaceAll(/[:.]/gu, '-'));
  await mkdir(dir, { recursive: true, mode: 0o700 }); let number = 0;
  const persist = value => writeFile(join(dir, `${String(number++).padStart(4, '0')}-${value.kind || 'receipt'}.json`),
    JSON.stringify({ origin: origin.origin, ...value }, null, 2), { mode: 0o600, flag: 'wx' });
  await applySocialImages(api, plan, { beforeWrite: persist, afterEntry: async receipt => {
    await persist({ kind: 'receipt', ...receipt }); console.log(`${receipt.slug}: native SEO image saved; body and publication state preserved.`);
  } });
  const after = await planSocialImages(api, await loadManifest());
  assert(after.entries.every(entry => !entry.change), 'Image changes remain; review the native inventory.');
  console.log(`Verified seven native image decisions. Private before-images and receipts: ${dir}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
