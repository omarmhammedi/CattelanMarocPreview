import test from 'node:test';
import assert from 'node:assert/strict';
import { extractBlocks, lintBlocks, loadAllow } from '../scripts/copy-lint.mjs';

const lint = (md, opts = { allow: [] }, name = 'x.md') => lintBlocks(extractBlocks(name, md), opts);
const ids = (md, level) => lint(md).filter((f) => !level || f.level === level).map((f) => f.id);

test('clean story-first copy passes', () => {
  const md = "Giorgio Cattelan est le dernier de sept frères. Il a grandi dans l'atelier de son père, entouré de bois.";
  assert.deepEqual(lint(md), []);
});

test('cliché words are blocking', () => {
  assert.ok(ids('Un meuble raffiné et élégant, une pièce iconique.', 'block').includes('cliche'));
  assert.ok(ids('Venez découvrir le showroom.', 'block').includes('cliche'));
});

test('AI tells are blocking', () => {
  assert.ok(ids("Ce n'est pas une table, c'est une histoire.").includes('contrast-reveal'));
  assert.ok(ids('Sans montage, sans attente, sans frais.').includes('negation-list'));
  assert.ok(ids('Le résultat : une table.').includes('colon-reveal'));
  assert.ok(ids('Une table pour huit ? Oui, en céramique.').includes('self-answered-question'));
  assert.ok(ids('Venez nombreux !').includes('exclamation'));
});

test('headings: no order, no vous, questions allowed', () => {
  assert.ok(ids('# Découvrez le showroom').includes('heading-order'));
  assert.ok(ids('# Vous allez adorer la céramique').includes('heading-vous'));
  assert.deepEqual(ids('# Comment vous contacter ?', 'block'), []);
  assert.deepEqual(ids('# Cattelan Italia, de la Vénétie à Casablanca', 'block'), []);
});

test('dashes block in short copy, only review in body', () => {
  assert.ok(ids('# Tables — verre et céramique', 'block').includes('dash-short'));
  assert.ok(ids('**SEO title:** Tables – Cattelan', 'block').includes('dash-short'));
  assert.deepEqual(ids('Une table — en verre.', 'block'), []);
  assert.ok(ids('Une table — en verre.', 'review').includes('dash-body'));
});

test('only the website phone number is accepted', () => {
  assert.deepEqual(ids('Écrivez-nous au +212 771 105 490.', 'block'), []);
  assert.deepEqual(ids('Appelez le 07 71 10 54 90.', 'block'), []);
  assert.ok(ids('Appelez le +212 661 49 62 66.', 'block').includes('wrong-phone'));
  assert.ok(ids('Appelez le 06 61 49 62 66.', 'block').includes('wrong-phone'));
});

test('fact rules', () => {
  assert.ok(ids('Nous sommes représentant officiel de la marque.', 'block').includes('official-status'));
  assert.ok(ids('Chaque pièce est fabriquée en 10 à 12 semaines.', 'block').includes('delay-wording'));
  assert.deepEqual(ids('Livrée 10 à 12 semaines au maximum après la validation de la commande.', 'block'), []);
  assert.ok(ids('Le bahut mesure 46 cm.', 'block').includes('term-bahut'));
  assert.ok(ids('Un showroom de 400 m2.', 'block').includes('unit-m2'));
  assert.deepEqual(ids('Un showroom de 400 m².', 'block'), []);
});

test('review rules: vague quantity, warranty, repeat, long sentence', () => {
  assert.ok(ids('Près de quarante modèles.', 'review').includes('vague-quantity'));
  assert.deepEqual(ids('Installé à Carrè, près de Vicence.', 'review'), []);
  assert.ok(ids('Une garantie de deux ans.', 'review').includes('warranty'));
  assert.ok(ids('La céramique modelée recouvre la base de la table.\n\nLa céramique modelée recouvre la base de la table.', 'review').includes('repeat'));
  const long = Array.from({ length: 30 }, (_, i) => `mot${i}`).join(' ') + '.';
  assert.ok(ids(long, 'review').includes('long-sentence'));
});

