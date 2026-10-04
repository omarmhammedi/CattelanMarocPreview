#!/usr/bin/env node
// Builds docs/copy-drafts/apply/manifest.json: for each CMS item, the exact field values taken from the approved
// drafts in docs/copy-drafts/. Section keys, buttons and links are kept from the current CMS structure (SKELETON);
// only the text changes. Used by the apply step described in docs/copy-apply-process.md.
//   node scripts/build-copy-manifest.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DRAFTS = join(ROOT, 'docs/copy-drafts');
const DATE = '2026-10-04';
const WA = 'https://wa.me/212771105490';

export function slots(name) {
  const md = readFileSync(join(DRAFTS, `${name}-${DATE}.md`), 'utf8');
  const body = md.split(/^## Page copy\s*$/m)[1].split(/^## (?!#)/m)[0];
  const out = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
    if (m) out[m[1].trim()] = m[2].replace(/\s*→.*$/, '').trim();
  }
  return out;
}
const need = (s, k) => { if (!(k in s) || !s[k]) throw new Error(`missing slot ${k}`); return s[k]; };
const sec = (section_key, heading = '', text = '', cta_label = '', cta_href = '') => ({ section_key, heading, text, cta_label, cta_href });
const md2 = (pairs) => pairs.map(([h, t]) => `## ${h}\n\n${t}\n`).join('\n');

function aPropos() {
  const md = readFileSync(join(DRAFTS, `a-propos-${DATE}.md`), 'utf8');
  const body = md.split(/^## Page copy\s*$/m)[1].split(/^## (?!#)/m)[0];
  const label = (k) => (body.match(new RegExp(`^\\*\\*${k}[^*]*:\\*\\*\\s*([\\s\\S]*?)(?=\\n\\n)`, 'm')) || [])[1]?.replace(/\s+/g, ' ').trim();
  const blocks = body.split(/^### /m).slice(1).map((chunk) => {
    const [head, ...rest] = chunk.split('\n');
    const text = rest.join('\n').split(/^\*\*/m)[0];
    return { heading: head.trim(), paras: text.trim().split(/\n\s*\n/).map((p) => p.replace(/\s+/g, ' ').trim()).filter(Boolean) };
  });
  const keys = ['founders', 'matter', 'milan', 'showroom', 'advice'];
  if (blocks.length !== keys.length) throw new Error(`a-propos: ${blocks.length} blocks`);
  const sections = [];
  blocks.forEach((b, i) => {
    b.paras.forEach((p, j) => {
      const last = j === b.paras.length - 1;
      const cta = keys[i] === 'advice' && last ? ['Commande et livraison', '/votre-projet/'] : ['', ''];
      sections.push(sec(j ? `${keys[i]}_${j + 1}` : keys[i], j ? '' : b.heading, p, ...cta));
    });
  });
  return { eyebrow: label('Eyebrow'), title: label('H1'), intro: label('Intro'), sections, meta_description: label('Meta description') };
}

