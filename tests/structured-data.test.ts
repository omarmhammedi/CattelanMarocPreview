import assert from 'node:assert/strict';
import test from 'node:test';
import { runWithContext } from 'emdash';
import { createPublicPageContext, generateBaseSeoContributions, resolvePageMetadata } from 'emdash/page';
import {
  absoluteWebUrl, articleGraph, breadcrumbGraph, faqGraph, fallbackFavicon, furnitureStoreGraph, organizationGraph,
  openingHours, pageBreadcrumbs, productGraph, schemaProjection, socialImage, structuredDataContributions,
} from '../src/lib/structured-data.ts';
import { rememberRenderedSeo, renderedSeo } from '../src/lib/seo-render-context.ts';

const origin = 'https://cattelan.example';
const site = {
  name: 'Cattelan Italia Maroc',
  settings: {url: origin},
  logoLight: {src: '/media/logo.png'},
  labels: {collections: 'Collections', journal: 'Journal'},
  address: '8–10 Avenue Mohamed Sijilmassi, Casablanca 20250, Maroc',
  phone: '+212 7 71 10 54 90',
  hours: 'Lundi : 12 h–19 h 30\nMardi–samedi : 9 h–19 h 30\nDimanche : fermé\n(heure de Casablanca)',
  showroomLatitude: 33.59, showroomLongitude: -7.64,
  mapUrl: 'https://www.google.com/maps/dir/?api=1&destination=Casablanca',
};
const page = (path: string, overrides: Record<string, any> = {}) => createPublicPageContext({
  url: origin + path, kind: 'content', pageType: 'website', siteUrl: origin,
  siteName: site.name, canonical: origin + path, title: 'Titre SEO | Cattelan Italia Maroc',
  pageTitle: 'Titre visible', ...overrides,
});

test('social images use the current origin, reject non-web protocols and preserve native fallback order', () => {
  assert.equal(absoluteWebUrl('/media/photo.jpg', origin), origin + '/media/photo.jpg');
  assert.equal(absoluteWebUrl('https://images.example/photo.jpg', origin), 'https://images.example/photo.jpg');
  assert.equal(absoluteWebUrl('javascript:alert(1)', origin), undefined);
  assert.equal(absoluteWebUrl('data:image/png;base64,test', origin), undefined);
  assert.equal(absoluteWebUrl(' ', origin), undefined);
  const configured = {...site, settings: {seo: {defaultOgImage: {url: '/media/default.jpg'}}}};
  assert.equal(socialImage({src: '/media/page.jpg'}, configured, '/journal/', origin), origin + '/media/page.jpg');
  assert.equal(socialImage(null, configured, '/journal/', origin), origin + '/media/default.jpg');
  assert.equal(socialImage(null, site, '/journal/', origin), origin + '/media/logo.png');
  assert.equal(socialImage(null, site, '/journal/article/', origin), undefined);
  assert.equal(socialImage(null, site, '/preview/pages/journal-id', origin, {collection: 'pages', slug: 'journal'}), origin + '/media/logo.png');
  assert.equal(socialImage(null, site, '/preview/posts/article-id', origin, {collection: 'posts', slug: 'journal'}), undefined);
  assert.equal(socialImage(null, {...site, logoLight: null}, '/journal/', origin), undefined);
  assert.equal(socialImage(null, {...site, settings: {seo: {defaultOgImage: {mediaId: 'deleted-media'}}}}, '/journal/', origin), origin + '/media/logo.png');
  assert.equal(socialImage(null, {...site, settings: {seo: {defaultOgImage: {mediaId: 'deleted-media'}}}}, '/modeles/greta/', origin), undefined);
});

test('favicon uses the existing CMS brand and leaves the native favicon authoritative', () => {
  assert.equal(fallbackFavicon(site, origin), origin + '/media/logo.png');
  assert.equal(fallbackFavicon({...site, settings: {favicon: {url: '/media/icon.png'}}}, origin), undefined);
  assert.equal(fallbackFavicon({...site, logoLight: null, logoDark: null}, origin), undefined);
});

