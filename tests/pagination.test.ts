import assert from 'node:assert/strict';
import test from 'node:test';
import {collectPages} from '../src/lib/pagination.ts';

test('reads all entries past 100, keeping native order and cursor', async()=>{
  const calls:(string|undefined)[]=[];
  const entries=await collectPages(async cursor=>{
    calls.push(cursor);
    const start=cursor ? Number(cursor) : 0;
    return {entries:Array.from({length:start===200?5:100},(_,i)=>start+i),nextCursor:start<200?String(start+100):undefined,hasMore:start<200};
  });
  assert.deepEqual(calls,[undefined,'100','200']);
  assert.deepEqual(entries,Array.from({length:205},(_,i)=>i));
});
test('fails on incomplete, cyclic, unbounded or failed CMS pagination', async()=>{
  await assert.rejects(collectPages(async()=>({entries:[],hasMore:true})),/sans curseur/);
  await assert.rejects(collectPages(async()=>({entries:[],nextCursor:'same'})),/déjà lu/);
  await assert.rejects(collectPages(async cursor=>({entries:[],nextCursor:String(Number(cursor||0)+1)}),2),/limite/);
  const error=new Error('database unavailable');
  await assert.rejects(collectPages(async()=>({entries:[],error})),error);
});
