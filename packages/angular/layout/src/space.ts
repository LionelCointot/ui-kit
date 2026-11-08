import type { LcSpace } from '@lionelcointot/ui-angular';

/** Valeur CSS d'un espacement (`var(--lc-sys-space-<n>)`). */
export function lcSpaceVar(space: LcSpace): string {
  return `var(--lc-sys-space-${space})`;
}

/** Valeur d'une propriété responsive : un nombre, ou un nombre par point de rupture (mobile d'abord). */
export type LcResponsiveNumber = number | Partial<Record<'sm' | 'md' | 'lg' | 'xl', number>>;

export const LC_RESPONSIVE_KEYS = ['sm', 'md', 'lg', 'xl'] as const;

/** Valeur de base (sans point de rupture) et valeur par point de rupture d'une propriété responsive. */
export function resolveResponsive(value: LcResponsiveNumber, key: 'base' | 'sm' | 'md' | 'lg' | 'xl'): number | null {
  if (typeof value === 'number') return key === 'base' ? value : null;
  return key === 'base' ? null : (value[key] ?? null);
}
