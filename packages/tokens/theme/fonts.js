// Piles de polices proposées par le builder (système uniquement : pas de police téléchargée, spec § 3).
// Elles s'ajoutent aux piles de la base (qui contiennent des apostrophes) comme valeurs acceptées par validateTheme.

/** @type {ReadonlyArray<{ readonly id: string, readonly label: string, readonly value: string }>} */
export const EXTRA_FONT_STACKS = Object.freeze([
  { id: 'rounded', label: 'Arrondie', value: 'ui-rounded, SF Pro Rounded, Nunito, system-ui, sans-serif' },
  { id: 'humanist', label: 'Humaniste', value: 'Seravek, Gill Sans Nova, Ubuntu, Calibri, DejaVu Sans, sans-serif' },
  { id: 'serif', label: 'Avec empattements', value: 'Charter, Bitstream Charter, Sitka Text, Cambria, serif' },
  { id: 'transitional', label: 'Transitionnelle', value: 'Iowan Old Style, Palatino Linotype, URW Palladio L, Georgia, serif' },
  { id: 'system-mono', label: 'Chasse fixe', value: 'ui-monospace, Cascadia Code, Source Code Pro, Menlo, Consolas, DejaVu Sans Mono, monospace' },
]);
