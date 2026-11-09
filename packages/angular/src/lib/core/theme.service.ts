import { DOCUMENT, Injectable, computed, effect, inject, isDevMode, signal } from '@angular/core';
import { type LcThemeDefinition, overrideVars, renderThemeCss, validateTheme } from '@lionelcointot/ui-tokens/theme';
import { LC_THEME_NAMES } from './options';
import { LcThemeChoice } from './types';

const STORAGE_KEY = 'lc-theme-choice';
const RUNTIME_STYLE_ID = 'lc-runtime-themes';

/**
 * Thème : pose data-theme sur <html> selon le choix (auto, clair, sombre) et prefers-color-scheme.
 * Le choix est mémorisé dans localStorage quand c'est possible (lecture et écriture protégées).
 *
 * Thèmes à l'exécution (additif) : `registerThemes` enregistre des thèmes personnalisés, `setCustomTheme` en active un
 * (il prend le pas sur le choix, rien n'est persisté : c'est au consommateur de le faire) et `preview` prévisualise des
 * surcharges en direct sur tout le document, sans rien enregistrer.
 */
@Injectable({ providedIn: 'root' })
export class LcThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly names = inject(LC_THEME_NAMES);
  private readonly prefersDark = signal(this.mediaQuery()?.matches ?? false);
  private readonly _choice = signal<LcThemeChoice>(this.readStoredChoice());

  private readonly registered = signal<readonly LcThemeDefinition[]>([]);
  private readonly _customTheme = signal<string | null>(null);
  private readonly previewed = signal<LcThemeDefinition | null>(null);
  private readonly _revision = signal(0);
  private readonly activeCustom = computed(() => this.registered().find((theme) => theme.name === this._customTheme()) ?? null);
  private readonly choiceScheme = computed<'light' | 'dark'>(() =>
    this._choice() === 'auto' ? (this.prefersDark() ? 'dark' : 'light') : (this._choice() as 'light' | 'dark'));
  private appliedVars = new Set<string>();
  private pendingVars: Record<string, string> | null = null;
  private pendingFrame: number | null = null;

  readonly choice = this._choice.asReadonly();
  /** Nom du thème personnalisé actif (voir `setCustomTheme`), ou null. */
  readonly customTheme = this._customTheme.asReadonly();
  /** Incrémenté à chaque changement de thème (choix, thème personnalisé, enregistrement, prévisualisation). */
  readonly revision = this._revision.asReadonly();
  /** Prévisualisation > thème personnalisé > choix. Le thème de base d'un thème personnalisé fixe le color-scheme. */
  readonly resolvedScheme = computed<'light' | 'dark'>(() => {
    const forced = this.previewed() ?? this.activeCustom();
    return forced ? (forced.extends === 'dark' ? 'dark' : 'light') : this.choiceScheme();
  });
  readonly themeName = computed(() => {
    const custom = this.previewed() ? null : this.activeCustom();
    return custom ? custom.name : this.resolvedScheme() === 'dark' ? this.names.dark : this.names.light;
  });

  constructor() {
    this.mediaQuery()?.addEventListener('change', (event) => {
      this.prefersDark.set(event.matches);
      this.bumpRevision();
    });
    // Synchronisation avec l'extérieur (DOM, stockage) : usage légitime d'effect().
    effect(() => {
      this.document.documentElement.setAttribute('data-theme', this.themeName());
      this.document.documentElement.style.colorScheme = this.resolvedScheme();
    });
  }

  setChoice(choice: LcThemeChoice): void {
    this._choice.set(choice);
    this.bumpRevision();
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // Stockage indisponible (navigation privée, webview restreinte) : le choix vaut pour la session.
    }
  }

  /**
   * Remplace l'ensemble des thèmes personnalisés par ceux de `definitions` : une seule feuille
   * `<style id="lc-runtime-themes">` générée avec `renderThemeCss`. Les thèmes invalides ou en double sont ignorés
   * (signalés en console en développement) : une valeur refusée n'atteint jamais le DOM.
   */
  registerThemes(definitions: readonly LcThemeDefinition[]): void {
    const accepted: LcThemeDefinition[] = [];
    for (const definition of definitions) {
      const { valid, errors } = validateTheme(definition);
      if (!valid) this.warn(`Thème personnalisé ignoré (« ${String(definition?.name)} ») : ${errors.map((error) => error.message).join(' ')}`);
      else if (accepted.some((theme) => theme.name === definition.name)) this.warn(`Thème personnalisé « ${definition.name} » en double : ignoré.`);
      else accepted.push(definition);
    }
    this.registered.set(accepted);
    this.writeRuntimeStyle(accepted);
    if (this._customTheme() !== null && !accepted.some((theme) => theme.name === this._customTheme())) this._customTheme.set(null);
    this.bumpRevision();
  }

  /** Active un thème enregistré (`null` : retour au choix clair, sombre ou automatique). Un nom inconnu est ignoré. */
  setCustomTheme(name: string | null): void {
    if (name !== null && !this.registered().some((theme) => theme.name === name)) {
      this.warn(`Thème personnalisé inconnu : « ${name} » (appeler registerThemes d'abord).`);
      return;
    }
    this._customTheme.set(name);
    this.bumpRevision();
  }

  /**
   * Prévisualise un thème en direct sur tout le document : `data-theme` prend le thème de base et les surcharges
   * deviennent des variables inline sur <html>, regroupées par image (requestAnimationFrame). `null` restaure l'état
   * précédent. Le nom et le libellé ne comptent pas ; une base ou des surcharges invalides laissent l'état inchangé.
   */
  preview(definition: LcThemeDefinition | null): void {
    if (definition === null) {
      this.previewed.set(null);
      this.cancelPendingFrame();
      this.clearInlineVars();
      this.bumpRevision();
      return;
    }
    const { valid, errors } = validateTheme(definition, { identity: false });
    if (!valid) {
      this.warn(`Prévisualisation ignorée : ${errors.map((error) => error.message).join(' ')}`);
      return;
    }
    this.previewed.set(definition);
    this.pendingVars = overrideVars(definition);
    this.bumpRevision();
    this.scheduleInlineVars();
  }

  private bumpRevision(): void {
    this._revision.update((value) => value + 1);
  }

  private scheduleInlineVars(): void {
    if (this.pendingFrame !== null) return;
    const view = this.document.defaultView;
    if (!view?.requestAnimationFrame) {
      this.applyInlineVars();
      return;
    }
    this.pendingFrame = view.requestAnimationFrame(() => {
      this.pendingFrame = null;
      this.applyInlineVars();
      // Les graphiques relisent les variables : elles viennent d'être posées.
      this.bumpRevision();
    });
  }

  private cancelPendingFrame(): void {
    if (this.pendingFrame !== null) this.document.defaultView?.cancelAnimationFrame(this.pendingFrame);
    this.pendingFrame = null;
    this.pendingVars = null;
  }

  private applyInlineVars(): void {
    const next = this.pendingVars;
    this.pendingVars = null;
    if (!next) return;
    const style = this.document.documentElement.style;
    for (const name of this.appliedVars) if (!(name in next)) style.removeProperty(name);
    for (const [name, value] of Object.entries(next)) style.setProperty(name, value);
    this.appliedVars = new Set(Object.keys(next));
  }

  private clearInlineVars(): void {
    const style = this.document.documentElement.style;
    for (const name of this.appliedVars) style.removeProperty(name);
    this.appliedVars = new Set();
  }

  private writeRuntimeStyle(themes: readonly LcThemeDefinition[]): void {
    const head = this.document.head;
    let element = this.document.getElementById(RUNTIME_STYLE_ID);
    if (themes.length === 0) {
      element?.remove();
      return;
    }
    if (!element) {
      element = this.document.createElement('style');
      element.id = RUNTIME_STYLE_ID;
      head.appendChild(element);
    }
    // Texte brut (jamais de balisage) ; chaque valeur a passé la liste blanche de validateTheme.
    element.textContent = themes.map((theme) => renderThemeCss(theme)).join('\n');
  }

  private warn(message: string): void {
    if (isDevMode()) console.warn(`[lc-theme] ${message}`);
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
