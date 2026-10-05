import { RETENTION_MS } from '../plugins/retention.ts';
import { readEditorialCopy } from './editorial-copy.mjs';

/** The information notice law 09-08 requires wherever personal data is collected. */
export const privacyPurposes = {
  catalogue: 'vous donner accès au catalogue',
  'rendez-vous': 'organiser votre rendez-vous',
  pro: 'répondre à votre projet',
  projet: 'préparer votre projet avec un conseiller',
} as const;

export function privacyNotice(form: keyof typeof privacyPurposes, email: string, cndpReceipt = '', controllerName = 'Racha Home'): string {
  const receipt = cndpReceipt.trim();
  return `${controllerName} traite ces informations pour ${privacyPurposes[form]} et les conserve ${retentionLabel()}. `
    + `Conformément à la loi n° 09-08, vous pouvez y accéder, les rectifier ou vous opposer à leur traitement en écrivant à ${email}.`
    + (receipt ? ` Ce traitement a été déclaré à la CNDP sous le n° ${receipt}.` : '');
}

/** Matches the actual deletion policy; editors cannot promise a different retention setting. */
export function retentionLabel(): string {
  const years = RETENTION_MS / (365 * 24 * 3_600_000);
  return years === 3 ? 'trois ans' : `${years} ans`;
}

type PrivacySite = {publicEmail?: string; address?: string; cndpReceipt?: string; analyticsToken?: string; editorial?: Record<string, string>};
export function privacyFacts(site: PrivacySite, emailEnabled: boolean, catalogueEmailEnabled = emailEnabled): Record<string, string> {
  const copy = readEditorialCopy(site.editorial);
  return {
    controller: copy.privacy_controller,
    controller_name: copy.privacy_controller_name,
    showroom_address: site.address || 'Adresse du showroom disponible auprès de notre équipe',
    contact_email: site.publicEmail || 'contact@cattelanitalia.ma',
    catalogue_email_purpose: catalogueEmailEnabled ? ' et vous l’envoyer par e-mail' : '',
    processors: `Cloudflare les traite pour notre compte pour l’hébergement du site${site.analyticsToken ? ' et la mesure d’audience' : ''}${emailEnabled ? ', et Resend pour l’envoi des e-mails' : ''}`,
    transfer_subject: emailEnabled ? 'Ces prestataires peuvent' : 'Ce prestataire peut',
    retention: retentionLabel(),
    analytics_notice: site.analyticsToken
      ? 'Ce site n’utilise aucun cookie. Il mesure sa fréquentation avec Cloudflare Web Analytics, qui ne dépose pas de cookie, ne crée pas d’identifiant et ne suit pas votre navigation d’un site à l’autre : seules des statistiques globales sont produites (pages vues, provenance, type d’appareil). Votre choix entre l’affichage clair et sombre est mémorisé dans votre navigateur.'
      : 'Ce site n’utilise ni cookie publicitaire ni outil de mesure d’audience. Votre choix entre l’affichage clair et sombre est mémorisé dans votre navigateur.',
    cndp_notice: `Le traitement des données issues de ce site fait l’objet d’une déclaration auprès de la CNDP${site.cndpReceipt ? `, récépissé n° ${site.cndpReceipt}` : ', en cours d’enregistrement'}.`,
    updated_at: copy.privacy_updated_label,
  };
}

/** Resolve only span text and the exact mailto slot. No HTML is evaluated or injected. */
export function renderPrivacyContent(content: unknown[], facts: Record<string, string>): unknown[] {
  const substitute = (text: string) => text.replace(/\{\{([^{}]+)\}\}/gu, (token, key: string) => Object.hasOwn(facts, key) ? facts[key] : token);
  return content.map(value => {
    if (!value || typeof value !== 'object') return value;
    const block = value as Record<string, any>;
    return {
      ...block,
      ...(Array.isArray(block.children) ? {children: block.children.map((span: any) => span?._type === 'span' && typeof span.text === 'string' ? {...span, text: substitute(span.text)} : span)} : {}),
      ...(Array.isArray(block.markDefs) ? {markDefs: block.markDefs.map((mark: any) => {
        if (mark?._type !== 'link' || mark.href !== 'mailto:{{contact_email}}') return mark;
        const email = facts.contact_email;
        return {...mark, href: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(email) ? `mailto:${email}` : '/showroom-casablanca/#showroom-contact'};
      })} : {}),
    };
  });
}
