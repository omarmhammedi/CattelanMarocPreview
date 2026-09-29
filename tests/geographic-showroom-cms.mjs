/**
 * Native migration and geographic marker publication tests, disposable state only.
 * Initialize a fresh marked copy with cms-sync.mjs --setup --setup-only and apply
 * migration 0005 there first. This suite reuses that genuine native session.
 * CMS_TEST_URL=http://localhost:4331 node tests/geographic-showroom-cms.mjs [--migration-only]
 * Temporary coordinate edits are restored in finally; migration 0006 stays applied.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { integrationEnvironment } from './integration-environment.mjs';
import { assertPreservedEntry, readReferences } from '../scripts/migrations/0004-collection-editorial.mjs';
import { assertGeographicSchema, validateGeographicManifest } from '../scripts/migrations/0006-geographic-showroom-map.mjs';

const base = await integrationEnvironment();
assert(process.argv.slice(2).every(flag => flag === '--migration-only'), 'Only --migration-only is supported.');
const migrationOnly = process.argv.includes('--migration-only');
const execFileAsync = promisify(execFile);
const sessionFile = resolve('.wrangler/cms-sync-session.json');
const session = JSON.parse(await readFile(sessionFile, 'utf8'));
const cookie = session.cookies?.filter(item => item.domain?.replace(/^\./, '') === base.hostname && (item.expires < 0 || item.expires > Date.now() / 1000)).map(({ name, value }) => `${name}=${value}`).join('; ');
assert(cookie, 'The isolated setup-only environment must already contain its genuine native administrator session.');
const manifest = validateGeographicManifest(JSON.parse(await readFile('content/showroom-geography.json', 'utf8')));
const contentPath = '/_emdash/api/content/site_content/global';
const schemaPath = '/_emdash/api/schema/collections/site_content?includeFields=true';
const results = [];
const record = message => { results.push(message); console.log(`PASS ${message}`); };
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");

async function api(path, { method = 'GET', data } = {}) {
  assert(path.startsWith('/_emdash/api/'), 'Only native local API paths are accepted.');
  const response = await fetch(new URL(path, base), {
    method, redirect: 'error', signal: AbortSignal.timeout(60000),
    headers: { Cookie: cookie, Origin: base.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  let body;
  try { body = await response.json(); } catch { throw new Error(`${method} ${path.split('?')[0]}: HTTP ${response.status}; native JSON expected.`); }
  assert(response.ok && body.success === true, `${method} ${path.split('?')[0]}: HTTP ${response.status}; native request failed.`);
  return body.data;
}

async function htmlAt(path) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin, 'Rendered checks must remain in the isolated environment.');
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(60000), headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(response.status, 200, `Rendered route ${url.pathname}`);
  const html = await response.text();
  assert(/<h1\b/u.test(html), 'Expected rendered content, not a streamed server error.');
  return { html, headers: response.headers };
}

function markers(html) {
  return [...html.matchAll(/<[a-z][^>]*\bdata-showroom-marker(?=[\s=>])[^>]*>/giu)].map(match => {
    const latitude = match[0].match(/\bdata-latitude="([^"]+)"/u)?.[1];
    const longitude = match[0].match(/\bdata-longitude="([^"]+)"/u)?.[1];
    assert(latitude && longitude, 'Every geographic marker must identify its actual coordinate pair.');
    assert(Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude)), 'Marker coordinates must be finite numbers.');
    return { latitude: Number(latitude), longitude: Number(longitude) };
  });
}
function assertMarkers(html, latitude, longitude) {
  const values = markers(html);
  assert(values.length > 0, 'Expected the real geographic showroom marker.');
  for (const value of values) assert.deepEqual(value, { latitude, longitude });
}
function assertDirections(html, href) {
  assert([...html.matchAll(/<a\b[^>]*href="([^"]+)"/gu)].some(match => decode(match[1]) === href), 'The separate directions link must remain available.');
}
async function migrate(mode) {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/migrations/0006-geographic-showroom-map.mjs', mode], {
    cwd: process.cwd(), timeout: 120000, maxBuffer: 1024 * 1024,
    env: { ...process.env, EMDASH_BASE_URL: base.origin, EMDASH_AUTH_FILE: sessionFile, EMDASH_USE_CLI_AUTH: '0', RAYON_NUM_THREADS: '1', NODE_OPTIONS: '--max-old-space-size=1024' },
  });
  return stdout;
}

const before = await api(contentPath);
const beforeSchema = (await api(schemaPath)).item;
assert.equal(before.item.status, 'published');
assert(!before.item.draftRevisionId || before.item.draftRevisionId === before.item.liveRevisionId, 'Test refuses to replace a pending draft.');
const references = await readReferences(api, 'site_content', before.item, beforeSchema.fields);
assert.match(await migrate('--dry-run'), /No CMS, media, authentication or local state was written/);
assert.deepEqual(await api(contentPath), before);
assert.deepEqual((await api(schemaPath)).item, beforeSchema);
record('Migration 0006 dry run preserves native content, schema and revisions.');

await migrate('--apply');
const original = await api(contentPath);
const schema = (await api(schemaPath)).item;
assertGeographicSchema(schema, true);
for (const [key, value] of Object.entries(manifest.after)) assert.equal(original.item.data[key], value, `Approved geographic field ${key}`);
assertPreservedEntry(original, before, manifest.after, schema.fields);
assert.deepEqual(await readReferences(api, 'site_content', original.item, schema.fields), references);
record('Native migration adds numeric coordinate fields and the real place pin, preserving map links, unrelated content, media, SEO and references.');

assert.match(await migrate('--apply'), /already applied; no changes/);
assert.deepEqual(await api(contentPath), original);
assert.deepEqual((await api(schemaPath)).item, schema);
record('A second native migration run preserves data, schema and revisions exactly.');

if (!migrationOnly) {
  const published = await htmlAt('/');
  assertMarkers(published.html, original.item.data.showroom_latitude, original.item.data.showroom_longitude);
  assertDirections(published.html, original.item.data.map_url);
  assert(decode(published.html).includes(original.item.data.map_note));
  record('Anonymous homepage markers use the published geographic place coordinates and retain directions.');
  const draftCoordinates = { showroom_latitude: 33.5929007, showroom_longitude: -7.6424741 };
  let changed = false;
  async function save(data) {
    const current = await api(contentPath);
    changed = true;
    return api(contentPath, { method: 'PUT', data: { data, _rev: current._rev } });
  }
  async function publish(saved) {
    assert(saved._rev, 'Native save must return its optimistic revision.');
    await api(`${contentPath}/publish`, { method: 'POST', data: { _rev: saved._rev } });
  }
  try {
    const draft = await save(draftCoordinates);
    assertMarkers((await htmlAt('/')).html, original.item.data.showroom_latitude, original.item.data.showroom_longitude);
    const signed = await api(`${contentPath}/preview-url`, { method: 'POST', data: {} });
    const preview = await htmlAt(signed.url);
    assertMarkers(preview.html, draftCoordinates.showroom_latitude, draftCoordinates.showroom_longitude);
    assert.match(preview.headers.get('cache-control') || '', /private/u);
    assert.match(preview.headers.get('cache-control') || '', /no-store/u);
    assert.match(preview.headers.get('x-robots-tag') || '', /noindex/u);
    const invalid = new URL(signed.url, base);
    const parameter = ['_preview', '_emdash_preview'].find(key => invalid.searchParams.has(key));
    assert(parameter, 'Native preview must identify its signed token parameter.');
    invalid.searchParams.set(parameter, 'invalid-geographic-test');
    const invalidResponse = await fetch(invalid, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
    assert([200, 400, 401, 403, 404].includes(invalidResponse.status));
    const invalidHtml = await invalidResponse.text();
    assert(!markers(invalidHtml).some(marker => marker.latitude === draftCoordinates.showroom_latitude || marker.longitude === draftCoordinates.showroom_longitude), 'An invalid preview token exposed the draft marker position.');
    record('Coordinate drafts remain private; signed global preview uses the draft marker with private, no-store/noindex and invalid-token isolation.');

    await publish(draft);
    assertMarkers((await htmlAt('/')).html, draftCoordinates.showroom_latitude, draftCoordinates.showroom_longitude);
    record('Publishing coordinates updates the next anonymous marker position without rebuilding.');

    const cleared = await save({ showroom_latitude: null });
    assertMarkers((await htmlAt('/')).html, draftCoordinates.showroom_latitude, draftCoordinates.showroom_longitude);
    const signedClear = await api(`${contentPath}/preview-url`, { method: 'POST', data: {} });
    const clearPreview = await htmlAt(signedClear.url);
    assert.equal(markers(clearPreview.html).length, 0, 'Clearing one coordinate must hide the marker in signed preview.');
    assertDirections(clearPreview.html, original.item.data.map_url);
    await publish(cleared);
    const clearedPublic = await htmlAt('/');
    assert.equal(markers(clearedPublic.html).length, 0, 'A published incomplete pair must not silently fall back to the original marker.');
    assertDirections(clearedPublic.html, original.item.data.map_url);
    const showroom = await htmlAt('/showroom-casablanca/');
    assertDirections(showroom.html, original.item.data.map_url);
    assert.equal((await api(contentPath)).item.data.map_embed_url, original.item.data.map_embed_url, 'Coordinate edits must preserve the optional interactive map source.');
    record('Clearing one coordinate hides the marker in preview/public HTML while directions and optional interactive map settings remain intact.');
  } finally {
    if (changed) {
      await publish(await save({ showroom_latitude: original.item.data.showroom_latitude, showroom_longitude: original.item.data.showroom_longitude }));
      const restored = await api(contentPath);
      assertPreservedEntry(restored, original, {}, schema.fields);
      assert.deepEqual(await readReferences(api, 'site_content', restored.item, schema.fields), references);
      assert(!restored.item.draftRevisionId || restored.item.draftRevisionId === restored.item.liveRevisionId);
      assertMarkers((await htmlAt('/')).html, original.item.data.showroom_latitude, original.item.data.showroom_longitude);
      record('The finally block restores approved coordinates and leaves no pending global draft.');
    }
  }
}

await mkdir('test-results/geographic-map', { recursive: true });
await writeFile(`test-results/geographic-map/cms${migrationOnly ? '-migration-only' : ''}.json`, `${JSON.stringify({ completedAt: new Date().toISOString(), disposableOrigin: base.origin, mode: migrationOnly ? 'migration-only' : 'full', results }, null, 2)}\n`);
console.log(`Completed ${results.length} native geographic checks in the disposable environment.`);
