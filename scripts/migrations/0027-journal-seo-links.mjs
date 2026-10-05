/** Add links to the five existing native articles. Body/source writes create drafts; never publish. */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';
import { assertPreservedEntry, readReferences } from './0004-collection-editorial.mjs';

export const migration = '0027-journal-seo-links';
export const previewOrigin = 'https://cattelan-maroc-preview.cattelan.workers.dev';
const root = fileURLToPath(new URL('../../', import.meta.url));
const schemaPath = '/_emdash/api/schema/collections/posts?includeFields=true';
const pathFor = (collection, id) => `/_emdash/api/content/${collection}/${encodeURIComponent(id)}`;
const safePath = /^\/(modeles|journal)\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/u;
const textOf = block => block.children.map(span => span.text).join('');
const clone = value => structuredClone(value);

function officialUrl(value) {
  const url = new URL(value);
  assert(url.protocol === 'https:' && ['cattelanitalia.com', 'www.cattelanitalia.com'].includes(url.hostname)
    && !url.username && !url.password && /^\/fr\/products\/[A-Za-z0-9-]+\/?$/u.test(url.pathname) && !url.search && !url.hash,
  'Sources must be exact official French product URLs.');
  return url.href.replace('://www.', '://').replace(/\/$/u, '').toLowerCase();
}

function validateContent(content) {
  assert(Array.isArray(content) && content.length > 0 && content.length <= 30, 'Expected a bounded native article body.');
  const keys = new Set();
  for (const block of content) {
    assert(block._type === 'block' && ['normal', 'h2', 'h3'].includes(block.style) && block._key && !keys.has(block._key), 'Unexpected article block.');
    keys.add(block._key);
    assert(Array.isArray(block.markDefs) && Array.isArray(block.children) && block.children.length, 'Native spans and marks are required.');
    const childKeys = new Set();
    for (const child of block.children) {
      assert(child._type === 'span' && typeof child.text === 'string' && child._key && !childKeys.has(child._key) && Array.isArray(child.marks), 'Invalid native article span.');
      childKeys.add(child._key);
    }
  }
}

export function validateManifest(manifest) {
  assert.equal(manifest.version, 1);
  assert.equal(manifest.collection, 'posts');
  assert.equal(manifest.entries.length, 5, 'This migration is limited to the five existing guides.');
  const slugs = new Set();
  for (const entry of manifest.entries) {
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.slug) && !slugs.has(entry.slug), 'Duplicate/invalid article slug.');
    slugs.add(entry.slug);
    validateContent(entry.beforeContent);
    assert(entry.links.length >= 3 && entry.links.length <= 6);
    for (const link of entry.links) assert(link.text && safePath.test(link.href) && link.href.startsWith('/modeles/'), 'Invalid model link.');
    assert(entry.related.text && safePath.test(entry.related.href) && entry.related.href.startsWith('/journal/') && entry.related.href !== `/journal/${entry.slug}/`, 'Invalid related guide.');
    for (const replacement of entry.replacements) assert(replacement.before && typeof replacement.after === 'string' && replacement.reason, 'A correction needs its source/reason.');
    if (entry.seoTitle) for (const value of Object.values(entry.seoTitle)) assert(typeof value === 'string' && value.trim() && value.length <= 90);
    for (const source of entry.sources) {
      assert(typeof source.label === 'string' && source.label && entry.sourceModels.includes(source.modelSlug));
      officialUrl(source.url);
    }
  }
  for (const entry of manifest.entries) assert(slugs.has(entry.related.href.split('/')[2]), 'Related guide must be in this existing cluster.');
  return manifest;
}

