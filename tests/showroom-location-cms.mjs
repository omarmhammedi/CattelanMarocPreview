/**
 * HTTP-only native EmDash publication checks in an explicitly marked disposable checkout.
 * First run cms-sync.mjs --setup-only there; this suite reuses its native session.
 * CMS_TEST_URL=http://localhost:4331 node tests/showroom-location-cms.mjs
 * Never setup, authenticate, seed or mutate the preserved preview on port 4321.
 * Migration 0005 remains applied in the disposable fixture; temporary field edits
 * are restored to those approved values in finally, including after a failed assertion.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { integrationEnvironment } from './integration-environment.mjs';
import { assertPreservedEntry } from '../scripts/migrations/0004-collection-editorial.mjs';
import { validateShowroomManifest } from '../scripts/migrations/0005-showroom-location.mjs';

const base = await integrationEnvironment();
const execFileAsync = promisify(execFile);
const sessionFile = resolve('.wrangler/cms-sync-session.json');
const session = JSON.parse(await readFile(sessionFile, 'utf8'));
const cookie = session.cookies?.filter(item => item.domain?.replace(/^\./, '') === base.hostname && (item.expires < 0 || item.expires > Date.now() / 1000)).map(({ name, value }) => `${name}=${value}`).join('; ');
assert(cookie, 'Use the disposable setup-only environment with an existing native administrator session.');
const manifest = validateShowroomManifest(JSON.parse(await readFile('content/showroom-location.json', 'utf8')));
const globalPath = '/_emdash/api/content/site_content/global';
const showroomPath = '/_emdash/api/content/pages/showroom-casablanca';
const results = [];
const record = message => { results.push(message); console.log(`PASS ${message}`); };
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const hasToggle = html => /<button\b[^>]*\bdata-showroom-map-toggle(?:\s|[=>])/u.test(html);
const hasDirections = html => [...html.matchAll(/<a\b[^>]*href="([^"]+)"/gu)].some(match => decode(match[1]) === manifest.global.after.map_url);
const embedSources = html => [...html.matchAll(/<template\b[^>]*\bdata-showroom-map-template(?=[\s=>])[^>]*>([\s\S]*?)<\/template>/gu)].flatMap(match => [...match[1].matchAll(/<iframe\b[^>]*\bsrc="([^"]+)"/gu)].map(frame => decode(frame[1])));

async function api(path, { method = 'GET', data } = {}) {
  assert(path.startsWith('/_emdash/api/'), 'Only local native API paths are accepted.');
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

async function htmlAt(path, expectedStatus = 200) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin, 'Public and signed preview requests must stay in the disposable environment.');
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(60000), headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(response.status, expectedStatus, `Rendered route ${url.pathname}`);
  const html = await response.text();
  if (expectedStatus === 200) assert(/<h1\b/u.test(html), 'Expected rendered page content, not a streamed server error.');
  return { html, headers: response.headers };
}

async function migrate(mode) {
  const { stdout } = await execFileAsync(process.execPath, ['scripts/migrations/0005-showroom-location.mjs', mode], {
    cwd: process.cwd(), timeout: 120000, maxBuffer: 1024 * 1024,
    env: { ...process.env, EMDASH_BASE_URL: base.origin, EMDASH_AUTH_FILE: sessionFile, EMDASH_USE_CLI_AUTH: '0', RAYON_NUM_THREADS: '1', NODE_OPTIONS: '--max-old-space-size=1024' },
  });
  return stdout;
}

const before = { global: await api(globalPath), showroom: await api(showroomPath), schema: await api('/_emdash/api/schema/collections/site_content?includeFields=true') };
for (const entry of [before.global, before.showroom]) {
  assert.equal(entry.item.status, 'published');
  assert(!entry.item.draftRevisionId || entry.item.draftRevisionId === entry.item.liveRevisionId, 'Test refuses to replace a pending draft.');
}
assert.match(await migrate('--dry-run'), /No CMS, media, authentication or local state was written/);
assert.deepEqual(await api(globalPath), before.global);
assert.deepEqual(await api(showroomPath), before.showroom);
assert.deepEqual(await api('/_emdash/api/schema/collections/site_content?includeFields=true'), before.schema);
record('Migration dry run preserves the native schema, data and revisions.');

await migrate('--apply');
const original = await api(globalPath);
const migratedShowroom = await api(showroomPath);
const globalSchema = (await api('/_emdash/api/schema/collections/site_content?includeFields=true')).item;
const pagesSchema = (await api('/_emdash/api/schema/collections/pages?includeFields=true')).item;
for (const [field, value] of Object.entries(manifest.global.after)) assert.equal(original.item.data[field], value, `Approved field ${field}`);
for (const [slug, type] of [['map_note', 'text'], ['map_embed_url', 'url']]) {
  const field = globalSchema.fields.find(field => field.slug === slug);
  assert.equal(field?.type, type);
  assert.equal(Boolean(field.required), false);
}
assert.equal(migratedShowroom.item.data.sections.find(section => section.section_key === 'visit')?.cta_href, '#showroom-contact');
assertPreservedEntry(original, before.global, manifest.global.after, globalSchema.fields);
assertPreservedEntry(migratedShowroom, before.showroom, { sections: before.showroom.item.data.sections.map(section => section.section_key === 'visit' ? { ...section, cta_href: '#showroom-contact' } : section) }, pagesSchema.fields);
record('Native migration applies the approved location and anchor while preserving other fields, media and SEO.');

assert.match(await migrate('--apply'), /already applied; no changes/);
assert.deepEqual(await api(globalPath), original);
assert.deepEqual(await api(showroomPath), migratedShowroom);
record('A second native migration run makes no changes to content or revisions.');

for (const route of ['/', '/showroom-casablanca/']) {
  const { html } = await htmlAt(route);
  assert(decode(html).includes(manifest.global.after.address));
  assert(decode(html).includes(manifest.global.after.hours));
  assert(html.includes('href="tel:+212771105490"'));
  assert(hasDirections(html));
  if (route === '/') assert.equal(embedSources(html).length, 0, 'The homepage keeps its illustration instead of adding an interactive iframe.');
  else {
    assert(hasToggle(html));
    assert.deepEqual(embedSources(html), [manifest.global.after.map_embed_url]);
    assert(html.includes('href="#showroom-contact"') && html.includes('id="showroom-contact"'));
  }
}
record('Published homepage and showroom expose the real contact details and directions; the illustrated homepage remains intact.');

const marker = `SHOWROOM-CMS-${Date.now()}`;
const testEmbed = `https://www.google.com/maps/embed?pb=!1m2!1s${marker}`;
let changed = false;
async function save(data) {
  const current = await api(globalPath);
  changed = true;
  return api(globalPath, { method: 'PUT', data: { data, _rev: current._rev } });
}
async function publish(saved) {
  assert(saved._rev, 'Native save omitted its optimistic revision.');
  await api(`${globalPath}/publish`, { method: 'POST', data: { _rev: saved._rev } });
}
try {
  const draft = await save({ hours: marker, map_embed_url: testEmbed });
  for (const route of ['/', '/showroom-casablanca/']) {
    const { html } = await htmlAt(route);
    assert(!html.includes(marker), 'An unpublished global field leaked to anonymous public HTML.');
    assert(decode(html).includes(original.item.data.hours));
  }
  const signed = await api(`${globalPath}/preview-url`, { method: 'POST', data: {} });
  const preview = await htmlAt(signed.url);
  assert(decode(preview.html).includes(marker), 'The signed global preview did not display draft hours.');
  assert.deepEqual(embedSources(preview.html), [testEmbed], 'The signed global preview did not display its draft interactive map.');
  assert(hasToggle(preview.html));
  assert.match(preview.headers.get('cache-control') || '', /private/u);
  assert.match(preview.headers.get('cache-control') || '', /no-store/u);
  assert.match(preview.headers.get('x-robots-tag') || '', /noindex/u);
  const invalid = new URL(signed.url, base);
  const tokenParameter = ['_preview', '_emdash_preview'].find(name => invalid.searchParams.has(name));
  assert(tokenParameter, 'Native preview response must identify its signed token parameter.');
  invalid.searchParams.set(tokenParameter, 'invalid-showroom-test');
  const invalidPreview = await fetch(invalid, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
  assert([200, 400, 401, 403, 404].includes(invalidPreview.status));
  assert(!(await invalidPreview.text()).includes(marker), 'Invalid signed preview exposed draft showroom data.');
  record('Draft hours/map stay private; valid global preview displays both with private, no-store and noindex, while invalid tokens reveal neither.');

  await publish(draft);
  for (const route of ['/', '/showroom-casablanca/']) assert((await htmlAt(route)).html.includes(marker), 'Published hours did not appear immediately.');
  assert.deepEqual(embedSources((await htmlAt('/showroom-casablanca/')).html), [testEmbed]);
  record('Publishing global hours and map changes the next anonymous response without rebuilding.');

  const cleared = await save({ hours: original.item.data.hours, map_embed_url: null });
  assert.deepEqual(embedSources((await htmlAt('/showroom-casablanca/')).html), [testEmbed], 'Clearing a draft modified the published map.');
  const clearedSigned = await api(`${globalPath}/preview-url`, { method: 'POST', data: {} });
  const clearedPreview = await htmlAt(clearedSigned.url);
  assert(!hasToggle(clearedPreview.html));
  assert.equal(embedSources(clearedPreview.html).length, 0);
  assert(hasDirections(clearedPreview.html));
  await publish(cleared);
  const empty = await htmlAt('/showroom-casablanca/');
  assert(!hasToggle(empty.html));
  assert.equal(embedSources(empty.html).length, 0);
  assert(hasDirections(empty.html), 'Clearing the interactive map must retain the separate directions link.');
  assert(!empty.html.includes(marker));
  record('Clearing the map is respected in signed preview and after publication, without a fallback embed; directions remain available.');
} finally {
  if (changed) {
    await publish(await save({ hours: original.item.data.hours, map_embed_url: original.item.data.map_embed_url }));
    const restored = await api(globalPath);
    assertPreservedEntry(restored, original, {}, globalSchema.fields);
    assert(!restored.item.draftRevisionId || restored.item.draftRevisionId === restored.item.liveRevisionId);
    const rendered = await htmlAt('/showroom-casablanca/');
    assert(!rendered.html.includes(marker));
    assert.deepEqual(embedSources(rendered.html), [original.item.data.map_embed_url]);
    record('Temporary publication tests restore the approved content and leave no pending global draft.');
  }
}

await mkdir('test-results/showroom', { recursive: true });
await writeFile('test-results/showroom/cms.json', `${JSON.stringify({ completedAt: new Date().toISOString(), disposableOrigin: base.origin, results }, null, 2)}\n`);
console.log(`Completed ${results.length} native showroom migration/publication checks in the disposable environment.`);
