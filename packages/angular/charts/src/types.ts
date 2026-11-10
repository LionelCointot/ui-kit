import type { LcValueFormat } from '@lionelcointot/ui-angular';

/** `null` = trou (aucune interpolation). */
export type LcChartValue = number | null;
export type LcColorSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface LcChartSeries {
  /** Identité stable : la couleur suit l'entité, jamais son rang. */
  readonly id: string;
  /** Donnée non fiable (saisie possible) : toujours échappée. */
  readonly label: string;
  /** Alignées sur `categories`. */
  readonly values: readonly LcChartValue[];
  readonly colorSlot?: LcColorSlot;
  /** Groupe d'empilement. */
  readonly stack?: string;
  /** Style du trait (courbes) : plein (défaut) ou tirets, pour distinguer une série sans la couleur seule. */
  readonly lineStyle?: 'solid' | 'dashed';
  /** Forme des points et de la légende (courbes) : permet de distinguer les séries sans la couleur seule. */
  readonly symbol?: 'circle' | 'square' | 'triangle' | 'diamond';
}

/** Repère vertical sur l'axe des catégories (ex. un point d'équilibre) : ligne fine et étiquette. */
export interface LcChartMarker {
  readonly id: string;
  /** Position sur l'axe des catégories. */
  readonly categoryIndex: number;
  /** Texte affiché ; aussi dans la vue tableau et la description accessible. */
  readonly label: string;
}

/** Point annoté d'une série. */
export interface LcChartPointAnnotation {
  readonly seriesId: string;
  readonly categoryIndex: number;
  readonly label: string;
  /** `primary` : point plein d'au moins 8 px et étiquette ; `secondary` : rond creux discret. */
  readonly emphasis: 'primary' | 'secondary';
}

export interface LcCartesianData {
  /** Libellés ou dates ISO selon `categoryKind`. */
  readonly categories: readonly string[];
  /** Pilote le formatage des catégories (défaut `label`). */
  readonly categoryKind?: 'label' | 'date' | 'month' | 'year';
  readonly series: readonly LcChartSeries[];
}

export interface LcPart {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly colorSlot?: LcColorSlot;
}

export interface LcValueAxis {
  /** Défaut `number`. */
  readonly format?: LcValueFormat;
  /** Graduations compactes (« 250 k€ ») ; défaut true. */
  readonly compact?: boolean;
  /** Titre d'axe (optionnel, le titre du graphique suffit souvent). */
  readonly label?: string;
  /**
   * Borne basse imposée (ex. échelle commune à deux graphiques côte à côte). Sur une aire ou des barres, l'axe part
   * toujours de 0 : un `min` supérieur à 0 est ignoré (avertissement en développement). Sur une courbe, un `min`
   * supérieur à 0 tronque l'axe (rupture d'axe visible).
   */
  readonly min?: number;
  /** Borne haute imposée (ex. échelle commune à deux graphiques côte à côte). */
  readonly max?: number;
}

export interface LcChartsOptions {
  /** Défaut `svg`. */
  readonly renderer?: 'svg' | 'canvas';
  /** Motifs d'accessibilité ; défaut `auto` (forced-colors, contraste élevé, impression). */
  readonly patterns?: 'auto' | 'always' | 'never';
}

export interface LcChartPointSelect {
  readonly seriesId: string;
  readonly categoryIndex: number;
  readonly value: LcChartValue;
}

export interface LcChartTable {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly (string | number)[])[];
}

export interface LcChartTheme {
  /** 8 couleurs, ordre fixe. */
  readonly categorical: readonly string[];
  /** 7 pas. */
  readonly sequential: readonly string[];
  /** 7 pas de la rampe chaude (famille de l'emplacement de couleur 2) ; un pas élevé contraste davantage avec la surface. */
  readonly sequentialWarm: readonly string[];
  readonly diverging: { readonly negative: string; readonly neutral: string; readonly positive: string };
  readonly status: { readonly good: string; readonly warning: string; readonly serious: string; readonly critical: string };
  readonly surface: string;
  readonly gridline: string;
  readonly axis: string;
  readonly ink: { readonly primary: string; readonly secondary: string; readonly muted: string };
  /** Couleur des repères verticaux (token `--lc-chart-marker-color`, repli sur l'encre atténuée). */
  readonly markerColor: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly reducedMotion: boolean;
  readonly patterns: boolean;
}

/** Série prête à tracer : couleur résolue, motif, empilement. */
export interface LcResolvedSeries {
  readonly id: string;
  readonly label: string;
  readonly values: readonly LcChartValue[];
  readonly color: string;
  readonly slot: LcColorSlot | null;
  /** Rang d'affichage (pour alterner les motifs). */
  readonly patternIndex: number;
  readonly stack?: string;
  readonly lineStyle?: 'solid' | 'dashed';
  readonly symbol?: LcChartSeries['symbol'];
}

export interface LcLegendItem {
  readonly id: string;
  readonly label: string;
  readonly color: string;
  readonly shape: 'line' | 'rect';
  readonly hidden: boolean;
  readonly dashed?: boolean;
  readonly symbol?: LcChartSeries['symbol'];
}
