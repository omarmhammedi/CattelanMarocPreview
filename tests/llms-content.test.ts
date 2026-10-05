import assert from 'node:assert/strict';
import test from 'node:test';
import {llmsResponse, llmsText} from '../src/lib/llms-content.ts';

const origin = 'https://cattelan.example';
const site = {name: 'Cattelan Italia Maroc', address: 'Adresse publiée', phone: '+212 500 000 000', hours: 'Lundi : 12 h–19 h 30\nDimanche : fermé'};

test('LLM recap uses current visible FAQ answers instead of hardcoded commercial promises', () => {
  const faq = {sections: [
    {key: 'faq_personnalisation', heading: 'Personnalisation', displayHeading: 'Quels modèles ?', text: 'La plupart des collections se personnalisent, selon le modèle.'},
    {key: 'faq_livraison', heading: 'Quel délai ?', text: 'Le délai figure sur votre devis.'},
    {key: 'topic', heading: 'Intertitre', text: 'Texte de présentation'},
    {key: 'faq_cleared', heading: 'Ancienne réponse', text: ''},
  ]};
  const rendered = llmsText({site, origin, faq});
  assert.match(rendered, /### Quels modèles \?/u);
  assert.match(rendered, /La plupart des collections se personnalisent, selon le modèle\./u);
  assert.match(rendered, /Le délai figure sur votre devis\./u);
  for (const stale of ['Tout le catalogue Cattelan Italia peut être commandé et personnalisé', '10 à 12', '50 %', 'Intertitre', 'Ancienne réponse']) assert.equal(rendered.includes(stale), false, stale);
  assert.match(rendered, /Lundi : 12 h–19 h 30 ; Dimanche : fermé/u);
  const updated = llmsText({site: {...site, phone: '', address: 'Nouvelle adresse'}, origin, faq: {sections: [{key: 'faq_livraison', heading: 'Quel délai ?', text: 'Nouvelle réponse.'}]}});
  assert.match(updated, /Nouvelle adresse/u);
  assert.match(updated, /Nouvelle réponse\./u);
  for (const stale of ['Adresse publiée', '+212 500 000 000', 'La plupart', 'Le délai figure']) assert.equal(updated.includes(stale), false, stale);
});

test('missing or editor-excluded FAQ has no answer export or discovery link', () => {
  for (const input of [{faq: null}, {faq: {sections: [{key: 'faq_secret', heading: 'Question', text: 'Réponse exclue'}]}, faqSeo: {noIndex: true}}]) {
    const rendered = llmsText({site, origin, ...input});
    assert.equal(rendered.includes('Réponse exclue'), false);
    assert.equal(rendered.includes('/faq/'), false);
    assert.equal(rendered.includes('## Questions fréquentes'), false);
    assert.match(rendered, /\/showroom-casablanca\//u);
  }
});

test('FAQ citations follow safe native canonical overrides and site origin', () => {
  const faq = {sections: [{key: 'faq_test', heading: 'Question', text: 'Réponse'}]};
  for (const [canonical, expected] of [['aide/', `${origin}/aide/`], ['/reponses/', `${origin}/reponses/`], ['https://site.example/faq/', 'https://site.example/faq/'], ['javascript:alert(1)', `${origin}/faq/`], ['https://user:secret@site.example/faq/', `${origin}/faq/`]]) {
    const rendered = llmsText({site, origin, faq, faqSeo: {canonical}});
    assert.ok(rendered.includes(`[FAQ du site](${expected})`));
    assert.equal(rendered.includes('secret@'), false);
  }
});

test('discovery requests with any preview parameter are excluded before the CMS can read a draft', async () => {
  let reads = 0;
  const loadContent = async () => {
    reads++;
    return {site, origin, faq: {sections: [{key: 'faq_draft', heading: 'Preview', text: 'Unpublished confidential answer'}]}};
  };
  for (const indexable of [true, false]) {
    for (const query of ['?_preview=valid-signed-token', '?_preview=', '?_preview', '?%5Fpreview=token']) {
      const response = await llmsResponse({url: new URL(`/llms.txt${query}`, origin), indexable, loadContent});
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
      assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.equal(await response.text(), 'Not found');
    }
  }
  assert.equal(reads, 0, 'A valid signed preview must never reach a request-aware CMS loader.');
});

test('ordinary discovery requests preserve production and preview response policies', async () => {
  let reads = 0;
  for (const indexable of [true, false]) {
    const response = await llmsResponse({url: new URL('/llms.txt', origin), indexable, loadContent: async () => {
      reads++;
      return {site, origin, faq: {sections: [{key: 'faq_live', heading: 'Question', text: 'Published answer'}]}};
    }});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'text/plain; charset=utf-8');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('x-robots-tag'), indexable ? null : 'noindex');
    assert.match(await response.text(), /Published answer/u);
  }
  assert.equal(reads, 2);
});
