import { ApplicationRef, ChangeDetectionStrategy, Component, DOCUMENT, computed, inject, input } from '@angular/core';
import { LcButtonComponent } from '../button/button.component';
import { LC_LABELS } from '../core/labels';
import { LcThemeService } from '../core/theme.service';
import { LcFillMode, LcSize, LcThemeChoice } from '../core/types';
import { LcIconComponent } from '../icon/icon.component';
import { lcAnimate, lcPrefersReducedMotion } from '../motion';

/** Ordre du cycle ; `sun-moon` (soleil et lune réunis) représente le thème du système. */
const CYCLE: readonly { choice: LcThemeChoice; icon: string; label: 'light' | 'dark' | 'system' }[] = [
  { choice: 'light', icon: 'sun', label: 'light' },
  { choice: 'dark', icon: 'moon', label: 'dark' },
  { choice: 'auto', icon: 'sun-moon', label: 'system' },
];

/**
 * Bascule de thème : un seul bouton icône qui fait tourner le choix de `LcThemeService` (clair, sombre, système, clair…).
 * L'icône montre le choix courant ; le nom accessible, repris en `title`, dit l'état et l'action (`LC_LABELS.themeToggle`).
 * Pas d'`aria-pressed` : le bouton a trois états, le nom les porte.
 * Le changement se révèle en cercle depuis le bouton (View Transitions, durée et courbe `--lc-theme-toggle-*`) ; sans l'API ou sous mouvement réduit, il est instantané.
 *
 * @example <lc-theme-toggle />
 */
@Component({
  selector: 'lc-theme-toggle',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <button lcButton type="button" iconOnly themeColor="neutral" [fillMode]="fillMode()" [size]="size()"
      [attr.aria-label]="name()" [attr.title]="name()" (click)="switchTheme($event)">
      <lc-icon [name]="current().icon" />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-theme-toggle' },
})
export class LcThemeToggleComponent {
  protected readonly theme = inject(LcThemeService);
  private readonly document = inject(DOCUMENT);
  private readonly app = inject(ApplicationRef);
  private readonly labels = inject(LC_LABELS).themeToggle;

  protected readonly current = computed(() => CYCLE.find((o) => o.choice === this.theme.choice()) ?? CYCLE[2]);
  protected readonly next = computed(() => CYCLE[(CYCLE.indexOf(this.current()) + 1) % CYCLE.length]);
  protected readonly name = computed(() => this.labels.name(this.labels[this.current().label], this.labels[this.next().label]));

  /** Révélation en cours (au plus une). */
  private run?: { stale: boolean; animation?: Animation };

  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);

  protected switchTheme(event: Event): void {
    const choice = this.next().choice;
    // `data-theme` est posé par un effect du service : `tick()` le vide avant que le navigateur photographie la nouvelle page.
    const apply = () => {
      this.theme.setChoice(choice);
      this.app.tick();
    };
    const doc = this.document;
    // Repli ADR 0009 : View Transitions hors Baseline 2024 ; retirer la garde quand l'API y entre.
    if (lcPrefersReducedMotion() || typeof doc.startViewTransition !== 'function') return apply();
    // Un second `startViewTransition` pendant la révélation fait planter l'onglet sous Chrome : bascule directe, cercle annulé.
    const busy = this.run;
    if (busy) {
      busy.stale = true;
      busy.animation?.cancel();
      return apply();
    }

    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = box.left + box.width / 2;
    const y = box.top + box.height / 2;
    const root = doc.documentElement;
    const radius = Math.hypot(Math.max(x, root.clientWidth - x), Math.max(y, root.clientHeight - y));
    const circle = (r: number) => `circle(${r}px at ${x}px ${y}px)`;

    root.setAttribute('data-lc-theme-switch', ''); // motion.css retire les fondus par défaut le temps de la bascule
    const run: { stale: boolean; animation?: Animation } = { stale: false };
    this.run = run;
    const transition = doc.startViewTransition(apply);
    // `ready` est rejetée quand la transition est abandonnée : la bascule a eu lieu quand même, rien à animer.
    transition.ready.then(
      () => {
        if (!run.stale) run.animation = lcAnimate(root, [{ clipPath: circle(0) }, { clipPath: circle(radius) }], { duration: '--lc-theme-toggle-duration', easing: '--lc-theme-toggle-easing', pseudoElement: '::view-transition-new(root)' });
      },
      () => undefined,
    );
    const clear = () => {
      this.run = undefined;
      root.removeAttribute('data-lc-theme-switch');
    };
    transition.finished.then(clear, clear);
  }
}
