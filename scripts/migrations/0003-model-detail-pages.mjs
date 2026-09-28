/**
 * Migration 0003: official model details, through native EmDash APIs only.
 * Dry run (default): EMDASH_AUTH_FILE=<existing-session.json> node scripts/migrations/0003-model-detail-pages.mjs
 * Or read an existing native CLI login: EMDASH_USE_CLI_AUTH=1 node scripts/migrations/0003-model-detail-pages.mjs
 * Apply locally: add --apply. Never creates credentials or touches setup/seed endpoints.
 * A failed run keeps its private backup, downloaded assets and native media for a safe rerun.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const collectionPath = '/_emdash/api/schema/collections/models';
const contentPath = (slug) => `/_emdash/api/content/models/${encodeURIComponent(slug)}`;
const MAX_ASSET_BYTES = 32 * 1024 * 1024;
const OFFICIAL_HOSTS = new Set(['www.cattelanitalia.com', 'cattelanitalia.com', 'download.cattelanitalia.com']);
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const sub = (slug, label, type = 'string') => ({ slug, label, type });
const repeater = (slug, label, subFields) => ({ slug, label, type: 'repeater', required: false, validation: { subFields } });

export const FIELD_DEFINITIONS = [
  { slug: 'release_year', label: 'Année de création', type: 'integer', required: false },
  { slug: 'content', label: 'Présentation et détails techniques', type: 'portableText', required: false },
  repeater('gallery', 'Galerie du modèle', [sub('image', 'Photographie', 'image'), sub('caption', 'Légende')]),
  repeater('dimensions', 'Dimensions et configurations', [sub('label', 'Configuration'), sub('value', 'Dimensions'), sub('seats', 'Places', 'integer'), sub('large_seats', 'Places avec de grandes chaises', 'integer')]),
  repeater('drawings', 'Dessins techniques', [sub('label', 'Légende'), sub('row', 'Rangée', 'integer'), sub('column', 'Colonne', 'integer'), sub('image', 'Dessin', 'image')]),
  repeater('finishes', 'Matériaux et finitions', [sub('group', 'Élément'), sub('material_group', 'Famille de matériaux'), sub('material', 'Matériau'), sub('name', 'Finition'), sub('code', 'Référence'), sub('image', 'Échantillon', 'image')]),
  { slug: 'technical_sheet', label: 'Fiche technique publique', type: 'file', required: false, validation: { allowedMimeTypes: ['application/pdf'] } },
  { slug: 'technical_sheet_label', label: 'Libellé de la fiche technique', type: 'string', required: false },
  { slug: 'source_url', label: 'Source officielle française', type: 'url', required: false },
  { slug: 'source_verified_at', label: 'Source vérifiée le', type: 'datetime', required: false },
];

export function officialUrl(value) {
  assert.equal(typeof value, 'string', 'Official URLs must be strings.');
  const url = new URL(value);
  assert(url.protocol === 'https:' && OFFICIAL_HOSTS.has(url.hostname) && !url.username && !url.password && !url.port, `Unapproved official source: ${url.origin}`);
  assert(!url.hash, 'Official source URLs must not contain fragments.');
  return url;
}

export function cliAuthentication(store, origin, projectRoot, now = Date.now()) {
  assert(['http:', 'https:'].includes(origin.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'Native CLI credentials are restricted to a local development origin.');
  // EmDash 0.41 keys local credentials by project path, not by port/origin.
  // Match only this checkout; never fall back to another project's or a remote site's token.
  const credential = store?.[`path:${resolve(projectRoot)}`];
  assert(credential && typeof credential === 'object' && !Array.isArray(credential), 'No native CLI login exists for this project. Sign in with emdash login first.');
  assert(typeof credential.accessToken === 'string' && credential.accessToken.length > 0 && !/\s/.test(credential.accessToken), 'Native CLI login has an invalid access token.');
  const expiresAt = Date.parse(credential.expiresAt);
  assert(Number.isFinite(expiresAt) && expiresAt > now, 'Native CLI access token has expired. Renew it with the native CLI before importing; this migration never refreshes credentials.');
  if (credential.url != null) {
    let storedOrigin;
    try { storedOrigin = new URL(credential.url); } catch { throw new Error('Native CLI login contains an invalid local URL.'); }
    assert(storedOrigin.origin === origin.origin && storedOrigin.pathname === '/' && !storedOrigin.search && !storedOrigin.hash && !storedOrigin.username && !storedOrigin.password, 'Native CLI login URL does not match this exact local origin.');
  }
  // Refresh tokens, user details and custom headers are neither sent nor exposed.
  return { headers: { Authorization: `Bearer ${credential.accessToken}` }, expiresAt };
}

async function authentication(origin) {
  assert(!process.env.EMDASH_USE_CLI_AUTH || ['0', '1'].includes(process.env.EMDASH_USE_CLI_AUTH), 'EMDASH_USE_CLI_AUTH must be 0 or 1.');
  const useCli = process.env.EMDASH_USE_CLI_AUTH === '1';
  assert(!(useCli && process.env.EMDASH_AUTH_FILE), 'Choose one authentication source: EMDASH_USE_CLI_AUTH=1 or EMDASH_AUTH_FILE.');
  if (useCli) {
    const path = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'emdash/auth.json');
    let store;
    try { store = JSON.parse(await readFile(path, 'utf8')); } catch { throw new Error('Cannot read a valid native EmDash CLI login. Sign in with emdash login for this project first.'); }
    return cliAuthentication(store, origin, root);
  }
  assert(process.env.EMDASH_AUTH_FILE, 'Set EMDASH_AUTH_FILE to a genuine administrator session, or opt into an existing native CLI login with EMDASH_USE_CLI_AUTH=1.');
  const raw = await readFile(process.env.EMDASH_AUTH_FILE, 'utf8');
  let auth;
  try { auth = JSON.parse(raw); } catch { auth = { cookie: raw.trim() }; }
  const cookie = auth.cookie || auth.cookies?.filter((item) => item.domain?.replace(/^\./, '') === origin.hostname && (item.expires < 0 || item.expires > Date.now() / 1000)).map(({ name, value }) => `${name}=${value}`).join('; ');
  assert(typeof cookie === 'string' && cookie && !/[\r\n]/.test(cookie), 'No valid session cookie for this local host.');
  return { headers: { Cookie: cookie }, expiresAt: Infinity };
}

function validateMedia(value, kind, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 1 && value.$media, `${label} must be a $media reference.`);
  const source = value.$media;
  assert(source && typeof source === 'object' && !Array.isArray(source), `${label} has invalid media metadata.`);
  const allowed = new Set(['url', 'filename', 'alt', 'mimeType', 'sha256']);
  for (const key of Object.keys(source)) assert(allowed.has(key), `${label}: unknown media property ${key}.`);
  officialUrl(source.url);
  assert(typeof source.filename === 'string' && source.filename === basename(source.filename) && /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(source.filename), `${label}: filename must be a safe basename.`);
  if (kind === 'image') assert.equal(typeof source.alt, 'string', `${label}: image alternative text is required (empty is allowed for decorative images).`);
  if (source.mimeType != null) assert(kind === 'file' ? source.mimeType === 'application/pdf' : IMAGE_MIME_TYPES.includes(source.mimeType), `${label}: unsupported media type.`);
  if (source.sha256 != null) assert(/^[a-f0-9]{64}$/.test(source.sha256), `${label}: invalid SHA-256.`);
}

export function validateManifest(manifest) {
  assert(manifest?.version === 1 && /^\d{4}-\d{2}-\d{2}$/.test(manifest.verified_at) && !Number.isNaN(Date.parse(`${manifest.verified_at}T00:00:00.000Z`)), 'Manifest version/date is invalid.');
  assert(Array.isArray(manifest.models) && manifest.models.length > 0 && manifest.models.length <= 100, 'Manifest must contain between 1 and 100 existing models.');
  const slugs = new Set();
  const fieldMap = new Map(FIELD_DEFINITIONS.map((field) => [field.slug, field]));
  for (const model of manifest.models) {
    assert(model && typeof model === 'object' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model.slug), 'Invalid model slug.');
    assert(!slugs.has(model.slug), `Duplicate model slug: ${model.slug}`);
    slugs.add(model.slug);
    for (const [key, value] of Object.entries(model)) {
      if (key === 'slug' || key === 'metadata') continue; // Research provenance is never imported as CMS data.
      if (key === 'image') { if (value != null) validateMedia(value, 'image', `${model.slug}.${key}`); continue; }
      const field = fieldMap.get(key);
      assert(field, `Unknown model field ${model.slug}.${key}.`);
      if (value == null) continue;
      if (field.type === 'file') validateMedia(value, 'file', `${model.slug}.${key}`);
      else if (field.type === 'url') officialUrl(value);
      else if (field.type === 'integer') assert(Number.isInteger(value), `${model.slug}.${key} must be an integer.`);
      else if (field.type === 'datetime') assert(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && !Number.isNaN(Date.parse(value)), `${model.slug}.${key} must be an ISO datetime.`);
      else if (field.type === 'string') assert.equal(typeof value, 'string', `${model.slug}.${key} must be text.`);
      else if (field.type === 'portableText') {
        assert(Array.isArray(value), `${model.slug}.${key} must be Portable Text.`);
        for (const block of value) {
          assert(block?._type === 'block' && Array.isArray(block.children), `${model.slug}.${key}: only text blocks are supported by this importer.`);
          assert(block.children.every((child) => child?._type === 'span' && typeof child.text === 'string'), `${model.slug}.${key}: invalid text span.`);
          for (const mark of block.markDefs || []) if (mark.href) officialUrl(mark.href);
        }
      } else if (field.type === 'repeater') {
        assert(Array.isArray(value) && value.length <= 2000, `${model.slug}.${key} must be a bounded list.`);
        const subFields = new Map(field.validation.subFields.map((entry) => [entry.slug, entry]));
        for (const [index, row] of value.entries()) {
          assert(row && typeof row === 'object' && !Array.isArray(row), `${model.slug}.${key}[${index}] is invalid.`);
          for (const [name, child] of Object.entries(row)) {
            // Full-resolution source links document provenance; only locally imported images are editorial fields.
            if ((key === 'gallery' || key === 'finishes') && ['original_url', 'zoom_url'].includes(name)) { if (child) officialUrl(child); continue; }
            const definition = subFields.get(name);
            assert(definition, `Unknown field ${model.slug}.${key}[${index}].${name}.`);
            if (child == null) continue;
            const label = `${model.slug}.${key}[${index}].${name}`;
            if (definition.type === 'image') validateMedia(child, 'image', label);
            else if (definition.type === 'url') { if (child !== '') officialUrl(child); }
            else if (definition.type === 'integer') assert(Number.isInteger(child), `${label} must be an integer.`);
            else assert.equal(typeof child, 'string', `${label} must be text.`);
          }
        }
      }
    }
    assert(model.source_url, `${model.slug}: verified source_url is required.`);
  }
  return manifest;
}

export function assertNoDraft(item) {
  assert(item?.data && item.slug, 'Native API returned no model data.');
  assert(!item.draftRevisionId || item.draftRevisionId === item.liveRevisionId, `${item.slug} has unpublished edits. Publish or discard them in EmDash before importing.`);
  assert(['published', 'draft'].includes(item.status), `${item.slug} has unsupported publication status ${item.status}.`);
}

export function isEmpty(value) {
  return value == null || (typeof value === 'string' && value.trim() === '') || (Array.isArray(value) && value.length === 0);
}

export function planValues(data, model, verifiedAt) {
  // This marker is written in the same native revision as the imported values.
  // Once enriched, a deliberately cleared editorial field must stay cleared on reruns.
  if (!isEmpty(data.source_verified_at)) return {};
  const values = {};
  for (const key of ['image', ...FIELD_DEFINITIONS.map((field) => field.slug)]) {
    const value = key === 'source_verified_at' ? (model[key] || `${verifiedAt}T00:00:00.000Z`) : key === 'image' ? (model.image || model.gallery?.[0]?.image) : model[key];
    // Arrays are editorial units: never merge into an existing gallery/material list.
    if (isEmpty(data[key]) && !isEmpty(value)) values[key] = structuredClone(value);
  }
  for (const key of ['gallery', 'finishes']) for (const row of values[key] || []) {
    delete row.original_url;
    delete row.zoom_url;
  }
  return values;
}

export function assertCompatibleSchema(schema) {
  assert(Array.isArray(schema?.fields), 'Models schema omitted its fields.');
  assert(schema.fields.find((field) => field.slug === 'image')?.type === 'image', 'Existing models.image is not a native image field.');
  assert(['/collections/', '/modeles/{slug}/'].includes(schema.urlPattern), 'Models already uses a custom URL pattern; refusing to replace it.');
  for (const definition of FIELD_DEFINITIONS) {
    const existing = schema.fields.find((field) => field.slug === definition.slug);
    if (!existing) continue;
    assert.equal(existing.type, definition.type, `Existing ${definition.slug} has another field type.`);
    assert(!existing.required, `Existing ${definition.slug} is required; refusing to alter its contract.`);
    if (definition.type === 'repeater') {
      const wanted = definition.validation.subFields.map(({ slug, type }) => ({ slug, type }));
      const actual = existing.validation?.subFields?.map(({ slug, type, required }) => ({ slug, type, ...(required ? { required } : {}) }));
      assert.deepEqual(actual, wanted, `Existing ${definition.slug} has a different repeater structure.`);
    }
  }
}

export function mediaLeaves(value, path = []) {
  if (!value || typeof value !== 'object') return [];
  if ('$media' in value) return [{ path, source: value.$media, kind: path[0] === 'technical_sheet' ? 'file' : 'image' }];
  return Object.entries(value).flatMap(([key, child]) => mediaLeaves(child, [...path, key]));
}

function normalizeData(value, fields) {
  const data = structuredClone(value);
  for (const field of fields) {
    if (field.type === 'reference' && field.validation?.relation) delete data[field.slug];
    if (field.type === 'url' && !field.required && data[field.slug] === '') data[field.slug] = null;
    if (field.type === 'boolean' && [0, 1].includes(data[field.slug])) data[field.slug] = Boolean(data[field.slug]);
    // Native 0.41 normalizes file references through MediaValue, which drops top-level size.
    // Keep this byte count in provider metadata so an existing/editor-supplied size survives.
    const file = data[field.slug];
    if (field.type === 'file' && file && typeof file === 'object' && typeof file.size === 'number') {
      if (file.meta?.size != null) assert.equal(file.meta.size, file.size, `Conflicting file sizes for ${field.slug}.`);
      file.meta = { ...file.meta, size: file.size };
      delete file.size;
    }
  }
  return data;
}

function comparisonValue(actual, expected) {
  if (Array.isArray(actual)) return actual.map((value, index) => comparisonValue(value, expected?.[index]));
  if (!actual || typeof actual !== 'object' || !expected || typeof expected !== 'object') return actual;
  const result = { ...actual };
  const nativeMedia = typeof expected.id === 'string' && expected.id && (expected.provider === 'local' || expected.meta?.storageKey);
  if (nativeMedia) {
    // Provider-computed additions are facts of the same verified bytes. Existing values still win.
    for (const key of ['blurhash', 'dominantColor']) {
      if (!(key in expected) && (result[key] == null || typeof result[key] === 'string')) delete result[key];
    }
    if (result.meta && typeof result.meta === 'object') {
      result.meta = { ...result.meta };
      for (const key of ['caption', 'blurhash', 'dominantColor']) {
        if (!(key in (expected.meta || {})) && (result.meta[key] == null || typeof result.meta[key] === 'string')) delete result.meta[key];
      }
    }
  }
  for (const [key, value] of Object.entries(result)) result[key] = comparisonValue(value, expected[key]);
  return result;
}

export function assertContentValue(actual, expected, message) {
  // All text, ordering, dimensions, file sizes, media IDs, storage keys, alt, focal points,
  // filenames and existing metadata remain strict. Only known new provider metadata is ignored.
  assert.deepEqual(comparisonValue(actual, expected), expected, message);
}

function setAt(value, path, replacement) {
  const target = path.slice(0, -1).reduce((current, key) => current[key], value);
  target[path.at(-1)] = replacement;
}

export function detectedMime(bytes) {
  if (bytes.subarray(0, 5).toString() === '%PDF-') return 'application/pdf';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (/^GIF8[79]a$/.test(bytes.subarray(0, 6).toString())) return 'image/gif';
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  if (bytes.subarray(4, 8).toString() === 'ftyp' && /avif|avis/.test(bytes.subarray(8, 40).toString())) return 'image/avif';
  throw new Error('Official download is not a supported raster image or PDF (HTML/SVG are never imported).');
}

async function boundedBytes(response) {
  const declared = Number(response.headers.get('content-length'));
  assert(!declared || declared <= MAX_ASSET_BYTES, 'Official asset exceeds the 32 MiB import limit.');
  assert(response.body, 'Download has no response body.');
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.length;
    assert(size <= MAX_ASSET_BYTES, 'Official asset exceeds the 32 MiB import limit.');
    chunks.push(Buffer.from(chunk));
  }
  assert(size > 0, 'Official asset is empty.');
  return Buffer.concat(chunks);
}

async function downloadOnce(url) {
  let current = officialUrl(url);
  for (let redirects = 0; redirects <= 5; redirects++) {
    const response = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(90000), headers: { Accept: 'image/*,application/pdf' } });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      assert(response.headers.get('location'), 'Official redirect has no destination.');
      current = officialUrl(new URL(response.headers.get('location'), current).href);
      await response.body?.cancel();
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw Object.assign(new Error(`Official asset returned HTTP ${response.status}: ${current.href}`), { retryable: [408, 429, 500, 502, 503, 504].includes(response.status) });
    }
    const bytes = await boundedBytes(response);
    return { bytes, mimeType: detectedMime(bytes), finalUrl: current.href, sha256: hash(bytes) };
  }
  throw new Error('Official asset exceeded five redirects.');
}

async function download(url) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await downloadOnce(url); } catch (error) {
      const transient = error.retryable || error.name === 'TimeoutError' || error.name === 'TypeError';
      if (!transient || attempt === 3) throw error;
      // Official image/PDF services sometimes throttle bursts. Retry transient failures only.
      await new Promise((done) => setTimeout(done, [2000, 5000, 10000][attempt]));
    }
  }
}

async function pool(values, concurrency, action) {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (index < values.length) await action(values[index++]);
  });
  // Do not release the run lock while other workers are still writing their private cache.
  const settled = await Promise.allSettled(workers);
  const failed = settled.find((result) => result.status === 'rejected');
  if (failed) throw failed.reason;
}

async function privateJson(path, value) {
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, path);
}

function mediaValue(item, source, kind) {
  assert(item?.id && item.storageKey, 'Native media response lacks its ID/storage key.');
  return {
    provider: 'local', id: item.id, filename: item.filename, mimeType: item.mimeType,
    ...(kind === 'image' ? { alt: source.alt, ...(item.width ? { width: item.width } : {}), ...(item.height ? { height: item.height } : {}) } : {}),
    meta: { storageKey: item.storageKey, ...(kind === 'file' ? { size: item.size } : {}) },
  };
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every((flag) => ['--apply', '--dry-run'].includes(flag)) && !(flags.includes('--apply') && flags.includes('--dry-run')), 'Use --dry-run (default) or --apply only.');
  const apply = flags.includes('--apply');
  const origin = new URL(process.env.EMDASH_BASE_URL || 'http://localhost:4321');
  assert(['http:', 'https:'].includes(origin.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash, 'This migration accepts only a local development origin.');
  const auth = await authentication(origin);
  const manifest = validateManifest(JSON.parse(await readFile(join(root, 'content/model-details.json'), 'utf8')));
  const api = async (path, { method = 'GET', data, form } = {}) => {
    assert(path.startsWith('/_emdash/api/'), 'Native API path is invalid.');
    assert(auth.expiresAt > Date.now(), 'Native CLI access token expired during the import. Renew it with the native CLI before rerunning; no automatic refresh was attempted.');
    const response = await fetch(new URL(path, origin), {
      method, redirect: 'error', signal: AbortSignal.timeout(90000),
      headers: { ...auth.headers, Origin: origin.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(data === undefined ? (form ? { body: form } : {}) : { body: JSON.stringify(data) }),
    });
    let body;
    try { body = await response.json(); } catch { throw new Error(`${method} ${path}: HTTP ${response.status}; expected the authenticated EmDash JSON API.`); }
    assert(response.ok && body.success === true, `${method} ${path}: HTTP ${response.status} ${body.error?.code || ''} ${body.error?.message || 'API failure'}`);
    return body.data;
  };

  const schema = (await api(`${collectionPath}?includeFields=true`)).item;
  assertCompatibleSchema(schema);
  const plans = [];
  for (const model of manifest.models) {
    const before = await api(contentPath(model.slug));
    assertNoDraft(before.item);
    assert(before._rev && before.item.slug === model.slug, `Cannot safely identify/revise model ${model.slug}.`);
    plans.push({ model, before, values: planValues(before.item.data, model, manifest.verified_at) });
  }
  const missingFields = FIELD_DEFINITIONS.filter((field) => !schema.fields.some((existing) => existing.slug === field.slug));
  const routeChanged = schema.routable !== true || schema.urlPattern !== '/modeles/{slug}/';
  const assets = new Map();
  for (const plan of plans) for (const leaf of mediaLeaves(plan.values)) {
    const existing = assets.get(leaf.source.url);
    assert(!existing || (existing.kind === leaf.kind && (!existing.source.sha256 || !leaf.source.sha256 || existing.source.sha256 === leaf.source.sha256)), `Conflicting media declarations: ${leaf.source.url}`);
    if (!existing) assets.set(leaf.source.url, leaf);
    else if (leaf.source.sha256 && !existing.source.sha256) existing.source.sha256 = leaf.source.sha256;
  }
  console.log(`${apply ? 'Apply' : 'Dry run'} 0003: ${missingFields.length} new fields; ${routeChanged ? 'enable' : 'keep'} /modeles/{slug}/; ${plans.filter((plan) => Object.keys(plan.values).length).length} models to enrich; ${assets.size} unique official assets.`);
  for (const plan of plans) console.log(`${plan.model.slug}: ${Object.keys(plan.values).join(', ') || 'already populated; preserve all values'}`);
  if (!apply) { console.log('No CMS, media, authentication or local state was written. Re-run with --apply after reviewing this plan.'); return; }
  if (!missingFields.length && !routeChanged && plans.every((plan) => !Object.keys(plan.values).length)) { console.log('Migration 0003 already applied; nothing was changed.'); return; }

  const privateDir = join(root, '.wrangler/migrations');
  const cacheDir = join(privateDir, '0003-model-detail-assets');
  const lockDir = join(privateDir, '.0003-model-detail-pages.lock');
  await mkdir(privateDir, { recursive: true, mode: 0o700 });
  try { await mkdir(lockDir, { mode: 0o700 }); } catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Another 0003 import may be active. If it has stopped, remove only its lock directory: ${lockDir}`);
    throw error;
  }
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
  const reportPath = join(privateDir, `0003-model-detail-pages-${stamp}-report.json`);
  const report = { migration: '0003-model-detail-pages', startedAt: new Date().toISOString(), manifestSha256: hash(JSON.stringify(manifest)), fieldsCreated: [], media: [], models: [], complete: false };
  try {
    await mkdir(cacheDir, { recursive: true, mode: 0o700 });
    const backupPath = join(privateDir, `0003-model-detail-pages-${stamp}-backup.json`);
    await privateJson(backupPath, { migration: report.migration, createdAt: report.startedAt, schema, models: plans.map(({ before }) => before) });
    console.log(`Private affected-model/schema backup: ${backupPath}`);
    const staged = new Map();
    let downloaded = 0;
    await pool([...assets.values()], 4, async (leaf) => {
      const key = hash(leaf.source.url);
      const bytesPath = join(cacheDir, `${key}.bin`);
      const metaPath = join(cacheDir, `${key}.json`);
      let asset;
      try {
        const meta = JSON.parse(await readFile(metaPath, 'utf8'));
        const bytes = await readFile(bytesPath);
        if (meta.url === leaf.source.url && hash(bytes) === meta.sha256 && bytes.length <= MAX_ASSET_BYTES) asset = { ...meta, bytes, mimeType: detectedMime(bytes) };
      } catch (error) { if (error.code !== 'ENOENT') console.log(`Revalidating cached official asset: ${leaf.source.filename}`); }
      if (!asset) {
        asset = await download(leaf.source.url);
        await writeFile(bytesPath, asset.bytes, { mode: 0o600 });
        await privateJson(metaPath, { url: leaf.source.url, finalUrl: asset.finalUrl, sha256: asset.sha256, mimeType: asset.mimeType });
      }
      assert(leaf.kind === 'file' ? asset.mimeType === 'application/pdf' : IMAGE_MIME_TYPES.includes(asset.mimeType), `Incorrect official asset type: ${leaf.source.filename}`);
      assert(!leaf.source.mimeType || leaf.source.mimeType === asset.mimeType, `Declared media type differs from downloaded bytes: ${leaf.source.filename}`);
      assert(!leaf.source.sha256 || leaf.source.sha256 === asset.sha256, `Official asset hash changed: ${leaf.source.filename}`);
      staged.set(leaf.source.url, { ...asset, size: asset.bytes.length, bytes: undefined, bytesPath });
      downloaded++;
      if (downloaded % 25 === 0 || downloaded === assets.size) console.log(`Verified official downloads: ${downloaded}/${assets.size}`);
    });

    // Downloads can take time. Check every revision again before the first CMS write.
    const currentSchema = (await api(`${collectionPath}?includeFields=true`)).item;
    assert.deepEqual(currentSchema, schema, 'Models schema changed during preparation; nothing imported.');
    for (const plan of plans) {
      const fresh = await api(contentPath(plan.model.slug));
      assertNoDraft(fresh.item);
      assert.equal(fresh._rev, plan.before._rev, `${plan.model.slug} changed during preparation; nothing imported.`);
    }
    for (const field of missingFields) {
      await api(`${collectionPath}/fields`, { method: 'POST', data: field });
      report.fieldsCreated.push(field.slug);
      await privateJson(reportPath, report);
    }
    if (routeChanged) await api(collectionPath, { method: 'PUT', data: { routable: true, urlPattern: '/modeles/{slug}/' } });
    const finalSchema = (await api(`${collectionPath}?includeFields=true`)).item;
    assertCompatibleSchema(finalSchema);
    assert(finalSchema.routable === true && finalSchema.urlPattern === '/modeles/{slug}/', 'Model route configuration was not saved.');

    const uploaded = new Map();
    const verifiedMedia = new Set();
    const publicMatches = async (item, digest) => {
      const key = `${item.id}:${digest}`;
      if (verifiedMedia.has(key)) return true;
      const response = await fetch(new URL(`/_emdash/api/media/file/${encodeURIComponent(item.storageKey)}`, origin), { redirect: 'error', signal: AbortSignal.timeout(90000) });
      assert(response.ok, `Native media is unavailable: ${item.id}`);
      assert.equal(hash(await boundedBytes(response)), digest, `Native media bytes differ: ${item.id}`);
      verifiedMedia.add(key);
      return true;
    };
    // Sequential native uploads limit workerd memory; official downloads above use four workers.
    for (const [url, leaf] of assets) {
      const asset = staged.get(url);
      let item = uploaded.get(asset.sha256);
      let deduplicated = true;
      if (!item) {
        const form = new FormData();
        form.set('file', new File([await readFile(asset.bytesPath)], leaf.source.filename, { type: asset.mimeType }));
        form.set('deduplicate', 'true');
        form.set('ensureUniqueFilename', 'true');
        const result = await api('/_emdash/api/media', { method: 'POST', form });
        item = result.item;
        deduplicated = Boolean(result.deduplicated);
        assert(item?.storageKey, 'Native media upload did not return a storage key.');
        assert.equal(item.size, asset.size, `Native media byte count differs: ${leaf.source.filename}`);
        // Do not replace an existing media record or its metadata if deduplication reuses it.
        await publicMatches(item, asset.sha256);
        uploaded.set(asset.sha256, item);
      }
      asset.item = item;
      report.media.push({ url, sha256: asset.sha256, id: item.id, deduplicated });
      await privateJson(reportPath, report);
      if (report.media.length % 25 === 0 || report.media.length === assets.size) console.log(`Verified native media: ${report.media.length}/${assets.size}`);
    }

    for (const plan of plans) {
      if (!Object.keys(plan.values).length) continue;
      const fresh = await api(contentPath(plan.model.slug));
      assertNoDraft(fresh.item);
      assert.equal(fresh._rev, plan.before._rev, `${plan.model.slug} changed concurrently; preserved its current contents.`);
      const values = structuredClone(plan.values);
      for (const leaf of mediaLeaves(values)) setAt(values, leaf.path, mediaValue(staged.get(leaf.source.url).item, leaf.source, leaf.kind));
      const originalData = normalizeData(fresh.item.data, finalSchema.fields);
      const next = { ...originalData, ...values };
      const saved = await api(contentPath(plan.model.slug), { method: 'PUT', data: { data: next, _rev: fresh._rev } });
      assert(saved._rev, 'Native save omitted its revision; the model was not published.');
      if (fresh.item.status === 'published') await api(`${contentPath(plan.model.slug)}/publish`, { method: 'POST', data: { _rev: saved._rev } });
      const after = await api(contentPath(plan.model.slug));
      assertNoDraft(after.item);
      assert.equal(after.item.status, fresh.item.status, `${plan.model.slug}: publication status changed.`);
      const afterData = normalizeData(after.item.data, finalSchema.fields);
      for (const [key, value] of Object.entries(originalData)) {
        if (key in values || (value == null && afterData[key] == null)) continue;
        assertContentValue(afterData[key], value, `${plan.model.slug}: unexpected change to preserved ${key}.`);
      }
      for (const [key, value] of Object.entries(values)) assertContentValue(afterData[key], value, `${plan.model.slug}: imported ${key} differs from its verified value.`);
      report.models.push({ slug: plan.model.slug, status: after.item.status, fields: Object.keys(values), revision: after._rev });
      await privateJson(reportPath, report);
      console.log(`Enriched ${plan.model.slug}; preserved its original copy, media choices and ${after.item.status} status.`);
    }
    report.complete = true;
    report.finishedAt = new Date().toISOString();
    await privateJson(reportPath, report);
    console.log(`Migration 0003 complete. Private report: ${reportPath}`);
  } catch (error) {
    report.failedAt = new Date().toISOString();
    report.error = error instanceof Error ? error.message : 'Migration failed';
    await privateJson(reportPath, report);
    console.error(`Import stopped without deleting or rolling back CMS data. Review the private backup/report, resolve any pending draft, then re-run: ${reportPath}`);
    throw error;
  } finally {
    await rm(lockDir, { recursive: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : 'Migration 0003 failed'); process.exitCode = 1; });
}
