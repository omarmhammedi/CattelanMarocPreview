/**
 * Migration 0004: replace the known provisional collection/model copy.
 * Read-only plan by default; --apply uses genuine native EmDash authentication.
 * Apply 0003 first. No schema, media, relations, users or authentication are written.
 * Each entry must match its complete before or after copy; edits/clears are conflicts.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertContentValue, assertNoDraft, authentication, normalizeData, officialUrl } from './0003-model-detail-pages.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const allowedFields = { families: { intro: 'text', card_text: 'text', content: 'portableText' }, models: { description: 'text', content: 'portableText' } };
const contentPath = (collection, slug) => `/_emdash/api/content/${collection}/${encodeURIComponent(slug)}`;
const schemaPath = collection => `/_emdash/api/schema/collections/${collection}?includeFields=true`;
const ownObject = value => value && typeof value === 'object' && !Array.isArray(value);

function exactKeys(value, keys, label) {
  assert(ownObject(value), `${label} must be an object.`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label} has unexpected or missing keys.`);
}

function validateCopy(value, type, label) {
  if (type === 'text') {
    assert(typeof value === 'string' && value.trim().length > 0 && value.length <= 10000, `${label} must be nonempty bounded text.`);
    return;
  }
  assert(Array.isArray(value) && value.length > 0 && value.length <= 100, `${label} must contain Portable Text blocks.`);
  const blockKeys = new Set();
  for (const block of value) {
    assert(block?._type === 'block' && typeof block._key === 'string' && block._key && !blockKeys.has(block._key), `${label} has an invalid or duplicate text block.`);
    blockKeys.add(block._key);
    assert(['normal', 'h2', 'h3'].includes(block.style), `${label} has an unsupported heading style.`);
    assert(Array.isArray(block.children) && block.children.length && Array.isArray(block.markDefs), `${label} must use native text spans and marks.`);
    const marks = new Set(['strong', 'em', 'underline', 'strike-through', 'code']);
    for (const mark of block.markDefs) {
      assert(mark?._type === 'link' && typeof mark._key === 'string' && mark._key && !marks.has(mark._key), `${label} has an invalid link mark.`);
      // Editorial links may stay on this site or point to the verified manufacturer.
      if (!(typeof mark.href === 'string' && /^\/(?!\/)[a-z0-9/\-#]*$/i.test(mark.href))) officialUrl(mark.href);
      marks.add(mark._key);
    }
    const spanKeys = new Set();
    for (const span of block.children) {
      assert(span?._type === 'span' && typeof span._key === 'string' && span._key && !spanKeys.has(span._key), `${label} has an invalid or duplicate text span.`);
      spanKeys.add(span._key);
      assert(typeof span.text === 'string' && span.text.length <= 10000 && Array.isArray(span.marks) && span.marks.every(mark => marks.has(mark)), `${label} has invalid span text/marks.`);
    }
  }
}

export function validateEditorialManifest(manifest) {
  exactKeys(manifest, ['version', 'collection', 'entries'], 'Editorial manifest');
  assert(manifest.version === 1 && Object.hasOwn(allowedFields, manifest.collection), 'Editorial manifest version/collection is invalid.');
  assert(Array.isArray(manifest.entries) && manifest.entries.length > 0 && manifest.entries.length <= 100, 'Editorial manifest must contain between 1 and 100 entries.');
  const slugs = new Set();
  for (const entry of manifest.entries) {
    const hasSeo = Object.hasOwn(entry, 'beforeSeo') || Object.hasOwn(entry, 'afterSeo');
    exactKeys(entry, ['slug', 'sources', 'before', 'after', ...(hasSeo ? ['beforeSeo', 'afterSeo'] : [])], 'Editorial entry');
    assert(typeof entry.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug) && !slugs.has(entry.slug), 'Editorial entry slug is invalid or duplicated.');
    slugs.add(entry.slug);
    assert(Array.isArray(entry.sources) && entry.sources.length > 0 && entry.sources.length <= 30, `${entry.slug}: official source URLs are required.`);
    entry.sources.forEach(officialUrl);
    for (const phase of ['before', 'after']) {
      exactKeys(entry[phase], Object.keys(allowedFields[manifest.collection]), `${entry.slug}.${phase}`);
      for (const [field, type] of Object.entries(allowedFields[manifest.collection])) validateCopy(entry[phase][field], type, `${entry.slug}.${phase}.${field}`);
    }
    if (hasSeo) {
      for (const phase of ['beforeSeo', 'afterSeo']) {
        exactKeys(entry[phase], ['title', 'description'], `${entry.slug}.${phase}`);
        for (const [field, max] of [['title', 200], ['description', 500]]) {
          const value = entry[phase][field];
          assert((phase === 'beforeSeo' && value === null) || (typeof value === 'string' && value.trim() && value.length <= max), `${entry.slug}.${phase}.${field} must be bounded text${phase === 'beforeSeo' ? ' or null' : ''}.`);
        }
      }
    }
    assert(!isDeepStrictEqual(entry.before, entry.after), `${entry.slug} has no editorial change.`);
  }
  return manifest;
}

export function assertEditorialSchema(schema, collection) {
  assert(Array.isArray(schema?.fields), `${collection}: schema omitted fields.`);
  for (const [name, type] of Object.entries(allowedFields[collection])) assert.equal(schema.fields.find(field => field.slug === name)?.type, type, `${collection}.${name} has another type or is missing; apply 0003 before 0004.`);
  if (collection === 'models') assert.equal(schema.fields.find(field => field.slug === 'source_verified_at')?.type, 'datetime', 'Model source verification field is missing; apply 0003 first.');
  assert(schema.supports?.includes('revisions'), `${collection} must retain native revisions.`);
}

export function planEditorialEntry(response, entry, collection) {
  assertNoDraft(response?.item);
  assert(typeof response._rev === 'string' && response._rev && response.item.slug === entry.slug && response.item.type === collection, `${collection}/${entry.slug}: cannot safely identify/revise the native entry.`);
  if (collection === 'models') assert(typeof response.item.data.source_verified_at === 'string' && Number.isFinite(Date.parse(response.item.data.source_verified_at)), `${entry.slug}: apply 0003 before rewriting its detailed copy.`);
  const current = Object.fromEntries(Object.keys(entry.before).map(field => [field, response.item.data[field]]));
  const currentSeo = entry.beforeSeo ? { title: response.item.seo?.title ?? null, description: response.item.seo?.description ?? null } : undefined;
  if (isDeepStrictEqual(current, entry.after) && (!entry.afterSeo || isDeepStrictEqual(currentSeo, entry.afterSeo))) return {};
  assert(isDeepStrictEqual(current, entry.before) && (!entry.beforeSeo || isDeepStrictEqual(currentSeo, entry.beforeSeo)), `${collection}/${entry.slug}: copy/SEO differs from the exact initial or completed state. Preserve this edit/clear and review it in EmDash; no overwrite was attempted.`);
  return structuredClone(entry.after);
}

export function assertUnchangedEntry(fresh, before, label) {
  assertNoDraft(fresh.item);
  assert.equal(fresh._rev, before._rev, `${label} changed concurrently; current content was preserved.`);
  assert.equal(fresh.item.id, before.item.id, `${label} now identifies another entry.`);
  assert.equal(fresh.item.status, before.item.status, `${label} changed publication status.`);
  assert.deepEqual(fresh.item.seo, before.item.seo, `${label} changed native SEO concurrently.`);
}

export async function readReferences(api, collection, item, fields) {
  const snapshot = {};
  for (const field of fields.filter(field => field.type === 'reference' && field.validation?.relation)) {
    const relation = field.validation.relation;
    assert(typeof relation === 'string' && /^[a-z][a-z0-9_]*$/.test(relation), 'Reference relation is invalid.');
    const side = field.validation.relationSide || 'parent';
    assert(['parent', 'child'].includes(side), 'Reference side is invalid.');
    const key = side === 'parent' ? 'children' : 'parents';
    const entries = [];
    const seen = new Set();
    let cursor;
    do {
      const query = new URLSearchParams({ limit: '100', ...(cursor ? { cursor } : {}) });
      const page = await api(`${contentPath(collection, item.id)}/references/${relation}/${key}?${query}`);
      assert(Array.isArray(page[key]), `${item.slug}.${field.slug}: reference response omitted ${key}.`);
      for (const entry of page[key]) {
        assert(entry.id && entry.collection && !seen.has(`id:${entry.id}`), `${item.slug}.${field.slug}: duplicate or incomplete reference.`);
        seen.add(`id:${entry.id}`);
        entries.push({ id: entry.id, collection: entry.collection, translationGroup: entry.translationGroup, locale: entry.locale, ...(entry.sortOrder == null ? {} : { sortOrder: entry.sortOrder }) });
      }
      cursor = page.nextCursor;
      assert(!cursor || (typeof cursor === 'string' && !seen.has(`cursor:${cursor}`)), 'Reference pagination repeated a cursor.');
      if (cursor) seen.add(`cursor:${cursor}`);
      assert(entries.length <= 10000 && seen.size <= 11000, 'Reference pagination exceeded its safety bound.');
    } while (cursor);
    snapshot[field.slug] = entries;
  }
  return snapshot;
}

export function assertPreservedEntry(after, before, values, fields, seo) {
  // Only native revision/version/update bookkeeping may change. SEO, attribution,
  // original publication time, translations and every unedited data field remain.
  for (const key of ['id', 'type', 'slug', 'status', 'authorId', 'primaryBylineId', 'byline', 'bylines', 'createdAt', 'publishedAt', 'scheduledAt', 'locale', 'translationGroup']) assert.deepEqual(after.item[key], before.item[key], `${before.item.slug}: native ${key} changed.`);
  const expectedSeo = seo ? { title: null, description: null, image: null, canonical: null, noIndex: false, ...before.item.seo, ...seo } : before.item.seo;
  assert.deepEqual(after.item.seo, expectedSeo, `${before.item.slug}: native SEO differs or an unedited SEO field changed.`);
  const original = normalizeData(before.item.data, fields);
  const actual = normalizeData(after.item.data, fields);
  for (const [key, value] of Object.entries({ ...original, ...values })) {
    if (value == null && actual[key] == null) continue;
    assertContentValue(actual[key], value, `${before.item.slug}: ${key} was not preserved/saved as intended.`);
  }
  for (const [key, value] of Object.entries(actual)) assert(key in original || key in values || value == null, `${before.item.slug}: unexpected data field ${key} appeared.`);
}

async function privateJson(path, value) {
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, path);
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => ['--apply', '--dry-run'].includes(flag)) && !(flags.includes('--apply') && flags.includes('--dry-run')), 'Use --dry-run (default) or --apply only.');
  const apply = flags.includes('--apply');
  const origin = new URL(process.env.EMDASH_BASE_URL || 'http://localhost:4321');
  assert(['http:', 'https:'].includes(origin.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash, 'This migration accepts only a local development origin.');
  const manifests = [];
  for (const file of ['family-editorial.json', 'model-editorial.json']) manifests.push(validateEditorialManifest(JSON.parse(await readFile(join(root, 'content', file), 'utf8'))));
  assert.deepEqual(manifests.map(manifest => manifest.collection), ['families', 'models'], 'Editorial files target unexpected collections.');
  const auth = await authentication(origin);
  const api = async (path, { method = 'GET', data } = {}) => {
    assert(path.startsWith('/_emdash/api/'), 'Native API path is invalid.');
    assert(auth.expiresAt > Date.now(), 'Native CLI access token expired. Renew it with the native CLI; this migration never refreshes credentials.');
    const response = await fetch(new URL(path, origin), {
      method, redirect: 'error', signal: AbortSignal.timeout(90000),
      headers: { ...auth.headers, Origin: origin.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    let body;
    try { body = await response.json(); } catch { throw new Error(`${method} ${path}: HTTP ${response.status}; expected the authenticated EmDash JSON API.`); }
    // Avoid echoing server details that could include private content or credentials.
    assert(response.ok && body.success === true, `${method} ${path}: HTTP ${response.status}; native request failed.`);
    return body.data;
  };
  const schemas = {};
  const plans = [];
  for (const manifest of manifests) {
    const collection = manifest.collection;
    schemas[collection] = (await api(schemaPath(collection))).item;
    assertEditorialSchema(schemas[collection], collection);
    if (manifest.entries.some(entry => entry.afterSeo)) assert(schemas[collection].supports.includes('seo'), `${collection}: native SEO is not enabled.`);
    for (const entry of manifest.entries) {
      const before = await api(contentPath(collection, entry.slug));
      const values = planEditorialEntry(before, entry, collection);
      const references = await readReferences(api, collection, before.item, schemas[collection].fields);
      plans.push({ collection, entry, before, references, values });
    }
  }
  const changed = plans.filter(plan => Object.keys(plan.values).length);
  console.log(`${apply ? 'Apply' : 'Dry run'} 0004: ${changed.length} entries to improve; ${plans.length - changed.length} already match the completed copy.`);
  for (const plan of plans) console.log(`${plan.collection}/${plan.entry.slug}: ${Object.keys(plan.values).length ? [...Object.keys(plan.values), ...(plan.entry.afterSeo ? ['native SEO title/description'] : [])].join(', ') : 'already updated; no change'}`);
  if (changed.some(plan => plan.entry.afterSeo)) console.log('Native EmDash SEO metadata is saved immediately, outside content drafts. Only originally published entries are published again; SEO image/canonical/noIndex are preserved.');
  if (!apply) { console.log('No CMS, media, authentication or local state was written.'); return; }
  if (!changed.length) { console.log('Migration 0004 already applied; nothing was changed.'); return; }

  const privateDir = join(root, '.wrangler/migrations');
  const lockDir = join(privateDir, '.0004-collection-editorial.lock');
  await mkdir(privateDir, { recursive: true, mode: 0o700 });
  try { await mkdir(lockDir, { mode: 0o700 }); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another 0004 import may be active. If it has stopped, remove only its lock directory: ${lockDir}`);
    throw error;
  }
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const reportPath = join(privateDir, `0004-collection-editorial-${stamp}-report.json`);
  const report = { migration: '0004-collection-editorial', startedAt: new Date().toISOString(), manifestSha256: createHash('sha256').update(JSON.stringify(manifests)).digest('hex'), entries: [], complete: false };
  try {
    // Validate all entries again before the first mutation, not only the next one.
    for (const [collection, schema] of Object.entries(schemas)) assert.deepEqual((await api(schemaPath(collection))).item, schema, `${collection}: schema changed during preparation; nothing was written.`);
    for (const plan of plans) {
      const fresh = await api(contentPath(plan.collection, plan.entry.slug));
      assertUnchangedEntry(fresh, plan.before, `${plan.collection}/${plan.entry.slug}`);
      assert.deepEqual(await readReferences(api, plan.collection, fresh.item, schemas[plan.collection].fields), plan.references, `${plan.entry.slug}: references changed during preparation; nothing was written.`);
    }
    const backupPath = join(privateDir, `0004-collection-editorial-${stamp}-backup.json`);
    await privateJson(backupPath, { migration: report.migration, createdAt: report.startedAt, schemas, entries: changed.map(({ collection, before, references }) => ({ collection, before, references })) });
    console.log(`Private affected-entry backup: ${backupPath}`);
    for (const plan of changed) {
      const path = contentPath(plan.collection, plan.entry.slug);
      const fresh = await api(path);
      assertUnchangedEntry(fresh, plan.before, `${plan.collection}/${plan.entry.slug}`);
      assert.deepEqual(await readReferences(api, plan.collection, fresh.item, schemas[plan.collection].fields), plan.references, `${plan.entry.slug}: references changed concurrently; preserved them.`);
      // Native partial data writes retain all other data and relation selections.
      const saved = await api(path, { method: 'PUT', data: { data: plan.values, _rev: fresh._rev, ...(plan.entry.afterSeo ? { seo: plan.entry.afterSeo } : {}) } });
      assert(saved._rev, `${plan.entry.slug}: native save omitted a revision; not published.`);
      if (fresh.item.status === 'published') await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
      const after = await api(path);
      if (fresh.item.status === 'published') assertNoDraft(after.item);
      else assert.equal(after._rev, saved._rev, `${plan.entry.slug}: draft changed after saving.`);
      assertPreservedEntry(after, fresh, plan.values, schemas[plan.collection].fields, plan.entry.afterSeo);
      assert.deepEqual(await readReferences(api, plan.collection, after.item, schemas[plan.collection].fields), plan.references, `${plan.entry.slug}: relation identity/order changed.`);
      report.entries.push({ collection: plan.collection, slug: plan.entry.slug, status: after.item.status, fields: Object.keys(plan.values), ...(plan.entry.afterSeo ? { nativeSeo: Object.keys(plan.entry.afterSeo) } : {}), revision: after._rev });
      await privateJson(reportPath, report);
      console.log(`Updated ${plan.collection}/${plan.entry.slug}; preserved other fields, media, references and ${after.item.status} status.`);
    }
    report.complete = true;
    report.finishedAt = new Date().toISOString();
    await privateJson(reportPath, report);
    console.log(`Migration 0004 complete. Private report: ${reportPath}`);
  } catch (error) {
    report.failedAt = new Date().toISOString();
    report.error = error instanceof Error ? error.message : 'Migration failed';
    await privateJson(reportPath, report);
    console.error(`Import stopped without deleting or rolling back content. Review the private backup/report and any pending draft before rerunning: ${reportPath}`);
    throw error;
  } finally {
    await rm(lockDir, { recursive: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration 0004 failed'); process.exitCode = 1; });
}
