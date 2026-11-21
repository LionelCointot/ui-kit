/** Pièce jointe d'un message du fil ; `previewUrl` est filtrée avant affichage (`isSafePreviewUrl`). */
export interface LcThreadAttachment {
  id: string;
  name: string;
  previewUrl?: string;
}

/** Message du fil, fourni tel quel par l'application (ordre du plus ancien au plus récent). */
export interface LcThreadMessage {
  /** Stable : sert à détecter l'arrivée d'un message. */
  id: string;
  /** Clé du regroupement. */
  authorId: string;
  /** Affiché en tête de groupe (initiales de l'avatar). */
  authorName: string;
  /** Vrai : bulle à droite. */
  mine: boolean;
  /** Date ISO 8601. */
  sentAt: string;
  text?: string;
  attachments?: LcThreadAttachment[];
  /** `system` : ligne centrée, hors groupe. */
  kind?: 'message' | 'system';
  /** Classe posée par l'application (note interne) : redéfinit les jetons de bulle. */
  cssClass?: string;
  /** Texte court sous l'en-tête du groupe (« Note interne »). */
  mention?: string;
}
