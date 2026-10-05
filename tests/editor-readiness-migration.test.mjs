import assert from 'node:assert/strict';
import test from 'node:test';
import { allEntries, applyEditorReadiness, planCollection, planEditorReadiness } from '../scripts/migrations/0025-editor-readiness.mjs';
import { PRIVACY_PAGE } from '../src/lib/privacy-content.mjs';
import { FOOTER_MENU } from '../src/lib/navigation-copy.mjs';

const clone = value => structuredClone(value);
function fixture({ existingFooter = false } = {}) {
  const current = { slug: 'site_content', label: 'Ancien', supports: ['drafts', 'revisions', 'seo', 'scheduling'], hasSeo: true, fields: [{ slug: 'title', type: 'string', label: 'Titre' }] };
  const desired = { ...clone(current), label: 'Réglages', group: 'Réglages du site', fields: [...clone(current.fields), { slug: 'new_note', type: 'text', label: 'Note' }] };
  const global = { item: { id: 'global-id', slug: 'global', status: 'published', draftRevisionId: 'draft-existing', data: { title: 'Un brouillon non publié', footer_valet_text: '', request_error: 'Erreur validée par le client' } }, _rev: 'rev-1' };
  const state = { schema: current, global, pages: [], footer: existingFooter ? { name: 'footer', label: 'Menu du client', items: [{ type: 'custom', label: 'Lien client', customUrl: '/client/' }] } : null, writes: [] };
  const api = async (path, options = {}) => {
    const { method = 'GET', data } = options;
    if (method !== 'GET') state.writes.push({ path, method, data: clone(data) });
    if (path === '/_emdash/api/schema/collections/site_content?includeFields=true') return { item: clone(state.schema) };
    if (path === '/_emdash/api/schema/collections/site_content' && method === 'PUT') { Object.assign(state.schema, data); return {}; }
    if (path === '/_emdash/api/schema/collections/site_content/fields' && method === 'POST') { state.schema.fields.push(clone(data)); return {}; }
    if (path.startsWith('/_emdash/api/content/site_content?')) return { items: [clone(state.global.item)] };
    if (path === '/_emdash/api/content/site_content/global-id') {
      if (method === 'PUT') { assert.equal(data._rev, state.global._rev); state.global.item.data = { ...state.global.item.data, ...clone(data.data) }; state.global._rev = 'rev-2'; }
      return clone(state.global);
    }
    if (path.startsWith('/_emdash/api/content/pages?')) return { items: clone(state.pages) };
    if (path === '/_emdash/api/content/pages' && method === 'POST') { state.pages.push({ id: 'privacy-id', ...clone(data), status: 'draft' }); return {}; }
    if (path === '/_emdash/api/content/pages/privacy-id') return { item: clone(state.pages[0]), _rev: 'privacy-rev' };
    if (path === '/_emdash/api/menus') {
      if (method === 'POST') state.footer = { ...clone(data), items: [] };
      return state.footer ? [clone(state.footer)] : [];
    }
    if (path === '/_emdash/api/menus/footer') { if (method === 'PUT') Object.assign(state.footer, data); return clone(state.footer); }
    if (path === '/_emdash/api/menus/footer/items' && method === 'POST') { state.footer.items.push(clone(data)); return {}; }
    throw new Error(`Unexpected ${method} ${path}`);
  };
  return { state, api, seed: { collections: [desired], content: { pages: [PRIVACY_PAGE] } } };
}

test('schema plan keeps unrelated capabilities and refuses destructive type changes', () => {
  const { state, seed } = fixture();
  const plan = planCollection(state.schema, seed.collections[0]);
  assert.deepEqual(plan.metadata.supports, ['drafts', 'revisions', 'scheduling']);
  assert.equal(plan.metadata.hasSeo, false);
  assert.equal(plan.fields[0].create.slug, 'new_note');
  assert.throws(() => planCollection(state.schema, { ...seed.collections[0], fields: [{ slug: 'title', type: 'text' }] }), /changed type/);
});

