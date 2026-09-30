import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyRefresh, loadRefresh, planCopy, prepareRefresh, validateRefresh,
} from '../scripts/migrations/0010-editorial-refresh.mjs';

// Deliberately in memory: this suite never opens a database, authenticates or fetches.
const clone = value => structuredClone(value);
const menuPatch = { name: 'primary', url: '/catalogue/', beforeLabel: 'Recevoir le catalogue', afterLabel: 'Catalogue' };
const paragraph = text => ({ _type: 'block', _key: 'paragraph-one', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'span-one', text, marks: [] }] });
const sampleEntries = [
  {
    collection: 'models', slug: 'skorpio',
    before: { description: 'Ancienne description.', content: [paragraph('Ancien détail.')] },
    after: { description: 'Un plateau en verre et une base en acier.', content: [paragraph('Le détail utile.')] },
    seoBefore: { title: 'Ancien titre SEO', description: 'Ancienne description SEO' },
    seoAfter: { title: 'Skorpio : verre et acier', description: 'Dimensions et finitions de Skorpio.' },
  },
  {
    collection: 'posts', slug: 'choisir-une-table',
    before: { excerpt: 'Ancien chapeau.', cta_text: 'Préparez votre projet.', cta_label: 'Recevoir le catalogue', cta_href: '/catalogue/' },
    after: { excerpt: 'La place pour les chaises et les passages.', cta_text: '', cta_label: 'Voir les tables', cta_href: '/collections/tables/' },
  },
];

function fixture(manifest = sampleEntries) {
  const entries = clone(manifest);
  const state = { entries: {}, schemas: {}, references: {}, reads: [], writes: [], serial: 0, onWrite: null };
  for (const e of entries) {
    const key = `${e.collection}/${e.slug}`;
    state.entries[key] = {
      _rev: `original-${e.slug}`,
      item: {
        id: `id-${e.slug}`, type: e.collection, slug: e.slug, status: 'published',
        liveRevisionId: `live-${e.slug}`, draftRevisionId: `live-${e.slug}`,
        authorId: 'existing-editor', primaryBylineId: 'original-byline', bylines: [{ id: 'original-byline', roleLabel: 'Rédaction' }],
        createdAt: '2026-09-01T10:00:00Z', publishedAt: '2026-09-02T10:00:00Z', locale: 'fr', translationGroup: `group-${e.slug}`,
        seo: { title: null, description: null, image: 'keep-seo-image', canonical: 'https://example.test/original/', noIndex: true, ...e.seoBefore },
        data: {
          title: 'Titre conservé', image_caption: 'Photographie provisoire.', custom_editor_field: 'Valeur indépendante à conserver',
          image: { provider: 'local', id: 'keep-image', filename: 'original.jpg', mimeType: 'image/jpeg', alt: 'Légende existante', meta: { storageKey: 'original.jpg' } },
          ...clone(e.before),
        },
      },
    };
    const fields = Object.keys(e.after).map(slug => ({ slug, type: slug === 'content' ? 'portableText' : ['sections', 'sources'].includes(slug) ? 'repeater' : 'text' }));
    state.schemas[e.collection] ||= { slug: e.collection, supports: ['drafts', 'revisions', 'seo'], fields: [
      { slug: 'title', type: 'string', required: true }, { slug: 'image', type: 'image' },
      { slug: 'related', type: 'reference', validation: { relation: 'copy_links', relationSide: 'parent' } },
    ] };
    for (const field of fields) if (!state.schemas[e.collection].fields.some(f => f.slug === field.slug)) state.schemas[e.collection].fields.push(field);
    state.references[`id-${e.slug}`] = [
      { id: 'related-a', collection: 'families', locale: 'fr', translationGroup: 'family-a', sortOrder: 0 },
      { id: 'related-b', collection: 'families', locale: 'fr', translationGroup: 'family-b', sortOrder: 1 },
    ];
  }
  state.menu = { id: 'existing-menu', name: 'primary', description: 'Navigation conservée', updatedAt: 'original-update', items: [
    { id: 'menu-collections', customUrl: '/collections/', label: 'Collections', parentId: null, sortOrder: 0, target: '_self' },
    { id: 'menu-catalogue', customUrl: '/catalogue/', label: menuPatch.beforeLabel, parentId: null, sortOrder: 1, target: '_self' },
    { id: 'menu-journal', customUrl: '/journal/', label: 'Journal', parentId: null, sortOrder: 2, target: '_self' },
  ] };
  const api = async (path, { method = 'GET', data } = {}) => {
    const call = { path, method, ...(data ? { data: clone(data) } : {}) };
    if (method === 'GET') state.reads.push(path);
    const schema = path.match(/^\/_emdash\/api\/schema\/collections\/([a-z_]+)\?includeFields=true$/);
    if (schema) { assert.equal(method, 'GET'); assert(state.schemas[schema[1]]); return { item: clone(state.schemas[schema[1]]) }; }
    const ref = path.match(/^\/_emdash\/api\/content\/[a-z_]+\/(id-[a-z-]+)\/references\/copy_links\/children\?limit=100$/);
    if (ref) { assert.equal(method, 'GET'); assert(state.references[ref[1]]); return { children: clone(state.references[ref[1]]) }; }
    if (path === '/_emdash/api/menus/primary') { assert.equal(method, 'GET'); return clone(state.menu); }
    if (path.startsWith('/_emdash/api/menus/primary/items/')) {
      assert.equal(method, 'PUT'); assert.deepEqual(Object.keys(data), ['label']);
      const item = state.menu.items.find(item => item.id === decodeURIComponent(path.split('/').at(-1)));
      assert(item); item.label = data.label; state.menu.updatedAt = `menu-update-${++state.serial}`;
      state.writes.push(call); const result = clone(item); await state.onWrite?.(call, state); return result;
    }
    const match = path.match(/^\/_emdash\/api\/content\/([a-z_]+)\/([a-z-]+)(\/publish)?$/);
    assert(match, `Unexpected API path: ${method} ${path}`);
    const entry = state.entries[`${match[1]}/${match[2]}`]; assert(entry);
    if (method === 'GET') { assert(!match[3]); return clone(entry); }
    assert.equal(data._rev, entry._rev, 'Native optimistic revision guard');
    if (method === 'PUT') {
      assert(!match[3]); assert.deepEqual(Object.keys(data).sort(), ['_rev', 'data', ...('seo' in data ? ['seo'] : [])].sort());
      entry.item.data = { ...entry.item.data, ...clone(data.data) };
      if (data.seo) entry.item.seo = { ...entry.item.seo, ...clone(data.seo) };
      entry._rev = `saved-${++state.serial}`; entry.item.draftRevisionId = entry._rev;
    } else {
      assert.equal(method, 'POST'); assert(match[3]); assert.deepEqual(Object.keys(data), ['_rev']);
      entry.item.status = 'published'; entry.item.liveRevisionId = entry.item.draftRevisionId;
    }
    state.writes.push(call); const result = clone(entry); await state.onWrite?.(call, state); return result;
  };
  return { entries, state, api, prepare: () => prepareRefresh(api, entries, clone(menuPatch)), apply: (plan, hooks) => applyRefresh(api, plan, hooks) };
}

