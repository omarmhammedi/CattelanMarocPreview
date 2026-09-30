import assert from 'node:assert/strict';
import test from 'node:test';
import { finishGroupLabel, finishHasSeparateCode, finishNameLabel } from '../src/lib/model-labels.ts';

test('explains the observed metal and upholstery categories without implying another furniture type', () => {
  assert.equal(finishGroupLabel({group: 'base', material: 'metals'}), 'Piètement — métal');
  assert.equal(finishGroupLabel({group: 'assise', materialGroup: 'Tissu Canapé', material: 'T10'}), 'Revêtement — tissu T10');
  assert.equal(finishGroupLabel({group: 'assise', materialGroup: 'Cuir Chaise/Lit', material: 'cuir mince'}), 'Revêtement — cuir mince');
  assert.equal(finishGroupLabel({group: 'revêtement', materialGroup: 'Cuir Canapé', material: 'glove'}), 'Revêtement — cuir glove');
  assert.equal(finishGroupLabel({group: 'assise/dossier', material: 'Tissu outdoor'}), 'Assise et dossier — tissu Outdoor');
});

test('does not discard editorial or future unknown material categories', () => {
  assert.equal(finishGroupLabel({group: 'Panneau spécial', materialGroup: 'Nuancier nouveau', material: 'Finition personnalisée'}), 'Panneau spécial — Nuancier nouveau — Finition personnalisée');
  assert.equal(finishGroupLabel({group: 'assise', materialGroup: 'Tissu Canapé', material: 'T99'}), 'Assise — Tissu Canapé — T99');
  assert.equal(finishGroupLabel({materialGroup: 'Nuancier nouveau'}), 'Nuancier nouveau');
  assert.equal(finishGroupLabel({}), '');
});

test('corrects only the identified GFM71 spelling error and preserves the source object', () => {
  const source = Object.freeze({name: 'GFM71 gaufré balnc', code: 'GFM71'});
  assert.equal(finishNameLabel(source), 'GFM71 gaufré blanc');
  assert.equal(source.name, 'GFM71 gaufré balnc');
  assert.equal(finishNameLabel({name: 'GFM71 gaufré balnc', code: 'CUSTOM'}), 'GFM71 gaufré balnc');
  assert.equal(finishNameLabel({name: 'GFM71 finition personnalisée', code: 'GFM71'}), 'GFM71 finition personnalisée');
});

test('shows each finish reference once without confusing a code with a substring', () => {
  assert.equal(finishHasSeparateCode({name: 'GFM71 gaufré balnc', code: 'GFM71'}), false);
  assert.equal(finishHasSeparateCode({name: 'WB100', code: 'WB100'}), false);
  assert.equal(finishHasSeparateCode({name: 'GFM710 graphite', code: 'GFM71'}), true);
  assert.equal(finishHasSeparateCode({name: 'Blanc', code: 'GFM71'}), true);
  assert.equal(finishHasSeparateCode({code: 'GFM71'}), true);
  assert.equal(finishHasSeparateCode({name: 'Brushed Bronze'}), false);
});
