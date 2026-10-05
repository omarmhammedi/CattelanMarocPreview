/** Native copy/publication integration. Run only in a marked disposable checkout.
 * CMS_TEST_URL=http://localhost:4331 node tests/editorial-refresh-cms.mjs
 * Reuses that fixture's native setup session; never authenticates, imports media or submits contacts.
 * Requires the historical 0010 content fixture, not the current seed; the
 * clearing assertions intentionally use the current native-only SEO policy.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { integrationEnvironment } from './integration-environment.mjs';
import { assertNoDraft } from '../scripts/migrations/0003-model-detail-pages.mjs';
import { assertPreservedEntry, readReferences } from '../scripts/migrations/0004-collection-editorial.mjs';
import { applyRefresh, loadRefresh, prepareRefresh } from '../scripts/migrations/0010-editorial-refresh.mjs';

const base = await integrationEnvironment();
const session = JSON.parse(await readFile(resolve('.wrangler/cms-sync-session.json'), 'utf8'));
const cookie = session.cookie || session.cookies?.filter(item => item.domain?.replace(/^\./, '') === base.hostname && (item.expires < 0 || item.expires > Date.now() / 1000)).map(({ name, value }) => `${name}=${value}`).join('; ');
assert(cookie, 'A genuine native session belonging to the disposable fixture is required.');
const manifest = await loadRefresh();
assert.equal(manifest.entries.length, 28);
const seed = JSON.parse(await readFile('seed/seed.json', 'utf8'));
const results = [], mutations = [], restorations = new Map();
const schemas = {};
let migrationRunning = false, backupSaved = false, failure;
const pass = message => { results.push(message); console.log(`PASS ${message}`); };
const pathFor = (collection, slug) => `/_emdash/api/content/${collection}/${encodeURIComponent(slug)}`;
const schemaPath = collection => `/_emdash/api/schema/collections/${collection}?includeFields=true`;
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const plain = value => decode(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gu, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gu, '').replace(/<[^>]+>/gu, ' ')).replace(/\s+/gu, ' ').trim();

async function api(path, { method = 'GET', data } = {}) {
  assert(/^\/_emdash\/api\/(content|schema\/collections|menus)\//u.test(path) || (path === '/_emdash/api/settings' && method === 'GET'), 'This test cannot call auth, media or contact endpoints or mutate site settings.');
  if (method !== 'GET') {
    if (migrationRunning) assert(backupSaved, 'Migration attempted a write before its fixture backup.');
    mutations.push({ method, path: path.split('?')[0] });
  }
  const response = await fetch(new URL(path, base), { method, redirect: 'error', signal: AbortSignal.timeout(60000),
    headers: { Cookie: cookie, Origin: base.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  let envelope;
  try { envelope = await response.json(); } catch { throw Error(`${method} ${path.split('?')[0]}: HTTP ${response.status}; native JSON expected.`); }
  assert(response.ok && envelope.success, `${method} ${path.split('?')[0]}: HTTP ${response.status}`);
  return envelope.data;
}

async function htmlAt(path, allowedStatus = [200]) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin, 'Public and signed preview requests must remain in the disposable fixture.');
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(60000), headers: { 'Cache-Control': 'no-cache' } });
  assert(allowedStatus.includes(response.status), `${url.pathname}: unexpected HTTP ${response.status}`);
  const html = await response.text();
  if (allowedStatus.length === 1 && allowedStatus[0] === 200) assert(/<h1\b/u.test(html), 'Expected a rendered page, not an incomplete streamed response.');
  return { html, text: plain(html), headers: response.headers };
}

async function save(path, data, seo) {
  const current = await api(path);
  return api(path, { method: 'PUT', data: { _rev: current._rev, ...(data === undefined ? {} : { data }), ...(seo === undefined ? {} : { seo }) } });
}
const publish = (path, saved) => api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
async function remember(path, fields, seo = false) {
  if (!restorations.has(path)) restorations.set(path, { response: await api(path), fields, seo });
  return restorations.get(path).response;
}
async function restore(path) {
  const entry = restorations.get(path);
  if (!entry) return;
  const original = entry.response;
  const values = Object.fromEntries(entry.fields.map(key => [key, original.item.data[key]]));
  await publish(path, await save(path, values, entry.seo ? { title: original.item.seo?.title ?? null, description: original.item.seo?.description ?? null } : undefined));
  const after = await api(path);
  assertNoDraft(after.item);
  assertPreservedEntry(after, original, {}, schemas[original.item.type].fields);
  restorations.delete(path);
}
const routeFor = entry => entry.collection === 'pages' ? entry.slug === 'home' ? '/' : `/${entry.slug}/`
  : entry.collection === 'site_content' ? '/catalogue/'
    : `/${({families: 'collections', models: 'modeles', posts: 'journal'})[entry.collection]}/${entry.slug}/`;
const sampleFor = entry => entry.after.intro || entry.after.excerpt || entry.after.form_success_title
  || entry.after.content?.flatMap(block => block.children || []).find(span => span.text?.length > 30)?.text
  || entry.after.title;

try {
  // Build a synthetic editorial baseline using public versioned copy only.
  // Existing fixture images, relationships, accounts and secrets are never copied from the preview.
  for (const entry of manifest.entries) {
    const collection = entry.collection;
    schemas[collection] ||= (await api(schemaPath(collection))).item;
    for (const key of Object.keys(entry.before)) {
      if (schemas[collection].fields.some(field => field.slug === key)) continue;
      const definition = seed.collections.find(item => item.slug === collection)?.fields.find(field => field.slug === key);
      assert(definition && ['string', 'text', 'portableText', 'repeater'].includes(definition.type), `Missing supported editorial schema ${collection}.${key}`);
      await api(`/_emdash/api/schema/collections/${collection}/fields`, { method: 'POST', data: definition });
      schemas[collection] = (await api(schemaPath(collection))).item;
    }
    const path = pathFor(collection, entry.slug), before = await api(path);
    assertNoDraft(before.item);
    assert.equal(before.item.status, 'published');
    await publish(path, await save(path, entry.before, entry.seoBefore));
    assertPreservedEntry(await api(path), before, entry.before, schemas[collection].fields, entry.seoBefore);
  }
  const initialMenu = await api('/_emdash/api/menus/primary');
  const item = initialMenu.items.filter(item => item.customUrl === manifest.menu.url);
  assert.equal(item.length, 1);
  if (item[0].label !== manifest.menu.beforeLabel) await api(`/_emdash/api/menus/primary/items/${encodeURIComponent(item[0].id)}`, { method: 'PUT', data: { label: manifest.menu.beforeLabel } });
  pass('Prepared 28 synthetic before-states and the original menu label through disposable native APIs; no media or authentication writes.');

  const baseline = await Promise.all(manifest.entries.map(entry => api(pathFor(entry.collection, entry.slug))));
  const menuBefore = await api('/_emdash/api/menus/primary'), writesBeforeDryRun = mutations.length;
  const plan = await prepareRefresh(api, manifest.entries, manifest.menu);
  assert.equal(plan.plans.filter(entry => entry.change).length, 28);
  assert(plan.menuChange);
  assert.equal(mutations.length, writesBeforeDryRun);
  assert.deepEqual(await Promise.all(manifest.entries.map(entry => api(pathFor(entry.collection, entry.slug)))), baseline);
  assert.deepEqual(await api('/_emdash/api/menus/primary'), menuBefore);
  for (const [collection, schema] of Object.entries(schemas)) assert.deepEqual((await api(schemaPath(collection))).item, schema);
  pass('Dry preparation leaves all 28 entries, revisions, native SEO, schemas and menu untouched.');

  const updated = [];
  migrationRunning = true;
  await applyRefresh(api, plan, {
    beforeWrite: async () => {
      await mkdir('.wrangler/editorial-refresh-cms', { recursive: true, mode: 0o700 });
      await writeFile(`.wrangler/editorial-refresh-cms/backup-${Date.now()}.json`, JSON.stringify(plan, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
      backupSaved = true;
    },
    afterEntry: result => { updated.push(result); },
  });
  migrationRunning = false;
  assert.equal(updated.filter(entry => entry.collection).length, 28);
  assert.equal(updated.filter(entry => entry.menu).length, 1);
  for (const [index, entry] of manifest.entries.entries()) {
    const after = await api(pathFor(entry.collection, entry.slug));
    assertNoDraft(after.item);
    assertPreservedEntry(after, baseline[index], entry.after, schemas[entry.collection].fields, entry.seoAfter);
    assert.deepEqual(await readReferences(api, entry.collection, after.item, schemas[entry.collection].fields), plan.plans[index].references);
    const page = await htmlAt(routeFor(entry)), sample = sampleFor(entry);
    if (sample) assert(page.text.includes(plain(sample)) || decode(page.html).includes(sample), `${entry.collection}/${entry.slug}: expected published copy.`);
    if (entry.seoAfter) {
      assert(decode(page.html).includes(`<title>${entry.seoAfter.title}</title>`));
      assert(decode(page.html).includes(entry.seoAfter.description));
    }
  }
  const completed = await prepareRefresh(api, manifest.entries, manifest.menu), writesBeforeRepeat = mutations.length;
  assert.equal(completed.plans.filter(entry => entry.change).length, 0);
  assert.equal(completed.menuChange, false);
  await applyRefresh(api, completed, { beforeWrite: () => assert.fail('A completed migration must not request a backup or mutate state.') });
  assert.equal(mutations.length, writesBeforeRepeat);
  pass('28 entries and one menu label publish with metadata, references and fixture media preserved; reapplication performs zero writes.');

  const stamp = Date.now(), showroomPath = pathFor('pages', 'showroom-casablanca');
  const showroom = await remember(showroomPath, ['sections']);
  assert.equal(showroom.item.data.sections.filter(section => section.section_key === 'contact_note').length, 1);
  const contactMarker = `CONTACT-NOTE-${stamp}`, extraMarker = `EXTRA-SECTION-${stamp}`;
  const draftSections = showroom.item.data.sections.map(section => section.section_key === 'contact_note' ? { ...section, text: contactMarker } : section);
  draftSections.push({ section_key: 'integration_extra', heading: extraMarker, text: 'Une section éditoriale indépendante.' });
  const draft = await save(showroomPath, { sections: draftSections });
  assert(!(await htmlAt('/showroom-casablanca/')).html.includes(contactMarker));
  const preview = await api(`${showroomPath}/preview-url`, { method: 'POST', data: {} });
  const signed = await htmlAt(preview.url);
  assert(signed.html.includes(contactMarker) && signed.html.includes(extraMarker));
  assert.match(signed.headers.get('cache-control') || '', /private.*no-store/u);
  assert.match(signed.headers.get('x-robots-tag') || '', /noindex/u);
  assert(decode(signed.html.match(/<aside\b[^>]*id="showroom-contact"[^>]*>[\s\S]*?<\/aside>/u)?.[0] || '').includes(contactMarker), 'Contact note must be beside the contact information.');
  assert(signed.html.indexOf(extraMarker) < signed.html.indexOf('id="showroom-contact"'), 'Other editorial sections keep their ordinary placement.');
  const invalid = new URL(preview.url, base), parameter = ['_preview', '_emdash_preview'].find(key => invalid.searchParams.has(key));
  assert(parameter); invalid.searchParams.set(parameter, 'invalid-editorial-test');
  assert(!(await htmlAt(invalid, [200, 400, 401, 403, 404])).html.includes(contactMarker));
  const writesBeforeRefusal = mutations.length;
  await assert.rejects(() => prepareRefresh(api, manifest.entries, manifest.menu), /unpublished/u);
  assert.equal(mutations.length, writesBeforeRefusal);
  assert.equal((await api(showroomPath))._rev, draft._rev);
  await publish(showroomPath, draft);
  assert((await htmlAt('/showroom-casablanca/')).html.includes(contactMarker));
  pass('Contact-note draft stays private; signed preview shows the contact note and arbitrary extra section; invalid token is rejected and migration preserves the pending draft.');

  const clearedNote = await save(showroomPath, { sections: draftSections.filter(section => section.section_key !== 'contact_note') });
  assert((await htmlAt('/showroom-casablanca/')).html.includes(contactMarker));
  const clearedPreview = await api(`${showroomPath}/preview-url`, { method: 'POST', data: {} });
  const clearedSigned = await htmlAt(clearedPreview.url);
  assert(!clearedSigned.html.includes(contactMarker) && clearedSigned.html.includes(extraMarker));
  await publish(showroomPath, clearedNote);
  const clearedPublic = await htmlAt('/showroom-casablanca/');
  assert(!clearedPublic.html.includes('data-section-key="contact_note"') && clearedPublic.html.includes(extraMarker));
  assert(!clearedPublic.html.includes('class="page-faq'));
  await restore(showroomPath);
  pass('Clearing contact_note removes it in signed/public views without deleting arbitrary sections or adding a fallback FAQ; original note restored.');

  const homePath = pathFor('pages', 'home');
  await remember(homePath, ['sections']);
  assert((await htmlAt('/')).html.includes('id="italie"'));
  const clearedHome = await save(homePath, { sections: [] });
  assert((await htmlAt('/')).html.includes('id="italie"'));
  const homePreview = await api(`${homePath}/preview-url`, { method: 'POST', data: {} });
  assert(!(await htmlAt(homePreview.url)).html.includes('id="italie"'));
  await publish(homePath, clearedHome);
  const emptyHome = await htmlAt('/');
  assert(!emptyHome.html.includes('id="italie"') && !emptyHome.html.includes('id="m-italie"'));
  await restore(homePath);
  pass('Clearing optional homepage sections is respected in signed preview and after publication, on both markup variants; sections restored.');

  const article = manifest.entries.find(entry => entry.collection === 'posts' && entry.after.cta_href), articlePath = pathFor('posts', article.slug);
  await remember(articlePath, ['cta_text', 'cta_label', 'cta_href']);
  const clearedArticle = await save(articlePath, { cta_text: '', cta_label: '', cta_href: '' });
  const articlePreview = await api(`${articlePath}/preview-url`, { method: 'POST', data: {} });
  assert(!(await htmlAt(articlePreview.url)).html.includes('class="page-cta page-gutter"'));
  await publish(articlePath, clearedArticle);
  assert(!(await htmlAt(routeFor(article))).html.includes('class="page-cta page-gutter"'));
  await restore(articlePath);
  pass('Clearing an article CTA removes its section in preview and public content without a fallback catalogue button; CTA restored.');

  const familyPath = pathFor('families', 'tables'), family = await remember(familyPath, ['intro'], true);
  const siteSettings = await api('/_emdash/api/settings');
  const privateBody = `PRIVATE-INTRO-${stamp}`, seoTitle = `PUBLIC-SEO-${stamp}`, seoDescription = `Public description ${stamp}`;
  await save(familyPath, { intro: privateBody });
  await save(familyPath, undefined, { title: seoTitle, description: seoDescription });
  const seoPublic = await htmlAt('/collections/tables/');
  assert(seoPublic.html.includes(`<title>${seoTitle}</title>`) && seoPublic.html.includes(seoDescription));
  assert(!seoPublic.html.includes(privateBody) && seoPublic.text.includes(plain(family.item.data.intro)));
  await save(familyPath, undefined, { title: null, description: null });
  const fallback = await htmlAt('/collections/tables/');
  const generatedTitle = [family.item.data.title, siteSettings.title].filter(Boolean).join(siteSettings.seo?.titleSeparator || ' · ');
  assert(decode(fallback.html).includes(`<title>${generatedTitle}</title>`));
  const descriptionTag = fallback.html.match(/<meta\b[^>]*\bname="description"[^>]*>/u)?.[0] || '';
  assert.equal(decode(descriptionTag.match(/\bcontent="([^"]*)"/u)?.[1] || ''), family.item.data.intro, 'Clearing native SEO uses the published introduction, not legacy metadata or the pending draft.');
  assert(!fallback.html.includes(privateBody));
  await restore(familyPath);
  pass('Native SEO updates and clearing take effect immediately while body draft remains private; original body/SEO restored.');

  const restoredPlan = await prepareRefresh(api, manifest.entries, manifest.menu);
  assert.equal(restoredPlan.plans.filter(entry => entry.change).length, 0);
  assert.equal(restoredPlan.menuChange, false);
  pass('All temporary publication tests restore the completed migration state, without pending drafts.');
} catch (error) { failure = error; throw error; }
finally {
  migrationRunning = false;
  const restoreErrors = [];
  for (const path of restorations.keys()) {
    try { await restore(path); } catch (error) { restoreErrors.push(`${path}: ${error instanceof Error ? error.message : 'restore failed'}`); }
  }
  await mkdir('test-results/editorial-refresh', { recursive: true });
  await writeFile('test-results/editorial-refresh/cms-report.json', JSON.stringify({
    completedAt: new Date().toISOString(), timezone: 'America/Toronto', disposableOrigin: base.origin,
    passed: !failure && restoreErrors.length === 0, results, mutations: mutations.length,
    error: failure instanceof Error ? failure.message : failure ? 'Integration check failed.' : null, restoreErrors,
  }, null, 2) + '\n');
  if (restoreErrors.length && !failure) throw Error('Disposable content restoration failed; inspect the local CMS report.');
}
