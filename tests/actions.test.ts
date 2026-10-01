import assert from 'node:assert/strict';
import test from 'node:test';
import { actions, generalWhatsappMessage, isCatalogueLink, modelWhatsappMessage, whatsappHref } from '../src/lib/actions.ts';

test('keeps the three actions, their order and their destinations', () => {
  assert.deepEqual(Object.keys(actions), ['appointment', 'advisor', 'catalogue']);
  assert.equal(actions.appointment.label, 'Prendre rendez-vous');
  assert.equal(actions.appointment.href, '/showroom-casablanca/#rendez-vous');
  assert.equal(actions.advisor.label, 'Échanger avec un conseiller');
  assert.equal(actions.catalogue.label, 'Recevoir le catalogue');
  assert.equal(actions.catalogue.href, '/catalogue/');
  for (const action of Object.values(actions)) assert.doesNotMatch(action.label, /prix/iu);
});

test('writes the pre-filled messages of the plan', () => {
  assert.equal(generalWhatsappMessage, 'Bonjour, je souhaite des informations sur Cattelan Italia Maroc.');
  assert.equal(modelWhatsappMessage('Skorpio', 'https://cattelanitalia.ma/modeles/skorpio/'),
    'Bonjour, je souhaite être conseillé sur le modèle Skorpio (cattelanitalia.ma/modeles/skorpio/).');
  assert.equal(modelWhatsappMessage('Greta Outdoor', 'https://cattelan-maroc-preview.cattelan.workers.dev/modeles/greta-outdoor/'),
    'Bonjour, je souhaite être conseillé sur le modèle Greta Outdoor (cattelan-maroc-preview.cattelan.workers.dev/modeles/greta-outdoor/).');
});

test('adds the message to the WhatsApp link stored in the CMS', () => {
  const href = whatsappHref('https://wa.me/212771105490', generalWhatsappMessage);
  assert.equal(href, 'https://wa.me/212771105490?text=Bonjour%2C%20je%20souhaite%20des%20informations%20sur%20Cattelan%20Italia%20Maroc.');
  assert.equal(new URL(href!).searchParams.get('text'), generalWhatsappMessage);
  const model = modelWhatsappMessage('Napoleon Keramik', 'https://cattelanitalia.ma/modeles/napoleon-keramik/');
  assert.equal(new URL(whatsappHref(' https://wa.me/212771105490 ', model)!).searchParams.get('text'), model);
});

test('replaces an earlier message and keeps the other parameters', () => {
  const href = whatsappHref('https://api.whatsapp.com/send?phone=212771105490&text=Ancien', 'Nouveau message');
  assert.equal(href, 'https://api.whatsapp.com/send?phone=212771105490&text=Nouveau%20message');
});

test('refuses a missing or foreign link instead of inventing a WhatsApp number', () => {
  for (const link of [null, undefined, '', '  ', '212771105490', 'tel:+212771105490', 'http://wa.me/212771105490', 'https://example.com/?text=x', 'https://wa.me.example.com/212771105490']) {
    assert.equal(whatsappHref(link, generalWhatsappMessage), null, String(link));
  }
});

test('recognises the catalogue menu item with or without its trailing slash', () => {
  assert.equal(isCatalogueLink('/catalogue/'), true);
  assert.equal(isCatalogueLink('/catalogue'), true);
  assert.equal(isCatalogueLink('/collections/'), false);
  assert.equal(isCatalogueLink('/catalogue/demonstration/'), false);
  assert.equal(isCatalogueLink(undefined), false);
});
