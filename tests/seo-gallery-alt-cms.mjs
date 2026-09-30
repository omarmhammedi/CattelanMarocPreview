/** Native alt publication checks on a marked disposable fixture only; no authentication/setup/media writes. */
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {integrationEnvironment} from './integration-environment.mjs';
import {loadGalleryAlt, prepareGalleryAlt, applyGalleryAlt} from '../scripts/migrations/0013-gallery-alt.mjs';
import {assertNoDraft, normalizeData} from '../scripts/migrations/0003-model-detail-pages.mjs';

const base = await integrationEnvironment();
const session = JSON.parse(await readFile('.wrangler/cms-sync-session.json', 'utf8'));
const cookie = session.cookie || session.cookies?.filter(item => item.domain?.replace(/^\./, '') === base.hostname && (item.expires < 0 || item.expires > Date.now() / 1000)).map(({name, value}) => `${name}=${value}`).join('; ');
assert(cookie, 'Reuse an existing genuine fixture session; do not enroll an account.');
const output = resolve('test-results/seo-gallery-alt');
await mkdir(output, {recursive: true});
const path = '/_emdash/api/content/models/greta';
const schemaPath = '/_emdash/api/schema/collections/models?includeFields=true';
const report = {disposableOrigin: base.origin, startedAt: new Date().toISOString(), checks: [], writes: [], restored: false};
let original, schema, baseline, manifest, migrationRunning = false, backedUp = false;
const pass = message => {report.checks.push(message); console.log(`PASS ${message}`);};
const plainImage = image => {const copy = structuredClone(image); delete copy.alt; return copy;};

async function api(route, {method = 'GET', data} = {}) {
  assert(route.startsWith('/_emdash/api/content/') || route === schemaPath, 'Only content/schema APIs are allowed.');
  if (method !== 'GET') {
    assert(route === path || route === `${path}/publish` || route === `${path}/preview-url`, 'Only this disposable model may change.');
    assert((method === 'PUT' && route === path) || (method === 'POST' && route !== path));
    if (migrationRunning) {
      assert(backedUp, 'Migration attempted a save without its private backup.');
      if (method === 'PUT') {
        assert.deepEqual(Object.keys(data).sort(), ['_rev', 'data']);
        assert.deepEqual(Object.keys(data.data).sort(), ['gallery', 'image']);
      }
    }
    report.writes.push({method, path: route});
  }
  const response = await fetch(new URL(route, base), {method, redirect: 'error', signal: AbortSignal.timeout(60000),
    headers: {Cookie: cookie, Origin: base.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : {'Content-Type': 'application/json'})},
    ...(data === undefined ? {} : {body: JSON.stringify(data)})});
  const envelope = await response.json(); assert(response.ok && envelope.success, `Native ${method} ${route}: HTTP ${response.status}`);
  if (migrationRunning && method === 'PUT') {
    const publicHtml = await html('/modeles/greta/');
    assert(publicHtml.includes(manifest.entries[0].gallery[0].beforeAlt));
    assert(!publicHtml.includes(manifest.entries[0].gallery[0].afterAlt), 'Draft alt must not leak into the public page.');
    const preview = await api(`${path}/preview-url`, {method: 'POST', data: {}});
    const previewHtml = await html(preview.url);
    assert(previewHtml.includes(manifest.entries[0].gallery[0].afterAlt), 'Signed preview must show the saved draft alt.');
    pass('Native draft alt stays private while its signed preview shows the new description.');
  }
  return envelope.data;
}
async function html(route) {
  const url = new URL(route, base); assert.equal(url.origin, base.origin);
  const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(60000)});
  assert.equal(response.status, 200);
  return (await response.text()).replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
}
async function save(values) {
  const current = await api(path);
  return api(path, {method: 'PUT', data: {_rev: current._rev, data: values}});
}
async function publish(saved) {return api(`${path}/publish`, {method: 'POST', data: {_rev: saved._rev}});}

