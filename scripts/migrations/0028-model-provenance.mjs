/** Native manufacturer provenance drafts only. Publication remains a separate reviewed operation. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';
import { assertPreservedEntry, readReferences } from './0004-collection-editorial.mjs';

export const migration = '0028-model-provenance';
export const previewOrigin = 'https://cattelan-maroc-preview.cattelan.workers.dev';
const root = fileURLToPath(new URL('../../', import.meta.url));
const pathFor = (collection, id) => `/_emdash/api/content/${collection}/${encodeURIComponent(id)}`;
const schemaPath = collection => `/_emdash/api/schema/collections/${collection}?includeFields=true`;
const clone = value => structuredClone(value);
export function officialUrl(value) {
  const u = new URL(value);
  assert(u.protocol === 'https:' && ['www.cattelanitalia.com', 'cattelanitalia.com'].includes(u.hostname) && !u.username && !u.password && !u.search && !u.hash && /^\/fr\/products\/[A-F0-9-]{36}$/iu.test(u.pathname), 'Expected the exact verified French manufacturer product URL.');
  return u.href.replace('://www.', '://').toLowerCase();
}
export function validateManifest(manifest) {
  assert.equal(manifest.version, 1); assert.equal(manifest.models.length, 12); assert.equal(manifest.posts.length, 5);
  const models = new Map();
  for (const entry of manifest.models) {
    assert(/^[a-z0-9-]+$/u.test(entry.slug) && !models.has(entry.slug)); models.set(entry.slug, entry);
    officialUrl(entry.sourceUrl); assert(entry.title && Number.isFinite(Date.parse(entry.verifiedAt)));
    // EmDash datetime fields round-trip as Date#toISOString: UTC, millisecond precision.
    // Refuse noncanonical evidence timestamps before planning any writes.
    assert.equal(entry.verifiedAt, new Date(entry.verifiedAt).toISOString(), `${entry.slug}: verifiedAt must use native UTC millisecond datetime format.`);
    const evidence = entry.evidence; assert(evidence.technicalPdfBytes > 1000 && evidence.nativeTechnicalSheetId && evidence.nativeTechnicalSheetBytes > 1000 && /^[a-f0-9]{64}$/u.test(evidence.technicalPdfSha256) && /^[a-f0-9]{64}$/u.test(evidence.importedPdfSha256));
    assert(entry.sourceUrl.endsWith(evidence.officialProductId));
    const pdf = new URL(evidence.technicalPdfUrl);
    assert(pdf.protocol === 'https:' && pdf.hostname === 'www.cattelanitalia.com' && pdf.pathname.startsWith(`/fr/products/generaPDF/${evidence.officialProductId}/`) && !pdf.search && !pdf.hash && !pdf.username && !pdf.password);
  }
  const posts = new Set(); let sources = 0;
  for (const entry of manifest.posts) {
    assert(/^[a-z0-9-]+$/u.test(entry.slug) && !posts.has(entry.slug)); posts.add(entry.slug); assert(Array.isArray(entry.beforeSources));
    for (const source of entry.addSources) { assert(models.has(source.modelSlug) && source.label); assert.equal(officialUrl(source.url), officialUrl(models.get(source.modelSlug).sourceUrl)); sources++; }
  }
  assert.equal(sources, 14); return manifest;
}
function assertClean(response, collection, slug) {
  const item = response?.item;
  assert(item?.id && item.type === collection && item.slug === slug && response._rev, `${slug}: native identity and revision required.`);
  assert(item.status === 'published' && item.liveRevisionId && Object.hasOwn(item, 'draftRevisionId'), `${slug}: expected a published native entry.`);
  assert(!item.draftRevisionId || item.draftRevisionId === item.liveRevisionId, `${slug}: existing draft preserved.`);
}
export function planProvenanceEntry(response, collection, entry) {
  assertClean(response, collection, entry.slug); const current = response.item.data;
  if (collection === 'models') {
    assert.equal(current.title, entry.title, `${entry.slug}: product identity changed.`);
    assert(current.technical_sheet?.mimeType === 'application/pdf' && current.technical_sheet.filename === `cattelan-${entry.slug}-fiche-technique.pdf`, `${entry.slug}: verified native technical sheet changed.`);
    assert.equal(current.technical_sheet.id, entry.evidence.nativeTechnicalSheetId, `${entry.slug}: native PDF identity changed.`);
    assert.equal(current.technical_sheet.meta?.size, entry.evidence.nativeTechnicalSheetBytes, `${entry.slug}: native PDF size changed.`);
    const completed = current.source_url === entry.sourceUrl && current.official_url === entry.sourceUrl && current.source_verified_at === entry.verifiedAt;
    if (completed) return {};
    assert(!current.source_url && !current.official_url && !current.source_verified_at, `${entry.slug}: preserve existing source metadata; reverify before replacing.`);
    return { source_url: entry.sourceUrl, official_url: entry.sourceUrl, source_verified_at: entry.verifiedAt };
  }
  assert.equal(collection, 'posts');
  const after = clone(entry.beforeSources);
  for (const source of entry.addSources) if (!after.some(existing => { try { return officialUrl(existing.url) === officialUrl(source.url); } catch { return false; } })) after.push({ label: source.label, url: source.url });
  if (isDeepStrictEqual(current.sources, after)) return {};
  assert.deepEqual(current.sources, entry.beforeSources, `${entry.slug}: article sources changed; preserve the owner's edit.`);
  return { sources: after };
}
export async function planModelProvenance(api, manifest) {
  validateManifest(manifest); const schemas = {}, entries = [];
  for (const collection of ['models', 'posts']) {
    schemas[collection] = (await api(schemaPath(collection))).item;
    assert(schemas[collection]?.supports.includes('revisions'), `${collection}: native revision support required.`);
    const fields = schemas[collection].fields;
    for (const name of collection === 'models' ? ['source_url', 'official_url', 'source_verified_at', 'technical_sheet'] : ['sources']) assert(fields.some(field => field.slug === name), `${collection}: missing native ${name}.`);
    for (const entry of manifest[collection]) {
      const before = await api(pathFor(collection, entry.slug));
      const data = planProvenanceEntry(before, collection, entry);
      const references = await readReferences(api, collection, before.item, fields);
      entries.push({ collection, entry, before, data, references, change: Object.keys(data).length > 0 });
    }
  }
  return { migration, schemas, entries };
}
async function unchanged(api, item, schema) {
  const fresh = await api(pathFor(item.collection, item.before.item.id));
  assertClean(fresh, item.collection, item.entry.slug);
  assert.equal(fresh._rev, item.before._rev, `${item.entry.slug}: concurrent revision; preserved.`);
  assert.deepEqual(fresh.item, item.before.item, `${item.entry.slug}: native entry changed.`);
  assert.deepEqual(await readReferences(api, item.collection, fresh.item, schema.fields), item.references, `${item.entry.slug}: references changed.`);
  return fresh;
}
export async function applyModelProvenance(api, plan, { beforeWrite, afterEntry = async () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'Private before-image writer required.');
  for (const collection of ['models', 'posts']) assert.deepEqual((await api(schemaPath(collection))).item, plan.schemas[collection], `${collection}: schema changed.`);
  for (const item of plan.entries) await unchanged(api, item, plan.schemas[item.collection]);
  await beforeWrite({ kind: 'plan', ...plan });
  for (const item of plan.entries.filter(item => item.change)) {
    const schema = plan.schemas[item.collection];
    assert.deepEqual((await api(schemaPath(item.collection))).item, schema, `${item.collection}: schema changed before save.`);
    const before = await unchanged(api, item, schema);
    await beforeWrite({ kind: 'entry', collection: item.collection, slug: item.entry.slug, response: before, data: item.data });
    const path = pathFor(item.collection, before.item.id);
    await api(path, { method: 'PUT', data: { _rev: before._rev, data: item.data } });
    const after = await api(path);
    assertPreservedEntry(after, before, item.data, schema.fields);
    assert.equal(after.item.liveRevisionId, before.item.liveRevisionId, 'Draft writes must not publish.');
    assert(after.item.draftRevisionId && after.item.draftRevisionId !== after.item.liveRevisionId, 'Native draft was not created.');
    assert.deepEqual(after.item.liveData, before.item.data, 'Live content changed during draft save.');
    assert.deepEqual(await readReferences(api, item.collection, after.item, schema.fields), item.references, 'References changed during source update.');
    await afterEntry({ collection: item.collection, slug: item.entry.slug, before, after, fields: Object.keys(item.data) });
  }
}
export async function loadManifest() { return validateManifest(JSON.parse(await readFile(join(root, 'content/model-provenance-2026-10-05.json'), 'utf8'))); }
async function main() {
  const flags = process.argv.slice(2); assert(flags.every(flag => flag === '--apply'), 'No flag inventories; --apply creates drafts only.');
  const origin = new URL(process.env.EMDASH_BASE_URL || previewOrigin);
  assert(!origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash && (origin.origin === previewOrigin || ['localhost', '127.0.0.1'].includes(origin.hostname)), 'Pinned preview or local origin required.');
  const nativeApi = await authenticatedApi(origin, /^\/_emdash\/api\/(?:schema\/collections\/(?:models|posts)|content\/(?:models|posts))(?:[/?]|$)/u);
  const api = (path, options = {}) => { const method = options.method || 'GET'; assert(method === 'GET' || (method === 'PUT' && /^\/_emdash\/api\/content\/(?:models|posts)\/[a-z0-9-]+$/iu.test(path)), 'Only native content draft PUTs allowed; no publication.'); return nativeApi(path, options); };
  const plan = await planModelProvenance(api, await loadManifest());
  console.log(JSON.stringify({ migration, origin: origin.origin, mode: flags.includes('--apply') ? 'save-drafts' : 'dry-run', entries: plan.entries.map(item => ({ collection: item.collection, slug: item.entry.slug, fields: Object.keys(item.data) })) }, null, 2));
  if (!flags.includes('--apply') || !plan.entries.some(item => item.change)) return;
  const dir = join(root, '.wrangler/migrations', migration, new Date().toISOString().replaceAll(/[:.]/gu, '-'));
  await mkdir(dir, { recursive: true, mode: 0o700 }); let number = 0;
  const persist = value => writeFile(join(dir, `${String(number++).padStart(4, '0')}-${value.kind || 'receipt'}.json`), JSON.stringify({ origin: origin.origin, ...value }, null, 2), { mode: 0o600, flag: 'wx' });
  await applyModelProvenance(api, plan, { beforeWrite: persist, afterEntry: async receipt => { await persist({ kind: 'receipt', ...receipt }); console.log(`${receipt.collection}/${receipt.slug}: source draft verified; publication remains separate.`); } });
  console.log(`No content was published. Private receipts: ${dir}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
