/**
 * Repair an initial development seed using checked-in images and native EmDash APIs.
 * Usage: EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/import-local-media.mjs --apply
 * The authentication file is an actual signed-in Playwright storageState or { cookie } file.
 * No users, tokens, authentication rows or direct database writes are created by this script.
 */
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, join } from 'node:path';
import { createHash } from 'node:crypto';

const origin = new URL(process.env.EMDASH_BASE_URL || 'http://localhost:4321');
assert(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'This initializer is for a local development server only.');
assert(process.env.EMDASH_AUTH_FILE, 'EMDASH_AUTH_FILE must point to a genuine admin session file.');
const rawAuth = await readFile(process.env.EMDASH_AUTH_FILE, 'utf8');
let session;
try { session = JSON.parse(rawAuth); } catch { session = { cookie: rawAuth.trim() }; }
const cookie = session.cookie || session.cookies?.filter((item) => {
  const domain = item.domain?.replace(/^\./, '');
  return (domain === origin.hostname || domain === 'localhost') && (item.expires < 0 || item.expires > Date.now() / 1000);
}).map(({ name, value }) => `${name}=${value}`).join('; ');
assert(cookie, 'Authentication file has no unexpired local session cookie.');
const root = fileURLToPath(new URL('../', import.meta.url));
const seed = JSON.parse(await readFile(join(root, 'seed/seed.json'), 'utf8'));
const apply = process.argv.includes('--apply');
const report = { startedAt: new Date().toISOString(), mode: apply ? 'apply' : 'dry-run', uploaded: [], patched: [], skipped: [] };
const uploaded = new Map();
const readCache = new Map();
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function request(path, options = {}) {
  const response = await fetch(new URL(path, origin), {
    ...options, redirect: 'error', signal: AbortSignal.timeout(60000),
    headers: { Cookie: cookie, Origin: origin.origin, 'X-EmDash-Request': '1', ...options.headers },
  });
  const value = await response.json();
  if (!response.ok || value.success !== true) {
    throw new Error(`${options.method || 'GET'} ${path}: ${response.status} ${value.error?.code || ''} ${value.error?.message || 'EmDash API failed'}`);
  }
  return value.data;
}
const json = (value) => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });
function mediaFields(value, path = []) {
  if (!value || typeof value !== 'object') return [];
  if ('$media' in value) return [{ path, source: value.$media }];
  return Object.entries(value).flatMap(([key, child]) => mediaFields(child, [...path, key]));
}
function valueAt(object, path) { return path.reduce((value, key) => value?.[key], object); }
function writeAt(object, path, value) {
  let cursor = object;
  for (const key of path.slice(0, -1)) cursor = cursor[key] ??= {};
  cursor[path.at(-1)] = value;
}
function sameInitialContent(actual, expected, definitions) {
  return Object.entries(expected).every(([key, value]) => {
    const field = definitions.find((item) => item.slug === key);
    if (field?.type === 'reference' || mediaFields(value).length) return true;
    if (field?.type === 'boolean' && [0, 1].includes(actual[key])) return Boolean(actual[key]) === value;
    if (Array.isArray(value) && value.length === 0 && actual[key] == null) return true;
    if (value === '' && actual[key] == null) return true;
    if (value == null && (actual[key] === '' || actual[key] == null)) return true;
    return JSON.stringify(actual[key]) === JSON.stringify(value);
  });
}
async function fileBytes(filename) {
  assert.equal(basename(filename), filename, 'Seed filenames must be plain basenames');
  if (!readCache.has(filename)) readCache.set(filename, await readFile(join(root, 'public/images', filename)));
  return readCache.get(filename);
}
async function publicImageStatus(value, expectedBytes) {
  const key = value?.meta?.storageKey;
  if (!key) return 'missing';
  const response = await fetch(new URL(`/_emdash/api/media/file/${encodeURIComponent(key)}`, origin), { signal: AbortSignal.timeout(30000) });
  if (!response.ok) return 'missing';
  if (!response.headers.get('content-type')?.startsWith('image/')) return 'different';
  return hash(new Uint8Array(await response.arrayBuffer())) === hash(expectedBytes) ? 'same' : 'different';
}
async function publicBytesMatch(value, expectedBytes) { return await publicImageStatus(value, expectedBytes) === 'same'; }
async function upload(source) {
  if (uploaded.has(source.filename)) return uploaded.get(source.filename);
  const bytes = await fileBytes(source.filename);
  const mimeType = source.filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  const send = async (deduplicate) => {
    const form = new FormData();
    form.set('file', new File([bytes], source.filename, { type: mimeType }));
    form.set('deduplicate', String(deduplicate));
    return request('/_emdash/api/media', { method: 'POST', body: form });
  };
  let result = await send(true);
  let value = makeImageValue(result.item, source);
  // A deduplicated database row may belong to an incomplete local storage copy.
  if (!(await publicBytesMatch(value, bytes)) && result.deduplicated) {
    result = await send(false);
    value = makeImageValue(result.item, source);
  }
  assert(await publicBytesMatch(value, bytes), `Uploaded file cannot be read correctly from R2: ${source.filename}`);
  if (!result.deduplicated) {
    await request(`/_emdash/api/media/${encodeURIComponent(result.item.id)}`, { method: 'PUT', ...json({ alt: source.alt, caption: source.caption }) });
  }
  uploaded.set(source.filename, value);
  report.uploaded.push({ filename: source.filename, id: value.id, deduplicated: !!result.deduplicated });
  return value;
}
function makeImageValue(item, source) {
  return { provider: 'local', id: item.id, filename: item.filename, mimeType: item.mimeType, alt: source.alt, width: item.width, height: item.height, meta: { storageKey: item.storageKey } };
}

