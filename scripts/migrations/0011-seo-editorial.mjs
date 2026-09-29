/** Targeted native publication on the existing Cattelan CMS; no seed or DB writes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyRefresh, prepareRefresh, validateRefresh } from './0010-editorial-refresh.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const origin = 'https://cattelan-maroc-preview.omar-8b8.workers.dev';
export const menu = {name:'primary',url:'/catalogue/',beforeLabel:'Recevoir le catalogue',afterLabel:'Catalogue'};
export async function loadSeoRefresh() {
  const entries = JSON.parse(await readFile(join(root, 'content/seo-editorial-2026-09-29.json'), 'utf8'));
  return validateRefresh(entries, menu);
}

export function remoteCliAuthentication(store, url, now = Date.now()) {
  assert.equal(url, origin, 'This migration is pinned to the existing Cattelan Cloudflare CMS.');
  const credential = store?.[origin];
  assert(credential && typeof credential.accessToken === 'string' && credential.accessToken && !/\s/.test(credential.accessToken), 'Use the native emdash login for the exact Cloudflare origin first.');
  const expiresAt = Date.parse(credential.expiresAt);
  assert(Number.isFinite(expiresAt) && expiresAt > now, 'Native CLI access token expired. Renew with the native CLI before publication.');
  if (credential.url) assert.equal(new URL(credential.url).origin, origin, 'Credential origin mismatch.');
  return {headers:{Authorization:`Bearer ${credential.accessToken}`},expiresAt};
}

export async function authenticatedApi() {
  const file = join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'emdash/auth.json');
  let store;
  try {store = JSON.parse(await readFile(file, 'utf8'));} catch {throw Error('No native CLI login available.');}
  const auth = remoteCliAuthentication(store, origin);
  return async (path, {method='GET',data}={}) => {
    assert(/^\/_emdash\/api\/(?:content|schema|menus)\//.test(path), 'Only editorial APIs are allowed.');
    assert(['GET','PUT','POST'].includes(method));
    assert(auth.expiresAt > Date.now(), 'Native access token expired.');
    const url = new URL(path, origin); assert.equal(url.origin, origin);
    if (method === 'POST') assert(/\/publish$/.test(url.pathname), 'Only native publication POST is allowed.');
    if (method === 'PUT') assert(/^\/_emdash\/api\/content\/(?:pages|families|posts|models|site_content)\/[a-z0-9-]+$/.test(url.pathname), 'Only existing editorial entries may be saved.');
    const response = await fetch(url, {method,redirect:'error',signal:AbortSignal.timeout(90_000),headers:{...auth.headers,Origin:origin,'X-EmDash-Request':'1',...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});
    let body; try {body = await response.json();} catch {throw Error(`Native ${method} ${url.pathname}: HTTP ${response.status}, invalid response.`);}
    assert(response.ok && body.success, `Native ${method} ${url.pathname}: HTTP ${response.status}; publication stopped.`);
    return body.data;
  };
}

async function main() {
  const flags=process.argv.slice(2);
  assert(flags.length<=1 && flags.every(flag=>['--dry-run','--apply'].includes(flag)), 'Use --dry-run (default) or --apply.');
  const manifest=await loadSeoRefresh(), api=await authenticatedApi();
  const plan=await prepareRefresh(api,manifest.entries,manifest.menu);
  // This revision never edits navigation. The previous revision must be complete.
  assert(!plan.menuChange,'Navigation differs; preserve the current menu and review it.');
  const changes=plan.plans.filter(item=>item.change);
  console.log(JSON.stringify({origin,mode:flags.includes('--apply')?'apply':'dry-run',entries:changes.map(p=>({collection:p.entry.collection,slug:p.entry.slug,fields:Object.keys(p.entry.after)}))}));
  if (!flags.includes('--apply') || !changes.length) return;
  const dir=join(root,'.wrangler/migrations/0011-seo-cloudflare'),lock=join(dir,'.publication-lock');
  await mkdir(dir,{recursive:true,mode:0o700}); await mkdir(lock,{mode:0o700});
  const stamp=new Date().toISOString().replaceAll(/[:.]/g,'-'),prefix=join(dir,stamp);
  const report={origin,migration:'0011-seo-editorial',startedAt:new Date().toISOString(),manifestSha256:createHash('sha256').update(JSON.stringify(manifest)).digest('hex'),entries:[],complete:false,error:''};
  try {
    await applyRefresh(api,plan,{
      beforeWrite:()=>writeFile(`${prefix}-backup.json`,JSON.stringify(plan,null,2),{mode:0o600,flag:'wx'}),
      afterEntry:async result=>{report.entries.push(result);await writeFile(`${prefix}-report.json`,JSON.stringify(report,null,2),{mode:0o600});console.log(`Published ${result.collection}/${result.slug}`);},
    });
    report.complete=true;
  } catch(error){report.error=error instanceof Error?error.message:'Publication failed';throw error;}
  finally {await writeFile(`${prefix}-report.json`,JSON.stringify({...report,finishedAt:new Date().toISOString()},null,2),{mode:0o600});await rm(lock,{recursive:true});}
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
