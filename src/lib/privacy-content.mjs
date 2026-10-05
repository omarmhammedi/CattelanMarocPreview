/** The legal text is a native Pages document. Facts are resolved at render time, not copied into prose. */
const block = (key, text, style = 'normal', extra = {}) => ({_type: 'block', _key: `privacy-${key}`, style, markDefs: [], children: [{_type: 'span', _key: `privacy-${key}-text`, text, marks: []}], ...extra});
const item = (key, text) => block(key, text, 'normal', {listItem: 'bullet', level: 1});
export const PRIVACY_PAGE = {
  id: 'page-confidentialite', slug: 'confidentialite', status: 'draft', locale: 'fr',
  data: {
    title: 'Confidentialité', route_key: 'confidentialite', eyebrow: 'Données personnelles',
    intro: '', seo_title: 'Confidentialité',
    meta_description: 'Les coordonnées recueillies par les formulaires de Cattelan Italia Maroc, leur usage, leur conservation et vos droits.',
    content: [
      block('controller-heading', 'Responsable du traitement', 'h2'),
      block('controller', '{{controller}} Showroom : {{showroom_address}}. Contact : {{contact_email}}.'),
      block('collection-heading', 'Ce que nous recueillons et pourquoi', 'h2'),
      item('catalogue', 'Télécharger le catalogue : nom et e-mail, numéro WhatsApp et ville facultatifs, pour vous donner accès au catalogue{{catalogue_email_purpose}}. Les nouveautés et invitations ne vous sont envoyées que si vous cochez la case prévue.'),
      item('appointment', 'Prendre rendez-vous : nom, numéro WhatsApp, jour et moment souhaités, ville et message facultatifs, pour organiser votre visite au showroom.'),
      item('project', 'Demande de conseil (Commande et livraison) : nom, WhatsApp, type de projet, ville et message facultatif, pour préparer votre projet avec un conseiller.'),
      item('pro', 'Contact professionnel : nom, cabinet ou société, WhatsApp, e-mail, type de projet, ville, étape, échéance, modèles envisagés et message facultatifs, pour répondre à votre projet.'),
      block('consent', 'Nous enregistrons aussi la page d’origine de la demande et, le cas échéant, le modèle consulté. Ces données sont traitées avec votre consentement, donné en envoyant le formulaire. Elles ne sont ni vendues ni cédées.'),
      block('access-heading', 'Qui y a accès', 'h2'),
      block('access', 'L’équipe de {{controller_name}} chargée de votre demande a accès à vos données. {{processors}}.'),
      block('transfer-heading', 'Transfert hors du Maroc', 'h2'),
      block('transfer', '{{transfer_subject}} traiter les données dans d’autres pays, notamment aux États-Unis. Ce transfert figure dans notre déclaration auprès de la CNDP.'),
      block('retention-heading', 'Durée de conservation', 'h2'),
      item('retention', 'Demandes de catalogue, de rendez-vous, de projet et demandes d’architectes : {{retention}} à compter de leur envoi, puis suppression automatique.'),
      item('marketing', 'Nouveautés et invitations : jusqu’au retrait de votre accord, dans la limite de ces {{retention}}.'),
      item('commercial', 'Si votre demande aboutit à une commande, les documents commerciaux et comptables sont conservés pendant la durée prévue par la loi.'),
      item('abuse', 'Protection contre les envois abusifs : une empreinte chiffrée de votre adresse IP, effacée sous trois heures. L’adresse elle-même n’est pas enregistrée.'),
      block('cookies-heading', 'Cookies et mesure d’audience', 'h2'),
      block('cookies', '{{analytics_notice}}'),
      block('rights-heading', 'Vos droits', 'h2'),
      block('rights', 'Conformément à la loi n° 09-08, vous pouvez accéder à vos données, les faire rectifier ou supprimer, et vous opposer à leur traitement, notamment à l’envoi de nouveautés, sans frais. Écrivez à {{contact_email}} ou à notre siège social. Vous pouvez aussi saisir la Commission nationale de contrôle de la protection des données à caractère personnel (CNDP).'),
      block('cndp', '{{cndp_notice}}'),
      block('external-heading', 'Carte et liens externes', 'h2'),
      block('external', 'Sur la page showroom, Google Maps se charge lorsque vous cliquez sur « Afficher la carte interactive » ; votre navigateur se connecte alors à Google. Les boutons d’itinéraire ouvrent Google Maps et les boutons WhatsApp ouvrent WhatsApp.'),
      block('updated', 'Mise à jour : {{updated_at}}.'),
    ],
  },
};
// Keep actionable email and CNDP links as native rich-text marks.
for (const key of ['controller', 'rights']) {
  const entry = PRIVACY_PAGE.data.content.find(entry => entry._key === `privacy-${key}`);
  const text = entry.children[0].text;
  const [before, after] = text.split('{{contact_email}}');
  entry.markDefs.push({_type: 'link', _key: 'privacy-email', href: 'mailto:{{contact_email}}'});
  entry.children = [
    {_type: 'span', _key: `${entry._key}-before`, text: before, marks: []},
    {_type: 'span', _key: `${entry._key}-email`, text: '{{contact_email}}', marks: ['privacy-email']},
    {_type: 'span', _key: `${entry._key}-after`, text: after, marks: []},
  ];
  if (key === 'rights') {
    entry.markDefs.push({_type: 'link', _key: 'privacy-cndp', href: 'https://www.cndp.ma'});
    const [start, end] = after.split('CNDP');
    entry.children.splice(2, 1,
      {_type: 'span', _key: 'privacy-rights-cndp-before', text: start, marks: []},
      {_type: 'span', _key: 'privacy-rights-cndp-link', text: 'CNDP', marks: ['privacy-cndp']},
      {_type: 'span', _key: 'privacy-rights-cndp-after', text: end, marks: []});
  }
}
export const PRIVACY_TOKENS = ['controller', 'controller_name', 'showroom_address', 'contact_email', 'catalogue_email_purpose', 'processors', 'transfer_subject', 'retention', 'analytics_notice', 'cndp_notice', 'updated_at'];

/** Reject missing/unknown factual slots instead of silently publishing stale legal facts. */
export function validatePrivacyContent(content) {
  if (!Array.isArray(content) || !content.length) return 'La politique de confidentialité doit contenir son texte et ses informations légales.';
  if (content.some(block => block?._type === 'block' && !Array.isArray(block.children))) return 'Un paragraphe de confidentialité est invalide. Rétablissez son texte avant de sauvegarder.';
  const spans = content.flatMap(block => (Array.isArray(block?.children) ? block.children : []).map(span => typeof span?.text === 'string' ? span.text : ''));
  const text = spans.join('');
  const tokens = [...text.matchAll(/\{\{([^{}]+)\}\}/gu)].map(match => match[1]);
  const intactTokens = spans.flatMap(span => [...span.matchAll(/\{\{([^{}]+)\}\}/gu)].map(match => match[1]));
  if (tokens.length !== intactTokens.length) return 'Conservez chaque variable {{...}} dans un seul segment de texte, sans changer le style à l’intérieur des accolades.';
  const unknown = tokens.find(token => !PRIVACY_TOKENS.includes(token));
  if (unknown) return `Information dynamique inconnue : {{${unknown}}}.`;
  const missing = PRIVACY_TOKENS.filter(token => !tokens.includes(token));
  return missing.length ? `Conservez les informations légales dynamiques : ${missing.map(token => `{{${token}}}`).join(', ')}.` : null;
}
