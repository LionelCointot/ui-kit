/** Plafond d'un nom de fichier dans un nom accessible ou une annonce. */
export const MAX_ANNOUNCED_NAME = 80;

// Caractères de contrôle (C0, DEL, C1), marqueurs bidirectionnels (ALM, LRM, RLM, LRE à RLO, LRI à PDI) et invisibles (ZWSP à ZWJ, WJ, BOM, LS, PS).
const UNSAFE_CHARS = /[\u0000-\u001F\u007F-\u009F\u061C\u200B-\u200F\u2028-\u202E\u2060\u2066-\u2069\uFEFF]/g;

/** Nom à afficher : sans caractères de contrôle ni marqueurs bidi (le `File.name` d'origine n'est jamais modifié). */
export function cleanFileName(name: string): string {
  return name.replace(UNSAFE_CHARS, '');
}

/** Nom court pour un nom accessible ou une annonce : au plus 80 caractères, « … » compris. */
export function announcedName(name: string): string {
  const chars = Array.from(cleanFileName(name));
  return chars.length > MAX_ANNOUNCED_NAME ? `${chars.slice(0, MAX_ANNOUNCED_NAME - 1).join('')}…` : chars.join('');
}

/** Aperçu admis : `blob:`, `data:image/` ou même origine (aucune requête vers un tiers, aucun schéma exécutable). */
export function isSafePreviewUrl(url: string, base: string): boolean {
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

/** Taille lisible, unités du kit (1 Ko = 1 000 octets) : « 2,3 Mo ». */
export function fileSizeText(bytes: number, units: readonly string[], formatNumber: (value: number) => string): string {
  let value = Number.isFinite(bytes) ? Math.max(0, bytes) : 0;
  let unit = 0;
  let shown = Math.round(value);
  // On passe à l'unité supérieure quand la valeur arrondie atteint 1 000 (999 999 o : « 1 Mo », pas « 1 000 Ko »).
  while (shown >= 1000 && unit < 3) {
    value /= 1000;
    unit += 1;
    shown = Number(value.toFixed(value >= 100 ? 0 : 1)); // décimale nulle omise : « 2 Mo », pas « 2,0 Mo »
  }
  return `${formatNumber(shown)}\u00A0${units[unit]}`; // espace insécable : le nombre et l'unité restent ensemble
}