test('migration is additive, draft-only, backs up first and preserves an existing native footer', async () => {
  const { state, api, seed } = fixture({ existingFooter: true });
  const plan = await planEditorReadiness(api, seed);
  assert.equal(state.writes.length, 0);
  assert.equal(plan.additions.editorial_copy.footer_valet_text, '', 'Explicit optional clearing is preserved when consolidating copy');
  assert.equal(plan.additions.editorial_copy.request_error, 'Erreur validée par le client');
  await assert.rejects(applyEditorReadiness(api, plan), /backup writer/);
  let backup;
  await applyEditorReadiness(api, plan, { beforeWrite: value => { assert.equal(state.writes.length, 0); backup = clone(value); } });
  assert.equal(backup.global.item.data.title, 'Un brouillon non publié');
  assert.equal(state.global.item.data.title, 'Un brouillon non publié');
  assert.equal(state.global.item.draftRevisionId, 'draft-existing');
  assert.equal(state.global.item.data.editorial_copy.request_error, 'Erreur validée par le client');
  assert.equal(state.pages[0].status, 'draft');
  assert.equal(state.footer.label, 'Menu du client');
  assert(!state.writes.some(write => write.path.endsWith('/publish')));
  assert(!state.writes.some(write => write.path.includes('/menus')));
  const second = await planEditorReadiness(api, seed);
  assert.equal(Object.keys(second.additions).length, 0);
  assert.equal(second.privacy, null);
  assert.equal(second.collections[0].fields.length, 0);
});

test('a changed global revision aborts instead of overwriting an editor draft', async () => {
  const { state, api, seed } = fixture();
  const plan = await planEditorReadiness(api, seed);
  state.global._rev = 'concurrent-revision'; state.global.item.data.title = 'Travail récent';
  await assert.rejects(applyEditorReadiness(api, plan, { beforeWrite: () => {} }), /changed since planning/);
  assert.equal(state.global.item.data.title, 'Travail récent');
  assert(!state.writes.some(write => write.path === '/_emdash/api/content/site_content/global-id'));
});

test('an interrupted new footer resumes without duplicate links', async () => {
  const { state, api, seed } = fixture();
  const plan = await planEditorReadiness(api, seed);
  let count = 0;
  const failing = async (path, options) => {
    if (path === '/_emdash/api/menus/footer/items' && ++count === 3) throw new Error('Network interruption');
    return api(path, options);
  };
  await assert.rejects(applyEditorReadiness(failing, plan, { beforeWrite: () => {} }), /Network interruption/);
  assert.equal(state.footer.items.length, 2);
  const resume = await planEditorReadiness(api, seed);
  assert.equal(resume.resumeFooter, true);
  await applyEditorReadiness(api, resume, { beforeWrite: () => {} });
  assert.equal(state.footer.items.length, FOOTER_MENU.items.length);
  assert.equal(state.footer.label, FOOTER_MENU.label);
});

test('pagination walks all pages and rejects repeated cursors', async () => {
  let count = 0;
  const all = await allEntries(async () => ++count === 1 ? { items: [{ id: 'a' }], nextCursor: 'second' } : { items: [{ id: 'b' }] }, 'pages');
  assert.deepEqual(all.map(item => item.id), ['a', 'b']);
  await assert.rejects(allEntries(async () => ({ items: [], nextCursor: 'same' }), 'pages'), /repeated pagination cursor/);
});

test('existing required flags remain unchanged because the native API cannot safely migrate them', () => {
  const current = { slug: 'catalogues', fields: [{ slug: 'download_label', type: 'string', label: 'Télécharger', required: false }] };
  const desired = { ...current, fields: [{ ...current.fields[0], required: true }] };
  assert.equal(planCollection(current, desired).fields.length, 0);
});

test('a failed backup prevents every schema and content mutation', async () => {
  const { state, api, seed } = fixture();
  const plan = await planEditorReadiness(api, seed);
  await assert.rejects(applyEditorReadiness(api, plan, { beforeWrite: () => { throw new Error('Disk full'); } }), /Disk full/);
  assert.equal(state.writes.length, 0);
});
