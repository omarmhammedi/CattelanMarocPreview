/** Native current-schema regression in a marked local disposable EmDash only.
 * Run after native setup, synthetic fixture hydration, and migrations 0025/0026.
 * Native admin session: .wrangler/cms-sync-session.json. No email is enabled.
 * Local fixture preparation may publish the new privacy/settings migration draft.
 */
import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {integrationEnvironment} from './integration-environment.mjs';
const base = await integrationEnvironment();
const output = resolve(process.env.EDITOR_TEST_OUTPUT || 'test-results/editor-readiness');
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
const context = await browser.newContext({storageState: '.wrangler/cms-sync-session.json', viewport: {width: 1440, height: 1000}});
const page = await context.newPage();
const results = [], screenshots = [], errors = [];
page.on('pageerror', error => errors.push(error.message));
const record = message => {results.push(message); console.log(`PASS ${message}`);};
async function api(path, method = 'GET', body, allowFailure = false) {
  const result = await page.evaluate(async ({path, method, body}) => {
    const response = await fetch(path, {method, credentials: 'same-origin', signal: AbortSignal.timeout(30000),
      headers: {'X-EmDash-Request': '1', ...(body === undefined ? {} : {'Content-Type': 'application/json'})},
      ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    let value; try {value = await response.json();} catch {value = {};}
    return {status: response.status, value};
  }, {path, method, body});
  if (allowFailure) return result;
  assert(result.status >= 200 && result.status < 300 && result.value.success !== false,
    `${method} ${path.split('?')[0]} failed (${result.status}): ${result.value.error?.message || 'native API error'}`);
  return result.value.data;
}
async function html(path) {
  const response = await fetch(new URL(path, base), {headers: {'Cache-Control': 'no-cache'}, signal: AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, `Public ${new URL(path, base).pathname}`);
  return response.text();
}
async function publish(path) {const current = await api(path); await api(`${path}/publish`, 'POST', {_rev: current._rev});}
async function save(path, data) {const current = await api(path); await api(path, 'PUT', {data, _rev: current._rev});}
function editorialData(value) {
  if (Array.isArray(value)) return value.map(editorialData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([,child]) => child != null && child !== '' && !(Array.isArray(child) && !child.length)).map(([key, child]) => [key,
    key === 'meta' && value.provider === 'local' && value.id ? {storageKey: child?.storageKey} : editorialData(child)]));
}
async function restore(path, before) {
  const current = await api(path);
  const cleared = Object.fromEntries(Object.keys(current.item.data).filter(key => !(key in before.item.data)).map(key => [key, null]));
  await api(path, 'PUT', {data: {...cleared, ...before.item.data}, slug: before.item.slug, _rev: current._rev});
  await publish(path);
  const restored = await api(path);
  assert.deepEqual(editorialData(restored.item.data), editorialData(before.item.data), 'Original content must be restored after the fixture.');
}
async function screenshot(name) {
  await page.screenshot({path: `${output}/${name}.png`, fullPage: false}); screenshots.push(`${name}.png`);
}
async function dismissWelcome() {
  const buttons = page.getByRole('button', {name: /Get Started|Commencer|Dismiss|Fermer/i});
  if (await buttons.count()) await buttons.first().click();
}
async function prepareMigratedFixture() {
  const seed = JSON.parse(await readFile('seed/seed.json', 'utf8'));
  const globals = await api('/_emdash/api/content/site_content/global');
  if (!globals.item.data.public_email) await save('/_emdash/api/content/site_content/global', {public_email: seed.content.site_content.find(item => item.slug === 'global').data.public_email});
  for (const path of ['/_emdash/api/content/site_content/global', '/_emdash/api/content/pages/confidentialite']) {
    const entry = await api(path);
    if (entry.item.status !== 'published' || entry.item.draftRevisionId) await publish(path);
  }
  record('Brouillons créés par la migration publiés uniquement dans la fixture locale ; aucune ressource distante utilisée.');
}
async function checkCurrentSchema() {
  const seed = JSON.parse(await readFile('seed/seed.json', 'utf8'));
  for (const collection of seed.collections) {
    const schema = (await api(`/_emdash/api/schema/collections/${collection.slug}?includeFields=true`)).item;
    for (const field of collection.fields) assert(schema.fields.some(value => value.slug === field.slug && value.type === field.type), `Current schema missing ${collection.slug}.${field.slug}`);
    const entries = (await api(`/_emdash/api/content/${collection.slug}?limit=100`)).items;
    assert.deepEqual(entries.map(item => item.slug).sort(), seed.content[collection.slug].map(item => item.slug).sort());
    if (['site_content', 'catalogues'].includes(collection.slug)) assert(!schema.hasSeo, `${collection.slug} must not display an unused SEO panel.`);
  }
  record('Les six collections, les 66 entrées et chaque champ du schéma courant sont présents ; SEO seulement sur les contenus publics propriétaires.');
}
async function checkNativeGuards() {
  const globalPath = '/_emdash/api/content/site_content/global';
  const global = await api(globalPath);
  for (const data of [{analytics_token: 'incorrect'}, {public_email: ''}, {public_email: 'invalid-address'}, {form_name_label: ''}, {editorial_copy: {...global.item.data.editorial_copy, action_catalogue_label: '   '}}]) {
    const before = await api(globalPath);
    const rejected = await api(globalPath, 'PUT', {data, _rev: before._rev}, true);
    assert(rejected.status >= 400 && rejected.status < 500 && rejected.value.success === false, `Native guard did not reject ${Object.keys(data)[0]}`);
    const after = await api(globalPath);
    assert.deepEqual(after.item.data, before.item.data); assert.equal(after._rev, before._rev);
  }
  const homePath = '/_emdash/api/content/pages/home';
  for (const data of [{route_key: 'catalogue'}, {sections: [{section_key: 'brand'}, {section_key: 'brand'}]}]) {
    const before = await api(homePath);
    const rejected = await api(homePath, 'PUT', {data, _rev: before._rev}, true);
    assert(rejected.status >= 400 && rejected.status < 500 && rejected.value.success === false, 'Native page ownership guard must reject unsafe edits.');
    assert.equal((await api(homePath))._rev, before._rev);
  }
  const privacyPath = '/_emdash/api/content/pages/confidentialite';
  const privacy = await api(privacyPath);
  const invalidPrivacy = await api(privacyPath, 'PUT', {data: {content: []}, _rev: privacy._rev}, true);
  assert(invalidPrivacy.status >= 400 && invalidPrivacy.status < 500 && invalidPrivacy.value.success === false, 'Privacy factual slots must be preserved.');
  assert.equal((await api(privacyPath))._rev, privacy._rev);
  for (const path of [homePath, globalPath]) {
    const before = await api(path);
    const fixedPath = `/_emdash/api/content/${path.includes('site_content') ? 'site_content' : 'pages'}/${before.item.id}`;
    for (const update of [{slug: `fixture-broken-${before.item.id.toLowerCase()}`}, {status: 'draft'}]) {
      const rejected = await api(fixedPath, 'PUT', {...update, _rev: before._rev}, true);
      assert(rejected.status >= 400 && rejected.status < 500 && rejected.value.success === false,
        'Protected-route slug/status changes must be rejected before the native API can mutate live state.');
      const after = await api(fixedPath);
      assert.equal(after.item.slug, before.item.slug); assert.equal(after.item.status, before.item.status);
      assert.equal(after._rev, before._rev);
      assert((await html('/')).includes('<h1'), 'The published home must remain available after rejection.');
    }
    const current = await api(fixedPath);
    const unpublish = await api(`${fixedPath}/unpublish`, 'POST', {_rev: current._rev}, true);
    assert(unpublish.status >= 400 && unpublish.status < 500 && unpublish.value.success === false, 'A permanent public owner must not unpublish.');
    const deleted = await api(fixedPath, 'DELETE', {_rev: current._rev}, true);
    assert(deleted.status >= 400 && deleted.status < 500 && deleted.value.success === false, 'A permanent public owner must not be deleted.');
    assert.equal((await api(fixedPath)).item.status, 'published');
  }
  record('API native : e-mail vide ou malformé, libellés vides, jeton incorrect, identité modifiée, sections dupliquées et confidentialité incomplète refusés ; identifiants protégés à la publication, suppression/dépublication bloquées.');
}
async function checkGroupedUi() {
  await page.goto(new URL('/_emdash/admin/plugins/cattelan-editorial/site', base).href, {waitUntil: 'domcontentloaded'});
  await Promise.race([page.getByRole('button', {name: 'Get Started', exact: true}).waitFor({timeout: 30000}), page.getByRole('heading', {name: 'Piloter le site Cattelan', exact: true}).waitFor({timeout: 30000})]);
  await dismissWelcome();
  await page.getByRole('heading', {name: 'Piloter le site Cattelan', exact: true}).waitFor({timeout: 30000});
  assert(await page.getByRole('link', {name: 'Remplacer le PDF du catalogue', exact: true}).isVisible());
  await screenshot('admin-tasks-desktop');
  const path = '/_emdash/api/content/site_content/global';
  const before = await api(path);
  assert(!before.item.draftRevisionId, 'The UI test must not replace pending edits.');
  const marker = `SHOWROOM-FIXTURE-${Date.now()}`;
  let changed = false;
  try {
    await page.goto(new URL('/_emdash/admin/plugins/cattelan-editorial/settings', base).href, {waitUntil: 'domcontentloaded'});
    await page.locator('#setting-address').waitFor({timeout: 30000});
    assert(await page.locator('#settings-contact').evaluate(element => element.open));
    await screenshot('admin-settings-desktop');
    await page.locator('#setting-address').fill(marker);
    changed = true;
    await page.getByRole('button', {name: 'Enregistrer le brouillon', exact: true}).first().click();
    await page.getByRole('status').filter({hasText: 'Brouillon enregistré.'}).waitFor({timeout: 30000});
    assert(!(await html('/showroom-casablanca/')).includes(marker));
    await page.getByRole('button', {name: 'Préparer la prévisualisation', exact: true}).click();
    const preview = page.getByRole('link', {name: 'Ouvrir le brouillon dans un nouvel onglet', exact: true});
    await preview.waitFor();
    const url = await preview.getAttribute('href');
    assert((await html(url)).includes(marker), 'Grouped editor preview must show its saved native draft.');
    await page.getByRole('button', {name: 'Publier les réglages', exact: true}).click();
    await page.getByRole('status').filter({hasText: 'Réglages publiés.'}).waitFor({timeout: 30000});
    assert((await html('/showroom-casablanca/')).includes(marker));
    await page.locator('#settings-analytics > summary').click();
    await page.locator('#setting-analytics_token').fill('bad-token');
    await page.getByRole('button', {name: 'Enregistrer le brouillon', exact: true}).first().click();
    await page.getByRole('alert').filter({hasText: '32 caractères hexadécimaux'}).waitFor();
    assert.notEqual((await api(path)).item.data.analytics_token, 'bad-token');
    await page.getByRole('button', {name: 'Annuler mes changements non enregistrés'}).click();
    await page.setViewportSize({width: 390, height: 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Grouped admin settings must fit the mobile viewport.');
    await screenshot('admin-settings-mobile');
    record('Réglages groupés : modification UI → brouillon isolé → aperçu signé → publication réelle ; validation accessible et interface mobile sans débordement.');
  } finally {
    if (changed) await restore(path, before);
    await page.setViewportSize({width: 1440, height: 1000});
  }
}
async function checkBusinessBindings() {
  const path = '/_emdash/api/content/site_content/global';
  const before = await api(path);
  const marker = `COPY-FIXTURE-${Date.now()}`;
  const values = {footer_valet_text: `${marker}-valet`, model_services: `${marker}-services`, model_quote_note: `${marker}-quote`,
    request_architect_label: `${marker}-architect`, request_project_submit: `${marker}-submit`, form_hint: `${marker}-hint`, form_privacy: `${marker}-privacy`,
    catalogue_whatsapp_label: `${marker}-whatsapp`, catalogue_city_label: `${marker}-city`, action_catalogue_label: `${marker}-catalogue`,
    privacy_controller_name: `${marker}-controller`, privacy_updated_label: `${marker}-updated`};
  try {
    const {form_hint, form_privacy, ...copyValues} = values;
    await save(path, {form_hint, form_privacy, editorial_copy: {...before.item.data.editorial_copy, ...copyValues}});
    assert(!(await html('/')).includes(marker));
    const preview = await api(`${path}/preview-url`, 'POST', {});
    assert((await html(preview.url)).includes(`${marker}-valet`));
    await publish(path);
    const home = await html('/');
    for (const suffix of ['valet', 'hint', 'privacy', 'catalogue']) assert(home.includes(`${marker}-${suffix}`), `Missing global ${suffix} binding.`);
    const model = await html('/modeles/skorpio/');
    for (const suffix of ['services', 'quote']) assert(model.includes(`${marker}-${suffix}`));
    const project = await html('/votre-projet/');
    for (const suffix of ['architect', 'submit']) assert(project.includes(`${marker}-${suffix}`));
    const catalogue = await html('/catalogue/');
    for (const suffix of ['hint', 'privacy', 'whatsapp', 'city']) assert(catalogue.includes(`${marker}-${suffix}`));
    const privacy = await html('/confidentialite/');
    for (const suffix of ['controller', 'updated']) assert(privacy.includes(`${marker}-${suffix}`));
    assert(!/\{\{[a-z_]+\}\}/u.test(privacy), 'Privacy factual variables must resolve before rendering.');
    const latest = await api(path);
    await save(path, {form_hint: '', form_privacy: '', editorial_copy: {...latest.item.data.editorial_copy, footer_valet_text: '', model_services: '', model_quote_note: ''}});
    assert((await html('/modeles/skorpio/')).includes(`${marker}-services`));
    await publish(path);
    const cleared = await html('/modeles/skorpio/');
    assert(!cleared.includes('class="model-services"') && !cleared.includes(`${marker}-services`) && !cleared.includes(`${marker}-quote`));
    assert(!(await html('/')).includes(`${marker}-valet`));
    record('Services, devis, boutons, messages catalogue, formulaires et faits légaux : brouillon/publication connectés ; effacement des textes facultatifs sans ancien texte réintroduit.');
  } finally {await restore(path, before);}
}
async function checkSeo() {
  const path = '/_emdash/api/content/pages/home';
  const before = await api(path);
  const marker = `SEO-FIXTURE-${Date.now()}`;
  try {
    await api(path, 'PUT', {_rev: before._rev, seo: {title: marker, description: `${marker}-description`, canonical: new URL('/canonical-fixture/', base).href}});
    const changed = await api(path);
    assert.equal(changed.item.draftRevisionId, before.item.draftRevisionId);
    assert.equal(changed.item.liveRevisionId, before.item.liveRevisionId);
    const publicPage = await html('/');
    assert(publicPage.includes(`<title>${marker}</title>`));
    assert(publicPage.includes(`${marker}-description`));
    assert(publicPage.includes('/canonical-fixture/'));
    const current = await api(path);
    await api(path, 'PUT', {_rev: current._rev, seo: {title: null, description: null, canonical: null}});
    const cleared = await html('/');
    assert(!cleared.includes(marker));
    assert.match(cleared, /<title>[^<]+<\/title>/u);
    assert.match(cleared, /noindex/u);
    const robots = await fetch(new URL('/robots.txt', base));
    assert.match(await robots.text(), /Disallow: \/\s/u);
    const sitemap = await fetch(new URL('/sitemap.xml', base));
    assert(!(await sitemap.text()).includes('<loc>'), 'Preview sitemap must remain empty.');
    record('SEO natif : changement immédiat sans révision de contenu, titre/description/canonique connectés, effacement accepté ; préproduction noindex et sitemap vide conservés.');
  } finally {
    const current = await api(path);
    await api(path, 'PUT', {_rev: current._rev, seo: before.item.seo});
    assert.deepEqual((await api(path)).item.seo, before.item.seo);
  }
}
async function checkOperationsUi() {
  for (const [route, name, heading] of [
    ['/_emdash/admin/plugins/contact-requests/requests', 'admin-requests', 'Rendez-vous et projets'],
    ['/_emdash/admin/plugins/catalogue-leads/contacts', 'admin-catalogue', 'Catalogue'],
  ]) {
    await page.goto(new URL(route, base).href, {waitUntil: 'domcontentloaded'});
    await page.getByRole('heading').filter({hasText: heading}).first().waitFor({timeout: 30000});
    await page.waitForTimeout(300);
    await screenshot(name);
  }
  record('Panneaux opérationnels chargés avec leur session native ; capture des demandes et du catalogue sans créer de contact ni envoyer d’e-mail.');
}
let failure;
try {
  await page.goto(new URL('/_emdash/api/setup/status', base).href);
  await api('/_emdash/api/dashboard');
  await prepareMigratedFixture();
  await checkCurrentSchema();
  if (!process.argv.includes('--prepare-only')) {
    await checkNativeGuards();
    if (!process.argv.includes('--guards-only')) {
      await checkGroupedUi();
      await checkBusinessBindings();
      await checkSeo();
      await checkOperationsUi();
    }
  }
  assert.deepEqual(errors, [], 'The native editor must not raise browser exceptions.');
} catch (error) {failure = error; console.error(error.stack || error.message);}
finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify({completedAt: new Date().toISOString(), disposableOrigin: base.origin,
    passed: !failure, suite: process.argv.includes('--prepare-only') ? 'fixture-preparation-only' : process.argv.includes('--guards-only') ? 'native-api-guards' : 'full', results, screenshots, browserErrors: errors,
    fixture: 'Current schema and content; synthetic images/PDF. Tests do not verify original media bytes or live deployment.',
    ...(failure ? {error: failure.message} : {})}, null, 2));
}
if (failure) process.exitCode = 1;
