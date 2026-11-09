import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, model, signal } from '@angular/core';
import { LC_LABELS, type LcOption } from '@lionelcointot/ui-angular';
import { LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';
import { LcTabComponent, LcTabContentDirective, LcTabsComponent } from '@lionelcointot/ui-angular/navigation';
import {
  type LcThemeDefinition,
  type LcThemeGroupId,
  type LcThemeTokenSchema,
  themeGroups,
  themeSchema,
} from '@lionelcointot/ui-tokens/theme';
import {
  type LcThemeDensity,
  densityOf,
  derivationOf,
  initiallyUnlinked,
  relink,
  resetToken,
  setDensity,
  setToken,
  valueOf,
} from '../shared/theme-model';
import { LcThemeTokenFieldComponent } from '../shared/theme-token-field.component';

interface TokenRow {
  readonly token: LcThemeTokenSchema;
  readonly label: string;
  readonly value: string;
  readonly modified: boolean;
  readonly hint: string | undefined;
  readonly derived: boolean;
  readonly linked: boolean;
}

interface GroupView {
  readonly id: LcThemeGroupId;
  readonly label: string;
  readonly rows: readonly TokenRow[];
  /** Le groupe propose le réglage de densité (échelle d'espacement). */
  readonly density: boolean;
}

/**
 * Éditeur de thème : paramètres groupés en onglets, en mode simple (quelques réglages et leurs dérivations) ou
 * avancé (tous les tokens `sys` éditables). Les couleurs calculées suivent leur source tant qu'elles sont « liées ».
 * Seules des valeurs valides sont écrites dans `theme` (liste blanche de `validateTheme`).
 *
 * @example <lc-theme-editor [(theme)]="theme" mode="advanced" />
 */
@Component({
  selector: 'lc-theme-editor',
  imports: [LcTabsComponent, LcTabComponent, LcTabContentDirective, LcThemeTokenFieldComponent, LcSegmentedControlComponent],
  template: `
    <lc-tabs [ariaLabel]="labels.themeBuilder.groupsLabel" [(selected)]="selectedGroup">
      @for (group of groups(); track group.id) {
        <lc-tab [id]="group.id" [label]="group.label">
          <ng-template lcTabContent>
            <div class="lc-theme-editor__fields">
              @if (group.density) {
                <div class="lc-theme-editor__density">
                  <span class="lc-theme-editor__density-label" aria-hidden="true">{{ labels.themeBuilder.densityLabel }}</span>
                  <lc-segmented-control [options]="densityOptions()" [value]="density()" [ariaLabel]="labels.themeBuilder.densityLabel"
                    (valueChange)="onDensity($event)" />
                </div>
              }
              @for (row of group.rows; track row.token.path) {
                <lc-theme-token-field [token]="row.token" [label]="row.label" [value]="row.value" [modified]="row.modified"
                  [hint]="row.hint" [linkable]="row.derived" [linked]="row.linked"
                  (valueChange)="onValue(row.token.path, $event)" (linkedChange)="onLinked(row.token.path, $event)"
                  (resetValue)="onReset(row.token.path)" />
              } @empty {
                @if (!group.density) {
                  <p class="lc-theme-editor__empty">{{ labels.themeBuilder.noSimpleTokens }}</p>
                }
              }
            </div>
          </ng-template>
        </lc-tab>
      }
    </lc-tabs>
  `,
  styleUrl: './theme-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-theme-editor' },
})
export class LcThemeEditorComponent {
  protected readonly labels = inject(LC_LABELS);

  /** Thème édité (`[(theme)]`). */
  readonly theme = model.required<LcThemeDefinition>();
  /** Simple : réglages essentiels et dérivations. Avancé : tous les tokens `sys` éditables. */
  readonly mode = input<'simple' | 'advanced'>('simple');

  protected readonly selectedGroup = signal<string | null>(null);

  /** Cibles dont la valeur est libre. Recalculé quand le thème est remplacé de l'extérieur (import, réinitialisation). */
  private lastWritten: LcThemeDefinition | null = null;
  private readonly unlinked = linkedSignal<LcThemeDefinition, ReadonlySet<string>>({
    source: this.theme,
    computation: (theme, previous) => (previous && theme === this.lastWritten ? previous.value : initiallyUnlinked(theme)),
  });

  protected readonly density = computed<LcThemeDensity | null>(() => densityOf(this.theme()));
  protected readonly densityOptions = computed<readonly LcOption<LcThemeDensity>[]>(() => [
    { value: 'compact', label: this.labels.themeBuilder.densityCompact },
    { value: 'normal', label: this.labels.themeBuilder.densityNormal },
    { value: 'comfortable', label: this.labels.themeBuilder.densityComfortable },
  ]);

  protected readonly groups = computed<readonly GroupView[]>(() => {
    const theme = this.theme();
    const simple = this.mode() === 'simple';
    const unlinked = this.unlinked();
    return themeGroups
      .map((group): GroupView => ({
        id: group.id,
        label: this.labels.themeBuilder.groups[group.id] ?? group.label,
        density: group.id === 'spacing',
        rows: themeSchema
          .filter((token) => token.group === group.id && this.isShown(token, simple))
          .map((token) => this.toRow(token, theme, unlinked)),
      }))
      .filter((group) => group.rows.length > 0 || group.density);
  });

  protected onValue(path: string, value: string): void {
    this.write(setToken(this.theme(), path, value, this.unlinked()), this.unlinked());
  }

  protected onReset(path: string): void {
    this.write(resetToken(this.theme(), path, this.unlinked()), this.unlinked());
  }

  protected onLinked(path: string, linked: boolean): void {
    const unlinked = new Set(this.unlinked());
    if (linked) unlinked.delete(path);
    else unlinked.add(path);
    this.write(linked ? relink(this.theme(), path) : this.theme(), unlinked);
  }

  protected onDensity(density: LcThemeDensity | null): void {
    if (density !== null) this.write(setDensity(this.theme(), density), this.unlinked());
  }

  private write(theme: LcThemeDefinition, unlinked: ReadonlySet<string>): void {
    this.lastWritten = theme;
    this.unlinked.set(unlinked);
    this.theme.set(theme);
  }

  /** Mode simple : réglages essentiels et leurs couleurs calculées ; l'échelle d'espacement passe par la densité. */
  private isShown(token: LcThemeTokenSchema, simple: boolean): boolean {
    if (!simple) return true;
    if (token.group === 'spacing') return false;
    return token.simple === true || derivationOf(token.path) !== undefined;
  }

  private toRow(token: LcThemeTokenSchema, theme: LcThemeDefinition, unlinked: ReadonlySet<string>): TokenRow {
    const derivation = derivationOf(token.path);
    const sourceLabel = derivation ? this.tokenLabel(derivation.source) : undefined;
    return {
      token,
      label: this.tokenLabel(token.path),
      value: valueOf(theme, token.path),
      modified: token.path in theme.overrides,
      hint: sourceLabel ? this.labels.themeBuilder.derivedFrom(sourceLabel) : undefined,
      derived: derivation !== undefined,
      linked: derivation !== undefined && !unlinked.has(token.path),
    };
  }

  private tokenLabel(path: string): string {
    return this.labels.themeBuilder.tokens[path] ?? themeSchema.find((token) => token.path === path)?.label ?? path;
  }
}
