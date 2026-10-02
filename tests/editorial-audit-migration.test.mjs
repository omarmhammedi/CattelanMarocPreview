import assert from 'node:assert/strict';
import test from 'node:test';
import { applyRule, itemChange } from '../scripts/migrations/0024-editorial-audit.mjs';

const block = text => ({ _type: 'block', _key: text.slice(0, 4), style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 's', text, marks: [] }] });

test('a whole field is replaced or emptied only when it reads exactly as audited', () => {
  assert.deepEqual(applyRule({ intro: 'Ancien texte.' }, { from: ['Ancien texte.'], to: ['Nouveau.'] }).value, { intro: 'Nouveau.' });
  assert.deepEqual(applyRule({ intro: 'Ancien texte.' }, { from: ['Ancien texte.'], to: [] }).value, { intro: '' });
  assert.equal(applyRule({ intro: 'Ancien texte, retouché.' }, { from: ['Ancien texte.'], to: ['Nouveau.'] }).hits, 0);
  assert.equal(applyRule({ slug: 'Ancien texte.' }, { from: ['Ancien texte.'], to: [] }).hits, 0);
});

test('paragraph runs are replaced, split or deleted in portable text', () => {
  const body = [block('Un.'), block('Deux.'), block('Trois.')];
  const replaced = applyRule({ body }, { from: ['Un.', 'Deux.'], to: ['A.', 'B.', 'C.'] }).value.body;
  assert.deepEqual(replaced.map(item => item.children[0].text), ['A.', 'B.', 'C.', 'Trois.']);
  assert.equal(replaced[0].style, 'normal');
  const removed = applyRule({ body }, { from: ['Deux.'], to: [] }).value.body;
  assert.deepEqual(removed.map(item => item.children[0].text), ['Un.', 'Trois.']);
});

test('a sentence inside a longer text changes only with part', () => {
  const rule = { from: ['La composition s’étend alors de 158 à 256 cm.'], to: ['Selon la position des plateaux.'], part: true };
  assert.equal(applyRule({ body: [block('Bond ajoute un plateau. La composition s’étend alors de 158 à 256 cm.')] }, rule).value.body[0].children[0].text,
    'Bond ajoute un plateau. Selon la position des plateaux.');
});

test('rules that find nothing are reported, sections change only when they match', () => {
  const item = { data: { intro: 'X', sections: [{ section_key: 'brand', heading: 'La table, d’abord.', text: 'T' }] } };
  const change = itemChange(item, { rules: [{ id: 'R1', from: ['absent'], to: [] }],
    sections: { brand: { id: 'H03', expect: { heading: 'La table, d’abord.' }, heading: 'La maison Cattelan Italia' } } });
  assert.deepEqual(change.missing, ['R1']);
  assert.deepEqual(change.applied, ['H03']);
  assert.equal(change.data.sections[0].heading, 'La maison Cattelan Italia');
  assert.equal(item.data.sections[0].heading, 'La table, d’abord.');
});
