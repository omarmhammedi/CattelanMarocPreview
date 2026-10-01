import assert from 'node:assert/strict';
import test from 'node:test';
import { applyAdditions, loadManifest, planAdditions, validateManifest } from '../scripts/migrations/0018-collection-additions.mjs';

const modelFields = { title: 'string', description: 'text', image: 'image', gallery: 'repeater', content: 'portableText', dimensions: 'repeater', drawings: 'repeater', finishes: 'repeater', technical_sheet: 'file', technical_sheet_label: 'string', availability_note: 'text' };
const familyFields = { title: 'string', short_title: 'string', card_text: 'text', intro: 'text', image: 'image', image_caption: 'string', content: 'portableText', sort_order: 'integer', models: 'reference', seo_title: 'string', meta_description: 'text' };
const existingFamilies = { tables: ['skorpio', 'napoleon-keramik'], 'chaises-tabourets': ['rhonda', 'greta'], 'canapes-fauteuils': ['ruby', 'ruby-lounge'], 'buffets-bibliotheques': ['chelsea', 'airport'], luminaires: ['bloom'] };

function fakeCms({ models = [] } = {}) {
  const state = {
    models: [...Object.values(existingFamilies).flat(), ...models].map(slug => ({ id: `models-${slug}`, slug, status: 'published', data: { title: 'Édité' } })),
    families: Object.keys(existingFamilies).map(slug => ({ id: `families-${slug}`, slug, status: 'published', data: { title: slug } })),
    links: Object.fromEntries(Object.entries(existingFamilies).map(([slug, list]) => [`families-${slug}`, list.map(model => `models-${model}`)])),
    media: 0,
  };
  const fields = { models: modelFields, families: familyFields };
  const api = async (path, { method = 'GET', data, form } = {}) => {
    const schema = /^\/_emdash\/api\/schema\/collections\/(models|families)\?/u.exec(path);
    if (schema) return { item: { fields: Object.entries(fields[schema[1]]).map(([slug, type]) => ({ slug, type })) } };
    if (path === '/_emdash/api/media') { const file = form.get('file'); state.media += 1; return { item: { id: `m${state.media}`, storageKey: `k${state.media}`, filename: file.name, mimeType: file.type, size: file.size, width: 100, height: 100 } }; }
    const refs = /families\/([^/]+)\/references\/family_models\/children/u.exec(path);
    if (refs) return { children: state.links[refs[1]].map(id => ({ id, collection: 'models' })) };
    const list = /^\/_emdash\/api\/content\/(models|families)\?/u.exec(path);
    if (list) return { items: state[list[1]] };
    if (path === '/_emdash/api/content/models' && method === 'POST') { const item = { id: `models-${data.slug}`, slug: data.slug, status: 'draft', data: data.data }; state.models.push(item); return { item }; }
    const publish = /content\/(models|families)\/([^/]+)\/publish$/u.exec(path);
    if (publish) { state[publish[1]].find(item => item.id === publish[2]).status = 'published'; return {}; }
    const one = /content\/(models|families)\/([^/?]+)$/u.exec(path);
    if (one && method === 'PUT') { assert.deepEqual(data.data, state.families.find(item => item.id === one[2]).data, 'family fields untouched'); state.links[one[2]] = data.references.models; return {}; }
    if (one) return { item: state[one[1]].find(item => item.id === one[2]), _rev: 'rev' };
    throw new Error(`Unexpected ${method} ${path}`);
  };
  return { api, state };
}

test('the manifest places fifteen models, each with photos, finishes and a sheet', async () => {
  const manifest = await loadManifest();
  assert.equal(manifest.models.length, 15);
  assert.deepEqual(manifest.additions.tables, ['butterfly', 'butterfly-keramik', 'tyron-keramik']);
  for (const model of manifest.models) assert(model.finishes.length && model.drawings.length && model.gallery.length, model.slug);
  for (const text of manifest.models.flatMap(model => [model.description, ...model.paragraphs])) assert.doesNotMatch(text, /prix|promotion|remise|!/iu, text);
  const sofa = manifest.models.find(model => model.slug === 'craig');
  assert.equal(sofa.finishes.length, 280);
  assert(sofa.finishes.some(finish => finish.material_group === 'Tissu Canapé' && finish.material === 'T60'));
  assert.throws(() => validateManifest({ ...manifest, additions: { ...manifest.additions, luminaires: ['paris'] } }), /exactly one family/u);
});

test('creates the models and appends them after each family’s current selection', async () => {
  const manifest = await loadManifest();
  const { api, state } = fakeCms();
  await applyAdditions(api, manifest, await planAdditions(api, manifest), { beforeWrite: () => {} });
  assert.deepEqual(state.links['families-tables'], ['models-skorpio', 'models-napoleon-keramik', 'models-butterfly', 'models-butterfly-keramik', 'models-tyron-keramik']);
  assert.equal(state.links['families-luminaires'].length, 4);
  assert(state.families.every(item => item.status === 'published'));
  const second = await planAdditions(api, manifest);
  assert.deepEqual([second.createModels, second.links], [[], []]);
});

test('keeps a model an editor already created and links it once', async () => {
  const manifest = await loadManifest();
  const { api, state } = fakeCms({ models: ['paris'] });
  const plan = await planAdditions(api, manifest);
  assert.deepEqual(plan.keptModels, ['paris']);
  await applyAdditions(api, manifest, plan, { beforeWrite: () => {} });
  assert.equal(state.models.find(item => item.slug === 'paris').data.title, 'Édité');
  assert.equal(state.links['families-luminaires'].filter(id => id === 'models-paris').length, 1);
});
