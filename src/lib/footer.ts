/** The plan's footer links that have a page today; À propos, Votre projet, FAQ and Mentions légales join when theirs exist. */
const footerLinks = [
  { label: 'Professionnels', href: '/professionnels/' },
  { label: 'Confidentialité', href: '/confidentialite/' },
];

/** Leaves out the links the main menu already lists in the same footer. */
export function secondaryLinks(menu: { url?: string }[]) {
  return footerLinks.filter(link => !menu.some(item => item.url === link.href));
}

export const valetService = 'Service voiturier';
