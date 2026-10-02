/**
 * SEO strategy v2 and copy audit: concrete text for the home, collections, showroom, catalogue,
 * journal and À propos pages, the eight families and the eleven original models
 * (content/copy-v2.json). A field, a section text or a portable-text body is replaced only
 * when it still holds a version this project wrote: the seed or any earlier manifest in
 * content/. An editor's own text is kept and reported. A missing section is added.
 *
 *   EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0021-copy-v2.mjs [--apply]
 *   EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0021-copy-v2.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';
import { portableText } from './0016-new-families.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const migration = '0021-copy-v2';
const manifestFile = 'copy-v2.json';
const collections = ['pages', 'families', 'models', 'posts', 'site_content'];
const limits = { footer_text: 220, title: 120, short_title: 60, seo_title: 90, meta_description: 160, card_text: 200 };

export function validateManifest(manifest) {
  assert.equal(manifest.version, 1);
  const seen = new Set();
  for (const entry of manifest.entries) {
    assert(collections.includes(entry.collection), `${entry.slug}: unsupported collection.`);
    assert(!seen.has(`${entry.collection}/${entry.slug}`), `${entry.slug}: duplicate entry.`);
    seen.add(`${entry.collection}/${entry.slug}`);
    for (const [field, value] of Object.entries(entry.fields || {})) {
      if (field === 'content') {
        // An empty heading continues the previous section with another paragraph.
        assert(Array.isArray(value) && value.length && value.every(pair => pair.length === 2 && typeof pair[0] === 'string' && pair[1]), `${entry.slug}: content is [heading, text] pairs.`);
        continue;
      }
      assert(typeof value === 'string' && value.trim() === value && value, `${entry.slug}.${field}: empty text.`);
      if (limits[field]) assert(value.length <= limits[field], `${entry.slug}.${field}: ${value.length} > ${limits[field]} characters.`);
    }
    for (const [key, section] of Object.entries(entry.sections || {})) {
      assert(section.text || section.heading || section.cta_label, `${entry.slug}.${key}: empty section.`);
    }
  }
  return manifest;
}

export async function loadManifest(file = manifestFile) {
  return validateManifest(JSON.parse(await readFile(join(root, 'content', file), 'utf8')));
}

export const textOf = blocks => (Array.isArray(blocks) ? blocks : [])
  .map(block => (block.children || []).map(child => child.text || '').join('')).join('\n').trim();

export function bodyOf(slug, pairs) {
  const blocks = portableText(`copy-v2-${slug}`, pairs.map(([, text]) => text), pairs.map(([heading]) => heading));
  return blocks;
}

/**
 * Every version this project wrote, per collection/slug: field strings, portable-text bodies
 * (as plain text) and section heading/text, gathered from the seed and every content manifest.
 */
export function collectKnown(sources) {
  const known = new Map();
  const bucket = (collection, slug) => {
    const key = `${collection || '*'}/${slug}`;
    if (!known.has(key)) known.set(key, { fields: new Map(), sections: new Map() });
    return known.get(key);
  };
  const add = (map, key, value) => { if (!map.has(key)) map.set(key, new Set()); map.get(key).add(value); };
  const visitItem = (target, value, depth = 0) => {
    if (!value || typeof value !== 'object' || depth > 6) return;
    if (Array.isArray(value)) {
      if (value.some(item => item?._type === 'block')) return;
      for (const item of value) {
        if (item && typeof item === 'object' && typeof item.section_key === 'string') {
          for (const field of ['heading', 'text', 'cta_label']) if (typeof item[field] === 'string') add(target.sections, `${item.section_key}.${field}`, item[field]);
        } else visitItem(target, item, depth + 1);
      }
      return;
    }
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === 'string') add(target.fields, key, item);
      else if (Array.isArray(item) && item.some(block => block?._type === 'block')) add(target.fields, key, textOf(item));
      else visitItem(target, item, depth + 1);
    }
  };
  const walk = (value, collection) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(item => walk(item, collection)); return; }
    const own = typeof value.collection === 'string' ? value.collection : collection;
    if (typeof value.slug === 'string') {
      const target = bucket(own, value.slug);
      visitItem(target, value);
      // Manifests in the 0019 shape: { slug, known: [...], after } hold seo_title versions.
      if (Array.isArray(value.known) && typeof value.after === 'string') for (const title of [...value.known, value.after]) add(target.fields, 'seo_title', title);
    }
    for (const [key, item] of Object.entries(value)) if (key !== 'data') walk(item, collections.includes(key) ? key : own);
  };
  for (const source of sources) walk(source, null);
  // Every string and every line this project ever wrote, wherever it sits in a manifest or an earlier seed:
  // a text whose lines all appear here was written by this project, not by an editor.
  const all = new Set();
  const collect = value => {
    if (typeof value === 'string') { all.add(value.trim()); for (const line of value.split('\n')) all.add(line.trim()); return; }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value) && value.some(item => item?._type === 'block')) { for (const line of textOf(value).split('\n')) all.add(line.trim()); return; }
    for (const item of Object.values(value)) collect(item);
  };
  sources.forEach(collect);
  all.delete('');
  known.all = all;
  return known;
}

/** True when every line of a text was written by this project. */
export const ours = (known, text) => {
  const lines = String(text ?? '').split('\n').map(line => line.trim()).filter(Boolean);
  return lines.length > 0 && lines.every(line => known.all?.has(line));
};

const knownFor = (known, collection, slug) => {
  const exact = known.get(`${collection}/${slug}`), loose = known.get(`*/${slug}`);
  const merge = name => {
    const map = new Map();
    for (const part of [exact, loose]) for (const [key, values] of part?.[name] || []) map.set(key, new Set([...(map.get(key) || []), ...values]));
    return map;
  };
  return { fields: merge('fields'), sections: merge('sections') };
};

