/**
 * Editorial audit, revision 2 (October 2026; content/copy-v4.json). Each rule names the text the
 * audit found on the live site and what replaces it. A rule changes a text only while it still reads
 * exactly as the audit saw it, so an editor's later wording is never overwritten; rules that find
 * nothing are listed in the report. Text fields and portable-text paragraphs are both covered:
 *   - `from` (one or more consecutive paragraphs or a whole field) → `to` (zero or more paragraphs);
 *   - an empty `to` deletes the paragraph, or empties the field;
 *   - `part: true` replaces a sentence inside a longer text instead of the whole text.
 * `sections` edits keyed page sections (heading, text…), `remove` deletes a section.
 * `seo` sets the item's native search title or description: `{ description: [current, new] }`.
 *
 *   EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0024-editorial-audit.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';

export const migration = '0024-editorial-audit';
const root = fileURLToPath(new URL('../..', import.meta.url));
const manifestFile = join(root, process.env.COPY_MANIFEST || 'content/copy-v4.json');

// Identifiers, links and media never hold reader-facing copy.
const SKIP = new Set(['_key', '_type', 'id', 'src', 'url', 'href', 'cta_href', 'storageKey', 'filename', 'mimeType', 'provider',
  'official_url', 'source_url', 'technical_sheet', 'style', 'section_key', 'markDefs', 'marks', 'blurhash', 'dominantColor', 'slug']);

export async function loadManifest(file = manifestFile) {
  return JSON.parse(await readFile(file, 'utf8'));
}

const blockText = block => (block?._type === 'block' ? (block.children || []).map(child => child.text || '').join('') : null);
const key = () => Math.random().toString(36).slice(2, 12);
const paragraph = (template, text) => ({ ...template, _key: key(), markDefs: [], children: [{ _type: 'span', _key: key(), text, marks: [] }] });

/** Applies one rule wherever it matches; returns the new value and how many places changed. */
export function applyRule(value, rule, field = '') {
  let hits = 0;
  const from = rule.from, to = rule.to || [];
  const visit = (node, name) => {
    if (typeof node === 'string') {
      if (SKIP.has(name)) return node;
      if (from.length === 1 && node === from[0]) { hits++; return to.join('\n\n'); }
      if (from.length > 1 && node === from.join('\n\n')) { hits++; return to.join('\n\n'); }
      if (rule.part && from.length === 1 && node.includes(from[0])) {
        hits++;
        return node.split(from[0]).join(to.join(' ')).replace(/ {2,}/gu, ' ').replace(/ ([.,;])/gu, '$1').trim();
      }
      return node;
    }
    if (Array.isArray(node)) {
      if (node.some(item => item?._type === 'block')) {
        const out = [];
        for (let i = 0; i < node.length; i++) {
          const run = from.every((text, j) => blockText(node[i + j]) === text);
          if (run) {
            hits++;
            for (const text of to) out.push(paragraph(node[i], text));
            i += from.length - 1;
            continue;
          }
          const text = blockText(node[i]);
          if (rule.part && from.length === 1 && text?.includes(from[0]) && node[i].children.some(child => child.text?.includes(from[0]))) {
            hits++;
            out.push({ ...node[i], children: node[i].children.map(child => child.text?.includes(from[0])
              ? { ...child, text: child.text.split(from[0]).join(to.join(' ')).replace(/ {2,}/gu, ' ').replace(/ ([.,;])/gu, '$1') } : child) });
            continue;
          }
          out.push(text === null ? visit(node[i], name) : node[i]);
        }
        return out;
      }
      return node.map(item => visit(item, name));
    }
    if (node && typeof node === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(node)) out[k] = SKIP.has(k) ? v : visit(v, k);
      return out;
    }
    return node;
  };
  return { value: visit(value, field), hits };
}

/** Plans one item: returns its new data, the rules applied and the rules that found nothing. */
export function itemChange(item, entry) {
  let data = structuredClone(item.data);
  const applied = [], missing = [];
  for (const rule of entry.rules || []) {
    const result = applyRule(data, rule);
    if (result.hits) { data = result.value; applied.push(rule.id); }
    else missing.push(rule.id);
  }
  for (const [sectionKey, update] of Object.entries(entry.sections || {})) {
    const sections = Array.isArray(data.sections) ? data.sections : [];
    const index = sections.findIndex(section => section.section_key === sectionKey);
    if (index < 0) { missing.push(update.id || `sections.${sectionKey}`); continue; }
    const current = sections[index];
    if (update.expect && Object.entries(update.expect).some(([field, text]) => (current[field] ?? '') !== text)) { missing.push(update.id || `sections.${sectionKey}`); continue; }
    if (update.remove) sections.splice(index, 1);
    else for (const field of ['heading', 'display_heading', 'text', 'cta_label', 'cta_href']) if (update[field] !== undefined) current[field] = update[field];
    data.sections = sections;
    applied.push(update.id || `sections.${sectionKey}`);
  }
  let seo = null;
  for (const [field, [current, next]] of Object.entries(entry.seo || {})) {
    const value = item.seo?.[field] ?? '';
    if (value === next) continue;
    if (value !== current) { missing.push(`seo.${field}`); continue; }
    seo = { ...(seo || item.seo || {}), [field]: next };
    applied.push(`seo.${field}`);
  }
  return { data, seo, applied, missing, changed: JSON.stringify(data) !== JSON.stringify(item.data) || !!seo };
}