test('allow-list suppresses a sourced vague quantity', () => {
  const md = 'La marque est présente dans plus de 140 pays.';
  assert.ok(ids(md, 'review').includes('vague-quantity'));
  assert.deepEqual(lint(md, { allow: loadAllow() }).filter((f) => f.id === 'vague-quantity'), []);
});

test('markdown drafts: only the Page copy section is checked', () => {
  const md = '# Draft\n\nNotes: raffiné!\n\n## Page copy\n\n**H1:** Cattelan Italia, de la Vénétie à Casablanca\n\n**Intro:** Des tables en marbre et en verre.\n\n## Alternatives\n\nUne option élégante.\n';
  assert.deepEqual(lint(md), []);
  const blocks = extractBlocks('x.md', md);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'body');
});

test('JSON: blocks format and CMS-style object', () => {
  const blocks = JSON.stringify([{ page: '/', tag: 'h2', text: 'Découvrez nos modèles' }, { page: '/', tag: 'p', text: 'Une table.' }]);
  assert.ok(lint(blocks, { allow: [] }, 'b.json').some((f) => f.id === 'heading-order'));
  const cms = JSON.stringify({ title: 'Showroom', intro: 'Un espace raffiné.', sections: [{ heading: 'Votre projet', text: 'Du bois.', cta_label: 'Nous écrire' }], seo_title: 'Showroom — Cattelan' });
  const got = lint(cms, { allow: [] }, 'c.json').map((f) => f.id);
  for (const id of ['cliche', 'heading-vous', 'dash-short']) assert.ok(got.includes(id), id);
});

test('slot names: question is a heading, button is a button', () => {
  const md = '## Page copy\n\n**faq.4.question:** Découvrez-vous les prix ?\n\n**home.button:** Voir les collections\n';
  const blocks = extractBlocks('x.md', md);
  assert.equal(blocks[0].type, 'heading');
  assert.equal(blocks[1].type, 'button');
});

test('brief checks: word limits, fixed items, missing slots', async () => {
  const { parseBrief, checkAgainstBrief } = await import('../scripts/copy-lint.mjs');
  const brief = parseBrief([
    '| Slot | Role | Limit | Facts |', '|---|---|---|---|',
    '| `title` | **FIXED** | | "Questions fréquentes" |',
    '| `intro` | Says what | 5 words | X |',
    '| `a.heading`, `a.text` | Pair | 3 words; 4 words | X |',
    '| `seo_title` | Search | 20 characters | X |',
    '- `glenn.description` : 45 mots au plus.',
  ].join('\n'));
  const md = '## Page copy\n\n**title:** Questions fréquentes\n\n**intro:** Un deux trois quatre cinq six.\n\n**a.heading:** Le miroir Glenn\n\n**a.text:** Un deux trois quatre.\n\n**seo_title:** Un titre beaucoup trop long pour la recherche\n';
  const got = checkAgainstBrief(extractBlocks('x.md', md), brief).map((f) => `${f.id}:${f.match}`);
  assert.deepEqual(got.sort(), ['missing-slot:glenn.description', 'over-limit:intro', 'over-limit:seo_title'].sort());
  const changed = checkAgainstBrief(extractBlocks('x.md', '## Page copy\n\n**title:** FAQ\n'), brief).map((f) => f.id);
  assert.ok(changed.includes('fixed-changed'));
});

test('style pass rules: site-meta, count headings, abstract sentences, negative wording', () => {
  assert.ok(ids('Chaque modèle a sa page, avec ses formats.', 'review').includes('site-meta'));
  assert.ok(ids('# 39 modèles en huit familles', 'review').includes('heading-count'));
  assert.deepEqual(ids('# De la table au luminaire', 'review'), []);
  assert.deepEqual(ids('# 60 cm de plateau par convive', 'review'), []);
  assert.ok(ids('Le choix devient plus simple et plus juste.', 'review').includes('abstract-sentence'));
  assert.deepEqual(ids('Au showroom, céramiques et cuirs se comparent en main.', 'review'), []);
  assert.deepEqual(ids('Giorgio Cattelan ouvre son entreprise.', 'review'), []);
  assert.ok(ids('Y compris les pièces absentes du showroom.', 'review').includes('negative-wording'));
});
