/** Editorial text uses existing native site_content/global drafts, never a separate settings store. */
const field = (slug, label, defaultValue, group, required = true, type = 'string') => ({slug, label, type, required, defaultValue, group});
export const EDITORIAL_FIELDS = [
  field('model_quote_label', 'Bouton devis sur les fiches modèles', 'Demander un devis', 'model-services'),
  field('model_files_label', 'Lien vers les fichiers 2D et 3D', 'Demander les fichiers 2D et 3D', 'model-services'),
  field('model_services', 'Services sur les fiches modèles', 'Fabrication sur commande en Italie. Livraison et installation au Maroc. Livraison offerte à Casablanca.', 'model-services', false, 'text'),
  field('model_quote_note', 'Précision sur le devis', 'Le devis précise les dimensions, les finitions, la livraison et l’installation. Vous pouvez le demander et le valider à distance.', 'model-services', false, 'text'),
  field('request_project_label', 'Type de projet', 'Type de projet', 'request-form'),
  field('request_architect_label', 'Option architecte', 'Avec un architecte', 'request-form'),
  field('request_piece_label', 'Parcours : un meuble', 'Un meuble', 'request-form'),
  field('request_ensemble_label', 'Parcours : pièce ou maison', 'Une pièce ou toute la maison', 'request-form'),
  field('request_company_label', 'Cabinet ou société', 'Cabinet ou société', 'request-form'),
  field('request_whatsapp_label', 'Numéro WhatsApp obligatoire', 'Numéro WhatsApp', 'request-form'),
  field('request_day_label', 'Jour du rendez-vous', 'Jour souhaité', 'request-form'),
  field('request_period_label', 'Moment du rendez-vous', 'Moment souhaité', 'request-form'),
  field('request_morning_label', 'Choix : matin', 'Matin', 'request-form'),
  field('request_afternoon_label', 'Choix : après-midi', 'Après-midi', 'request-form'),
  field('request_hours_note', 'Précision facultative après les horaires', '', 'request-form', false, 'text'),
  field('request_city_label', 'Ville obligatoire', 'Ville', 'request-form'),
  field('request_city_optional_label', 'Ville facultative au rendez-vous', 'Votre ville (facultatif)', 'request-form'),
  field('request_stage_label', 'Avancement du projet', 'Avancement du projet', 'request-form'),
  field('request_deadline_label', 'Délai souhaité', 'Délai souhaité', 'request-form'),
  field('request_choice_label', 'Choix non sélectionné', 'Choisir', 'request-form'),
  field('request_models_label', 'Modèles envisagés', 'Modèles envisagés (facultatif)', 'request-form'),
  field('request_message_label', 'Message', 'Message (facultatif)', 'request-form'),
  field('request_appointment_submit', 'Bouton rendez-vous', 'Demander un rendez-vous', 'request-form'),
  field('request_project_submit', 'Bouton conseil', 'Demander un conseil', 'request-form'),
  field('request_pro_submit', 'Bouton professionnel', 'Envoyer ma demande', 'request-form'),
  field('request_appointment_success', 'Confirmation de rendez-vous', 'Demande reçue. Nous vous confirmerons l’horaire sur WhatsApp.', 'request-form', true, 'text'),
  field('request_project_success', 'Confirmation de conseil', 'Votre demande est enregistrée. Un conseiller vous écrit sur WhatsApp ; vous pourrez lui envoyer des photos de la pièce.', 'request-form', true, 'text'),
  field('request_pro_success', 'Confirmation professionnelle', 'Votre demande est enregistrée. Un conseiller vous recontacte sur WhatsApp ou par e-mail.', 'request-form', true, 'text'),
  field('request_pending', 'Demande en cours', 'Envoi en cours…', 'request-form'),
  field('request_error', 'Erreur générale de demande', 'Votre demande n’a pas pu être envoyée. Réessayez, ou contactez le showroom.', 'request-form', true, 'text'),
  field('catalogue_whatsapp_label', 'WhatsApp facultatif du catalogue', 'Numéro WhatsApp (facultatif)', 'catalogue-form'),
  field('catalogue_city_label', 'Ville facultative du catalogue', 'Ville (facultatif)', 'catalogue-form'),
  field('catalogue_city_choice', 'Choix de ville non sélectionné', 'Choisir une ville', 'catalogue-form'),
  field('catalogue_email_sent', 'Catalogue : e-mail envoyé', 'Un e-mail contenant le catalogue vous a été envoyé. Son lien est valable 24 heures.', 'catalogue-form', true, 'text'),
  field('catalogue_email_failed', 'Catalogue : échec de l’e-mail', 'L’e-mail n’a pas pu être envoyé. Vous pouvez télécharger le PDF ci-dessus.', 'catalogue-form', true, 'text'),
  field('catalogue_email_pending', 'Catalogue : e-mail en cours', 'L’envoi du catalogue par e-mail est en cours. Vous pouvez déjà télécharger le PDF ci-dessus.', 'catalogue-form', true, 'text'),
  field('privacy_controller', 'Identité juridique du responsable du traitement', 'Racha Home, société à responsabilité limitée, registre du commerce de Marrakech n° 76831, siège social Résidence Marrakchia I, rue du Lieutenant Lamure, boulevard Mohammed VI, Marrakech-Médina, Maroc.', 'privacy', true, 'text'),
  field('privacy_controller_name', 'Nom du responsable dans les formulaires', 'Racha Home', 'privacy'),
  field('privacy_updated_label', 'Date de mise à jour de la confidentialité', '1er octobre 2026', 'privacy'),
];
export const EDITORIAL_DEFAULTS = Object.fromEntries(EDITORIAL_FIELDS.map(({slug, defaultValue}) => [slug, defaultValue]));

/** Missing legacy fields receive a default; deliberate empty/null optional fields remain empty. */
export function readEditorialCopy(data = {}) {
  const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const nested = source.editorial_copy;
  const merged = {...source, ...(nested && typeof nested === 'object' && !Array.isArray(nested) ? nested : {})};
  return Object.fromEntries(EDITORIAL_FIELDS.map(({slug, defaultValue}) => [slug,
    Object.prototype.hasOwnProperty.call(merged, slug) ? (typeof merged[slug] === 'string' ? merged[slug] : '') : defaultValue,
  ]));
}

/** Native validation also checks these on save; resilient reads keep old sparse entries usable. */
export function requiredCopy(value, fallback) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}
