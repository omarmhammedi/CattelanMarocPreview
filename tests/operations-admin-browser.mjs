/** Real native admin rendering with synthetic intercepted list responses.
 * All mutations are blocked. No contact is persisted or submitted, no email or
 * CRM action is triggered. Use only a marked disposable local CMS/session.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { integrationEnvironment } from './integration-environment.mjs';

const base = await integrationEnvironment();
const output = resolve(process.env.OPS_ADMIN_TEST_OUTPUT || 'test-results/operations-admin');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
const context = await browser.newContext({ storageState: '.wrangler/cms-sync-session.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const checks = [], screenshots = [], errors = [], blockedWrites = [];
const when = Date.UTC(2026, 9, 5, 10);
const requestBase = { schemaVersion: 1, createdAt: when, whatsapp: '+212 600 000 001', message: 'Résidence Hôtel : revoir les finitions.', model: null, sourcePath: '/votre-projet/', notifyStatus: 'sent', crmStatus: 'waiting_configuration' };
const requests = [{ ...requestBase, requestId: 'synthetic-project', kind: 'projet', name: 'Synthetic Projet', city: 'Rabat', route: 'piece', architect: true },
  { ...requestBase, requestId: 'synthetic-appointment', kind: 'rendez-vous', name: 'Synthetic Rendez-vous', city: 'Casablanca', day: '2026-10-06', period: 'matin', notifyStatus: 'failed' }];
const contactBase = { createdAt: when, whatsapp: '+212 600 000 002', communicationsConsent: false, catalogueTitle: 'Catalogue synthétique', placeholder: true, crmStatus: 'waiting_configuration', crmAttempts: 1, sourcePath: '/catalogue/', consentVersion: 'synthetic-v1' };
const contacts = [{ ...contactBase, requestId: 'synthetic-failed', name: 'Synthetic Échec', email: 'failed@example.test', city: 'Rabat', emailStatus: 'failed' },
  { ...contactBase, requestId: 'synthetic-sent', name: 'Synthetic Envoi', email: 'sent@example.test', city: 'Casablanca', emailStatus: 'sent', emailSentAt: when + 1000 }];
await context.route('**/*', route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin !== base.origin) return route.abort();
  if (!['GET', 'HEAD'].includes(request.method())) { blockedWrites.push(`${request.method()} ${url.pathname}`); return route.abort(); }
  const items = url.pathname === '/_emdash/api/plugins/contact-requests/list' ? requests
    : url.pathname === '/_emdash/api/plugins/catalogue-leads/contacts' ? contacts : null;
  if (items) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { items, hasMore: false } }) });
  return route.continue();
});
page.on('pageerror', error => errors.push(error.message));
const record = message => { checks.push(message); console.log(`PASS ${message}`); };
async function open(path, heading) {
  await page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' });
  const welcome = page.getByRole('button', { name: /Get Started|Commencer/i });
  const title = page.getByRole('heading', { name: heading, exact: true });
  await Promise.race([welcome.first().waitFor(), title.waitFor()]);
  if (await welcome.count() && await welcome.first().isVisible()) await welcome.first().click();
  await title.waitFor();
  await page.getByText('2 sur 2 demandes chargées.', { exact: false }).waitFor();
}
async function capture(name) { await page.screenshot({ path: `${output}/${name}.png`, fullPage: false }); screenshots.push(`${name}.png`); }
let failure;
try {
  await open('/_emdash/admin/plugins/contact-requests/requests', 'Rendez-vous et projets');
  assert.equal(await page.locator('table thead th').count(), 6);
  await page.getByRole('combobox', { name: 'Type de demande' }).selectOption('projet');
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('residence hotel rabat');
  assert.equal(await page.locator('tbody tr').count(), 1);
  assert((await page.locator('tbody').innerText()).includes('Un meuble · avec un architecte'));
  await page.getByLabel('Consulter la demande de Synthetic Projet', { exact: true }).click();
  assert((await page.locator('details[open]').innerText()).includes('Résidence Hôtel'));
  await capture('requests-filtered-details');
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('absent');
  await page.getByText('Aucune demande chargée ne correspond aux filtres.').waitFor();
  await page.getByRole('button', { name: 'Effacer les filtres' }).click();
  assert.equal(await page.locator('tbody tr').count(), 2);
  record('Demandes : recherche sans accents, filtres, état vide et réinitialisation fonctionnent ; le choix architecte accompagne le libellé canonique « Un meuble » dans la synthèse et les détails.');

  await open('/_emdash/admin/plugins/catalogue-leads/contacts', 'Contacts catalogue');
  assert.equal(await page.locator('table thead th').count(), 6);
  await page.getByRole('combobox', { name: 'Envoi du catalogue', exact: true }).selectOption('failed');
  await page.getByRole('searchbox', { name: 'Rechercher' }).fill('echec rabat');
  assert.equal(await page.locator('tbody tr').count(), 1);
  await page.getByLabel('Consulter la demande de Synthetic Échec', { exact: true }).click();
  assert((await page.locator('details[open]').innerText()).includes('Non demandées'));
  assert((await page.locator('details[open]').innerText()).includes('synthetic-v1'));
  assert((await page.locator('#contacts-filter-scope').innerText()).includes('l’export CSV contient toutes les demandes'));
  await capture('catalogue-filtered-details');
  await page.getByRole('button', { name: 'Effacer les filtres' }).click();
  assert.equal(await page.locator('tbody tr').count(), 2);
  record('Contacts catalogue : filtres d’envoi, recherche, détails de consentement et réinitialisation fonctionnent ; la portée limitée aux demandes chargées et celle de l’export complet sont explicites.');

  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Native admin must not overflow the mobile viewport.');
  await capture('catalogue-admin-mobile');
  await page.getByRole('link', { name: 'Remplacer un PDF', exact: true }).click();
  await page.getByRole('heading', { name: 'Remplacer un catalogue PDF' }).waitFor();
  assert(await page.locator('#catalogue-contacts').isHidden());
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await capture('catalogue-pdf-mobile');
  record('Mobile 390 px : tableau défilant sans débordement de page et accès direct au panneau PDF.');
  assert.deepEqual(errors, []); assert.deepEqual(blockedWrites, []);
} catch (error) { failure = error; await capture('operations-editor-failure').catch(() => {}); }
finally {
  await writeFile(`${output}/operations-admin-report.json`, `${JSON.stringify({ completedAt: new Date().toISOString(), origin: base.origin, syntheticInterceptedLists: true, noStoredContacts: true, passed: !failure, checks, screenshots, errors, blockedWrites, failure: failure?.message || null }, null, 2)}\n`);
  await context.close(); await browser.close();
}
if (failure) throw failure;