/** Preserve every existing block/span/mark except the exact annotated ranges and documented corrections. */
export function articleContent(entry) {
  const content = clone(entry.beforeContent);
  for (const replacement of entry.replacements) {
    const matches = content.flatMap(block => block.children.filter(span => span.text.includes(replacement.before)));
    assert.equal(matches.length, 1, `${entry.slug}: correction must match one existing span.`);
    assert.equal(matches[0].text.split(replacement.before).length, 2, `${entry.slug}: correction is ambiguous.`);
    matches[0].text = matches[0].text.replace(replacement.before, replacement.after);
  }
  entry.links.forEach((link, index) => {
    const markKey = `seo27-link-${index}`;
    const block = content.find(block => block.style === 'normal' && textOf(block).includes(link.text));
    assert(block, `${entry.slug}: missing model phrase ${link.text}.`);
    const start = textOf(block).indexOf(link.text), end = start + link.text.length;
    assert(!block.markDefs.some(mark => mark._key === markKey), 'Migration mark key already exists.');
    const children = []; let offset = 0;
    for (const span of block.children) {
      const spanStart = offset, spanEnd = offset + span.text.length;
      offset = spanEnd;
      if (spanEnd <= start || spanStart >= end) { children.push(span); continue; }
      assert(!span.marks.some(key => block.markDefs.some(mark => mark._key === key && mark._type === 'link')), `${entry.slug}: model phrase already has an editorial link.`);
      const localStart = Math.max(0, start - spanStart), localEnd = Math.min(span.text.length, end - spanStart);
      const pieces = [span.text.slice(0, localStart), span.text.slice(localStart, localEnd), span.text.slice(localEnd)];
      for (let part = 0; part < pieces.length; part++) if (pieces[part]) children.push({ ...span,
        _key: `${span._key}-s27-${index}-${part}`, text: pieces[part], marks: part === 1 ? [...span.marks, markKey] : [...span.marks] });
    }
    block.children = children;
    block.markDefs.push({ _key: markKey, _type: 'link', href: link.href });
  });
  const related = entry.related;
  assert(!content.some(block => block._key === 'seo27-related'), 'Related-guide key already exists.');
  content.push({ _key: 'seo27-related', _type: 'block', style: 'normal',
    markDefs: [{ _key: 'seo27-related-link', _type: 'link', href: related.href }],
    children: [
      { _key: 'seo27-related-before', _type: 'span', text: related.before, marks: [] },
      { _key: 'seo27-related-anchor', _type: 'span', text: related.text, marks: ['seo27-related-link'] },
      { _key: 'seo27-related-after', _type: 'span', text: related.after, marks: [] },
    ] });
  validateContent(content);
  return content;
}

function assertCleanPublished(response, slug) {
  const item = response?.item;
  assert(item?.type === 'posts' && item.slug === slug && item.id && response._rev, `${slug}: native identity/revision required.`);
  assert.equal(item.status, 'published', `${slug}: preserve unpublished article.`);
  assert(Object.hasOwn(item, 'draftRevisionId') && item.liveRevisionId, `${slug}: revision state missing.`);
  assert(!item.draftRevisionId || item.draftRevisionId === item.liveRevisionId, `${slug}: existing draft preserved; resolve it before rerunning.`);
  assert(item.seo && typeof item.seo === 'object', `${slug}: native SEO required.`);
}

function mergeSources(existing, additions) {
  assert(Array.isArray(existing), 'Native source list is required.');
  const out = clone(existing);
  const identity = url => { try { return officialUrl(url); } catch { return url; } };
  for (const source of additions) if (!out.some(current => identity(current.url) === identity(source.url))) out.push({ label: source.label, url: source.url });
  return out;
}

export function planJournalEntry(response, entry) {
  assertCleanPublished(response, entry.slug);
  const afterContent = articleContent(entry);
  const current = response.item.data;
  const complete = isDeepStrictEqual(current.content, afterContent);
  assert(complete || isDeepStrictEqual(current.content, entry.beforeContent), `${entry.slug}: article body differs from audited state; preserve it.`);
  const sources = mergeSources(current.sources, entry.sources);
  const data = {};
  if (!complete) data.content = afterContent;
  if (!isDeepStrictEqual(sources, current.sources)) data.sources = sources;
  const seo = {};
  if (entry.seoTitle) {
    const title = response.item.seo.title;
    assert([entry.seoTitle.before, entry.seoTitle.after].includes(title), `${entry.slug}: native SEO title was edited; preserve it.`);
    if (title !== entry.seoTitle.after) seo.title = entry.seoTitle.after;
  }
  return { entry, before: clone(response), data, seo, change: !!Object.keys(data).length || !!Object.keys(seo).length };
}

