/** Anonymous, read-only verification of the real styled homepage map. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
const base = process.env.PUBLIC_TEST_URL || 'http://localhost:4321';
const output = process.env.PUBLIC_TEST_OUTPUT || 'test-results/geographic-map';
const selectedEngine = process.env.PUBLIC_TEST_ENGINE;
assert(!selectedEngine || ['chromium', 'webkit'].includes(selectedEngine), 'Unknown browser engine');
await mkdir(`${output}/screenshots`, { recursive: true });
const results = [], errors = [], writes = [], externalMaps = [];
const source = JSON.parse(await readFile('src/data/casablanca-map.json', 'utf8'));
const dataResponse = await fetch(new URL('/cartographie/casablanca.json', base));
assert.equal(dataResponse.status, 200);
assert.match(dataResponse.headers.get('x-robots-tag'), /noindex/);
assert.deepEqual(await dataResponse.json(), source, 'The attributed derivative dataset is actually available for download');

for (const [engine, launcher] of Object.entries({ chromium, webkit })) {
  if (selectedEngine && selectedEngine !== engine) continue;
  const browser = await launcher.launch({ headless: true, ...(engine === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
  try {
    for (const [width, height] of [[1440, 900], [1024, 768], [390, 844], [320, 740]]) for (const mode of ['dark', 'light']) {
      const context = await browser.newContext({ viewport: { width, height }, ...(width < 821 ? { hasTouch: true } : {}) });
      await context.addInitScript(mode => localStorage.setItem('ci-mode', mode), mode);
      await context.route('**/*', route => {
        const request = route.request();
        if (!['GET', 'HEAD'].includes(request.method())) { writes.push(request.method()); return route.abort(); }
        if (/overpass|tile\.openstreetmap|maps\/embed|maps\.googleapis/.test(request.url())) externalMaps.push(request.url());
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(base, { waitUntil: 'load' });
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);
      const plan = page.locator(width > 820 ? '#plan' : '#m-plan');
      await plan.evaluate(section => scrollTo({ top: section.getBoundingClientRect().top + scrollY - (innerWidth <= 820 ? document.querySelector('header').offsetHeight : 0), behavior: 'instant' }));
      await page.waitForTimeout(1200);
      const map = plan.locator('[data-geographic-map]');
      const viewport = map.locator('[data-map-viewport]');
      const svg = map.locator('[data-map-svg]');
      const marker = map.locator('[data-showroom-marker]');
      assert.equal(await marker.getAttribute('data-latitude'), '33.5927007');
      assert.equal(await marker.getAttribute('data-longitude'), '-7.6426741');
      assert.equal(await page.locator('#city-map').count(), 0, 'Decorative street grid has been replaced');
      assert.equal(await page.locator('#casablanca-geography').count(), 1, 'One shared source geometry for desktop/mobile');
      assert.equal(await page.locator('#casablanca-geography path').count(), 5, 'Sea, coast and three merged road layers');
      assert.equal(await map.locator('.geographic-map-attribution a').first().getAttribute('href'), 'https://www.openstreetmap.org/copyright');
      assert.equal(await map.locator('.geographic-map-attribution').isVisible(), true);
      assert.equal(await map.locator('[data-map-controls]').isVisible(), true);
      assert.equal(await map.getAttribute('data-panning'), 'false');
      assert.equal(await viewport.evaluate(element => getComputedStyle(element).touchAction), 'pan-y pinch-zoom');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
      assert.equal(await page.locator('html').getAttribute('data-mode'), mode);
      const color = await page.locator('#casablanca-geography .m-land').evaluate(element => getComputedStyle(element).fill);
      assert.equal(color, mode === 'dark' ? 'rgb(10, 24, 30)' : 'rgb(241, 237, 230)', 'Original land palette retained');
      if (engine === 'chromium' && [1440, 390].includes(width)) await page.screenshot({ path: `${output}/screenshots/home-${width}-${mode}.jpg`, type: 'jpeg', quality: 85 });
      const initial = await svg.getAttribute('viewBox');
      await map.locator('[data-map-zoom-in]').click();
      assert(Number(await map.getAttribute('data-zoom')) > 1);
      assert.notEqual(await svg.getAttribute('viewBox'), initial);
      await map.locator('[data-map-zoom-in]').click();
      await map.locator('[data-map-zoom-in]').click();
      assert.equal(await map.getAttribute('data-zoom-detail'), 'true');
      assert.equal(await map.locator('.map-detail-labels').evaluate(element => getComputedStyle(element).display), 'inline');
      if (engine === 'chromium' && [1440, 390].includes(width)) await page.screenshot({ path: `${output}/screenshots/zoom-${width}-${mode}.jpg`, type: 'jpeg', quality: 85 });
      await viewport.focus();
      const beforeArrow = await svg.getAttribute('viewBox');
      await page.keyboard.press('ArrowRight');
      assert.notEqual(await svg.getAttribute('viewBox'), beforeArrow);
      await page.keyboard.press('Home');
      assert.equal(await svg.getAttribute('viewBox'), initial);
      await map.locator('[data-map-pan]').click();
      assert.equal(await map.getAttribute('data-panning'), 'true');
      const bounds = await viewport.boundingBox();
      const x = bounds.x + bounds.width * .7, y = bounds.y + bounds.height * .7;
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 60, y - 40, { steps: 6 }); await page.mouse.up();
      assert.notEqual(await svg.getAttribute('viewBox'), initial, 'Explicit drag moves the map');
      await page.keyboard.press('Escape');
      assert.equal(await map.getAttribute('data-panning'), 'false');
      assert.equal(await viewport.evaluate(element => getComputedStyle(element).touchAction), 'pan-y pinch-zoom');
      await map.locator('[data-map-reset]').click();
      assert.equal(await svg.getAttribute('viewBox'), initial);
      // A normal wheel remains a page-scroll gesture, never map zoom.
      const beforeWheel = await page.evaluate(() => scrollY);
      await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .5);
      await page.mouse.wheel(0, 180); await page.waitForTimeout(250);
      assert(await page.evaluate(() => scrollY) > beforeWheel);
      assert.equal(await map.getAttribute('data-zoom'), '1');
      // Bounds are preserved even after repeated keyboard navigation.
      await viewport.focus();
      for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
      const view = (await svg.getAttribute('viewBox')).split(' ').map(Number);
      const limit = (await map.getAttribute('data-bounds')).split(' ').map(Number);
      assert(view[0] >= limit[0] - .001 && view[1] >= limit[1] - .001 && view[0] + view[2] <= limit[0] + limit[2] + .001 && view[1] + view[3] <= limit[1] + limit[3] + .001);
      await map.locator('[data-map-reset]').click();
      await page.emulateMedia({ reducedMotion: 'reduce' });
      assert.equal(await map.locator('.pulse').evaluate(element => getComputedStyle(element).animationName), 'none');
      results.push({ engine, width, height, mode, passed: true });
      console.log(`PASS ${engine}/${width}/${mode}: real geometry, CMS pin, themes, zoom, keyboard, drag, bounds, scroll, reduced motion`);
      await context.close();
    }
    if (engine === 'chromium') for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, javaScriptEnabled: false });
      const page = await context.newPage(); await page.goto(base);
      const plan = page.locator(width > 820 ? '#plan' : '#m-plan');
      assert.equal(await plan.locator('[data-map-controls]').isVisible(), false);
      assert.equal(await plan.locator('[data-showroom-marker]').count(), 1);
      assert.equal(await plan.getByRole('link', { name: 'Itinéraire', exact: true }).count(), 1);
      results.push({ engine, width, javaScript: false, passed: true });
      await context.close();
    }
  } finally { await browser.close(); }
}
assert.deepEqual(errors, []);
assert.deepEqual(writes, []);
assert.deepEqual(externalMaps, [], 'The actual styled map uses no third-party runtime requests');
await writeFile(`${output}/browser${selectedEngine ? `-${selectedEngine}` : ''}.json`, JSON.stringify({ verifiedAt: new Date().toISOString(), base, results, errors, writes, externalMaps, sourceDownloadVerified: true }, null, 2) + '\n');
