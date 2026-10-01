/**
 * Site plan, new families: Tables basses and Consoles & miroirs, with their models and
 * photos, dimensions, finishes and product sheets (content/new-families.json, files in
 * content/media/new-families). Native APIs
 * only; additive. An entry that already exists is kept as it is, so a re-run changes nothing.
 *
 *   EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0016-new-families.mjs [--apply]
 *   EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0016-new-families.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const migration = '0016-new-families';
const maxBytes = 4 * 1024 * 1024;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export function validateManifest(manifest) {
  assert.equal(manifest.version, 1);
  assert(manifest.mediaDir && manifest.availability_note);
  const models = new Set();
  const files = [];
  const picture = (value, label, { alt = true } = {}) => {
    assert(value?.file && /^[a-z0-9_-]+\.(?:jpg|png)$/u.test(value.file), `${label}: a .jpg or .png file name is required.`);
    if (alt) assert(value.alt?.trim() && value.alt.length <= 200, `${label}: alt text is required.`);
    files.push(value.file);
  };
  for (const model of manifest.models) {
    assert(slugPattern.test(model.slug) && !models.has(model.slug), `${model.slug}: invalid or repeated slug.`);
    models.add(model.slug);
    assert(model.title && model.description && model.description.length <= 300, `${model.slug}: title and a description of 300 characters at most are required.`);
    assert(model.paragraphs.length > 0, `${model.slug}: at least one paragraph.`);
    picture(model.image, model.slug);
    model.gallery.forEach((item, index) => picture(item, `${model.slug} gallery ${index + 1}`));
    for (const [label, value] of model.dimensions) assert(label && value, `${model.slug}: empty dimension.`);
    // The finish name doubles as the swatch alt text.
    for (const finish of model.finishes) { assert(finish.material && finish.name, `${model.slug}: incomplete finish.`); picture(finish, `${model.slug} ${finish.name}`, { alt: false }); }
    for (const drawing of model.drawings) picture(drawing, `${model.slug} drawing`, { alt: false });
    assert(/^[a-z0-9-]+\.pdf$/u.test(model.technical_sheet.file), `${model.slug}: a PDF technical sheet is required.`);
    files.push(model.technical_sheet.file);
  }
  const families = new Set();
  for (const family of manifest.families) {
    assert(slugPattern.test(family.slug) && !families.has(family.slug), `${family.slug}: invalid or repeated slug.`);
    families.add(family.slug);
    assert(family.title && family.short_title && Number.isInteger(family.sort_order), `${family.slug}: title, short title and order are required.`);
    // Limits of the families schema, as for pages; the CMS refuses longer values.
    assert(family.seo_title.length <= 90 && family.meta_description.length <= 180, `${family.slug}: SEO text too long.`);
    picture(family.image, family.slug);
    for (const slug of family.models) assert(models.has(slug), `${family.slug}: unknown model ${slug}.`);
  }
  return { ...manifest, files: [...new Set(files)] };
}

function mimeOf(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes.subarray(0, 4).toString('latin1') === '\x89PNG') return 'image/png';
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  return null;
}

export async function loadManifest() {
  const manifest = validateManifest(JSON.parse(await readFile(join(root, 'content/new-families.json'), 'utf8')));
  const assets = {};
  for (const file of manifest.files) {
    const bytes = await readFile(join(root, manifest.mediaDir, file));
    const mimeType = mimeOf(bytes);
    assert(bytes.length > 0 && bytes.length <= maxBytes && mimeType === { jpg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' }[file.split('.').pop()], `${file}: a JPEG, PNG or PDF of 4 MB at most, matching its extension, is required.`);
    assets[file] = { bytes, mimeType, sha256: createHash('sha256').update(bytes).digest('hex') };
  }
  return { ...manifest, assets };
}

/** Portable Text from plain paragraphs, with stable keys so a re-run compares equal. */
export function portableText(slug, paragraphs, headings = []) {
  return paragraphs.flatMap((text, index) => [
    ...(headings[index] ? [{ _type: 'block', _key: `${slug}-h${index}`, style: 'h2', markDefs: [], children: [{ _type: 'span', _key: `${slug}-h${index}s`, text: headings[index], marks: [] }] }] : []),
    { _type: 'block', _key: `${slug}-p${index}`, style: 'normal', markDefs: [], children: [{ _type: 'span', _key: `${slug}-p${index}s`, text, marks: [] }] },
  ]);
}

export async function planNewFamilies(api, manifest) {
  for (const collection of ['models', 'families']) {
    const schema = (await api(`/_emdash/api/schema/collections/${collection}?includeFields=true`)).item;
    const fields = new Map(schema.fields.map(field => [field.slug, field]));
    const expected = collection === 'models'
      ? { title: 'string', description: 'text', image: 'image', gallery: 'repeater', content: 'portableText', dimensions: 'repeater', drawings: 'repeater', finishes: 'repeater', technical_sheet: 'file', technical_sheet_label: 'string', availability_note: 'text' }
      : { title: 'string', short_title: 'string', card_text: 'text', intro: 'text', image: 'image', image_caption: 'string', content: 'portableText', sort_order: 'integer', models: 'reference', seo_title: 'string', meta_description: 'text' };
    for (const [slug, type] of Object.entries(expected)) assert.equal(fields.get(slug)?.type, type, `${collection}.${slug} must be a ${type} field.`);
  }
  const existing = async collection => new Map(((await api(`/_emdash/api/content/${collection}?limit=100`)).items || []).map(item => [item.slug, item]));
  const models = await existing('models');
  const families = await existing('families');
  return {
    createModels: manifest.models.filter(model => !models.has(model.slug)),
    keptModels: manifest.models.filter(model => models.has(model.slug)).map(model => model.slug),
    modelIds: Object.fromEntries([...models].map(([slug, item]) => [slug, item.id])),
    createFamilies: manifest.families.filter(family => !families.has(family.slug)),
    keptFamilies: manifest.families.filter(family => families.has(family.slug)).map(family => family.slug),
  };
}

