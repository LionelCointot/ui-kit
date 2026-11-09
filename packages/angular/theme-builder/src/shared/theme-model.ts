import {
  type LcThemeBase,
  type LcThemeDefinition,
  baseValues,
  deriveContainer,
  deriveOnColor,
  parseColor,
} from '@lionelcointot/ui-tokens/theme';

/** Une couleur calculée à partir d'une autre : tant qu'elle est « liée », elle suit sa source. */
export interface LcThemeDerivation {
  readonly source: string;
  readonly target: string;
  readonly derive: (sourceValue: string, scheme: 'light' | 'dark') => string;
}

const onColor = (source: string, target: string): LcThemeDerivation => ({ source, target, derive: (value) => deriveOnColor(value) });
const container = (source: string, target: string, part: 'container' | 'onContainer'): LcThemeDerivation => ({
  source,
  target,
  derive: (value, scheme) => deriveContainer(value, scheme)[part],
});

/** Dérivations simples du § 5.3 de la spec : texte lisible, variante « container », anneau de focus. */
export const LC_THEME_DERIVATIONS: readonly LcThemeDerivation[] = [
  onColor('color.primary', 'color.on-primary'),
  container('color.primary', 'color.primary-container', 'container'),
  container('color.primary', 'color.on-primary-container', 'onContainer'),
  { source: 'color.primary', target: 'color.focus-ring', derive: (value) => value },
  onColor('color.secondary', 'color.on-secondary'),
  container('color.secondary', 'color.secondary-container', 'container'),
  container('color.secondary', 'color.on-secondary-container', 'onContainer'),
  onColor('color.neutral', 'color.on-neutral'),
];

export const derivationOf = (target: string): LcThemeDerivation | undefined =>
  LC_THEME_DERIVATIONS.find((derivation) => derivation.target === target);

export const isDerivedTarget = (path: string): boolean => derivationOf(path) !== undefined;

export const schemeOf = (base: LcThemeBase): 'light' | 'dark' => (base === 'dark' ? 'dark' : 'light');

/** Valeur effective d'un token : surcharge, sinon valeur de la base. */
export function valueOf(theme: LcThemeDefinition, path: string): string {
  return theme.overrides[path] ?? baseValues(theme.extends)[path] ?? '';
}

/** Surcharges sans les valeurs identiques à la base (un thème exporté ne contient que de vraies différences). */
function withOverride(theme: LcThemeDefinition, path: string, value: string | null): LcThemeDefinition {
  const overrides = { ...theme.overrides };
  if (value === null || value === baseValues(theme.extends)[path]) delete overrides[path];
  else overrides[path] = value;
  return { ...theme, overrides };
}

/** Valeur calculée pour une cible, ou null si la source n'est pas une couleur opaque. */
function derivedValue(theme: LcThemeDefinition, derivation: LcThemeDerivation): string | null {
  const source = valueOf(theme, derivation.source);
  return parseColor(source) ? derivation.derive(source, schemeOf(theme.extends)) : null;
}

/**
 * Modifie un token. Si c'est la source de dérivations, les cibles encore liées (hors `unlinked`) sont recalculées.
 * Une valeur identique à la base retire la surcharge.
 */
export function setToken(theme: LcThemeDefinition, path: string, value: string, unlinked: ReadonlySet<string>): LcThemeDefinition {
  let next = withOverride(theme, path, value);
  for (const derivation of LC_THEME_DERIVATIONS) {
    if (derivation.source !== path || unlinked.has(derivation.target)) continue;
    const derived = derivedValue(next, derivation);
    if (derived !== null) next = withOverride(next, derivation.target, derived);
  }
  return next;
}

/** Retire la surcharge d'un token ; ses cibles encore liées reviennent elles aussi à la base. */
export function resetToken(theme: LcThemeDefinition, path: string, unlinked: ReadonlySet<string>): LcThemeDefinition {
  let next = withOverride(theme, path, null);
  for (const derivation of LC_THEME_DERIVATIONS) {
    if (derivation.source === path && !unlinked.has(derivation.target)) next = withOverride(next, derivation.target, null);
  }
  return next;
}

