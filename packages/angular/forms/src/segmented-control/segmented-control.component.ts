import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  isDevMode,
  model,
  output,
  afterNextRender,
  afterRenderEffect,
  viewChild,
  viewChildren,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import { LC_DEFAULTS, LcFillMode, LcIconComponent, LcOption, LcSize, joinIds, lcIndicatorRect, lcPlaceIndicator, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';

interface SegmentView<T> {
  readonly option: LcOption<T>;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly tabIndex: 0 | -1;
}

/**
 * Contrôle segmenté (`role="radiogroup"`, options `role="radio"`) : un seul choix parmi quelques options.
 * Focus itinérant : les flèches déplacent le focus et la sélection, Début et Fin vont aux extrémités,
 * Tab sort du groupe. Implémente `FormValueControl<T | null>` (Signal Forms) et `[(value)]`.
 * Une pastille à deux bords glisse sous l'option active, dans les deux variantes : fond teinté et anneau sur l'option (`outline`), ou pastille claire sur une piste creusée (`fillMode="solid"`) :
 * l'état ne tient pas à la seule couleur. Une option sans icône porte une coche quand elle est active ; une option avec icône garde son icône. Avec `controlled`, un choix n'est qu'une demande
 * (`valueRequest`) : `value` ne change que quand le parent la modifie (par exemple après confirmation).
 */
@Component({
  selector: 'lc-segmented-control',
  imports: [LcIconComponent],
  template: `
    <span #indicator class="lc-segmented-control__indicator" aria-hidden="true"></span>
    @for (segment of segments(); track $index) {
      <button #segment type="button" role="radio" class="lc-segmented-control__option"
        [attr.aria-checked]="segment.selected" [tabIndex]="segment.tabIndex" [disabled]="segment.disabled"
        (click)="select(segment.option)" (keydown)="onKeydown($event, $index)" (blur)="touch.emit()">
        @if (segment.option.icon) {
          <lc-icon [name]="segment.option.icon" />
        } @else if (segment.selected) {
          <lc-icon name="check" />
        }
        <span>{{ segment.option.label }}</span>
      </button>
    }
  `,
  styleUrl: './segmented-control.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcSegmentedControlComponent) }],
  host: {
    class: 'lc-segmented-control',
    role: 'radiogroup',
    '[attr.id]': 'id()',
    '[attr.aria-label]': 'ariaLabel() || null',
    '[attr.aria-labelledby]': 'ariaLabel() ? null : (field?.labelId ?? null)',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-disabled]': "disabled() ? 'true' : null",
    '[class]': "'lc-segmented-control--' + resolvedSize()",
    '[class.lc-segmented-control--full-width]': 'fullWidth()',
    '[class.lc-segmented-control--solid]': "fillMode() === 'solid'",
    '[class.lc-segmented-control--tracked]': 'indicatorProgress() !== null',
  },
})
export class LcSegmentedControlComponent<T> implements FormValueControl<T | null>, LcFormFieldControl {
  private readonly defaults = inject(LC_DEFAULTS);
  protected readonly field = inject(LC_FORM_FIELD, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly options = input.required<readonly LcOption<T>[]>();
  readonly value = model<T | null>(null);
  /** Nom accessible du groupe (obligatoire hors de `lc-form-field`, sinon le libellé du champ est utilisé). */
  readonly ariaLabel = input<string>();
  /** Identifiants supplémentaires ajoutés à `aria-describedby` du groupe (aide fournie par un composant parent). */
  readonly extraDescribedBy = input<string | null>(null);
  readonly size = input<LcSize | undefined>(undefined);
  /** `outline` : segments bordés, le choisi est plein. `solid` : piste creusée et pastille levée qui glisse vers le segment choisi. `flat` n'existe pas ici. */
  readonly fillMode = input<Exclude<LcFillMode, 'flat'>>('outline');
  readonly fullWidth = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input<string>(lcUniqueId('segmented'));
  /**
   * Position réelle de la sélection, de 0 à n - 1 (`progress()` d'un `lc-swipe-panels`) : un fond suit cette position entre les
   * segments voisins, sans transition, et le segment choisi perd son propre fond. `null` : rendu habituel (en `solid`, la pastille glisse vers le choix).
   */
  readonly indicatorProgress = input<number | null>(null);
  /** Valeur pilotée : un choix émet `valueRequest` sans changer `value` ; l'affichage suit seulement `value`. */
  readonly controlled = input(false, { transform: booleanAttribute });
  /** Choix de l'utilisateur en mode `controlled`. */
  readonly valueRequest = output<T | null>();
  /** Émis quand le focus quitte une option (champ « touché » pour Signal Forms). */
  readonly touch = output<void>();

  readonly controlId = computed(() => this.id());
  readonly labelable = false;

  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('segment');
  private readonly indicator = viewChild<ElementRef<HTMLElement>>('indicator');
  protected readonly resolvedSize = computed(() => this.size() ?? this.defaults.size);
  protected readonly describedBy = computed(() => joinIds(this.field?.describedBy(), this.extraDescribedBy()));

  private placed = false;

  protected readonly segments = computed<readonly SegmentView<T>[]>(() => {
    const options = this.options();
    const selectedIndex = options.findIndex((option) => Object.is(option.value, this.value()));
    const focusIndex = selectedIndex >= 0 ? selectedIndex : options.findIndex((option) => !option.disabled);
    return options.map((option, index) => ({
      option,
      selected: index === selectedIndex,
      disabled: this.disabled() || !!option.disabled,
      tabIndex: index === focusIndex ? 0 : -1,
    }));
  });

  constructor() {
    afterRenderEffect((onCleanup) => {
      const indicator = this.indicator()?.nativeElement;
      const tracked = this.indicatorProgress();
      const segments = this.segments();
      const selected = segments.findIndex((segment) => segment.selected);
      const progress = tracked ?? selected;
      const buttons = this.buttons();
      if (!indicator) {
        this.placed = false;
        return;
      }
      const place = (instant: boolean): void => {
        const rects = buttons.map(({ nativeElement: button }) => ({ left: button.offsetLeft, width: button.offsetWidth }));
        const rect = progress < 0 ? null : lcIndicatorRect(rects, progress);
        indicator.hidden = !rect;
        if (!rect) return;
        // shortcut: écriture directe dans le DOM, car la classe `--instant` doit précéder la position dans le même rappel ; à lever si l'on passe aux liaisons de signaux.
        indicator.classList.toggle('lc-segmented-control__indicator--instant', instant);
        const last = rects.at(-1)!;
        lcPlaceIndicator(indicator, 'x', rect.left, rect.left + rect.width, Math.max(last.left + last.width, rect.left + rect.width));
      };
      place(tracked !== null || !this.placed);
      this.placed = true;
      // Une largeur qui change (pleine largeur, rotation) déplace les segments sans changer la sélection : repose la pastille sans glissement.
      let width = this.host.offsetWidth;
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
        if (this.host.offsetWidth !== width) place(true);
        width = this.host.offsetWidth;
      });
      observer?.observe(this.host);
      onCleanup(() => observer?.disconnect());
    });
    if (isDevMode()) {
      afterNextRender(() => {
        if (!this.ariaLabel() && !this.field && !this.host.hasAttribute('aria-labelledby')) {
          console.warn('[lc-segmented-control] ariaLabel est obligatoire hors de lc-form-field.');
        }
      });
    }
  }

  focus(options?: FocusOptions): void {
    const index = this.segments().findIndex((segment) => segment.tabIndex === 0);
    this.buttons()[Math.max(0, index)]?.nativeElement.focus(options);
  }

  protected select(option: LcOption<T>): void {
    if (this.disabled() || option.disabled) return;
    if (this.controlled()) this.valueRequest.emit(option.value);
    else this.value.set(option.value);
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const target = this.targetIndex(event.key, index);
    if (target === null) return;
    event.preventDefault();
    const segment = this.segments()[target];
    this.select(segment.option);
    this.buttons()[target]?.nativeElement.focus();
  }

  /** Index de l'option suivante activable selon la touche (les options désactivées sont sautées). */
  private targetIndex(key: string, from: number): number | null {
    const enabled = this.segments().map((segment, index) => (segment.disabled ? -1 : index)).filter((index) => index >= 0);
    if (enabled.length === 0) return null;
    const rtl = getComputedStyle(this.host).direction === 'rtl';
    const position = enabled.indexOf(from);
    switch (key) {
      case 'ArrowRight':
        return enabled[(position + (rtl ? enabled.length - 1 : 1)) % enabled.length];
      case 'ArrowLeft':
        return enabled[(position + (rtl ? 1 : enabled.length - 1)) % enabled.length];
      case 'ArrowDown':
        return enabled[(position + 1) % enabled.length];
      case 'ArrowUp':
        return enabled[(position + enabled.length - 1) % enabled.length];
      case 'Home':
        return enabled[0];
      case 'End':
        return enabled[enabled.length - 1];
      default:
        return null;
    }
  }
}
