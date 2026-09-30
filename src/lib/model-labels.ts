interface FinishLabel {
  group?: string;
  materialGroup?: string;
  material?: string;
  name?: string;
  code?: string;
}

const parts: Record<string, string> = {
  base: 'Piètement', plateau: 'Plateau', 'Plateau et base': 'Plateau et base',
  structure: 'Structure', conteneur: 'Caisson', 'étagères': 'Étagères',
  pièces: 'Pièces', 'assise/dossier': 'Assise et dossier', assise: 'Assise', revêtement: 'Revêtement',
};

/** Presentation only: preserve the imported values and leave unfamiliar categories intact. */
export function finishGroupLabel(finish: FinishLabel): string {
  const group = finish.group?.trim() || '';
  const category = finish.materialGroup?.trim() || '';
  const material = finish.material?.trim() || '';
  let materialLabel = material === 'metals' ? 'métal' : material === 'Tissu outdoor' ? 'tissu Outdoor' : material;
  let knownCategory = false;
  if (category === 'Tissu Canapé' && /^T[1-9]0$/.test(material)) {
    materialLabel = `tissu ${material}`;
    knownCategory = true;
  } else if (category === 'Cuir Canapé' && ['glove', 'magnifica', 'nabuk', 'perfetto'].includes(material)) {
    materialLabel = `cuir ${material}`;
    knownCategory = true;
  } else if (category === 'Cuir Chaise/Lit' && ['cuir mince', 'cuir mince glove', 'simili cuir'].includes(material)) {
    materialLabel = material === 'simili cuir' ? 'similicuir' : material;
    knownCategory = true;
  } else if (category === 'Tissu Chaise/Lit' && ['Tissu chaises/lits', 'micro nubuck'].includes(material)) {
    materialLabel = material === 'Tissu chaises/lits' ? 'tissu' : material;
    knownCategory = true;
  }
  const part = group === 'assise' && knownCategory ? 'Revêtement' : parts[group] || group;
  return [...new Set([part, knownCategory ? '' : category, materialLabel].filter(Boolean))].join(' — ');
}

export function finishNameLabel(finish: FinishLabel): string {
  const name = finish.name || '';
  return finish.code === 'GFM71' && name === 'GFM71 gaufré balnc' ? 'GFM71 gaufré blanc' : name;
}

/** The reference remains visible in the name when it is not repeated beneath it. */
export function finishHasSeparateCode(finish: FinishLabel): boolean {
  const code = finish.code?.trim();
  if (!code) return false;
  return !finishNameLabel(finish).split(/\s+/u).includes(code);
}