/** Relie une cible : elle reprend la valeur calculée, ou la base si sa source n'est pas surchargée. */
export function relink(theme: LcThemeDefinition, target: string): LcThemeDefinition {
  const derivation = derivationOf(target);
  if (!derivation) return theme;
  const derived = derivation.source in theme.overrides ? derivedValue(theme, derivation) : null;
  return withOverride(theme, target, derived);
}

/** Recalcule les cibles liées dont la source est surchargée (après un changement de base, par exemple). */
export function rederive(theme: LcThemeDefinition, unlinked: ReadonlySet<string>): LcThemeDefinition {
  let next = theme;
  for (const derivation of LC_THEME_DERIVATIONS) {
    if (unlinked.has(derivation.target) || !(derivation.source in next.overrides)) continue;
    const derived = derivedValue(next, derivation);
    if (derived !== null) next = withOverride(next, derivation.target, derived);
  }
  return next;
}

/**
 * Cibles dont la valeur initiale n'est pas celle de la dérivation (thème importé ou saisi à la main) : elles
 * commencent « déliées », pour que le premier changement de leur source n'écrase pas un choix explicite.
 */
export function initiallyUnlinked(theme: LcThemeDefinition): ReadonlySet<string> {
  const unlinked = new Set<string>();
  for (const derivation of LC_THEME_DERIVATIONS) {
    const current = theme.overrides[derivation.target];
    if (current === undefined) continue;
    const expected = derivedValue(theme, derivation);
    if (expected === null || expected.toLowerCase() !== current.toLowerCase()) unlinked.add(derivation.target);
  }
  return unlinked;
}

export type LcThemeDensity = 'compact' | 'normal' | 'comfortable';

export const LC_THEME_DENSITY_FACTORS: Readonly<Record<LcThemeDensity, number>> = { compact: 0.75, normal: 1, comfortable: 1.25 };

const SPACE_PATH = /^space\.[1-9]\d*$/;

function toPixels(value: string): number | null {
  const match = /^(\d+(?:\.\d+)?)(px|rem|em)$/.exec(value);
  if (!match) return null;
  return Number(match[1]) * (match[2] === 'px' ? 1 : 16);
}

/** Échelle d'espacement multipliée par la densité (la base est l'échelle de référence). */
export function setDensity(theme: LcThemeDefinition, density: LcThemeDensity): LcThemeDefinition {
  const factor = LC_THEME_DENSITY_FACTORS[density];
  const base = baseValues(theme.extends);
  let next = theme;
  for (const path of Object.keys(base).filter((candidate) => SPACE_PATH.test(candidate))) {
    const pixels = toPixels(base[path]);
    if (pixels === null) continue;
    next = withOverride(next, path, factor === 1 ? null : `${Math.round(pixels * factor * 100) / 100}px`);
  }
  return next;
}

/** Densité courante, ou null si l'échelle a été modifiée autrement. */
export function densityOf(theme: LcThemeDefinition): LcThemeDensity | null {
  const reference = 'space.4';
  const base = toPixels(baseValues(theme.extends)[reference] ?? '');
  const current = toPixels(valueOf(theme, reference));
  if (base === null || current === null || base === 0) return null;
  const ratio = current / base;
  const found = (Object.entries(LC_THEME_DENSITY_FACTORS) as [LcThemeDensity, number][]).find(([, factor]) => Math.abs(factor - ratio) < 0.01);
  return found ? found[0] : null;
}

/** `#rrggbb` pour un `input type=color` (qui ne gère ni l'alpha ni `rgb()`), ou null. */
export function toPickerHex(value: string): string | null {
  const rgb = parseColor(value);
  return rgb ? `#${rgb.map((channel) => channel.toString(16).padStart(2, '0')).join('')}` : null;
}

/** « 12px » → { amount: 12, unit: 'px' } ; « 0 » → { amount: 0, unit: 'px' }. */
export function splitDimension(value: string): { amount: number; unit: 'px' | 'rem' | 'em' } | null {
  if (value === '0') return { amount: 0, unit: 'px' };
  const match = /^(\d+(?:\.\d+)?)(px|rem|em)$/.exec(value);
  return match ? { amount: Number(match[1]), unit: match[2] as 'px' | 'rem' | 'em' } : null;
}

/** Nom de fichier sûr dérivé du nom du thème (le nom validé ne contient que [a-z0-9-]). */
export const exportFileName = (name: string, extension: 'tokens.json' | 'css'): string => `${name || 'theme'}.${extension}`;
