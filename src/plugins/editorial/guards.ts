/** Policies for the fixed routes and operational text used by Cattelan. */
import { editorialData, editorialCopyProblem, EDITORIAL_COPY_FIELDS, LEGACY_REQUIRED_GLOBAL_LABELS } from '../../lib/editorial-storage.mjs';
import { validatePrivacyContent } from '../../lib/privacy-content.mjs';

export const PAGE_IDENTITIES: Record<string, string> = {
  home: 'home', collections: 'collections', showroom: 'showroom-casablanca', catalogue: 'catalogue',
  journal: 'journal', 'sur-mesure': 'sur-mesure', professionnels: 'professionnels', 'a-propos': 'a-propos',
  'votre-projet': 'votre-projet', faq: 'faq', 'mentions-legales': 'mentions-legales', confidentialite: 'confidentialite',
};
export const REQUIRED_GLOBAL_LABELS = [...LEGACY_REQUIRED_GLOBAL_LABELS, ...EDITORIAL_COPY_FIELDS.filter(field => field.required).map(field => field.slug)];
const HOME_SCENES = new Set(['brand', 'collections', 'showroom', 'catalogue', 'journal']);
export const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Validate changed fields without turning an unrelated partial update into a content rewrite. */
export function dataProblem(collection: string, data: Record<string, unknown>, previous: Record<string, unknown> = {}): string | undefined {
  if (collection === 'site_content') {
    if (Object.hasOwn(data, 'editorial_copy')) {
      const copyIssue = editorialCopyProblem(data.editorial_copy);
      if (copyIssue) return copyIssue;
      data = editorialData(data);
    }
    for (const key of REQUIRED_GLOBAL_LABELS) {
      if (Object.hasOwn(data, key) && (typeof data[key] !== 'string' || !data[key].trim())) return `Le champ « ${key} » doit contenir un libellé. Une commande ou un message de formulaire ne peut pas être vide.`;
    }
    if (Object.hasOwn(data, 'public_email') && (typeof data.public_email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(data.public_email) || data.public_email.length > 320)) return 'L’adresse e-mail publique doit être une adresse complète valide.';
    if (Object.hasOwn(data, 'analytics_token') && data.analytics_token != null && data.analytics_token !== '' && (typeof data.analytics_token !== 'string' || !/^[a-f0-9]{32}$/iu.test(data.analytics_token))) return 'Le jeton Cloudflare Web Analytics doit contenir exactement 32 caractères hexadécimaux, sans espace. Videz-le pour désactiver la mesure.';
  }
  if (collection === 'catalogues' && Object.hasOwn(data, 'download_label') && (typeof data.download_label !== 'string' || !data.download_label.trim())) return 'Le libellé du téléchargement ne peut pas être vide.';
  if (collection !== 'pages') return;
  const key = data.route_key ?? previous.route_key;
  if (Object.hasOwn(data, 'route_key')) {
    if (typeof key !== 'string' || !PAGE_IDENTITIES[key]) return 'Cette page ne correspond à aucun parcours du site. Utilisez une identité de page prévue.';
    if (previous.route_key && previous.route_key !== key) return 'L’identité d’une page existante est protégée. Modifiez son contenu, pas son parcours.';
  }
  if (key === 'confidentialite' && Object.hasOwn(data, 'content')) {
    const privacyIssue = validatePrivacyContent(data.content);
    if (privacyIssue) return privacyIssue;
  }
  if (key === 'home' && Array.isArray(data.sections)) {
    const seen = new Set<string>();
    for (const row of data.sections) {
      const sectionKey = record(row).section_key;
      if (typeof sectionKey !== 'string' || !HOME_SCENES.has(sectionKey)) continue;
      if (seen.has(sectionKey)) return `L’accueil ne peut contenir qu’une section « ${sectionKey} ». Modifiez la section existante ou donnez un autre repère à votre section supplémentaire.`;
      seen.add(sectionKey);
    }
  }
}

/** Publication validates staged slugs when the native operation actually uses the draft path.
 * Slug/status-only update bypasses require the request guard as well. */
export function publicationProblem(collection: string, item: Record<string, unknown>): string | undefined {
  const data = collection === 'site_content' ? editorialData(record(item.data)) : record(item.data);
  if (collection === 'site_content' && item.slug !== 'global') return 'La configuration commune doit conserver l’identifiant « global ». Les autres entrées ne sont pas utilisées par le site.';
  if (collection === 'pages') {
    const key = typeof data.route_key === 'string' ? data.route_key : '';
    if (!PAGE_IDENTITIES[key] || item.slug !== PAGE_IDENTITIES[key]) return `Cette page doit conserver l’identifiant « ${PAGE_IDENTITIES[key] || 'inconnu'} » correspondant à son parcours. Rétablissez-le avant de publier.`;
    if (key === 'confidentialite') {
      const privacyIssue = validatePrivacyContent(data.content);
      if (privacyIssue) return privacyIssue;
    }
  }
  if (collection === 'site_content') {
    for (const key of REQUIRED_GLOBAL_LABELS) {
      if (!Object.hasOwn(data, key)) return `Complétez le champ obligatoire « ${key} » avant de publier la configuration.`;
    }
  }
  if (collection === 'catalogues' && !Object.hasOwn(data, 'download_label')) return 'Complétez le libellé du téléchargement avant de publier le catalogue.';
  return dataProblem(collection, data);
}

export function protectsPublicRoute(collection: string, item: Record<string, unknown> | null): boolean {
  if (!item) return false;
  if (collection === 'site_content') return item.slug === 'global';
  return collection === 'pages' && (Object.values(PAGE_IDENTITIES).includes(String(item.slug)) || Object.hasOwn(PAGE_IDENTITIES, String(record(item.data).route_key)));
}
