/** One responsive homepage tree, exercised without CMS writes or private endpoints. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
const base = new URL(process.env.PUBLIC_TEST_URL || 'http://localhost:4321');
const engine = process.env.PUBLIC_TEST_ENGINE || 'chromium';
const onlyState = process.argv.includes('--only-state');
assert(['chromium', 'webkit'].includes(engine));
const output = `${process.env.PUBLIC_TEST_OUTPUT || 'test-results/home-responsive'}/${engine}`;
await mkdir(output, {recursive: true});
const report = {engine, base: base.origin, cases: [], errors: [], blocked: []};
const browser = await ({chromium, webkit}[engine]).launch({headless: true, ...(engine === 'chromium' ? {args: ['--no-sandbox', '--disable-dev-shm-usage']} : {})});
async function open(width, theme, extra = {}, hash = '') {
  const context = await browser.newContext({viewport: {width, height: width > 820 ? 900 : 844}, serviceWorkers: 'block', ...extra});
  await context.addInitScript(theme => localStorage.setItem('ci-mode', theme), theme);
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    const privateRoute = url.origin === base.origin && (url.pathname.startsWith('/preview/') || (url.pathname.startsWith('/_emdash/') && !url.pathname.startsWith('/_emdash/api/media/file/')));
    let privateImage = false;
    if (url.origin === base.origin && url.pathname === '/_image') {
      const source = new URL(url.searchParams.get('href') || '/', base);
      privateImage = source.origin !== base.origin || !source.pathname.startsWith('/_emdash/api/media/file/');
    }
    if (!['GET', 'HEAD'].includes(request.method()) || privateRoute || privateImage) {
      report.blocked.push({method: request.method(), path: url.pathname});
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  assert.equal((await page.goto(new URL('/' + hash, base).href, {waitUntil: 'load', timeout: 60000})).status(), 200);
  if (extra.javaScriptEnabled !== false) {
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => document.querySelector('[data-geographic-map]')?.dataset.zoom);
    await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'));
  }
  return {context, page};
}
async function scene(page, id, progress = 0) {
  await page.evaluate(({id, progress}) => {
    const section = document.getElementById(id), rect = section.getBoundingClientRect();
    const animated = innerWidth > 820 && document.documentElement.classList.contains('motion-ready') && section.dataset.scene;
    scrollTo({top: scrollY + rect.top + (animated ? (rect.height - innerHeight) * progress : 0) - (innerWidth <= 820 ? 60 : 0), behavior: 'instant'});
  }, {id, progress});
  await page.waitForTimeout(1200);
}
async function camera(page) {
  return page.locator('[data-geographic-map]').evaluate(el => {
    const [x, y, w, h] = el.querySelector('[data-map-svg]').getAttribute('viewBox').split(/\s+/).map(Number);
    return {x: x + w/2, y: y + h/2, zoom: Number(el.dataset.zoom)};
  });
}
try {
  for (const theme of onlyState ? [] : ['dark', 'light']) for (const width of onlyState ? [] : [1440, 390]) {
    const {context, page} = await open(width, theme);
    try {
      assert.equal(await page.locator('h1').count(), 1);
      assert.equal(await page.locator('[data-catalogue-form]').count(), 1);
      assert.equal(await page.locator('[data-geographic-map]').count(), 1);
      assert.equal(await page.locator('#collections .family-rail > .cc:not(.cta)').count(), 6);
      assert.equal(await page.locator('#journal .art').count(), 5);
      assert.equal(await page.locator('.desk, .mob, [id^="m-"]').count(), 0);
      const duplicateIds = await page.locator('[id]').evaluateAll(nodes => nodes.map(n => n.id).filter((id, i, all) => all.indexOf(id) !== i));
      assert.deepEqual(duplicateIds, []);
      assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
      const heading = await page.locator('h1').boundingBox();
      assert(heading?.width > 200 && heading.height > 20);
      const groups = ['accueil', 'italie', 'collections', 'showroom', 'catalogue', 'journal'];
      for (const id of groups) {
        await scene(page, id, id === 'accueil' ? .8 : .7);
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${id}: horizontal page overflow`);
        if (width < 821) {
          await page.evaluate(() => scrollBy({top: 20, behavior: 'instant'}));
          await page.waitForTimeout(100);
          const image = page.locator(`#${id} :is([data-mobile-frame] > img, [data-mobile-frame] > picture.home-photo > img)`).first();
          if (await image.count() && await image.isVisible()) {
            assert.match(await image.evaluate(el => getComputedStyle(el).transform), /^matrix\(1, 0, 0, 1, 0, /, `${id}: mobile drift uses translation only`);
          }
        }
      }
      if (width < 821) {
        const journalImage = await page.locator('#journal .art .im').first().boundingBox();
        assert(Math.abs(journalImage.x - 20) < 1 && Math.abs(journalImage.width - (width - 40)) < 1 && journalImage.height === 220);
        const ctaOrder = await page.locator('#journal').evaluate(el => [...el.querySelectorAll('a')].map(a => a.classList.contains('journal-cta')));
        if (await page.locator('#journal .journal-cta').count()) assert.equal(ctaOrder.at(-1), true, 'Journal CTA follows article links in reading and keyboard order');
      }
      await page.locator('[data-theme-toggle]').click();
      assert.equal(await page.locator('html').getAttribute('data-mode'), theme === 'dark' ? 'light' : 'dark');
      await scene(page, 'plan');
      const initial = await camera(page);
      await page.locator('[data-map-zoom-in]').click();
      assert((await camera(page)).zoom > initial.zoom);
      await page.locator('[data-map-reset]').click();
      assert.deepEqual(await camera(page), initial);
      report.cases.push({theme, width, kind: 'single-tree-layout-and-theme', passed: true});
    } finally { await context.close(); }
  }

  const {context, page} = await open(1440, 'dark');
  try {
    await scene(page, 'accueil', 0);
    assert.equal(await page.locator('#accueil .over a').first().evaluate(el => el.inert), true);
    await page.setViewportSize({width: 820, height: 844});
    await page.waitForTimeout(400);
    assert.equal(await page.locator('#accueil .over a').first().evaluate(el => el.inert), false, 'Mobile restores links hidden in the desktop entrance animation');
    await page.setViewportSize({width: 1440, height: 900});
    await scene(page, 'accueil', .8);
    assert.equal(await page.locator('#accueil .over a').first().evaluate(el => el.inert), false);
    await scene(page, 'catalogue', .62);
    await page.locator('[data-catalogue-form] input[name="name"]').fill('Responsive verification');
    await page.locator('[data-catalogue-form] input[name="email"]').fill('not-an-email');
    await page.locator('[data-catalogue-form] input[name="communicationsConsent"]').check();
    // Invalid input exercises client validation only; the request guard forbids submission.
    await page.locator('[data-catalogue-form] button[type="submit"]').click();
    assert.equal(await page.locator('[data-catalogue-form] input[name="email"]').getAttribute('aria-invalid'), 'true');
    await scene(page, 'plan');
    await page.locator('[data-map-zoom-in]').click();
    await page.locator('[data-map-zoom-in]').click();
    await page.locator('[data-map-viewport]').focus();
    await page.keyboard.press('ArrowRight');
    const chosen = await camera(page);
    for (const width of [820, 821, 390, 1440]) {
      await page.setViewportSize({width, height: 844});
      await page.waitForTimeout(400);
      const resized = await camera(page);
      assert(Math.abs(resized.x - chosen.x) < 1 && Math.abs(resized.y - chosen.y) < 1 && resized.zoom === chosen.zoom, 'Chosen map center/zoom survive the breakpoint');
      assert.equal(await page.locator('[data-catalogue-form] input[name="name"]').inputValue(), 'Responsive verification');
      assert.equal(await page.locator('[data-catalogue-form] input[name="email"]').inputValue(), 'not-an-email');
      assert.equal(await page.locator('[data-catalogue-form] input[name="communicationsConsent"]').isChecked(), true);
      assert.equal(await page.locator('[data-catalogue-form] input[name="email"]').getAttribute('aria-invalid'), 'true');
      if (width <= 820) {
        assert.equal(await page.locator('#accueil .over a').first().evaluate(el => el.inert), false);
        await scene(page, 'showroom');
        const image = await page.locator('#showroom .showroom-photo').boundingBox();
        assert.equal(image.height, 320);
      } else {
        assert.equal(await page.locator('#accueil .card img').evaluate(el => el.style.transform), '', 'Desktop animation clears the mobile inline drift');
      }
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    await page.setViewportSize({width: 390, height: 844});
    await scene(page, 'plan');
    await page.locator('[data-map-reset]').click();
    const pin = (await page.locator('[data-geographic-map]').getAttribute('data-pin')).split(' ').map(Number);
    const reset = await camera(page);
    assert(Math.abs(reset.x-pin[0])<1 && Math.abs(reset.y-pin[1])<1 && reset.zoom===1, 'Reset adopts the mobile pin-centered camera');
    await page.setViewportSize({width: 821, height: 844});
    await page.waitForTimeout(400);
    const untouched = await camera(page);
    assert(Math.abs(untouched.x-720)<1 && untouched.zoom===1, 'An untouched map adopts the desktop center and zoom');
    const extent = await page.locator('[data-geographic-map]').evaluate(el => ({bounds: el.dataset.bounds.split(' ').map(Number), view: el.querySelector('[data-map-svg]').getAttribute('viewBox').split(' ').map(Number)}));
    assert(Math.abs(extent.view[3]-extent.bounds[3])<1 && Math.abs(untouched.y-extent.bounds[1]-extent.bounds[3]/2)<1, 'The narrow desktop frame fits and centers the complete available north-south coverage');
    report.cases.push({kind: 'breakpoints-state-validation-and-camera', widths: [820,821,390,1440], passed: true});
  } finally { await context.close(); }

  for (const width of onlyState ? [] : [1440, 390]) {
    const {context, page} = await open(width, 'dark', {}, '#m-showroom');
    try {
      const rect = await page.locator('#showroom').boundingBox();
      const expected = width > 820 ? -(rect.height - 900) * .62 : 60;
      assert(Math.abs(rect.y - expected) < 2, 'Legacy m-* anchor resolves to the single canonical section');
      await page.emulateMedia({reducedMotion: 'reduce'});
      await page.waitForFunction(() => ['#accueil .over', '#italie .col', '#showroom .info', '#catalogue .form'].every(selector => getComputedStyle(document.querySelector(selector)).opacity === '1'), null, {timeout: 5000});
      assert.equal(await page.locator('html').evaluate(el => el.classList.contains('motion-ready')), false);
      assert.equal(await page.locator('[inert]').count(), 0);
      for (const id of ['accueil', 'italie', 'showroom', 'catalogue']) {
        const opacity = await page.locator(`#${id} ${id === 'accueil' ? '.over' : id === 'italie' ? '.col' : id === 'showroom' ? '.info' : '.form'}`).evaluate(el => getComputedStyle(el).opacity);
        assert.equal(opacity, '1');
      }
      report.cases.push({width, kind: 'legacy-anchor-and-reduced-motion', passed: true});
    } finally { await context.close(); }
  }
  for (const width of onlyState ? [] : [1440,390]) {
    const {context,page}=await open(width,'dark',{javaScriptEnabled:false});
    try {
      assert.equal(await page.locator('h1').count(),1);
      assert.equal(await page.locator('[data-catalogue-form]').count(),1);
      assert.equal(await page.locator('[data-map-controls]').isVisible(),false);
      assert.equal(await page.locator('#plan .map-directions').isVisible(),true);
      assert.equal(await page.locator('[data-catalogue-form] noscript a').isVisible(),true);
      for(const id of ['accueil','italie','showroom','catalogue']) assert.equal(await page.locator(`#${id} .pin`).evaluate(el=>getComputedStyle(el).position),width>820?'relative':'static');
      report.cases.push({width,kind:'no-javascript-readable-fallback',passed:true});
    } finally {await context.close();}
  }
  assert.deepEqual(report.errors,[]); assert.deepEqual(report.blocked,[]);
  report.passed=true;
  console.log(`PASS ${engine}: ${report.cases.length} responsive homepage scenarios`);
} catch(error) {report.failure=error.stack;process.exitCode=1;console.error(error.stack);} finally {
  await browser.close(); report.finishedAt=new Date().toISOString();await writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
}
