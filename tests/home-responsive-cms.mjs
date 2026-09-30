/** Native homepage publication checks. Existing marked disposable fixture only. */
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {integrationEnvironment} from './integration-environment.mjs';
import {assertNoDraft} from '../scripts/migrations/0003-model-detail-pages.mjs';
import {assertPreservedEntry, readReferences} from '../scripts/migrations/0004-collection-editorial.mjs';

const base = await integrationEnvironment();
const session = JSON.parse(await readFile('.wrangler/cms-sync-session.json', 'utf8'));
const cookie = session.cookie || session.cookies.filter(item => item.domain.replace(/^\./, '') === base.hostname).map(item => `${item.name}=${item.value}`).join('; ');
assert(cookie);
const path = '/_emdash/api/content/pages/home';
const fields = ['sections', 'content', 'hero_image', 'brand_image', 'brand_detail_image', 'showroom_image'];
const marker = `HOME-RESPONSIVE-${Date.now()}`;
const results = [];
let original, schema, references, savedBackup = false, failure, restorationError;
async function api(route, {method = 'GET', data} = {}) {
  assert(method === 'GET' || savedBackup && [path, `${path}/publish`, `${path}/preview-url`].includes(route));
  assert(/^\/_emdash\/api\/(content|schema\/collections)\//.test(route));
  const response = await fetch(new URL(route, base), {method, redirect: 'error', signal: AbortSignal.timeout(60000), headers: {
    Cookie: cookie, Origin: base.origin, 'X-EmDash-Request': '1', ...(data ? {'Content-Type':'application/json'} : {}),
  }, ...(data ? {body: JSON.stringify(data)} : {})});
  const value = await response.json(); assert(response.ok && value.success, `${method} ${route}: ${response.status}`); return value.data;
}
async function save(data) {const current = await api(path); return api(path, {method:'PUT', data:{_rev:current._rev, data}});}
const publish = saved => api(`${path}/publish`, {method:'POST', data:{_rev:saved._rev}});
async function html(route = '/') {
  const url = new URL(route, base); assert.equal(url.origin, base.origin);
  const response = await fetch(url, {signal:AbortSignal.timeout(60000)});
  assert.equal(response.status, 200);
  const value = await response.text(); assert.equal((value.match(/<h1\b/g) || []).length, 1); return value;
}
const preview = async () => html((await api(`${path}/preview-url`, {method:'POST', data:{}})).url);
function checkFields(value) {
  for (const key of ['brand','collections','showroom','catalogue','journal','extra']) {
    const id = key === 'brand' ? 'italie' : key;
    // The map can repeat the showroom destination as a separate useful action.
    // Assert uniqueness within the editorial section, not across navigation.
    const section = key === 'extra' ? value : value.match(new RegExp(`<section\\b[^>]*id="${id}"[^>]*>[\\s\\S]*?</section>`))?.[0];
    assert(section, `${key}: editorial section exists`);
    assert.equal((value.match(new RegExp(`alt="${marker}-${key}-image"`, 'g')) || []).length, 1, `${key}: one responsive section image`);
    assert.equal((section.match(new RegExp(`>${marker}-${key}-cta\\s*<`, 'g')) || []).length, 1, `${key}: one CTA`);
    assert(section.includes(`/collections/?cms-home=${key}`));
  }
  assert(value.includes(`${marker}-body`));
  assert.equal((value.match(/data-catalogue-form(?=[\s=>])/g) || []).length, 1);
}
try {
  schema = (await api('/_emdash/api/schema/collections/pages?includeFields=true')).item;
  original = await api(path); assertNoDraft(original.item); assert.equal(original.item.status, 'published');
  references = await readReferences(api, 'pages', original.item, schema.fields);
  const image = (await api('/_emdash/api/content/families/tables')).item.data.image;
  assert(image?.id, 'Use only an image owned by the disposable fixture.');
  await mkdir('.wrangler/home-responsive-cms', {recursive:true, mode:0o700});
  await writeFile(`.wrangler/home-responsive-cms/${marker}.json`, JSON.stringify({original, schema, references}), {mode:0o600, flag:'wx'});
  savedBackup = true;
  const sections = ['brand','collections','showroom','catalogue','journal','extra'].map(section_key => ({section_key,
    heading:`${marker}-${section_key}`, text:`${marker}-${section_key}-text`,
    image:{...image, alt:`${marker}-${section_key}-image`}, cta_label:`${marker}-${section_key}-cta`, cta_href:`/collections/?cms-home=${section_key}`,
  }));
  const content = [{_type:'block', _key:'responsive-body', style:'normal', markDefs:[], children:[{_type:'span',_key:'responsive-span',text:`${marker}-body`,marks:[]}]}];
  const draft = await save({sections, content});
  assert(!(await html()).includes(marker)); checkFields(await preview());
  await publish(draft); checkFields(await html());
  results.push('All five section images/CTAs, extra section and rich text appear once; draft stays private, signed preview and publication render the same values.');

  const noImages = sections.map(({image, ...section}) => section);
  const clearedImages = await save({sections:noImages, hero_image:null, brand_image:null, brand_detail_image:null, showroom_image:null});
  const withoutImages = await preview();
  assert(!withoutImages.includes(`${marker}-brand-image`));
  for (const id of ['accueil','italie','showroom']) {
    const tag = withoutImages.match(new RegExp(`<section\\b[^>]*id="${id}"[^>]*>`))?.[0];
    assert(tag?.includes('without-visual'), `${id}: cleared photograph uses readable normal-flow scene`);
  }
  await publish(clearedImages); assert.equal((await html()).includes(`${marker}-showroom-image`), false);
  results.push('Cleared hero/brand/showroom photographs have no stale fallback and retain readable scenes.');

  const cleared = await save({sections:[], content:[]});
  assert((await html()).includes(marker));
  assert(!(await preview()).includes(marker));
  await publish(cleared);
  const empty = await html();
  assert(!empty.includes(marker));
  for (const id of ['italie','collections','showroom','catalogue','journal']) assert(!empty.includes(`id="${id}"`));
  assert.equal((empty.match(/data-catalogue-form(?=[\s=>])/g) || []).length, 0);
  results.push('Clearing optional sections removes their images, CTAs and catalogue form in preview and publication without resurrecting defaults.');
} catch(error) {failure=error;}
finally {
  if (savedBackup) try {
    await publish(await save(Object.fromEntries(fields.map(field => [field, original.item.data[field] ?? null]))));
    const current = await api(path); assertNoDraft(current.item);
    assertPreservedEntry(current, original, {}, schema.fields);
    assert.deepEqual(await readReferences(api, 'pages', current.item, schema.fields), references);
    assert.deepEqual((await api('/_emdash/api/schema/collections/pages?includeFields=true')).item, schema);
    results.push('Original fixture homepage, metadata, relationships and schema restored; no pending draft.');
  } catch(error) {restorationError=error;}
  await mkdir('test-results/home-responsive-cms', {recursive:true});
  await writeFile('test-results/home-responsive-cms/report.json', JSON.stringify({origin:base.origin, completedAt:new Date().toISOString(), passed:!failure&&!restorationError, results, failure:failure?.stack, restorationError:restorationError?.stack},null,2));
}
for (const result of results) console.log(`PASS ${result}`);
if (failure || restorationError) throw failure || restorationError;
