/** Public form presentation in a marked local fixture. Every write is intercepted; no submissions or emails are created. */
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';
import {integrationEnvironment} from './integration-environment.mjs';
const origin = (await integrationEnvironment()).origin;
const output = resolve(process.env.FORM_TEST_OUTPUT || 'test-results/public-forms');
const browser = await chromium.launch({headless:true, ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath:process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
const context = await browser.newContext({serviceWorkers:'block'});
const page = await context.newPage();
async function visit(path) {
  const response = await page.goto(origin+path, {waitUntil:'networkidle'});
  assert.equal(response?.status(), 200, `Public ${path}`);
}
const results=[];
let response, posts=0;
await page.route('**/*', async route => {
  const req=route.request();
  if (!['GET','HEAD','OPTIONS'].includes(req.method())) {
    const target = new URL(req.url());
    if(req.method()==='POST' && target.origin===origin && ['/_emdash/api/plugins/catalogue-leads/request','/_emdash/api/plugins/contact-requests/submit'].includes(target.pathname) && response) {
      posts++;
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data:response})});
    }
    return route.abort();
  }
  return route.continue();
});
try {
  for(const status of ['sent','pending','processing','failed',undefined]) {
    response={ok:true, downloadUrl:'/synthetic-test.pdf', ...(status?{emailStatus:status}:{})};
    await visit('/catalogue/');
    const form=page.locator('[data-catalogue-form]').first();
    await form.locator('[name=name]').fill('Test synthétique');
    await form.locator('[name=email]').fill('test@example.invalid');
    const expected=await form.getAttribute(status==='sent'?'data-email-sent':status==='failed'?'data-email-failed':'data-email-pending');
    await form.locator('button[type=submit]').click();
    await form.locator('.form-message a[download]').waitFor();
    const message=await form.locator('.form-message').textContent();
    if(status) assert(message.includes(expected),`Email ${status}: correct CMS message`);
    else assert(!message.includes(expected),'No email promise when API omits emailStatus');
    if(status==='pending'||status==='processing') assert(!message.includes('vous a été envoyé'),'Queued delivery must not claim sent');
    results.push({form:'catalogue',emailStatus:status??'disabled',passed:true});
  }
  for(const [kind,path] of [['rendez-vous','/showroom-casablanca/'],['projet','/votre-projet/'],['pro','/professionnels/']]) {
    response={ok:true,kind};
    await visit(path);
    const form=page.locator(`[data-request-form][data-kind="${kind}"]`).first();
    await form.locator('[name=name]').fill('Test synthétique');
    await form.locator('[name=whatsapp]').fill('+212611111111');
    if(kind==='rendez-vous') await form.locator('[name=day]').fill(await form.locator('[name=day]').getAttribute('min'));
    if(kind==='pro') {await form.locator('[name=company]').fill('Société de test');await form.locator('[name=email]').fill('test@example.invalid');}
    for(const select of await form.locator('select[required]').all()) await select.selectOption({index:1});
    const expected=await form.getAttribute('data-success');
    await form.locator('button[type=submit]').click();
    await page.waitForFunction(({kind,expected})=>document.querySelector(`[data-kind="${kind}"] .request-result`)?.textContent===expected,{kind,expected});
    results.push({form:kind,success:true});
  }
  response={ok:false,code:'TEMPORARILY_UNAVAILABLE',message:'Legacy technical error'};
  await visit('/votre-projet/');
  const form=page.locator('[data-request-form]').first();
  await form.locator('[name=name]').fill('Test synthétique');await form.locator('[name=whatsapp]').fill('+212611111111');
  await form.locator('select[required]').selectOption({index:1});
  const expected=await form.getAttribute('data-error');
  await form.locator('button[type=submit]').click();
  await page.waitForFunction(expected=>document.querySelector('.request-result')?.textContent===expected,expected);
  results.push({form:'request',genericErrorUsesCmsCopy:true});
  await visit('/confidentialite/');
  const privacy=await page.locator('main .page-prose').textContent();
  assert(!privacy.includes('{{'),'All privacy slots resolved');
  assert(privacy.includes('trois ans'),'Operational retention visible');
  assert(!privacy.includes('Resend'),'No provider claim in local no-email environment');
  assert((await page.locator('main a[href^="mailto:"]').count())>=1,'Rights contact remains actionable');
  results.push({page:'privacy',noUnresolvedSlots:true,correctRuntimeProviders:true});
  assert.equal(posts, 9, 'Exactly one intercepted submission per scenario');
  const report = {origin,interceptedSyntheticPosts:posts,liveWrites:0,results};
  await mkdir(output,{recursive:true});
  await writeFile(`${output}/report.json`, JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally {await browser.close();}