test('versioned refresh manifests are valid and keep the five Journal routes', async () => {
  const manifest = await loadRefresh();
  assert.equal(validateRefresh(manifest.entries, manifest.menu).entries, manifest.entries);
  assert.equal(manifest.entries.filter(e => e.collection === 'posts').length, 5);
  assert.equal(manifest.entries.filter(e => e.collection === 'families').length, 6);
  assert.equal(manifest.entries.filter(e => e.collection === 'models').length, 11);
  assert(manifest.entries.some(e => e.collection === 'pages' && e.slug === 'journal'));
});

test('manifest rejects unsupported fields, media, duplicate identities and unsafe destinations', () => {
  const invalid = [
    entries => { entries.push(clone(entries[0])); },
    entries => { entries[0].collection = 'users'; },
    entries => { entries[0].slug = '../another'; },
    entries => { entries[0].before.image = 'old'; entries[0].after.image = 'new'; },
    entries => { entries[0].after.content[0]._type = 'html'; },
    entries => { entries[0].after.content.push(clone(entries[0].after.content[0])); },
    entries => { entries[0].after.content[0].children[0].marks = ['undefined-link']; },
    entries => { entries[0].seoAfter.canonical = 'https://example.test/'; },
    entries => { entries[0].unexpected = true; },
    entries => { entries[1].after.cta_href = 'javascript:alert(1)'; },
    entries => { entries[1].after.cta_href = '//other.example/'; },
    entries => { entries[1].after.cta_href = '/%2f%2fother.example'; },
    entries => { entries[1].after.cta_href = 'https://other.example/'; },
  ];
  for (const change of invalid) { const entries = clone(sampleEntries); change(entries); assert.throws(() => validateRefresh(entries, clone(menuPatch))); }
  for (const change of [menu => { menu.name = 'footer'; }, menu => { menu.url = '/showroom-casablanca/'; }, menu => { menu.afterLabel = 'Other'; }]) {
    const menu = clone(menuPatch); change(menu); assert.throws(() => validateRefresh(clone(sampleEntries), menu));
  }
});

