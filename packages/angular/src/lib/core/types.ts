/** Vocabulaire commun à tous les composants (API à la Kendo, ADR-0002). */
export type LcThemeColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral';
export type LcFillMode = 'solid' | 'outline' | 'flat';
export type LcSize = 'small' | 'medium' | 'large';
export type LcRounded = 'none' | 'small' | 'medium' | 'large' | 'full';
export type LcThemeChoice = 'auto' | 'light' | 'dark';
export type LcStatusKind = 'info' | 'success' | 'warning' | 'error';
export type LcSpace = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '8' | '10' | '12' | '16';
export type LcValueFormat = 'money' | 'percent' | 'number' | 'integer' | 'date' | 'month' | 'text' | ((value: unknown) => string);

export interface LcOption<T> {
  readonly value: T;
  readonly label: string;
  readonly icon?: string;
  readonly disabled?: boolean;
}

export interface LcDefaults {
  readonly size: LcSize;
  readonly fillMode: LcFillMode;
  readonly rounded: LcRounded;
  readonly themeColor: LcThemeColor;
}

/** Correspondance taille → suffixe des tokens (sm, md, lg). */
export const LC_SIZE_TOKEN: Readonly<Record<LcSize, 'sm' | 'md' | 'lg'>> = { small: 'sm', medium: 'md', large: 'lg' };