function targetIdentity(href) {
  assert(safePath.test(href));
  const [, group, slug] = href.split('/');
  return { collection: group === 'modeles' ? 'models' : 'posts', slug };
}
function publishedTarget(response, target) {
  const item = response?.item;
  assert(item?.type === target.collection && item.slug === target.slug && item.status === 'published' && item.liveRevisionId, `${target.slug}: link destination is not published.`);
  const pending = item.draftRevisionId && item.draftRevisionId !== item.liveRevisionId;
  const data = pending ? item.liveData : item.data;
  assert(data && !item.seo?.noIndex, `${target.slug}: destination unavailable or intentionally noindex.`);
  return data;
}

export async function planJournalSeo(api, manifest) {
  validateManifest(manifest);
  const schema = (await api(schemaPath)).item;
  assert(schema.supports?.includes('revisions') && schema.supports?.includes('seo'), 'Native posts revisions and SEO required.');
  assert.equal(schema.fields.find(field => field.slug === 'content')?.type, 'portableText');
  assert.equal(schema.fields.find(field => field.slug === 'sources')?.type, 'repeater');
  const entries = [];
  for (const entry of manifest.entries) {
    const plan = planJournalEntry(await api(pathFor('posts', entry.slug)), entry);
    plan.references = await readReferences(api, 'posts', plan.before.item, schema.fields);
    entries.push(plan);
  }
  const targets = new Map();
  for (const entry of manifest.entries) for (const href of [...entry.links.map(link => link.href), entry.related.href]) {
    if (targets.has(href)) continue;
    const target = targetIdentity(href);
    const response = await api(pathFor(target.collection, target.slug));
    publishedTarget(response, target);
    targets.set(href, { ...target, response });
  }
  for (const entry of manifest.entries) for (const source of entry.sources) {
    const target = targets.get(`/modeles/${source.modelSlug}/`);
    assert(target, 'Source model must be linked from its article.');
    const data = publishedTarget(target.response, target);
    assert([data.source_url, data.official_url].filter(Boolean).some(url => { try { return officialUrl(url) === officialUrl(source.url); } catch { return false; } }), `${source.modelSlug}: source differs from native published product.`);
  }
  return { migration, schema, entries, targets: [...targets.values()] };
}

async function assertUnchanged(api, plan, schema) {
  const fresh = await api(pathFor('posts', plan.before.item.id));
  assertCleanPublished(fresh, plan.entry.slug);
  assert.equal(fresh._rev, plan.before._rev, `${plan.entry.slug}: concurrent revision; preserve it.`);
  assert.deepEqual(fresh.item, plan.before.item, `${plan.entry.slug}: native entry changed since inventory.`);
  assert.deepEqual(await readReferences(api, 'posts', fresh.item, schema.fields), plan.references, 'Article references changed.');
  return fresh;
}

