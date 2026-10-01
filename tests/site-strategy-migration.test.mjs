import assert from 'node:assert/strict';
import test from 'node:test';
import { applySiteStrategy, loadManifest, menuOrder, planSiteStrategy, validateManifest } from '../scripts/migrations/0014-site-strategy-pages.mjs';

function fakeCms({ pages = [], options = ['home', 'collections', 'showroom', 'catalogue', 'journal'], modelFields = [] } = {}) {
  const state = {
    routeField: { slug: 'route_key', type: 'select', validation: { options: [...options] } },
    modelFields: [...modelFields],
    pages: pages.map(slug => ({ id: `id-${slug}`, slug, status: 'published', data: { title: 'Édité' } })),
    menu: ['/collections/', '/showroom-casablanca/', '/journal/', '/catalogue/'].map((customUrl, sortOrder) => ({ id: `m${sortOrder}`, parentId: null, sortOrder, customUrl, label: customUrl })),
    calls: [],
  };
  const api = async (path, { method = 'GET', data } = {}) => {
    state.calls.push(`${method} ${path.split('?')[0]}`);
    if (path.startsWith('/_emdash/api/schema/collections/pages?')) return { item: { fields: [state.routeField] } };
    if (path.startsWith('/_emdash/api/schema/collections/models?')) return { item: { fields: state.modelFields } };
    if (path === '/_emdash/api/schema/collections/pages/fields/route_key') { state.routeField.validation = data.validation; return {}; }
    if (path === '/_emdash/api/schema/collections/models/fields') { state.modelFields.push(data); return {}; }
    if (path.startsWith('/_emdash/api/content/pages?')) return { items: state.pages };
    if (path === '/_emdash/api/content/pages' && method === 'POST') { const item = { id: `id-${data.slug}`, slug: data.slug, status: 'draft', data: data.data }; state.pages.push(item); return { item }; }
    const publish = /\/content\/pages\/([^/]+)\/publish$/u.exec(path);
    if (publish) { state.pages.find(page => page.id === publish[1]).status = 'published'; return {}; }
    if (/\/content\/pages\/[^/]+$/u.test(path)) return { item: state.pages.find(page => path.endsWith(page.id)), _rev: 'rev' };
    if (path === '/_emdash/api/menus/primary') return { items: state.menu };
    if (path === '/_emdash/api/menus/primary/items') { const item = { id: `n${state.menu.length}`, parentId: null, sortOrder: state.menu.length, customUrl: data.customUrl, label: data.label }; state.menu.push(item); return item; }
    if (path === '/_emdash/api/menus/primary/reorder') { for (const { id, sortOrder } of data.items) state.menu.find(item => item.id === id).sortOrder = sortOrder; return {}; }
    throw new Error(`Unexpected ${method} ${path}`);
  };
  return { api, state };
}

test('the manifest names two pages, their route keys and menu entries', async () => {
  const manifest = await loadManifest();
  assert.deepEqual(manifest.pages.map(page => page.slug), ['sur-mesure', 'professionnels']);
  for (const page of manifest.pages) for (const text of [page.data.title, page.data.intro, ...page.data.sections.map(section => section.text)]) {
    assert.doesNotMatch(text, /prix|promotion|remise|!/iu, `${page.slug}: luxury codes`);
  }
  assert.throws(() => validateManifest({ ...manifest, menu: [{ label: 'FAQ', url: '/faq/' }] }), /without its page/u);
});

test('inserts new items after their anchors and keeps children', () => {
  const items = [{ id: 'a', customUrl: '/collections/', sortOrder: 0 }, { id: 'b', customUrl: '/showroom-casablanca/', sortOrder: 1 }, { id: 'c', customUrl: '/journal/', sortOrder: 2 }, { id: 'k', parentId: 'a', sortOrder: 0 }];
  const order = menuOrder(items, [{ item: { id: 's' }, after: '/collections/' }, { item: { id: 'p' }, after: '/showroom-casablanca/' }]);
  assert.deepEqual(order.filter(item => !item.parentId).map(item => item.id), ['a', 's', 'b', 'p', 'c']);
  assert.deepEqual(order.find(item => item.id === 'k'), { id: 'k', parentId: 'a', sortOrder: 0 });
});

test('applies once, publishes the pages and changes nothing on a second run', async () => {
  const manifest = await loadManifest();
  const { api, state } = fakeCms();
  const backups = [];
  await applySiteStrategy(api, await planSiteStrategy(api, manifest), { beforeWrite: plan => backups.push(plan) });
  assert.equal(backups.length, 1);
  assert.deepEqual(state.routeField.validation.options.slice(-2), ['sur-mesure', 'professionnels']);
  assert.equal(state.modelFields[0].slug, 'on_display');
  assert.deepEqual(state.pages.map(page => [page.slug, page.status]), [['sur-mesure', 'published'], ['professionnels', 'published']]);
  assert.deepEqual([...state.menu].sort((a, b) => a.sortOrder - b.sortOrder).map(item => item.customUrl), ['/collections/', '/sur-mesure/', '/showroom-casablanca/', '/professionnels/', '/journal/', '/catalogue/']);
  const second = await planSiteStrategy(api, manifest);
  assert.deepEqual([second.missingRoutes, second.addField, second.createPages, second.missingMenu], [[], null, [], []]);
});

test('never overwrites a page an editor already created', async () => {
  const { api, state } = fakeCms({ pages: ['sur-mesure'], options: ['home', 'sur-mesure'] });
  const plan = await planSiteStrategy(api, await loadManifest());
  assert.deepEqual(plan.keptPages, ['sur-mesure']);
  await applySiteStrategy(api, plan, { beforeWrite: () => {} });
  assert.equal(state.pages.find(page => page.slug === 'sur-mesure').data.title, 'Édité');
  assert(!state.calls.includes('PUT /_emdash/api/content/pages/id-sur-mesure'));
});

test('refuses a flag field of another type', async () => {
  const { api } = fakeCms({ modelFields: [{ slug: 'on_display', type: 'string' }] });
  await assert.rejects(planSiteStrategy(api, await loadManifest()), /another type/u);
});
