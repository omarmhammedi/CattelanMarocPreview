/**
 * Fresh disposable LOCAL EmDash fixture, using the current schema/content and
 * synthetic media. Native setup and authentication are still required.
 *
 * CMS_TEST_URL=http://localhost:4331 node scripts/prepare-cms-fixture.mjs --prepare
 * npm run dev -- --port 4331
 * CMS_TEST_URL=http://localhost:4331 node tests/cms-sync.mjs --setup --setup-only
 * CMS_TEST_URL=http://localhost:4331 node scripts/prepare-cms-fixture.mjs --hydrate
 * node scripts/prepare-cms-fixture.mjs --cleanup
 *
 * The temporary .emdash/seed.json override must be cleaned before any build.
 * It contains every current entry and schema field, but no remote media fetches.
 * Two checked-in photographs and a synthetic PDF verify bindings, not real assets.
 */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir, access, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {integrationEnvironment} from '../tests/integration-environment.mjs';
import {planValues, normalizeData} from './migrations/0003-model-detail-pages.mjs';

const root = resolve('.');
const override = resolve('.emdash/seed.json');
const markerPath = resolve('.wrangler/integration-test-environment.json');
const mode = process.argv[2];
assert(['--prepare', '--hydrate', '--cleanup'].includes(mode), 'Choose --prepare, --hydrate or --cleanup.');
async function exists(path) { try { await access(path); return true; } catch { return false; } }
if (mode === '--cleanup') {
  const marker = JSON.parse(await readFile(markerPath, 'utf8'));
  assert(marker.disposable === true && marker.projectRoot === root && marker.seedOverride === override);
  await rm(override, {force: true});
  try { await rm(resolve('.emdash')); } catch { /* preserve any unrelated files */ }
  console.log('Removed disposable seed override. Local database and credentials remain ignored.');
  process.exit();
}
const origin = new URL(process.env.CMS_TEST_URL || '');
assert(origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) && origin.port && origin.port !== '4321');
assert(origin.pathname === '/' && !origin.search && !origin.hash && !origin.username && !origin.password);
const rawSeed = mode === '--prepare' && process.argv.includes('--seed-before-repair')
  ? execFileSync('git', ['show', 'e8baf8961c3eb93d4761801a541b666212e2ccd1:seed/seed.json'], {encoding: 'utf8', maxBuffer: 16 * 1024 * 1024})
  : mode === '--hydrate' && await exists('.wrangler/fixture-seed-source.json')
    ? await readFile('.wrangler/fixture-seed-source.json', 'utf8')
    : await readFile('seed/seed.json', 'utf8');
