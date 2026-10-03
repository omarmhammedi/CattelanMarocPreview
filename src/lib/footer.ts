/** The footer's information links, in the plan's order. */
const footerLinks = [
  { label: 'À propos', href: '/a-propos/' },
  { label: 'Commande et livraison', href: '/votre-projet/' },
  { label: 'Professionnels', href: '/professionnels/' },
  { label: 'FAQ', href: '/faq/' },
  { label: 'Confidentialité', href: '/confidentialite/' },
  { label: 'Mentions légales', href: '/mentions-legales/' },
];

/** Leaves out the links the main menu already lists in the same footer. */
export function secondaryLinks(menu: { url?: string }[]) {
  return footerLinks.filter(link => !menu.some(item => item.url === link.href));
}

export const valetService = 'Service voiturier';
