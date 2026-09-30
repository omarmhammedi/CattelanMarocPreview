/** Targeted copy refresh. Native API only; never seed, setup, media or authentication writes. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertNoDraft, authentication, officialUrl } from './0003-model-detail-pages.mjs';
import { assertPreservedEntry, assertUnchangedEntry, readReferences } from './0004-collection-editorial.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const id = '0010-editorial-refresh';
const pathFor = (collection, slug) => `/_emdash/api/content/${collection}/${encodeURIComponent(slug)}`;
const schemaPath = collection => `/_emdash/api/schema/collections/${collection}?includeFields=true`;
const allowed = {
  pages: ['title', 'intro', 'content', 'sections', 'brand_caption', 'seo_title', 'meta_description', 'hero_image'],
  families: ['intro', 'card_text', 'content', 'seo_title', 'meta_description', 'image_caption', 'image'],
  models: ['description', 'content', 'availability_note'],
  posts: ['title', 'excerpt', 'content', 'sources', 'cta_text', 'cta_label', 'cta_href', 'seo_title', 'meta_description', 'image_caption', 'image'],
  site_content: ['footer_text', 'catalogue_label', 'contact_label', 'whatsapp_url', 'model_notice', 'preview_notice', 'form_email_label', 'form_opt_in_label', 'form_hint', 'form_privacy', 'form_pending', 'form_email_error', 'form_error', 'form_success_title', 'form_success_text', 'form_unavailable', 'map_note'],
};

function safeHref(href) {
  if (typeof href === 'string' && /^\/(?!\/)[a-z0-9/\-#]*$/i.test(href)) return;
  officialUrl(href);
}

export function validateRefresh(entries, menu) {
  assert(Array.isArray(entries) && entries.length > 0 && entries.length <= 40);
  const seen = new Set();
  for (const e of entries) {
    assert(allowed[e.collection] && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(e.slug), 'Unexpected collection/slug.');
    assert(!seen.has(`${e.collection}/${e.slug}`), 'Duplicate refresh entry.');
    seen.add(`${e.collection}/${e.slug}`);
    const hasSeo = 'seoBefore' in e || 'seoAfter' in e;
    const hasAbsent = Object.hasOwn(e, 'beforeAbsent');
    assert.deepEqual(Object.keys(e).sort(), ['collection', 'slug', 'before', 'after', ...(hasSeo ? ['seoBefore', 'seoAfter'] : []), ...(hasAbsent ? ['beforeAbsent'] : [])].sort());
    assert(e.before && e.after && Object.keys(e.after).length, 'Empty change.');
    // A native unset optional URL is absent, not null. Keep this explicit and
    // limited to the newly configured WhatsApp field; do not relax old guards.
    if (hasAbsent) {
      assert(e.collection === 'site_content' && e.slug === 'global');
      assert.deepEqual(e.beforeAbsent, ['whatsapp_url'], 'Only an absent WhatsApp URL may be introduced.');
      assert(!Object.hasOwn(e.before, 'whatsapp_url') && Object.hasOwn(e.after, 'whatsapp_url'));
    }
    assert.deepEqual([...Object.keys(e.before), ...(e.beforeAbsent || [])].sort(), Object.keys(e.after).sort());
    for (const [key, value] of Object.entries(e.after)) {
      assert(allowed[e.collection].includes(key), `Forbidden editorial field: ${e.collection}.${key}`);
      if (['image', 'hero_image'].includes(key)) {
        // An editorial alt correction cannot select, replace, resize or delete
        // an existing asset. Every other media property must stay identical.
        const before = e.before[key];
        assert(value && before && typeof value === 'object' && !Array.isArray(value));
        assert(typeof value.alt === 'string' && value.alt.trim() && value.alt.length <= 500);
        assert.deepEqual({...value,alt:before.alt},before,'Only the existing image alt text may change.');
      } else if (['sections', 'content', 'sources'].includes(key)) {
        assert(Array.isArray(value) && value.length <= 100, 'Invalid content list.');
        if (key === 'sections') for (const section of value) {
          assert(Object.keys(section).every(k => ['section_key', 'heading', 'display_heading', 'text', 'cta_label', 'cta_href'].includes(k)), 'Sections may not change media.');
          assert(typeof section.section_key === 'string' && section.section_key);
          for (const val of Object.values(section)) assert(typeof val === 'string' && val.length <= 10000);
          if (section.cta_href) safeHref(section.cta_href);
        }
        if (key === 'sources') for (const source of value) {
          assert.deepEqual(Object.keys(source).sort(), ['label', 'url']);
          assert(typeof source.label === 'string' && source.label); officialUrl(source.url);
        }
        if (key === 'content') {
          const blockKeys = new Set();
          for (const block of value) {
            assert(block._type === 'block' && ['normal', 'h2', 'h3'].includes(block.style));
            assert(typeof block._key === 'string' && block._key && !blockKeys.has(block._key)); blockKeys.add(block._key);
            assert(Array.isArray(block.children) && block.children.length && Array.isArray(block.markDefs));
            const marks = new Set(['strong', 'em', 'underline', 'strike-through', 'code']);
            for (const mark of block.markDefs) { assert(mark._type === 'link' && mark._key && !marks.has(mark._key)); safeHref(mark.href); marks.add(mark._key); }
            for (const span of block.children) assert(span._type === 'span' && typeof span.text === 'string' && span.text.length < 10000 && Array.isArray(span.marks) && span.marks.every(m => marks.has(m)));
          }
        }
      } else if (key === 'whatsapp_url') {
        assert(e.slug === 'global' && typeof value === 'string' && /^https:\/\/wa\.me\/[1-9][0-9]{7,14}$/.test(value), 'WhatsApp must be an exact HTTPS wa.me URL with international digits only.');
      } else assert(typeof value === 'string' && value.length <= 10000, 'Invalid editorial text.');
      if (key === 'cta_href' && value) safeHref(value);
    }
    if (hasSeo) for (const phase of ['seoBefore', 'seoAfter']) {
      assert.deepEqual(Object.keys(e[phase]).sort(), ['description', 'title']);
      for (const value of Object.values(e[phase])) assert(value === null || (typeof value === 'string' && value.length <= 500));
    }
    assert(!isDeepStrictEqual(e.before, e.after) || !isDeepStrictEqual(e.seoBefore, e.seoAfter), 'No change.');
  }
  assert.deepEqual(Object.keys(menu).sort(), ['afterLabel', 'beforeLabel', 'name', 'url']);
  assert(menu.name === 'primary' && menu.url === '/catalogue/' && menu.beforeLabel === 'Recevoir le catalogue' && menu.afterLabel === 'Catalogue');
  return { entries, menu };
}

function completedData(data, expected) {
  // Native image saves hydrate these media-library values. Ignore additions
  // only when recognizing an already-completed entry, so it is not rewritten.
  // The initial-state comparison below remains exact, including all metadata.
  return Object.fromEntries(Object.entries(data).map(([key, value]) => {
    const wanted = expected[key];
    if (!['image', 'hero_image'].includes(key) || !value?.meta || !wanted?.meta
      || typeof value.meta !== 'object' || Array.isArray(value.meta)
      || typeof wanted.meta !== 'object' || Array.isArray(wanted.meta)) return [key, value];
    const meta = { ...value.meta };
    for (const added of ['caption', 'blurhash', 'dominantColor']) {
      if (!Object.hasOwn(wanted.meta, added)) delete meta[added];
    }
    return [key, { ...value, meta }];
  }));
}

export function planCopy(response, entry) {
  assertNoDraft(response.item);
  assert.equal(response.item.status, 'published', 'This refresh only changes published entries; preserve the draft.');
  assert(response._rev && response.item.type === entry.collection && response.item.slug === entry.slug, 'Entry identity/revision mismatch.');
  const data = Object.fromEntries(Object.keys(entry.after).filter(key => Object.hasOwn(response.item.data, key)).map(key => [key, response.item.data[key]]));
  const seo = entry.seoBefore ? { title: response.item.seo?.title ?? null, description: response.item.seo?.description ?? null } : undefined;
  if (isDeepStrictEqual(completedData(data, entry.after), entry.after) && isDeepStrictEqual(seo, entry.seoAfter)) return false;
  assert(isDeepStrictEqual(data, entry.before) && isDeepStrictEqual(seo, entry.seoBefore), `${entry.collection}/${entry.slug}: text/SEO differs from the exact initial or completed state. Preserve this edit or partial migration and review it; nothing overwritten.`);
  return true;
}

export async function prepareRefresh(api, entries, menu) {
  validateRefresh(entries, menu);
  const schemas = {}, plans = [];
  for (const entry of entries) {
    const c = entry.collection;
    schemas[c] ||= (await api(schemaPath(c))).item;
    const schema = schemas[c];
    assert(schema.supports.includes('revisions') && (!entry.seoAfter || schema.supports.includes('seo')));
    for (const [key, value] of Object.entries(entry.after)) {
      const field = schema.fields.find(f => f.slug === key);
      const type = key === 'content' ? 'portableText' : ['sections', 'sources'].includes(key) ? 'repeater' : ['image', 'hero_image'].includes(key) ? 'image' : key === 'whatsapp_url' ? 'url' : null;
      assert(field && (type ? field.type === type : ['text', 'string'].includes(field.type)), `${c}.${key}: incompatible schema.`);
      if (typeof value === 'string') { assert(!field.required || value.trim()); assert(!field.validation?.maxLength || value.length <= field.validation.maxLength); }
    }
    const before = await api(pathFor(c, entry.slug));
    const change = planCopy(before, entry);
    const references = await readReferences(api, c, before.item, schema.fields);
    plans.push({ entry, before, change, references });
  }
  const menuBefore = await api('/_emdash/api/menus/primary');
  const items = menuBefore.items.filter(i => i.customUrl === menu.url);
  assert(items.length === 1 && [menu.beforeLabel, menu.afterLabel].includes(items[0].label), 'Catalogue menu differs from initial/completed state.');
  return { schemas, plans, menu, menuBefore, menuItem: items[0], menuChange: items[0].label !== menu.afterLabel };
}

async function unchanged(api, plan, schemas) {
  const fresh = await api(pathFor(plan.entry.collection, plan.entry.slug));
  assertUnchangedEntry(fresh, plan.before, plan.entry.slug);
  assert.deepEqual(await readReferences(api, plan.entry.collection, fresh.item, schemas[plan.entry.collection].fields), plan.references, 'References changed concurrently.');
  return fresh;
}

export async function applyRefresh(api, plan, { beforeWrite = async () => {}, afterEntry = async () => {} } = {}) {
  if (!plan.plans.some(p => p.change) && !plan.menuChange) return;
  for (const [c, schema] of Object.entries(plan.schemas)) assert.deepEqual((await api(schemaPath(c))).item, schema, 'Schema changed during preparation.');
  for (const entry of plan.plans) await unchanged(api, entry, plan.schemas);
  assert.deepEqual(await api('/_emdash/api/menus/primary'), plan.menuBefore, 'Menu changed during preparation.');
  await beforeWrite(); // caller persists full affected-entry/relation/schema/menu backup before any mutation
  for (const p of plan.plans.filter(p => p.change)) {
    const { entry } = p, path = pathFor(entry.collection, entry.slug);
    assert.deepEqual((await api(schemaPath(entry.collection))).item, plan.schemas[entry.collection], 'Schema changed before save.');
    const fresh = await unchanged(api, p, plan.schemas);
    const saved = await api(path, { method: 'PUT', data: { _rev: fresh._rev, data: entry.after, ...(entry.seoAfter ? { seo: entry.seoAfter } : {}) } });
    assert(saved._rev, 'Native save omitted its revision.');
    // Guard the interval between draft save and publication, including immediate native SEO.
    const pending = await api(path);
    assert.deepEqual((await api(schemaPath(entry.collection))).item, plan.schemas[entry.collection], 'Schema changed before publication; draft preserved.');
    assert.equal(pending._rev, saved._rev, 'Draft changed before publication; left it untouched.');
    assertPreservedEntry(pending, fresh, entry.after, plan.schemas[entry.collection].fields, entry.seoAfter);
    assert.deepEqual(await readReferences(api, entry.collection, pending.item, plan.schemas[entry.collection].fields), p.references);
    if (fresh.item.status === 'published') await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
    const after = await api(path);
    assertNoDraft(after.item);
    assertPreservedEntry(after, fresh, entry.after, plan.schemas[entry.collection].fields, entry.seoAfter);
    assert.deepEqual(await readReferences(api, entry.collection, after.item, plan.schemas[entry.collection].fields), p.references);
    await afterEntry({ collection: entry.collection, slug: entry.slug, fields: Object.keys(entry.after), nativeSeo: entry.seoAfter ? ['title', 'description'] : [], revision: after._rev });
  }
  if (plan.menuChange) {
    assert.deepEqual(await api('/_emdash/api/menus/primary'), plan.menuBefore, 'Menu changed before its label update.');
    await api(`/_emdash/api/menus/primary/items/${encodeURIComponent(plan.menuItem.id)}`, { method: 'PUT', data: { label: plan.menu.afterLabel } });
    const after = await api('/_emdash/api/menus/primary');
    const expected = structuredClone(plan.menuBefore);
    expected.items.find(i => i.id === plan.menuItem.id).label = plan.menu.afterLabel;
    // Native menu writes may update only the menu bookkeeping timestamp.
    expected.updatedAt = after.updatedAt;
    assert.deepEqual(after, expected, 'Unedited menu identity/order/target changed.');
    await afterEntry({ menu: 'primary', url: plan.menu.url, label: plan.menu.afterLabel });
  }
}

export async function loadRefresh() {
  const files = ['pages', 'products', 'journal'];
  const entries = (await Promise.all(files.map(file => readFile(join(root, `content/editorial-refresh-${file}.json`), 'utf8').then(JSON.parse)))).flat();
  const menu = JSON.parse(await readFile(join(root, 'content/editorial-refresh-menu.json'), 'utf8'));
  return validateRefresh(entries, menu);
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.length <= 1 && flags.every(f => ['--apply', '--dry-run'].includes(f)), 'Use --apply or --dry-run (default).');
  const origin = new URL(process.env.EMDASH_BASE_URL || 'http://localhost:4321');
  assert(['http:', 'https:'].includes(origin.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash, 'Local development origin required.');
  const manifest = await loadRefresh(), auth = await authentication(origin);
  const api = async (path, { method = 'GET', data } = {}) => {
    assert(path.startsWith('/_emdash/api/') && auth.expiresAt > Date.now());
    const response = await fetch(new URL(path, origin), { method, redirect: 'error', signal: AbortSignal.timeout(90000), headers: { ...auth.headers, Origin: origin.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    let value; try { value = await response.json(); } catch { throw Error(`Native ${method} ${path}: HTTP ${response.status}; expected JSON.`); }
    assert(response.ok && value.success, `Native ${method} ${path}: HTTP ${response.status}; stopped.`);
    return value.data;
  };
  const plan = await prepareRefresh(api, manifest.entries, manifest.menu);
  const changed = plan.plans.filter(p => p.change);
  console.log(`${flags.includes('--apply') ? 'Apply' : 'Dry run'} ${id}: ${changed.length} entries; ${plan.menuChange ? 1 : 0} menu label.`);
  changed.forEach(p => console.log(`${p.entry.collection}/${p.entry.slug}: ${Object.keys(p.entry.after).join(', ')}${p.entry.seoAfter ? ', native SEO' : ''}`));
  if (!flags.includes('--apply') || (!changed.length && !plan.menuChange)) { console.log('No CMS, media, authentication or local state was written.'); return; }
  console.log('Native SEO is immediate outside drafts; content publication is sequential, not atomic across entries.');
  const dir = join(root, '.wrangler/migrations'), lock = join(dir, `.${id}.lock`);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await mkdir(lock, { mode: 0o700 });
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-'), prefix = join(dir, `${id}-${stamp}`);
  const report = { migration: id, startedAt: new Date().toISOString(), manifestSha256: createHash('sha256').update(JSON.stringify(manifest)).digest('hex'), entries: [], complete: false, error: '' };
  try {
    await applyRefresh(api, plan, {
      beforeWrite: () => writeFile(`${prefix}-backup.json`, JSON.stringify(plan, null, 2) + '\n', { mode: 0o600, flag: 'wx' }),
      afterEntry: async result => { report.entries.push(result); await writeFile(`${prefix}-report.json`, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 }); console.log(`Updated ${result.collection ? result.collection + '/' + result.slug : 'menu primary'}`); },
    });
    report.complete = true;
  } catch (error) {
    report.error = error instanceof Error ? error.message : 'Migration failed';
    throw error;
  } finally {
    await writeFile(`${prefix}-report.json`, JSON.stringify({ ...report, finishedAt: new Date().toISOString() }, null, 2) + '\n', { mode: 0o600 });
    await rm(lock, { recursive: true });
    console.log(`Private migration report: ${prefix}-report.json. No automatic rollback or reseeding.`);
  }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration failed'); process.exitCode = 1; });
