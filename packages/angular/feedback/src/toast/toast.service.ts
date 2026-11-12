import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Injectable, inject, signal, untracked } from '@angular/core';
import { LcStatusKind } from '@lionelcointot/ui-angular';

export interface LcToastOptions {
  readonly kind: LcStatusKind;
  readonly message: string;
  readonly action?: { readonly label: string; readonly run: () => void };
  /** Durée d'affichage (défaut 5 000 ms) ; ignorée pour 'error' (le toast reste jusqu'à sa fermeture). */
  readonly durationMs?: number;
}

/** Toast affiché (options + identifiant). */
export interface LcToast extends LcToastOptions {
  readonly id: number;
}

const MAX_VISIBLE_TOASTS = 3;
const DEFAULT_DURATION_MS = 5000;

interface ToastTimer {
  handle: ReturnType<typeof setTimeout> | null;
  remainingMs: number;
  startedAt: number;
}

/**
 * Notifications éphémères : au plus 3 visibles (le plus ancien qui n'est pas une erreur est retiré),
 * minuteur en pause au survol et au focus, annonce par LiveAnnouncer (assertive pour les erreurs).
 * L'affichage est assuré par `<lc-toast-outlet />`, à placer une fois à la racine de l'application.
 */
@Injectable({ providedIn: 'root' })
export class LcToastService {
  private readonly announcer = inject(LiveAnnouncer);
  private readonly timers = new Map<number, ToastTimer>();
  private readonly _toasts = signal<readonly LcToast[]>([]);
  private nextId = 0;

  /** Toasts visibles, du plus ancien au plus récent. */
  readonly toasts = this._toasts.asReadonly();

  show(options: LcToastOptions): void {
    this.nextId += 1;
    const toast: LcToast = { ...options, id: this.nextId };
    // `untracked` : appelé depuis un `effect`, `show()` ne doit pas le rendre dépendant de la liste qu'il modifie.
    let toasts = [...untracked(this._toasts), toast];
    while (toasts.length > MAX_VISIBLE_TOASTS) {
      const oldestNonError = toasts.findIndex((candidate) => candidate.kind !== 'error');
      const removed = oldestNonError >= 0 && oldestNonError < toasts.length - 1 ? oldestNonError : 0;
      this.clearTimer(toasts[removed].id);
      toasts = toasts.filter((_, index) => index !== removed);
    }
    this._toasts.set(toasts);
    if (toast.kind !== 'error') {
      this.timers.set(toast.id, { handle: null, remainingMs: options.durationMs ?? DEFAULT_DURATION_MS, startedAt: 0 });
      this.resume(toast.id);
    }
    void this.announcer.announce(options.message, toast.kind === 'error' ? 'assertive' : 'polite');
  }

  dismiss(id: number): void {
    this.clearTimer(id);
    this._toasts.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  dismissAll(): void {
    for (const id of this.timers.keys()) this.clearTimer(id);
    this._toasts.set([]);
  }

  /** Met le minuteur en pause (survol, focus). */
  pause(id: number): void {
    const timer = this.timers.get(id);
    if (!timer?.handle) return;
    clearTimeout(timer.handle);
    timer.handle = null;
    timer.remainingMs = Math.max(0, timer.remainingMs - (Date.now() - timer.startedAt));
  }

  /** Relance le minuteur pour le temps restant. */
  resume(id: number): void {
    const timer = this.timers.get(id);
    if (!timer || timer.handle) return;
    timer.startedAt = Date.now();
    timer.handle = setTimeout(() => this.dismiss(id), timer.remainingMs);
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer?.handle) clearTimeout(timer.handle);
    this.timers.delete(id);
  }
}
