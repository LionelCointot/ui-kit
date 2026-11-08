import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';
import { LC_THEME_NAMES } from './options';
import { LcThemeChoice } from './types';

const STORAGE_KEY = 'lc-theme-choice';

/**
 * Thème : pose data-theme sur <html> selon le choix (auto, clair, sombre) et prefers-color-scheme.
 * Le choix est mémorisé dans localStorage quand c'est possible (lecture et écriture protégées).
 */
@Injectable({ providedIn: 'root' })
export class LcThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly names = inject(LC_THEME_NAMES);
  private readonly prefersDark = signal(this.mediaQuery()?.matches ?? false);
  private readonly _choice = signal<LcThemeChoice>(this.readStoredChoice());

  readonly choice = this._choice.asReadonly();
  readonly resolvedScheme = computed<'light' | 'dark'>(() =>
    this._choice() === 'auto' ? (this.prefersDark() ? 'dark' : 'light') : (this._choice() as 'light' | 'dark'));
  readonly themeName = computed(() => (this.resolvedScheme() === 'dark' ? this.names.dark : this.names.light));

  constructor() {
    this.mediaQuery()?.addEventListener('change', (event) => this.prefersDark.set(event.matches));
    // Synchronisation avec l'extérieur (DOM, stockage) : usage légitime d'effect().
    effect(() => {
      this.document.documentElement.setAttribute('data-theme', this.themeName());
      this.document.documentElement.style.colorScheme = this.resolvedScheme();
    });
  }

  setChoice(choice: LcThemeChoice): void {
    this._choice.set(choice);
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Stockage indisponible (navigation privée, webview restreinte) : le choix vaut pour la session.
    }
  }

  private readStoredChoice(): LcThemeChoice {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' || stored === 'auto' ? stored : 'auto';
    } catch {
      return 'auto';
    }
  }

  private mediaQuery(): MediaQueryList | null {
    return this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  }
}
