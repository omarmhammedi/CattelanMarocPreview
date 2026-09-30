import assert from 'node:assert/strict';
import test from 'node:test';
import {loadSeoRefresh,origin,remoteCliAuthentication} from '../scripts/migrations/0011-seo-editorial.mjs';
import {applyRefresh,planCopy,validateRefresh} from '../scripts/migrations/0010-editorial-refresh.mjs';

test('publication accepts only the user-authorized CLI credential for the exact Cattelan origin',()=>{
  const credential={accessToken:'fixture-native-token',expiresAt:'2030-01-01T00:00:00Z'};
  assert.equal(remoteCliAuthentication({[origin]:credential},origin,1).headers.Authorization,'Bearer fixture-native-token');
  assert.throws(()=>remoteCliAuthentication({'https://another.test':credential},origin,1));
  assert.throws(()=>remoteCliAuthentication({[origin]:credential},'https://another.test',1));
  assert.throws(()=>remoteCliAuthentication({[origin]:{...credential,expiresAt:'2000-01-01T00:00:00Z'}},origin));
  assert.throws(()=>remoteCliAuthentication({[origin]:{...credential,url:'https://another.test'}},origin,1));
});

test('current editorial manifest is bounded and preserves independently edited content and pending drafts',async()=>{
  const {entries}=await loadSeoRefresh();
  assert.equal(entries.filter(e=>e.collection==='families').length,6);
  assert.equal(entries.filter(e=>e.collection==='posts').length,5);
  assert.equal(entries.filter(e=>e.collection==='models').length,11);
  for(const entry of entries){
    const response={_rev:'native-fixture-revision',item:{type:entry.collection,slug:entry.slug,status:'published',liveRevisionId:'live',draftRevisionId:'live',data:structuredClone(entry.before),seo:entry.seoBefore}};
    assert.equal(planCopy(response,entry),true);
    response.item.data=structuredClone(entry.after);response.item.seo=entry.seoAfter;
    assert.equal(planCopy(response,entry),false);
    response.item.data[Object.keys(entry.after)[0]]='Independent owner edit';
    assert.throws(()=>planCopy(response,entry));
    response.item.data=structuredClone(entry.before);response.item.seo=entry.seoBefore;response.item.draftRevisionId='pending-editor-draft';
    assert.throws(()=>planCopy(response,entry));
  }
});

test('image alt corrections cannot replace an asset, its dimensions or its storage identity',async()=>{
  const {entries,menu}=await loadSeoRefresh();
  const original=entries.find(e=>e.collection==='families' && e.after.image);
  assert(original);
  for(const mutate of [e=>{e.after.image.id='another';},e=>{e.after.image.width=1;},e=>{e.after.image.meta.storageKey='replacement.jpg';},e=>{e.after.image=null;},e=>{e.after.image.alt='';}]){
    const item=structuredClone(original);mutate(item);assert.throws(()=>validateRefresh([item],menu));
  }
});

function completedResponse(entry) {
  const response = {_rev:'native-completed-revision',item:{type:entry.collection,slug:entry.slug,status:'published',liveRevisionId:'live',draftRevisionId:'live',data:structuredClone(entry.after),seo:structuredClone(entry.seoAfter)}};
  for (const key of ['image','hero_image']) if (response.item.data[key]) {
    Object.assign(response.item.data[key].meta, {caption:'Existing media-library caption',blurhash:null,dominantColor:null});
  }
  return response;
}

test('completed alt updates tolerate only added native hydration fields and are skipped without writes or value changes',async()=>{
  const {entries} = await loadSeoRefresh();
  const plans = entries.filter(entry=>entry.after.image || entry.after.hero_image).map(entry=>{
    const before = completedResponse(entry), snapshot = structuredClone(before);
    const change = planCopy(before,entry);
    assert.equal(change,false);
    assert.deepEqual(before,snapshot,'Recognizing completion must preserve current hydrated metadata.');
    return {entry,before,change};
  });
  assert.equal(plans.length,12);
  await applyRefresh(async()=>{assert.fail('Completed entries must not call any native API.');},{plans,menuChange:false});
});

test('native hydration does not relax exact initial-state, image identity, SEO or draft guards',async()=>{
  const {entries} = await loadSeoRefresh();
  const entry = entries.find(entry=>entry.collection==='families' && entry.after.image);
  for (const mutate of [
    r=>{r.item.data=structuredClone(entry.before);r.item.seo=entry.seoBefore;Object.assign(r.item.data.image.meta,{caption:'Added before publication',blurhash:null,dominantColor:null});},
    r=>{r.item.data.image.meta.storageKey='different.jpg';},
    r=>{r.item.data.image.meta.unexpected='different';},
    r=>{r.item.data.image.id='different';},
    r=>{r.item.data.image.alt='Independent alt edit';},
    r=>{r.item.data.image.width+=1;},
    r=>{r.item.data.image.height+=1;},
    r=>{r.item.data.image.filename='different.jpg';},
    r=>{r.item.data.image.provider='different';},
    r=>{r.item.data.intro='Independent text edit';},
    r=>{r.item.seo.title='Independent SEO edit';},
    r=>{r.item.draftRevisionId='pending-editor-draft';},
    r=>{r.item.status='draft';},
  ]) {
    const response = completedResponse(entry); mutate(response);
    assert.throws(()=>planCopy(response,entry));
  }
  const initial = completedResponse(entry);
  initial.item.data=structuredClone(entry.before);initial.item.seo=entry.seoBefore;
  assert.equal(planCopy(initial,entry),true,'The unchanged exact initial state remains eligible.');
});

test('hydration keys already recorded by the manifest remain strict',async()=>{
  const {entries} = await loadSeoRefresh();
  const original = entries.find(entry=>entry.collection==='families' && entry.after.image);
  for (const [key,value] of [['caption','Recorded caption'],['blurhash',null],['dominantColor','#123456']]) {
    const entry = structuredClone(original);
    entry.before.image.meta[key]=value;entry.after.image.meta[key]=value;
    const response = completedResponse(entry);
    response.item.data.image.meta[key]=value;
    assert.equal(planCopy(response,entry),false);
    response.item.data.image.meta[key]='Changed existing value';
    assert.throws(()=>planCopy(response,entry));
    delete response.item.data.image.meta[key];
    assert.throws(()=>planCopy(response,entry));
  }
});
