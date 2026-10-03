import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSite } from '../lib/content';
import { SERVED_CITIES } from '../lib/structured-data';

// Services and ordering terms come from the project FAQ; contact details stay in the CMS.
const pages = [
  ['Collections', '/collections/'], ['Sur-mesure et matières', '/sur-mesure/'], ['Showroom de Casablanca', '/showroom-casablanca/'],
  ['Commande et livraison', '/votre-projet/'], ['Architectes & projets', '/professionnels/'], ['Questions fréquentes', '/faq/'],
  ['À propos', '/a-propos/'], ['Catalogue', '/catalogue/'], ['Journal', '/journal/'],
];

export const GET: APIRoute = async ({ url }) => {
  const site = await getSite();
  const origin = site.settings?.url || url.origin;
  const line = (label: string, value: unknown) => String(value || '').trim() ? [`- ${label} : ${String(value).trim().replace(/\s*\n\s*/gu, ' ; ')}`] : [];
  const text = [
    `# ${site.name}`, '',
    `> ${site.name}, showroom monomarque Cattelan Italia à Casablanca.`, '',
    '## Showroom',
    ...line('Adresse', site.address), ...line('Horaires', site.hours),
    ...line('Téléphone et WhatsApp', site.phone), ...line('E-mail', site.publicEmail),
    '- Visite libre ou sur rendez-vous. Service de voiturier ; pas de parking privé.', '',
    '## Services',
    '- Vente sur commande : chaque pièce est fabriquée en Italie aux dimensions et finitions choisies, et livrée 10 à 12 semaines au maximum après validation de la commande. Le showroom présente une sélection ; tout le catalogue se commande.',
    '- Tout le catalogue Cattelan Italia peut être commandé et personnalisé : dimensions, matériaux, finitions, bois, céramiques, marbres, métaux, tissus et cuirs.',
    '- Mobilier conçu et fabriqué en Italie. Tous les échantillons de matières sont au showroom.',
    '- Conseil en aménagement et projets complets ; projets résidentiels, hôteliers et commerciaux.',
    '- Livraison partout au Maroc, offerte à Casablanca ; autres villes selon la destination. Installation incluse.',
    `- Villes desservies en priorité : ${SERVED_CITIES.join(', ')}. Le choix peut se faire à distance (photos des échantillons, fiches techniques et devis sur WhatsApp).`, '',
    '## Architectes',
    '- Les architectes d’intérieur et décorateurs travaillent avec le showroom : fiches techniques, fichiers 2D et 3D sur demande, échantillons, rendez-vous avec leurs clients au showroom, conditions professionnelles sur demande.',
    '- Un particulier peut venir avec son architecte.', '',
    '## Commander',
    '- Conseil, devis détaillé, validation avec un acompte de 50 %, fabrication en Italie, livraison 10 à 12 semaines au maximum après validation de la commande, installation.',
    '- Le solde est réglé avant la livraison. Paiement par carte bancaire, virement ou chèque.',
    '',
    '## Pages',
    ...pages.map(([label, path]) => `- [${label}](${new URL(path, origin).href})`), '',
  ].join('\n');
  const indexable = (env as Record<string, unknown>).SITE_INDEXABLE === 'true';
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...(indexable ? {} : { 'X-Robots-Tag': 'noindex' }) } });
};
