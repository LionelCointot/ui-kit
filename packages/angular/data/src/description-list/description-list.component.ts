import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, output } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcFormatService, LcRevealDirective, LcSkeletonComponent, LcStaggerDirective, LcValueFormat, lcDataState } from '@lionelcointot/ui-angular';
import { LcBadgeComponent } from '@lionelcointot/ui-angular/feedback';

export interface LcDescriptionItem {
  readonly term: string;
  readonly value: unknown;
  readonly format?: LcValueFormat;
  readonly detail?: string;
  /** Ligne de total : en gras, séparée par un trait. */
  readonly emphasis?: boolean;
  /** Mention à côté du terme (ex. « estimation »). */
  readonly badge?: string;
  /** Action de la ligne (ex. « Modifier ») : bouton plat après la valeur ; la sortie `itemAction` émet l'index de la ligne. */
  readonly action?: LcDescriptionItemAction;
}

export interface LcDescriptionItemAction {
  /** Texte visible du bouton. */
  readonly label: string;
  /** Nom accessible complet quand le texte visible seul est ambigu (ex. « Modifier : Date de création »). */
  readonly ariaLabel?: string;
}

/** Liste de définitions (`<dl>`) : paires terme / valeur formatée, avec ligne de total et mention. */
@Component({
  selector: 'lc-description-list',
  imports: [LcBadgeComponent, LcButtonComponent, LcRevealDirective, LcSkeletonComponent],
  hostDirectives: [LcStaggerDirective],
  template: `
    @if (state() === 'empty') {
      <p class="lc-description-list__empty">{{ emptyMessage() || labels.noData }}</p>
    } @else {
    <dl class="lc-description-list__list">
      @if (state() === 'loading') {
        @for (row of skeletonRows; track row) {
          <div class="lc-description-list__row lc-description-list__row--skeleton">
            <dt class="lc-description-list__term"><lc-skeleton /></dt>
            <dd class="lc-description-list__value"><lc-skeleton /></dd>
          </div>
        }
      }
      @for (item of list(); track $index) {
        <div lcReveal class="lc-description-list__row" [class.lc-description-list__row--emphasis]="item.emphasis">
          <dt class="lc-description-list__term">
            {{ item.term }}
            @if (item.badge) {
              <lc-badge size="small">{{ item.badge }}</lc-badge>
            }
          </dt>
          <dd class="lc-description-list__value">
            {{ text(item) }}
            @if (item.detail) {
              <span class="lc-description-list__detail">{{ item.detail }}</span>
            }
          </dd>
          @if (item.action; as action) {
            <dd class="lc-description-list__action">
              <button type="button" lcButton fillMode="flat" themeColor="primary" [attr.aria-label]="action.ariaLabel ?? null" (click)="itemAction.emit($index)">{{ action.label }}</button>
            </dd>
          }
        </div>
      }
    </dl>
    }
  `,
  styleUrl: './description-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-description-list',
    '[class.lc-description-list--inline]': "layout() === 'inline'",
    '[class.lc-description-list--stale]': 'reloading()',
    '[attr.aria-busy]': "state() === 'loading' || reloading() ? 'true' : null",
  },
})
export class LcDescriptionListComponent {
  private readonly format = inject(LcFormatService);
  protected readonly labels = inject(LC_LABELS);

  /** `undefined` : squelette ; `null` ou `[]` : état vide. */
  readonly items = input.required<readonly LcDescriptionItem[] | null | undefined>();
  /** Squelette même avec des données. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Rechargement : données gardées, atténuées. Sans effet pendant le squelette. */
  readonly stale = input(false, { transform: booleanAttribute });
  /** Texte de l'état vide (défaut ou chaîne vide : `LC_LABELS.noData`). */
  readonly emptyMessage = input<string>();
  protected readonly skeletonRows = [0, 1, 2];
  protected readonly state = computed(() => lcDataState(this.items(), this.loading()));
  protected readonly reloading = computed(() => this.stale() && this.state() === 'ready');
  /** Pas de ligne de donnée pendant le squelette, même avec des données et `loading`. */
  protected readonly list = computed(() => (this.state() === 'ready' ? this.items() ?? [] : []));
  readonly layout = input<'stacked' | 'inline'>('inline');
  /** Index (dans `items`) de la ligne dont l'action a été activée. */
  readonly itemAction = output<number>();

  protected text(item: LcDescriptionItem): string {
    return this.format.format(item.value, item.format);
  }
}
