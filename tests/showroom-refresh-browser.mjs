/**
 * Anonymous, read-only checks of the published showroom copy and homepage images.
 * Does not read credentials or call CMS, authentication, publication or setup APIs.
 * Google directions clicks are intercepted: this checks the destination, not Google service availability.
 *
 * PUBLIC_TEST_ENGINE=chromium|webkit PUBLIC_TEST_THEME=dark|light
 * PUBLIC_TEST_URL=http://localhost:4321 node tests/showroom-refresh-browser.mjs
 * Optional PUBLIC_TEST_OUTPUT=test-results/showroom-refresh; PUBLIC_TEST_SCREENSHOTS=false.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const base = new URL(process.env.PUBLIC_TEST_URL || 'http://localhost:4321');
assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password);
const engine = process.env.PUBLIC_TEST_ENGINE || 'chromium';
const theme = process.env.PUBLIC_TEST_THEME || 'dark';
assert(['chromium', 'webkit'].includes(engine), 'Choose chromium or webkit.');
assert(['dark', 'light'].includes(theme), 'Choose dark or light.');
assert.equal(process.argv.length, 2, 'This suite does not accept command-line flags.');
const output = resolve(process.env.PUBLIC_TEST_OUTPUT || 'test-results/showroom-refresh', `${engine}-${theme}`);
const screenshots = process.env.PUBLIC_TEST_SCREENSHOTS !== 'false' && engine === 'chromium';
const location = JSON.parse(await readFile('content/showroom-location.json', 'utf8'));
const editorial = JSON.parse(await readFile('content/showroom-editorial-copy.json', 'utf8'));
const refresh = JSON.parse(await readFile('content/editorial-refresh-pages.json', 'utf8'));
Object.assign(editorial.showroom, refresh.find(entry => entry.collection === 'pages' && entry.slug === 'showroom-casablanca').after);
const expectedPhone = `tel:${location.global.after.contact_phone.replace(/[^+\d]/gu, '')}`;
const expectedDirections = new URL(location.global.after.map_url);
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const report = {
  startedAt: new Date().toISOString(), origin: base.origin, engine, theme, readOnly: true,
  checks: [], images: [], screenshots: [], directions: [], scenePositions: [], errors: [], attemptedWrites: [],
  blockedPrivateRequests: [], failure: '',
};
const pass = (name, data = {}) => { report.checks.push({ name, ...data }); console.log(`PASS ${name}`); };
const normalize = text => text.replace(/\s+/gu, ' ').trim();
let expectedBrandImages;
let showroomImage;
let failure;
await mkdir(output, { recursive: true });

function assertDirections(href) {
  const url = new URL(href);
  assert.equal(url.origin, expectedDirections.origin, 'Directions retain the approved Google origin.');
  assert.equal(url.pathname, '/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('destination_place_id'), expectedDirections.searchParams.get('destination_place_id'));
  assert.equal(url.searchParams.get('destination'), expectedDirections.searchParams.get('destination'));
}

async function contextFor(browser, viewport, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion, serviceWorkers: 'block' });
  await context.addInitScript(value => {
    try { if (!localStorage.getItem('ci-mode')) localStorage.setItem('ci-mode', value); } catch { /* Blank/opaque documents have no storage. */ }
  }, theme);
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) {
      report.attemptedWrites.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    if (url.origin === base.origin && url.pathname.startsWith('/_emdash/') && !url.pathname.startsWith('/_emdash/api/media/file/')) {
      report.blockedPrivateRequests.push(`${request.method()} ${url.pathname}`);
      return route.abort();
    }
    if (url.origin === expectedDirections.origin && url.pathname === '/maps/dir/') {
      assertDirections(url.href);
      report.directions.push({ url: url.href, method: request.method(), intercepted: true });
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Directions destination verified</title>' });
    }
    return route.continue();
  });
  context.on('page', page => page.on('pageerror', error => report.errors.push(error.message)));
  return context;
}

async function closeContext(context) {
  await context.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
  await context.close().catch(() => {});
}