test('planning recognizes only exact initial or completed text and SEO, never a clear or partial edit', () => {
  const f = fixture(); const entry = f.entries[0], response = f.state.entries['models/skorpio']; const original = clone(response);
  assert.equal(planCopy(response, entry), true); assert.deepEqual(response, original);
  const complete = clone(response); complete.item.data = { ...complete.item.data, ...clone(entry.after) }; complete.item.seo = { ...complete.item.seo, ...entry.seoAfter };
  assert.equal(planCopy(complete, entry), false);
  for (const change of [
    r => { r.item.data.description = ''; }, r => { r.item.data.description = 'Editor copy'; },
    r => { r.item.data.description = entry.after.description; }, r => { r.item.seo.title = entry.seoAfter.title; },
    r => { r.item.seo.description = ''; },
  ]) { const changed = clone(response); change(changed); assert.throws(() => planCopy(changed, entry), /exact initial or completed state/); }
  complete.item.data.content = [];
  assert.throws(() => planCopy(complete, entry), /exact initial or completed state/);
});

test('pending drafts and changed entry identities are rejected before any write', async () => {
  for (const change of [
    r => { r.item.draftRevisionId = 'unpublished-editor-save'; },
    r => { r.item.status = 'draft'; r.item.liveRevisionId = null; r.item.draftRevisionId = null; },
    r => { r.item.status = 'archived'; }, r => { r.item.type = 'pages'; },
    r => { r.item.slug = 'different'; }, r => { r._rev = ''; },
  ]) {
    const f = fixture(); change(f.state.entries['models/skorpio']); await assert.rejects(f.prepare); assert.equal(f.state.writes.length, 0);
  }
});

test('dry planning reads existing schemas, menu and references without mutation', async () => {
  const f = fixture(); const original = clone({ entries: f.state.entries, menu: f.state.menu, references: f.state.references });
  const plan = await f.prepare();
  assert.equal(plan.plans.filter(p => p.change).length, 2); assert.equal(plan.menuChange, true);
  assert.equal(f.state.writes.length, 0);
  assert.deepEqual({ entries: f.state.entries, menu: f.state.menu, references: f.state.references }, original);
  assert(f.state.reads.some(path => path.includes('/references/')));
});

test('incompatible schema, required clears and ambiguous menu targets stop dry planning', async () => {
  for (const change of [
    f => { f.state.schemas.models.supports = ['seo']; },
    f => { f.state.schemas.models.fields.find(field => field.slug === 'content').type = 'text'; },
    f => { f.state.schemas.models.fields = f.state.schemas.models.fields.filter(field => field.slug !== 'description'); },
    f => { f.state.schemas.posts.fields.find(field => field.slug === 'cta_text').required = true; },
    f => { f.state.schemas.posts.fields.find(field => field.slug === 'excerpt').validation = { maxLength: 3 }; },
    f => { f.state.menu.items[1].label = 'Libellé personnalisé'; },
    f => { f.state.menu.items.push({ ...f.state.menu.items[1], id: 'duplicate-target' }); },
    f => { f.state.menu.items = f.state.menu.items.filter(item => item.customUrl !== '/catalogue/'); },
  ]) { const f = fixture(); change(f); await assert.rejects(f.prepare); assert.equal(f.state.writes.length, 0); }
});

test('apply backs up first, merges only permitted fields and preserves attribution, SEO and menu identity/order', async () => {
  const f = fixture(); const original = clone(f.state); const plan = await f.prepare(); let backedUp = false; const completed = [];
  f.state.onWrite = async () => { assert(backedUp, 'Every mutation follows the backup'); };
  await f.apply(plan, { beforeWrite: async () => { assert.equal(f.state.writes.length, 0); backedUp = true; }, afterEntry: async result => completed.push(result) });
  assert.equal(f.state.writes.length, 5); assert.equal(completed.length, 3);
  for (const patch of f.entries) {
    const key = `${patch.collection}/${patch.slug}`; const before = original.entries[key].item, after = f.state.entries[key].item;
    assert.deepEqual(after.data, { ...before.data, ...patch.after });
    assert.deepEqual(after.seo, { ...before.seo, ...patch.seoAfter });
    for (const field of ['id', 'type', 'slug', 'status', 'authorId', 'primaryBylineId', 'bylines', 'createdAt', 'publishedAt', 'locale', 'translationGroup']) assert.deepEqual(after[field], before[field]);
    assert.equal(after.liveRevisionId, after.draftRevisionId);
  }
  assert.deepEqual(f.state.references, original.references);
  const expectedMenu = clone(original.menu); expectedMenu.items[1].label = 'Catalogue'; expectedMenu.updatedAt = f.state.menu.updatedAt;
  assert.deepEqual(f.state.menu, expectedMenu);
  assert(f.state.writes.every(call => /^\/_emdash\/api\/(content\/(models\/skorpio|posts\/choisir-une-table)(\/publish)?|menus\/primary\/items\/menu-catalogue)$/.test(call.path)));
});

