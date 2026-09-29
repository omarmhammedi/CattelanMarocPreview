/** Read-only verification of the published location and on-demand Google map. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4321';
const output = process.env.PUBLIC_TEST_OUTPUT || 'test-results/showroom-browser';
const screenshots = process.env.PUBLIC_SCREENSHOTS || `${output}/screenshots`;
await mkdir(screenshots, { recursive: true });
const records = [], blockedWrites = [], mapResponses = [], providerReads = [];
// Only map services count here: the existing Google Fonts requests are separate.
const isGoogleMap = url => /\/(?:maps\/embed|maps-api-v3\/)|maps\.googleapis\.com/.test(url);
const engines = process.argv.includes('--chromium-only') ? { chromium } : { chromium, webkit };
for (const [engine, launcher] of Object.entries(engines)) {
  const launch = () => launcher.launch({ headless: true, ...(engine === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  let browser;
  try {
    for (const [width, height] of [[1440, 900], [1280, 720], [1024, 768], [390, 844], [320, 740]]) for (const mode of ['dark', 'light']) {
      // Release Google's renderer resources between viewport cases in a small Codespace.
      browser = await launch();
      const context = await browser.newContext({ viewport: { width, height } });
      await context.addInitScript(mode => localStorage.setItem('ci-mode', mode), mode);
      await context.route('**/*', route => {
        if (!['GET', 'HEAD'].includes(route.request().method())) {
          // Google fetches viewport/place overlays through this read-only POST RPC.
          // Keep it functional while still rejecting every write to our own CMS.
          const url = new URL(route.request().url());
          if (route.request().method() === 'POST' && url.origin === 'https://maps.googleapis.com' &&
              url.pathname === '/$rpc/google.internal.maps.mapsjs.v1.MapsJsInternalService/GetViewportInfo') {
            providerReads.push(url.pathname);
            return route.continue();
          }
          blockedWrites.push({ origin: new URL(route.request().url()).origin, method: route.request().method() });
          return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      const errors = [], mapRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (isGoogleMap(request.url())) mapRequests.push(request.url()); });
      page.on('response', response => { if (response.url().startsWith('https://www.google.com/maps/embed')) mapResponses.push({ engine, width, mode, status: response.status() }); });
      const open = async path => {
        const response = await page.goto(new URL(path, base).href, { waitUntil: 'load' });
        assert.equal(response.status(), 200);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(200);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, `${engine}/${width}/${mode}${path}: overflow`);
        assert.equal(await page.locator('html').getAttribute('data-mode'), mode);
      };
      await open('/');
      assert.equal(mapRequests.length, 0, 'Homepage must not load Google Maps');
      assert.equal(await page.locator('iframe').count(), 0);
      assert(await page.locator('a[href="tel:+212771105490"]').count() >= 3, 'Homepage phone links');
      const plan = page.locator(width > 820 ? '#plan' : '#m-plan');
      const directions = new URL(await plan.getByRole('link', { name: 'Itinéraire', exact: true }).getAttribute('href'));
      assert.equal(directions.searchParams.get('destination_place_id'), 'ChIJnXzIEVjTpw0RXul0XQgeEHw');
      assert.equal(directions.pathname, '/maps/dir/');
      assert.equal(await page.locator('#city-map g[transform="translate(806 530)"]').count(), 1, 'Illustration marker geometry preserved');
      await plan.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      if (engine === 'chromium' && [1440, 390].includes(width)) await page.screenshot({ path: `${screenshots}/home-map-${width}-${mode}.jpg`, type: 'jpeg', quality: 83 });
      if (width > 820) {
        await page.evaluate(() => { const section = document.querySelector('#showroom'); scrollTo(0, section.offsetTop + section.offsetHeight - innerHeight); });
        await page.waitForTimeout(1200);
        const bounds = await page.locator('#showroom .info').boundingBox();
        assert(bounds && bounds.y >= 0 && bounds.y + bounds.height <= height + 1, `Homepage showroom facts fit its scene at ${width}×${height}: ${JSON.stringify(bounds)}`);
      }
      await open('/showroom-casablanca/');
      assert.equal(mapRequests.length, 0, 'No map request before activation');
      assert.equal(await page.locator('iframe').count(), 0);
      const contact = page.locator('#showroom-contact');
      assert.match(await contact.innerText(), /8–10 Avenue Mohamed Sijilmassi/);
      assert.match(await contact.innerText(), /Lundi/);
      assert.match(await contact.innerText(), /Dimanche/);
      assert.equal(await contact.locator('a[href="tel:+212771105490"]').count(), 1);
      assert.equal(await page.locator('a[href*="wa.me"]').count(), 0, 'Unconfirmed WhatsApp omitted');
      assert.equal(await page.locator('.showroom-editorial a[href="#showroom-contact"]').count(), 1, 'Contact CTA goes to usable details');
      const toggle = page.getByRole('button', { name: 'Afficher la carte interactive' });
      await toggle.focus();
      await page.keyboard.press('Enter');
      const iframe = page.locator('[data-showroom-map-frame] iframe');
      await iframe.waitFor();
      assert.match(await iframe.getAttribute('src'), /^https:\/\/www\.google\.com\/maps\/embed\?pb=/);
      assert.match(await iframe.getAttribute('title'), /Cattelan Italia/);
      assert.equal(await iframe.getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
      assert.equal(await page.locator('[data-showroom-map-toggle]').getAttribute('aria-expanded'), 'true');
      await iframe.scrollIntoViewIfNeeded();
      await page.waitForTimeout(2500);
      assert(mapRequests.length > 0, 'Map requested after activation');
      const bounds = await iframe.boundingBox();
      assert(bounds && bounds.width >= 200 && bounds.x >= 0 && bounds.x + bounds.width <= width + 1, 'Google map stays usable and inside viewport');
      if (engine === 'chromium' && [1440, 390].includes(width)) await page.screenshot({ path: `${screenshots}/showroom-map-${width}-${mode}.jpg`, type: 'jpeg', quality: 83 });
      await page.locator('[data-showroom-map-toggle]').focus();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('iframe').count(), 0);
      assert.equal(await page.locator('[data-showroom-map-toggle]').getAttribute('aria-expanded'), 'false');
      await page.keyboard.press('Space');
      assert.equal(await page.locator('iframe').count(), 1);
      await page.locator('[data-showroom-map-toggle]').click();
      assert.equal(await page.locator('iframe').count(), 0);
      assert.deepEqual(errors, [], 'No application JavaScript errors');
      records.push({ engine, width, height, mode, passed: true });
      console.log(`PASS ${engine} ${width}px ${mode}: contacts, illustration, on-demand map, keyboard`);
      await context.close();
      await browser.close();
    }
    if (engine === 'chromium') {
      browser = await launch();
      for (const width of [320, 1024, 1280]) {
        const context = await browser.newContext({ viewport: { width, height: width === 320 ? 740 : 720 }, javaScriptEnabled: false });
        const page = await context.newPage();
        const requests = [];
        page.on('request', request => { if (isGoogleMap(request.url())) requests.push(request.url()); });
        await page.goto(new URL('/showroom-casablanca/', base).href, { waitUntil: 'load' });
        assert.equal(await page.locator('[data-showroom-map-toggle]').isVisible(), false);
        assert.equal(await page.locator('iframe').count(), 0);
        assert.equal(requests.length, 0);
        assert(await page.getByRole('link', { name: /Préparer l’itinéraire/ }).count());
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
        records.push({ engine, width, javaScript: false, passed: true });
        await context.close();
      }
    }
  } finally { await browser?.close(); }
}
assert(!blockedWrites.some(request => request.origin === new URL(base).origin), 'No primary write attempted');
assert(mapResponses.some(response => response.status === 200), 'At least one real Google embed returned HTTP 200');
await writeFile(`${output}/report.json`, JSON.stringify({ verifiedAt: new Date().toISOString(), base, records, mapResponses, googleViewportReads: providerReads.length, blockedExternalWrites: blockedWrites.length }, null, 2) + '\n');
