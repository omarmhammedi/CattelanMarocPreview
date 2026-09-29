import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogueFailureMessage } from '../src/lib/catalogue-messages.ts';

test('preserves the CMS generic and unavailable messages for their corresponding failures', () => {
  const labels = {error: 'Erreur éditoriale.', unavailable: 'Indisponibilité éditoriale.'};
  assert.equal(catalogueFailureMessage({code: 'CATALOGUE_UNAVAILABLE', message: 'Native unavailable'}, labels), labels.unavailable);
  assert.equal(catalogueFailureMessage({code: 'TEMPORARILY_UNAVAILABLE', message: 'Native failure'}, labels), labels.error);
  assert.equal(catalogueFailureMessage(undefined, labels), labels.error);
});

test('retains concrete native recovery instructions instead of asking the visitor to retry blindly', () => {
  const labels = {error: 'Erreur éditoriale.'};
  assert.equal(catalogueFailureMessage({code: 'RATE_LIMITED', message: 'Trop de demandes. Veuillez réessayer plus tard.'}, labels), 'Trop de demandes. Veuillez réessayer plus tard.');
  assert.equal(catalogueFailureMessage({code: 'REQUEST_CONFLICT', message: 'Les informations ont changé. Rechargez le formulaire.'}, labels), 'Les informations ont changé. Rechargez le formulaire.');
  assert.equal(catalogueFailureMessage({code: 'UNKNOWN', message: 'Unrecognized failure'}, labels), labels.error);
  assert.equal(catalogueFailureMessage({code: 'RATE_LIMITED'}, labels), labels.error);
});

test('provides safe fallbacks when an optional editorial error label is empty', () => {
  assert.equal(catalogueFailureMessage({code: 'CATALOGUE_UNAVAILABLE', message: 'Catalogue indisponible.'}, {}), 'Catalogue indisponible.');
  assert.equal(catalogueFailureMessage(undefined, {}), '');
});