export function build() {
  const items = [];
  const page = (slug, data, seo) => items.push({ collection: 'pages', slug, data, ...(seo ? { seo } : {}) });

  let s = slots('home');
  page('home', {
    sections: [
      { ...sec('brand', need(s, 'brand.heading'), need(s, 'brand.text')), display_heading: '' },
      { ...sec('collections', need(s, 'collections.heading'), need(s, 'collections.text'), 'Voir les collections', '/collections/'), display_heading: '' },
      { ...sec('showroom', '', need(s, 'showroom.text'), 'Voir le showroom', '/showroom-casablanca/'), display_heading: '' },
      { ...sec('catalogue', need(s, 'catalogue.heading'), '', 'Télécharger le catalogue', '/catalogue/'), display_heading: '' },
      { ...sec('journal', need(s, 'journal.heading'), need(s, 'journal.text'), 'Voir tous les guides', '/journal/'), display_heading: '' },
    ],
    brand_caption: need(s, 'brand.caption'), showroom_invitation: need(s, 'showroom.label'),
    seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description'),
  });

  page('a-propos', aPropos());

  s = slots('showroom');
  page('showroom-casablanca', {
    title: need(s, 'title'), intro: need(s, 'intro'),
    content: md2([[need(s, 'body.1.heading'), need(s, 'body.1.text')], [need(s, 'body.2.heading'), need(s, 'body.2.text')]]),
    sections: [
      sec('cities', need(s, 'cities.heading'), need(s, 'cities.text')),
      ...[1, 2, 3, 4].map((n) => sec(`faq_${n}`, need(s, `faq.${n}.question`), need(s, `faq.${n}.answer`))),
      sec('contact_note', '', need(s, 'contact.note')),
    ],
    seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description'),
  });

  s = slots('collections');
  page('collections', {
    title: need(s, 'title'), intro: need(s, 'intro'),
    sections: [
      sec('contact', '', need(s, 'contact.text'), 'Nous écrire', WA),
      sec('professional', 'Architectes et décorateurs', need(s, 'professional.text'), 'Voir les services professionnels', '/professionnels/'),
    ],
    seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description'),
  });

  s = slots('catalogue');
  page('catalogue', {
    title: need(s, 'title'), intro: need(s, 'intro'),
    sections: [sec('contact', need(s, 'contact.heading'), need(s, 'contact.text'), 'Nous écrire', WA)],
    seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description'),
  }, { title: need(s, 'seo_title') });

  s = slots('journal');
  page('journal', {
    title: need(s, 'title'), intro: need(s, 'intro'),
    sections: [sec('catalogue', need(s, 'catalogue.heading'), '', 'Télécharger le catalogue', '/catalogue/')],
    seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description'),
  });

  s = slots('votre-projet');
  page('votre-projet', {
    title: need(s, 'title'), intro: need(s, 'intro'),
    content: md2([1, 2, 3].map((n) => [need(s, `situation.${n}.heading`), need(s, `situation.${n}.text`)])),
    sections: [
      ...[1, 2, 3, 4, 5].map((n) => sec(`step_${n}`, need(s, `step.${n}.heading`), need(s, `step.${n}.text`))),
      sec('payment', need(s, 'payment.heading'), need(s, 'payment.text')),
      sec('cancellation', need(s, 'cancellation.heading'), need(s, 'cancellation.text')),
    ],
    seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description'),
  });

  s = slots('professionnels');
  page('professionnels', {
    intro: need(s, 'intro'),
    sections: [
      sec('files', need(s, 'files.heading'), need(s, 'files.text')),
      sec('catalogue', need(s, 'finishes.heading'), need(s, 'finishes.text')),
      sec('clients', need(s, 'clients.heading'), need(s, 'clients.text')),
      sec('terms', need(s, 'terms.heading'), '', 'Demander les conditions professionnelles', '/professionnels/#demande'),
      sec('follow_up', need(s, 'follow_up.heading'), need(s, 'follow_up.text')),
      sec('order', need(s, 'order.heading'), need(s, 'order.text')),
      sec('projects', need(s, 'projects.heading'), need(s, 'projects.text')),
    ],
    seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description'),
  });

  s = slots('sur-mesure');
  page('sur-mesure', {
    title: need(s, 'title'), intro: need(s, 'intro'),
    sections: [
      sec('options', 'Options par modèle', ['options.format', 'options.plateau', 'options.piètement', 'options.revêtement'].map((k) => need(s, k)).join('\n')),
      sec('samples', need(s, 'samples.heading'), need(s, 'samples.text')),
      sec('lead_time', need(s, 'lead_time.heading'), need(s, 'lead_time.text')),
      sec('materials', need(s, 'materials.heading'), need(s, 'materials.text'), 'Lire l’article', '/journal/ceramique-verre-bois-choisir-finition-meuble/'),
    ],
    seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description'),
  });

  s = slots('faq');
  const FAQ_KEYS = ['faq_products_1', 'faq_products_2', 'faq_products_3', 'faq_custom_1', 'faq_custom_2', 'faq_custom_3', 'faq_order_1', 'faq_order_price', 'faq_order_2', 'faq_order_3', 'faq_delivery_1', 'faq_delivery_2', 'faq_delivery_3', 'faq_delivery_4', 'faq_showroom_1', 'faq_showroom_2', 'faq_pro_1', 'faq_pro_2', 'faq_pro_3', 'faq_practical_1', 'faq_practical_2', 'faq_practical_3'];
  const GROUP_BEFORE = { 1: 1, 4: 2, 7: 3, 11: 4, 15: 5, 17: 6, 20: 7 };
  const faq = [];
  FAQ_KEYS.forEach((key, i) => {
    const n = i + 1;
    if (GROUP_BEFORE[n]) faq.push(sec('group', need(s, `group.${GROUP_BEFORE[n]}.heading`)));
    const cta = n === 17 ? ['Architectes et décorateurs', '/professionnels/'] : ['', ''];
    faq.push(sec(key, need(s, `faq.${n}.question`), need(s, `faq.${n}.answer`), ...cta));
  });
  page('faq', { intro: need(s, 'intro'), sections: faq, seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description') });

  const FAMILIES = ['tables', 'chaises-tabourets', 'canapes-fauteuils', 'tables-basses', 'buffets-bibliotheques', 'consoles-miroirs', 'luminaires', 'mobilier-exterieur'];
  const FAMILY_SEO_PANEL = new Set(['tables', 'chaises-tabourets', 'canapes-fauteuils', 'buffets-bibliotheques', 'luminaires', 'mobilier-exterieur']);
  for (const f of FAMILIES) {
    s = slots(`famille-${f}`);
    const pairs = [];
    for (let n = 1; `content.${n}.heading` in s; n++) pairs.push([s[`content.${n}.heading`], need(s, `content.${n}.text`)]);
    items.push({
      collection: 'families', slug: f,
      data: { title: need(s, 'title'), card_text: need(s, 'card_text'), intro: need(s, 'intro'), content: md2(pairs), meta_description: need(s, 'meta_description') },
      ...(FAMILY_SEO_PANEL.has(f) ? { seo: { description: need(s, 'meta_description') } } : {}),
    });
  }

  const GUIDES = {
    'guide-table-forme-taille': 'choisir-forme-proportions-table-salle-a-manger',
    'guide-table-chaises': 'associer-table-chaises-salle-a-manger',
    'guide-ceramique-verre-bois': 'ceramique-verre-bois-choisir-finition-meuble',
    'guide-salon-canape-fauteuil': 'composer-salon-canape-fauteuil',
    'guide-buffet-bibliotheque': 'choisir-buffet-bibliotheque-salon',
  };
  for (const [draft, slug] of Object.entries(GUIDES)) {
    s = slots(draft);
    items.push({
      collection: 'posts', slug,
      data: {
        title: need(s, 'title'), excerpt: need(s, 'excerpt'),
        content: md2([1, 2, 3, 4].map((n) => [need(s, `section.${n}.heading`), need(s, `section.${n}.text`)])),
        cta_text: need(s, 'cta_text'), seo_title: need(s, 'seo_title'), meta_description: need(s, 'meta_description'),
      },
      ...(slug === 'ceramique-verre-bois-choisir-finition-meuble' ? { seo: { title: need(s, 'seo_title') } } : {}),
    });
  }

  for (const f of FAMILIES) {
    s = slots(`modeles-${f}`);
    const models = [...new Set(Object.keys(s).map((k) => k.split('.')[0]))];
    for (const m of models) items.push({ collection: 'models', slug: m, data: { description: need(s, `${m}.description`), content: need(s, `${m}.content`) } });
  }

  const bad = JSON.stringify(items).match(/\[NEED[^\]]*\]/);
  if (bad) throw new Error(`placeholder left: ${bad[0]}`);
  return items;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const items = build();
  mkdirSync(join(DRAFTS, 'apply'), { recursive: true });
  writeFileSync(join(DRAFTS, 'apply/manifest.json'), JSON.stringify({ generated: new Date().toISOString(), items }, null, 1));
  const by = items.reduce((a, i) => ((a[i.collection] = (a[i.collection] || 0) + 1), a), {});
  console.log('manifest:', items.length, 'items', JSON.stringify(by));
}
