/** Native 0012 checks, only in an existing marked disposable fixture.
 * CMS_TEST_URL=http://localhost:4331 node tests/seo-followup-cms.mjs
 * Reuses its setup session. Restores original content/menu; never authenticates.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { integrationEnvironment } from './integration-environment.mjs';
import { assertNoDraft } from '../scripts/migrations/0003-model-detail-pages.mjs';
import { assertPreservedEntry, readReferences } from '../scripts/migrations/0004-collection-editorial.mjs';
import { applyRefresh, prepareRefresh } from '../scripts/migrations/0010-editorial-refresh.mjs';
import { loadSeoFollowup } from '../scripts/migrations/0012-seo-followup.mjs';

const base = await integrationEnvironment();
assert.equal(process.argv.length, 2, 'This targeted fixture check accepts no flags.');
const session = JSON.parse(await readFile(resolve('.wrangler/cms-sync-session.json'), 'utf8'));
const cookie = session.cookie || session.cookies?.filter(item => item.domain?.replace(/^\./, '') === base.hostname && (item.expires < 0 || item.expires > Date.now() / 1000)).map(({name, value}) => `${name}=${value}`).join('; ');
assert(cookie, 'Use the existing native session for this disposable fixture.');
const manifest = await loadSeoFollowup(), schemas = {}, originals = new Map(), results = [], mutations = [];
const stamp = Date.now(), pathFor = (collection, slug) => `/_emdash/api/content/${collection}/${slug}`;
const paths = new Set(manifest.entries.map(entry => pathFor(entry.collection, entry.slug)));
let backupSaved = false, failure, originalMenu, menuItemId;
const pass = message => {results.push(message); console.log(`PASS ${message}`);};
async function api(path, {method = 'GET', data} = {}) {
  assert(['GET', 'PUT', 'POST'].includes(method));
  const contentPath = path.replace(/\/(publish|preview-url)$/, '');
  if (method === 'GET') assert(/^\/_emdash\/api\/(content|schema\/collections|menus)\//.test(path));
  else {
    assert(backupSaved, 'Persist the exact fixture baseline before any mutation.');
    assert(paths.has(contentPath) || method === 'PUT' && path === `/_emdash/api/menus/primary/items/${menuItemId}`, 'Only targeted fixture content/menu writes are allowed.');
    if (method === 'POST') assert(/\/(publish|preview-url)$/.test(path));
    mutations.push({method, path});
  }
  const response = await fetch(new URL(path, base), {method, redirect: 'error', signal: AbortSignal.timeout(60000), headers: {Cookie: cookie, Origin: base.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : {'Content-Type': 'application/json'})}, ...(data === undefined ? {} : {body: JSON.stringify(data)})});
  let envelope;
  try {envelope = await response.json();} catch {throw Error(`${method} ${path}: HTTP ${response.status}, JSON expected.`);}
  assert(response.ok && envelope.success, `${method} ${path}: HTTP ${response.status}`);
  return envelope.data;
}
async function htmlAt(path, allowed = [200]) {
  const url = new URL(path, base); assert.equal(url.origin, base.origin);
  const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(60000), headers: {'Cache-Control': 'no-cache'}});
  assert(allowed.includes(response.status), `${url.pathname}: HTTP ${response.status}`);
  const html = await response.text();
  if (allowed.length === 1) assert(/<h1\b/.test(html), 'Expected a complete public page.');
  return {html, headers: response.headers};
}
async function save(path, data) {
  const current = await api(path);
  return api(path, {method: 'PUT', data: {_rev: current._rev, data}});
}
const publish = (path, saved) => api(`${path}/publish`, {method: 'POST', data: {_rev: saved._rev}});
const setLive = async (path, data) => publish(path, await save(path, data));
const signed = async path => htmlAt((await api(`${path}/preview-url`, {method: 'POST', data: {}})).url);
const routeFor = entry => entry.collection === 'pages' ? entry.slug === 'home' ? '/' : `/${entry.slug}/` : entry.collection === 'families' ? `/collections/${entry.slug}/` : '/';
const whatsapp = 'https://wa.me/212771105490';
const showroomEntry = manifest.entries.find(entry => entry.slug === 'showroom-casablanca');
const showroomPath = pathFor('pages', 'showroom-casablanca'), globalPath = pathFor('site_content', 'global');

try {
  for (const entry of manifest.entries) {
    const path = pathFor(entry.collection, entry.slug);
    schemas[entry.collection] ||= (await api(`/_emdash/api/schema/collections/${entry.collection}?includeFields=true`)).item;
    const original = await api(path); assertNoDraft(original.item); assert.equal(original.item.status, 'published');
    for (const key of Object.keys(entry.after)) assert(schemas[entry.collection].fields.some(field => field.slug === key), `Fixture schema lacks ${entry.collection}.${key}.`);
    originals.set(path, {entry, response: original, references: await readReferences(api, entry.collection, original.item, schemas[entry.collection].fields)});
  }
  originalMenu = await api('/_emdash/api/menus/primary');
  const catalogue = originalMenu.items.filter(item => item.customUrl === '/catalogue/'); assert.equal(catalogue.length, 1); menuItemId = catalogue[0].id;
  await mkdir('.wrangler/seo-followup-cms', {recursive: true, mode: 0o700});
  await writeFile(`.wrangler/seo-followup-cms/original-${stamp}.json`, JSON.stringify({origin: base.origin, entries: [...originals], schemas, menu: originalMenu}, null, 2), {mode: 0o600, flag: 'wx'});
  backupSaved = true;
  for (const entry of manifest.entries) await setLive(pathFor(entry.collection, entry.slug), {...entry.before, ...Object.fromEntries((entry.beforeAbsent || []).map(key => [key, null]))});
  if (catalogue[0].label !== 'Catalogue') await api(`/_emdash/api/menus/primary/items/${menuItemId}`, {method: 'PUT', data: {label: 'Catalogue'}});
  const baseline = await Promise.all(manifest.entries.map(entry => api(pathFor(entry.collection, entry.slug))));
  assert(!Object.hasOwn(baseline.at(-1).item.data, 'whatsapp_url'), 'Native clearing must reproduce the exact absent WhatsApp baseline.');
  const count = mutations.length, plan = await prepareRefresh(api, manifest.entries, manifest.menu);
  assert.equal(plan.plans.filter(item => item.change).length, 4); assert.equal(plan.menuChange, false); assert.equal(mutations.length, count);
  assert.deepEqual(await Promise.all(manifest.entries.map(entry => api(pathFor(entry.collection, entry.slug)))), baseline);
  pass('Four native before-states are exact; dry planning preserves revisions/content and performs no writes.');

  const updated = [];
  await applyRefresh(api, plan, {beforeWrite: () => writeFile(`.wrangler/seo-followup-cms/plan-${stamp}.json`, JSON.stringify(plan, null, 2), {mode: 0o600, flag: 'wx'}), afterEntry: result => updated.push(result)});
  assert.equal(updated.length, 4);
  for (const [index, entry] of manifest.entries.entries()) {
    const current = await api(pathFor(entry.collection, entry.slug)); assertNoDraft(current.item);
    assertPreservedEntry(current, baseline[index], entry.after, schemas[entry.collection].fields);
    assert.deepEqual(await readReferences(api, entry.collection, current.item, schemas[entry.collection].fields), plan.plans[index].references);
    const page = await htmlAt(routeFor(entry));
    if (entry.after.intro) assert(page.html.includes(entry.after.intro));
  }
  const showroom = await htmlAt('/showroom-casablanca/');
  assert(showroom.html.includes(whatsapp));
  for (const href of showroomEntry.after.content.flatMap(block => block.markDefs.map(mark => mark.href))) assert(showroom.html.includes(`href="${href}"`));
  assert(showroom.html.includes('Casablanca, Rabat, Marrakech et Tanger'));
  const completed = await prepareRefresh(api, manifest.entries, manifest.menu), repeatedAt = mutations.length;
  assert.equal(completed.plans.filter(item => item.change).length, 0);
  await applyRefresh(api, completed, {beforeWrite: () => assert.fail('Completed revision must not write a backup.')});
  assert.equal(mutations.length, repeatedAt);
  pass('Four entries publish with SEO/media/references preserved, five contextual links and WhatsApp; repeat performs zero writes.');

  const marker = `SHOWROOM-BODY-${stamp}`, draftBody = [...showroomEntry.after.content, {_type: 'block', _key: `fixture-${stamp}`, style: 'normal', markDefs: [], children: [{_type: 'span', _key: `fixture-span-${stamp}`, text: marker, marks: []}]}];
  const draft = await save(showroomPath, {content: draftBody});
  assert(!(await htmlAt('/showroom-casablanca/')).html.includes(marker));
  const preview = await api(`${showroomPath}/preview-url`, {method: 'POST', data: {}}), draftPage = await htmlAt(preview.url);
  assert(draftPage.html.includes(marker)); assert.match(draftPage.headers.get('cache-control') || '', /private.*no-store/); assert.match(draftPage.headers.get('x-robots-tag') || '', /noindex/);
  const invalid = new URL(preview.url, base), tokenKey = ['_preview', '_emdash_preview'].find(key => invalid.searchParams.has(key)); assert(tokenKey); invalid.searchParams.set(tokenKey, 'invalid-followup-token');
  assert(!(await htmlAt(invalid, [200, 400, 401, 403, 404])).html.includes(marker));
  const beforeRefusal = mutations.length;
  await assert.rejects(() => prepareRefresh(api, manifest.entries, manifest.menu), /unpublished/);
  assert.equal(mutations.length, beforeRefusal); assert.equal((await api(showroomPath))._rev, draft._rev);
  await publish(showroomPath, draft); assert((await htmlAt('/showroom-casablanca/')).html.includes(marker));
  const clearBody = await save(showroomPath, {content: []});
  assert((await htmlAt('/showroom-casablanca/')).html.includes(marker));
  assert(!(await signed(showroomPath)).html.includes(marker));
  await publish(showroomPath, clearBody); const emptyBody = (await htmlAt('/showroom-casablanca/')).html;
  assert(!emptyBody.includes(marker) && !emptyBody.includes('Du repas au salon') && emptyBody.includes('data-section-key="contact_note"'));
  await setLive(showroomPath, showroomEntry.after);
  pass('Showroom body draft is private, valid preview works, invalid preview fails, pending draft is preserved, and clearing removes body without losing contact note.');

  const alternateWhatsApp = 'https://wa.me/212700000001';
  const draftContact = await save(globalPath, {whatsapp_url: alternateWhatsApp});
  assert(!(await htmlAt('/')).html.includes(alternateWhatsApp) && (await htmlAt('/')).html.includes(whatsapp));
  assert((await signed(globalPath)).html.includes(alternateWhatsApp));
  await publish(globalPath, draftContact);
  for (const route of ['/', '/showroom-casablanca/']) assert((await htmlAt(route)).html.includes(alternateWhatsApp));
  const clearContact = await save(globalPath, {whatsapp_url: null});
  assert((await htmlAt('/')).html.includes(alternateWhatsApp)); assert(!(await signed(globalPath)).html.includes('https://wa.me/'));
  await publish(globalPath, clearContact);
  for (const route of ['/', '/showroom-casablanca/']) assert(!(await htmlAt(route)).html.includes('https://wa.me/'));
  await setLive(globalPath, manifest.entries.find(entry => entry.collection === 'site_content').after);
  const restoredCompleted = await prepareRefresh(api, manifest.entries, manifest.menu);
  assert.equal(restoredCompleted.plans.filter(item => item.change).length, 0);
  pass('WhatsApp follows native global draft/preview/publication and disappears when cleared; completed content restored before final fixture restoration.');
} catch (error) {failure = error;}
finally {
  const restoreErrors = [];
  if (backupSaved) {
    for (const [path, {entry, response, references}] of originals) {
      try {
        await setLive(path, Object.fromEntries(Object.keys(entry.after).map(key => [key, response.item.data[key] ?? null])));
        const restored = await api(path); assertNoDraft(restored.item);
        assertPreservedEntry(restored, response, {}, schemas[entry.collection].fields);
        if (path === globalPath) {
          assert.equal(Object.hasOwn(restored.item.data, 'whatsapp_url'), Object.hasOwn(response.item.data, 'whatsapp_url'), 'Restore the exact absent/present WhatsApp field state, not a null substitute.');
          assert.deepEqual(restored.item.data.whatsapp_url, response.item.data.whatsapp_url);
        }
        assert.deepEqual(await readReferences(api, entry.collection, restored.item, schemas[entry.collection].fields), references);
      } catch (error) {restoreErrors.push(`${path}: ${error.message}`);}
    }
    try {
      const current = await api('/_emdash/api/menus/primary'), previous = originalMenu.items.find(item => item.id === menuItemId);
      if (current.items.find(item => item.id === menuItemId).label !== previous.label) await api(`/_emdash/api/menus/primary/items/${menuItemId}`, {method: 'PUT', data: {label: previous.label}});
      const restored = await api('/_emdash/api/menus/primary'); assert.deepEqual(restored, {...originalMenu, updatedAt: restored.updatedAt});
      for (const [collection, schema] of Object.entries(schemas)) assert.deepEqual((await api(`/_emdash/api/schema/collections/${collection}?includeFields=true`)).item, schema);
    } catch (error) {restoreErrors.push(`menu/schema: ${error.message}`);}
  }
  if (!restoreErrors.length && backupSaved) pass('Original fixture content, references, native SEO, media, menu and schemas restored; no pending drafts remain.');
  await mkdir('test-results/seo-followup', {recursive: true});
  await writeFile('test-results/seo-followup/cms-report.json', JSON.stringify({completedAt: new Date().toISOString(), disposableOrigin: base.origin, passed: !failure && !restoreErrors.length, results, mutations: mutations.length, error: failure?.message || null, restoreErrors}, null, 2) + '\n');
  if (failure) throw failure;
  assert.equal(restoreErrors.length, 0, `Fixture restoration failed: ${restoreErrors.join('; ')}`);
}
