import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPage, checkRobots, verifyDeployment } from '../scripts/check-public-seo.mjs';

const body = `<html><head><title>Une page éditée</title><meta name="description" content="Description actuelle du CMS">
<link rel="canonical" href="https://example.com/une-url-choisie/">
<meta name="robots" content="noindex, nofollow"><meta property="og:image" content="https://example.com/photographie.jpg">
<script type="application/ld+json">{"@type":"WebPage","name":"Une page éditée"}</script></head><body><h1>Un titre visible</h1></body></html>`;
const response = { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' }, body };

test('deployment check accepts editorial titles/canonicals but catches accidental preview indexing', () => {
  assert.equal(checkPage(response, '/faq/', { image: true }).canonical, 'https://example.com/une-url-choisie/');
  assert.throws(() => checkPage({ ...response, headers: { 'content-type': 'text/html' } }, '/faq/'), /preview header/);
  assert.throws(() => checkPage({ ...response, body: body.replace('content="noindex, nofollow"', 'content="index, follow"') }, '/faq/'), /preview HTML/);
  assert.throws(() => checkRobots('User-agent: *\nDisallow: /\nAllow: /_emdash/\n'), /must not expose/);
  assert.throws(() => checkRobots('User-agent: *\nDisallow: /admin/\n'), /must remain closed/);
});

test('deployment check detects broken metadata or graph output, including HTTP-200 error pages', () => {
  assert.throws(() => checkPage({ ...response, body: '<html><head><title>Error</title></head><body><h1>Service unavailable</h1></body></html>' }, '/faq/'), /description/);
  assert.throws(() => checkPage({ ...response, body: body.replace('https://example.com/photographie.jpg', '/photographie.jpg') }, '/faq/', { image: true }), /sharing image/);
  assert.throws(() => checkPage({ ...response, body: body.replace('"@type":"WebPage"', '"@type":') }, '/faq/'), SyntaxError);
  assert.throws(() => checkPage({ ...response, body: body.replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans"></head>') }, '/faq/'), /Google Fonts/);
});

test('deployment check distinguishes the document title from accessible SVG titles', () => {
  assert.equal(checkPage({...response, body:body.replace('</body>', '<svg><title>Carte de Casablanca</title></svg></body>')}, '/').title, 'Une page éditée');
  assert.throws(() => checkPage({...response, body:body.replace('</head>', '<title>Duplicate document title</title></head>')}, '/'), /exactly one title/);
});

function deploymentFixture(persistent = false) {
  const calls = new Map(); let clock = 0;
  const fetchPage = async (path, method = 'GET') => {
    const key = `${method} ${path}`; calls.set(key, (calls.get(key) || 0) + 1);
    if (path.includes('missing-model')) return {status:404,headers:{},body:''};
    if (path.startsWith('/llms.txt?_preview=')) return {status:404,headers:{'cache-control':'private, no-store','x-robots-tag':'noindex'},body:''};
    if (path === '/llms.txt') return {status:200,headers:{'content-type':'text/plain','x-robots-tag':'noindex'},body:'# Cattelan\n## Pages\n'};
    if (path === '/robots.txt') return {status:200,headers:{},body:'User-agent: *\nDisallow: /\n'};
    if (path === '/sitemap.xml') return {status:200,headers:{'x-robots-tag':'noindex'},body:'<urlset></urlset>'};
    if (path === '/_emdash/api/content/pages') return {status:401,headers:{'content-type':'application/json'},body:'{}'};
    if (path.startsWith('/fonts/')) return {status:200,headers:{'content-type':'font/woff2'},body:'wOF2fixture'};
    if (path.includes('?utm_source=')) return {status:301,headers:{location:'/showroom-casablanca/?utm_source=seo-check','x-robots-tag':'noindex'},body:''};
    if (path === '/sur-mesure/' && (persistent || calls.get(key) === 1)) return {...response,body:body.replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans"></head>')};
    return response;
  };
  return {calls,fetchPage, options:{now:()=>clock,wait:async ms=>{clock+=ms;},retryWindowMs:25_000,retryDelayMs:10_000}};
}

test('deployment propagation retries only failed checks and records recovered failures', async () => {
  const f=deploymentFixture();const result=await verifyDeployment(f.fetchPage,f.options);
  assert.equal(result.success,true);assert.equal(result.checks.length,19);assert.equal(result.attempts.length,2);
  assert.deepEqual(result.attempts[1].checked,['page /sur-mesure/']);
  assert.equal(result.attempts[0].failures.length,1);assert.equal(result.attempts[1].failures.length,0);
  assert.equal(f.calls.get('GET /'),1);assert.equal(f.calls.get('GET /sur-mesure/'),2);
});

test('persistent deployment failures stop at the shared retry window and remain failures', async () => {
  const f=deploymentFixture(true);const result=await verifyDeployment(f.fetchPage,f.options);
  assert.equal(result.success,false);assert.equal(result.attempts.length,3);
  assert.equal(result.checks.filter(check=>!check.ok).length,1);
  assert(result.attempts.every(attempt=>attempt.failures.length===1));
  assert.equal(f.calls.get('GET /'),1);assert.equal(f.calls.get('GET /sur-mesure/'),3);
});
