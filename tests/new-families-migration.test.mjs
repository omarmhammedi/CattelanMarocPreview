import assert from 'node:assert/strict';
import test from 'node:test';
import { applyNewFamilies, loadManifest, planNewFamilies, portableText, validateManifest } from '../scripts/migrations/0016-new-families.mjs';

const modelFields = { title: 'string', description: 'text', image: 'image', gallery: 'repeater', content: 'portableText', availability_note: 'text' };
const familyFields = { title: 'string', short_title: 'string', card_text: 'text', intro: 'text', image: 'image', image_caption: 'string', content: 'portableText', sort_order: 'integer', models: 'reference', seo_title: 'string', meta_description: 'text' };

function fakeCms({ models = [], families = [] } = {}) {
  const state = {
    entries: { models: models.map(slug => ({ id: `models-${slug}`, slug, status: 'published', data: { title: 'Édité' } })), families: families.map(slug => ({ id: `families-${slug}`, slug, status: 'published', data: { title: 'Édité' } })) },
    media: [], references: {}, calls: [],
  };
  const fields = { models: modelFields, families: familyFields };
  const api = async (path, { method = 'GET', data, form } = {}) => {
    state.calls.push(`${method} ${path.split('?')[0]}`);
    const schema = /^\/_emdash\/api\/schema\/collections\/(models|families)\?/u.exec(path);
    if (schema) return { item: { fields: Object.entries(fields[schema[1]]).map(([slug, type]) => ({ slug, type })) } };
    if (path === '/_emdash/api/media' && method === 'POST') {
      const file = form.get('file');
      const item = { id: `media-${state.media.length}`, storageKey: `k${state.media.length}.jpg`, filename: file.name, mimeType: file.type, size: file.size, width: 2400, height: 1470 };
      state.media.push(item);
      return { item };
    }
    const list = /^\/_emdash\/api\/content\/(models|families)\?/u.exec(path);
    if (list) return { items: state.entries[list[1]] };
    const create = /^\/_emdash\/api\/content\/(models|families)$/u.exec(path);
    if (create && method === 'POST') {
      const item = { id: `${create[1]}-${data.slug}`, slug: data.slug, status: 'draft', data: data.data };
      state.entries[create[1]].push(item);
      if (data.references) state.references[data.slug] = data.references;
      return { item };
    }
    const publish = /\/content\/(models|families)\/([^/]+)\/publish$/u.exec(path);
    if (publish) { state.entries[publish[1]].find(item => item.id === publish[2]).status = 'published'; return {}; }
    const read = /\/content\/(models|families)\/([^/]+)$/u.exec(path);
    if (read) return { item: state.entries[read[1]].find(item => item.id === read[2]), _rev: 'rev' };
    throw new Error(`Unexpected ${method} ${path}`);
  };
  return { api, state };
}

test('the manifest holds the two families, their models and an existing photo for each', async () => {
  const manifest = await loadManifest();
  assert.deepEqual(manifest.families.map(family => [family.slug, family.models]), [
    ['tables-basses', ['arena', 'albert-keramik', 'adrian-wood', 'dodo']],
    ['consoles-miroirs', ['westin', 'nettuno', 'cosmos', 'glenn']],
  ]);
  for (const file of manifest.files) assert(manifest.assets[file].bytes.length > 50_000, `${file}: missing or too small`);
  const texts = [...manifest.models.flatMap(model => [model.description, ...model.paragraphs]), ...manifest.families.flatMap(family => [family.intro, family.card_text, ...family.sections.flat()])];
  for (const text of texts) assert.doesNotMatch(text, /prix|promotion|remise|!|officiel/iu, `luxury codes: ${text}`);
  assert.throws(() => validateManifest({ ...manifest, families: [{ ...manifest.families[0], models: ['rado-keramik'] }] }), /unknown model/u);
});

test('creates and publishes the models, then the families with their selection in order', async () => {
  const manifest = await loadManifest();
  const { api, state } = fakeCms();
  const backups = [];
  await applyNewFamilies(api, manifest, await planNewFamilies(api, manifest), { beforeWrite: value => backups.push(value) });
  assert.equal(backups.length, 1);
  assert(state.entries.models.every(item => item.status === 'published') && state.entries.families.every(item => item.status === 'published'));
  assert.equal(state.entries.models.length, 8);
  assert.deepEqual(state.references['tables-basses'].models, ['models-arena', 'models-albert-keramik', 'models-adrian-wood', 'models-dodo']);
  assert.equal(state.media.length, manifest.files.length, 'each photo is uploaded once');
  const arena = state.entries.models.find(item => item.slug === 'arena').data;
  assert.equal(arena.image.alt, manifest.models[0].image.alt);
  assert.equal(arena.gallery.length, 6);
  assert.equal(arena.content[0].children[0].text, manifest.models[0].paragraphs[0]);
  const second = await planNewFamilies(api, manifest);
  assert.deepEqual([second.createModels, second.createFamilies], [[], []]);
});

test('keeps an entry an editor already created and still links it', async () => {
  const manifest = await loadManifest();
  const { api, state } = fakeCms({ models: ['arena'] });
  const plan = await planNewFamilies(api, manifest);
  assert.deepEqual(plan.keptModels, ['arena']);
  await applyNewFamilies(api, manifest, plan, { beforeWrite: () => {} });
  assert.equal(state.entries.models.find(item => item.slug === 'arena').data.title, 'Édité');
  assert.equal(state.references['tables-basses'].models[0], 'models-arena');
});

test('family text becomes headed paragraphs with stable keys', () => {
  assert.deepEqual(portableText('x', ['Un.'], ['Titre']).map(block => [block._key, block.style]), [['x-h0', 'h2'], ['x-p0', 'normal']]);
});
