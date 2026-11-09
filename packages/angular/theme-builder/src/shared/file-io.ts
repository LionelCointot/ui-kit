/** Taille maximale d'un fichier de thème importé (un thème complet pèse quelques Kio). */
export const LC_THEME_MAX_IMPORT_BYTES = 256 * 1024;

/** Télécharge un texte comme fichier (Blob + lien temporaire) ; l'URL d'objet est libérée aussitôt. */
export function downloadTextFile(document: Document, fileName: string, content: string, mimeType: string): void {
  const view = document.defaultView;
  if (!view) return;
  const url = view.URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  view.setTimeout(() => view.URL.revokeObjectURL(url));
}
