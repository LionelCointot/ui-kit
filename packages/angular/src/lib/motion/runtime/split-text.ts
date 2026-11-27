/**
 * Découpe un texte en mots, chaque mot en graphèmes (e + accent combinant, emoji famille, drapeau : un graphème chacun) ;
 * les espaces sont rendus tels quels, hors des mots.
 *
 * @internal Réservé aux points d'entrée du kit.
 */
export type LcTextPart = { readonly space: string } | { readonly word: readonly string[] };

/** @internal */
export function lcSplitGraphemes(text: string, segmenter: Intl.Segmenter): LcTextPart[] {
  const parts: LcTextPart[] = [];
  let word: string[] | null = null;
  let space = '';
  const flush = () => {
    if (word) parts.push({ word });
    if (space) parts.push({ space });
    word = null;
    space = '';
  };
  for (const { segment } of segmenter.segment(text)) {
    if (/^\s+$/.test(segment)) {
      if (word) flush();
      space += segment;
    } else {
      if (space) flush();
      (word ??= []).push(segment);
    }
  }
  flush();
  return parts;
}
