/** Raison du refus d'un fichier : type non accepté, ou nombre maximal de fichiers dépassé. */
export type LcFileRejectionReason = 'type' | 'count';

export interface LcFileRefusal {
  readonly file: File;
  readonly reason: LcFileRejectionReason;
}

export interface LcFileFilterOptions {
  /** Types acceptés, au format de l'attribut natif. Vide : tous. */
  readonly accept: string;
  /** Nombre de fichiers encore acceptables (`Infinity` : sans limite). */
  readonly room: number;
  /** Faux : un seul fichier au plus. */
  readonly multiple: boolean;
  /** Vrai : les fichiers de 0 octet (dossiers déposés, fichiers vides) sont ignorés, ni acceptés ni refusés. */
  readonly skipEmpty?: boolean;
}

/** Vrai si le fichier correspond à `accept` (types MIME, `type/*` ou extensions, comme l'attribut natif). */
export function matchesAccept(file: File, accept: string): boolean {
  const tokens = accept.split(',').map((token) => token.trim().toLowerCase()).filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) =>
    token.startsWith('.') ? name.endsWith(token) : token.endsWith('/*') ? type.startsWith(token.slice(0, -1)) : type === token);
}

/** Trie les fichiers reçus, dans l'ordre : type d'abord, puis place restante (et un seul fichier sans `multiple`). */
export function filterFiles(list: Iterable<File>, options: LcFileFilterOptions): { accepted: File[]; refused: LcFileRefusal[] } {
  const room = Math.min(options.room, options.multiple ? Infinity : 1);
  const accepted: File[] = [];
  const refused: LcFileRefusal[] = [];
  for (const file of list) {
    if (options.skipEmpty && file.size === 0) continue;
    if (!matchesAccept(file, options.accept)) refused.push({ file, reason: 'type' });
    else if (accepted.length >= room) refused.push({ file, reason: 'count' });
    else accepted.push(file);
  }
  return { accepted, refused };
}

/** Vrai si le glisser contient des fichiers (et non du texte ou un lien). */
export function dragHasFiles(event: DragEvent): event is DragEvent & { dataTransfer: DataTransfer } {
  return event.dataTransfer?.types.includes('Files') ?? false;
}

/** Vrai si le pointeur quitte vraiment la zone (et ne passe pas à l'un de ses descendants). */
export function dragLeftZone(event: DragEvent): boolean {
  return !(event.currentTarget as HTMLElement).contains(event.relatedTarget as Node | null);
}

/** Fichiers d'un dépôt, sans les dossiers ni les éléments qui ne sont pas des fichiers. */
export function droppedFiles(data: DataTransfer): File[] {
  if (data.items?.length) {
    return Array.from(data.items).flatMap((item) => {
      if (item.kind !== 'file' || item.webkitGetAsEntry?.()?.isDirectory) return [];
      const file = item.getAsFile();
      return file ? [file] : [];
    });
  }
  return Array.from(data.files);
}
