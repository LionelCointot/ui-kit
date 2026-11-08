/**
 * Analyse une saisie numérique française ou anglaise : espaces (y compris insécables) ignorés, symbole € et %
 * retirés, virgule ou point acceptés comme séparateur décimal. Si les deux apparaissent, le dernier est décimal
 * (« 1.234,5 » → 1234.5 ; « 1,234.5 » → 1234.5). Renvoie null pour une saisie vide, NaN pour une saisie invalide.
 */
export function parseLocaleNumber(text: string): number | null {
  const compact = text.replace(/[\s  ]/g, '').replace(/[€%]/g, '');
  if (compact === '') {
    return null;
  }
  const lastComma = compact.lastIndexOf(',');
  const lastDot = compact.lastIndexOf('.');
  const decimalSeparator = lastComma > lastDot ? ',' : '.';
  const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
  const normalized = compact.split(thousandsSeparator).join('').replace(decimalSeparator, '.');
  return /^-?\d*\.?\d+$|^-?\d+\.$/.test(normalized) ? Number(normalized) : Number.NaN;
}

/** Arrondi décimal « demi au-dessus » (comme le back) à `decimals` chiffres. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.sign(value) * Math.round(Math.abs(value) * factor + Number.EPSILON) / factor;
}
