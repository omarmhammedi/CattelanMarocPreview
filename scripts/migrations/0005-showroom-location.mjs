/**
 * Migration 0005: owner-approved showroom details and optional Google map.
 * Dry run by default; --apply uses an existing genuine native administrator session.
 * Only local native schema/content APIs. Never seeds, creates credentials or writes SQL.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertNoDraft, authentication } from './0003-model-detail-pages.mjs';
import { assertPreservedEntry, assertUnchangedEntry, readReferences } from './0004-collection-editorial.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const types = { address: 'text', hours: 'text', contact_phone: 'string', map_url: 'url', map_note: 'text', map_embed_url: 'url' };
const newFields = new Set(['map_note', 'map_embed_url']);
const contentPath = (collection, slug) => `/_emdash/api/content/${collection}/${encodeURIComponent(slug)}`;
const schemaPath = collection => `/_emdash/api/schema/collections/${collection}?includeFields=true`;
export const FIELD_DEFINITIONS = [
  { slug: 'map_note', label: 'Précision sur le plan illustré', type: 'text', required: false, options: { helpText: 'Cette note distingue le plan illustratif du véritable itinéraire Google Maps.' } },
  { slug: 'map_embed_url', label: 'Carte Google Maps interactive — URL seulement', type: 'url', required: false, options: { helpText: 'Collez uniquement l’URL https://www.google.com/maps/embed?pb=… du code Google Maps, sans balise iframe. La carte est chargée sur demande ; vider ce champ masque le bouton.' } },
];

function exactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object.`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label}: unexpected or missing keys.`);
}

export function validateShowroomManifest(manifest) {
  exactKeys(manifest, ['version', 'sources', 'global', 'showroom'], 'Showroom manifest');
  assert.equal(manifest.version, 1, 'Unknown showroom manifest version.');
  exactKeys(manifest.sources, ['store_information', 'provided_by', 'hours_timezone'], 'Sources');
  assert.equal(manifest.sources.store_information, 'https://i.imgur.com/6swwYhA.png');
  assert.equal(manifest.sources.hours_timezone, 'Africa/Casablanca', 'Store hours must retain Casablanca local time.');
  assert.equal(typeof manifest.sources.provided_by, 'string');
  exactKeys(manifest.global, ['before', 'after'], 'Global content');
  for (const phase of ['before', 'after']) exactKeys(manifest.global[phase], Object.keys(types), `Global ${phase}`);
  assert(Object.values(manifest.global.before).every(value => value === null), 'Only the known empty contact baseline can be initialized.');
  for (const [key, value] of Object.entries(manifest.global.after)) assert(typeof value === 'string' && value.trim() && value.length <= 4000 && !/[<>]/.test(value), `Invalid approved ${key}.`);
  assert.equal(manifest.global.after.contact_phone.replace(/\s/g, ''), '+212771105490', 'Only the owner-supplied telephone is approved.');
  const directions = new URL(manifest.global.after.map_url);
  assert(directions.protocol === 'https:' && directions.host === 'www.google.com' && directions.pathname === '/maps/dir/' && !directions.username && !directions.password && !directions.hash, 'Invalid Google directions URL.');
  assert(directions.searchParams.get('api') === '1' && directions.searchParams.get('destination_place_id') === 'ChIJnXzIEVjTpw0RXul0XQgeEHw' && directions.searchParams.get('destination')?.includes('Casablanca'), 'Directions must identify the verified showroom place.');
  const embed = new URL(manifest.global.after.map_embed_url);
  assert(embed.protocol === 'https:' && embed.host === 'www.google.com' && embed.pathname === '/maps/embed' && !embed.username && !embed.password && !embed.hash && [...embed.searchParams.keys()].join() === 'pb' && embed.searchParams.get('pb')?.includes('0xda7d35811c87c9d:0x7c101e085d74e95e'), 'Only the owner-supplied Google embed location is approved.');
  exactKeys(manifest.showroom, ['section_key', 'cta_label', 'before_href', 'after_href'], 'Showroom CTA');
  assert.deepEqual(manifest.showroom, { section_key: 'visit', cta_label: 'Contacter le showroom', before_href: '/showroom-casablanca/', after_href: '#showroom-contact' }, 'Only the known visit CTA may change.');
  return manifest;
}

export function assertShowroomSchema(schema, collection) {
  assert(schema?.slug === collection && Array.isArray(schema.fields) && schema.supports?.includes('revisions'), `${collection}: expected native collection and revisions.`);
  const expected = collection === 'site_content' ? types : { sections: 'repeater' };
  for (const [slug, type] of Object.entries(expected)) {
    const field = schema.fields.find(field => field.slug === slug);
    if (!field && newFields.has(slug)) continue;
    assert.equal(field?.type, type, `${collection}.${slug}: missing or incompatible field type.`);
    if (newFields.has(slug)) assert(!field.required && !field.defaultValue, `${slug}: existing field must remain optional without an implicit value.`);
  }
  if (collection === 'pages') for (const slug of ['section_key', 'cta_label', 'cta_href']) assert.equal(schema.fields.find(field => field.slug === 'sections').validation?.subFields?.find(field => field.slug === slug)?.type, 'string', `pages.sections.${slug}: incompatible structure.`);
}

function publishedEntry(response, collection, slug) {
  assertNoDraft(response?.item);
  assert(response.item.status === 'published' && response.item.type === collection && response.item.slug === slug && response.item.id && typeof response._rev === 'string' && response._rev, `${collection}/${slug}: expected the published native entry and revision.`);
}

export function planGlobalLocation(response, manifest) {
  publishedEntry(response, 'site_content', 'global');
  // Native optional fields may represent the original empty value as '', null or absent.
  // A partially changed/cleared import is not the initial baseline and is never refilled.
  const current = Object.fromEntries(Object.keys(types).map(key => [key, response.item.data[key] === '' ? null : response.item.data[key] ?? null]));
  if (isDeepStrictEqual(current, manifest.global.after)) return {};
  assert(isDeepStrictEqual(current, manifest.global.before), 'Global showroom values differ from the empty baseline or the approved completed state. Preserve the editor change/clear; no overwrite was attempted.');
  return structuredClone(manifest.global.after);
}

export function planShowroomContact(response, manifest) {
  publishedEntry(response, 'pages', 'showroom-casablanca');
  const sections = response.item.data.sections;
  assert(Array.isArray(sections), 'Showroom sections are missing or cleared; preserve the editor change.');
  const matches = sections.filter(section => section.section_key === manifest.showroom.section_key);
  assert.equal(matches.length, 1, 'Showroom visit section is missing or duplicated; preserve the editor change.');
  const section = matches[0];
  assert.equal(section.cta_label, manifest.showroom.cta_label, 'Showroom visit CTA label was edited/cleared; preserve it.');
  if (section.cta_href === manifest.showroom.after_href) return {};
  assert.equal(section.cta_href, manifest.showroom.before_href, 'Showroom visit CTA target was edited/cleared; preserve it.');
  return { sections: sections.map(row => row === section ? { ...structuredClone(row), cta_href: manifest.showroom.after_href } : structuredClone(row)) };
}

export async function prepareShowroomLocation(api, manifest) {
  validateShowroomManifest(manifest);
  const schemas = {};
  const entries = [];
  for (const [collection, slug, planner] of [['site_content', 'global', planGlobalLocation], ['pages', 'showroom-casablanca', planShowroomContact]]) {
    const schema = (await api(schemaPath(collection))).item;
    assertShowroomSchema(schema, collection);
    schemas[collection] = schema;
    const before = await api(contentPath(collection, slug));
    entries.push({ collection, slug, before, values: planner(before, manifest), references: await readReferences(api, collection, before.item, schema.fields) });
  }
  return { schemas, entries, fields: FIELD_DEFINITIONS.filter(definition => !schemas.site_content.fields.some(field => field.slug === definition.slug)) };
}

function assertSchemaPreserved(current, original, added = []) {
  const addedSlugs = new Set(added.map(field => field.slug));
  assert.deepEqual(current.fields.filter(field => !addedSlugs.has(field.slug)), original.fields, `${original.slug}: existing schema fields changed concurrently.`);
  for (const [key, value] of Object.entries(original)) if (!['fields', 'updatedAt'].includes(key)) assert.deepEqual(current[key], value, `${original.slug}: collection metadata changed concurrently.`);
}

async function recheckEntries(api, plan) {
  for (const entry of plan.entries) {
    const fresh = await api(contentPath(entry.collection, entry.slug));
    assertUnchangedEntry(fresh, entry.before, `${entry.collection}/${entry.slug}`);
    assert.deepEqual(fresh.item.data, entry.before.item.data, `${entry.slug}: content changed during preparation.`);
    assert.deepEqual(await readReferences(api, entry.collection, fresh.item, plan.schemas[entry.collection].fields), entry.references, `${entry.slug}: references changed concurrently.`);
  }
}

/** Injectable native API keeps all destructive/auth tests in an in-memory fixture. */
export async function applyShowroomLocation(api, plan, { beforeWrite, afterEntry = async () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  for (const [collection, schema] of Object.entries(plan.schemas)) assert.deepEqual((await api(schemaPath(collection))).item, schema, `${collection}: schema changed during preparation; no writes made.`);
  await recheckEntries(api, plan);
  await beforeWrite(plan);
  const added = [];
  for (const field of plan.fields) {
    const schema = (await api(schemaPath('site_content'))).item;
    assertSchemaPreserved(schema, plan.schemas.site_content, added);
    assert(!schema.fields.some(existing => existing.slug === field.slug), `${field.slug}: another editor added this field.`);
    await api('/_emdash/api/schema/collections/site_content/fields', { method: 'POST', data: field });
    added.push(field);
  }
  const schemas = {};
  for (const [collection, before] of Object.entries(plan.schemas)) {
    schemas[collection] = (await api(schemaPath(collection))).item;
    assertShowroomSchema(schemas[collection], collection);
    assertSchemaPreserved(schemas[collection], before, collection === 'site_content' ? added : []);
  }
  const completed = [];
  for (const entry of plan.entries.filter(entry => Object.keys(entry.values).length)) {
    const path = contentPath(entry.collection, entry.slug);
    const fresh = await api(path);
    assertUnchangedEntry(fresh, entry.before, `${entry.collection}/${entry.slug}`);
    // Schema addition may materialize optional nulls but must not change existing values.
    assertPreservedEntry(fresh, entry.before, {}, schemas[entry.collection].fields);
    assert.deepEqual(await readReferences(api, entry.collection, fresh.item, schemas[entry.collection].fields), entry.references, `${entry.slug}: references changed concurrently.`);
    const saved = await api(path, { method: 'PUT', data: { data: entry.values, _rev: fresh._rev } });
    assert(saved._rev, `${entry.slug}: save omitted its revision; not published.`);
    await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
    const after = await api(path);
    publishedEntry(after, entry.collection, entry.slug);
    assertPreservedEntry(after, fresh, entry.values, schemas[entry.collection].fields);
    assert.deepEqual(await readReferences(api, entry.collection, after.item, schemas[entry.collection].fields), entry.references, `${entry.slug}: references were not preserved.`);
    completed.push({ collection: entry.collection, slug: entry.slug, fields: Object.keys(entry.values), revision: after._rev });
    await afterEntry({ collection: entry.collection, slug: entry.slug, before: entry.before, after, references: entry.references });
  }
  return { completed, addedFields: added.map(field => field.slug), schemas };
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
  const manifest = validateShowroomManifest(JSON.parse(await readFile(join(root, 'content/showroom-location.json'), 'utf8')));
  const auth = await authentication(origin);
  const api = async (path, { method = 'GET', data } = {}) => {
    assert(path.startsWith('/_emdash/api/'), 'Invalid native API path.');
    assert(auth.expiresAt > Date.now(), 'Native access token expired; renew through EmDash.');
    const response = await fetch(new URL(path, origin), {
      method, redirect: 'error', signal: AbortSignal.timeout(90000),
      headers: { ...auth.headers, Origin: origin.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    let body;
    try { body = await response.json(); } catch { throw new Error(`${method} ${path}: HTTP ${response.status}; expected authenticated native JSON.`); }
    assert(response.ok && body.success === true, `${method} ${path}: HTTP ${response.status}; native request failed.`);
    return body.data;
  };
  const plan = await prepareShowroomLocation(api, manifest);
  const changed = plan.entries.filter(entry => Object.keys(entry.values).length);
  console.log(`${apply ? 'Apply' : 'Dry run'} 0005: ${plan.fields.length} optional schema fields; ${changed.length} published entries to update.`);
  for (const entry of plan.entries) console.log(`${entry.collection}/${entry.slug}: ${Object.keys(entry.values).join(', ') || 'already completed; unchanged'}`);
  if (!apply) { console.log('No CMS, media, authentication or local state was written.'); return; }
  if (!changed.length && !plan.fields.length) { console.log('Migration 0005 already applied; no changes.'); return; }
  const privateDir = join(root, '.wrangler/migrations');
  const lockDir = join(privateDir, '.0005-showroom-location.lock');
  await mkdir(privateDir, { recursive: true, mode: 0o700 });
  try { await mkdir(lockDir, { mode: 0o700 }); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another 0005 migration may be active; inspect before removing its lock: ${lockDir}`);
    throw error;
  }
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const prefix = join(privateDir, `0005-showroom-location-${stamp}`);
  const report = { migration: '0005-showroom-location', startedAt: new Date().toISOString(), manifestSha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'), entries: [], complete: false };
  try {
    const result = await applyShowroomLocation(api, plan, {
      beforeWrite: snapshot => privateJson(`${prefix}-before.json`, { migration: report.migration, createdAt: report.startedAt, ...snapshot }),
      afterEntry: async entry => { report.entries.push(entry); await privateJson(`${prefix}-after.json`, report); },
    });
    report.complete = true;
    report.finishedAt = new Date().toISOString();
    report.addedFields = result.addedFields;
    report.schemas = result.schemas;
    await privateJson(`${prefix}-after.json`, report);
    console.log(`Migration 0005 complete. Private before/after backup prefix: ${prefix}`);
  } catch (error) {
    report.failedAt = new Date().toISOString();
    report.error = error instanceof Error ? error.message : 'Migration failed';
    await privateJson(`${prefix}-after.json`, report);
    console.error(`Stopped without deleting or rolling back content. Review the private before/after backup and any pending draft: ${prefix}`);
    throw error;
  } finally { await rm(lockDir, { recursive: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration 0005 failed'); process.exitCode = 1; });
