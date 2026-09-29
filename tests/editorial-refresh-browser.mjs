/**
 * Anonymous public checks after migration 0010 or 0011. No credentials, storage state,
 * native CMS API, publication, setup, or valid catalogue submissions are used.
 * All requests except GET/HEAD are blocked before they leave the browser.
 *
 * PUBLIC_TEST_ENGINE=chromium|webkit PUBLIC_TEST_THEME=dark|light
 * PUBLIC_TEST_REVISION=0010|0011 (default 0010 for the historical/local content)
 * PUBLIC_TEST_URL=http://localhost:4321 node tests/editorial-refresh-browser.mjs
 * Optional --only-content / --only-layouts; PUBLIC_TEST_SCREENSHOTS=false.
 * Default: five desktop/dark and five mobile/light Chromium captures in total.
 * PUBLIC_TEST_CAPTURE_VIEWPORTS=all captures both viewports in each Chromium run.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const base = new URL(process.env.PUBLIC_TEST_URL || 'http://localhost:4321');
assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password);
assert.equal(base.pathname, '/', 'Choose a public preview origin, not a private route.');
assert(!base.search && !base.hash, 'Signed previews and query credentials are outside this suite.');
const engine = process.env.PUBLIC_TEST_ENGINE || 'chromium';
const theme = process.env.PUBLIC_TEST_THEME || 'dark';
const revision = process.env.PUBLIC_TEST_REVISION || '0010';
assert(['chromium', 'webkit'].includes(engine));
assert(['dark', 'light'].includes(theme));
assert(['0010', '0011'].includes(revision), 'Choose editorial revision 0010 or 0011.');
const onlyContent = process.argv.includes('--only-content');
const onlyLayouts = process.argv.includes('--only-layouts');
assert(!(onlyContent && onlyLayouts));
assert(process.argv.slice(2).every(flag => ['--only-content', '--only-layouts'].includes(flag)));
const output = resolve(process.env.PUBLIC_TEST_OUTPUT || 'test-results/editorial-refresh', `${engine}-${theme}`);
const screenshots = process.env.PUBLIC_TEST_SCREENSHOTS !== 'false' && engine === 'chromium';
const captureAll = process.env.PUBLIC_TEST_CAPTURE_VIEWPORTS === 'all';
const load = async name => JSON.parse(await readFile(`content/${name}.json`, 'utf8'));
const entries = (await Promise.all(['editorial-refresh-pages', 'editorial-refresh-products', 'editorial-refresh-journal'].map(load))).flat();
if (revision === '0011') {
  const updates = await load('seo-editorial-2026-09-29');
  const seen = new Set();
  for (const update of updates) {
    const key = `${update.collection}/${update.slug}`;
    assert(!seen.has(key), `Duplicate revision 0011 entry: ${key}`);
    seen.add(key);
    const entry = entries.find(item => item.collection === update.collection && item.slug === update.slug);
    assert(entry, `Revision 0011 must update an existing 0010 entry: ${key}`);
    entry.after = {...entry.after, ...update.after};
    if (update.seoAfter) entry.seoAfter = {...entry.seoAfter, ...update.seoAfter};
  }
}
const global = entries.find(entry => entry.collection === 'site_content' && entry.slug === 'global').after;
const modelBaseline = new Map((await load('model-editorial')).entries.map(entry => [entry.slug, entry]));
const modelDetails = new Map((await load('model-details')).models.map(entry => [entry.slug, entry]));
const location = await load('showroom-location');
const menu = await load('editorial-refresh-menu');
const phone = `tel:${location.global.after.contact_phone.replace(/[^+\d]/gu, '')}`;
const routeFor = entry => entry.collection === 'pages' ? (entry.slug === 'home' ? '/' : `/${entry.slug}/`)
  : `/${entry.collection === 'families' ? 'collections' : entry.collection === 'models' ? 'modeles' : 'journal'}/${entry.slug}/`;
const pageEntries = entries.filter(entry => entry.collection !== 'site_content');
const routes = [...pageEntries.map(routeFor), '/confidentialite/'];
assert.equal(new Set(routes).size, 28, 'All 28 existing public routes are covered.');
assert.equal(pageEntries.filter(entry => entry.collection === 'families').length, 6);
assert.equal(pageEntries.filter(entry => entry.collection === 'models').length, 11);
assert.equal(pageEntries.filter(entry => entry.collection === 'posts').length, 5);
const articlePath = '/journal/choisir-forme-proportions-table-salle-a-manger/';
const viewports = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const report = {
  startedAt: new Date().toISOString(), origin: base.origin, engine, theme, revision, readOnly: true,
  checks: [], routes: [], links: [], layouts: [], screenshots: [], captureImages: [], animationPositions: [],
  attemptedWrites: [], blockedPrivateRequests: [], errors: [], failure: '',
  limits: ['No valid catalogue request or private PDF download is attempted.', 'External source URLs are checked as rendered links; their remote availability is not tested.'],
};
const pass = (name, data = {}) => { report.checks.push({ name, ...data }); console.log(`PASS ${name}`); };
const normalize = value => String(value || '').replace(/\s+/gu, ' ').trim();
const blockText = block => normalize(block.children.map(span => span.text).join(''));
const documents = new Map();
let failure;
await mkdir(output, { recursive: true });

function isPrivate(url) {
  if (url.pathname === '/_image') {
    const source = url.searchParams.get('href') || '';
    // Keep the native image service from reaching a private CMS/auth URL
    // through its source parameter. Only public raster media is in scope.
    if (!/^\/_emdash\/api\/media\/file\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp|avif)$/i.test(source)) return true;
  }
  return url.pathname.startsWith('/preview/') || url.searchParams.has('_preview') ||
    (url.pathname.startsWith('/_emdash/') && !url.pathname.startsWith('/_emdash/api/media/file/'));
}
function publicUrl(path) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin, 'Public checks must stay on the chosen origin.');
  assert(!url.username && !url.password && !isPrivate(url), `Private/credential route refused: ${url.pathname}`);
  return url;
}
async function get(path, method = 'GET') {
  assert(['GET', 'HEAD'].includes(method));
  const response = await fetch(publicUrl(path), { method, redirect: 'manual', signal: AbortSignal.timeout(30000), headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(response.status, 200, `${method} ${new URL(path, base).pathname}`);
  return response;
}
async function markup(path) {
  const url = publicUrl(path); url.hash = '';
  if (!documents.has(url.href)) {
    const response = await get(url.href);
    assert.match(response.headers.get('content-type') || '', /text\/html/u);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/u, 'Private preview stays non-indexable.');
    documents.set(url.href, await response.text());
  }
  return documents.get(url.href);
}
async function nodes(page, html, selector, attribute) {
  return page.evaluate(({ html, selector, attribute }) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return [...doc.querySelectorAll(selector)].map(node => {
      if (attribute) return node.getAttribute(attribute);
      const copy = node.cloneNode(true);
      copy.querySelectorAll('[aria-hidden="true"]').forEach(child => child.remove());
      copy.querySelectorAll('br').forEach(child => child.replaceWith(' '));
      return copy.textContent.replace(/\s+/gu, ' ').trim();
    });
  }, { html, selector, attribute });
}
async function exact(page, html, selector, expected, label = selector) {
  assert.deepEqual(await nodes(page, html, selector), expected.map(normalize), label);
}
async function contextFor(browser, viewport, reducedMotion = 'no-preference') {
  const context = await browser.newContext({ viewport, reducedMotion, serviceWorkers: 'block' });
  await context.addInitScript(value => { try { if (!localStorage.getItem('ci-mode')) localStorage.setItem('ci-mode', value); } catch { /* Opaque parsing documents have no storage. */ } }, theme);
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) {
      report.attemptedWrites.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    if (url.username || url.password || isPrivate(url)) {
      report.blockedPrivateRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
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
async function checkFormMarkup(page, html, path) {
  const count = path === '/' ? 2 : 1;
  const selector = '[data-catalogue-form]';
  assert.equal((await nodes(page, html, selector)).length, count, path);
  const attributes = {
    'data-error': 'form_error', 'data-email-error': 'form_email_error', 'data-unavailable': 'form_unavailable',
    'data-pending': 'form_pending', 'data-success-title': 'form_success_title', 'data-success-text': 'form_success_text',
  };
  for (const [attribute, field] of Object.entries(attributes)) {
    assert.deepEqual(await nodes(page, html, selector, attribute), Array(count).fill(global[field]), `${path}: ${field}`);
  }
  await exact(page, html, `${selector} label[for$="-email"]`, Array(count).fill(global.form_email_label));
  await exact(page, html, `${selector} .form-consent span`, Array(count).fill(global.form_opt_in_label));
  await exact(page, html, `${selector} .form-note`, Array(count).fill(global.form_hint));
  await exact(page, html, `${selector} .form-privacy`, Array(count).fill(`${global.form_privacy} Confidentialité`));
  await exact(page, html, `${selector} button[type="submit"]`, Array(count).fill(global.catalogue_label));
  assert.deepEqual(await nodes(page, html, `${selector} [name="communicationsConsent"]`, 'required'), Array(count).fill(null));
  assert.deepEqual(await nodes(page, html, `${selector} [name="communicationsConsent"]`, 'checked'), Array(count).fill(null));
  assert.equal((await nodes(page, html, `${selector} .form-privacy a[href="/confidentialite/"]`)).length, count);
}
async function verifyContent(browser) {
  const context = await contextFor(browser, viewports[0], 'reduce');
  const page = await context.newPage();
  const localLinks = new Set();
  try {
    for (const path of routes) {
      const html = await markup(path);
      assert.equal((await nodes(page, html, 'head > title')).length, 1, path);
      assert.equal((await nodes(page, html, 'h1')).length, path === '/' ? 2 : 1, path);
      assert((await nodes(page, html, 'main'))[0]?.length > 20, `${path}: rendered main content.`);
      for (const href of await nodes(page, html, 'a[href]', 'href')) {
        const target = new URL(href, new URL(path, base));
        if (target.origin === base.origin) localLinks.add(target.href);
      }
      report.routes.push(path);
    }
    const index = await markup('/collections/');
    const home = await markup('/');
    const journal = await markup('/journal/');
    const reachedModels = new Set();
    for (const entry of pageEntries) {
      const path = routeFor(entry), html = await markup(path), after = entry.after;
      const seo = entry.seoAfter || (entry.collection === 'models' ? modelBaseline.get(entry.slug).afterSeo : null);
      const title = seo?.title || after.seo_title;
      const description = seo?.description || after.meta_description;
      if (title) await exact(page, html, 'head > title', [title], `${path}: title`);
      if (description) {
        assert.deepEqual(await nodes(page, html, 'meta[name="description"]', 'content'), [description], path);
        assert.deepEqual(await nodes(page, html, 'meta[property="og:description"]', 'content'), [description], path);
      }
      if (after.title) await exact(page, html, 'h1', [after.title], path);
      if ('intro' in after && entry.slug !== 'home') await exact(page, html, '.page-lead', after.intro ? [after.intro] : [], path);
      if (entry.collection === 'families') {
        await exact(page, html, '.page-reading-section .page-prose > :is(p,h2,h3)', after.content.map(blockText), path);
        await exact(page, index, `.family-tile[href="${path}"] > p`, [after.card_text], path);
        await exact(page, home, `#collections .cc[href="${path}"] > p`, [after.card_text], path);
        await exact(page, home, `#m-collections a[href="${path}"] .m-family-summary`, [after.card_text], path);
        const cards = await nodes(page, html, '.model-card a', 'href');
        for (const href of cards) { assert.match(href, /^\/modeles\/[^/]+\/$/u); reachedModels.add(href); }
        const editorialModels = after.content.flatMap(block => block.markDefs || []).filter(mark => mark.href?.startsWith('/modeles/')).map(mark => mark.href);
        assert.deepEqual([...cards].sort(), [...new Set(editorialModels)].sort(), `${path}: selected models retained.`);
        await exact(page, html, '.models-section > .page-note', [global.model_notice]);
        await exact(page, html, '.page-cta :is(h2,.kick)', []);
      } else if (entry.collection === 'models') {
        await exact(page, html, '.page-lead', [after.description || modelBaseline.get(entry.slug).after.description], path);
        await exact(page, html, '.model-story .page-prose > :is(p,h2,h3)', after.content.map(blockText), path);
        const availability = normalize(after.availability_note);
        await exact(page, html, '.model-availability', availability ? [availability] : [], path);
        await exact(page, html, '.model-project :is(h2,.kick)', []);
        const sharedNotice = normalize(global.model_notice);
        await exact(page, html, '.model-project .model-site-notice', sharedNotice && sharedNotice !== availability ? [sharedNotice] : [], path);
        await exact(page, html, '#model-gallery-heading', ['Photos']);
        const details = modelDetails.get(entry.slug);
        assert.equal((await nodes(page, html, '.model-gallery-view')).length, details.gallery.length, path);
        await exact(page, html, '.model-dimension-value', details.dimensions.map(item => item.value), `${path}: technical dimensions retained.`);
        const pdf = (await nodes(page, html, '.model-technical-download', 'href'))[0];
        assert(pdf, `${path}: technical PDF remains linked.`);
        assert.match((await get(pdf, 'HEAD')).headers.get('content-type') || '', /application\/pdf/u);
        const groups = await nodes(page, html, '.model-finish-group h3');
        assert(groups.length > 0 && groups.every(group => !/metals|Cuir Chaise\/Lit|Tissu Canapé/u.test(group)), `${path}: translated finish groups.`);
        assert(!(await nodes(page, html, '.model-finish > p')).some(name => /balnc/u.test(name)));
      } else if (entry.collection === 'posts') {
        await exact(page, html, '.page-lead', [after.excerpt], path);
        await exact(page, html, '.article-reading .page-prose > :is(p,h2,h3)', after.content.map(blockText), path);
        await exact(page, html, '.cta-copy', []);
        await exact(page, html, '.page-cta .btn', [after.cta_label], path);
        await exact(page, journal, `.journal-card a[href="${path}"] .journal-card-copy > p:not(.kick)`, [after.excerpt], path);
        const sources = await nodes(page, html, '.article-sources a', 'href');
        assert(sources.length > 0 && sources.every(href => /(^|\.)cattelanitalia\.com$/u.test(new URL(href).hostname)), `${path}: official sources are present.`);
        if (after.sources) {
          assert.deepEqual(sources, after.sources.map(source => source.url), path);
          await exact(page, html, '.article-sources a', after.sources.map(source => source.label), path);
        }
        if (after.cta_href) assert.deepEqual(await nodes(page, html, '.page-cta .btn', 'href'), [after.cta_href], path);
      }
      if (after.content) {
        const renderedLinks = await nodes(page, html, '.page-prose a', 'href');
        for (const block of after.content) for (const mark of block.markDefs || []) {
          if (mark._type === 'link') assert(renderedLinks.includes(mark.href), `${path}: missing contextual link ${mark.href}.`);
        }
      }
      if (entry.collection === 'pages' && entry.slug !== 'home' && after.sections) {
        const expected = after.sections.filter(section => section.heading || section.display_heading || section.text || (section.cta_label && section.cta_href));
        assert.deepEqual(await nodes(page, html, '[data-section-key]', 'data-section-key'), expected.map(section => section.section_key), path);
        for (const section of expected) {
          const selector = `[data-section-key="${section.section_key}"]`;
          await exact(page, html, `${selector} h2`, (section.display_heading || section.heading) ? [section.display_heading || section.heading] : [], path);
          await exact(page, html, `${selector} p`, section.text ? [section.text] : [], path);
          await exact(page, html, `${selector} a`, section.cta_label ? [section.cta_label] : [], path);
        }
      }
      pass(`SSR ${path}: contenu publié, métadonnées et liens éditoriaux`);
    }
    assert.equal(reachedModels.size, 11);
    const homeEntry = pageEntries.find(entry => entry.slug === 'home');
    await exact(page, home, '#accueil .over .hero-intro, #m-accueil > .txt', [homeEntry.after.intro, homeEntry.after.intro]);
    for (const section of homeEntry.after.sections) {
      const desktop = { brand: '#italie .col', collections: '#collections .intro', showroom: '#showroom .info', catalogue: '#catalogue .form', journal: '#journal' }[section.section_key];
      const mobile = `#m-${section.section_key === 'brand' ? 'italie' : section.section_key}`;
      await exact(page, home, `${desktop} > .txt, ${mobile} > .txt`, section.text ? [section.text, section.text] : [], section.section_key);
    }
    await exact(page, home, '#italie .cap', [homeEntry.after.brand_caption]);
    await exact(page, home, '#plan .note, #m-plan > .legal', []);
    const showroom = await markup('/showroom-casablanca/');
    const showroomSections = pageEntries.find(entry => entry.slug === 'showroom-casablanca').after.sections;
    const showroomContactNotes = showroomSections.filter(section => section.section_key === 'contact_note');
    await exact(page, showroom, '#showroom-contact [data-section-key="contact_note"] p', showroomContactNotes.flatMap(section => section.text ? [section.text] : []));
    await exact(page, showroom, '.page-faq', []);
    assert.deepEqual(await nodes(page, showroom, '.showroom-editorial [data-section-key]', 'data-section-key'), showroomSections.filter(section => section.section_key !== 'contact_note' && !section.section_key.startsWith('faq_')).map(section => section.section_key));
    assert.equal((await nodes(page, showroom, `#showroom-contact a[href="${phone}"]`)).length, 1);
    assert.equal((await nodes(page, showroom, 'iframe')).length, 0, 'Google map remains unloaded.');
    const directions = new URL((await nodes(page, showroom, '.showroom-directions', 'href'))[0]);
    const approvedDirections = new URL(location.global.after.map_url);
    assert.equal(directions.href, approvedDirections.href, 'Directions retain the approved store destination.');
    await checkFormMarkup(page, home, '/');
    const catalogue = await markup('/catalogue/');
    await checkFormMarkup(page, catalogue, '/catalogue/');
    assert.equal((await nodes(page, catalogue, '.catalogue-description .page-note')).length, 1, 'One retained demo-document notice.');
    await exact(page, catalogue, '.catalogue-description > p:not(.page-note)', []);
    await exact(page, catalogue, '.page-cta', []);
    await exact(page, journal, '.page-cta', []);
    const privacy = await markup('/confidentialite/');
    assert((await nodes(page, privacy, '.page-prose'))[0].includes('Aucun e-mail n’est envoyé'));
    for (const html of [home, index, showroom, catalogue, journal]) {
      const navLabels = await nodes(page, html, `header a[href="${menu.url}"]`);
      assert(navLabels.length > 0 && navLabels.every(label => label === menu.afterLabel), 'Native menu uses the concise catalogue label.');
    }
    pass(`Révision ${revision} : accueil, showroom, catalogue, formulaire facultatif et navigation — champs globaux et suppression des répétitions`);
    for (const href of localLinks) {
      const target = publicUrl(href);
      if (target.pathname.startsWith('/_emdash/api/media/file/') || /\.[a-z0-9]+$/iu.test(target.pathname)) await get(href, 'HEAD');
      else {
        const html = await markup(href);
        if (target.hash) {
          const id = decodeURIComponent(target.hash.slice(1));
          const exists = await page.evaluate(({ html, id }) => !!new DOMParser().parseFromString(html, 'text/html').getElementById(id), { html, id });
          assert(exists, `${target.pathname}: missing #${id}.`);
        }
      }
      report.links.push(`${target.pathname}${target.hash}`);
    }
    pass(`${localLinks.size} liens internes : réponses 200 et ancres présentes`);
  } finally { await closeContext(context); }
}

async function noOverflow(page, label) {
  const size = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
  assert(size.document <= size.width + 1, `${label}: horizontal overflow ${JSON.stringify(size)}`);
}
async function open(page, path, expectedTheme = theme) {
  const response = await page.goto(publicUrl(path).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
  assert.equal(response.status(), 200, path);
  await page.locator('h1:visible').first().waitFor();
  await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(done => setTimeout(done, 2500))]));
  assert.equal(await page.locator('html').getAttribute('data-mode'), expectedTheme, path);
  await noOverflow(page, path);
  const duplicates = await page.locator('[id]').evaluateAll(elements => elements.map(element => element.id).filter((id, i, ids) => ids.indexOf(id) !== i));
  assert.deepEqual(duplicates, [], `${path}: unique DOM IDs.`);
}
async function scrollToContent(page, selector) {
  await page.locator(selector).evaluate(element => scrollTo({ top: element.getBoundingClientRect().top + scrollY - (document.querySelector('header')?.offsetHeight || 0) - 24, behavior: 'instant' }));
  await page.waitForTimeout(850);
}
async function seek(page, selector, progress) {
  await page.locator(selector).evaluate((element, value) => scrollTo({ top: element.offsetTop + Math.max(0, element.offsetHeight - innerHeight) * value, behavior: 'instant' }), progress);
  const property = { '#accueil': '--g', '#italie': '--a', '#collections': '--h', '#showroom': '--r', '#catalogue': '--c' }[selector];
  assert(property);
  await page.waitForFunction(({ selector, progress, property }) => {
    const element = document.querySelector(selector);
    const expectedY = element.offsetTop + Math.max(0, element.offsetHeight - innerHeight) * progress;
    const progressProperty = { '#accueil': '--w', '#italie': '--o', '#catalogue': '--d' }[selector];
    return Math.abs(scrollY - expectedY) <= 1 && Number(element.style.getPropertyValue(property)) >= .995 &&
      (!progressProperty || Math.abs(Number(element.style.getPropertyValue(progressProperty)) - progress) < .002);
  }, { selector, progress, property }, { timeout: 10000 });
  report.animationPositions.push({ selector, progress, engine, theme });
}
async function capture(page, name, viewport) {
  if (!screenshots || (!captureAll && ((theme === 'dark') !== (viewport.width === 1440)))) return;
  const images = await page.evaluate(async () => {
    const decoded = [];
    const intersectsVisibleArea = image => {
      const rect = image.getBoundingClientRect();
      let left = Math.max(0, rect.left), right = Math.min(innerWidth, rect.right);
      let top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom);
      // A parallax image extends beyond its frame. Intersect with both viewport
      // axes and every scrolling/clipping ancestor, not only its vertical box.
      // Offscreen lazy carousel images are correctly left unloaded by browsers.
      for (let element = image; element; element = element.parentElement) {
        const style = getComputedStyle(element);
        if (style.display === 'none' || ['hidden', 'collapse'].includes(style.visibility) ||
          Number(style.opacity) === 0 || style.contentVisibility === 'hidden') return false;
        if (element !== image) {
          const clip = element.getBoundingClientRect();
          if (style.overflowX !== 'visible') { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
          if (style.overflowY !== 'visible') { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
        }
        if (right <= left || bottom <= top) return false;
      }
      return right > left && bottom > top;
    };
    for (const image of document.images) {
      if (!intersectsVisibleArea(image)) continue;
      const description = `${image.alt || '(no alt)'}: ${image.currentSrc || image.src}`;
      let timer;
      try {
        await Promise.race([image.decode(), new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Visible image decode timed out — ${description}`)), 15000);
        })]);
        if (!image.naturalWidth) throw new Error(`Visible image is broken — ${description}`);
      } catch (error) {
        throw new Error(`Cannot capture visible image — ${description} — ${error.message}`);
      } finally { clearTimeout(timer); }
      decoded.push({ src: image.currentSrc || image.src, alt: image.alt, width: image.naturalWidth, height: image.naturalHeight });
    }
    return decoded;
  });
  assert(images.length > 0, `${name}: representative screenshot contains a decoded visible image.`);
  report.captureImages.push({ name, viewport, images });
  await noOverflow(page, name);
  const file = `${name}-${viewport.width}-${theme}.jpg`;
  await page.screenshot({ path: join(output, file), type: 'jpeg', quality: 85, timeout: 20000 });
  report.screenshots.push(file);
}
async function invalidForm(page) {
  const form = page.locator('[data-catalogue-form]');
  await page.waitForFunction(() => document.querySelector('[data-catalogue-form]')?.noValidate === true);
  const consent = form.locator('[name="communicationsConsent"]');
  assert.equal(await consent.isChecked(), false);
  assert.equal(await consent.getAttribute('required'), null);
  await consent.check(); assert.equal(await consent.isChecked(), true);
  await consent.uncheck();
  await form.locator('button[type="submit"]').click();
  assert.equal(await form.locator('[data-field-error="name"]').innerText(), await form.getAttribute('data-name-error'));
  assert.equal(await form.locator('[name="name"]').getAttribute('aria-invalid'), 'true');
  await form.locator('[name="name"]').fill('Essai local');
  await form.locator('[name="email"]').fill('invalide');
  await form.locator('button[type="submit"]').click();
  assert.equal(await form.locator('[data-field-error="email"]').innerText(), global.form_email_error);
  assert.equal(await form.locator('[name="email"]').getAttribute('aria-invalid'), 'true');
  assert.equal(await form.locator('[name="email"]').evaluate(input => input === document.activeElement), true);
  await form.locator('[name="name"]').fill('');
  await form.locator('[name="email"]').fill('');
  await page.evaluate(() => document.activeElement?.blur());
}
async function verifyLayouts(browser) {
  for (const viewport of viewports) {
    const context = await contextFor(browser, viewport);
    const page = await context.newPage();
    const desktop = viewport.width > 820;
    try {
      for (const path of routes) {
        await open(page, path);
        report.layouts.push({ path, width: viewport.width, height: viewport.height, theme, engine });
      }
      pass(`${engine}/${theme}/${viewport.width} : 28 pages sans débordement, thème et DOM complets`);
      await open(page, '/');
      if (desktop) {
        await seek(page, '#accueil', .8);
        await seek(page, '#italie', .3);
        await seek(page, '#collections', 1);
        await seek(page, '#showroom', .7);
      } else {
        await scrollToContent(page, '#m-showroom');
        const picture = page.locator('#m-showroom .mimg img');
        const before = await picture.evaluate(image => image.style.transform);
        await page.evaluate(() => scrollBy({ top: 70, behavior: 'instant' }));
        await page.waitForTimeout(200);
        assert.notEqual(await picture.evaluate(image => image.style.transform), before, 'Mobile image drift follows scrolling.');
        await scrollToContent(page, '#m-showroom');
      }
      await capture(page, 'home-showroom', viewport);
      const homeShowroom = page.locator(desktop ? '#showroom .info' : '#m-showroom');
      assert.equal(await homeShowroom.locator('a').count(), 1);
      if (desktop) {
        const bounds = await homeShowroom.boundingBox();
        assert(bounds && bounds.y >= 0 && bounds.y + bounds.height <= viewport.height + 1, 'Home showroom text fits the scene.');
        await seek(page, '#catalogue', .6);
      }
      pass(`${engine}/${theme}/${viewport.width} : animations et composition de l’accueil`);
      await open(page, '/showroom-casablanca/');
      await scrollToContent(page, '#showroom-contact');
      await capture(page, 'showroom-contact', viewport);
      assert.equal(await page.locator('#showroom-contact [data-section-key="contact_note"]').count(), 1);
      assert.equal(await page.locator('.page-faq').count(), 0);
      await open(page, '/collections/tables/');
      await scrollToContent(page, '.page-reading-section');
      await capture(page, 'family-tables', viewport);
      await open(page, articlePath);
      await scrollToContent(page, '.article-reading');
      await capture(page, 'journal-table', viewport);
      await page.locator('.article-sources summary').click();
      assert.equal(await page.locator('.article-sources details').evaluate(element => element.open), true);
      assert.equal(await page.locator('.cta-copy').count(), 0);
      await open(page, '/catalogue/');
      await capture(page, 'catalogue-form', viewport);
      await invalidForm(page);
      pass(`${engine}/${theme}/${viewport.width} : showroom, guide, article, erreurs locales du formulaire et consentement facultatif`);
      const otherTheme = theme === 'dark' ? 'light' : 'dark';
      await page.locator('[data-theme-toggle]').press('Enter');
      assert.equal(await page.locator('html').getAttribute('data-mode'), otherTheme);
      await open(page, '/', otherTheme);
      await page.locator('[data-theme-toggle]').click();
      assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
      if (!desktop) {
        const toggle = page.locator('.mobile-menu-toggle');
        await toggle.click(); assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape'); assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
        await toggle.click();
        await page.locator('#mobile-navigation a[href="/collections/"]').first().click();
      } else await page.locator('header nav a[href="/collections/"]').first().click();
      await page.waitForURL('**/collections/');
      await page.locator('.family-tile[href="/collections/tables/"]').click();
      await page.waitForURL('**/collections/tables/');
      await page.locator('.model-card a[href="/modeles/skorpio/"]').click();
      await page.waitForURL('**/modeles/skorpio/');
      assert.equal(context.pages().length, 1);
      assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
      pass(`${engine}/${theme}/${viewport.width} : thème au clavier et navigation accueil→famille→modèle`);
    } finally { await closeContext(context); }
  }
  const context = await contextFor(browser, viewports[0], 'reduce');
  try {
    const page = await context.newPage();
    await open(page, '/');
    assert.equal(await page.locator('html').evaluate(element => element.classList.contains('motion-ready')), false);
    await scrollToContent(page, '#showroom');
    assert.equal(await page.locator('#showroom .info').evaluate(element => Number(getComputedStyle(element).opacity)), 1);
    assert.equal(await page.locator('#showroom .pin').evaluate(element => getComputedStyle(element).position), 'relative');
    await noOverflow(page, 'Reduced motion');
    pass(`${engine}/${theme} : contenu accessible avec mouvement réduit`);
  } finally { await closeContext(context); }
}

const browser = await { chromium, webkit }[engine].launch({ headless: true,
  ...(engine === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
try {
  if (!onlyLayouts) await verifyContent(browser);
  if (!onlyContent) await verifyLayouts(browser);
  assert.deepEqual(report.attemptedWrites, [], 'No attempted writes.');
  assert.deepEqual(report.blockedPrivateRequests, [], 'No private CMS or credential requests.');
  assert.deepEqual(report.errors, [], 'No browser JavaScript exceptions.');
} catch (error) {
  failure = error;
  report.failure = error.stack || String(error);
  console.error(report.failure);
} finally {
  await browser.close().catch(() => {});
  const suffix = onlyContent ? '-content' : onlyLayouts ? '-layouts' : '';
  await writeFile(join(output, `report${suffix}.json`), JSON.stringify({ ...report, finishedAt: new Date().toISOString(), passed: !failure }, null, 2));
}
if (failure) process.exitCode = 1;
