/** Anonymous GET/HEAD checks for map controls at ordinary, partially scrolled positions. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright';

const base = new URL(process.env.PUBLIC_TEST_URL || 'http://localhost:4321');
const engine = process.env.PUBLIC_TEST_ENGINE || 'chromium';
const theme = process.env.PUBLIC_TEST_THEME || 'dark';
assert(['dark', 'light'].includes(theme), 'Unknown theme');
const launcher = { chromium, webkit }[engine];
assert(launcher, 'PUBLIC_TEST_ENGINE must be chromium or webkit.');
const output = join(process.env.PUBLIC_TEST_OUTPUT || 'test-results/map-interaction', theme === 'dark' ? engine : `${engine}-${theme}`);
const screenshots = process.env.PUBLIC_TEST_SCREENSHOTS !== 'false';
await mkdir(output, { recursive: true });
const results = [], errors = [], attemptedWrites = [];
let failure = null;
const desktopMap = '#plan [data-geographic-map]';
const mobileMap = '#m-plan [data-geographic-map]';
const browser = await launcher.launch({ headless: true, ...(engine === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });

async function contextFor(viewport, extra = {}) {
  const context = await browser.newContext({ viewport, ...extra });
  await context.addInitScript(mode => { try { localStorage.setItem('ci-mode', mode); } catch { /* Opaque parent frames have no storage. */ } }, theme);
  await context.route('**/*', route => {
    const request = route.request();
    if (!['GET', 'HEAD'].includes(request.method())) {
      attemptedWrites.push({ method: request.method(), origin: new URL(request.url()).origin });
      return route.abort();
    }
    return route.continue();
  });
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  return context;
}

async function ready(scope, selector) {
  await scope.waitForFunction(selector => {
    const map = document.querySelector(selector);
    return map && !map.querySelector('[data-map-controls]').hidden && map.dataset.zoom;
  }, selector, { timeout: 15000 });
}

async function open(page, selector) {
  const response = await page.goto(base.href, { waitUntil: 'load', timeout: 30000 });
  assert.equal(response.status(), 200);
  await ready(page, selector);
  await page.evaluate(() => document.fonts.ready);
}

async function scrollMap(scope, selector, offset = 0) {
  await scope.evaluate(({ selector, offset }) => {
    const map = document.querySelector(selector);
    scrollTo({ top: map.getBoundingClientRect().top + scrollY + offset, behavior: 'instant' });
  }, { selector, offset });
  // The control positioning follows scroll through requestAnimationFrame.
  await scope.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function view(scope, selector) {
  return scope.locator(`${selector} [data-map-svg]`).getAttribute('viewBox');
}

async function assertButtonReceives(scope, selector, action) {
  await scope.waitForFunction(({ selector, action }) => {
    const button = document.querySelector(`${selector} [data-map-${action}]`);
    if (!button || button.disabled) return false;
    const rect = button.getBoundingClientRect();
    const headerBottom = document.querySelector('#hd, .page-header')?.getBoundingClientRect().bottom || 0;
    if (rect.top < headerBottom - 1) return false;
    const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return button === hit || button.contains(hit);
  }, { selector, action }, { timeout: 4000 });
  return scope.evaluate(({ selector, action }) => {
    const button = document.querySelector(`${selector} [data-map-${action}]`);
    const rect = button.getBoundingClientRect();
    const header = document.querySelector('#hd, .page-header')?.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, top: rect.top, bottom: rect.bottom, headerBottom: header?.bottom || 0 };
  }, { selector, action });
}

async function clickButton(page, scope, selector, action, { frameOffset = { x: 0, y: 0 }, touch = false } = {}) {
  const point = await assertButtonReceives(scope, selector, action);
  assert(point.top >= point.headerBottom - 1, `${action} must stay below the fixed header`);
  // Real coordinates deliberately avoid locator.click/tap's automatic scrolling.
  if (touch) await page.touchscreen.tap(point.x + frameOffset.x, point.y + frameOffset.y);
  else await page.mouse.click(point.x + frameOffset.x, point.y + frameOffset.y);
  return point;
}