test('breadcrumbs follow actual labels and explicit model family hierarchy, with no homepage or preview trail', () => {
  assert.deepEqual(pageBreadcrumbs({path: '/', title: 'Accueil', site}), []);
  assert.deepEqual(pageBreadcrumbs({path: '/preview/pages/home', title: 'Brouillon', site}), []);
  const supplied = [{name: 'Collections', url: '/collections/'}, {name: 'Chaises', url: '/collections/chaises-tabourets/'}, {name: 'Greta', url: '/modeles/greta/'}];
  assert.deepEqual(pageBreadcrumbs({path: '/modeles/greta/', title: 'Greta', site, supplied}), supplied);
  assert.deepEqual(pageBreadcrumbs({path: '/journal/article/', title: 'L’article', site}).map(item => item.name), [site.name, 'Journal', 'L’article']);
  assert.deepEqual(pageBreadcrumbs({path: '/journal/article/', title: 'L’article', site, supplied: []}), []);
  const graph = breadcrumbGraph(page('/modeles/greta/', {breadcrumbs: supplied}));
  const items = graph?.itemListElement as any[];
  assert.deepEqual(items.map(item => item.position), [1, 2, 3]);
  assert.equal(items[1].item, origin + '/collections/chaises-tabourets/');
  assert.equal(items[2].item, origin + '/modeles/greta/');
});

test('published French showroom hours are converted without inventing hours for unknown prose', () => {
  const hours = openingHours(site.hours)!;
  assert.equal(hours.length, 3);
  assert.deepEqual(hours[0], {'@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday'], opens: '12:00', closes: '19:30'});
  assert.deepEqual(hours[1].dayOfWeek, ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  assert.equal(hours[1].opens, '09:00');
  assert.equal(hours[2].opens, '00:00');
  assert.equal(hours[2].closes, '00:00');
  assert.equal(openingHours(''), undefined);
  assert.equal(openingHours('Sur rendez-vous'), undefined);
  assert.equal(openingHours('Lundi : 99 h–19 h 30'), undefined);
  assert.equal(openingHours('Lundi : 9 h–18 h\nHoraires exceptionnels'), undefined);
});

test('FurnitureStore reflects only current CMS values and current showroom picture', () => {
  const graph = furnitureStoreGraph(site, {slug: 'home', hero_image: '/media/table.jpg', showroom_image: '/media/showroom.jpg'}, origin)!;
  assert.equal(graph['@type'], 'FurnitureStore');
  assert.deepEqual(graph.address, {'@type': 'PostalAddress', streetAddress: '8–10 Avenue Mohamed Sijilmassi', addressLocality: 'Casablanca', postalCode: '20250', addressCountry: 'MA'});
  assert.equal(graph.image, origin + '/media/showroom.jpg');
  assert.equal(graph.hasMap, site.mapUrl);
  assert.equal(graph.url, origin + '/showroom-casablanca/');
  assert.equal(graph.telephone, site.phone);
  assert.equal('priceRange' in graph, false);
  assert.equal('sameAs' in graph, false);
  const cleared = furnitureStoreGraph({...site, address: '', phone: '', hours: '', showroomLatitude: null}, {slug: 'home'}, origin)!;
  for (const key of ['address', 'telephone', 'openingHoursSpecification', 'geo', 'image']) assert.equal(key in cleared, false, key);
  assert.equal('geo' in furnitureStoreGraph({...site, showroomLongitude: '  '}, {}, origin)!, false);
  assert.equal('geo' in furnitureStoreGraph({...site, showroomLatitude: true}, {}, origin)!, false);
  assert.equal('geo' in furnitureStoreGraph({...site, showroomLatitude: 100}, {}, origin)!, false);
});

test('new or unfamiliar CMS address is retained without stale locality or postcode', () => {
  const graph = furnitureStoreGraph({...site, address: 'Adresse à confirmer'}, {}, origin)!;
  assert.deepEqual(graph.address, {'@type': 'PostalAddress', streetAddress: 'Adresse à confirmer'});
  assert.equal(furnitureStoreGraph({...site, name: ''}, {}, origin), undefined);
  assert.equal((furnitureStoreGraph({...site, address: '8 Avenue Exemple, Casablanca 20250, Morocco'}, {}, origin)?.address as any).addressCountry, 'MA');
  assert.equal((furnitureStoreGraph({...site, address: '8 Avenue Exemple, Autreville 12345, FR'}, {}, origin)?.address as any).addressCountry, 'FR');
});

