/**
 * Owner-approved showroom copy and photographs. Local native APIs only.
 * Dry run is read-only; apply backs up before importing one deduplicated JPEG.
 * Existing media, model content, native SEO and unrelated page fields stay intact.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { assertNoDraft, authentication, detectedMime } from './0003-model-detail-pages.mjs';
import { assertPreservedEntry, assertUnchangedEntry, readReferences } from './0004-collection-editorial.mjs';
import { applyShowroomLocation, assertShowroomSchema } from './0005-showroom-location.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const schemaPath = '/_emdash/api/schema/collections/pages?includeFields=true';
const contentPath = slug => `/_emdash/api/content/pages/${slug}`;
const modelPath = '/_emdash/api/content/models/skorpio';
const sourceUrl = 'https://maisonsdumaroc.com/wp-content/uploads/2026/09/Cattelan-Italia-Casablanca-1.jpg';
const maxBytes = 8 * 1024 * 1024;
const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);
const mediaPath = value => `/_emdash/api/media/file/${encodeURIComponent(value.meta.storageKey)}`;
const withoutKey = ({ _key, ...row }) => row;

function exactKeys(value, keys, label) {
  assert(value && typeof value === 'object' && !Array.isArray(value), `${label}: expected an object.`);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), `${label}: unexpected or missing keys.`);
}

export function validateShowroomRefresh(manifest, copy) {
  exactKeys(manifest, ['version', 'copy_file', 'before', 'assets'], 'Refresh manifest');
  assert.equal(manifest.version, 1);
  assert.equal(manifest.copy_file, 'showroom-editorial-copy.json');
  exactKeys(manifest.before, ['home', 'showroom'], 'Before pages');
  exactKeys(manifest.before.home, ['showroom_section', 'showroom_invitation', 'brand_image', 'brand_detail_image', 'showroom_image'], 'Before home');
  exactKeys(manifest.before.showroom, ['intro', 'sections', 'seo_title', 'meta_description', 'hero_image'], 'Before showroom');
  exactKeys(manifest.assets, ['brand', 'detail', 'showroom'], 'Refresh assets');
  const imageKeys = ['filename', 'alt', 'width', 'height', 'mimeType', 'sha256'];
  for (const image of [manifest.before.home.brand_image, manifest.before.home.brand_detail_image, manifest.before.home.showroom_image, manifest.before.showroom.hero_image]) exactKeys(image, imageKeys, 'Baseline image');
  for (const [key, index, url] of [
    ['brand', 5, 'https://download.cattelanitalia.com/multimedia/hd/30e29264-d6f3-4b11-8351-14c2603979e4.jpg?t=1758703697'],
    ['detail', 7, 'https://download.cattelanitalia.com/multimedia/hd/9997cf91-aae7-42d4-8f2c-083db41f17cf.jpg?t=1669795913'],
  ]) {
    const image = manifest.assets[key];
    exactKeys(image, [...imageKeys, 'model', 'gallery_index', 'source_url'], `Existing ${key} image`);
    assert.equal(image.model, 'skorpio');
    assert.equal(image.gallery_index, index);
    assert.equal(image.source_url, url);
  }
  exactKeys(manifest.assets.showroom, [...imageKeys, 'url', 'source_page', 'bytes'], 'New showroom photograph');
  assert.equal(manifest.assets.showroom.url, sourceUrl, 'Only the approved press photograph may be imported.');
  assert.equal(manifest.assets.showroom.source_page, 'https://maisonsdumaroc.com/architectures-et-design/cattelan-italia-ouvre-son-premier-flagship-store-au-maroc');
  assert(Number.isSafeInteger(manifest.assets.showroom.bytes) && manifest.assets.showroom.bytes > 0 && manifest.assets.showroom.bytes <= maxBytes);
  for (const image of [...Object.values(manifest.assets), ...['brand_image', 'brand_detail_image', 'showroom_image'].map(key => manifest.before.home[key]), manifest.before.showroom.hero_image]) {
    assert(/^[a-z0-9-]+\.jpg$/i.test(image.filename) && typeof image.alt === 'string' && image.alt.trim());
    assert(image.mimeType === 'image/jpeg' && /^[a-f0-9]{64}$/.test(image.sha256));
    assert(Number.isSafeInteger(image.width) && image.width > 0 && Number.isSafeInteger(image.height) && image.height > 0);
  }
  assert.equal(copy.version, 1);
  exactKeys(copy.home, ['section', 'showroom_invitation'], 'Approved home copy');
  exactKeys(copy.home.section, Object.keys(manifest.before.home.showroom_section), 'Approved home section');
  assert.equal(copy.home.section.section_key, 'showroom');
  assert.equal(copy.home.section.cta_href, '/showroom-casablanca/');
  assert.equal(copy.home.showroom_invitation, '');
  exactKeys(copy.showroom, ['intro', 'sections', 'seo_title', 'meta_description'], 'Approved showroom copy');
  assert.deepEqual(copy.showroom.sections.map(row => row.section_key), ['advice', 'visit', 'faq_1', 'faq_2']);
  assert(copy.showroom.seo_title.length <= 90 && copy.showroom.meta_description.length <= 180);
  for (const row of [copy.home.section, ...copy.showroom.sections]) {
    assert(Object.values(row).every(value => typeof value === 'string' && !/[<>]/.test(value)), 'Copy may contain plain text only.');
    assert(row.heading?.trim() && row.text?.trim());
    if (row.cta_href) assert(['/showroom-casablanca/', '#showroom-contact'].includes(row.cta_href));
  }
  return manifest;
}

function published(response, collection, slug) {
  assertNoDraft(response?.item);
  assert(response.item?.type === collection && response.item.slug === slug && response.item.status === 'published' && response.item.id && typeof response._rev === 'string' && response._rev, `${collection}/${slug}: expected an existing published native entry.`);
}

function assertSchema(schema) {
  assertShowroomSchema(schema, 'pages');
  for (const [slug, type] of Object.entries({ intro: 'text', showroom_invitation: 'text', brand_image: 'image', brand_detail_image: 'image', showroom_image: 'image', hero_image: 'image', seo_title: 'string', meta_description: 'text' })) assert.equal(schema.fields.find(field => field.slug === slug)?.type, type, `pages.${slug}: incompatible field.`);
}

function section(data, key) {
  assert(Array.isArray(data.sections), 'Sections are missing or cleared; preserve the editor change.');
  const rows = data.sections.filter(row => row.section_key === key);
  assert.equal(rows.length, 1, `${key}: missing or duplicated section; preserve the editor change.`);
  return rows[0];
}

function textState(home, showroom, manifest, copy) {
  for (const key of ['brand', 'showroom']) assert(section(home, key).image == null, `${key}: a section image overrides the approved image; preserve the editor change.`);
  const homeText = { showroom_section: Object.fromEntries(Object.keys(manifest.before.home.showroom_section).map(key => [key, section(home, 'showroom')[key]])), showroom_invitation: home.showroom_invitation };
  const showroomText = { intro: showroom.intro, sections: showroom.sections?.map(withoutKey), seo_title: showroom.seo_title, meta_description: showroom.meta_description };
  const initial = isDeepStrictEqual(homeText, { showroom_section: manifest.before.home.showroom_section, showroom_invitation: manifest.before.home.showroom_invitation }) && isDeepStrictEqual(showroomText, Object.fromEntries(['intro', 'sections', 'seo_title', 'meta_description'].map(key => [key, manifest.before.showroom[key]])));
  const complete = isDeepStrictEqual(homeText, { showroom_section: copy.home.section, showroom_invitation: copy.home.showroom_invitation }) && isDeepStrictEqual(showroomText, copy.showroom);
  assert(initial || complete, 'Page copy differs from the exact initial or completed state. Preserve this edit/clear or partial migration; no overwrite was attempted.');
  return complete ? 'complete' : 'initial';
}

export async function assertImage(value, expected, readAsset, { source = false, filename = true } = {}) {
  assert(value?.provider === 'local' && typeof value.id === 'string' && value.id && typeof value.meta?.storageKey === 'string' && /^[a-zA-Z0-9._-]+$/.test(value.meta.storageKey), 'Expected an existing local native image.');
  for (const key of Object.keys(value)) assert(['provider', 'id', 'filename', 'alt', 'width', 'height', 'mimeType', 'meta', 'blurhash', 'dominantColor'].includes(key), `Image ${key} was customized; preserve the editor change.`);
  for (const key of ['width', 'height', 'mimeType', ...(source ? [] : ['alt']), ...(filename ? ['filename'] : [])]) assert.deepEqual(value[key], expected[key], `Image ${key} differs from the approved baseline/completed state.`);
  const bytes = await readAsset(mediaPath(value));
  assert(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= maxBytes && detectedMime(bytes) === 'image/jpeg', 'Native image bytes are invalid.');
  assert.equal(hash(bytes), expected.sha256, 'Native image bytes differ from the approved SHA-256.');
  if (expected.bytes != null) assert.equal(bytes.length, expected.bytes, 'Native image byte count differs.');
}

/** Read-only planning, including the bytes of every replaced/reused image. */
export async function prepareShowroomRefresh(api, manifest, copy, { readAsset }) {
  validateShowroomRefresh(manifest, copy);
  assert.equal(typeof readAsset, 'function', 'A read-only native media byte reader is required.');
  const schema = (await api(schemaPath)).item;
  assertSchema(schema);
  const home = await api(contentPath('home'));
  const showroom = await api(contentPath('showroom-casablanca'));
  const model = await api(modelPath);
  published(home, 'pages', 'home');
  published(showroom, 'pages', 'showroom-casablanca');
  published(model, 'models', 'skorpio');
  const state = textState(home.item.data, showroom.item.data, manifest, copy);
  const imageProofs = [];
  const verifyImage = async (value, expected, options = {}) => {
    await assertImage(value, expected, readAsset, options);
    imageProofs.push({ value: clone(value), expected: clone(expected), options });
  };
  const reused = {};
  for (const key of ['brand', 'detail']) {
    const asset = manifest.assets[key];
    const image = model.item.data.gallery?.[asset.gallery_index]?.image;
    await verifyImage(image, asset, { source: true });
    reused[key] = { ...clone(image), alt: asset.alt };
  }
  const homeValues = { sections: home.item.data.sections.map(row => row.section_key === 'showroom' ? { ...clone(row), ...clone(copy.home.section) } : clone(row)), showroom_invitation: copy.home.showroom_invitation, brand_image: reused.brand, brand_detail_image: reused.detail };
  const showroomValues = { ...clone(copy.showroom), sections: copy.showroom.sections.map(row => {
    const original = showroom.item.data.sections.find(before => before.section_key === row.section_key || (row.section_key === 'advice' && before.section_key === 'cities'));
    return { ...(original?._key == null ? {} : { _key: original._key }), ...clone(row) };
  }) };
  if (state === 'initial') {
    for (const key of ['brand_image', 'brand_detail_image', 'showroom_image']) await verifyImage(home.item.data[key], manifest.before.home[key]);
    await verifyImage(showroom.item.data.hero_image, manifest.before.showroom.hero_image);
  } else {
    for (const [field, key] of [['brand_image', 'brand'], ['brand_detail_image', 'detail']]) assert.deepEqual(home.item.data[field], reused[key], `Completed ${field} was edited or cleared.`);
    await verifyImage(home.item.data.showroom_image, manifest.assets.showroom, { filename: false });
    assert.deepEqual(showroom.item.data.hero_image, home.item.data.showroom_image, 'Completed showroom image references differ.');
  }
  const entries = [];
  for (const [slug, before, values] of [['home', home, homeValues], ['showroom-casablanca', showroom, showroomValues]]) entries.push({ collection: 'pages', slug, before, values: state === 'complete' ? {} : values, references: await readReferences(api, 'pages', before.item, schema.fields) });
  return { schemas: { pages: schema }, fields: [], entries, model, state, imageProofs, asset: clone(manifest.assets.showroom) };
}

