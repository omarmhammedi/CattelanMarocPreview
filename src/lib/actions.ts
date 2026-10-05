/** The site's only calls to action, in order of importance. */
export const actions = {
  appointment: { label: 'Prendre rendez-vous', href: '/showroom-casablanca/#rendez-vous' },
  advisor: { label: 'Nous écrire', channel: 'WhatsApp' },
  catalogue: { label: 'Télécharger le catalogue', href: '/catalogue/' },
} as const;
export type ActionKey = keyof typeof actions;
type ActionSite = {navigationCopy?: Record<string,string>};

/** Text is editorial; implemented form/page destinations remain stable. */
export function actionsFor(site?: ActionSite) {
  const copy=site?.navigationCopy;
  return {
    appointment:{...actions.appointment,label:copy?.action_appointment_label ?? actions.appointment.label},
    advisor:{...actions.advisor,label:copy?.action_advisor_label ?? actions.advisor.label},
    catalogue:{...actions.catalogue,label:copy?.action_catalogue_label ?? actions.catalogue.label},
  };
}
export function generalMessageFor(site?: ActionSite) {
  return site?.navigationCopy?.whatsapp_general_message ?? generalWhatsappMessage;
}

export const generalWhatsappMessage = 'Bonjour, je souhaite des informations sur Cattelan Italia Maroc.';
export const professionalWhatsappMessage = 'Bonjour, je travaille sur un projet professionnel et souhaite échanger avec un conseiller.';

export const roomPhotoWhatsappMessage = 'Bonjour, je vous envoie une photo de ma pièce pour préparer mon projet.';

export function filesWhatsappMessage(model: string): string {
  return `Bonjour, je suis architecte et je souhaite recevoir les fichiers 2D et 3D du modèle ${model}.`;
}

export function modelWhatsappMessage(model: string, pageUrl: string): string {
  return `Bonjour, je souhaite un devis pour le modèle ${model} : ${pageUrl}`;
}

/** The CMS stores the bare chat link; each page adds its own message. Anything but a WhatsApp chat link is refused. */
export function whatsappHref(link: unknown, message: string): string | null {
  if (typeof link !== 'string') return null;
  let url: URL;
  try { url = new URL(link.trim()); } catch { return null; }
  if (url.protocol !== 'https:' || !['wa.me', 'api.whatsapp.com'].includes(url.hostname)) return null;
  url.searchParams.delete('text');
  const query = url.searchParams.toString();
  // WhatsApp documents %20 rather than + for spaces in the pre-filled text.
  return `${url.origin}${url.pathname}?${query ? `${query}&` : ''}text=${encodeURIComponent(message)}`;
}

export function isCatalogueLink(url: unknown): boolean {
  return typeof url === 'string' && url.replace(/\/+$/u, '') === actions.catalogue.href.replace(/\/+$/u, '');
}
