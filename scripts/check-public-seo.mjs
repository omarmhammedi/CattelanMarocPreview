/** Anonymous deployment checks. Never authenticates, submits a form, or changes indexing. */
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const origin = 'https://cattelan-maroc-preview.cattelan.workers.dev';
const decode = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
function attributes(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gu)]
    .map(([, key, double, single]) => [key.toLowerCase(), decode(double ?? single)]));
}
function tags(html, name) {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'giu'))].map(match => attributes(match[0]));
}
const meta = (html, key) => tags(html, 'meta').filter(tag => tag.name === key || tag.property === key).map(tag => tag.content || '');
const canonical = html => tags(html, 'link').filter(tag => tag.rel === 'canonical').map(tag => tag.href || '');

export function checkPage({ status, headers, body }, path, { image = false } = {}) {
  assert.equal(status, 200, `${path}: expected a published page`);
  assert.match(headers['content-type'] || '', /^text\/html/iu);
  assert.match(headers['x-robots-tag'] || '', /noindex/iu, `${path}: preview header must exclude indexing`);
  const title = [...body.matchAll(/<title\b[^>]*>([\s\S]*?)<\/title>/giu)];
  assert.equal(title.length, 1, `${path}: exactly one title`);
  assert(title[0][1].trim(), `${path}: empty title`);
  assert.equal((body.match(/<h1(?:\s|>)/giu) || []).length, 1, `${path}: exactly one H1`);
  const description = meta(body, 'description');
  assert.equal(description.length, 1, `${path}: exactly one description`);
  assert(description[0].trim(), `${path}: empty description`);
  assert(meta(body, 'robots').some(value => /noindex/iu.test(value)), `${path}: preview HTML must exclude indexing`);
  const preferred = canonical(body);
  assert.equal(preferred.length, 1, `${path}: exactly one canonical`);
  assert(['http:', 'https:'].includes(new URL(preferred[0]).protocol), `${path}: absolute public canonical`);
  const images = meta(body, 'og:image');
  assert(images.every(value => /^https?:\/\//u.test(value)), `${path}: absolute sharing image required`);
  if (image) assert(images.length, `${path}: sharing image required for this explicit fixture`);
  // Invalid graph output fails; editors may intentionally omit optional metadata.
  const graphs = [...body.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/giu)];
  for (const [, json] of graphs) JSON.parse(json);
  assert(!tags(body, 'link').some(tag => tag.rel === 'stylesheet' && tag.href?.startsWith('https://fonts.googleapis.com/')),
    `${path}: external Google Fonts stylesheet returned to the render path`);
  return { title: decode(title[0][1].trim()), canonical: preferred[0], graphs: graphs.length, sharingImages: images.length,
    warnings: images.length ? [] : ['No sharing image configured; the native editor can intentionally leave it empty.'] };
}

export function checkRobots(body) {
  assert.match(body, /^User-agent:\s*\*\s*$/imu, 'Preview robots needs a wildcard group');
  assert.match(body, /^Disallow:\s*\/\s*$/imu, 'Preview robots must remain closed');
  assert.doesNotMatch(body, /^Allow:\s*\//imu, 'Preview robots must not expose allowed paths');
}

async function read(path, method = 'GET') {
  assert(path.startsWith('/') && !path.startsWith('//'), 'Only relative public paths are allowed');
  const url = new URL(path, origin);
  assert.equal(url.origin, origin);
  for (let attempt = 0; ; attempt++) {
    // Never follow an unexpected redirect off the pinned account or send authentication.
    const response = await fetch(url, { method, redirect: 'manual', signal: AbortSignal.timeout(30_000), headers: { 'User-Agent': 'Cattelan deployment SEO check' } });
    const result = { status: response.status, headers: Object.fromEntries(response.headers), body: await response.text() };
    if (![429, 502, 503, 504].includes(result.status) || attempt === 2) return result;
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }
}

export async function runChecks(fetchPage = read) {
  const checks = [];
  const run = async (name, action) => {
    try { checks.push({ name, ok: true, ...await action() }); }
    catch (error) { checks.push({ name, ok: false, error: error.message }); }
  };
  const pages = ['/', '/showroom-casablanca/', '/sur-mesure/', '/professionnels/', '/a-propos/', '/votre-projet/', '/faq/', '/mentions-legales/', '/confidentialite/'];
  for (const path of pages) await run(`page ${path}`, async () => checkPage(await fetchPage(path), path));
  for (const method of ['GET', 'HEAD']) await run(`${method} slash redirect`, async () => {
    const target = await fetchPage('/showroom-casablanca/');
    const preferred = canonical(target.body)[0];
    const response = await fetchPage('/showroom-casablanca?utm_source=seo-check', method);
    // Public HTML cannot distinguish the default canonical from an identical
    // explicit editor override. Both 200 variants must agree on their canonical.
    if (response.status === 200) {
      const html = method === 'GET' ? response : await fetchPage('/showroom-casablanca?utm_source=seo-check');
      assert.equal(canonical(html.body)[0], preferred, 'URL variants disagree on their preferred URL');
    } else {
      assert.equal(response.status, 301, 'Expected a canonical response or permanent slash redirect');
      assert.equal(new URL(response.headers.location, origin).href, new URL('/showroom-casablanca/?utm_source=seo-check', origin).href);
    }
    assert.match(response.headers['x-robots-tag'] || '', /noindex/iu);
    return { status: response.status };
  });
  await run('robots exclusion', async () => { const r = await fetchPage('/robots.txt'); assert.equal(r.status, 200); checkRobots(r.body); });
  await run('preview sitemap', async () => {
    const r = await fetchPage('/sitemap.xml'); assert.equal(r.status, 200); assert.match(r.body, /<urlset\b/u);
    assert.doesNotMatch(r.body, /<loc\b/u); assert.match(r.headers['x-robots-tag'] || '', /noindex/iu);
  });
  await run('genuine missing page', async () => { assert.equal((await fetchPage('/modeles/cattelan-seo-check-missing-model')).status, 404); });
  await run('published FAQ recap', async () => {
    const r = await fetchPage('/llms.txt'); assert.equal(r.status, 200); assert.match(r.headers['content-type'] || '', /^text\/plain/iu);
    assert.match(r.headers['x-robots-tag'] || '', /noindex/iu); assert.match(r.body, /^#\s+\S/mu); assert.match(r.body, /## Pages/u);
  });
  await run('FAQ preview exclusion', async () => {
    const r = await fetchPage('/llms.txt?_preview=seo-deployment-check'); assert.equal(r.status, 404);
    assert.match(r.headers['cache-control'] || '', /private/iu); assert.match(r.headers['cache-control'] || '', /no-store/iu);
    assert.match(r.headers['x-robots-tag'] || '', /noindex/iu);
  });
  await run('native API access control', async () => {
    const r = await fetchPage('/_emdash/api/content/pages'); assert.equal(r.status, 401);
    assert.match(r.headers['content-type'] || '', /application\/json/iu); assert(!r.headers.location);
  });
  for (const subset of ['latin', 'latin-ext']) await run(`local font ${subset}`, async () => {
    const r = await fetchPage(`/fonts/albert-sans/${subset}-v4.woff2`);
    assert.equal(r.status, 200);
    assert.equal(r.body.slice(0, 4), 'wOF2', 'Response must contain a WOFF2 font, not an HTML fallback');
    assert.match(r.headers['content-type'] || '', /(?:font\/woff2|application\/(?:font-woff2|octet-stream))/iu);
  });
  return { checkedAt: new Date().toISOString(), origin, mode: 'preview', success: checks.every(check => check.ok), checks };
}

async function main() {
  assert(process.argv.slice(2).every(flag => flag === '--write-summary'), 'Only --write-summary is supported; target and preview policy are pinned.');
  const result = await runChecks();
  console.log(JSON.stringify(result, null, 2));
  if (process.argv.includes('--write-summary') && process.env.GITHUB_STEP_SUMMARY) {
    await writeFile(process.env.GITHUB_STEP_SUMMARY, `## Public SEO verification\n\n${result.checks.filter(check => check.ok).length}/${result.checks.length} checks passed on the preview.\n\n${result.checks.filter(check => !check.ok).map(check => `- ${check.name}: ${check.error}`).join('\n')}\n`, { flag: 'a' });
  }
  if (!result.success) process.exitCode = 1;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