test('store social identities use configured web profiles, survive projection and disappear when cleared', () => {
  const current = {...site, settings: {social: {
    instagram: 'https://www.instagram.com/showroom-example/', facebook: 'https://www.facebook.com/showroom-example/',
    github: 'https://www.instagram.com/showroom-example/', twitter: '@unknown', linkedin: 'javascript:alert(1)', youtube: 'https://private:secret@example.test/',
  }}};
  const home = page('/', {content: {collection: 'pages', id: 'p1', slug: 'home'}});
  const entry = {slug: 'home'};
  const expected = ['https://www.instagram.com/showroom-example/', 'https://www.facebook.com/showroom-example/'];
  assert.deepEqual(furnitureStoreGraph(current, entry, origin)?.sameAs, expected);
  const projected = schemaProjection(home, current, entry);
  assert.deepEqual(furnitureStoreGraph(projected.site!, projected.entry!, origin)?.sameAs, expected);
  assert.equal('settings' in projected.site!, false);
  for (const social of [undefined, {}, {instagram: ''}]) {
    assert.equal('sameAs' in furnitureStoreGraph({...site, settings: {social}}, entry, origin)!, false);
  }
});

test('Product describes actual model images and dimensions without fictitious sales data', () => {
  const productPage = page('/modeles/greta/', {content: {collection: 'models', id: 'm1', slug: 'greta'}});
  const data = {title: 'Greta', description: 'Une chaise rembourrée.', image: {meta: {storageKey: 'greta.jpg'}}, gallery: [{image: '/media/detail.jpg'}, {image: '/media/detail.jpg'}], dimensions: [{label: 'Dimensions', value: '58 × 62 × 84 cm'}]};
  const graph = productGraph(data, productPage)!;
  assert.equal(graph.name, 'Greta');
  assert.deepEqual(graph.image, [origin + '/_emdash/api/media/file/greta.jpg', origin + '/media/detail.jpg']);
  assert.deepEqual(graph.additionalProperty, [{'@type': 'PropertyValue', name: 'Dimensions', value: '58 × 62 × 84 cm'}]);
  for (const key of ['offers', 'aggregateRating', 'review', 'brand', 'manufacturer', 'sku', 'material']) assert.equal(key in graph, false, key);
  const cleared = productGraph({...data, image: null, gallery: [], dimensions: []}, productPage)!;
  assert.equal('image' in cleared, false);
  assert.equal('additionalProperty' in cleared, false);
});

test('BlogPosting uses visible article title and collective author, while preserving SEO image/description overrides', () => {
  const post = page('/journal/article/', {pageType: 'article', pageTitle: 'Comment choisir une table ?', seo: {ogTitle: 'Titre SEO différent | Marque', ogDescription: 'Description choisie dans EmDash', ogImage: '/media/social.jpg', robots: 'noindex, nofollow'}, articleMeta: {author: site.name, publishedTime: '2026-09-27T20:09:28.933Z'}});
  const graph = articleGraph(post)!;
  assert.equal(graph.headline, 'Comment choisir une table ?');
  assert.equal(graph.description, 'Description choisie dans EmDash');
  assert.equal(graph.image, origin + '/media/social.jpg');
  assert.deepEqual(graph.author, {'@type': 'Organization', name: site.name});
  assert.equal(graph.dateModified, graph.datePublished);
  assert.deepEqual(articleGraph({...post, articleMeta: {author: 'Prénom Nom'}})?.author, {'@type': 'Person', name: 'Prénom Nom'});
  assert.equal('author' in articleGraph({...post, articleMeta: {}})!, false);
});

test('native metadata composition emits one corrected article graph, escapes content and retains noindex/title tags', () => {
  const post = page('/journal/article/', {pageType: 'article', pageTitle: '</script><img src=x>', seo: {ogTitle: 'Titre SEO spécifique', robots: 'noindex, nofollow'}, articleMeta: {author: site.name}, breadcrumbs: [{name: site.name, url: '/'}, {name: 'Article', url: '/journal/article/'}]});
  const resolved = resolvePageMetadata([...structuredDataContributions(post), ...generateBaseSeoContributions(post)]);
  assert.equal(resolved.jsonld.filter(item => JSON.parse(item.json)['@type'] === 'BlogPosting').length, 1);
  assert.equal(resolved.jsonld.filter(item => JSON.parse(item.json)['@type'] === 'BreadcrumbList').length, 1);
  assert.equal(resolved.jsonld.some(item => item.json.includes('</script>')), false);
  assert.equal(resolved.meta.find(item => item.name === 'robots')?.content, 'noindex, nofollow');
  assert.equal(resolved.properties.find(item => item.property === 'og:title')?.content, 'Titre SEO spécifique');
});

