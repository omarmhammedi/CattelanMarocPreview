import assert from 'node:assert/strict';
import test from 'node:test';
import { changedSettings, settingsFields, settingsGroup, validateSettings, type SettingsField } from '../src/plugins/editorial/settings-model.ts';
import { editorialData } from '../src/lib/editorial-storage.mjs';

const fields: SettingsField[] = [
  { slug: 'address', label: 'Adresse', type: 'text' },
  { slug: 'form_name_label', label: 'Nom du champ', type: 'string', required: true },
  { slug: 'analytics_token', label: 'Mesure', type: 'string' },
  { slug: 'showroom_latitude', label: 'Latitude', type: 'number', validation: { min: -90, max: 90 } },
  { slug: 'active_catalogue', label: 'Catalogue actif', type: 'reference' },
  { slug: 'model_notice', label: 'Archive', type: 'text', widget: 'cattelan-editorial:retired-reference' },
];

test('grouped settings updates only changed scalar fields, preserving sparse content and native relationships', () => {
  const before = { address: 'Ancienne adresse', form_name_label: 'Nom', active_catalogue: 'native-relation', model_notice: 'Archive' };
  const edited = { ...before, address: '', active_catalogue: 'changed-outside-editor', model_notice: 'Ignored', unexpected: 'Unknown' };
  assert.deepEqual(changedSettings(before, edited, fields), { address: '' });
  assert.deepEqual(changedSettings(before, before, fields), {});
  assert.deepEqual(changedSettings(before, { ...before, showroom_latitude: null }, fields), { showroom_latitude: null });
});

test('settings validate required labels and operational values before a draft save', () => {
  assert.equal(validateSettings({ form_name_label: 'Nom', analytics_token: '', showroom_latitude: null }, fields), null);
  assert.equal(validateSettings({ form_name_label: ' ' }, fields)?.field, 'form_name_label');
  assert.equal(validateSettings({ form_name_label: 'Nom', analytics_token: 'abc' }, fields)?.field, 'analytics_token');
  assert.equal(validateSettings({ form_name_label: 'Nom', analytics_token: 'a'.repeat(32) }, fields), null);
  assert.equal(validateSettings({ form_name_label: 'Nom', showroom_latitude: 91 }, fields)?.field, 'showroom_latitude');
  assert.equal(validateSettings({ form_name_label: 'Nom', showroom_latitude: Number.NaN }, fields)?.field, 'showroom_latitude');
  assert.equal(validateSettings({ form_name_label: 24 }, fields)?.field, 'form_name_label');
  const limited: SettingsField[] = [{ slug: 'request_city_label', label: 'Ville', type: 'string', validation: { maxLength: 255 } }, { slug: 'public_email', label: 'E-mail', type: 'string', required: true }];
  assert.equal(validateSettings({ request_city_label: 'x'.repeat(256), public_email: 'contact@example.com' }, limited)?.field, 'request_city_label');
  assert.equal(validateSettings({ request_city_label: 'Ville', public_email: 'adresse-incomplète' }, limited)?.field, 'public_email');
});

test('public business copy appears with the right staff task', () => {
  for (const [slug, expected] of [['action_advisor_label', 'actions'], ['footer_valet_text', 'contact'], ['model_services', 'model-services'], ['request_city_label', 'request-form'], ['form_hint', 'catalogue-form'], ['privacy_controller', 'privacy']]) {
    assert.equal(settingsGroup({ slug, label: slug, type: 'string' }), expected);
  }
});

test('structured copy edits preserve unedited and unknown JSON keys in the same global draft', () => {
  const original = { address: 'Adresse actuelle', editorial_copy: { request_city_label: 'Ville', model_services: 'Services', future_setting: { enabled: true }, address: 'Unknown key must not shadow the native field' } };
  const expandedFields = settingsFields([...fields, { slug: 'editorial_copy', label: 'Textes', type: 'json' }]);
  assert.equal(expandedFields.some(field => field.slug === 'editorial_copy'), false);
  assert.equal(expandedFields.filter(field => field.slug === 'request_city_label').length, 1);
  assert.equal(settingsFields([{ slug: 'public_email', label: 'E-mail', type: 'string', required: false }])[0].required, true);
  assert.equal(editorialData(original).address, 'Adresse actuelle');
  const edited = { ...editorialData(original), request_city_label: 'Votre ville', model_services: '', address: 'Nouvelle adresse' };
  assert.deepEqual(changedSettings(original, edited, expandedFields), {
    address: 'Nouvelle adresse',
    editorial_copy: { request_city_label: 'Votre ville', model_services: '', future_setting: { enabled: true }, address: 'Unknown key must not shadow the native field' },
  });
  assert.deepEqual(changedSettings(original, editorialData(original), expandedFields), {});
});
