/** Verify the real homepage preload against a marked disposable native CMS. */
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {integrationEnvironment} from './integration-environment.mjs';
const base=await integrationEnvironment();
const session=JSON.parse(await readFile('.wrangler/cms-sync-session.json','utf8'));
const cookie=session.cookies.filter(c=>c.domain.replace(/^\./u,'')===base.hostname).map(c=>`${c.name}=${c.value}`).join('; ');
async function api(path,method='GET',data){const response=await fetch(new URL(path,base),{method,redirect:'error',headers:{Cookie:cookie,Origin:base.origin,'X-EmDash-Request':'1',...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});const json=await response.json();assert(response.ok&&json.success,`${method} ${path.split('?')[0]}: ${response.status}`);return json.data;}
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];let before,changed=false;
const path='/_emdash/api/content/pages/home';
async function publish(){const item=await api(path);await api(`${path}/publish`,'POST',{_rev:item._rev});}
try{
 before=await api(path);assert(before.item.data.hero_image,'Fixture needs an existing native hero image.');assert(!before.item.draftRevisionId,'Preserve existing editor drafts; use a clean disposable fixture.');
 for(const scenario of [{width:390,js:true},{width:1440,js:true},{width:390,js:false},{width:390,js:false,webpOnly:true}]){
  const {width,js,webpOnly=false}=scenario;
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:2,javaScriptEnabled:js,serviceWorkers:'block'});
  const page=await context.newPage();const cdp=await context.newCDPSession(page);
  await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  // Model an engine that ignores AVIF in BOTH source and preload MIME checks.
  // CDP's disabled-image-types only changes picture selection, not preload support.
  if(webpOnly){const html=await(await fetch(base)).text();await page.route(base.href,route=>route.fulfill({status:200,contentType:'text/html',body:html.replaceAll('type="image/avif"','type="image/x-unsupported-avif"')}));}
  const requests=[];page.on('request',r=>requests.push(r.url()));
  await page.goto(base.href,{waitUntil:'load'});
  await page.waitForFunction(()=>{const img=document.querySelector('#accueil .card img');return img?.complete&&img.naturalWidth>0;});
  const sample=await page.evaluate(({webpOnly})=>{
   const image=document.querySelector('#accueil .card img');
   const preload=[...document.querySelectorAll('head link[rel="preload"][as="image"]')].find(link=>(!link.media||matchMedia(link.media).matches)&&link.type!=='image/x-unsupported-avif');
   const source=image.closest('picture')?.querySelector(`source[type="${webpOnly?'image/webp':'image/avif'}"]`);
   const selected=innerWidth<=820?source:image;
   const viewport=document.querySelector('meta[name="viewport"]');
   const frame=image.closest('[data-mobile-frame]').getBoundingClientRect();
   return{src:image.currentSrc,usedSources:[...document.images].map(img=>img.currentSrc),preload:!!preload,srcsetMatches:preload?.getAttribute('imagesrcset')===selected?.getAttribute('srcset'),sizesMatch:preload?.getAttribute('imagesizes')===selected?.getAttribute('sizes'),viewportFirst:preload?!!(viewport.compareDocumentPosition(preload)&Node.DOCUMENT_POSITION_FOLLOWING):true,resources:performance.getEntriesByName(image.currentSrc).map(r=>({type:r.initiatorType,duration:r.duration})),loaded:image.naturalWidth>0,frame:{width:frame.width,height:frame.height},overflow:document.documentElement.scrollWidth>innerWidth,alt:image.alt};
  },{webpOnly});
  assert(sample.loaded&&sample.alt);assert(!sample.overflow);
  const selectedUrl=new URL(sample.src);
  assert.equal(selectedUrl.searchParams.get('f'),width<=820&&!webpOnly?'avif':'webp');
  const heroRequests=requests.filter(src=>{try{return new URL(src).searchParams.get('href')===selectedUrl.searchParams.get('href');}catch{return false;}});
  assert.equal(requests.filter(url=>url===sample.src).length,1,'The selected hero rendition must download exactly once');
  // The disposable fixture reuses this asset in logos/cards. Those selected
  // renditions are legitimate; an unused preload width/format is not.
  assert(heroRequests.every(url=>sample.usedSources.includes(url)),'No unused width or format of the hero asset may download');
  assert.equal(sample.resources.length,1);
  if(webpOnly){assert.equal(sample.preload,false);assert.equal(sample.resources[0].type,'img');}
  else{assert(sample.preload&&sample.srcsetMatches&&sample.sizesMatch&&sample.viewportFirst);assert.equal(sample.resources[0].type,'link');}
  if(width===390){assert.equal(sample.frame.width,350);assert.equal(sample.frame.height,380);}
  if(width===390&&js){await page.evaluate(()=>window.scrollTo(0,100));await page.waitForTimeout(100);const drift=await page.locator('#accueil .card img').evaluate(img=>img.style.transform);assert.match(drift,/translateY/,'Picture wrapper must preserve mobile frame choreography');}
  results.push({scenario,...sample});console.log(`PASS ${width}px DPR2, JS ${js}, WebP-only ${webpOnly}: correct rendition, one request and preserved frame.`);
  await context.close();
 }
 const current=await api(path);await api(path,'PUT',{_rev:current._rev,data:{hero_image:null}});changed=true;await publish();const html=await(await fetch(base)).text();assert(!/<link\b[^>]*rel="preload"[^>]*as="image"/u.test(html));assert(!/<div class="ph card"/u.test(html));console.log('PASS Cleared native homepage hero emits neither image nor preload.');
 const productHtml=await(await fetch(new URL('/modeles/skorpio/',base))).text();assert(!/<link\b[^>]*rel="preload"[^>]*as="image"/u.test(productHtml));console.log('PASS Product routes do not inherit the homepage preload.');
 await mkdir('.wrangler/mobile-images-2026-10-05',{recursive:true});await writeFile('.wrangler/mobile-images-2026-10-05/native-browser.json',JSON.stringify(results,null,2));
}finally{if(changed){const current=await api(path);await api(path,'PUT',{_rev:current._rev,data:{hero_image:before.item.data.hero_image}});await publish();console.log('Restored and republished the original local fixture hero.');}await browser.close();}
