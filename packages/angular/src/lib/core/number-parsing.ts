/**
 * Analyse une saisie numérique française ou anglaise : espaces (y compris insécables) ignorés, symboles € et %
 * retirés, virgule ou point acceptés comme séparateur décimal. Si les deux apparaissent, le dernier est décimal
 * (« 1.234,5 » → 1234.5 ; « 1,234.5 » → 1234.5). Renvoie null pour une saisie vide, NaN pour une saisie invalide.
 *
 * Un point unique suivi d'exactement trois chiffres (« 1.234 ») est ambigu. Quand le nombre de décimales
 * autorisées est connu et inférieur à 3, il ne peut pas être décimal : c'est un séparateur de milliers
 * (« 1.234 » → 1234, et non 1,23 arrondi en silence). La virgule, elle, reste décimale (« 10,005 » → 10,005).
 */
export function parseLocaleNumber(text: string, decimals?: number): number | null {
  const compact = text.replace(/\s/g, '').replace(/[€%]/g, '');
  if (compact === '') {
    return null;
  }
  if (decimals !== undefined && decimals < 3 && /^-?\d{1,3}\.\d{3}$/.test(compact)) {
    return Number(compact.replace('.', ''));
  }
  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : '.';
  const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
  const normalized = compact.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
  return /^-?\d*\.?\d+$|^-?\d+\.$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/**
 * Arrondi décimal « demi au-dessus » (comme le back) à `decimals` chiffres.
 * Le décalage passe par la notation exponentielle pour éviter les erreurs binaires (1.005 → 1.01, et non 1).
 */
export function roundTo(value: number, decimals: number): number {
  if (!Number.isFinite(value)) {
    return value;
  }
  const rounded = Math.round(shiftDecimal(Math.abs(value), decimals));
  const result = Math.sign(value) * shiftDecimal(rounded, -decimals);
  return result === 0 ? 0 : result;
}

function shiftDecimal(value: number, places: number): number {
  const [mantissa, exponent = '0'] = String(value).split('e');
  return Number(`${mantissa}e${Number(exponent) + places}`);
}