async function recheck(api, plan) {
  assert.deepEqual((await api(schemaPath)).item, plan.schemas.pages, 'Pages schema changed; no write is permitted.');
  for (const entry of plan.entries) {
    const fresh = await api(contentPath(entry.slug));
    assertUnchangedEntry(fresh, entry.before, entry.slug);
    assert.deepEqual(fresh.item.data, entry.before.item.data, `${entry.slug}: content changed during preparation.`);
    assert.deepEqual(await readReferences(api, 'pages', fresh.item, plan.schemas.pages.fields), entry.references, `${entry.slug}: references changed.`);
  }
  const freshModel = await api(modelPath);
  assertUnchangedEntry(freshModel, plan.model, 'skorpio');
  assert.deepEqual(freshModel.item.data, plan.model.item.data, 'Skorpio source media/content changed.');
}

/** Injectable API/byte reader; tests never touch existing data or authentication. */
export async function applyShowroomRefresh(api, plan, { readAsset, beforeWrite, afterMedia = async () => {}, afterEntry = async () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before mutation.');
  if (plan.state === 'complete') return { completed: [], addedFields: [], schemas: plan.schemas, media: null };
  assert.equal(plan.state, 'initial');
  await recheck(api, plan);
  await beforeWrite(plan);
  const bytes = await readAsset(plan.asset.url);
  assert(Buffer.isBuffer(bytes) && bytes.length === plan.asset.bytes && bytes.length <= maxBytes && detectedMime(bytes) === 'image/jpeg', 'Press image bytes/type/size changed; no upload attempted.');
  assert.equal(hash(bytes), plan.asset.sha256, 'Press image SHA-256 changed; no upload attempted.');
  for (const proof of plan.imageProofs) await assertImage(proof.value, proof.expected, readAsset, proof.options);
  await recheck(api, plan);
  const form = new FormData();
  form.set('file', new File([bytes], plan.asset.filename, { type: 'image/jpeg' }));
  form.set('deduplicate', 'true');
  form.set('ensureUniqueFilename', 'true');
  const uploaded = await api('/_emdash/api/media', { method: 'POST', form });
  const item = uploaded.item;
  assert(item?.id && item.storageKey && item.size === plan.asset.bytes && item.mimeType === 'image/jpeg', 'Native upload did not return the approved image.');
  const media = { provider: 'local', id: item.id, filename: item.filename, mimeType: item.mimeType, width: item.width, height: item.height, alt: plan.asset.alt, meta: { storageKey: item.storageKey } };
  await assertImage(media, plan.asset, readAsset, { filename: false });
  await afterMedia({ item, deduplicated: Boolean(uploaded.deduplicated), sha256: plan.asset.sha256 });
  const ready = clone(plan);
  ready.entries.find(entry => entry.slug === 'home').values.showroom_image = media;
  ready.entries.find(entry => entry.slug === 'showroom-casablanca').values.hero_image = media;
  const checkedApi = async (path, options) => {
    if (options?.method === 'POST' && path.endsWith('/publish')) {
      const entry = ready.entries.find(entry => path === `${contentPath(entry.slug)}/publish`);
      assert(entry, 'Only the two approved pages may be published.');
      assert.deepEqual((await api(schemaPath)).item, ready.schemas.pages, 'Pages schema changed before publication.');
      const fresh = await api(contentPath(entry.slug));
      assert.equal(fresh._rev, options.data._rev, 'Saved revision changed before publication.');
      assertPreservedEntry(fresh, entry.before, entry.values, ready.schemas.pages.fields);
      assert.deepEqual(await readReferences(api, 'pages', fresh.item, ready.schemas.pages.fields), entry.references, 'References changed before publication.');
      const freshModel = await api(modelPath);
      assertUnchangedEntry(freshModel, plan.model, 'skorpio');
      assert.deepEqual(freshModel.item.data, plan.model.item.data, 'Skorpio changed before publication.');
    }
    return api(path, options);
  };
  const result = await applyShowroomLocation(checkedApi, ready, { beforeWrite: async () => {}, afterEntry });
  return { ...result, media: { id: item.id, deduplicated: Boolean(uploaded.deduplicated), sha256: plan.asset.sha256 } };
}

async function privateJson(path, value) {
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, path);
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => ['--apply', '--dry-run'].includes(flag)) && !(flags.includes('--apply') && flags.includes('--dry-run')), 'Use --dry-run (default) or --apply only.');
  const apply = flags.includes('--apply');
  const origin = new URL(process.env.EMDASH_BASE_URL || 'http://localhost:4321');
  assert(['http:', 'https:'].includes(origin.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash, 'Only a local development origin is allowed.');
  const manifest = JSON.parse(await readFile(join(root, 'content/showroom-refresh.json'), 'utf8'));
  const copy = JSON.parse(await readFile(join(root, 'content/showroom-editorial-copy.json'), 'utf8'));
  validateShowroomRefresh(manifest, copy);
  const auth = await authentication(origin);
  const api = async (path, { method = 'GET', data, form } = {}) => {
    assert(path.startsWith('/_emdash/api/') && !path.includes('..'), 'Invalid native API path.');
    assert(auth.expiresAt > Date.now(), 'Native access expired; renew through EmDash.');
    const response = await fetch(new URL(path, origin), { method, redirect: 'error', signal: AbortSignal.timeout(90000), headers: { ...auth.headers, Origin: origin.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) }, ...(form ? { body: form } : data === undefined ? {} : { body: JSON.stringify(data) }) });
    let body;
    try { body = await response.json(); } catch { throw new Error(`${method} ${path}: HTTP ${response.status}; expected native JSON.`); }
    assert(response.ok && body.success === true, `${method} ${path}: HTTP ${response.status}; native request failed.`);
    return body.data;
  };
  const readAsset = async path => {
    assert(path === sourceUrl || /^\/_emdash\/api\/media\/file\/[a-zA-Z0-9._%-]+$/.test(path), 'Unapproved asset URL.');
    // Public bytes never receive an administrator cookie, including the press host.
    const response = await fetch(new URL(path, origin), { redirect: 'error', signal: AbortSignal.timeout(90000), headers: { Accept: 'image/jpeg' } });
    assert(response.ok && response.body, `Image request failed: HTTP ${response.status}.`);
    assert(Number(response.headers.get('content-length') || 0) <= maxBytes, 'Image exceeds the import limit.');
    const chunks = []; let size = 0;
    for await (const chunk of response.body) { size += chunk.length; assert(size <= maxBytes, 'Image exceeds the import limit.'); chunks.push(Buffer.from(chunk)); }
    return Buffer.concat(chunks);
  };
  const plan = await prepareShowroomRefresh(api, manifest, copy, { readAsset });
  console.log(`${apply ? 'Apply' : 'Dry run'} 0009: ${plan.state === 'complete' ? 'already completed; no changes' : 'two published pages; two reused images; one new press photograph'}.`);
  if (!apply || plan.state === 'complete') { console.log('No CMS, media, authentication or local state was written.'); return; }
  const dir = join(root, '.wrangler/migrations');
  const lock = join(dir, '.0009-showroom-refresh.lock');
  await mkdir(dir, { recursive: true, mode: 0o700 });
  try { await mkdir(lock, { mode: 0o700 }); } catch (error) { if (error.code === 'EEXIST') throw new Error(`Another 0009 migration may be active; inspect its lock: ${lock}`); throw error; }
  const prefix = join(dir, `0009-showroom-refresh-${new Date().toISOString().replaceAll(/[:.]/g, '-')}`);
  const report = { migration: '0009-showroom-refresh', startedAt: new Date().toISOString(), manifestSha256: hash(JSON.stringify(manifest)), copySha256: hash(JSON.stringify(copy)), entries: [], media: [], complete: false };
  try {
    const result = await applyShowroomRefresh(api, plan, { readAsset, beforeWrite: snapshot => privateJson(`${prefix}-before.json`, snapshot), afterMedia: async item => { report.media.push(item); await privateJson(`${prefix}-after.json`, report); }, afterEntry: async entry => { report.entries.push(entry); await privateJson(`${prefix}-after.json`, report); } });
    Object.assign(report, { complete: true, finishedAt: new Date().toISOString(), completed: result.completed });
    await privateJson(`${prefix}-after.json`, report);
    console.log(`Migration 0009 complete. Private backup/report prefix: ${prefix}`);
  } catch (error) {
    Object.assign(report, { failedAt: new Date().toISOString(), error: error instanceof Error ? error.message : 'Migration failed' });
    await privateJson(`${prefix}-after.json`, report);
    console.error(`Stopped without deletion or rollback. An imported photograph or pending draft may remain; inspect: ${prefix}`);
    throw error;
  } finally { await rm(lock, { recursive: true }); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error instanceof Error ? error.message : 'Migration 0009 failed'); process.exitCode = 1; });