/** The changes for one item, each only from a known value; edited values are reported. */
export function itemChange(item, entry, known) {
  const versions = knownFor(known, entry.collection, entry.slug);
  const data = { ...item.data }, changed = [], kept = [];
  let nativeTitle = null;
  for (const [field, value] of Object.entries(entry.fields || {})) {
    if (field === 'content') {
      const current = textOf(data.content);
      const target = bodyOf(entry.slug, value);
      if (current === textOf(target)) continue;
      if (current === '' || versions.fields.get('content')?.has(current) || ours(known, current)) { data.content = target; changed.push('content'); }
      else kept.push('content');
      continue;
    }
    const current = data[field] ?? null;
    if (current === value) continue;
    if (current === null || current === '' || versions.fields.get(field)?.has(current) || ours(known, current)) { data[field] = value; changed.push(field); }
    else kept.push(field);
  }
  if (entry.fields?.seo_title) {
    const native = item.seo?.title ?? null;
    if (native && native !== entry.fields.seo_title && (versions.fields.get('seo_title')?.has(native) || ours(known, native))) nativeTitle = entry.fields.seo_title;
  }
  if (entry.sections) {
    const sections = (data.sections || []).map(section => ({ ...section }));
    for (const [key, update] of Object.entries(entry.sections)) {
      let section = sections.find(item => item.section_key === key);
      if (!section) {
        section = { section_key: key, heading: update.heading || '', text: update.text || '', cta_label: update.cta_label || '', cta_href: update.cta_href || '' };
        // A new section goes before or after the one it names, when that one exists; else at the end.
        const before = update.before ? sections.findIndex(item => item.section_key === update.before) : -1;
        const after = update.after ? sections.findIndex(item => item.section_key === update.after) : -1;
        sections.splice(before >= 0 ? before : after >= 0 ? after + 1 : sections.length, 0, section);
        changed.push(`sections.${key} (added)`);
        continue;
      }
      for (const field of ['heading', 'text', 'cta_label']) {
        if (update[field] === undefined || section[field] === update[field]) continue;
        const current = section[field] ?? '';
        if (current === '' || versions.sections.get(`${key}.${field}`)?.has(current) || ours(known, current)) { section[field] = update[field]; changed.push(`sections.${key}.${field}`); }
        else kept.push(`sections.${key}.${field}`);
      }
    }
    if (changed.some(name => name.startsWith('sections.'))) data.sections = sections;
  }
  if (nativeTitle) changed.push('seo.title');
  return { data, nativeTitle, changed, kept };
}

/** Every committed version of the seed: texts this project wrote and later replaced. */
function seedHistory() {
  try {
    const revisions = execFileSync('git', ['log', '--format=%H', '--', 'seed/seed.json'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
    return revisions.map(rev => JSON.parse(execFileSync('git', ['show', `${rev}:seed/seed.json`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })).content);
  } catch { return []; }
}

export async function loadSources(exclude = manifestFile) {
  const sources = [JSON.parse(await readFile(join(root, 'seed/seed.json'), 'utf8')).content, ...seedHistory()];
  for (const name of (await readdir(join(root, 'content'))).sort()) {
    if (!name.endsWith('.json') || name === exclude) continue;
    sources.push(JSON.parse(await readFile(join(root, 'content', name), 'utf8')));
  }
  return sources;
}

export async function planCopy(api, manifest, known) {
  const lists = {}, changes = [], kept = [];
  for (const entry of manifest.entries) {
    lists[entry.collection] ||= (await api(`/_emdash/api/content/${entry.collection}?limit=100`)).items || [];
    const summary = lists[entry.collection].find(item => item.slug === entry.slug);
    if (!summary) { kept.push({ collection: entry.collection, slug: entry.slug, reason: 'missing' }); continue; }
    const { item } = await api(`/_emdash/api/content/${entry.collection}/${encodeURIComponent(summary.id)}`);
    const change = itemChange(item, entry, known);
    if (change.kept.length) kept.push({ collection: entry.collection, slug: entry.slug, reason: 'edited', fields: change.kept });
    if (change.changed.length) changes.push({ collection: entry.collection, slug: entry.slug, id: summary.id, fields: change.changed, before: item.data, entry });
  }
  return { changes, kept };
}

export async function applyCopy(api, plan, known, { beforeWrite, log = () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  await beforeWrite(plan);
  for (const change of plan.changes) {
    const path = `/_emdash/api/content/${change.collection}/${encodeURIComponent(change.id)}`;
    const fresh = await api(path);
    const again = itemChange(fresh.item, change.entry, known);
    if (!again.changed.length) continue;
    await api(path, { method: 'PUT', data: {
      _rev: fresh._rev, data: again.data,
      ...(again.nativeTitle ? { seo: { ...fresh.item.seo, title: again.nativeTitle } } : {}),
    } });
    const saved = await api(path);
    if (fresh.item.status === 'published') await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
    log(`${change.collection}/${change.slug}: ${again.changed.join(', ')}`);
  }
}

const allowedPaths = /^\/_emdash\/api\/content\/(?:pages|families|models|posts|site_content)(?:[/?]|$)/u;

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const api = await authenticatedApi(origin, allowedPaths);
  const known = collectKnown(await loadSources());
  const plan = await planCopy(api, await loadManifest(), known);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    change: plan.changes.map(change => `${change.collection}/${change.slug}: ${change.fields.join(', ')}`), kept: plan.kept }, null, 1));
  if (!flags.includes('--apply')) return;
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await applyCopy(api, plan, known, {
    beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`),
      JSON.stringify(value.changes.map(({ entry, ...rest }) => rest), null, 2), { mode: 0o600, flag: 'wx' }),
    log: message => console.log(message),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
