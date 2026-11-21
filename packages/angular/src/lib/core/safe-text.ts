// Caractères de contrôle (C0, DEL, C1), marqueurs bidirectionnels (ALM, LRM, RLM, LRE à RLO, LRI à PDI) et invisibles (ZWSP à ZWJ, WJ, BOM, LS, PS) ; `\n` (U+000A) et `\t` (U+0009) sont gardés.
const UNSAFE_CHARS = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F؜​-‏ -‮⁠⁦-⁩﻿]/g;

/** Texte à afficher sans caractères de contrôle ni marqueurs bidi (retours à la ligne et tabulations conservés). */
export function lcStripUnsafeChars(text: string): string {
  return text.replace(UNSAFE_CHARS, '');
}

/** Aperçu admis : `blob:`, `data:image/` ou même origine (aucune requête vers un tiers, aucun schéma exécutable). */
export function isSafePreviewUrl(url: string, base: string = globalThis.document?.baseURI ?? 'about:blank'): boolean {
  const lower = url.trim().toLowerCase();
  if (lower.startsWith('blob:') || lower.startsWith('data:image/')) return true;
  try {
    const target = new URL(url, base);
    const root = new URL(base);
    // Base `file:`, `about:srcdoc`… : l'origine est opaque ; `javascript:` et `data:text/html` ne sont jamais « de même origine ».
    return /^https?:$/.test(root.protocol) && /^https?:$/.test(target.protocol) && target.origin === root.origin;
  } catch {
    return false;
  }
}
