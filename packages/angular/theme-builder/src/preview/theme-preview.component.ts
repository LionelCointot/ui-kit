import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LC_LABELS, LcAvatarComponent, LcButtonComponent, LcIconComponent, type LcFillMode, type LcOption, type LcThemeColor } from '@lionelcointot/ui-angular';
import { LcLineChartComponent } from '@lionelcointot/ui-angular/charts';
import { type LcTableColumn, LcTableComponent } from '@lionelcointot/ui-angular/data';
import { LcAlertComponent, LcBadgeComponent, LcProgressBarComponent } from '@lionelcointot/ui-angular/feedback';
import {
  LcCheckboxDirective,
  LcFormFieldComponent,
  LcInputDirective,
  LcNumberInputComponent,
  LcSegmentedControlComponent,
  LcSelectDirective,
  LcSwitchComponent,
} from '@lionelcointot/ui-angular/forms';
import { LcCardComponent, LcCardHeaderComponent } from '@lionelcointot/ui-angular/layout';
import { LcTabComponent, LcTabsComponent } from '@lionelcointot/ui-angular/navigation';

interface SampleRow {
  readonly id: string;
  readonly name: string;
  readonly amount: number;
  readonly share: number;
}

const THEME_COLORS: readonly LcThemeColor[] = ['primary', 'secondary', 'success', 'warning', 'error', 'neutral'];
const FILL_MODES: readonly LcFillMode[] = ['solid', 'outline', 'flat'];
const YEARS = ['2026', '2027', '2028', '2029', '2030', '2031', '2032', '2033'];

/**
 * Galerie représentative des composants : boutons (tous les `themeColor` et remplissages), champs, alertes, badges,
 * carte, tableau, onglets et graphique. Elle ne reçoit aucune entrée : elle s'affiche sous le thème courant du document
 * (`LcThemeService.preview`, ou le thème appliqué à <html>).
 */