test('a completed migration has no changes, no backup callback and no writes on another apply', async () => {
  const f = fixture(); await f.apply(await f.prepare()); const count = f.state.writes.length;
  const plan = await f.prepare(); assert.equal(plan.plans.filter(p => p.change).length, 0); assert.equal(plan.menuChange, false);
  await f.apply(plan, { beforeWrite: async () => assert.fail('No backup is needed when nothing changes') });
  assert.equal(f.state.writes.length, count);
});

test('preflight rejects concurrent revisions, publication state, SEO, references, schema or menu changes', async () => {
  for (const change of [
    f => { f.state.entries['models/skorpio']._rev = 'editor-revision'; },
    f => { f.state.entries['models/skorpio'].item.status = 'draft'; },
    f => { f.state.entries['models/skorpio'].item.seo.canonical = 'https://example.test/editor/'; },
    f => { f.state.references['id-skorpio'].reverse(); },
    f => { f.state.schemas.models.fields[0].label = 'Changed during planning'; },
    f => { f.state.menu.items.reverse(); },
  ]) {
    const f = fixture(); const plan = await f.prepare(); change(f);
    await assert.rejects(() => f.apply(plan, { beforeWrite: async () => assert.fail('Stale plan must be rejected before backup') }));
    assert.equal(f.state.writes.length, 0);
  }
});

test('failed backup or a revision/schema change during backup stops before saving', async () => {
  const failed = fixture(); const failedPlan = await failed.prepare();
  await assert.rejects(() => failed.apply(failedPlan, { beforeWrite: async () => { throw Error('Backup failed'); } }), /Backup failed/);
  assert.equal(failed.state.writes.length, 0);
  for (const change of [
    f => { f.state.entries['models/skorpio']._rev = 'changed-during-backup'; },
    f => { f.state.schemas.models.fields[0].label = 'Changed during backup'; },
  ]) {
    const f = fixture(); const plan = await f.prepare();
    await assert.rejects(() => f.apply(plan, { beforeWrite: async () => change(f) }));
    assert.equal(f.state.writes.length, 0);
  }
});

test('changes after save prevent publication, including content, unedited metadata, native SEO, relations and schema', async () => {
  for (const change of [
    f => { f.state.entries['models/skorpio']._rev = 'editor-saved-after-put'; },
    f => { f.state.entries['models/skorpio'].item.data.description = 'Changed after save'; },
    f => { f.state.entries['models/skorpio'].item.data.image_caption = 'Unrelated caption changed'; },
    f => { f.state.entries['models/skorpio'].item.authorId = 'other-author'; },
    f => { f.state.entries['models/skorpio'].item.seo.image = 'other-image'; },
    f => { f.state.references['id-skorpio'][0].sortOrder = 99; },
    f => { f.state.schemas.models.fields[0].label = 'Changed after save'; },
  ]) {
    const f = fixture(); const plan = await f.prepare();
    f.state.onWrite = async call => { if (call.method === 'PUT' && call.path.includes('/content/')) change(f); };
    await assert.rejects(() => f.apply(plan));
    assert.deepEqual(f.state.writes.map(call => call.method), ['PUT'], 'Leave the saved draft for review; never publish or continue');
  }
});

test('a native publish that changes protected data is detected before the next entry', async () => {
  for (const change of [
    f => { f.state.entries['models/skorpio'].item.data.image.id = 'unexpected-image'; },
    f => { f.state.entries['models/skorpio'].item.publishedAt = '2026-09-29T00:00:00Z'; },
    f => { f.state.entries['models/skorpio'].item.seo.noIndex = false; },
  ]) {
    const f = fixture(); const plan = await f.prepare();
    f.state.onWrite = async call => { if (call.path.endsWith('/publish')) change(f); };
    await assert.rejects(() => f.apply(plan));
    assert.equal(f.state.writes.length, 2); assert(!f.state.writes.some(call => call.path.includes('/posts/')));
  }
});

test('menu changes during content publication are preserved and a corrupt menu update is detected', async () => {
  const concurrent = fixture(); const plan = await concurrent.prepare();
  concurrent.state.onWrite = async call => { if (call.path.endsWith('/publish')) concurrent.state.menu.items[1].customUrl = '/editor-choice/'; };
  await assert.rejects(() => concurrent.apply(plan), /Menu changed/);
  assert(!concurrent.state.writes.some(call => call.path.includes('/menus/')));
  for (const change of [
    f => { f.state.menu.items.reverse(); }, f => { f.state.menu.items[0].id = 'different-id'; },
    f => { f.state.menu.items[1].customUrl = '/wrong-target/'; },
  ]) {
    const f = fixture(); const prepared = await f.prepare();
    f.state.onWrite = async call => { if (call.path.includes('/menus/')) change(f); };
    await assert.rejects(() => f.apply(prepared), /menu identity\/order\/target/);
  }
});