export async function applyNewFamilies(api, manifest, plan, { beforeWrite, log = () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  await beforeWrite({ plan: { ...plan, createModels: plan.createModels.map(model => model.slug), createFamilies: plan.createFamilies.map(family => family.slug) } });
  const uploaded = new Map();
  const upload = async (file, filename = file) => {
    if (!uploaded.has(file)) {
      const { bytes, mimeType } = manifest.assets[file];
      const form = new FormData();
      form.set('file', new File([bytes], filename, { type: mimeType }));
      form.set('deduplicate', 'true');
      const { item } = await api('/_emdash/api/media', { method: 'POST', form });
      assert(item?.id && item.storageKey && item.size === bytes.length && item.mimeType === mimeType, `${file}: the upload did not return the file.`);
      uploaded.set(file, item);
    }
    return uploaded.get(file);
  };
  const media = async ({ file, alt }) => {
    const item = await upload(file);
    return { provider: 'local', id: item.id, filename: item.filename, mimeType: item.mimeType, width: item.width, height: item.height, alt, meta: { storageKey: item.storageKey } };
  };
  const document = async ({ file, filename }) => {
    const item = await upload(file, filename);
    // Native 0.41 drops a top-level file size; keep it in provider metadata, as migration 0003 does.
    return { provider: 'local', id: item.id, filename: item.filename, mimeType: item.mimeType, meta: { storageKey: item.storageKey, size: item.size } };
  };
  const publish = async (collection, data) => {
    const created = await api(`/_emdash/api/content/${collection}`, { method: 'POST', data });
    const draft = await api(`/_emdash/api/content/${collection}/${encodeURIComponent(created.item.id)}`);
    await api(`/_emdash/api/content/${collection}/${encodeURIComponent(created.item.id)}/publish`, { method: 'POST', data: { _rev: draft._rev } });
    return created.item.id;
  };
  const ids = { ...plan.modelIds };
  for (const model of plan.createModels) {
    ids[model.slug] = await publish('models', { slug: model.slug, data: {
      title: model.title,
      description: model.description,
      image: await media(model.image),
      gallery: await Promise.all(model.gallery.map(async item => ({ image: await media(item), caption: '' }))),
      content: portableText(model.slug, model.paragraphs),
      dimensions: model.dimensions.map(([label, value]) => ({ label, value: `${value} cm` })),
      drawings: await Promise.all(model.drawings.map(async (drawing, index) => ({ label: drawing.label, row: 1, column: index, image: await media({ file: drawing.file, alt: `${model.title} — dimensions` }) }))),
      finishes: await Promise.all(model.finishes.map(async finish => ({ group: finish.group, material_group: '', material: finish.material, name: finish.name, code: finish.code, image: await media({ file: finish.file, alt: finish.name }) }))),
      technical_sheet: await document(model.technical_sheet),
      technical_sheet_label: 'Télécharger la fiche technique',
      availability_note: manifest.availability_note,
    } });
    log(`models/${model.slug} created and published (${1 + model.gallery.length} photos, ${model.finishes.length} finishes)`);
  }
  for (const family of plan.createFamilies) {
    await publish('families', {
      slug: family.slug,
      data: {
        title: family.title, short_title: family.short_title, card_text: family.card_text, intro: family.intro,
        image: await media(family.image), image_caption: family.image_caption,
        content: portableText(family.slug, family.sections.map(([, text]) => text), family.sections.map(([heading]) => heading)),
        sort_order: family.sort_order, seo_title: family.seo_title, meta_description: family.meta_description,
      },
      references: { models: family.models.map(slug => { assert(ids[slug], `${family.slug}: model ${slug} is missing.`); return ids[slug]; }) },
    });
    log(`families/${family.slug} created and published with ${family.models.length} models`);
  }
}

const allowedPaths = /^\/_emdash\/api\/(?:content\/(?:models|families)|schema\/collections\/(?:models|families)|media)(?:[/?]|$)/u;

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const manifest = await loadManifest(), api = await authenticatedApi(origin, allowedPaths);
  const plan = await planNewFamilies(api, manifest);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    createModels: plan.createModels.map(model => model.slug), keptModels: plan.keptModels,
    createFamilies: plan.createFamilies.map(family => family.slug), keptFamilies: plan.keptFamilies }));
  if (!flags.includes('--apply')) return;
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await applyNewFamilies(api, manifest, plan, {
    beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }),
    log: message => console.log(message),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
