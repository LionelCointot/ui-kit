/**
 * Courbe CSS → progression (0..1 vers 0..1), pour les animations jouées image par image (compteur) qui ne peuvent pas confier la courbe au navigateur.
 * shortcut: seules les courbes `cubic-bezier(x1, y1, x2, y2)` sont comprises ; `linear`, `linear(…)`, `steps(…)` ou un jeton absent donnent une progression linéaire, à étendre si un thème en pose une autre sur un compteur.
 */
export function curveOf(css: string): (t: number) => number {
  const p = /^cubic-bezier\(([^)]+)\)$/.exec(css)?.[1].split(',').map(Number);
  if (p?.length !== 4 || p.some(Number.isNaN)) return (t) => t;
  const [x1, y1, x2, y2] = p;
  const axis = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (t) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (axis(x1, x2, mid) < t) lo = mid; else hi = mid;
    }
    return axis(y1, y2, (lo + hi) / 2);
  };
}
