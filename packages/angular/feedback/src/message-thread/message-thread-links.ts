/** Morceau de texte d'un message ; un lien est une adresse `http(s)` brute avec son `href` normalisé par `URL`. */
export type LcTextPart = { type: 'text'; text: string } | { type: 'link'; text: string; href: string };

// Début de mot obligatoire (pas « xhttp:// ») ; la classe exclut espaces, contrôles, chevrons et guillemets. Un seul quantificateur : temps linéaire.
const URL_CANDIDATE = /(?<![A-Za-z0-9])https?:\/\/[^\s\u0000-\u001F\u007F<>"'`]+/gi;
const TRAILING_PUNCTUATION = '.,;:!?';

/** Fin de l'adresse : ponctuation finale et parenthèse fermante non appariée retirées (parcours unique, parenthèses comptées une fois). */
function trimmedEnd(candidate: string): number {
  let open = 0;
  let close = 0;
  for (const ch of candidate) {
    if (ch === '(') open++;
    else if (ch === ')') close++;
  }
  let end = candidate.length;
  while (end > 0) {
    const ch = candidate[end - 1];
    if (TRAILING_PUNCTUATION.includes(ch)) end--;
    else if (ch === ')' && close > open) { close--; end--; }
    else break;
  }
  return end;
}

/** Découpe un texte en morceaux texte et adresses `http(s)` ; tout autre schéma reste du texte. Jamais de HTML. */
export function splitLinks(text: string): LcTextPart[] {
  const parts: LcTextPart[] = [];
  let last = 0;
  const push = (to: number) => { if (to > last) parts.push({ type: 'text', text: text.slice(last, to) }); };
  for (const match of text.matchAll(URL_CANDIDATE)) {
    const raw = match[0].slice(0, trimmedEnd(match[0]));
    let href: string | undefined;
    try {
      const url = new URL(raw);
      if (url.protocol === 'http:' || url.protocol === 'https:') href = url.href;
    } catch { /* adresse invalide : reste du texte */ }
    if (!href) continue;
    push(match.index);
    parts.push({ type: 'link', text: raw, href });
    last = match.index + raw.length;
  }
  push(text.length);
  return parts;
}
