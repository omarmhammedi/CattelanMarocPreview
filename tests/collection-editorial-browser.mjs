/** Verify the editorial migration in an existing, marked disposable CMS only. */
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {chromium, webkit} from 'playwright';
import {integrationEnvironment} from './integration-environment.mjs';

const base = await integrationEnvironment();
const session = JSON.parse(await readFile('.wrangler/cms-sync-session.json', 'utf8'));
const manifests = await Promise.all(['family', 'model'].map(async kind =>
  JSON.parse(await readFile(`content/${kind}-editorial.json`, 'utf8'))));
const output = 'test-results/collection-editorial';
await mkdir(`${output}/screenshots`, {recursive:true});
const report = {checks:[], screenshots:[]};
const pass = message => { report.checks.push(message); console.log(`PASS ${message}`); };
const browser = await chromium.launch({headless:true});
const admin = await browser.newContext({storageState:session});
const adminPage = await admin.newPage();
await adminPage.goto(new URL('/_emdash/admin/', base).href, {waitUntil:'domcontentloaded'});

async function api(path, method='GET', body) {
  const result = await adminPage.evaluate(async ({path,method,body}) => {
    const response = await fetch(path, {method, credentials:'same-origin',
      signal:AbortSignal.timeout(30000), headers:{'X-EmDash-Request':'1', 'Content-Type':'application/json'},
      ...(body === undefined ? {} : {body:JSON.stringify(body)})});
    return {status:response.status, value:await response.json()};
  }, {path,method,body});
  assert(result.status < 300 && result.value.success, `${method} ${path}: ${result.status}`);
  return result.value.data;
}
async function html(path) {
  const response=await fetch(new URL(path,base), {signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,path);
  assert.match(response.headers.get('x-robots-tag') || '',/noindex/);
  return response.text();
}
async function nodes(markup, selector, attribute) {
  return adminPage.evaluate(({markup,selector,attribute}) => {
    const doc=new DOMParser().parseFromString(markup,'text/html');
    return [...doc.querySelectorAll(selector)].map(node => attribute ? node.getAttribute(attribute) : node.textContent.trim());
  }, {markup,selector,attribute});
}

try {
  if(!process.argv.includes('--only-layouts')){
  for (const manifest of manifests) for (const entry of manifest.entries) {
    const family=manifest.collection==='families';
    const route=`/${family?'collections':'modeles'}/${entry.slug}/`;
    const markup=await html(route);
    assert.deepEqual(await nodes(markup,'title'),[entry.afterSeo.title]);
    assert.deepEqual(await nodes(markup,'meta[name="description"]','content'),[entry.afterSeo.description]);
    assert.deepEqual(await nodes(markup,'meta[property="og:title"]','content'),[entry.afterSeo.title]);
    assert.deepEqual(await nodes(markup,'.page-lead'),[entry.after[family?'intro':'description']]);
    const body=(await nodes(markup, family?'.page-reading-section .page-prose':'.model-story .page-prose'))[0];
    for(const block of entry.after.content) assert(body.includes(block.children.map(span=>span.text).join('')), `${route}: missing editorial paragraph.`);
    for(const block of entry.after.content) for(const mark of block.markDefs) {
      assert((await nodes(markup,'.page-prose a','href')).includes(mark.href));
      const target=await fetch(new URL(mark.href,base),{method:'HEAD',signal:AbortSignal.timeout(30000)});
      assert.equal(target.status,200,`${route} -> ${mark.href}`);
    }
  }
  pass('17 pages : textes publiés, titres SEO uniques, descriptions, liens contextuels et noindex de prévisualisation.');
  const tables=await html('/collections/tables/');
  const notice=(await nodes(tables,'.models-section > .page-note'))[0];
  assert(notice,'The shared availability notice remains visible.');
  assert(!(await nodes(tables,'.model-card .page-note')).includes(notice));
  pass('La précision commune apparaît une fois par sélection ; les textes des cartes restent lisibles.');

  // Native SEO metadata is immediate; the visible copy still follows native revisions.
  const path='/_emdash/api/content/families/tables';
  const original=await api(path);
  assert.equal(original.item.status,'published');
  assert(!original.item.draftRevisionId || original.item.draftRevisionId===original.item.liveRevisionId);
  const marker=`EDITORIAL-TEST-${Date.now()}`;
  let modified=false;
  try {
    modified=true;
    await api(path,'PUT',{data:{intro:marker},_rev:original._rev});
    assert(!(await nodes(await html('/collections/tables/'),'.page-lead')).includes(marker));
    const preview=await api(`${path}/preview-url`,'POST',{});
    assert.deepEqual(await nodes(await html(preview.url),'.page-lead'),[marker]);
    let current=await api(path);
    await api(`${path}/publish`,'POST',{_rev:current._rev});
    assert.deepEqual(await nodes(await html('/collections/tables/'),'.page-lead'),[marker]);
    current=await api(path);
    await api(path,'PUT',{seo:{title:marker,description:`${marker} description`},_rev:current._rev});
    const changed=await html('/collections/tables/');
    assert.deepEqual(await nodes(changed,'title'),[marker]);
    assert.deepEqual(await nodes(changed,'meta[property="og:title"]','content'),[marker]);
    assert.deepEqual(await nodes(changed,'h1'),[original.item.data.title]);
    assert.deepEqual(await nodes(changed,'meta[name="description"]','content'),[`${marker} description`]);
    current=await api(path);
    await api(path,'PUT',{seo:{title:null,description:null},_rev:current._rev});
    const cleared=await html('/collections/tables/');
    assert.deepEqual(await nodes(cleared,'title'),[original.item.data.seo_title]);
    assert.deepEqual(await nodes(cleared,'meta[name="description"]','content'),[original.item.data.meta_description]);
    pass('Famille : brouillon privé, aperçu signé, publication ; SEO natif immédiat, H1 conservé et repli après effacement.');
  } finally {
    if(modified){
      const current=await api(path);
      const saved=await api(path,'PUT',{data:{intro:original.item.data.intro},seo:{title:original.item.seo?.title ?? null,description:original.item.seo?.description ?? null},_rev:current._rev});
      await api(`${path}/publish`,'POST',{_rev:saved._rev});
      assert.deepEqual(await nodes(await html('/collections/tables/'),'.page-lead'),[original.item.data.intro]);
    }
  }

  }
  for(const name of ['chromium','webkit']){
    const engine=name==='chromium'?browser:await webkit.launch({headless:true});
    try {
      for(const viewport of [{width:1440,height:900},{width:390,height:844}]) for(const theme of ['dark','light']){
        const context=await engine.newContext({viewport, reducedMotion:'reduce'});
        const errors=[];
        try {
          await context.addInitScript(theme=>localStorage.setItem('ci-mode',theme),theme);
          await context.route('**/*',route=>['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());
          const page=await context.newPage();
          page.on('pageerror',error=>errors.push(error.message));
          for(const route of ['/collections/','/collections/tables/','/collections/chaises-tabourets/','/modeles/skorpio/']){
            await page.goto(new URL(route,base).href,{waitUntil:'domcontentloaded'});
            assert.equal(await page.locator('html').getAttribute('data-mode'),theme);
            assert.equal(await page.locator('h1').count(),1);
            assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}/${viewport.width}/${theme}${route}: overflow`);
            if(route==='/collections/tables/'){
              const link=page.locator('.page-prose a[href="/modeles/skorpio/"]');
              await link.click();
              await page.waitForURL('**/modeles/skorpio/');
              assert.equal((await page.locator('h1').textContent()).trim(),'Skorpio');
              await page.goBack({waitUntil:'domcontentloaded'});
            }
            if(name==='chromium' && ['/collections/tables/','/modeles/skorpio/'].includes(route)){
              const prose=page.locator(route.startsWith('/modeles/')?'.model-story':'.page-reading-section');
              await prose.scrollIntoViewIfNeeded();
              await page.evaluate(()=>document.fonts.ready);
              await prose.evaluate(element=>window.scrollTo({top:element.getBoundingClientRect().top+scrollY-(document.querySelector('header')?.getBoundingClientRect().height || 0)-24,behavior:'instant'}));
              const file=`${route.startsWith('/modeles/')?'skorpio':'tables'}-${viewport.width}-${theme}.jpg`;
              await page.screenshot({path:`${output}/screenshots/${file}`,type:'jpeg',quality:85,timeout:20000});
              report.screenshots.push(file);
            }
          }
          assert.deepEqual(errors,[]);
          pass(`${name} ${viewport.width}×${viewport.height}, ${theme} : lecture, lien famille→modèle, aucun débordement ni erreur JavaScript.`);
        } finally {await context.unrouteAll({behavior:'ignoreErrors'});await context.close();}
      }
    } finally {if(engine!==browser)await engine.close();}
  }
} finally {
  await writeFile(`${output}/${process.argv.includes('--only-layouts')?'report-layouts':'report'}.json`,`${JSON.stringify(report,null,2)}\n`);
  await admin.close();await browser.close();
}