async function changedView(scope, selector, before) {
  await scope.waitForFunction(({ selector, before }) => document.querySelector(`${selector} [data-map-svg]`).getAttribute('viewBox') !== before,
    { selector, before }, { timeout: 4000 });
  return view(scope, selector);
}

async function noOverflow(scope) {
  assert.equal(await scope.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'No horizontal page overflow');
}

async function visibleStreetNames(scope, selector) {
  return scope.evaluate(selector => {
    const map = document.querySelector(selector);
    const viewport = map.querySelector('[data-map-viewport]').getBoundingClientRect();
    const headerBottom = document.querySelector('#hd, .page-header')?.getBoundingClientRect().bottom || 0;
    return [...map.querySelectorAll('[data-map-street-labels] text')].filter(text => {
      const style = getComputedStyle(text), rect = text.getBoundingClientRect();
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0 || rect.width < 10 || rect.height < 5) return false;
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      if (x < Math.max(viewport.left, 0) || x > Math.min(viewport.right, innerWidth) || y < Math.max(viewport.top, headerBottom) || y > Math.min(viewport.bottom, innerHeight)) return false;
      const hit = document.elementFromPoint(x, y);
      return !hit?.closest('#plan .panel, [data-map-controls], .geographic-map-attribution');
    }).map(text => text.textContent.trim());
  }, selector);
}

