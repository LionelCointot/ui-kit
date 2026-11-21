/**
 * Courbe du token `easing.spring` : ressort à amortissement critique, sans rebond, x(t) = 1 − (1 + ωt)·e^(−ωt), ω = 8, t ∈ [0, 1].
 * Échantillonnée en `linear()` (points à pas égal, 3 décimales, dernier point exactement 1).
 * Régénérer : `node lib/spring-easing.mjs`, puis recopier la valeur dans `ref.easing.spring` et `sys.easing.spring`.
 */
export const SPRING_OMEGA = 8;
export const SPRING_POINTS = 56;

export function springLinear(omega = SPRING_OMEGA, points = SPRING_POINTS) {
  const values = Array.from({ length: points }, (_, i) => {
    const wt = (omega * i) / (points - 1);
    return i === points - 1 ? 1 : Math.round((1 - (1 + wt) * Math.exp(-wt)) * 1000) / 1000;
  });
  return `linear(${values.join(', ')})`;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log(springLinear());
