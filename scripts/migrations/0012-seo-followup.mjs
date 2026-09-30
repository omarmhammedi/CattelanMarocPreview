/** Owner-confirmed delivery and contact follow-up. Native publication only. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyRefresh, prepareRefresh, validateRefresh } from './0010-editorial-refresh.mjs';
import { authenticatedApi, menu, origin } from './0011-seo-editorial.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const migration = '0012-seo-followup';
const targetedFields = {
  'pages/home': ['sections'],
  'pages/showroom-casablanca': ['intro', 'content', 'sections', 'meta_description'],
  'families/tables': ['intro'],
  'site_content/global': ['whatsapp_url', 'contact_label'],
};

export function validateFollowup(entries) {
  const manifest = validateRefresh(entries, menu);
  assert.deepEqual(entries.map(entry => `${entry.collection}/${entry.slug}`).sort(), Object.keys(targetedFields).sort(), 'This revision targets exactly four existing entries.');
  for (const entry of entries) {
    assert.deepEqual(Object.keys(entry.after).sort(), [...targetedFields[`${entry.collection}/${entry.slug}`]].sort(), 'Unexpected field in the follow-up.');
    assert(!entry.seoBefore && !entry.seoAfter, 'This revision preserves all native SEO settings.');
  }
  const contact = entries.find(entry => entry.collection === 'site_content');
  assert.deepEqual(contact.beforeAbsent, ['whatsapp_url']);
  assert.equal(contact.after.whatsapp_url, 'https://wa.me/212771105490', 'Use only the owner-confirmed public number.');
  return manifest;
}

export async function loadSeoFollowup() {
  return validateFollowup(JSON.parse(await readFile(join(root, 'content/seo-followup-2026-09-30.json'), 'utf8')));
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.length <= 1 && flags.every(flag => ['--dry-run', '--apply'].includes(flag)), 'Use --dry-run (default) or --apply.');
  const manifest = await loadSeoFollowup(), api = await authenticatedApi();
  const plan = await prepareRefresh(api, manifest.entries, manifest.menu);
  assert(!plan.menuChange, 'Navigation differs; preserve it and review the current state.');
  const changes = plan.plans.filter(item => item.change);
  console.log(JSON.stringify({origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run', entries: changes.map(item => ({collection: item.entry.collection, slug: item.entry.slug, fields: Object.keys(item.entry.after)}))}));
  if (!flags.includes('--apply') || !changes.length) return;
  const dir = join(root, '.wrangler/migrations/0012-seo-cloudflare'), lock = join(dir, '.publication-lock');
  await mkdir(dir, {recursive: true, mode: 0o700});
  await mkdir(lock, {mode: 0o700});
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-'), prefix = join(dir, stamp);
  const report = {origin, migration, startedAt: new Date().toISOString(), manifestSha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'), entries: [], complete: false, error: ''};
  try {
    await applyRefresh(api, plan, {
      beforeWrite: () => writeFile(`${prefix}-backup.json`, JSON.stringify(plan, null, 2), {mode: 0o600, flag: 'wx'}),
      afterEntry: async result => {report.entries.push(result); await writeFile(`${prefix}-report.json`, JSON.stringify(report, null, 2), {mode: 0o600}); console.log(`Published ${result.collection}/${result.slug}`);},
    });
    report.complete = true;
  } catch (error) {report.error = error instanceof Error ? error.message : 'Publication failed'; throw error;}
  finally {
    await writeFile(`${prefix}-report.json`, JSON.stringify({...report, finishedAt: new Date().toISOString()}, null, 2), {mode: 0o600});
    await rm(lock, {recursive: true});
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {console.error(error.message); process.exitCode = 1;});
