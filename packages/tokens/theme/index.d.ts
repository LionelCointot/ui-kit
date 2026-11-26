/** Thème de base : fixe les valeurs de départ et le `color-scheme`. */
export type LcThemeBase = 'default' | 'dark';

export type LcThemeTokenType = 'color' | 'dimension' | 'fontFamily' | 'number' | 'duration' | 'cubicBezier' | 'shadow';

export type LcThemeGroupId = 'brand' | 'status' | 'surface' | 'charts' | 'typography' | 'shape' | 'spacing' | 'shadows';

/** Thème personnalisé : sérialisable en JSON, stockable tel quel par un consommateur. */
export interface LcThemeDefinition {
  /** Valeur de `data-theme` : `^[a-z][a-z0-9-]{0,47}$`, hors `default` et `dark`. */
  readonly name: string;
  /** Libellé affiché (libre, 1 à 60 caractères). */
  readonly label?: string;
  readonly extends: LcThemeBase;
  /**
   * Chemin → valeur : rôle `sys` sans son préfixe (`{ "color.primary": "#0b5f5a" }`, `"duration.fast"`) ou token de mouvement
   * d'un composant avec son chemin complet (`"button.press-duration"`), voir `motionSchema`.
   */
  readonly overrides: Readonly<Record<string, string>>;
}

export interface LcThemeTokenSchema {
  /** Chemin sans le préfixe `sys`, par exemple `color.primary`. */
  readonly path: string;
  readonly cssVar: string;
  readonly type: LcThemeTokenType;
  readonly group: LcThemeGroupId;
  /** Libellé technique (dérivé du chemin) ; les libellés traduits viennent de LC_LABELS. */
  readonly label: string;
  /** Édité par le mode simple. */
  readonly simple?: boolean;
}

/** Token de mouvement qu'un thème peut surcharger, hors du builder. */
export interface LcThemeMotionSchema {
  /** `duration.fast` (rôle `sys`, sans préfixe) ou `button.press-duration` (composant, chemin complet). */
  readonly path: string;
  readonly cssVar: string;
  readonly type: LcThemeTokenType;
  /** Famille d'unité d'une distance (`length` : px, rem, em, %, dvh) ou d'un angle (`angle` : deg, turn) ; absent hors `dimension`. */
  readonly unit?: 'length' | 'angle';
}

export interface LcThemeGroup {
  readonly id: LcThemeGroupId;
  readonly label: string;
}

export interface LcThemeFontStack {
  readonly id: string;
  readonly label: string;
  readonly value: string;
}

export type LcThemeIssueCode =
  | 'invalid-theme'
  | 'invalid-name'
  | 'reserved-name'
  | 'invalid-label'
  | 'invalid-base'
  | 'invalid-overrides'
  | 'unknown-token'
  | 'not-editable'
  | 'invalid-value';

export interface LcThemeIssue {
  /** `name`, `label`, `extends`, `overrides`, ou le chemin du token concerné. */
  readonly path: string;
  readonly code: LcThemeIssueCode;
  /** Message en français (CLI) ; l'interface se sert de `code` pour ses propres libellés. */
  readonly message: string;
  /** Chemin le plus proche, pour `unknown-token`. */
  readonly suggestion?: string;
}

export interface LcThemeValidation {
  readonly valid: boolean;
  readonly errors: readonly LcThemeIssue[];
}

export interface LcContrastResult {
  /** Chemins sans le préfixe `sys` (ex. `color.on-primary`). */
  readonly fg: string;
  readonly bg: string;
  readonly fgValue: string;
  readonly bgValue: string;
  readonly ratio: number;
  readonly required: number;
  readonly pass: boolean;
}

export declare const THEME_NAME_PATTERN: RegExp;
export declare const themeSchema: readonly LcThemeTokenSchema[];
export declare const motionSchema: readonly LcThemeMotionSchema[];
export declare const themeGroups: readonly LcThemeGroup[];
export declare const themeFontStacks: readonly LcThemeFontStack[];

/** Valeurs résolues d'un thème de base : chemin → valeur concrète (tous les tokens `sys`). */
export declare function baseValues(base: LcThemeBase): Readonly<Record<string, string>>;

/** Valide un thème. `identity: false` ignore le nom et le libellé. */
export declare function validateTheme(definition: unknown, options?: { readonly identity?: boolean }): LcThemeValidation;

/** Variables CSS des seules surcharges. Lève une exception si le thème est invalide. */
export declare function overrideVars(definition: Pick<LcThemeDefinition, 'extends' | 'overrides'>): Record<string, string>;

/** Base + surcharges : variable CSS → valeur. Lève une exception si le thème est invalide. */
export declare function resolveTheme(definition: Pick<LcThemeDefinition, 'extends' | 'overrides'>): Record<string, string>;

/** `[data-theme="<name>"] { … }`. Lève une exception si le thème est invalide. */
export declare function renderThemeCss(definition: LcThemeDefinition): string;

/** Ratios des 24 paires contrôlées (paires translucides ignorées). */
export declare function checkContrast(resolved: Readonly<Record<string, string>>): LcContrastResult[];

export interface LcDtcgTheme {
  sys: Record<string, unknown>;
  /** Tokens de mouvement d'un composant (`button`, `tabs`…), à la racine du fichier. */
  [component: string]: unknown;
}

/** Export au format des thèmes produit, compilable par `lc-tokens build`. Lève une exception si le thème est invalide. */
export declare function toDtcg(definition: LcThemeDefinition): LcDtcgTheme;

/** Import d'un fichier DTCG : les jetons refusés restent dans `overrides` et sont signalés par `validateTheme`. */
export declare function fromDtcg(json: unknown, options: { readonly name: string; readonly extends: LcThemeBase; readonly label?: string }): LcThemeDefinition;

/** Texte noir ou blanc, celui qui contraste le mieux avec le fond (couleur opaque). */
export declare function deriveOnColor(background: string): '#000000' | '#ffffff';

/** Variante « container » éclaircie (clair) ou assombrie (sombre), avec son « on-container » (≥ 4,5:1). */
export declare function deriveContainer(color: string, scheme: 'light' | 'dark'): { container: string; onContainer: string };

/** [r, g, b] d'une couleur opaque (`#rgb`, `#rrggbb`, `#rrggbbaa` opaque, `rgb()`), sinon null. */
export declare function parseColor(value: string): [number, number, number] | null;

/** Ratio de contraste WCAG (1 à 21), ou null si une couleur n'est pas opaque. */
export declare function contrastRatio(foreground: string, background: string): number | null;

/** « color.primary » → « --lc-sys-color-primary ». */
export declare function cssVarOf(tokenPath: string): string;
