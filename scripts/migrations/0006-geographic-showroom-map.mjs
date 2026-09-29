/**
 * Migration 0006: the real showroom pin and a geographically accurate map caption.
 * Dry run by default. Existing native session, local API, private before/after backups.
 * Never seeds, creates credentials, changes map links, or writes SQL.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertNoDraft, authentication } from './0003-model-detail-pages.mjs';
import { readReferences } from './0004-collection-editorial.mjs';
import { applyShowroomLocation, assertShowroomSchema } from './0005-showroom-location.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const contentPath = '/_emdash/api/content/site_content/global';
const schemaPath = '/_emdash/api/schema/collections/site_content?includeFields=true';
const coordinateHelp = 'Coordonnée du repère réel du showroom en degrés décimaux. Vider une coordonnée masque le repère.';
export const FIELD_DEFINITIONS = [
  { slug: 'showroom_latitude', label: 'Latitude du showroom', type: 'number', required: false, validation: { min: -90, max: 90 }, options: { helpText: coordinateHelp } },
  { slug: 'showroom_longitude', label: 'Longitude du showroom', type: 'number', required: false, validation: { min: -180, max: 180 }, options: { helpText: coordinateHelp } },
];
const fieldNames = [...FIELD_DEFINITIONS.map(field => field.slug), 'map_note'];

function exactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object.`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label}: unexpected or missing keys.`);
}

export function validateGeographicManifest(manifest) {
  exactKeys(manifest, ['version', 'source', 'before', 'after'], 'Geographic showroom manifest');
  assert.equal(manifest.version, 1, 'Unknown geographic manifest version.');
  exactKeys(manifest.source, ['place_id', 'coordinate_role', 'embed_url'], 'Coordinate source');
  assert.equal(manifest.source.place_id, 'ChIJnXzIEVjTpw0RXul0XQgeEHw', 'Coordinates must identify the approved showroom place.');
  assert.equal(manifest.source.coordinate_role, 'Google Maps place pin, not the embed viewport center');
  const source = new URL(manifest.source.embed_url);
  assert(source.protocol === 'https:' && source.host === 'www.google.com' && source.pathname === '/maps/embed' && !source.username && !source.password && !source.hash && [...source.searchParams.keys()].join() === 'pb' && source.searchParams.get('pb')?.includes('0xda7d35811c87c9d:0x7c101e085d74e95e'), 'Expected the owner-provided Google embed source.');
  for (const phase of ['before', 'after']) exactKeys(manifest[phase], fieldNames, `Geographic ${phase}`);
  assert.deepEqual(manifest.before, { showroom_latitude: null, showroom_longitude: null, map_note: 'Plan illustratif de Casablanca. Ouvrez l’itinéraire pour rejoindre le showroom.' }, 'Only the completed 0005 map caption and missing coordinates may be initialized.');
  assert.deepEqual(manifest.after, { showroom_latitude: 33.5927007, showroom_longitude: -7.6426741, map_note: 'Retrouvez le showroom à Casablanca. Ouvrez l’itinéraire pour préparer votre visite.' }, 'Use the verified geographic place pin, never the embed viewport center or an invented coordinate.');
  return manifest;
}

export function assertGeographicSchema(schema, requireCoordinates = false) {
  assertShowroomSchema(schema, 'site_content');
  assert.equal(schema.fields.find(field => field.slug === 'map_note')?.type, 'text', 'Apply 0005 first; the native map caption is missing.');
  for (const definition of FIELD_DEFINITIONS) {
    const field = schema.fields.find(field => field.slug === definition.slug);
    if (!field && !requireCoordinates) continue;
    assert.equal(field?.type, 'number', `${definition.slug}: existing coordinate must use a native number field.`);
    assert(!field.required && field.defaultValue == null, `${definition.slug}: retain an optional coordinate without an implicit default.`);
    assert.deepEqual(field.validation, definition.validation, `${definition.slug}: preserve incompatible coordinate validation for review.`);
  }
}

export function planGeographicValues(response, manifest) {
  assertNoDraft(response?.item);
  assert(response.item.status === 'published' && response.item.type === 'site_content' && response.item.slug === 'global' && response.item.id && typeof response._rev === 'string' && response._rev, 'Expected the published native global entry and revision.');
  // Native missing optional values are absent or null; never coerce strings or
  // silently repair a partially cleared/newly edited coordinate pair.
  const current = Object.fromEntries(fieldNames.map(key => [key, response.item.data[key] ?? null]));
  if (isDeepStrictEqual(current, manifest.after)) return {};
  assert(isDeepStrictEqual(current, manifest.before), 'Map caption/coordinates differ from the exact 0005 baseline or completed 0006 state. Preserve the editor change/clear; no overwrite was attempted.');
  return structuredClone(manifest.after);
}

export async function prepareGeographicShowroom(api, manifest) {
  validateGeographicManifest(manifest);
  const schema = (await api(schemaPath)).item;
  assertGeographicSchema(schema);
  const before = await api(contentPath);
  const values = planGeographicValues(before, manifest);
  return {
    schemas: { site_content: schema },
    entries: [{ collection: 'site_content', slug: 'global', before, values, references: await readReferences(api, 'site_content', before.item, schema.fields) }],
    fields: FIELD_DEFINITIONS.filter(definition => !schema.fields.some(field => field.slug === definition.slug)),
  };
}

export async function applyGeographicShowroom(api, plan, hooks) {
  // The tested 0005 engine performs all preflight checks, backup-before-mutation,
  // native schema additions, partial data writes and revision-guarded publication.
  const checkedApi = async (path, options) => {
    const value = await api(path, options);
    if (path === schemaPath) assertGeographicSchema(value.item);
    return value;
  };
  const result = await applyShowroomLocation(checkedApi, plan, hooks);
  assertGeographicSchema(result.schemas.site_content, true);
  return result;
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
  const manifest = validateGeographicManifest(JSON.parse(await readFile(join(root, 'content/showroom-geography.json'), 'utf8')));
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
  const plan = await prepareGeographicShowroom(api, manifest);
  const changed = Object.keys(plan.entries[0].values);
  console.log(`${apply ? 'Apply' : 'Dry run'} 0006: ${plan.fields.length} optional numeric fields; ${changed.length ? changed.join(', ') : 'global content already completed; unchanged'}.`);
  if (!apply) { console.log('No CMS, media, authentication or local state was written.'); return; }
  if (!changed.length && !plan.fields.length) { console.log('Migration 0006 already applied; no changes.'); return; }
  const privateDir = join(root, '.wrangler/migrations');
  const lockDir = join(privateDir, '.0006-geographic-showroom-map.lock');
  await mkdir(privateDir, { recursive: true, mode: 0o700 });
  try { await mkdir(lockDir, { mode: 0o700 }); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another 0006 migration may be active; inspect before removing its lock: ${lockDir}`);
    throw error;
  }
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const prefix = join(privateDir, `0006-geographic-showroom-map-${stamp}`);
  const report = { migration: '0006-geographic-showroom-map', startedAt: new Date().toISOString(), manifestSha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'), entries: [], complete: false };
  try {
    const result = await applyGeographicShowroom(api, plan, {
      beforeWrite: snapshot => privateJson(`${prefix}-before.json`, { migration: report.migration, createdAt: report.startedAt, ...snapshot }),
      afterEntry: async entry => { report.entries.push(entry); await privateJson(`${prefix}-after.json`, report); },
    });
    Object.assign(report, { complete: true, finishedAt: new Date().toISOString(), addedFields: result.addedFields, schemas: result.schemas });
    await privateJson(`${prefix}-after.json`, report);
    console.log(`Migration 0006 complete. Private before/after backup prefix: ${prefix}`);
  } catch (error) {
    Object.assign(report, { failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'Migration failed' });
    await privateJson(`${prefix}-after.json`, report);
    console.error(`Stopped without deleting or rolling back content. Review the private before/after backup and any pending draft: ${prefix}`);
    throw error;
  } finally { await rm(lockDir, { recursive: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration 0006 failed'); process.exitCode = 1; });
