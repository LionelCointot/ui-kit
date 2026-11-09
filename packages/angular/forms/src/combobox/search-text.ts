/** Caractères remplacés par une espace avant comparaison : tirets, apostrophes et signes voisins. */
const SEPARATORS = /[-‐-―'‘’`]/u;
const COMBINING_MARKS = /\p{M}/gu;
const LIGATURES: Readonly<Record<string, string>> = { 'œ': 'oe', 'æ': 'ae', 'ß': 'ss' };

/** Forme comparable d'un caractère : minuscule, sans diacritique, séparateurs en espace (un caractère source peut donner 0, 1 ou 2 caractères). */
function foldChar(char: string): string {
  if (SEPARATORS.test(char)) return ' ';
  const folded = char.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
  return folded.replace(/[œæß]/g, (ligature) => LIGATURES[ligature]);
}

/**
 * Normalise un texte pour la recherche : minuscules, diacritiques supprimés (`NFD`), tirets et apostrophes remplacés
 * par des espaces, espaces multiples réduits, bords retirés (« Côte-d'Or » → « cote d or »).
 */
export function lcNormalizeSearchText(text: string): string {
  let folded = '';
  for (const char of text) folded += foldChar(char);
  return folded.replace(/\s+/g, ' ').trim();
}

/** Plus petit rang valide : égalité (0), préfixe (1), préfixe d'un mot (2), sous-chaîne (3), sinon `null`. */
function rankOf(key: string, text: string): number | null {
  if (key === text) return 0;
  if (key.startsWith(text)) return 1;
  if (key.includes(` ${text}`)) return 2;
  return key.includes(text) ? 3 : null;
}

/**
 * Filtre et trie des éléments selon un texte saisi. Tri : égalité exacte d'une clé, puis préfixe d'une clé,
 * puis préfixe d'un mot, puis sous-chaîne ; à rang égal, l'ordre d'origine est conservé.
 * Un texte vide renvoie les `max` premiers éléments. Réutilisable dans une fonction `search` de `lc-combobox`.
 */
export function lcFilterOptions<T>(
  items: readonly T[],
  text: string,
  keys: (item: T) => readonly string[],
  max = Number.POSITIVE_INFINITY,
): readonly T[] {
  const needle = lcNormalizeSearchText(text);
  if (!needle) return items.slice(0, max);
  const ranked: { item: T; rank: number; index: number }[] = [];
  items.forEach((item, index) => {
    let best: number | null = null;
    for (const key of keys(item)) {
      const rank = rankOf(lcNormalizeSearchText(key), needle);
      if (rank !== null && (best === null || rank < best)) best = rank;
    }
    if (best !== null) ranked.push({ item, rank: best, index });
  });
  ranked.sort((a, b) => a.rank - b.rank || a.index - b.index);
  return ranked.slice(0, max).map((entry) => entry.item);
}

/** Segment d'un texte découpé pour le surlignage. */
export interface LcHighlightSegment {
  readonly text: string;
  readonly match: boolean;
}

/**
 * Découpe `text` en segments, ceux qui correspondent à `term` (insensible à la casse et aux diacritiques) portent `match`.
 * Les positions sont celles du texte d'origine : aucun HTML n'est produit.
 */
export function lcHighlightSegments(text: string, term: string): readonly LcHighlightSegment[] {
  const needle = lcNormalizeSearchText(term);
  if (!needle || !text) return [{ text, match: false }];
  let folded = '';
  const origin: number[] = []; // indice du texte d'origine pour chaque caractère du texte comparable
  let offset = 0;
  for (const char of text) {
    const piece = foldChar(char);
    for (let i = 0; i < piece.length; i++) origin.push(offset);
    folded += piece;
    offset += char.length;
  }
  const segments: LcHighlightSegment[] = [];
  let cursor = 0;
  let from = 0;
  for (;;) {
    const found = folded.indexOf(needle, from);
    if (found < 0) break;
    const start = origin[found];
    const lastFolded = found + needle.length - 1;
    const end = origin[lastFolded] + charLengthAt(text, origin[lastFolded]);
    if (start >= cursor) {
      if (start > cursor) segments.push({ text: text.slice(cursor, start), match: false });
      segments.push({ text: text.slice(start, end), match: true });
      cursor = end;
    }
    from = found + needle.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}

function charLengthAt(text: string, index: number): number {
  return (text.codePointAt(index) ?? 0) > 0xffff ? 2 : 1;
}
