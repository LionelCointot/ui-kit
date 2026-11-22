import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LcButtonComponent } from '../button/button.component';
import { LC_LABELS } from '../core/labels';
import { LcThemeService } from '../core/theme.service';
import { LcFillMode, LcSize, LcThemeChoice } from '../core/types';
import { LcIconComponent } from '../icon/icon.component';

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
 *
 * @example <lc-theme-toggle />
 */
@Component({
  selector: 'lc-theme-toggle',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <button lcButton type="button" iconOnly themeColor="neutral" [fillMode]="fillMode()" [size]="size()"
      [attr.aria-label]="name()" [attr.title]="name()" (click)="theme.setChoice(next().choice)">
      <lc-icon [name]="current().icon" />
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-theme-toggle' },
})
export class LcThemeToggleComponent {
  protected readonly theme = inject(LcThemeService);
  private readonly labels = inject(LC_LABELS).themeToggle;

  protected readonly current = computed(() => CYCLE.find((o) => o.choice === this.theme.choice()) ?? CYCLE[2]);
  protected readonly next = computed(() => CYCLE[(CYCLE.indexOf(this.current()) + 1) % CYCLE.length]);
  protected readonly name = computed(() => this.labels.name(this.labels[this.current().label], this.labels[this.next().label]));

  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
}
