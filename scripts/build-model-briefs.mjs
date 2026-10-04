#!/usr/bin/env node
// Builds docs/copy-briefs/models/<family>.md from docs/copy-briefs/data/models-facts.json.
// The data file holds numbers, finish names and short design traits only (no prose), so a brief built from it
// cannot carry the wording of the current site.   node scripts/build-model-briefs.mjs

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'docs/copy-briefs/data/models-facts.json');
const OUT = join(ROOT, 'docs/copy-briefs/models');

const FAMILY_TITLE = {
  tables: 'Tables et salles à manger',
  'chaises-tabourets': 'Chaises et tabourets',
  'canapes-fauteuils': 'Canapés, salons et fauteuils',
  'tables-basses': 'Tables basses et d’appoint',
  'buffets-bibliotheques': 'Buffets et bibliothèques',
  'consoles-miroirs': 'Consoles et miroirs',
  luminaires: 'Luminaires et lustres',
  'mobilier-exterieur': 'Mobilier extérieur',
};
const MATERIAL_FR = { metals: 'métaux', 'Tissu chaises/lits': 'tissu', 'simili cuir': 'similicuir', 'cuir mince glove': 'cuir Glove' };
const fr = (m) => MATERIAL_FR[m] ?? m;

export function modelSection(m) {
  const dims = m.dimensions.length
    ? m.dimensions.map((d) => `- ${d.label} : ${d.value}`).join('\n')
    : '- (aucune dimension saisie : ne pas en inventer)';
  const fin = m.finishes.length
    ? m.finishes
        .map((e) => `- ${e.group} · ${fr(e.material)} · ${e.count}${e.names ? ' : ' + e.names.join(', ') : ''}`)
        .join('\n')
    : '- (aucune finition saisie)';
  return `## ${m.title}  \`${m.slug}\`

**Slots**
- \`${m.slug}.description\` : 45 mots au plus. Identité du modèle, variante, chiffres clés. Sert aussi sur les cartes et dans les métadonnées.
- \`${m.slug}.content\` : 60 mots au plus. Construction, finitions, options. Ne répète jamais la phrase de \`description\`.

**Traits (faits)**
${m.traits.map((t) => `- ${t}`).join('\n') || '- (aucun)'}

**Dimensions (données)**
${dims}

**Finitions (données : groupe · matière · nombre)**
${fin}

**Fiche technique :** ${m.technical_sheet ? 'oui, téléchargeable sur la page' : 'non'}
`;
}

export function familyFile(slug, models) {
  return `# Brief modèles : ${FAMILY_TITLE[slug]} (${models.length} modèle${models.length > 1 ? 's' : ''})

Généré par \`scripts/build-model-briefs.mjs\` à partir de \`docs/copy-briefs/data/models-facts.json\`. Ne pas modifier à la main.
Règles communes : voir \`docs/copy-briefs/models/README.md\`. Format de sortie : \`docs/copy-briefs/README.md\`.

${models.map(modelSection).join('\n')}`;
}

export function build() {
  const d = JSON.parse(readFileSync(DATA, 'utf8'));
  mkdirSync(OUT, { recursive: true });
  const written = [];
  for (const [slug, slugs] of Object.entries(d.families)) {
    const models = slugs.map((s) => d.models.find((m) => m.slug === s)).filter(Boolean);
    if (models.length !== slugs.length) throw new Error(`Missing model in family ${slug}`);
    writeFileSync(join(OUT, `${slug}.md`), familyFile(slug, models));
    written.push(`${slug} (${models.length})`);
  }
  return written;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) console.log('Written:', build().join(', '));
