import { lcStripUnsafeChars } from '@lionelcointot/ui-angular';

/** Plafond d'un nom de fichier dans un nom accessible ou une annonce. */
const MAX_ANNOUNCED_NAME = 80;

/** Nom à afficher : sans caractères de contrôle ni marqueurs bidi, `\n` et `\t` compris (le `File.name` d'origine n'est jamais modifié). */
export function cleanFileName(name: string): string {
  return lcStripUnsafeChars(name).replace(/[\n\t]/g, '');
}

/** Nom court pour un nom accessible ou une annonce : au plus 80 caractères, « … » compris. */
export function announcedName(name: string): string {
  const chars = Array.from(cleanFileName(name));
  return chars.length > MAX_ANNOUNCED_NAME ? `${chars.slice(0, MAX_ANNOUNCED_NAME - 1).join('')}…` : chars.join('');
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

const FAMILY_EXTENSIONS: Record<string, readonly string[]> = {
  'image/*': ['.jpg', '.png', '.gif', '.webp', '.heic'],
  'video/*': ['.mp4', '.mov', '.webm'],
  'audio/*': ['.mp3', '.m4a', '.wav'],
};

/** Extensions lisibles des types de `accept` (« .jpg, .png, .pdf »), dans l'ordre, sans doublon ; vide si `accept` est vide. */
export function acceptedFilesText(accept: string): string {
  const extensions = accept.split(',').map((token) => token.trim().toLowerCase()).filter(Boolean).flatMap((token) => {
    if (token.startsWith('.')) return [token];
    if (FAMILY_EXTENSIONS[token]) return FAMILY_EXTENSIONS[token];
    if (token.endsWith('/*')) return [token];
    const subtype = token.slice(token.indexOf('/') + 1).split('+')[0];
    return [subtype === 'jpeg' ? '.jpg' : `.${subtype}`];
  });
  return [...new Set(extensions)].join(', ');
}
