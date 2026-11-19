import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { LC_LABELS, LC_LOCALE, LcButtonComponent, LcIconComponent, isoToLocalDate, lcUniqueId, localDateToIso } from '@lionelcointot/ui-angular';
import { addDays, addMonths, firstOfMonth, lastOfMonth, monthGrid } from './date-math';
import type { LcDateInterval } from './date-interval';

export type LcCalendarLevel = 'day' | 'month' | 'year';

interface DayCell {
  readonly iso: string;
  readonly day: number;
  readonly name: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly today: boolean;
}

const NO_SELECTION: LcDateInterval = { from: null, to: null };
const MONDAY = '2026-11-02';

/**
 * Panneau de calendrier interne (jamais exporté) : porte `role="dialog"` et `aria-modal` lui-même, piège le focus
 * (CDK) et ne connaît ni champ ni surcouche. Niveau des jours seulement (`level` reste `'day'` jusqu'à T4).
 * L'appelant le pose dans une surcouche, appelle `focusInitial()` à l'ouverture et réagit à `picked`, `cleared`, `closed`.
 */
@Component({
  selector: 'lc-calendar-panel',
  imports: [LcIconComponent, LcButtonComponent],
  hostDirectives: [CdkTrapFocus],
  template: `
    <div class="lc-calendar__months">
      @for (month of panels(); track month.first; let i = $index; let last = $last) {
        <div class="lc-calendar__month">
          <div class="lc-calendar__header">
            @if (i === 0) {
              <button type="button" class="lc-calendar__nav" [attr.aria-label]="labels.datePreviousMonth" [disabled]="previousDisabled()" (click)="shift(-1)">
                <lc-icon name="chevron-left" />
              </button>
            }
            <!-- Sans effet jusqu'à T4 (niveaux mois et années) : le bouton existe déjà pour l'apparence et l'ordre de tabulation. -->
            <button type="button" class="lc-calendar__title" [attr.aria-label]="labels.dateChooseMonthOf(month.title)">
              <span aria-live="polite" [id]="month.id">{{ month.title }}</span>
              <lc-icon name="chevron-down" />
            </button>
            @if (last) {
              <button type="button" class="lc-calendar__nav lc-calendar__nav--next" [attr.aria-label]="labels.dateNextMonth" [disabled]="nextDisabled()" (click)="shift(1)">
                <lc-icon name="chevron-right" />
              </button>
            }
          </div>
          <table class="lc-calendar__grid" role="grid" [attr.aria-labelledby]="month.id" (keydown)="onKeydown($event)">
            <thead>
              <tr role="row">
                @for (weekday of weekdays; track weekday.long) {
                  <th role="columnheader" scope="col"><abbr [attr.title]="weekday.long">{{ weekday.narrow }}</abbr></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (week of month.weeks; track $index) {
                <tr role="row">
                  @for (cell of week; track $index) {
                    @if (cell) {
                      <td class="lc-calendar__day" role="gridcell" [attr.tabindex]="cell.iso === active() ? 0 : -1"
                        [attr.aria-selected]="cell.selected" [attr.aria-disabled]="cell.disabled ? 'true' : null"
                        [attr.aria-current]="cell.today ? 'date' : null" [attr.title]="cell.today ? labels.dateToday : null"
                        [attr.aria-label]="cell.name" [attr.data-date]="cell.iso" (click)="choose(cell.iso)">{{ cell.day }}</td>
                    } @else {
                      <td></td>
                    }
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
    <div class="lc-calendar__footer">
      <button lcButton fillMode="flat" size="small" type="button" [disabled]="isOut(today())" (click)="choose(today())">
        <span class="lc-calendar__today-dot" aria-hidden="true"></span>{{ labels.dateToday }}
      </button>
      @if (!required()) {
        <button lcButton fillMode="flat" size="small" type="button" (click)="cleared.emit()">{{ labels.dateClear }}</button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-calendar',
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': 'dialogName()',
    '(keydown.escape)': 'onEscape($event)',
  },
})
export class LcCalendarPanelComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly locale = inject(LC_LOCALE).locale;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  private readonly uid = lcUniqueId('lc-calendar');

  /** Sélection : une date simple est `from` seul ; en `range`, `from` et `to` bornent la période. */
  readonly selection = input<LcDateInterval>(NO_SELECTION);
  readonly mode = input<'single' | 'range'>('single');
  /** Mois affichés côte à côte (1 ou 2). */
  readonly months = input<1 | 2>(1);
  readonly min = input<string | null | undefined>(null);
  readonly max = input<string | null | undefined>(null);
  /** Date du jour (ISO) ; par défaut celle du poste. Les tests la figent. */
  readonly today = input<string>(localDateToIso(new Date()));
  /** Cache « Effacer la date ». */
  readonly required = input(false, { transform: booleanAttribute });

  readonly picked = output<string>();
  readonly cleared = output<void>();
  readonly closed = output<void>();

  /** Niveau de navigation ; reste `'day'` jusqu'à T4. */
  readonly level = signal<LcCalendarLevel>('day');

  /** Jour de départ : le jour choisi, sinon aujourd'hui, ramené dans `min` / `max`. */
  private readonly start = computed(() => {
    const day = this.selection().from ?? this.today();
    const min = this.min();
    const max = this.max();
    return min && day < min ? min : max && day > max ? max : day;
  });
  /** Jour qui porte le focus (tabindex tournant). */
  protected readonly active = linkedSignal(() => this.start());
  /** Premier jour du premier mois affiché. */
  private readonly shown = linkedSignal(() => firstOfMonth(this.start()));

  private readonly titleFormat = new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' });
  private readonly dayFormat = new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' });
  protected readonly weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = isoToLocalDate(addDays(MONDAY, index))!;
    return {
      narrow: new Intl.DateTimeFormat(this.locale, { weekday: 'narrow' }).format(date),
      long: new Intl.DateTimeFormat(this.locale, { weekday: 'long' }).format(date),
    };
  });

  protected readonly dialogName = computed(() => (this.mode() === 'range' ? this.labels.dateChoosePeriod : this.labels.dateChoose));

  protected readonly panels = computed(() =>
    Array.from({ length: this.months() }, (_, index) => {
      const first = addMonths(this.shown(), index);
      const weeks = monthGrid(first).map((week) => week.map((iso) => (iso ? this.cell(iso) : null)));
      return { first, id: `${this.uid}-${index}`, title: this.titleFormat.format(isoToLocalDate(first)!), weeks };
    }),
  );

  protected readonly previousDisabled = computed(() => {
    const min = this.min();
    return !!min && lastOfMonth(addMonths(this.shown(), -1)) < min;
  });
  protected readonly nextDisabled = computed(() => {
    const max = this.max();
    return !!max && firstOfMonth(addMonths(this.shown(), this.months())) > max;
  });

  /** À appeler à l'ouverture : rend le focus au jour de départ (jour choisi, sinon aujourd'hui, sinon le plus proche autorisé). */
  focusInitial(): void {
    this.active.set(this.start());
    this.shown.set(firstOfMonth(this.start()));
    this.focusActive();
  }

  protected isOut(iso: string): boolean {
    const min = this.min();
    const max = this.max();
    return (!!min && iso < min) || (!!max && iso > max);
  }

  protected choose(iso: string): void {
    if (!this.isOut(iso)) this.picked.emit(iso);
  }

  /** Mois précédent ou suivant par les boutons : le jour actif suit, pour que la grille reste atteignable. */
  protected shift(months: number): void {
    this.active.set(addMonths(this.active(), months));
    this.shown.set(addMonths(this.shown(), months));
  }

  protected onEscape(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.choose(this.active());
      return;
    }
    const target = this.target(event);
    if (!target) return;
    event.preventDefault();
    this.move(target);
    this.focusActive();
  }

  private target(event: KeyboardEvent): string | null {
    const day = this.active();
    const weekIndex = (isoToLocalDate(day)!.getDay() + 6) % 7;
    const pages = event.shiftKey ? 12 : 1;
    switch (event.key) {
      case 'ArrowLeft': return addDays(day, -1);
      case 'ArrowRight': return addDays(day, 1);
      case 'ArrowUp': return addDays(day, -7);
      case 'ArrowDown': return addDays(day, 7);
      case 'Home': return addDays(day, -weekIndex);
      case 'End': return addDays(day, 6 - weekIndex);
      case 'PageUp': return addMonths(day, -pages);
      case 'PageDown': return addMonths(day, pages);
      default: return null;
    }
  }

  /** Le jour actif change ; les mois affichés suivent s'il sort de leur plage. */
  private move(iso: string): void {
    this.active.set(iso);
    const first = firstOfMonth(iso);
    if (first < this.shown()) this.shown.set(first);
    else if (first > addMonths(this.shown(), this.months() - 1)) this.shown.set(addMonths(first, 1 - this.months()));
  }

  private focusActive(): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>('td[tabindex="0"]')?.focus(), { injector: this.injector });
  }

  private cell(iso: string): DayCell {
    const { from, to } = this.selection();
    const selected = this.mode() === 'range' && from && to ? iso >= from && iso <= to : iso === from;
    return {
      iso,
      day: Number(iso.slice(8)),
      name: this.dayFormat.format(isoToLocalDate(iso)!),
      selected,
      disabled: this.isOut(iso),
      today: iso === this.today(),
    };
  }
}
