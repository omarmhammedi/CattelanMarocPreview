import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getSite } from '../lib/content';

// Services and ordering terms come from the project FAQ; contact details stay in the CMS.
const pages = [
  ['Collections', '/collections/'], ['Sur-mesure et matières', '/sur-mesure/'], ['Showroom de Casablanca', '/showroom-casablanca/'],
  ['Votre projet', '/votre-projet/'], ['Professionnels', '/professionnels/'], ['Questions fréquentes', '/faq/'],
  ['À propos', '/a-propos/'], ['Catalogue', '/catalogue/'], ['Journal', '/journal/'],
];

export const GET: APIRoute = async ({ url }) => {
  const site = await getSite();
  const origin = site.settings?.url || url.origin;
  const line = (label: string, value: unknown) => String(value || '').trim() ? [`- ${label} : ${String(value).trim().replace(/\s*\n\s*/gu, ' ; ')}`] : [];
  const text = [
    `# ${site.name}`, '',
    `> ${site.name}, showroom monomarque Cattelan Italia au Triangle d’Or, Casablanca.`, '',
    '## Showroom',
    ...line('Adresse', site.address), ...line('Horaires', site.hours),
    ...line('Téléphone et WhatsApp', site.phone), ...line('E-mail', site.publicEmail),
    '- Visite libre ou sur rendez-vous. Service de voiturier ; pas de parking privé.', '',
    '## Services',
    '- Tout le catalogue Cattelan Italia peut être commandé et personnalisé : dimensions, matériaux, finitions, bois, céramiques, marbres, métaux, tissus et cuirs.',
    '- Mobilier conçu et fabriqué en Italie. Tous les échantillons de matières sont au showroom.',
    '- Conseil en aménagement et projets complets ; projets résidentiels, hôteliers et commerciaux.',
    '- Livraison partout au Maroc, offerte à Casablanca ; autres villes selon la destination. Installation incluse.', '',
    '## Commander',
    '- Conseil, devis détaillé, validation avec un acompte de 50 %, fabrication en Italie en 10 à 12 semaines, livraison et installation.',
    '- Le solde est réglé avant la livraison. Paiement par carte bancaire, virement ou chèque.',
    '- Une commande validée ne peut être ni échangée ni remboursée.', '',
    '## Pages',
    ...pages.map(([label, path]) => `- [${label}](${new URL(path, origin).href})`), '',
  ].join('\n');
  const indexable = (env as Record<string, unknown>).SITE_INDEXABLE === 'true';
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...(indexable ? {} : { 'X-Robots-Tag': 'noindex' }) } });
};
