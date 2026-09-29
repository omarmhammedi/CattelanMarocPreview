import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

// Deployment smoke check only: anonymous GET/HEAD, no catalogue request or auth.
// Reuse the existing SSR inventory; scripts and browser networking stay disabled.
const origin = 'https://cattelan-maroc-preview.omar-8b8.workers.dev';
const output = resolve(process.env.CLOUDFLARE_TEST_OUTPUT || 'test-results/cloudflare-public');
const reuseAudit = process.argv.includes('--reuse-audit');
assert(process.argv.slice(2).every(argument => argument === '--reuse-audit'), 'Usage: node scripts/check-cloudflare-public.mjs [--reuse-audit]');
const run = promisify(execFile);
const results = { origin, startedAt: new Date().toISOString(), readOnly: true, checks: [], failure: '' };
await mkdir(output, { recursive: true });
try {
  if (!reuseAudit) {
    const { stdout } = await run(process.execPath, ['scripts/audit-public-seo.mjs'], {
      env: { ...process.env, SEO_AUDIT_URL: origin, SEO_AUDIT_OUTPUT: `${output}/seo` },
      maxBuffer: 4 * 1024 * 1024,
    });
    await writeFile(`${output}/seo-audit.log`, stdout);
  }
  const audit = JSON.parse(await readFile(`${output}/seo/report.json`, 'utf8'));
  assert.equal(audit.base, `${origin}/`);
  const auditAge = Date.now() - Date.parse(audit.capturedAt);
  assert(auditAge >= 0 && auditAge < 3_600_000, 'The public SEO snapshot must be real, same-origin and less than one hour old');
  assert.match(audit.method, /^Anonymous GET only;/u);
  results.seoCapturedAt = audit.capturedAt;
  results.seoReused = reuseAudit;
  assert.equal(audit.expected.length, 28);
  assert.equal(audit.pages.length, 28);
  assert.deepEqual(audit.failure, []);
  assert.deepEqual(audit.linkIssues, []);
  for (const page of audit.pages) {
    assert.equal(page.status, 200, page.path);
    assert.equal(page.finalUrl, `${origin}${page.path}`, `${page.path}: unexpected redirect`);
    assert.deepEqual(page.canonical, [`${origin}${page.path}`], `${page.path}: incorrect canonical origin`);
    assert.match(page.headers.robots || '', /noindex/u, `${page.path}: header noindex`);
    assert(page.robots.some(value => /noindex/u.test(value)), `${page.path}: meta noindex`);
    assert.match(page.headers.cacheControl || '', /no-store/u, `${page.path}: no-store`);
    assert.equal(page.lang, 'fr', `${page.path}: language`);
    assert(page.title.length > 0, `${page.path}: title present`);
    if (page.path !== '/confidentialite/') assert(page.description[0]?.length > 0, `${page.path}: editorial description present`);
    assert.equal(page.h1.length, page.path === '/' ? 2 : 1, `${page.path}: responsive title count`);
    assert(page.jsonLd.every(value => !value.parseError), `${page.path}: structured data parses`);
    for (const value of [...page.ogImage, ...page.images.map(image => image.src), ...page.links.map(link => link.href)]) {
      assert(!/localhost|127\.0\.0\.1|app\.github\.dev/u.test(value || ''), `${page.path}: leaked development URL`);
    }
  }
  results.checks.push({ name: '28 routes, metadata, canonicals, noindex, no-store and internal links', count: 28 });
  results.limits = ['The existing preview privacy page has no meta-description; the 27 editorial pages do. This check does not rewrite page content.'];
  const robots = audit.variants.find(item => item.path === '/robots.txt');
  assert.equal(robots?.status, 200);
  assert.match(robots.body, /Disallow:\s*\/\s*(?:\n|$)/u);
  const sitemap = audit.variants.find(item => item.path === '/sitemap.xml');
  assert.equal(sitemap?.status, 200);
  assert(!/localhost|127\.0\.0\.1|app\.github\.dev/u.test(sitemap.body));
  const missing = audit.variants.find(item => item.path === '/seo-audit-page-that-does-not-exist/');
  assert.equal(missing?.status, 404);
  results.checks.push({ name: 'robots.txt, sitemap and real 404' });
  const ownerPhoto = JSON.parse(await readFile('content/showroom-owner-photo.json', 'utf8'));
  const showroom = audit.pages.find(page => page.path === '/showroom-casablanca/');
  const selected = showroom.images.find(image => image.alt === ownerPhoto.image.alt);
  assert(selected, 'Owner photograph is rendered on showroom page');
  const imageUrl = new URL(selected.src, origin);
  assert.equal(imageUrl.origin, origin);
  assert(imageUrl.pathname.startsWith('/_emdash/api/media/file/'));
  const response = await fetch(imageUrl, { redirect: 'manual', signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /image\/jpeg/u);
  const bytes = new Uint8Array(await response.arrayBuffer());
  assert.equal(bytes.byteLength, ownerPhoto.image.bytes);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha256, ownerPhoto.image.sha256);
  const home = audit.pages.find(page => page.path === '/');
  assert(home.images.some(image => new URL(image.src, origin).href === imageUrl.href), 'Homepage shares the published photo');
  results.checks.push({ name: 'Owner photo bytes identical on remote site', bytes: bytes.byteLength, sha256 });
  results.pages = audit.pages.map(({ path, status, canonical, headers }) => ({ path, status, canonical, headers }));
  results.passed = true;
  console.log(JSON.stringify({ passed: true, routes: audit.pages.length, checks: results.checks }, null, 2));
} catch (error) {
  results.passed = false;
  results.failure = error.message;
  // Private credentials are never loaded or transmitted by this script.
  console.error(`Cloudflare public validation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  results.finishedAt = new Date().toISOString();
  await writeFile(`${output}/report.json`, `${JSON.stringify(results, null, 2)}\n`);
}
