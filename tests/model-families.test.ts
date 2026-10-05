import assert from 'node:assert/strict';
import test from 'node:test';
import {orderedModelFamilies} from '../src/lib/model-families.ts';
import {collectPages} from '../src/lib/pagination.ts';
test('multiple families preserve native sort_order and id tie-break without mutating CMS order',()=>{const entries=[{id:'c',data:{sort_order:20}},{id:'b',data:{sort_order:10}},{id:'a',data:{sort_order:10}}];assert.deepEqual(orderedModelFamilies(entries).map(e=>e.id),['a','b','c']);assert.deepEqual(entries.map(e=>e.id),['c','b','a']);});
test('all native reference pages are retained before ordering, including more than 100 families',async()=>{const entries=await collectPages(async cursor=>cursor?{entries:[{id:'first',data:{sort_order:-1}}]}:{entries:Array.from({length:100},(_,i)=>({id:`family-${i}`,data:{sort_order:i}})),nextCursor:'next'});const sorted=orderedModelFamilies(entries);assert.equal(sorted.length,101);assert.equal(sorted[0].id,'first');});
test('native database ID breaks equal-order ties even when Astro slugs sort oppositely',()=>{const entries=[{id:'a-slug',data:{id:'native-z',sort_order:1}},{id:'z-slug',data:{id:'native-a',sort_order:1}}];assert.deepEqual(orderedModelFamilies(entries).map(e=>e.data.id),['native-a','native-z']);});
