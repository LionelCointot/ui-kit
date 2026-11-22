import type { LcStatusBadgeKind } from '../status-icons';

/** Ton d'un repère : les rôles de `lc-status-badge`. */
export type LcThreadTone = LcStatusBadgeKind;

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
  /** `system` : repère centré (pastille `text`), hors groupe. */
  kind?: 'message' | 'system';
  /** Classe posée par l'application (note interne) : redéfinit les jetons de bulle. */
  cssClass?: string;
  /** Texte court sous l'en-tête du groupe (« Restreint »). */
  mention?: string;
  /** system : rôle de couleur de la pastille ; `neutral` par défaut. */
  tone?: LcThreadTone;
  /** system : icône `lc-icon` de la pastille ; celle du ton par défaut. */
  icon?: string;
  /** system : seconde ligne, sous la pastille (raison). */
  detail?: string;
  /** system : phrase lue à la place de la pastille, de la seconde ligne et de l'heure. */
  ariaLabel?: string;
  /** system : libellé d'un bouton sous le repère ; un clic émet `systemAction`. */
  actionLabel?: string;
}