/** Every mutation is backed up first. Only native PUT of draft data and immediate SEO is allowed. */
export async function applyJournalSeo(api, plan, { beforeWrite, afterEntry = async () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'Private before-image writer required.');
  assert.deepEqual((await api(schemaPath)).item, plan.schema, 'Posts schema changed.');
  for (const entry of plan.entries) await assertUnchanged(api, entry, plan.schema);
  for (const target of plan.targets) {
    const fresh = await api(pathFor(target.collection, target.slug));
    publishedTarget(fresh, target);
    assert.equal(fresh._rev, target.response._rev, `${target.slug}: destination changed; replan.`);
  }
  await beforeWrite({ kind: 'plan', ...plan });
  for (const entry of plan.entries.filter(entry => entry.change)) {
    const path = pathFor('posts', entry.before.item.id);
    assert.deepEqual((await api(schemaPath)).item, plan.schema, 'Posts schema changed before save.');
    let current = await assertUnchanged(api, entry, plan.schema);
    await beforeWrite({ kind: 'entry', slug: entry.entry.slug, response: current, data: entry.data, seo: entry.seo });
    if (Object.keys(entry.data).length) {
      await api(path, { method: 'PUT', data: { _rev: current._rev, data: entry.data } });
      const saved = await api(path);
      assertPreservedEntry(saved, current, entry.data, plan.schema.fields);
      assert.equal(saved.item.liveRevisionId, current.item.liveRevisionId, 'Draft write must not publish.');
      assert(saved.item.draftRevisionId && saved.item.draftRevisionId !== saved.item.liveRevisionId, 'Native draft was not created.');
      assert.deepEqual(saved.item.liveData, current.item.data, 'Live article data changed during draft save.');
      assert.deepEqual(await readReferences(api, 'posts', saved.item, plan.schema.fields), entry.references);
      current = saved;
    }
    if (Object.keys(entry.seo).length) {
      const fresh = await api(path);
      assert.equal(fresh._rev, current._rev, 'Draft changed before immediate SEO save; preserved.');
      assert.deepEqual(fresh.item, current.item, 'Entry changed before immediate SEO save.');
      await beforeWrite({ kind: 'before-seo', slug: entry.entry.slug, response: fresh, seo: entry.seo });
      await api(path, { method: 'PUT', data: { _rev: fresh._rev, seo: entry.seo } });
      const saved = await api(path);
      assertPreservedEntry(saved, fresh, {}, plan.schema.fields, entry.seo);
      assert.equal(saved.item.liveRevisionId, fresh.item.liveRevisionId, 'SEO must not publish.');
      assert.equal(saved.item.draftRevisionId, fresh.item.draftRevisionId, 'SEO must not revise draft content.');
      assert.deepEqual(saved.item.liveData, fresh.item.liveData, 'SEO changed live body.');
      current = saved;
    }
    await afterEntry({ slug: entry.entry.slug, before: entry.before, after: current, fields: Object.keys(entry.data), nativeSeo: Object.keys(entry.seo) });
  }
}

export async function loadManifest() {
  return validateManifest(JSON.parse(await readFile(join(root, 'content/journal-seo-2026-10-05.json'), 'utf8')));
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for inventory, or --apply for drafts and immediate SEO.');
  const origin = new URL(process.env.EMDASH_BASE_URL || previewOrigin);
  assert(!origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash, 'Use an origin, not a URL path.');
  assert(origin.origin === previewOrigin || ['localhost', '127.0.0.1'].includes(origin.hostname), 'Pinned Cattelan preview or local CMS required.');
  const nativeApi = await authenticatedApi(origin, /^\/_emdash\/api\/(?:schema\/collections\/posts|content\/(?:posts|models))(?:[/?]|$)/u);
  const api = (path, options = {}) => {
    const method = options.method || 'GET';
    assert(method === 'GET' || (method === 'PUT' && /^\/_emdash\/api\/content\/posts\/[a-z0-9-]+$/iu.test(path)), 'Only article draft and SEO PUTs are authorized; publication is separate.');
    return nativeApi(path, options);
  };
  const plan = await planJournalSeo(api, await loadManifest());
  console.log(JSON.stringify({ migration, origin: origin.origin, mode: flags.includes('--apply') ? 'save-drafts' : 'dry-run',
    articles: plan.entries.map(entry => ({ slug: entry.entry.slug, fields: Object.keys(entry.data), immediateSeo: Object.keys(entry.seo), change: entry.change })),
    verifiedDestinations: plan.targets.length }, null, 2));
  if (!flags.includes('--apply') || !plan.entries.some(entry => entry.change)) return;
  const dir = join(root, '.wrangler/migrations', migration, new Date().toISOString().replaceAll(/[:.]/gu, '-'));
  await mkdir(dir, { recursive: true, mode: 0o700 }); let number = 0;
  const persist = value => writeFile(join(dir, `${String(number++).padStart(4, '0')}-${value.kind || 'receipt'}.json`), JSON.stringify({ origin: origin.origin, ...value }, null, 2), { mode: 0o600, flag: 'wx' });
  await applyJournalSeo(api, plan, { beforeWrite: persist, afterEntry: async receipt => { await persist({ kind: 'receipt', ...receipt }); console.log(`${receipt.slug}: saved; body/source publication remains separate.`); } });
  console.log(`Drafts verified; native SEO titles saved immediately. No article was published. Private receipts: ${dir}`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