try {
  schema = (await api(schemaPath)).item;
  original = await api(path); assertNoDraft(original.item); assert.equal(original.item.status, 'published');
  await writeFile(resolve('.wrangler/gallery-alt-fixture-backup.json'), JSON.stringify({schema, original}, null, 2), {mode: 0o600});
  const home = await api('/_emdash/api/content/pages/home');
  const photos = [home.item.data.hero_image, home.item.data.brand_detail_image];
  assert(photos.every(image => image?.provider === 'local' && image.id && image.width && image.height), 'Use only existing fixture images.');
  const changes = structuredClone((await loadGalleryAlt()).entries.find(entry => entry.slug === 'greta').gallery.slice(0, 2));
  const gallery = photos.map((image, index) => ({image: {...structuredClone(image), alt: changes[index].beforeAlt}, caption: `Disposable gallery caption ${index + 1}`}));
  await publish(await save({gallery, image: structuredClone(gallery[0].image)}));
  baseline = await api(path);
  changes.forEach((change, index) => {change.expectedImage = plainImage(baseline.item.data.gallery[index].image);});
  manifest = {version: 1, entries: [{slug: 'greta', gallery: changes, image: {...structuredClone(changes[0]), expectedImage: plainImage(baseline.item.data.image)}}]};
  const plan = await prepareGalleryAlt(api, manifest);
  assert(plan.plans[0].change);
  migrationRunning = true;
  await applyGalleryAlt(api, plan, {
    beforeWrite: async () => {await writeFile(resolve('.wrangler/gallery-alt-fixture-plan.json'), JSON.stringify(plan, null, 2), {mode: 0o600}); backedUp = true;},
  });
  migrationRunning = false;
  const after = await api(path); assertNoDraft(after.item);
  const expected = structuredClone(baseline.item.data);
  changes.forEach((change, index) => {expected.gallery[index].image.alt = change.afterAlt;});
  expected.image.alt = changes[0].afterAlt;
  assert.deepEqual(after.item.data, expected);
  assert.deepEqual(after.item.seo, baseline.item.seo);
  assert.deepEqual((await api(schemaPath)).item, schema);
  const publishedHtml = await html('/modeles/greta/');
  for (const change of changes) assert(publishedHtml.includes(change.afterAlt));
  pass('Native publication changes only the two gallery alt values and the matching hero; captions, image metadata, SEO, schema and parent relations are preserved.');

  const completed = await prepareGalleryAlt(api, manifest);
  assert(!completed.plans[0].change);
  await applyGalleryAlt(async () => assert.fail('A completed migration must not call the API.'), completed);
  pass('Applying an already-completed plan makes no additional API calls; preparing that plan remains read-only.');

  const custom = structuredClone(after.item.data.gallery); custom[0].image.alt = 'Description personnalisée conservée dans la copie jetable.';
  await publish(await save({gallery: custom}));
  const beforeRejection = await api(path), writeCount = report.writes.length;
  await assert.rejects(() => prepareGalleryAlt(api, manifest), /customized|partially/);
  assert.equal(report.writes.length, writeCount); assert.deepEqual(await api(path), beforeRejection);
  pass('An independently customized published alt aborts preparation without overwriting any gallery value.');

  await save({gallery: custom});
  const pending = await api(path), beforeDraftRejection = report.writes.length;
  assert(pending.item.draftRevisionId && pending.item.draftRevisionId !== pending.item.liveRevisionId);
  await assert.rejects(() => prepareGalleryAlt(api, manifest), /unpublished/);
  assert.equal(report.writes.length, beforeDraftRejection); assert.deepEqual(await api(path), pending);
  pass('An existing unpublished draft is rejected and left untouched.');
} finally {
  migrationRunning = false;
  if (original) {
    await publish(await save({gallery: original.item.data.gallery ?? null, image: original.item.data.image ?? null}));
    const restored = await api(path); assertNoDraft(restored.item);
    assert.deepEqual(normalizeData(restored.item.data, schema.fields), normalizeData(original.item.data, schema.fields));
    assert.deepEqual(restored.item.seo, original.item.seo);
    assert.deepEqual((await api(schemaPath)).item, schema);
    report.restored = true;
    pass('Original fixture fields, SEO and schema restored; no new media, administrator or authentication state created.');
  }
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, 'cms-report.json'), JSON.stringify(report, null, 2) + '\n');
}
