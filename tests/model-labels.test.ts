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

test('names parts as the editorial audit asks, per model where needed', () => {
  assert.equal(finishGroupLabel({group: 'assise', materialGroup: 'Tissu Chaise/Lit', material: 'micro-nubuck'}), 'Revêtement — micro-nubuck');
  assert.equal(finishGroupLabel({group: 'revêtement', materialGroup: 'Tissu Chaise/Lit', material: 'micro-nubuck'}), 'Revêtement — micro-nubuck');
  assert.equal(finishGroupLabel({group: 'pieds', material: 'metals'}), 'Piètement — métal');
  assert.equal(finishGroupLabel({group: 'ballast', material: 'metals'}, 'nautilus'), 'Lest — métal');
  assert.equal(finishGroupLabel({group: 'ballast', material: 'metals'}, 'botero-keramik-round'), 'Plaque stabilisatrice — métal');
  assert.equal(finishGroupLabel({group: 'pièces', material: 'céramique KS'}, 'botero-ker-wood-round'), 'Disque central — céramique KS');
  assert.equal(finishGroupLabel({group: 'pièces', material: 'bois'}, 'amsterdam'), 'Inserts — bois');
  assert.equal(finishGroupLabel({group: 'structure', material: 'Argile'}, 'botero-argile'), 'Plateau et piètement — finition Argile');
  assert.equal(finishGroupLabel({group: 'base', material: 'Argile'}, 'botero-wood-round'), 'Piètement — finition Argile');
  assert.equal(finishGroupLabel({material: 'verre'}, 'cosmos'), 'Verre miroité');
  assert.equal(finishGroupLabel({group: 'top', material: 'verre'}, 'amsterdam'), 'Plateau — verre');
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

test('writes imported finish names in French, capitalised, without a repeated code', () => {
  assert.equal(finishNameLabel({name: 'iron grey satiné'}), 'Gris fer satiné');
  assert.equal(finishNameLabel({name: 'oxybrass'}), 'Oxybrass');
  assert.equal(finishNameLabel({name: 'miroité bronze'}), 'Miroité bronze');
  assert.equal(finishNameLabel({name: 'NC noyer Canaletto'}), 'Noyer Canaletto');
  assert.equal(finishNameLabel({name: 'KM05 Golden Calacatta opaque', code: 'KM05'}), 'KM05 Golden Calacatta opaque');
  assert.equal(finishGroupLabel({group: 'pièces', material: 'metals'}, 'bloom'), 'Raccords — métal');
});

test('shows each finish reference once without confusing a code with a substring', () => {
  assert.equal(finishHasSeparateCode({name: 'GFM71 gaufré balnc', code: 'GFM71'}), false);
  assert.equal(finishHasSeparateCode({name: 'WB100', code: 'WB100'}), false);
  assert.equal(finishHasSeparateCode({name: 'GFM710 graphite', code: 'GFM71'}), true);
  assert.equal(finishHasSeparateCode({name: 'Blanc', code: 'GFM71'}), true);
  assert.equal(finishHasSeparateCode({code: 'GFM71'}), true);
  assert.equal(finishHasSeparateCode({name: 'Brushed Bronze'}), false);
});
