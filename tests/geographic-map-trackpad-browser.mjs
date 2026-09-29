/** Anonymous map trackpad checks. Synthetic pinch events test handlers, not physical hardware. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium, webkit } from 'playwright';

const base = new URL(process.env.PUBLIC_TEST_URL || 'http://localhost:4321');
const engine = process.env.PUBLIC_TEST_ENGINE || 'chromium';
const theme = process.env.PUBLIC_TEST_THEME || 'dark';
const launcher = { chromium, webkit }[engine];
assert(launcher, 'PUBLIC_TEST_ENGINE must be chromium or webkit');
assert(['light', 'dark'].includes(theme), 'Unknown theme');
const output = join(process.env.PUBLIC_TEST_OUTPUT || 'test-results/map-trackpad', theme === 'dark' ? engine : `${engine}-${theme}`);
await mkdir(output, { recursive: true });
const results = [], errors = [], attemptedWrites = [];
let failure = null;
const desktopMap = '#plan [data-geographic-map]';
const mobileMap = '#m-plan [data-geographic-map]';
const browser = await launcher.launch({ headless: true, ...(engine === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });

async function contextFor(viewport, extra = {}) {
  const context = await browser.newContext({ viewport, ...extra });
  await context.addInitScript(theme => { try { localStorage.setItem('ci-mode', theme); } catch { /* Opaque frames have no storage. */ } }, theme);
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

async function frames(page) {
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function open(page, selector) {
  const response = await page.goto(base.href, { waitUntil: 'load', timeout: 30000 });
  assert.equal(response.status(), 200);
  await page.waitForFunction(selector => document.querySelector(selector)?.dataset.zoom, selector);
  await page.evaluate(() => document.fonts.ready);
  await scrollMap(page, selector);
}

async function scrollMap(page, selector) {
  await page.evaluate(selector => {
    const map = document.querySelector(selector);
    scrollTo({ top: scrollY + map.getBoundingClientRect().top + 70, behavior: 'instant' });
  }, selector);
  await frames(page);
}

async function state(page, selector) {
  return page.evaluate(selector => {
    const map = document.querySelector(selector);
    const view = map.querySelector('[data-map-svg]').getAttribute('viewBox').split(/\s+/).map(Number);
    const bounds = map.dataset.bounds.split(/\s+/).map(Number);
    const rect = map.querySelector('[data-map-viewport]').getBoundingClientRect();
    return { view, bounds, zoom: Number(map.dataset.zoom), scroll: { x: scrollX, y: scrollY }, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
  }, selector);
}

async function pointOnMap(page, selector) {
  return page.evaluate(selector => {
    const viewport = document.querySelector(`${selector} [data-map-viewport]`);
    const rect = viewport.getBoundingClientRect();
    const top = Math.max(rect.top, document.querySelector('header').getBoundingClientRect().bottom) + 30;
    const bottom = Math.min(innerHeight, rect.bottom) - 60;
    for (const horizontal of [.65, .55, .75, .4, .25]) {
      for (const vertical of [.5, .7, .3]) {
        // MouseEvent coordinates are integer CSS pixels; test the same anchor
        // that the browser passes to the handler, without constructor rounding.
        const point = { x: Math.round(rect.left + rect.width * horizontal), y: Math.round(top + (bottom - top) * vertical) };
        if (viewport.contains(document.elementFromPoint(point.x, point.y))) return point;
      }
    }
    throw new Error('No unobstructed visible point on map');
  }, selector);
}

async function wheel(page, selector, point, deltaY, ctrlKey = true, deltaX = 0) {
  return page.evaluate(({ selector, point, deltaY, ctrlKey, deltaX }) => {
    const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, clientX: point.x, clientY: point.y, deltaX, deltaY, deltaMode: 0, ctrlKey });
    document.querySelector(`${selector} [data-map-viewport]`).dispatchEvent(event);
    return event.defaultPrevented;
  }, { selector, point, deltaY, ctrlKey, deltaX });
}

