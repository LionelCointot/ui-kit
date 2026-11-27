/** @internal Réservé aux points d'entrée du kit. */
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

const lastMiddle = new WeakMap<HTMLElement, number>();

/**
 * Pose un indicateur à deux bords sur `[start, end]` (pixels dans le repère de son parent, sur l'axe `x` ou `y`). Le bord arrière est le bord de départ de la
 * boîte (`left` et `width`, ou `top` et `height`, dont le bord opposé reste à `bound`), le bord avant est rogné par `clip-path` : deux propriétés, donc
 * deux durées. Le bord avant est celui qui va vers les coordonnées croissantes : `data-direction` (`forward` ou `backward`) dit lequel des deux anime en avant,
 * le CSS du composant choisit les durées. `bound` est le bord de fin fixe de la boîte (au moins `end`) ; le rayon vient de `--_indicator-radius`.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export function lcPlaceIndicator(indicator: HTMLElement, axis: 'x' | 'y', start: number, end: number, bound: number): void {
  const middle = (start + end) / 2;
  const previous = lastMiddle.get(indicator);
  lastMiddle.set(indicator, middle);
  if (previous !== undefined && previous !== middle) indicator.dataset['direction'] = middle > previous ? 'forward' : 'backward';
  const [position, size] = axis === 'x' ? ['left', 'width'] : ['top', 'height'];
  indicator.style.setProperty(position, `${start}px`);
  indicator.style.setProperty(size, `${Math.max(bound - start, 0)}px`);
  const trailing = `${Math.max(bound - end, 0)}px`;
  indicator.style.clipPath = `inset(${axis === 'x' ? `0 ${trailing} 0 0` : `0 0 ${trailing} 0`} round var(--_indicator-radius, 0px))`;
}
