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
import { addDays, addMonths, addYears, firstOfMonth, lastOfMonth, monthGrid, yearPage } from './date-math';
import type { LcDateInterval } from './date-interval';

export type LcCalendarLevel = 'day' | 'month' | 'year';

/** Cellule des trois niveaux : `iso` est le jour, le 1er du mois ou le 1er janvier de la cellule. */
interface Cell {
  readonly iso: string;
  readonly label: string;
  readonly name: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly today: boolean;
}

interface Panel {
  readonly id: string;
  readonly title: string;
  /** Titre-bouton (monte d'un niveau) ; faux au niveau des années. */
  readonly up: boolean;
  readonly titleName: string;
  /** Ligne des jours de la semaine (niveau des jours seulement). */
  readonly head: boolean;
  readonly rows: readonly (Cell | null)[][];
}

/** Longueur du préfixe ISO qui identifie une cellule : jour, mois, année. */
const PREFIX: Record<LcCalendarLevel, number> = { day: 10, month: 7, year: 4 };
const pad = (n: number): string => String(n).padStart(4, '0');
const yearOf = (iso: string): number => Number(iso.slice(0, 4));
const monthOf = (iso: string): number => Number(iso.slice(5, 7));
const rowsOfFour = <T>(cells: T[]): T[][] => [0, 1, 2].map((row) => cells.slice(row * 4, row * 4 + 4));

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
      @for (month of panels(); track month.id; let i = $index; let last = $last) {
        <div class="lc-calendar__month">
          <div class="lc-calendar__header">
            @if (i === 0) {
              <button type="button" class="lc-calendar__nav" [attr.aria-label]="navLabels().previous" [disabled]="previousDisabled()" (click)="shift(-1)">
                <lc-icon name="chevron-left" />
              </button>
            }
            @if (month.up) {
              <button type="button" class="lc-calendar__title" [attr.aria-label]="month.titleName" (click)="levelUp()">
                <span aria-live="polite" [id]="month.id">{{ month.title }}</span>
                <lc-icon name="chevron-down" />
              </button>
            } @else {
              <span class="lc-calendar__title lc-calendar__title--text"><span aria-live="polite" [id]="month.id">{{ month.title }}</span></span>
            }
            @if (last) {
              <button type="button" class="lc-calendar__nav lc-calendar__nav--next" [attr.aria-label]="navLabels().next" [disabled]="nextDisabled()" (click)="shift(1)">
                <lc-icon name="chevron-right" />
              </button>
            }
          </div>
          <table class="lc-calendar__grid" [class.lc-calendar__grid--wide]="!month.head" role="grid" [attr.aria-labelledby]="month.id" (keydown)="onKeydown($event)">
            @if (month.head) {
              <thead>
                <tr role="row">
                  @for (weekday of weekdays; track weekday.long) {
                    <th role="columnheader" scope="col"><abbr [attr.title]="weekday.long">{{ weekday.narrow }}</abbr></th>
                  }
                </tr>
              </thead>
            }
            <tbody>
              @for (week of month.weeks; track $index) {
                <tr role="row">
                  @for (cell of week; track $index) {
                    @if (cell) {
                      <td class="lc-calendar__day" role="gridcell" [attr.tabindex]="cell.iso.startsWith(activeKey()) ? 0 : -1"
                        [attr.aria-selected]="cell.selected" [attr.aria-disabled]="cell.disabled ? 'true' : null"
                        [attr.aria-current]="cell.today ? 'date' : null" [attr.title]="cell.today ? labels.dateToday : null"
                        [attr.aria-label]="cell.name" [attr.data-date]="cell.iso" (click)="pick(cell.iso)">{{ cell.label }}</td>
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

  /** Niveau de navigation : les niveaux mois et années ne servent qu'à naviguer, la date se choisit au niveau des jours. */
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
  /** Premier jour du premier mois affiché (niveau des jours). */
  private readonly shown = linkedSignal(() => firstOfMonth(this.start()));
  /** Année qui sert de repère à la page d'années (`yearPage` : la page commence sept ans avant). */
  private readonly pageBase = linkedSignal(() => yearOf(this.start()));
  protected readonly activeKey = computed(() => this.active().slice(0, PREFIX[this.level()]));

  private readonly titleFormat = new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' });
  private readonly monthFormat = new Intl.DateTimeFormat(this.locale, { month: 'short' });
  private readonly dayFormat = new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' });
  protected readonly weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = isoToLocalDate(addDays(MONDAY, index))!;
    return {
      narrow: new Intl.DateTimeFormat(this.locale, { weekday: 'narrow' }).format(date),
      long: new Intl.DateTimeFormat(this.locale, { weekday: 'long' }).format(date),
    };
  });

  protected readonly dialogName = computed(() => (this.mode() === 'range' ? this.labels.dateChoosePeriod : this.labels.dateChoose));

  protected readonly panels = computed<Panel[]>(() => {
    const level = this.level();
    const id = (index: number) => `${this.uid}-${index}`;
    if (level === 'day') {
      return Array.from({ length: this.months() }, (_, index) => {
        const first = addMonths(this.shown(), index);
        const rows = monthGrid(first).map((week) => week.map((iso) => (iso ? this.cell(iso, 'day') : null)));
        const title = this.titleFormat.format(isoToLocalDate(first)!);
        return { id: id(index), title, up: true, titleName: this.labels.dateChooseMonthOf(title), head: true, rows };
      });
    }
    // Une seule grille de douze cellules, 4 colonnes sur 3 lignes, quel que soit le nombre de mois.
    if (level === 'month') {
      const year = yearOf(this.active());
      const cells = Array.from({ length: 12 }, (_, month) => this.cell(`${pad(year)}-${String(month + 1).padStart(2, '0')}-01`, 'month'));
      return [{ id: id(0), title: String(year), up: true, titleName: this.labels.dateChooseYearOf(String(year)), head: false, rows: rowsOfFour(cells) }];
    }
    const years = yearPage(this.pageBase());
    const title = this.labels.dateYearsRange(years[0], years[11]);
    const cells = years.map((year) => this.cell(`${pad(year)}-01-01`, 'year'));
    return [{ id: id(0), title, up: false, titleName: title, head: false, rows: rowsOfFour(cells) }];
  });

  protected readonly navLabels = computed(() => {
    const { datePreviousMonth, dateNextMonth, datePreviousYear, dateNextYear, datePreviousYears, dateNextYears } = this.labels;
    const level = this.level();
    return level === 'day'
      ? { previous: datePreviousMonth, next: dateNextMonth }
      : level === 'month'
        ? { previous: datePreviousYear, next: dateNextYear }
        : { previous: datePreviousYears, next: dateNextYears };
  });

  protected readonly previousDisabled = computed(() => {
    const min = this.min();
    if (!min) return false;
    const level = this.level();
    if (level === 'day') return lastOfMonth(addMonths(this.shown(), -1)) < min;
    return `${pad(level === 'month' ? yearOf(this.active()) - 1 : this.pageBase() - 8)}-12-31` < min;
  });
  protected readonly nextDisabled = computed(() => {
    const max = this.max();
    if (!max) return false;
    const level = this.level();
    if (level === 'day') return firstOfMonth(addMonths(this.shown(), this.months())) > max;
    return `${pad(level === 'month' ? yearOf(this.active()) + 1 : this.pageBase() + 5)}-01-01` > max;
  });

  /** À appeler à l'ouverture : rend le focus au jour de départ (jour choisi, sinon aujourd'hui, sinon le plus proche autorisé). */
  focusInitial(): void {
    this.level.set('day');
    this.active.set(this.start());
    this.shown.set(firstOfMonth(this.start()));
    this.focusActive();
  }

  /** Cellule entièrement hors `min` / `max` : un mois ou une année l'est quand aucun de ses jours n'est permis. */
  protected isOut(iso: string, level: LcCalendarLevel = 'day'): boolean {
    const min = this.min();
    const max = this.max();
    const first = level === 'day' ? iso : level === 'month' ? firstOfMonth(iso) : `${pad(yearOf(iso))}-01-01`;
    const last = level === 'day' ? iso : level === 'month' ? lastOfMonth(iso) : `${pad(yearOf(iso))}-12-31`;
    return (!!min && last < min) || (!!max && first > max);
  }

  protected choose(iso: string): void {
    if (!this.isOut(iso)) this.picked.emit(iso);
  }

  /** Clic, Entrée ou Espace sur une cellule : choisit un jour, ou descend d'un niveau sans rien choisir. */
  protected pick(iso: string): void {
    const level = this.level();
    if (level === 'day') return this.choose(iso);
    if (this.isOut(iso, level)) return;
    const active = this.active();
    this.active.set(
      level === 'month'
        ? addMonths(active, (yearOf(iso) - yearOf(active)) * 12 + monthOf(iso) - monthOf(active))
        : addYears(active, yearOf(iso) - yearOf(active)),
    );
    if (level === 'month') this.shown.set(firstOfMonth(this.active()));
    this.level.set(level === 'month' ? 'day' : 'month');
    this.focusActive();
  }

  /** Titre-bouton : jours vers mois, mois vers années. */
  protected levelUp(): void {
    if (this.level() === 'day') {
      if (yearOf(this.active()) !== yearOf(this.shown())) this.active.set(this.shown());
      this.level.set('month');
    } else {
      this.pageBase.set(yearOf(this.active()));
      this.level.set('year');
    }
    this.focusActive();
  }

  /** Précédent et suivant : un mois (jours), une année (mois), douze ans (années). Le jour actif suit, pour que la grille reste atteignable. */
  protected shift(direction: 1 | -1): void {
    const level = this.level();
    if (level === 'day') {
      this.active.set(addMonths(this.active(), direction));
      this.shown.set(addMonths(this.shown(), direction));
      return;
    }
    const years = level === 'month' ? direction : 12 * direction;
    this.active.set(addYears(this.active(), years));
    if (level === 'year') this.pageBase.update((base) => base + years);
  }

  protected onEscape(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.pick(this.active());
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
    const level = this.level();
    const add = level === 'day' ? addDays : level === 'month' ? addMonths : addYears;
    const row = level === 'day' ? 7 : 4;
    const weekIndex = (isoToLocalDate(day)!.getDay() + 6) % 7;
    const sign = event.key === 'PageUp' ? -1 : 1;
    switch (event.key) {
      case 'ArrowLeft': return add(day, -1);
      case 'ArrowRight': return add(day, 1);
      case 'ArrowUp': return add(day, -row);
      case 'ArrowDown': return add(day, row);
      case 'Home': return level === 'day' ? addDays(day, -weekIndex) : null;
      case 'End': return level === 'day' ? addDays(day, 6 - weekIndex) : null;
      // Un pas du niveau : un mois (jours), une année (mois), douze ans (années) ; Maj + Page : une année, niveau des jours seulement.
      case 'PageUp':
      case 'PageDown':
        return level === 'year' ? addYears(day, 12 * sign) : addMonths(day, sign * (level === 'month' || event.shiftKey ? 12 : 1));
      default: return null;
    }
  }

  /** Le jour actif change ; les mois (ou la page d'années) affichés suivent s'il sort de leur plage. */
  private move(iso: string): void {
    this.active.set(iso);
    const level = this.level();
    if (level === 'year') {
      let base = this.pageBase();
      while (yearOf(iso) < base - 7) base -= 12;
      while (yearOf(iso) > base + 4) base += 12;
      this.pageBase.set(base);
    } else if (level === 'day') {
      const first = firstOfMonth(iso);
      if (first < this.shown()) this.shown.set(first);
      else if (first > addMonths(this.shown(), this.months() - 1)) this.shown.set(addMonths(first, 1 - this.months()));
    }
  }

  private focusActive(): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>('td[tabindex="0"]')?.focus(), { injector: this.injector });
  }

  private cell(iso: string, level: LcCalendarLevel): Cell {
    const { from, to } = this.selection();
    const prefix = iso.slice(0, PREFIX[level]);
    const range = this.mode() === 'range' && from && to;
    const selected = level === 'day' ? (range ? iso >= from && iso <= to : iso === from) : [from, to].some((date) => date?.startsWith(prefix));
    const date = isoToLocalDate(iso)!;
    return {
      iso,
      label: level === 'day' ? String(Number(iso.slice(8))) : level === 'month' ? this.monthFormat.format(date) : String(yearOf(iso)),
      name: level === 'day' ? this.dayFormat.format(date) : level === 'month' ? this.titleFormat.format(date) : String(yearOf(iso)),
      selected,
      disabled: this.isOut(iso, level),
      today: this.today().startsWith(prefix),
    };
  }
}