@Component({
  selector: 'lc-theme-preview',
  imports: [
    LcAlertComponent, LcAvatarComponent, LcBadgeComponent, LcButtonComponent, LcCardComponent, LcCardHeaderComponent,
    LcCheckboxDirective, LcFormFieldComponent, LcIconComponent, LcInputDirective, LcLineChartComponent,
    LcNumberInputComponent, LcProgressBarComponent, LcSegmentedControlComponent, LcSelectDirective, LcSwitchComponent,
    LcTabComponent, LcTableComponent, LcTabsComponent,
  ],
  template: `
    <section class="lc-theme-preview__section" [attr.aria-label]="labels.themeBuilder.previewButtons">
      <h3 class="lc-theme-preview__title">{{ labels.themeBuilder.previewButtons }}</h3>
      @for (fillMode of fillModes; track fillMode) {
        <div class="lc-theme-preview__row">
          @for (color of colors(); track color.value) {
            <button lcButton type="button" [themeColor]="color.value" [fillMode]="fillMode">{{ color.label }}</button>
          }
          <button lcButton type="button" [fillMode]="fillMode" disabled>{{ samples.neutral }}</button>
        </div>
      }
      <div class="lc-theme-preview__row">
        <button lcButton type="button" iconOnly fillMode="solid" [attr.aria-label]="samples.primary"><lc-icon name="check" /></button>
        <lc-avatar name="Élodie Martin" />
        <lc-badge themeColor="primary" fillMode="solid">{{ samples.badge }}</lc-badge>
        <lc-badge themeColor="success">{{ samples.success }}</lc-badge>
        <lc-badge themeColor="warning">{{ samples.warning }}</lc-badge>
        <lc-badge themeColor="error">{{ samples.error }}</lc-badge>
        <lc-badge>{{ samples.neutral }}</lc-badge>
      </div>
    </section>

    <section class="lc-theme-preview__section" [attr.aria-label]="labels.themeBuilder.previewFields">
      <h3 class="lc-theme-preview__title">{{ labels.themeBuilder.previewFields }}</h3>
      <div class="lc-theme-preview__fields">
        <lc-form-field [label]="samples.text">
          <input lcInput type="text" [value]="samples.textValue" />
        </lc-form-field>
        <lc-form-field [label]="samples.number">
          <lc-number-input [value]="1250" [decimals]="0" unit="€" />
        </lc-form-field>
        <lc-form-field [label]="samples.select">
          <select lcSelect><option>{{ samples.optionOne }}</option><option>{{ samples.optionTwo }}</option></select>
        </lc-form-field>
        <lc-form-field [label]="samples.invalid" [errors]="[samples.invalidMessage]">
          <input lcInput type="text" [invalid]="true" [touched]="true" />
        </lc-form-field>
      </div>
      <div class="lc-theme-preview__row">
        <label class="lc-theme-preview__check"><input lcCheckbox type="checkbox" checked /> {{ samples.checkbox }}</label>
        <label class="lc-theme-preview__check"><button lcSwitch type="button" [(checked)]="switched"></button> {{ samples.switch }}</label>
        <lc-segmented-control [options]="segments()" [(value)]="segment" [ariaLabel]="samples.segmentOne" />
      </div>
    </section>

    <section class="lc-theme-preview__section" [attr.aria-label]="labels.themeBuilder.previewFeedback">
      <h3 class="lc-theme-preview__title">{{ labels.themeBuilder.previewFeedback }}</h3>
      <div class="lc-theme-preview__stack">
        <lc-alert kind="info" [title]="samples.alertInfo">{{ samples.alertText }}</lc-alert>
        <lc-alert kind="success" [title]="samples.alertSuccess">{{ samples.alertText }}</lc-alert>
        <lc-alert kind="warning" [title]="samples.alertWarning">{{ samples.alertText }}</lc-alert>
        <lc-alert kind="error" [title]="samples.alertError">{{ samples.alertText }}</lc-alert>
        <lc-progress-bar [value]="62" [label]="samples.progress" />
      </div>
    </section>

    <section class="lc-theme-preview__section" [attr.aria-label]="labels.themeBuilder.previewNavigation">
      <h3 class="lc-theme-preview__title">{{ labels.themeBuilder.previewNavigation }}</h3>
      <lc-card>
        <lc-card-header [title]="samples.cardTitle" [subtitle]="samples.cardSubtitle" />
        <p class="lc-theme-preview__text">{{ samples.cardBody }}</p>
        <lc-tabs [ariaLabel]="samples.tabOne">
          <lc-tab id="one" [label]="samples.tabOne"><p class="lc-theme-preview__text">{{ samples.tabBody }}</p></lc-tab>
          <lc-tab id="two" [label]="samples.tabTwo"><p class="lc-theme-preview__text">{{ samples.tabBody }}</p></lc-tab>
        </lc-tabs>
      </lc-card>
    </section>

    <section class="lc-theme-preview__section" [attr.aria-label]="labels.themeBuilder.previewData">
      <h3 class="lc-theme-preview__title">{{ labels.themeBuilder.previewData }}</h3>
      <lc-table [data]="rows()" [columns]="columns()" [trackBy]="trackRow" [caption]="samples.tableCaption" />
    </section>

    <section class="lc-theme-preview__section" [attr.aria-label]="labels.themeBuilder.previewChart">
      <h3 class="lc-theme-preview__title">{{ labels.themeBuilder.previewChart }}</h3>
      <lc-line-chart [title]="samples.chartTitle" [description]="samples.chartDescription" [data]="chartData()" height="240px" />
    </section>
  `,
  styleUrl: './theme-preview.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-theme-preview' },
})
export class LcThemePreviewComponent {
  protected readonly labels = inject(LC_LABELS);
  protected readonly samples = this.labels.themeBuilder.previewSamples;
  protected readonly fillModes = FILL_MODES;
  protected readonly switched = signal(true);
  protected readonly segment = signal<string | null>('two');
  protected readonly trackRow = (row: SampleRow): string => row.id;

  protected readonly colors = computed(() => THEME_COLORS.map((value) => ({ value, label: this.samples[value] })));
  protected readonly segments = computed<readonly LcOption<string>[]>(() => [
    { value: 'one', label: this.samples.segmentOne },
    { value: 'two', label: this.samples.segmentTwo },
    { value: 'three', label: this.samples.segmentThree },
  ]);
  protected readonly rows = computed<readonly SampleRow[]>(() => [
    { id: 'a', name: this.samples.rowA, amount: 12400, share: 0.46 },
    { id: 'b', name: this.samples.rowB, amount: 8200, share: 0.3 },
    { id: 'c', name: this.samples.rowC, amount: 6600, share: 0.24 },
  ]);
  protected readonly columns = computed<readonly LcTableColumn<SampleRow>[]>(() => [
    { id: 'name', header: this.samples.colName, value: (row) => row.name, sortable: true },
    { id: 'amount', header: this.samples.colAmount, value: (row) => row.amount, format: 'money', sortable: true },
    { id: 'share', header: this.samples.colShare, value: (row) => row.share, format: 'percent' },
  ]);
  protected readonly chartData = computed(() => ({
    categories: YEARS,
    categoryKind: 'year' as const,
    series: [
      { id: 'a', label: this.samples.seriesOne, values: YEARS.map((_, index) => 40 + index * 6) },
      { id: 'b', label: this.samples.seriesTwo, values: YEARS.map((_, index) => 70 - index * 3) },
      { id: 'c', label: this.samples.seriesThree, values: YEARS.map((_, index) => 20 + index * 2) },
    ],
  }));
}