async function gesture(page, selector, point, type, scale) {
  return page.evaluate(({ selector, point, type, scale }) => {
    // WebKit's proprietary GestureEvent constructor is not portable. The
    // cancelable event carries the exact properties consumed by its handler.
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperties(event, { scale: { value: scale }, clientX: { value: point.x }, clientY: { value: point.y } });
    document.querySelector(`${selector} [data-map-viewport]`).dispatchEvent(event);
    return event.defaultPrevented;
  }, { selector, point, type, scale });
}

function geographicPoint(snapshot, point) {
  return [snapshot.view[0] + (point.x - snapshot.rect.x) / snapshot.rect.width * snapshot.view[2], snapshot.view[1] + (point.y - snapshot.rect.y) / snapshot.rect.height * snapshot.view[3]];
}

function anchorStayed(before, after, point) {
  const initial = geographicPoint(before, point), current = geographicPoint(after, point);
  assert(Math.abs(initial[0] - current[0]) < .05 && Math.abs(initial[1] - current[1]) < .05, `Geographic point beneath pinch stays fixed: ${initial} -> ${current}`);
}

function pageStayed(before, after) {
  assert(Math.abs(before.scroll.y - after.scroll.y) <= 1 && Math.abs(before.scroll.x - after.scroll.x) <= 1, 'Map gesture must not scroll the surrounding page');
}

function withinCoverage(snapshot) {
  const [x, y, width, height] = snapshot.view, [left, top, coverageWidth, coverageHeight] = snapshot.bounds;
  assert(x >= left - .001 && y >= top - .001 && x + width <= left + coverageWidth + .001 && y + height <= top + coverageHeight + .001, 'Camera remains inside downloaded geography without blank space');
}