test('schema is scoped to its real page and disappears when its CMS entry is unavailable', () => {
  const model = page('/modeles/greta/', {content: {collection: 'models', id: 'm1', slug: 'greta'}});
  assert.deepEqual(structuredDataContributions(model), []);
  assert.deepEqual(structuredDataContributions(model, site, {title: 'Greta'}).map(item => item.kind === 'jsonld' ? item.id : ''), ['product']);
  const home = page('/', {content: {collection: 'pages', id: 'p1', slug: 'home'}, breadcrumbs: []});
  assert.deepEqual(structuredDataContributions(home, site, {title: 'Accueil'}).map(item => item.kind === 'jsonld' ? item.id : ''), ['showroom', 'organization']);
  assert.deepEqual(structuredDataContributions(page('/collections/'), site, {title: 'Collections'}), []);
});

test('a signed global-settings preview describes the rendered home with draft site values and public store URLs', () => {
  // The preview route supplies home.entry to SeoHead, while getSite reads the
  // signed site_content draft. Neither the global entry nor its title replaces
  // the identity of the rendered page.
  const preview = page('/preview/site_content/global-id', {
    content: {collection: 'pages', id: 'home-id', slug: 'home'},
    breadcrumbs: [], seo: {robots: 'noindex, nofollow'},
  });
  const graphs = structuredDataContributions(preview, {...site, phone: '+212 500 000 001', showroomLatitude: 33.6},
    {title: 'Accueil', showroom_image: '/media/showroom.jpg'});
  assert.deepEqual(graphs.map(item => item.kind === 'jsonld' ? item.id : ''), ['showroom', 'organization']);
  const graph = graphs[0].kind === 'jsonld' ? graphs[0].graph as Record<string, any> : {};
  assert.equal(graph['@type'], 'FurnitureStore');
  assert.equal(graph.telephone, '+212 500 000 001');
  assert.equal(graph.geo.latitude, 33.6);
  assert.equal(graph.url, origin + '/showroom-casablanca/');
  assert.equal(graph.image, origin + '/media/showroom.jpg');
  assert(!JSON.stringify(graph).includes('/preview/'));
  const cleared = structuredDataContributions(preview, {...site, phone: '', hours: '', showroomLatitude: null}, {title: 'Accueil'});
  const clearedGraph = cleared[0].kind === 'jsonld' ? cleared[0].graph as Record<string, any> : {};
  for (const key of ['telephone', 'openingHoursSpecification', 'geo']) assert.equal(key in clearedGraph, false);
});

test('schema projection keeps rendered model values without retaining heavy or private CMS fields', () => {
  const model = page('/modeles/greta/', {content: {collection: 'models', id: 'm1', slug: 'greta'}});
  const original = {title: 'Greta', description: 'Description', image: {meta: {storageKey: 'greta.jpg'}, privateMeta: 'omit'},
    gallery: [{image: '/media/detail.jpg', caption: 'omit'}], dimensions: [{label: 'L', value: '58 cm', internal: 'omit'}],
    finishes: Array.from({length: 400}, () => ({image: '/media/swatch.jpg'})), content: ['omit'], secret: 'omit'};
  const projection = schemaProjection(model, site, original);
  assert.deepEqual(projection, {entry: {title: 'Greta', description: 'Description', image: '/_emdash/api/media/file/greta.jpg',
    gallery: [{image: '/media/detail.jpg'}], dimensions: [{label: 'L', value: '58 cm'}]}});
  original.gallery[0].image = '/changed.jpg';
  assert.equal(projection.entry?.gallery[0].image, '/media/detail.jpg', 'Projection retains no mutable media/gallery objects');
  assert.deepEqual(schemaProjection(model), {});
  assert.deepEqual(schemaProjection(page('/collections/'), site, original), {});
});

test('showroom projection preserves CMS image precedence and cleared values', () => {
  const home = page('/', {content: {collection: 'pages', id: 'p1', slug: 'home'}});
  const entry = {slug: 'home', hero_image: '/table.jpg', showroom_image: '/showroom.jpg',
    sections: [{section_key: 'showroom', image: '/section.jpg'}]};
  const projected = schemaProjection(home, {...site, secret: 'omit'}, entry);
  assert.deepEqual(structuredDataContributions(home, projected.site, projected.entry), structuredDataContributions(home, site, entry));
  assert.equal('secret' in projected.site!, false);
  assert.equal('settings' in projected.site!, false);
  const cleared = schemaProjection(home, {...site, phone: '', hours: '', showroomLatitude: null}, {slug: 'home'});
  const contributions = structuredDataContributions(home, cleared.site, cleared.entry);
  const graph = contributions[0].kind === 'jsonld' ? contributions[0].graph as Record<string, any> : {};
  for (const key of ['telephone', 'openingHoursSpecification', 'geo', 'image']) assert.equal(key in graph, false);
});

