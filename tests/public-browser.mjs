/** Read-only browser regression checks. All non-GET/HEAD requests are blocked. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4321';
const output = process.env.PUBLIC_TEST_OUTPUT || 'test-results/public-browser';
const screenshots = process.env.PUBLIC_SCREENSHOTS || `${output}/screenshots`;
await mkdir(output, { recursive: true });
await mkdir(screenshots, { recursive: true });
const seed = JSON.parse(await readFile('seed/seed.json', 'utf8'));
const routes = ['/', '/collections/', '/showroom-casablanca/', '/catalogue/', '/journal/',
  ...seed.content.families.map(entry => `/collections/${entry.slug}/`),
  ...seed.content.posts.map(entry => `/journal/${entry.slug}/`), '/confidentialite/'];
const results = [];
const failures = [];
const errors = [];
const blockedWrites = [];
const mediaUrls = new Set();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const record = (message) => { results.push(message); console.log(`PASS ${message}`); };

async function contextFor(viewport, mode, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion });
  await context.addInitScript(mode => {
    if (!localStorage.getItem('ci-mode')) localStorage.setItem('ci-mode', mode);
  }, mode);
  await context.route('**/*', async route => {
    if (!['GET', 'HEAD'].includes(route.request().method())) {
      blockedWrites.push(`${route.request().method()} ${new URL(route.request().url()).pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  return context;
}
async function open(page, route) {
  const response = await page.goto(new URL(route, base).href, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200, `${route}: HTTP status`);
  await page.locator('h1:visible').first().waitFor();
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]));
  await page.locator('header img:visible').evaluateAll(images => Promise.all(images.map(image => image.decode().catch(() => {}))));
  await page.waitForTimeout(120);
}
async function checkPage(page, route, width, mode) {
  await open(page, route);
  const state = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    mode: document.documentElement.dataset.mode,
    duplicateIds: [...document.querySelectorAll('[id]')].map(node => node.id).filter((id, i, ids) => ids.indexOf(id) !== i),
    main: !!document.querySelector('main'), footer: !!document.querySelector('footer'),
    header: (() => {
      const header = document.querySelector('.page-header');
      const brand = header?.querySelector('.page-brand');
      if (!header || !brand) return null;
      const frame = header.getBoundingClientRect();
      const mark = brand.getBoundingClientRect();
      return { top: mark.top - frame.top, bottom: frame.bottom - mark.bottom };
    })(),
  }));
  assert.equal(state.mode, mode, `${route}: persisted theme`);
  assert(state.scrollWidth <= state.width + 1, `${route} at ${width}px: horizontal overflow ${state.scrollWidth}`);
  assert.deepEqual(state.duplicateIds, [], `${route}: duplicate DOM IDs`);
  assert(state.main && state.footer, `${route}: complete streamed document`);
  if (state.header) assert(state.header.top >= 0 && state.header.bottom >= 0, `${route}: branding fits inside the header (${JSON.stringify(state.header)})`);
  for (const src of await page.locator('img').evaluateAll(images => images.map(image => image.src))) {
    if (src.startsWith(new URL(base).origin)) mediaUrls.add(src);
  }
}

try {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const mode of ['dark', 'light']) {
      const context = await contextFor(viewport, mode);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      for (const route of routes) {
        try { await checkPage(page, route, viewport.width, mode); }
        catch (error) {
          const failure = `${viewport.width}/${mode} ${route}: ${error.message}`;
          failures.push(failure);
          console.error(`FAIL ${failure}`);
        }
      }
      record(`${routes.length} public routes inspected at ${viewport.width}×${viewport.height}, ${mode}`);
      await open(page, '/catalogue/');
      assert(await page.getByRole('heading', { name: 'Poursuivons votre découverte' }).count(), 'Catalogue CMS section appears');
      const form = page.locator('[data-catalogue-form]');
      assert.equal(await form.locator('[name="communicationsConsent"]').isChecked(), false);
      assert.equal(await form.locator('[name="communicationsConsent"]').getAttribute('required'), null);
      await form.locator('button[type="submit"]').click();
      assert(await form.locator('[data-field-error="name"]').isVisible(), 'Empty name has an inline error');
      assert.equal(await form.locator('[data-field-error="name"]').textContent(), await form.getAttribute('data-name-error'), 'CMS name error is used');
      assert.equal(await form.locator('[name="name"]').getAttribute('aria-invalid'), 'true');
      assert(await form.locator('[name="name"]').evaluate(input => input === document.activeElement));
      await form.locator('[name="name"]').fill('Browser test');
      await form.locator('[name="whatsapp"]').fill('+212 600 000 005');
      await form.locator('[name="city"]').selectOption('Casablanca');
      await form.locator('[name="email"]').fill('invalid');
      await form.locator('button[type="submit"]').click();
      assert(await form.locator('[data-field-error="email"]').isVisible(), 'Invalid email has an inline error');
      assert.equal(await form.locator('[data-field-error="email"]').textContent(), await form.getAttribute('data-email-error'), 'CMS email error is used');
      assert.equal(await form.locator('[name="email"]').getAttribute('aria-invalid'), 'true');
      assert(await form.locator('[name="email"]').evaluate(input => input === document.activeElement));
      await form.locator('[name="name"]').fill('');
      await form.locator('[name="email"]').fill('');
      await page.evaluate(() => document.activeElement?.blur());
      await page.screenshot({ path: `${screenshots}/catalogue-${viewport.width}-${mode}.jpg`, type: 'jpeg', quality: 82 });
      await page.getByRole('heading', { name: 'Poursuivons votre découverte' }).evaluate(heading => {
        scrollTo(0, heading.getBoundingClientRect().top + scrollY - document.querySelector('header').offsetHeight - 30);
      });
      await page.waitForTimeout(1300);
      await page.screenshot({ path: `${screenshots}/catalogue-section-${viewport.width}-${mode}.jpg`, type: 'jpeg', quality: 82 });
      record(`Catalogue section and optional consent; invalid submissions blocked at ${viewport.width}/${mode}`);

      await open(page, '/');
      const otherMode = mode === 'dark' ? 'light' : 'dark';
      await page.locator('[data-theme-toggle]').click();
      assert.equal(await page.locator('html').getAttribute('data-mode'), otherMode);
      await page.goto(new URL('/journal/', base).href, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.locator('html').getAttribute('data-mode'), otherMode);
      assert(await page.locator('.journal-card').count() >= 5);
      if (viewport.width === 390) {
        await open(page, '/');
        const toggle = page.locator('.mobile-menu-toggle');
        await toggle.click();
        assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape');
        assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        await toggle.click();
        await page.locator('#mobile-navigation a[href="/collections/"]').first().click();
        await page.waitForURL('**/collections/');
        assert(await page.locator('.family-tile').count() >= 6);
        record(`Mobile menu opens, closes with Escape, and follows CMS navigation (${mode})`);
      }
      await context.close();
    }
  }

  for (const viewport of [{ width: 1024, height: 768 }, { width: 320, height: 740 }]) {
    const context = await contextFor(viewport, 'dark');
    const page = await context.newPage();
    for (const route of ['/', '/catalogue/', '/journal/', '/collections/']) await checkPage(page, route, viewport.width, 'dark');
    record(`Compact viewport ${viewport.width}×${viewport.height}: homepage and main inner templates fit`);
    await context.close();
  }

  const context = await contextFor({ width: 1440, height: 900 }, 'dark');
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await open(page, '/');
  await page.locator('[data-theme-toggle]').click();
  await open(page, '/catalogue/');
  assert.equal(await page.locator('html').getAttribute('data-mode'), 'light', 'Theme persists from home to inner page');
  await page.locator('[data-theme-toggle]').click();
  await open(page, '/');
  assert.equal(await page.locator('html').getAttribute('data-mode'), 'dark', 'Theme persists from inner page to home');
  const seek = async (selector, progress) => {
    await page.evaluate(({ selector, progress }) => {
      const section = document.querySelector(selector);
      scrollTo(0, section.offsetTop + Math.max(0, section.offsetHeight - innerHeight) * progress);
    }, { selector, progress });
    await page.waitForTimeout(800);
  };
  await seek('#accueil', .8);
  assert(Number(await page.locator('#accueil').evaluate(el => el.style.getPropertyValue('--g'))) > .95);
  assert(await page.locator('#accueil .over').evaluate(el => el.classList.contains('on')));
  await seek('#italie', .3);
  assert(Number(await page.locator('#italie').evaluate(el => el.style.getPropertyValue('--a'))) > .95);
  await seek('#collections', 1);
  const rail = await page.locator('#collections').evaluate(el => ({ progress: Number(el.style.getPropertyValue('--h')), cards: el.querySelectorAll('.cc:not(.cta)').length }));
  assert(rail.progress > .95 && rail.cards === 6);
  await seek('#showroom', .7);
  assert(Number(await page.locator('#showroom').evaluate(el => el.style.getPropertyValue('--r'))) > .95);
  await seek('#catalogue', .6);
  assert(Number(await page.locator('#catalogue').evaluate(el => el.style.getPropertyValue('--c'))) > .95);
  record('Desktop hero, brand reveal, six-family rail, showroom transition, catalogue animation and cross-page themes');
  await context.close();

  const reduced = await contextFor({ width: 1440, height: 900 }, 'light', 'reduce');
  const reducedPage = await reduced.newPage();
  await open(reducedPage, '/');
  assert.equal(await reducedPage.locator('html').evaluate(el => el.classList.contains('motion-ready')), false);
  assert.equal(await reducedPage.locator('#accueil .pin').evaluate(el => getComputedStyle(el).position), 'relative');
  assert.equal(await reducedPage.locator('#accueil .over a[inert]').count(), 0);
  record('Reduced-motion homepage stays readable in normal document flow');
  await reduced.close();
  for (const src of mediaUrls) {
    const response = await fetch(src, { signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, `Public media ${new URL(src).pathname}`);
    assert.match(response.headers.get('content-type') || '', /^image\//);
    await response.body?.cancel();
  }
  record(`${mediaUrls.size} distinct public image URLs respond with image content`);
  assert.deepEqual(blockedWrites, [], 'No attempted writes during read-only browser tests');
  assert.deepEqual(errors, [], 'No application JavaScript exceptions');
  assert.deepEqual(failures, [], 'Public page failures');
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify({ base, results, failures, errors, blockedWrites, mediaCount: mediaUrls.size }, null, 2));
}