try {
  const desktop = await contextFor({ width: 2000, height: 1248 });
  try {
    const page = await desktop.newPage();
    await open(page, desktopMap);
    await scrollMap(page, desktopMap);
    const initial = await view(page, desktopMap);
    const initialNames = await visibleStreetNames(page, desktopMap);
    assert(initialNames.length > 0, 'Useful street names must be rendered before zooming');
    await clickButton(page, page, desktopMap, 'zoom-out');
    const wider = await changedView(page, desktopMap, initial);
    assert(Number(wider.split(' ')[2]) > Number(initial.split(' ')[2]), 'Initial minus enlarges the geographic view');
    await clickButton(page, page, desktopMap, 'zoom-in');
    const narrower = await changedView(page, desktopMap, wider);
    assert(Number(narrower.split(' ')[2]) < Number(wider.split(' ')[2]), 'Plus narrows the geographic view');
    await noOverflow(page);
    results.push({ case: 'desktop-initial-buttons', viewport: '2000x1248', initial, zoomedOut: wider, zoomedIn: narrower, initialStreetNames: initialNames });

    await clickButton(page, page, desktopMap, 'reset');
    for (const offset of [70, 140, 220]) {
      await scrollMap(page, desktopMap, offset);
      const before = await view(page, desktopMap);
      const plus = await clickButton(page, page, desktopMap, 'zoom-in');
      const afterPlus = await changedView(page, desktopMap, before);
      const minus = await clickButton(page, page, desktopMap, 'zoom-out');
      await changedView(page, desktopMap, afterPlus);
      await assertButtonReceives(page, desktopMap, 'reset');
      await assertButtonReceives(page, desktopMap, 'pan');
      await noOverflow(page);
      if (screenshots && offset === 140) await page.screenshot({ path: join(output, 'desktop-partial-scroll.jpg'), type: 'jpeg', quality: 85 });
      results.push({ case: 'desktop-partial-scroll', viewport: '2000x1248', offset, plus, minus });
      await clickButton(page, page, desktopMap, 'reset');
    }

    await scrollMap(page, desktopMap);
    for (let count = 0; count < 12 && Number(await page.locator(desktopMap).getAttribute('data-zoom')) < 6; count++) {
      const before = await view(page, desktopMap);
      await clickButton(page, page, desktopMap, 'zoom-in');
      await changedView(page, desktopMap, before);
    }
    const closeNames = await visibleStreetNames(page, desktopMap);
    assert(closeNames.some(name => /Sij[ei]lmassi/i.test(name)), 'The showroom street name must be rendered in the visible close view');
    if (screenshots) await page.screenshot({ path: join(output, 'desktop-close-streets.jpg'), type: 'jpeg', quality: 85 });
    results.push({ case: 'close-street-names', zoom: await page.locator(desktopMap).getAttribute('data-zoom'), visibleNames: closeNames });

    for (let count = 0; count < 20 && !await page.locator(`${desktopMap} [data-map-zoom-in]`).isDisabled(); count++) {
      const before = await view(page, desktopMap);
      await clickButton(page, page, desktopMap, 'zoom-in');
      await changedView(page, desktopMap, before);
    }
    assert.equal(Number(await page.locator(desktopMap).getAttribute('data-zoom')), 16, 'Plus reaches the documented maximum');
    assert.equal(await page.locator(`${desktopMap} [data-map-zoom-in]`).isDisabled(), true);
    const closest = await view(page, desktopMap);
    await clickButton(page, page, desktopMap, 'zoom-out');
    await changedView(page, desktopMap, closest);
    assert.equal(await page.locator(`${desktopMap} [data-map-zoom-in]`).isDisabled(), false, 'Minus remains usable at maximum zoom');
    for (let count = 0; count < 40 && !await page.locator(`${desktopMap} [data-map-zoom-out]`).isDisabled(); count++) {
      const before = await view(page, desktopMap);
      await clickButton(page, page, desktopMap, 'zoom-out');
      await changedView(page, desktopMap, before);
    }
    assert.equal(await page.locator(`${desktopMap} [data-map-zoom-out]`).isDisabled(), true, 'Minus stops at the downloaded extent');
    const widest = (await view(page, desktopMap)).split(' ').map(Number);
    const coverage = (await page.locator(desktopMap).getAttribute('data-bounds')).split(' ').map(Number);
    assert(widest[0] >= coverage[0] - .001 && widest[1] >= coverage[1] - .001 && widest[0] + widest[2] <= coverage[0] + coverage[2] + .001 && widest[1] + widest[3] <= coverage[1] + coverage[3] + .001, 'Widest view stays within the downloaded geography');
    assert(Math.abs(widest[2] - coverage[2]) < .001 || Math.abs(widest[3] - coverage[3]) < .001, 'Widest view reaches one coverage limit');
    results.push({ case: 'zoom-limits', maximum: 16, minimum: Number(await page.locator(desktopMap).getAttribute('data-zoom')), widest, coverage });
    await clickButton(page, page, desktopMap, 'reset');

    await scrollMap(page, desktopMap, 140);
    const beforeWheel = await page.evaluate(() => scrollY);
    const zoomBeforeWheel = await page.locator(desktopMap).getAttribute('data-zoom');
    const bounds = await page.locator(`${desktopMap} [data-map-viewport]`).boundingBox();
    await page.mouse.move(bounds.x + bounds.width * .65, Math.max(200, bounds.y + bounds.height * .5));
    await page.mouse.wheel(0, 180);
    await page.waitForFunction(before => scrollY > before, beforeWheel, { timeout: 4000 });
    assert.equal(await page.locator(desktopMap).getAttribute('data-zoom'), zoomBeforeWheel, 'Normal wheel scroll does not zoom the map');
    results.push({ case: 'normal-wheel-scroll', zoomUnchanged: zoomBeforeWheel });

    await page.setViewportSize({ width: 1440, height: 900 });
    await scrollMap(page, desktopMap, 140);
    const before = await view(page, desktopMap);
    const plus = await clickButton(page, page, desktopMap, 'zoom-in');
    const afterPlus = await changedView(page, desktopMap, before);
    const minus = await clickButton(page, page, desktopMap, 'zoom-out');
    await changedView(page, desktopMap, afterPlus);
    await noOverflow(page);
    results.push({ case: 'desktop-partial-scroll', viewport: '1440x900', offset: 140, plus, minus });
  } finally { await desktop.close(); }

  const mobile = await contextFor({ width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  try {
    const page = await mobile.newPage();
    await open(page, mobileMap);
    await scrollMap(page, mobileMap, 70);
    const pageTop = await page.evaluate(() => scrollY);
    const initial = await view(page, mobileMap);
    await clickButton(page, page, mobileMap, 'zoom-out', { touch: true });
    const wider = await changedView(page, mobileMap, initial);
    await clickButton(page, page, mobileMap, 'zoom-in', { touch: true });
    await changedView(page, mobileMap, wider);
    await noOverflow(page);
    assert.equal(await page.locator(`${mobileMap} [data-map-viewport]`).evaluate(element => getComputedStyle(element).touchAction), 'pan-y pinch-zoom');
    // The wide mobile overview prioritizes neighborhoods. The first closer
    // view must make street names readable, using an actual tap on +.
    const overview = await view(page, mobileMap);
    await clickButton(page, page, mobileMap, 'zoom-in', { touch: true });
    await changedView(page, mobileMap, overview);
    const names = await visibleStreetNames(page, mobileMap);
    assert(names.length, 'The first closer mobile view shows readable street names');
    if (screenshots) await page.screenshot({ path: join(output, 'mobile-partial-scroll.jpg'), type: 'jpeg', quality: 85 });
    for (let count = 0; count < 12 && Number(await page.locator(mobileMap).getAttribute('data-zoom')) < 6; count++) {
      const before = await view(page, mobileMap);
      await clickButton(page, page, mobileMap, 'zoom-in', { touch: true });
      await changedView(page, mobileMap, before);
    }
    const closeNames = await visibleStreetNames(page, mobileMap);
    assert(Math.abs(await page.evaluate(() => scrollY) - pageTop) <= 1, 'Repeated mobile map zoom must not scroll the surrounding page');
    assert(closeNames.length, 'Close mobile view keeps visible local street names');
    if (screenshots) await page.screenshot({ path: join(output, 'mobile-close-streets.jpg'), type: 'jpeg', quality: 85 });
    results.push({ case: 'mobile-partial-scroll-tap', viewport: '390x844', offset: 70, visibleNames: names, closeVisibleNames: closeNames });
  } finally { await mobile.close(); }

  const embedded = await contextFor({ width: 1440, height: 900 });
  try {
    const page = await embedded.newPage();
    // This tests the app in a browser frame, not GitHub's separate authentication proxy.
    // A localhost parent retains the secure context required by Vite's native
    // development client, like the HTTPS editor. about:blank would not.
    const parentUrl = new URL('__map-frame-test', base).href;
    await page.route(parentUrl, route => route.fulfill({ contentType: 'text/html', body: '<iframe title="Embedded website preview" sandbox="allow-scripts allow-same-origin allow-forms allow-popups" style="position:fixed;inset:16px;width:calc(100% - 32px);height:calc(100% - 32px);border:0"></iframe>' }));
    await page.goto(parentUrl);
    await page.locator('iframe').evaluate((iframe, url) => { iframe.src = url; }, base.href);
    const frame = page.frames().find(frame => frame.parentFrame());
    await ready(frame, desktopMap);
    await scrollMap(frame, desktopMap, 140);
    const iframeBounds = await page.locator('iframe').boundingBox();
    const initial = await view(frame, desktopMap);
    const options = { frameOffset: { x: iframeBounds.x, y: iframeBounds.y } };
    const plus = await clickButton(page, frame, desktopMap, 'zoom-in', options);
    const afterPlus = await changedView(frame, desktopMap, initial);
    const minus = await clickButton(page, frame, desktopMap, 'zoom-out', options);
    await changedView(frame, desktopMap, afterPlus);
    await noOverflow(frame);
    results.push({ case: 'sandboxed-iframe-partial-scroll', offset: 140, plus, minus });
  } finally { await embedded.close(); }

  assert.deepEqual(attemptedWrites, [], 'No request that modifies data was attempted');
  assert.deepEqual(errors, [], 'No application JavaScript errors');
  assert.equal(results.length, 10, 'All targeted interaction cases completed');
  console.log(`PASS ${engine}: ${results.length} map interaction cases`);
} catch (error) {
  failure = { message: error.message, stack: error.stack };
  throw error;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), engine, theme, base: base.href, passed: failure === null, failure, results, errors, attemptedWrites }, null, 2) + '\n');
}
