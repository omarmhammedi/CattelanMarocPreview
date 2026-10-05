import assert from 'node:assert/strict';
import test from 'node:test';
import {EDITORIAL_FIELDS, EDITORIAL_DEFAULTS, readEditorialCopy, requiredCopy} from '../src/lib/editorial-copy.mjs';

test('optional public notices can be deliberately cleared without resurrecting retired copy', () => {
  assert.equal(readEditorialCopy().model_services, EDITORIAL_DEFAULTS.model_services);
  assert.equal(readEditorialCopy({model_services: ''}).model_services, '');
  assert.equal(readEditorialCopy({model_services: null}).model_services, '');
  assert.equal(readEditorialCopy({model_quote_note: 'Livraison sur devis.'}).model_quote_note, 'Livraison sur devis.');
  assert.equal(readEditorialCopy({request_hours_note: ''}).request_hours_note, '');
});

test('editorial definitions supply accessible labels while legacy sparse fields remain usable', () => {
  assert.equal(new Set(EDITORIAL_FIELDS.map(field => field.slug)).size, EDITORIAL_FIELDS.length);
  for (const field of EDITORIAL_FIELDS.filter(field => field.required)) assert(field.defaultValue.trim(), `${field.slug} needs a usable default`);
  assert.equal(requiredCopy('  ', 'Télécharger'), 'Télécharger');
  assert.equal(requiredCopy('Voir le PDF', 'Télécharger'), 'Voir le PDF');
});


test('one native JSON field stores copy without adding D1 columns and owns explicit clears', () => {
  const data = {model_services: 'Legacy terms', editorial_copy: {model_services: '', model_quote_label: 'Recevoir un devis'}};
  const before = structuredClone(data);
  assert.equal(readEditorialCopy(data).model_services, '');
  assert.equal(readEditorialCopy(data).model_quote_label, 'Recevoir un devis');
  assert.equal(readEditorialCopy({editorial_copy: {model_services: null}}).model_services, '');
  assert.equal(readEditorialCopy({model_services: 'Legacy terms', editorial_copy: []}).model_services, 'Legacy terms');
  assert.equal(readEditorialCopy(null).model_quote_label, EDITORIAL_DEFAULTS.model_quote_label);
  assert.deepEqual(data, before);
});