try {
  for (const [collection, entries] of Object.entries(seed.content)) {
    const definition = seed.collections.find((item) => item.slug === collection);
    for (const seedEntry of entries) {
      const fields = mediaFields(seedEntry.data);
      if (!fields.length) continue;
      const route = `/_emdash/api/content/${collection}/${encodeURIComponent(seedEntry.slug || seedEntry.id)}`;
      const current = await request(route);
      const item = current.item;
      assert(item?.data, `Missing entry data at ${route}`);
      const pendingDraft = item.draftRevisionId && item.draftRevisionId !== item.liveRevisionId;
      if (pendingDraft || !sameInitialContent(item.data, seedEntry.data, definition.fields)) {
        report.skipped.push({ entry: `${collection}/${seedEntry.slug}`, reason: pendingDraft ? 'unpublished edits' : 'content differs from initial seed' });
        continue;
      }
      const next = structuredClone(item.data);
      // Older first-setup seeds accepted blank URL strings; native edit schemas require null.
      // Normalize only empty optional URL fields while preserving any real editor value.
      for (const field of definition.fields) {
        if (field.type === 'url' && !field.required && next[field.slug] === '') next[field.slug] = null;
        if (field.type === 'boolean' && [0, 1].includes(next[field.slug])) next[field.slug] = Boolean(next[field.slug]);
      }
      const changed = [];
      for (const { path, source } of fields) {
        const existing = valueAt(item.data, path);
        // A different reference is an editor choice, even when that file is unavailable.
        if (existing && existing.filename !== source.filename && existing.src !== source.url && existing.url !== source.url) {
          report.skipped.push({ entry: `${collection}/${seedEntry.slug}`, field: path.join('.'), reason: 'different media reference' });
          continue;
        }
        if (existing) {
          const status = await publicImageStatus(existing, await fileBytes(source.filename));
          if (status === 'same') continue;
          if (status === 'different') {
            report.skipped.push({ entry: `${collection}/${seedEntry.slug}`, field: path.join('.'), reason: 'existing image has different bytes' });
            continue;
          }
        }
        if (apply) {
          const value = await upload(source);
          // Each occurrence keeps its own alternative text, including when media bytes are shared.
          writeAt(next, path, { ...value, alt: source.alt });
        }
        changed.push(path.join('.'));
      }
      if (!changed.length) continue;
      if (apply) {
        await request(route, { method: 'PUT', ...json({ data: next, _rev: current._rev }) });
        if (item.status === 'published') {
          const fresh = await request(route);
          await request(`${route}/publish`, { method: 'POST', ...json({ _rev: fresh._rev }) });
        }
        const saved = await request(route);
        for (const { path, source } of fields.filter(({ path }) => changed.includes(path.join('.')))) {
          assert(await publicBytesMatch(valueAt(saved.item.data, path), await fileBytes(source.filename)), `Published media verification failed for ${collection}/${seedEntry.slug}.${path.join('.')}`);
        }
      }
      report.patched.push({ entry: `${collection}/${seedEntry.slug}`, fields: changed });
      console.log(`${apply ? 'Imported' : 'Would import'} ${collection}/${seedEntry.slug}: ${changed.join(', ')}`);
    }
  }
  report.finishedAt = new Date().toISOString();
  await mkdir(join(root, '.wrangler'), { recursive: true });
  await writeFile(join(root, '.wrangler/media-import-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`${apply ? 'Completed' : 'Dry run'}: ${report.uploaded.length} source images, ${report.patched.length} entries, ${report.skipped.length} preserved edits.`);
} catch (error) {
  // Never print authentication data or headers.
  console.error(error instanceof Error ? error.message : 'Media import failed');
  process.exitCode = 1;
}
