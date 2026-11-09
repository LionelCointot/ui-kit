/** Nombre de teintes de la palette catégorielle des tokens (`--lc-sys-chart-categorical-1` à `-8`). */
export const LC_AVATAR_TONE_COUNT = 8;

/** Séparateurs de mots d'un nom : espaces, tirets (noms composés), soulignés et points. */
const NAME_SEPARATORS = /[\s_.\p{Pd}]+/u;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/**
 * Initiales d'un nom : première lettre du premier et du dernier mot (deux au plus), en majuscules.
 * Les accents sont conservés (« Élodie » donne « É ») ; un nom composé seul donne ses deux parties
 * (« Jean-Pierre » donne « JP ») ; « Anne de la Tour » donne « AT ». Chaîne vide si le nom n'a aucun caractère exploitable.
 */
export function lcInitials(name: string): string {
  const words = name
    .normalize('NFC')
    .split(NAME_SEPARATORS)
    .map((word) => Array.from(word).find((char) => LETTER_OR_DIGIT.test(char)))
    .filter((letter): letter is string => letter !== undefined);
  if (words.length === 0) return '';
  const first = words[0];
  return (words.length === 1 ? first : first + words[words.length - 1]).toLocaleUpperCase();
}

/**
 * Teinte (1 à `LC_AVATAR_TONE_COUNT`) déduite d'une graine : même graine, même teinte, sans état.
 * Hachage FNV-1a sur le texte sans casse ni espaces de bord, pour que « Alice » et « alice  » concordent.
 */
export function lcAvatarTone(seed: string): number {
  const text = seed.normalize('NFC').trim().toLocaleLowerCase();
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return ((hash >>> 0) % LC_AVATAR_TONE_COUNT) + 1;
}
