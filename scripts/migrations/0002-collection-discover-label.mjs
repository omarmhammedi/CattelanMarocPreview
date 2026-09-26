/**
 * Migration 0002 — separate the family-card action from the Journal action.
 * EMDASH_BASE_URL=http://localhost:4321 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0002-collection-discover-label.mjs --apply
 * Uses an existing administrator session and native schema/content APIs only.
 */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = new URL(process.env.EMDASH_BASE_URL || 'http://localhost:4321');
assert(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'This migration is restricted to local development.');
assert(process.env.EMDASH_AUTH_FILE, 'EMDASH_AUTH_FILE must contain a genuine administrator session.');
const raw = await readFile(process.env.EMDASH_AUTH_FILE, 'utf8');
let auth;
try { auth = JSON.parse(raw); } catch { auth = { cookie: raw.trim() }; }
const cookie = auth.cookie || auth.cookies?.filter((item) => item.domain?.replace(/^\./, '') === origin.hostname && (item.expires < 0 || item.expires > Date.now() / 1000)).map(({ name, value }) => `${name}=${value}`).join('; ');
assert(cookie, 'No valid authenticated cookie for this local host.');
const apply = process.argv.includes('--apply');
const collectionPath = '/_emdash/api/schema/collections/site_content';
const fieldPath = `${collectionPath}/fields/discover_label`;
const contentPath = '/_emdash/api/content/site_content/global';
const definition = { slug: 'discover_label', label: 'Bouton découvrir une collection', type: 'string', required: true, defaultValue: 'Découvrir' };
async function api(path, { method = 'GET', data, allowMissing = false } = {}) {
  const response = await fetch(new URL(path, origin), {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Cookie: cookie, Origin: origin.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = await response.json();
  if (allowMissing && response.status === 404) return null;
  if (!response.ok || body.success !== true) throw new Error(`${method} ${path}: ${response.status} ${body.error?.code || ''} ${body.error?.message || 'API error'}`);
  return body.data;
}
function assertNoDraft(item) {
  assert(!item.draftRevisionId || item.draftRevisionId === item.liveRevisionId, 'Global content has unpublished changes. Publish or discard them in EmDash before applying this migration.');
}
function normalize(value, fields) {
  const data = structuredClone(value);
  for (const field of fields) {
    if (field.type === 'reference' && field.validation?.relation) delete data[field.slug];
    if (field.type === 'url' && !field.required && data[field.slug] === '') data[field.slug] = null;
    if (field.type === 'boolean' && [0, 1].includes(data[field.slug])) data[field.slug] = Boolean(data[field.slug]);
  }
  return data;
}
try {
  const beforeField = await api(fieldPath, { allowMissing: true });
  if (beforeField) {
    assert.equal(beforeField.item.type, 'string', 'An existing discover_label has another type; nothing was changed.');
    assert.equal(beforeField.item.required, true, 'An existing discover_label was configured differently; nothing was changed.');
  }
  const before = await api(contentPath);
  assertNoDraft(before.item);
  const existingLabel = before.item.data.discover_label;
  if (beforeField && typeof existingLabel === 'string' && existingLabel.trim()) {
    console.log('Migration 0002 already applied: existing collection action label preserved.');
    process.exit(0);
  }
  if (!apply) {
    console.log(`Migration 0002 ready: ${beforeField ? 'keep' : 'create'} the required discover_label field and initialize the missing global label to Découvrir.`);
    process.exit(0);
  }
  await mkdir(join(root, '.wrangler/migrations'), { recursive: true });
  // Snapshot only the affected field. No other site values or session data are logged.
  await writeFile(join(root, '.wrangler/migrations', `0002-collection-discover-label-${Date.now()}.json`), `${JSON.stringify({ migration: '0002-collection-discover-label', createdAt: new Date().toISOString(), previousField: beforeField?.item ?? null, previousValue: existingLabel ?? null }, null, 2)}\n`, { mode: 0o600 });
  if (!beforeField) await api(`${collectionPath}/fields`, { method: 'POST', data: definition });
  const field = await api(fieldPath);
  assert.equal(field.item.type, 'string');
  assert.equal(field.item.required, true);
  const schema = await api(`${collectionPath}?includeFields=true`);
  const fresh = await api(contentPath);
  assertNoDraft(fresh.item);
  const originalData = normalize(fresh.item.data, schema.item.fields);
  // Preserve an editor value that appeared since preflight; never replace it.
  const label = typeof originalData.discover_label === 'string' && originalData.discover_label.trim() ? originalData.discover_label : 'Découvrir';
  const next = { ...originalData, discover_label: label };
  const saved = await api(contentPath, { method: 'PUT', data: { data: next, _rev: fresh._rev } });
  assert(saved._rev, 'Native update did not return the revision required for safe publication.');
  if (fresh.item.status === 'published') {
    // Publish exactly our saved revision; a concurrent editor save must fail the _rev check.
    await api(`${contentPath}/publish`, { method: 'POST', data: { _rev: saved._rev } });
  }
  const after = await api(contentPath);
  const afterData = normalize(after.item.data, schema.item.fields);
  assert.equal(afterData.discover_label, label);
  for (const key of Object.keys(originalData)) {
    if (key === 'discover_label') continue;
    if (originalData[key] == null && afterData[key] == null) continue;
    assert.deepEqual(afterData[key], originalData[key], `Unexpected change to another global field: ${key}`);
  }
  console.log('Migration 0002 complete: collection action label initialized; all other global content preserved.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Migration 0002 failed');
  process.exitCode = 1;
}