const seed = JSON.parse(rawSeed);
const manifest = JSON.parse(await readFile('content/model-details.json', 'utf8'));
for (const entry of seed.content.models) {
  const model = manifest.models.find(item => item.slug === entry.slug);
  if (model) Object.assign(entry.data, planValues(entry.data, model, manifest.verified_at));
}
function mapMedia(value, transform) {
  if (!value || typeof value !== 'object') return value;
  if ('$media' in value) return transform(value.$media);
  if (Array.isArray(value)) return value.map(item => mapMedia(item, transform));
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, mapMedia(child, transform)]));
}
if (mode === '--prepare') {
  assert(!(await exists('.wrangler/state')), 'Prepare only a fresh disposable database; this script never removes existing state.');
  assert(!(await exists(override)), 'Existing seed override preserved; remove it intentionally before preparing a fresh fixture.');
  await mkdir('.wrangler', {recursive: true});
  await mkdir('.emdash', {recursive: true});
  const fixture = mapMedia(seed, () => null);
  // Seed schema stays exact; the original media positions are restored over the native API.
  await writeFile('.wrangler/fixture-seed-source.json', `${JSON.stringify(seed)}\n`);
  await writeFile(override, `${JSON.stringify(fixture, null, 2)}\n`, {flag: 'wx'});
  await writeFile(markerPath, `${JSON.stringify({disposable: true, projectRoot: root, origin: origin.origin,
    seedOverride: override, sourceSeedSha256: createHash('sha256').update(rawSeed).digest('hex'),
    baseline: process.argv.includes('--seed-before-repair') ? 'e8baf89 before repair' : 'current seed',
    media: 'synthetic local fixtures; not official asset verification'}, null, 2)}\n`);
  console.log(`Prepared current-schema fixture: ${seed.collections.length} collections, ${Object.values(seed.content).flat().length} entries. Run npm run setup, then native setup/login.`);
  process.exit();
}
await integrationEnvironment();
const session = JSON.parse(await readFile('.wrangler/cms-sync-session.json', 'utf8'));
const cookie = session.cookies.filter(item => [origin.hostname, `.${origin.hostname}`].includes(item.domain)).map(({name, value}) => `${name}=${value}`).join('; ');
assert(cookie, 'Run cms-sync native login first.');
async function api(path, method = 'GET', body) {
  const isForm = body instanceof FormData;
  const response = await fetch(new URL(path, origin), {method, redirect: 'error', signal: AbortSignal.timeout(60000),
    headers: {Cookie: cookie, Origin: origin.origin, 'X-EmDash-Request': '1', ...(body && !isForm ? {'Content-Type': 'application/json'} : {})},
    ...(body ? {body: isForm ? body : JSON.stringify(body)} : {})});
  const json = await response.json();
  assert(response.ok && json.success, `${method} ${path.split('?')[0]} failed (${response.status}): ${json.error?.message || 'native API error'}`);
  return json.data;
}
async function upload(filename, mime, bytes) {
  const body = new FormData(); body.set('file', new File([bytes], filename, {type: mime})); body.set('deduplicate', 'true');
  const {item} = await api('/_emdash/api/media', 'POST', body);
  return {provider: 'local', id: item.id, filename: item.filename, mimeType: item.mimeType, width: item.width, height: item.height, meta: {storageKey: item.storageKey}};
}
const images = [await upload('fixture-table.jpg', 'image/jpeg', await readFile('public/images/table-detail.jpg')),
  await upload('fixture-showroom.jpg', 'image/jpeg', await readFile('public/images/salon-angle.jpg'))];
const pdf = await upload('fixture-technical.pdf', 'application/pdf', Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n'));
let mediaCount = 0, patched = 0;
for (const [collection, entries] of Object.entries(seed.content)) {
  const fields = seed.collections.find(item => item.slug === collection).fields;
  for (const entry of entries) {
    const media = [];
    mapMedia(entry.data, source => {media.push(source); return null;});
    if (!media.length) continue;
    const path = `/_emdash/api/content/${collection}/${entry.slug || entry.id}`;
    const before = await api(path);
    assert(!before.item.draftRevisionId || before.item.draftRevisionId === before.item.liveRevisionId, 'Fixture hydration refuses pending edits.');
    const next = structuredClone(before.item.data);
    for (const [key, value] of Object.entries(entry.data)) {
      const leaves = [];
      mapMedia(value, source => {leaves.push(source); return null;});
      if (!leaves.length) continue;
      next[key] = mapMedia(value, source => {
        mediaCount++;
        const asset = source.mimeType === 'application/pdf' || /\.pdf(?:$|\?)/i.test(source.url) ? pdf : images[(source.filename || '').length % images.length];
        return {...asset, alt: source.alt || ''};
      });
    }
    await api(path, 'PUT', {data: normalizeData(next, fields), _rev: before._rev});
    if (before.item.status === 'published') {
      const changed = await api(path);
      await api(`${path}/publish`, 'POST', {_rev: changed._rev});
    }
    patched++;
  }
}
await writeFile('.wrangler/synthetic-media-report.json', `${JSON.stringify({patched, mediaPositions: mediaCount,
  actualMediaFiles: 3, fixture: 'All current entries and schema; two synthetic photographs and a synthetic PDF. Official asset bytes are outside this test.'}, null, 2)}\n`);
console.log(`Hydrated ${mediaCount} current media positions across ${patched} entries using native API and three synthetic assets.`);
