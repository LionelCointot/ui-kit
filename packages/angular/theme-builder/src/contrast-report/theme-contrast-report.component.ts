import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LC_LABELS, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcBadgeComponent } from '@lionelcointot/ui-angular/feedback';
import { type LcContrastResult, checkContrast, themeSchema } from '@lionelcointot/ui-tokens/theme';

interface ContrastRow extends LcContrastResult {
  readonly pairLabel: string;
  readonly ratioText: string;
  readonly requiredText: string;
}

/**
 * Rapport de contraste WCAG d'un thème : une ligne par paire texte / fond contrôlée (mêmes paires et même calcul
 * que `lc-tokens`), avec ratio, seuil et résultat. Le résumé est annoncé (`role="status"`) quand il change ;
 * le résultat n'est jamais porté par la seule couleur (texte et icône).
 *
 * @example <lc-theme-contrast-report [resolved]="resolvedTheme()" />
 */
@Component({
  selector: 'lc-theme-contrast-report',
  imports: [LcBadgeComponent, LcIconComponent],
  template: `
    <section class="lc-theme-contrast" [attr.aria-label]="labels.themeBuilder.contrastTitle">
      <h3 class="lc-theme-contrast__title">{{ labels.themeBuilder.contrastTitle }}</h3>
      <p class="lc-theme-contrast__summary" role="status">{{ summary() }}</p>
      <div class="lc-theme-contrast__scroll">
        <table class="lc-theme-contrast__table">
          <caption class="lc-theme-contrast__caption">{{ labels.themeBuilder.contrastTitle }}</caption>
          <thead>
            <tr>
              <th scope="col">{{ labels.themeBuilder.contrastColumnPair }}</th>
              <th scope="col" class="lc-theme-contrast__number">{{ labels.themeBuilder.contrastColumnRatio }}</th>
              <th scope="col" class="lc-theme-contrast__number">{{ labels.themeBuilder.contrastColumnRequired }}</th>
              <th scope="col">{{ labels.themeBuilder.contrastColumnResult }}</th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.fg + row.bg) {
              <tr [class.lc-theme-contrast__row--fail]="!row.pass">
                <th scope="row">
                  <span class="lc-theme-contrast__sample" aria-hidden="true" [style.color]="row.fgValue" [style.background]="row.bgValue">Aa</span>
                  {{ row.pairLabel }}
                </th>
                <td class="lc-theme-contrast__number">{{ row.ratioText }}</td>
                <td class="lc-theme-contrast__number">{{ row.requiredText }}</td>
                <td>
                  <lc-badge [themeColor]="row.pass ? 'success' : 'error'" fillMode="flat">
                    <lc-icon [name]="row.pass ? 'circle-check' : 'circle-alert'" />
                    {{ row.pass ? labels.themeBuilder.contrastPass : labels.themeBuilder.contrastFail }}
                  </lc-badge>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  styleUrl: './theme-contrast-report.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-theme-contrast-report' },
})
export class LcThemeContrastReportComponent {
  protected readonly labels = inject(LC_LABELS);

  /** Valeurs résolues du thème : variable CSS → valeur (`resolveTheme`). */
  readonly resolved = input.required<Readonly<Record<string, string>>>();

  protected readonly rows = computed<readonly ContrastRow[]>(() =>
    checkContrast(this.resolved()).map((result) => ({
      ...result,
      pairLabel: this.labels.themeBuilder.contrastPair(this.tokenName(result.fg), this.tokenName(result.bg)),
      ratioText: `${result.ratio.toFixed(2)}:1`,
      requiredText: `${result.required}:1`,
    })));

  protected readonly summary = computed(() => {
    const rows = this.rows();
    return this.labels.themeBuilder.contrastSummary(rows.filter((row) => !row.pass).length, rows.length);
  });

  private tokenName(path: string): string {
    return this.labels.themeBuilder.tokens[path] ?? themeSchema.find((token) => token.path === path)?.label ?? path;
  }
}