async function open(page, path, mode = theme) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin);
  assert(!url.pathname.startsWith('/_emdash/') && !url.searchParams.has('_preview'));
  const response = await page.goto(url.href, { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200, path);
  assert.match(response.headers()['x-robots-tag'] || '', /noindex/u, 'Private preview remains noindex.');
  await page.locator('h1:visible').first().waitFor();
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(done => setTimeout(done, 2500))]));
  await page.waitForTimeout(200);
  assert.equal(await page.locator('html').getAttribute('data-mode'), mode);
  await noOverflow(page, path);
}

async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  assert(size.document <= size.viewport + 1, `${label}: horizontal overflow ${JSON.stringify(size)}`);
}

async function imageDecoded(locator, expected, altPattern) {
  assert.equal(await locator.count(), 1, 'One image for the selected composition.');
  // decode() starts a lazy image without changing application data or its source.
  const state = await locator.evaluate(async image => {
    image.loading = 'eager';
    await image.decode();
    return { src: image.src, alt: image.alt, width: image.naturalWidth, height: image.naturalHeight };
  });
  assert.equal(new URL(state.src).origin, base.origin, 'Editorial images are served from existing/local CMS media.');
  assert(state.width > 100 && state.height > 100, `Image must decode: ${state.src}`);
  assert.match(state.alt, altPattern, 'Meaningful image alternative.');
  if (expected) assert.equal(state.src, expected, 'Published image uses the chosen existing media.');
  if (!report.images.some(image => image.src === state.src)) report.images.push(state);
  return state.src;
}

async function scrollToContent(page, selector) {
  await page.locator(selector).evaluate(element => {
    const header = document.querySelector('header');
    scrollTo({ top: element.getBoundingClientRect().top + scrollY - (header?.offsetHeight || 0) - 24, behavior: 'instant' });
  });
  await page.waitForTimeout(850);
}

async function seek(page, selector, progress) {
  const startedAt = Date.now();
  await page.locator(selector).evaluate((element, progress) => {
    scrollTo({ top: element.offsetTop + Math.max(0, element.offsetHeight - innerHeight) * progress, behavior: 'instant' });
  }, progress);
  // The original choreography eases each requestAnimationFrame. Headless WebKit
  // may render fewer frames per second, so a fixed 1 s pause stops mid-animation.
  // Wait for the requested endpoint without changing the animation or weakening its threshold.
  const property = { '#accueil': '--g', '#italie': '--a', '#collections': '--h', '#showroom': '--r', '#catalogue': '--c' }[selector];
  assert(property, `Define the expected animation endpoint for ${selector}.`);
  await page.waitForFunction(({ selector, progress, property }) => {
    const element = document.querySelector(selector);
    const expectedY = element.offsetTop + Math.max(0, element.offsetHeight - innerHeight) * progress;
    const progressProperty = { '#accueil': '--w', '#italie': '--o', '#catalogue': '--d' }[selector];
    const progressSettled = !progressProperty || Math.abs(Number(element.style.getPropertyValue(progressProperty)) - progress) < .002;
    return Math.abs(scrollY - expectedY) <= 1 && progressSettled && Number(element.style.getPropertyValue(property)) >= .995;
  }, { selector, progress, property }, { timeout: 8000 });
  report.scenePositions.push({ selector, progress, waitedMs: Date.now() - startedAt,
    ...await page.locator(selector).evaluate((element, property) => ({
      scrollY, offsetTop: element.offsetTop, height: element.offsetHeight,
      value: Number(element.style.getPropertyValue(property)),
    }), property),
  });
}

async function capture(page, label, viewport) {
  if (!screenshots) return;
  const filename = `${label}-${viewport.width}-${theme}.jpg`;
  await page.screenshot({ path: join(output, filename), type: 'jpeg', quality: 85 });
  report.screenshots.push(filename);
}

