/** Shared editorial controls. URLs stay tied to the site's implemented routes. */
export const NAVIGATION_DEFAULTS = {
  action_appointment_label: 'Prendre rendez-vous',
  action_advisor_label: 'Nous écrire',
  action_catalogue_label: 'Télécharger le catalogue',
  footer_valet_text: 'Service voiturier',
  whatsapp_general_message: 'Bonjour, je souhaite des informations sur Cattelan Italia Maroc.',
};

export const NAVIGATION_FIELDS = [
  {slug:'action_appointment_label', label:'Bouton — rendez-vous', type:'string', required:true, group:'actions'},
  {slug:'action_advisor_label', label:'Bouton — écrire sur WhatsApp', type:'string', required:true, group:'actions'},
  {slug:'action_catalogue_label', label:'Lien — télécharger le catalogue', type:'string', required:true, group:'actions'},
  {slug:'footer_valet_text', label:'Pied de page — service voiturier (facultatif)', type:'string', group:'contact'},
  {slug:'whatsapp_general_message', label:'WhatsApp — message prérempli général', type:'text', required:true, group:'actions'},
];

export const FOOTER_MENU = {
  name: 'footer', label: 'Informations de pied de page',
  items: [
    {label:'À propos', url:'/a-propos/'},
    {label:'Commande et livraison', url:'/votre-projet/'},
    {label:'Professionnels', url:'/professionnels/'},
    {label:'FAQ', url:'/faq/'},
    {label:'Confidentialité', url:'/confidentialite/'},
    {label:'Mentions légales', url:'/mentions-legales/'},
  ].map(item => ({type:'custom', ...item})),
};

/** Existing installs retain their copy; an explicit clear never resurrects it. */
export function readNavigationCopy(data = {}) {
  const nested=data.editorial_copy;
  const values=nested && typeof nested === 'object' && !Array.isArray(nested) ? {...data,...nested} : data;
  return Object.fromEntries(Object.entries(NAVIGATION_DEFAULTS).map(([key, fallback]) => [
    key, Object.hasOwn(values, key) ? String(values[key] ?? '') : fallback,
  ]));
}
