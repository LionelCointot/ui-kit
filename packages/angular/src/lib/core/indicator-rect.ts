export interface LcIndicatorRect {
  readonly left: number;
  readonly width: number;
}

/**
 * Position et largeur d'un indicateur (trait des onglets, fond d'un segmenté) pour une progression réelle `progress`
 * (0 à n - 1) : interpolation entre l'élément `floor(progress)` et le suivant. Les rectangles sont physiques
 * (`offsetLeft`, `offsetWidth`), dans l'ordre des index : en `rtl` ils vont simplement de droite à gauche. `null` sans élément.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcIndicatorRect(rects: readonly LcIndicatorRect[], progress: number): LcIndicatorRect | null {
  if (rects.length === 0) return null;
  const clamped = Math.min(Math.max(Number.isFinite(progress) ? progress : 0, 0), rects.length - 1);
  const from = Math.floor(clamped);
  const to = Math.min(from + 1, rects.length - 1);
  const t = clamped - from;
  return { left: rects[from].left + (rects[to].left - rects[from].left) * t, width: rects[from].width + (rects[to].width - rects[from].width) * t };
}
