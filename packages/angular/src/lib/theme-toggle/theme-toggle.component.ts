import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { LcButtonGroupComponent } from '../button/button-group.component';
import { LcButtonComponent } from '../button/button.component';
import { LC_LABELS } from '../core/labels';
import { LcThemeService } from '../core/theme.service';
import { LcFillMode, LcSize, LcThemeChoice } from '../core/types';
import { LcIconComponent } from '../icon/icon.component';

/**
 * Bascule de thème : trois boutons (clair, sombre, système) liés à `LcThemeService` (`choice`, `setChoice`). Le choix
 * courant est exposé par `aria-pressed` ; les noms viennent de `LC_LABELS.themeToggle`, repris en infobulle native (`title`).
 *
 * @example <lc-theme-toggle />
 */
@Component({
  selector: 'lc-theme-toggle',
  imports: [LcButtonGroupComponent, LcButtonComponent, LcIconComponent],
  template: `
    <lc-button-group [ariaLabel]="labels.themeToggle.group" attached>
      @for (option of options; track option.choice) {
        <button lcButton type="button" iconOnly themeColor="neutral" [fillMode]="fillMode()" [size]="size()"
          [pressed]="theme.choice() === option.choice" [attr.aria-label]="labels.themeToggle[option.label]"
          [attr.title]="labels.themeToggle[option.label]" (click)="theme.setChoice(option.choice)">
          <lc-icon [name]="option.icon" />
        </button>
      }
    </lc-button-group>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-theme-toggle' },
})
export class LcThemeToggleComponent {
  protected readonly theme = inject(LcThemeService);
  protected readonly labels = inject(LC_LABELS);
  protected readonly options: readonly { choice: LcThemeChoice; icon: string; label: 'light' | 'dark' | 'system' }[] = [
    { choice: 'light', icon: 'sun', label: 'light' },
    { choice: 'dark', icon: 'moon', label: 'dark' },
    { choice: 'auto', icon: 'monitor', label: 'system' },
  ];

  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
}