try {
  const desktop = await contextFor({ width: 1440, height: 900 });
  try {
    const page = await desktop.newPage();
    await open(page, desktopMap);
    const initial = await state(page, desktopMap);
    for (let count = 0; count < 4; count++) await page.locator(`${desktopMap} [data-map-zoom-in]`).click();
    let before = await state(page, desktopMap);
    let point = await pointOnMap(page, desktopMap);
    assert.equal(await page.locator(`${desktopMap} [data-map-pan]`).getAttribute('aria-pressed'), 'false');
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(64, 96);
    await page.waitForFunction(({ selector, before }) => document.querySelector(`${selector} [data-map-svg]`).getAttribute('viewBox') !== before.join(' '), { selector: desktopMap, before: before.view });
    await frames(page);
    let after = await state(page, desktopMap);
    assert(after.view[0] > before.view[0] && after.view[1] > before.view[1], 'Two-finger wheel deltas pan both camera axes');
    assert(Math.abs(after.view[0] - before.view[0] - 64 * before.view[2] / before.rect.width) < 1, 'Horizontal pan follows screen-pixel delta');
    assert(Math.abs(after.view[1] - before.view[1] - 96 * before.view[3] / before.rect.height) < 1, 'Vertical pan follows screen-pixel delta');
    assert.equal(after.zoom, before.zoom);
    pageStayed(before, after); withinCoverage(after);
    results.push({ case: 'real-trackpad-two-axis-pan', before: before.view, after: after.view, scroll: after.scroll });

    before = after;
    assert.equal(await wheel(page, desktopMap, point, -90), true, 'Desktop Ctrl-wheel pinch prevents browser page zoom');
    await frames(page);
    after = await state(page, desktopMap);
    assert(after.zoom > before.zoom);
    anchorStayed(before, after, point); pageStayed(before, after); withinCoverage(after);
    results.push({ case: 'ctrl-wheel-zoom-in-at-pointer', zoomBefore: before.zoom, zoomAfter: after.zoom, anchor: point });

    before = after;
    assert.equal(await wheel(page, desktopMap, point, 90), true);
    await frames(page);
    after = await state(page, desktopMap);
    assert(after.zoom < before.zoom);
    anchorStayed(before, after, point); pageStayed(before, after); withinCoverage(after);
    results.push({ case: 'ctrl-wheel-zoom-out-at-pointer', zoomBefore: before.zoom, zoomAfter: after.zoom });

    before = after;
    assert.equal(await gesture(page, desktopMap, point, 'gesturestart', 1), true);
    assert.equal(await gesture(page, desktopMap, point, 'gesturechange', 1.35), true);
    const duringGesture = await state(page, desktopMap);
    assert.equal(await wheel(page, desktopMap, point, -90), true);
    assert.deepEqual((await state(page, desktopMap)).view, duringGesture.view, 'Duplicate Ctrl-wheel during Safari gesture must not zoom twice');
    assert.equal(await gesture(page, desktopMap, point, 'gesturechange', 1.65), true);
    await gesture(page, desktopMap, point, 'gestureend', 1.65);
    await frames(page);
    after = await state(page, desktopMap);
    assert(Math.abs(after.zoom / before.zoom - 1.65) < .001, 'Safari cumulative scale is relative to gesture start');
    anchorStayed(before, after, point); pageStayed(before, after); withinCoverage(after);
    results.push({ case: 'safari-cumulative-pinch', zoomBefore: before.zoom, zoomAfter: after.zoom, synthetic: true, duplicateWheelSuppressed: true });
    if (process.env.PUBLIC_TEST_SCREENSHOTS !== 'false') await page.screenshot({ path: join(output, 'desktop-trackpad-pan-and-pinch.jpg'), type: 'jpeg', quality: 85 });

    // Safari can send a final duplicate wheel event after gestureend. Start a
    // new independent gesture only after that documented 200 ms suppression.
    await page.waitForTimeout(250);
    before = after;
    for (let count = 0; count < 80 && !await page.locator(`${desktopMap} [data-map-zoom-in]`).isDisabled(); count++) await wheel(page, desktopMap, point, -1000);
    after = await state(page, desktopMap);
    assert.equal(after.zoom, 16);
    withinCoverage(after); pageStayed(before, after);
    assert.equal(await wheel(page, desktopMap, point, -1000), true, 'Pinch stays consumed at map maximum');
    await gesture(page, desktopMap, point, 'gesturestart', 1);
    await gesture(page, desktopMap, point, 'gesturechange', 2);
    assert.equal((await state(page, desktopMap)).zoom, 16);
    await gesture(page, desktopMap, point, 'gesturechange', 1.8);
    assert((await state(page, desktopMap)).zoom < 16, 'Safari pinch reverses immediately after hitting maximum');
    await gesture(page, desktopMap, point, 'gestureend', 1.8);
    await page.waitForTimeout(250);
    for (let count = 0; count < 80 && !await page.locator(`${desktopMap} [data-map-zoom-out]`).isDisabled(); count++) await wheel(page, desktopMap, point, 1000);
    after = await state(page, desktopMap);
    assert.equal(await page.locator(`${desktopMap} [data-map-zoom-out]`).isDisabled(), true);
    withinCoverage(after); pageStayed(before, after);
    await gesture(page, desktopMap, point, 'gesturestart', 1);
    await gesture(page, desktopMap, point, 'gesturechange', .5);
    assert.equal((await state(page, desktopMap)).zoom, after.zoom);
    await gesture(page, desktopMap, point, 'gesturechange', .6);
    assert((await state(page, desktopMap)).zoom > after.zoom, 'Safari pinch reverses immediately after hitting minimum');
    await gesture(page, desktopMap, point, 'gestureend', .6);
    results.push({ case: 'pinch-zoom-limits', maximum: 16, minimum: after.zoom, bounds: after.bounds, widest: after.view, safariReversalAtLimits: true });

    await page.locator(`${desktopMap} [data-map-reset]`).click();
    await page.locator(`${desktopMap} [data-map-zoom-in]`).click();
    assert((await state(page, desktopMap)).zoom > 1);
    await page.locator(`${desktopMap} [data-map-zoom-out]`).click();
    await page.locator(`${desktopMap} [data-map-reset]`).click();
    after = await state(page, desktopMap);
    assert.deepEqual(after.view, initial.view);
    results.push({ case: 'buttons-and-reset-after-gestures', reset: after.view });

    // Position the camera at the southern boundary through its supported
    // keyboard interface, then use an actual wheel event to test scroll chaining.
    await page.evaluate(selector => {
      const viewport = document.querySelector(`${selector} [data-map-viewport]`);
      for (let count = 0; count < 100; count++) viewport.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    }, desktopMap);
    before = await state(page, desktopMap);
    assert(Math.abs(before.view[1] + before.view[3] - before.bounds[1] - before.bounds[3]) < .001);
    point = await pointOnMap(page, desktopMap);
    await page.mouse.move(point.x, point.y);
    await page.mouse.wheel(0, 180);
    await page.waitForFunction(previous => scrollY > previous + 1, before.scroll.y, { timeout: 4000 });
    after = await state(page, desktopMap);
    assert.deepEqual(after.view, before.view, 'At boundary wheel scrolls page rather than moving beyond coverage');
    results.push({ case: 'real-wheel-scroll-chaining-at-boundary', scrollBefore: before.scroll.y, scrollAfter: after.scroll.y });

    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await frames(page);
    before = await state(page, desktopMap);
    await page.mouse.move(720, 220);
    await page.mouse.wheel(0, 180);
    await page.waitForFunction(() => scrollY > 1, null, { timeout: 4000 });
    after = await state(page, desktopMap);
    assert.deepEqual(after.view, before.view);
    results.push({ case: 'wheel-outside-map-scrolls-page', scrollAfter: after.scroll.y });
  } finally { await desktop.close(); }

  const mobile = await contextFor({ width: 390, height: 844 }, { hasTouch: true, isMobile: true });
  try {
    const page = await mobile.newPage();
    await open(page, mobileMap);
    assert.equal(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), true, 'Mobile context exposes coarse touch pointer');
    const before = await state(page, mobileMap);
    const point = await pointOnMap(page, mobileMap);
    assert.equal(await wheel(page, mobileMap, point, -90), false, 'Touchscreen Ctrl-wheel emulation does not consume native browser pinch');
    await frames(page);
    assert.deepEqual((await state(page, mobileMap)).view, before.view);
    assert.equal(await page.locator(`${mobileMap} [data-map-viewport]`).evaluate(element => getComputedStyle(element).touchAction), 'pan-y pinch-zoom');
    results.push({ case: 'mobile-browser-pinch-remains-native', synthetic: true, touchAction: 'pan-y pinch-zoom' });

    assert.equal(await gesture(page, mobileMap, point, 'gesturestart', 1), false);
    assert.equal(await gesture(page, mobileMap, point, 'gesturechange', 1.6), false);
    await gesture(page, mobileMap, point, 'gestureend', 1.6);
    await frames(page);
    assert.deepEqual((await state(page, mobileMap)).view, before.view);
    results.push({ case: 'mobile-safari-gesture-remains-native', synthetic: true });
    if (process.env.PUBLIC_TEST_SCREENSHOTS !== 'false') await page.screenshot({ path: join(output, 'mobile-native-pinch-preserved.jpg'), type: 'jpeg', quality: 85 });
  } finally { await mobile.close(); }

  assert.deepEqual(errors, [], 'No application JavaScript errors');
  assert.deepEqual(attemptedWrites, [], 'No content or authentication changes attempted');
  assert.equal(results.length, 10);
  console.log(`PASS ${engine} ${theme}: ${results.length} map trackpad cases`);
} catch (error) {
  failure = { message: error.message, stack: error.stack };
  throw error;
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), engine, theme, base: base.href, passed: failure === null, failure, results, errors, attemptedWrites, physicalTrackpadVerified: false }, null, 2) + '\n');
}