export function validateManifest(manifest) {
  assert(Array.isArray(manifest.entries) && manifest.entries.length, 'The manifest needs entries.');
  const text = JSON.stringify(manifest.entries.map(entry => [entry.rules?.map(rule => rule.to), entry.sections])).replaceAll('\\"', '');
  assert(!text.includes('!'), 'No exclamation marks.');
  assert(!/revendeur officiel|représentant officiel|promo|remise|soldes/iu.test(text), 'No dealer claim or promotion.');
  for (const entry of manifest.entries) {
    assert(['pages', 'families', 'models', 'posts', 'site_content'].includes(entry.collection), `${entry.slug}: unknown collection.`);
    for (const rule of entry.rules || []) assert(rule.id && Array.isArray(rule.from) && rule.from.length && rule.from.every(Boolean), `${entry.slug}: bad rule ${rule.id}.`);
  }
}

export async function planAudit(api, manifest) {
  const lists = {}, changes = [], missing = [];
  for (const entry of manifest.entries) {
    lists[entry.collection] ||= (await api(`/_emdash/api/content/${entry.collection}?limit=100`)).items || [];
    const summary = lists[entry.collection].find(item => item.slug === entry.slug);
    if (!summary) { missing.push(`${entry.collection}/${entry.slug}: item missing`); continue; }
    const { item } = await api(`/_emdash/api/content/${entry.collection}/${encodeURIComponent(summary.id)}`);
    const change = itemChange(item, entry);
    for (const id of change.missing) missing.push(`${entry.collection}/${entry.slug}: ${id}`);
    if (change.changed) changes.push({ collection: entry.collection, slug: entry.slug, id: summary.id, rules: change.applied, before: item.data, beforeSeo: item.seo, entry });
  }
  return { changes, missing };
}

export async function applyAudit(api, plan, { beforeWrite, log = () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  await beforeWrite(plan);
  for (const change of plan.changes) {
    const path = `/_emdash/api/content/${change.collection}/${encodeURIComponent(change.id)}`;
    const fresh = await api(path);
    const again = itemChange(fresh.item, change.entry);
    if (!again.changed) continue;
    await api(path, { method: 'PUT', data: { _rev: fresh._rev, data: again.data, ...(again.seo ? { seo: again.seo } : {}) } });
    const saved = await api(path);
    if (fresh.item.status === 'published') await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
    log(`${change.collection}/${change.slug}: ${again.applied.join(', ')}`);
  }
}

const allowedPaths = /^\/_emdash\/api\/content\/(?:pages|families|models|posts|site_content)(?:[/?]|$)/u;

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => ['--apply', '--dump'].includes(flag)), 'Use no flag for a dry run, --dump or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const api = await authenticatedApi(origin, allowedPaths);
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  if (flags.includes('--dump')) {
    // A private copy of the live texts, to write the rules against.
    const dump = {};
    for (const collection of ['pages', 'families', 'models', 'posts', 'site_content']) {
      dump[collection] = {};
      for (const summary of (await api(`/_emdash/api/content/${collection}?limit=100`)).items || []) {
        const { item } = await api(`/_emdash/api/content/${collection}/${encodeURIComponent(summary.id)}`);
        dump[collection][summary.slug] = item.data;
        (dump.seo ||= {})[`${collection}/${summary.slug}`] = item.seo || null;
      }
    }
    await writeFile(join(dir, 'live.json'), JSON.stringify(dump, null, 1), { mode: 0o600 });
    console.log(`Saved ${Object.values(dump).reduce((n, items) => n + Object.keys(items).length, 0)} items.`);
    return;
  }
  const manifest = await loadManifest();
  validateManifest(manifest);
  const plan = await planAudit(api, manifest);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    change: plan.changes.map(change => `${change.collection}/${change.slug}: ${change.rules.join(', ')}`), notFound: plan.missing }, null, 1));
  if (!flags.includes('--apply')) return;
  await applyAudit(api, plan, {
    beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`),
      JSON.stringify(value.changes.map(({ entry, ...rest }) => rest), null, 2), { mode: 0o600, flag: 'wx' }),
    log: message => console.log(message),
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
