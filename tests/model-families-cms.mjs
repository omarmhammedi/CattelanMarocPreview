/** Native relation/publication check: marked disposable localhost CMS only. */
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {integrationEnvironment} from './integration-environment.mjs';
import {planModelFamilyReference,applyModelFamilyReference,guardedMigrationApi} from '../scripts/migrations/0030-model-family-reference.mjs';
const base=await integrationEnvironment();
const session=JSON.parse(await readFile('.wrangler/cms-sync-session.json','utf8'));
const cookie=session.cookies.filter(c=>c.domain.replace(/^\./u,'')===base.hostname).map(c=>`${c.name}=${c.value}`).join('; ');
assert(cookie,'Native fixture login required.');
async function api(path,{method='GET',data}={}){const response=await fetch(new URL(path,base),{method,redirect:'error',signal:AbortSignal.timeout(30000),headers:{Cookie:cookie,Origin:base.origin,'X-EmDash-Request':'1',...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});const body=await response.json();assert(response.ok&&body.success,`${method} ${path.split('?')[0]} failed: ${response.status} ${body.error?.message||''}`);return body.data;}
const created=[],results=[],run=Date.now().toString(36);
const record=s=>{results.push(s);console.log(`PASS ${s}`);};
const pathFor=(collection,id)=>`/_emdash/api/content/${collection}/${id}`;
async function publish(path){const current=await api(path);await api(`${path}/publish`,{method:'POST',data:{_rev:current._rev}});}
async function create(collection,slug,data,references){if(collection==='families')data={short_title:data.title,card_text:'Une collection de contrôle pour la fixture locale.',...data};const {item}=await api(`/_emdash/api/content/${collection}`,{method:'POST',data:{slug:`${slug}-${run}`,data,...(references?{references}:{})}});const path=pathFor(collection,item.id);created.push(path);await publish(path);return await api(path);}
async function publicHtml(path){const url=new URL(path.replaceAll('0030/',`0030-${run}/`),base);assert.equal(url.origin,base.origin);const response=await fetch(url,{signal:AbortSignal.timeout(30000)});assert.equal(response.status,200,`Public ${url.pathname}`);return (await response.text()).replaceAll(`0030-${run}/`,'0030/');}
const crumb=html=>(html.match(/<nav class="model-breadcrumb"[\s\S]*?<\/nav>/u)||[])[0]||'';
try{
 const model=await create('models','fixture-model-family-0030',{title:'Modèle public 0030',description:'Une description de modèle pour la fixture locale.',content:[]});
 const higher=await create('families','fixture-family-higher-0030',{title:'Collection secondaire 0030',intro:'Collection de contrôle.',sort_order:9002,content:[]},{models:[model.item.id]});
 const lower=await create('families','fixture-family-lower-0030',{title:'Collection principale 0030',intro:'Collection de contrôle.',sort_order:9001,content:[]},{models:[model.item.id]});
 const hidden=await create('families','fixture-family-hidden-0030',{title:'Collection masquée 0030',intro:'Collection de contrôle.',sort_order:-100,content:[]},{models:[model.item.id]});
 const hiddenPath=pathFor('families',hidden.item.id);const hideBefore=await api(hiddenPath);await api(`${hiddenPath}/unpublish`,{method:'POST',data:{_rev:hideBefore._rev}});
 const modelPath=pathFor('models',model.item.id);const original=await api(modelPath);await api(modelPath,{method:'PUT',data:{_rev:original._rev,data:{title:'Brouillon privé 0030'}}});
 const before=await api(modelPath);const parentsPath=`${modelPath}/references/family_models/parents?limit=100`;const parents=await api(parentsPath);
 const guarded=guardedMigrationApi(api);const plan=await planModelFamilyReference(guarded);
 await mkdir('.wrangler/model-families-0030',{recursive:true,mode:0o700});
 await applyModelFamilyReference(guarded,plan,{beforeWrite:p=>writeFile('.wrangler/model-families-0030/schema-before.json',JSON.stringify(p),{mode:0o600})});
 const afterSchema=await api(modelPath);assert.deepEqual({...afterSchema,item:{...afterSchema.item,references:undefined}},{...before,item:{...before.item,references:undefined}},'Schema addition must preserve pending draft and live revisions');assert.deepEqual(await api(parentsPath),parents,'Schema addition must preserve all native parent links');
 record('Inverse schema migration preserves an existing model draft, revision IDs and native parent links.');
 const publicBefore=await publicHtml('/modeles/fixture-model-family-0030/');assert(publicBefore.includes('Modèle public 0030'));assert(!publicBefore.includes('Brouillon privé 0030'));assert(crumb(publicBefore).includes('/collections/fixture-family-lower-0030/'));assert(!crumb(publicBefore).includes('fixture-family-hidden-0030'));
 record('Published page chooses the first published family by sort_order and excludes unpublished parents and pending model copy.');
 const preview=await api(`${modelPath}/preview-url`,{method:'POST',data:{}});const signed=await publicHtml(preview.url);assert(signed.includes('Brouillon privé 0030'));assert(signed.includes('noindex'));record('Signed model preview resolves native draft content and stays noindex.');
 await publish(modelPath);assert(crumb(await publicHtml('/modeles/fixture-model-family-0030/')).includes('fixture-family-lower-0030'));assert.deepEqual(await api(parentsPath),parents,'Publishing a draft created before the inverse field must preserve links');
 record('Publishing a model draft preserves all existing links, including the hidden family.');
 const lowPath=pathFor('families',lower.item.id),beforeOrder=await api(lowPath);await api(lowPath,{method:'PUT',data:{_rev:beforeOrder._rev,data:{sort_order:9010}}});assert(crumb(await publicHtml('/modeles/fixture-model-family-0030/')).includes('fixture-family-lower-0030'));await publish(lowPath);assert(crumb(await publicHtml('/modeles/fixture-model-family-0030/')).includes('fixture-family-higher-0030'));
 record('Family ordering drafts stay private; published order changes immediately update the model breadcrumb without a global cache.');
 const current=await api(modelPath);await api(modelPath,{method:'PUT',data:{_rev:current._rev,data:{},references:{families:[lower.item.id]}}});assert(crumb(await publicHtml('/modeles/fixture-model-family-0030/')).includes('fixture-family-higher-0030'));const relationPreview=await api(`${modelPath}/preview-url`,{method:'POST',data:{}});assert(crumb(await publicHtml(relationPreview.url)).includes('fixture-family-lower-0030'));await publish(modelPath);assert(crumb(await publicHtml('/modeles/fixture-model-family-0030/')).includes('fixture-family-lower-0030'));
 record('Native inverse picker stages a relationship draft; signed preview sees it and publication updates the public family.');
 await writeFile('.wrangler/model-families-0030/results.json',JSON.stringify({results},null,2),{mode:0o600});
}finally{for(const path of created.reverse()){const item=await api(path);await api(path,{method:'DELETE',data:{_rev:item._rev}});}console.log('Removed all synthetic model/family entries through the native API.');}