async function showroomFacts(locator) {
  const copy = normalize(await locator.innerText());
  assert.match(copy, /400\s*m[²2]/u, 'The actual showroom surface is useful published information.');
  assert.match(copy, /Triangle d[’']Or/u, 'The actual showroom neighborhood appears.');
  assert.doesNotMatch(copy, /\b(?:Rabat|Marrakech|Tanger)\b/iu, 'Generic city-list filler is removed.');
}

async function clickDirections(page, locator, label) {
  assertDirections(await locator.getAttribute('href'));
  assert.equal(await locator.getAttribute('target'), '_blank');
  assert.match(await locator.getAttribute('rel') || '', /noopener/u);
  await locator.scrollIntoViewIfNeeded();
  const count = report.directions.length;
  const [popup] = await Promise.all([page.waitForEvent('popup'), locator.click()]);
  await popup.waitForLoadState('domcontentloaded');
  assertDirections(popup.url());
  assert.equal(report.directions.length, count + 1, 'The click requested the approved destination exactly once.');
  await popup.close();
  pass(`${label}: clic itinéraire vers le lieu approuvé (requête interceptée)`);
}

async function brandReference(page) {
  // Read public SSR only; no editor/API/authentication requests are needed to identify gallery media.
  const response = await fetch(new URL('/modeles/skorpio/', base), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  const html = await response.text();
  const images = await page.evaluate(({ html, origin }) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return [...doc.querySelectorAll('.model-gallery-view img')].map(image => new URL(image.getAttribute('src'), origin).href);
  }, { html, origin: base.origin });
  assert(images.length >= 8, 'Existing Skorpio gallery contains the two approved reference images.');
  expectedBrandImages = { main: images[5], detail: images[7] };
  assert.notEqual(expectedBrandImages.main, expectedBrandImages.detail);
}

async function normalMotionCase(browser, viewport) {
  const context = await contextFor(browser, viewport);
  const page = await context.newPage();
  const desktop = viewport.width > 820;
  const label = `${engine}/${viewport.width}/${theme}`;
  try {
    await open(page, '/');
    if (!expectedBrandImages) await brandReference(page);
    assert.equal(await page.locator('iframe').count(), 0, 'Homepage does not embed Google Maps.');
    assert(await page.locator(`a[href="${expectedPhone}"]`).count() >= 1, 'Owner-provided phone remains in the homepage footer.');
    const brand = desktop ? '#italie' : '#m-italie';
    const showroom = desktop ? '#showroom' : '#m-showroom';
    const plan = desktop ? '#plan' : '#m-plan';
    const brandMain = desktop ? '#italie .p1 img' : '#m-italie .m-brand-image img';
    await imageDecoded(page.locator(brandMain), expectedBrandImages.main, /Skorpio/iu);
    if (desktop) await imageDecoded(page.locator('#italie .p2 img'), expectedBrandImages.detail, /Skorpio/iu);
    const photo = await imageDecoded(page.locator(`${showroom} ${desktop ? '.img' : '.m-showroom-image'} img`), showroomImage, /(?:showroom|magasin).*(?:Casablanca)|Casablanca.*(?:showroom|magasin)/iu);
    showroomImage ||= photo;
    assert(!Object.values(expectedBrandImages).includes(photo), 'Showroom uses a real store photo, distinct from the product photos.');
    const copy = page.locator(desktop ? '#showroom .info' : '#m-showroom');
    await showroomFacts(copy);
    assert.equal(await copy.locator('dl, .facts').count(), 0, 'Homepage scene no longer repeats practical contact details.');
    assert.equal(await copy.locator('a').count(), 1, 'One clear next step in the homepage showroom scene.');
    const cta = copy.locator('a[href="/showroom-casablanca/"]');
    assert.equal(await cta.count(), 1);
    assert.match(await cta.innerText(), /showroom/iu);
    if (desktop) {
      await seek(page, '#accueil', .8);
      assert(Number(await page.locator('#accueil').evaluate(el => el.style.getPropertyValue('--g'))) > .95);
      assert(await page.locator('#accueil .over').evaluate(el => el.classList.contains('on')));
      await seek(page, brand, .3);
      assert(Number(await page.locator(brand).evaluate(el => el.style.getPropertyValue('--a'))) > .95);
      await capture(page, 'home-brand', viewport);
      await seek(page, '#collections', 1);
      assert(Number(await page.locator('#collections').evaluate(el => el.style.getPropertyValue('--h'))) > .95);
      assert.equal(await page.locator('#collections .cc:not(.cta)').count(), 6);
      await seek(page, showroom, .7);
      assert(Number(await page.locator(showroom).evaluate(el => el.style.getPropertyValue('--r'))) > .95);
      const bounds = await copy.boundingBox();
      assert(bounds && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height + 1, 'Simplified showroom copy fits its desktop scene.');
      assert.equal(await cta.evaluate(link => link.inert), false, 'Revealed showroom CTA is keyboard accessible.');
      await capture(page, 'home-showroom', viewport);
      await seek(page, '#catalogue', .6);
      assert(Number(await page.locator('#catalogue').evaluate(el => el.style.getPropertyValue('--c'))) > .95);
      pass(`${label}: animations accueil, Italie, six collections, showroom et catalogue`);
    } else {
      await scrollToContent(page, brand);
      await capture(page, 'home-brand', viewport);
      await scrollToContent(page, '#m-italie .m-brand-image');
      const before = await page.locator(brandMain).evaluate(image => image.style.transform);
      await page.evaluate(() => scrollBy({ top: 70, behavior: 'instant' }));
      await page.waitForTimeout(200);
      assert.notEqual(await page.locator(brandMain).evaluate(image => image.style.transform), before, 'Original mobile image drift follows scroll.');
      await scrollToContent(page, showroom);
      await capture(page, 'home-showroom', viewport);
      pass(`${label}: composition mobile et léger mouvement des images au défilement`);
    }
    await noOverflow(page, `${label} accueil`);
    pass(`${label}: accueil publié, photos sélectionnées, texte utile et CTA unique`);
    await clickDirections(page, page.locator(plan).getByRole('link', { name: 'Itinéraire', exact: true }), `${label} accueil`);

    if (desktop) await seek(page, showroom, .7);
    else await scrollToContent(page, showroom);
    await cta.click();
    await page.waitForURL('**/showroom-casablanca/');
    await page.locator('h1').waitFor();
    assert.equal(await page.title(), editorial.showroom.seo_title);
    assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), editorial.showroom.meta_description);
    const faqHeadings = editorial.showroom.sections.filter(section => section.section_key.startsWith('faq_')).map(section => section.heading);
    assert.equal(faqHeadings.length, 0, 'The repeated questions are now one contact note.');
    assert.equal(await page.locator('.page-faq details').count(), 0);
    assert((await page.locator('#showroom-contact').innerText()).includes(editorial.showroom.sections.find(section => section.section_key === 'contact_note').text));
    assert.deepEqual(await page.locator('.page-faq details summary').evaluateAll(summaries => summaries.map(summary =>
      [...summary.childNodes].filter(node => node.nodeType === Node.TEXT_NODE).map(node => node.textContent).join('').trim()
    )), faqHeadings);
    await showroomFacts(page.locator('main'));
    await imageDecoded(page.locator('.showroom-editorial .page-full-figure img'), showroomImage, /(?:showroom|magasin).*(?:Casablanca)|Casablanca.*(?:showroom|magasin)/iu);
    assert.equal(await page.locator('iframe').count(), 0, 'Dedicated map stays unloaded until requested.');
    assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
    await noOverflow(page, `${label} showroom`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    await capture(page, 'showroom-intro', viewport);
    await scrollToContent(page, '.showroom-information');
    await capture(page, 'showroom-information', viewport);
    const contact = page.locator('#showroom-contact');
    assert.match(await contact.innerText(), /8–10 Avenue Mohamed Sijilmassi/u);
    assert.match(await contact.innerText(), /Lundi/u);
    assert.match(await contact.innerText(), /Dimanche/u);
    assert.equal(await contact.locator(`a[href="${expectedPhone}"]`).count(), 1);
    assert.equal(await contact.locator('a[href*="wa.me"]').count(), 0, 'No unconfirmed WhatsApp channel.');
    await scrollToContent(page, '#showroom-contact');
    await capture(page, 'showroom-contact', viewport);
    await clickDirections(page, contact.locator('.showroom-directions'), `${label} page showroom`);
    pass(`${label}: page showroom, SEO, deux FAQ, même photo, coordonnées conservées et CTA accueil fonctionnel`);

    const otherTheme = theme === 'dark' ? 'light' : 'dark';
    await page.locator('[data-theme-toggle]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('html').getAttribute('data-mode'), otherTheme);
    await open(page, '/', otherTheme);
    await page.locator('[data-theme-toggle]').click();
    assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
    if (!desktop) {
      const toggle = page.locator('.mobile-menu-toggle');
      await toggle.click();
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
      await toggle.click();
      await page.locator('#mobile-navigation a[href="/showroom-casablanca/"]').first().click();
      await page.waitForURL('**/showroom-casablanca/');
      await page.locator('.page-mobile-menu > summary').click();
      assert.equal(await page.locator('.page-mobile-menu').evaluate(menu => menu.open), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.page-mobile-menu').evaluate(menu => menu.open), false);
    } else {
      await page.locator('header nav a[href="/showroom-casablanca/"]').first().click();
      await page.waitForURL('**/showroom-casablanca/');
    }
    assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
    pass(`${label}: navigation et changement de thème clavier conservé entre les pages`);
  } finally { await closeContext(context); }
}

async function reducedMotionCase(browser, viewport) {
  const context = await contextFor(browser, viewport, 'reduce');
  const page = await context.newPage();
  const desktop = viewport.width > 820;
  try {
    await open(page, '/');
    assert.equal(await page.locator('html').evaluate(el => el.classList.contains('motion-ready')), false);
    if (desktop) {
      assert.equal(await page.locator('#showroom .pin').evaluate(el => getComputedStyle(el).position), 'relative');
      assert.equal(await page.locator('#showroom .info').evaluate(el => Number(getComputedStyle(el).opacity)), 1);
    }
    const section = desktop ? '#showroom' : '#m-showroom';
    await scrollToContent(page, section);
    await showroomFacts(page.locator(section));
    assert.equal(await page.locator(`${section} a[inert]`).count(), 0);
    if (!desktop) assert.equal(await page.locator('#m-showroom .mimg img').evaluate(image => image.style.transform), '');
    await noOverflow(page, 'Reduced-motion homepage');
    await open(page, '/showroom-casablanca/');
    await scrollToContent(page, '#showroom-contact');
    assert.equal(await page.locator('#showroom-contact').evaluate(el => Number(getComputedStyle(el).opacity)), 1);
    pass(`${engine}/${viewport.width}/${theme}: mouvement réduit, contenus et contacts lisibles sans animation`);
  } finally { await closeContext(context); }
}

const browser = await (engine === 'chromium' ? chromium : webkit).launch({
  headless: true, ...(engine === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}),
});
try {
  for (const viewport of viewports) await normalMotionCase(browser, viewport);
  for (const viewport of viewports) await reducedMotionCase(browser, viewport);
  assert.deepEqual(report.errors, [], 'No application JavaScript exceptions.');
  assert.deepEqual(report.attemptedWrites, [], 'No attempted non-GET/HEAD requests.');
  assert.deepEqual(report.blockedPrivateRequests, [], 'No attempted private CMS/API requests.');
  pass('Lecture anonyme seulement : aucune écriture, requête privée ou exception JavaScript');
} catch (error) {
  failure = error;
  report.failure = error.stack || String(error);
} finally {
  await browser.close();
  await writeFile(join(output, 'report.json'), JSON.stringify({ ...report, finishedAt: new Date().toISOString(), passed: !failure }, null, 2));
}
if (failure) throw failure;