test('metadata receives the exact rendered slug-preview entry and survives native page cloning', async () => {
  const model = page('/preview/models/skorpio', {content: {collection: 'models', id: 'database-id', slug: 'renamed-draft'}});
  await runWithContext({editMode: false, preview: {collection: 'models', id: 'skorpio'}}, async () => {
    rememberRenderedSeo(model, site, {title: 'Draft title', description: 'Draft description', image: '/draft.jpg'});
    // The native SEO panel overlays canonical/SEO fields with {...page}; its
    // unchanged URL and content identity still select this rendered entry.
    const resolved = {...model, canonical: origin + '/canonical-model/', seo: {ogTitle: 'SEO override'}};
    const {entry} = renderedSeo(resolved);
    const graph = productGraph(entry!, resolved)!;
    assert.equal(graph.name, 'Draft title');
    assert.equal(graph.url, origin + '/canonical-model/');
    assert.deepEqual(graph.image, [origin + '/draft.jpg']);
    assert.equal(model.content?.id, 'database-id', 'Native SEO cache identity remains unchanged');
    assert.deepEqual(renderedSeo({...model, content: {...model.content!, id: 'unrelated-id'}}), {});
  });
  assert.deepEqual(renderedSeo(model), {}, 'No values survive outside the request context');
});

test('simultaneous published and draft requests cannot share metadata', async () => {
  const model = page('/modeles/skorpio/', {content: {collection: 'models', id: 'm1', slug: 'skorpio'}});
  let release: () => void = () => {};
  const ready = new Promise<void>(resolve => { release = resolve; });
  await Promise.all([
    runWithContext({editMode: false, preview: {collection: 'models', id: 'skorpio'}}, async () => {
      rememberRenderedSeo(model, site, {title: 'Draft'});
      await ready;
      assert.equal(renderedSeo(model).entry?.title, 'Draft');
    }),
    runWithContext({editMode: false}, async () => {
      assert.deepEqual(renderedSeo(model), {});
      rememberRenderedSeo(model, site, {title: 'Published'});
      release();
      await Promise.resolve();
      assert.equal(renderedSeo(model).entry?.title, 'Published');
    }),
  ]);
  runWithContext({editMode: false}, () => assert.deepEqual(renderedSeo(model), {}));
});

test('the address form of the plan keeps street, district, postcode and city', () => {
  const graph = furnitureStoreGraph({...site, address: '8-10 avenue du Docteur Mohamed Sijilmassi, Triangle d’Or, 20250 Casablanca, Maroc'}, {}, origin)!;
  assert.deepEqual(graph.address, {'@type': 'PostalAddress', streetAddress: '8-10 avenue du Docteur Mohamed Sijilmassi, Triangle d’Or', addressLocality: 'Casablanca', postalCode: '20250', addressCountry: 'MA'});
  assert.deepEqual(graph.areaServed, {'@type': 'Country', name: 'Maroc'});
});

test('Organization describes the site from its CMS identity only', () => {
  const graph = organizationGraph({...site, publicEmail: 'contact@cattelanitalia.ma'}, origin)!;
  assert.equal(graph['@type'], 'Organization');
  assert.equal(graph.url, origin + '/');
  assert.equal(graph.email, 'contact@cattelanitalia.ma');
  assert.equal(graph.logo, origin + '/media/logo.png');
  assert.equal('email' in organizationGraph(site, origin)!, false);
  assert.equal(organizationGraph({...site, name: ''}, origin), undefined);
});

test('FAQPage lists only complete faq_* sections of the FAQ page', () => {
  const faq = page('/faq/', {content: {collection: 'pages', id: 'p9', slug: 'faq'}});
  const entry = {sections: [
    {section_key: 'group', heading: 'Livraison'},
    {section_key: 'faq_1', heading: 'Livrez-vous partout au Maroc ?', text: 'Oui.'},
    {section_key: 'faq_2', heading: 'Question sans réponse'},
  ]};
  const graph = faqGraph(entry, faq)!;
  assert.deepEqual(graph.mainEntity, [{'@type': 'Question', name: 'Livrez-vous partout au Maroc ?', acceptedAnswer: {'@type': 'Answer', text: 'Oui.'}}]);
  assert.equal(faqGraph({sections: []}, faq), undefined);
  const projected = schemaProjection(faq, site, {...entry, private: 'x'});
  assert.deepEqual(structuredDataContributions(faq, projected.site, projected.entry).map(item => item.kind === 'jsonld' ? item.id : ''), ['faq']);
  assert.equal('private' in (projected.entry || {}), false);
});
