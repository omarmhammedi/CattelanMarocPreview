/** Furniture type in model page titles: "[Modèle] · [type] Cattelan Italia · Cattelan Italia Maroc". */
const familyTypes: Record<string, string> = {
  tables: 'Table', 'tables-basses': 'Table basse', 'chaises-tabourets': 'Chaise', 'canapes-fauteuils': 'Canapé',
  'buffets-bibliotheques': 'Buffet', luminaires: 'Luminaire', 'mobilier-exterieur': 'Mobilier extérieur', 'consoles-miroirs': 'Console',
};
// Where the family name is not specific enough.
const modelTypes: Record<string, string> = {
  'ruby-lounge': 'Fauteuil', airport: 'Bibliothèque', nautilus: 'Bibliothèque', chelsea: 'Buffet', kayak: 'Buffet', amsterdam: 'Buffet',
  cosmos: 'Miroir', glenn: 'Miroir', paris: 'Suspension', cloudine: 'Suspension', aladdin: 'Suspension',
  'napoleon-keramik-outdoor': 'Table d’extérieur', 'greta-outdoor': 'Chaise d’extérieur',
};

export function modelType(slug: string, familySlug?: string): string {
  return modelTypes[slug] || (familySlug && familyTypes[familySlug]) || 'Mobilier';
}

export function modelSeoTitle(title: string, slug: string, familySlug?: string, separator = ' · ', siteTitle = 'Cattelan Italia Maroc'): string {
  return [title, `${modelType(slug, familySlug)} Cattelan Italia`, siteTitle].filter(Boolean).join(separator || ' · ');
}
