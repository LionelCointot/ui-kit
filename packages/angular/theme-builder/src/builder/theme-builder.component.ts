import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, model, signal } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent, LcThemeService, type LcOption } from '@lionelcointot/ui-angular';
import { LcAlertComponent } from '@lionelcointot/ui-angular/feedback';
import { LcFormFieldComponent, LcInputDirective, LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';
import {
  type LcThemeBase,
  type LcThemeDefinition,
  fromDtcg,
  renderThemeCss,
  resolveTheme,
  toDtcg,
  validateTheme,
} from '@lionelcointot/ui-tokens/theme';
import { LcThemeContrastReportComponent } from '../contrast-report/theme-contrast-report.component';
import { LcThemeEditorComponent } from '../editor/theme-editor.component';
import { LcThemePreviewComponent } from '../preview/theme-preview.component';
import { LC_THEME_MAX_IMPORT_BYTES, downloadTextFile } from '../shared/file-io';
import { exportFileName } from '../shared/theme-model';

/** Thème de départ : la base claire, sans surcharge. */
export const LC_THEME_BUILDER_INITIAL: LcThemeDefinition = { name: 'mon-theme', extends: 'default', overrides: {} };

type Notice = { readonly kind: 'success' | 'error'; readonly text: string; readonly details: readonly string[] };

/**
 * Theme builder : éditeur, rapport de contraste et aperçu côte à côte (empilés sous 1024 px), avec export
 * (`.tokens.json`, `.css`, presse-papiers) et import d'un fichier DTCG. Tant qu'il est affiché, le thème édité est
 * prévisualisé sur tout le document (`LcThemeService.preview`) ; la prévisualisation est annulée à la destruction.
 *
 * @example <lc-theme-builder [(theme)]="theme" />
 */
@Component({
  selector: 'lc-theme-builder',
  imports: [
    LcAlertComponent, LcButtonComponent, LcFormFieldComponent, LcIconComponent, LcInputDirective,
    LcSegmentedControlComponent, LcThemeContrastReportComponent, LcThemeEditorComponent, LcThemePreviewComponent,
  ],
  template: `
    <header class="lc-theme-builder__bar">
      <h2 class="lc-theme-builder__heading">{{ labels.themeBuilder.builderTitle }}</h2>
      <lc-form-field class="lc-theme-builder__name" [label]="labels.themeBuilder.name" [hint]="labels.themeBuilder.nameHint" [errors]="nameErrors()">
        <input lcInput type="text" spellcheck="false" autocomplete="off" autocapitalize="off" [value]="theme().name" (input)="onName($event)" />
      </lc-form-field>
      <lc-form-field [label]="labels.themeBuilder.base">
        <lc-segmented-control [options]="baseOptions()" [value]="theme().extends" (valueChange)="onBase($event)" />
      </lc-form-field>
      <div class="lc-theme-builder__actions" role="group" [attr.aria-label]="labels.themeBuilder.actions">
        <button lcButton type="button" themeColor="primary" [disabled]="!canExport()" (click)="exportTokens()">
          <lc-icon name="download" /> {{ labels.themeBuilder.exportTokens }}
        </button>
        <button lcButton type="button" fillMode="outline" [disabled]="!canExport()" (click)="exportCss()">
          <lc-icon name="download" /> {{ labels.themeBuilder.exportCss }}
        </button>
        <button lcButton type="button" fillMode="outline" [disabled]="!canExport()" (click)="copy()">
          <lc-icon name="copy" /> {{ labels.themeBuilder.copy }}
        </button>
        <button lcButton type="button" fillMode="outline" (click)="fileInput.click()">
          <lc-icon name="upload" /> {{ labels.themeBuilder.import }}
        </button>
        <button lcButton type="button" fillMode="flat" themeColor="neutral" (click)="reset()">
          <lc-icon name="rotate-ccw" /> {{ labels.themeBuilder.reset }}
        </button>
        <input #fileInput class="lc-theme-builder__file" type="file" accept=".json,application/json" tabindex="-1"
          [attr.aria-label]="labels.themeBuilder.importFileLabel" (change)="onFile($event)" />
      </div>
    </header>

    @if (!canExport()) {
      <p class="lc-theme-builder__blocked">{{ labels.themeBuilder.exportBlocked }}</p>
    }
    <div class="lc-theme-builder__notice" role="status">
      @if (notice(); as current) {
        <lc-alert [kind]="current.kind" dismissible (dismissed)="notice.set(null)">
          {{ current.text }}
          @if (current.details.length > 0) {
            <ul class="lc-theme-builder__details">
              @for (detail of current.details; track detail) {
                <li>{{ detail }}</li>
              }
            </ul>
          }
        </lc-alert>
      }
    </div>

    <div class="lc-theme-builder__layout">
      <section class="lc-theme-builder__settings" [attr.aria-label]="labels.themeBuilder.settings">
        <lc-form-field [label]="labels.themeBuilder.mode">
          <lc-segmented-control [options]="modeOptions()" [(value)]="mode" />
        </lc-form-field>
        <lc-theme-editor [(theme)]="theme" [mode]="mode() ?? 'simple'" />
        <lc-theme-contrast-report [resolved]="resolved()" />
      </section>
      <section class="lc-theme-builder__preview" [attr.aria-label]="labels.themeBuilder.previewTitle">
        <lc-theme-preview />
      </section>
    </div>
  `,
  styleUrl: './theme-builder.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-theme-builder' },
})
export class LcThemeBuilderComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly themes = inject(LcThemeService);
  private readonly document = inject(DOCUMENT);

  /** Thème édité (`[(theme)]`). */
  readonly theme = model<LcThemeDefinition>(LC_THEME_BUILDER_INITIAL);

  protected readonly mode = signal<'simple' | 'advanced' | null>('simple');
  protected readonly notice = signal<Notice | null>(null);
  /** Un nom invalide reste dans le thème (affiché en erreur) : l'export est alors bloqué, l'aperçu continue. */
  private readonly validation = computed(() => validateTheme(this.theme()));
  protected readonly canExport = computed(() => this.validation().valid);
  protected readonly nameErrors = computed(() =>
    this.validation().errors.filter((issue) => issue.path === 'name').map((issue) => this.labels.themeBuilder.issue(issue.code, issue.path)));
  protected readonly resolved = computed(() => {
    const { valid } = validateTheme(this.theme(), { identity: false });
    return resolveTheme(valid ? this.theme() : { ...this.theme(), overrides: {} });
  });
  protected readonly baseOptions = computed<readonly LcOption<LcThemeBase>[]>(() => [
    { value: 'default', label: this.labels.themeBuilder.baseLight, icon: 'sun' },
    { value: 'dark', label: this.labels.themeBuilder.baseDark, icon: 'moon' },
  ]);
  protected readonly modeOptions = computed<readonly LcOption<'simple' | 'advanced'>[]>(() => [
    { value: 'simple', label: this.labels.themeBuilder.modeSimple },
    { value: 'advanced', label: this.labels.themeBuilder.modeAdvanced },
  ]);

  constructor() {
    // Synchronisation avec l'extérieur (document) : prévisualisation en direct tant que le builder est affiché.
    effect(() => {
      const theme = this.theme();
      if (validateTheme(theme, { identity: false }).valid) this.themes.preview(theme);
    });
    inject(DestroyRef).onDestroy(() => this.themes.preview(null));
  }

  protected onName(event: Event): void {
    this.theme.update((theme) => ({ ...theme, name: (event.target as HTMLInputElement).value }));
  }

  protected onBase(base: LcThemeBase | null): void {
    if (base !== null) this.theme.update((theme) => ({ ...theme, extends: base }));
  }

  protected exportTokens(): void {
    this.download(this.dtcgText(), 'tokens.json', 'application/json');
  }

  protected exportCss(): void {
    this.download(renderThemeCss(this.theme()), 'css', 'text/css');
  }

  protected async copy(): Promise<void> {
    if (!this.canExport()) return;
    try {
      await this.document.defaultView?.navigator.clipboard.writeText(this.dtcgText());
      this.notice.set({ kind: 'success', text: this.labels.themeBuilder.copied, details: [] });
    } catch {
      this.notice.set({ kind: 'error', text: this.labels.themeBuilder.copyFailed, details: [] });
    }
  }

  protected reset(): void {
    this.theme.set({ ...LC_THEME_BUILDER_INITIAL, extends: this.theme().extends });
    this.notice.set(null);
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.importText(file.size, () => file.text());
  }

  /** Importe un fichier DTCG : tout ou rien, les erreurs sont listées (jetons inconnus avec suggestion). */
  private async importText(size: number, read: () => Promise<string>): Promise<void> {
    if (size > LC_THEME_MAX_IMPORT_BYTES) {
      this.notice.set({ kind: 'error', text: this.labels.themeBuilder.importTooLarge, details: [] });
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(await read());
    } catch {
      this.notice.set({ kind: 'error', text: this.labels.themeBuilder.importNotJson, details: [] });
      return;
    }
    const current = this.theme();
    const imported = fromDtcg(json, { name: current.name, extends: current.extends, label: current.label });
    const { valid, errors } = validateTheme(imported, { identity: false });
    if (!valid) {
      this.notice.set({
        kind: 'error',
        text: this.labels.themeBuilder.importRejected,
        details: errors.map((issue) => this.labels.themeBuilder.issue(issue.code, issue.path, issue.suggestion)),
      });
      return;
    }
    this.theme.set(imported);
    this.notice.set({ kind: 'success', text: this.labels.themeBuilder.importDone(Object.keys(imported.overrides).length), details: [] });
  }

  private dtcgText(): string {
    return `${JSON.stringify(toDtcg(this.theme()), null, 2)}\n`;
  }

  private download(content: string, extension: 'tokens.json' | 'css', mimeType: string): void {
    if (this.canExport()) downloadTextFile(this.document, exportFileName(this.theme().name, extension), content, mimeType);
  }
}
