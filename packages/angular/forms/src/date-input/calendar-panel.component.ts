import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { LC_LABELS, LC_LOCALE, LcButtonComponent, LcIconComponent, isoToLocalDate, lcUniqueId, localDateToIso } from '@lionelcointot/ui-angular';
import { addDays, addMonths, addYears, clampIso, firstOfMonth, lastOfMonth, monthGrid, yearPage } from './date-math';
import type { LcDateInterval, LcDateIntervalPreset } from './date-interval';
import { describePresets } from './date-presets';

export type LcCalendarLevel = 'day' | 'month' | 'year';

/** Cellule des trois niveaux : `iso` est le jour, le 1er du mois ou le 1er janvier de la cellule. */
interface Cell {
  readonly iso: string;
  readonly label: string;
  readonly name: string;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly today: boolean;
  /** Période (mode `range`, jours) : mots séparés par des espaces, lus par la feuille de styles ; `null` hors période. */
  readonly range: string | null;
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

/** Années traitées : 1000 à 9999. La page d'années se repère par `base` (elle commence 7 ans avant, finit 4 ans après). */
const FIRST_YEAR = 1000;
const LAST_YEAR = 9999;
const clampBase = (base: number): number => Math.min(LAST_YEAR - 4, Math.max(FIRST_YEAR + 7, base));
const inSupportedYears = (iso: string): boolean => {
  const year = isoToLocalDate(iso)?.getFullYear() ?? 0;
  return year >= FIRST_YEAR && year <= LAST_YEAR;
};

const NO_SELECTION: LcDateInterval = { from: null, to: null };
const MONDAY = '2026-11-02';

/**
 * Panneau de calendrier interne (jamais exporté) : porte `role="dialog"` et `aria-modal` lui-même, piège le focus
 * (CDK) et ne connaît ni champ ni surcouche. Trois niveaux (jours, mois, années) ; en `range`, un ou deux mois,
 * un choix en deux temps (début, puis fin), des raccourcis et un pied de période.
 * L'appelant le pose dans une surcouche, appelle `focusInitial()` à l'ouverture et réagit à `picked` (date simple),
 * `rangePicked` (période : fin ou raccourci ; `to` nul pour « Sans date de fin »), `cleared`, `closed`.
 */
@Component({
  selector: 'lc-calendar-panel',
  imports: [LcIconComponent, LcButtonComponent],
  hostDirectives: [CdkTrapFocus],
  template: `
    <div class="lc-calendar__layout" [class.lc-calendar__layout--column]="presetsLayout() === 'column'">
      @if (presetItems().length) {
        <div class="lc-calendar__presets">
          @for (preset of presetItems(); track $index) {
            <button type="button" class="lc-calendar__preset" [disabled]="!preset.interval" [attr.aria-describedby]="preset.id" (click)="applyPreset(preset.interval)">
              <span class="lc-calendar__preset-label">{{ preset.label }}</span>
              <span class="lc-calendar__preset-dates" [id]="preset.id" aria-hidden="true">{{ preset.dates }}</span>
            </button>
          }
        </div>
      }
      <div class="lc-calendar__main">
        @if (mode() === 'range') {
          <div class="lc-calendar__status-row">
            <p class="lc-calendar__status" role="status">{{ status() }}</p>
            @if (anchor()) {
              <button lcButton fillMode="flat" size="small" type="button" (click)="changeStart()">{{ labels.dateChangeStart }}</button>
            }
          </div>
        }
        <div class="lc-calendar__months" (mouseleave)="previewEnd.set(null)">
          <div class="lc-calendar__row">
            @for (month of panels(); track month.id; let i = $index; let last = $last) {
              <div class="lc-calendar__header" [class.lc-calendar__month--full]="months() === 2 && level() !== 'day'">
                @if (i === 0) {
                  <button type="button" class="lc-calendar__nav" [attr.aria-label]="navLabels().previous" [disabled]="previousDisabled()" (click)="shift(-1)">
                    <lc-icon name="chevron-left" />
                  </button>
                }
                @if (month.up) {
                  <button type="button" class="lc-calendar__title" [attr.aria-label]="month.titleName" (click)="levelUp(i)">
                    <span [id]="month.id">{{ month.title }}</span>
                    <lc-icon name="chevron-down" />
                  </button>
                } @else {
                  <span class="lc-calendar__title lc-calendar__title--text" [id]="month.id">{{ month.title }}</span>
                }
                <!-- Le titre relu quand le mois, l'année ou le niveau change : hors du bouton, dont les enfants ne sont pas annoncés de façon sûre. -->
                <span class="lc-visually-hidden" aria-live="polite">{{ month.title }}</span>
                @if (last) {
                  <button type="button" class="lc-calendar__nav lc-calendar__nav--next" [attr.aria-label]="navLabels().next" [disabled]="nextDisabled()" (click)="shift(1)">
                    <lc-icon name="chevron-right" />
                  </button>
                }
              </div>
            }
          </div>
          <div class="lc-calendar__row">
            @for (month of panels(); track month.id) {
              <div class="lc-calendar__month" [class.lc-calendar__month--full]="months() === 2 && level() !== 'day'">
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
                    @for (week of month.rows; track $index) {
                      <tr role="row">
                        @for (cell of week; track $index) {
                          @if (cell) {
                            <td class="lc-calendar__day" role="gridcell" [attr.tabindex]="cell.iso.startsWith(activeKey()) ? 0 : -1"
                              [attr.aria-selected]="cell.selected" [attr.aria-disabled]="cell.disabled ? 'true' : null"
                              [attr.aria-current]="cell.today ? 'date' : null" [attr.title]="cell.today ? labels.dateToday : null"
                              [attr.aria-label]="cell.name" [attr.data-date]="cell.iso" [attr.data-range]="cell.range"
                              (click)="onCellClick($event, cell.iso)" (mouseenter)="hover(cell)">{{ cell.label }}</td>
                          } @else {
                            <td role="presentation"></td>
                          }
                        }
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
    <div class="lc-calendar__footer">
      <button lcButton fillMode="flat" size="small" type="button" [disabled]="mode() === 'single' && isOut(today())" (click)="onToday()">
        <span class="lc-calendar__today-dot" aria-hidden="true"></span>{{ labels.dateToday }}
      </button>
      @if (anchor()) {
        <button lcButton fillMode="flat" size="small" type="button" class="lc-calendar__no-end" (click)="noEnd()">{{ labels.dateNoEnd }}</button>
      }
      @if (!required()) {
        <button lcButton fillMode="flat" size="small" type="button" (click)="cleared.emit()">{{ mode() === 'range' ? labels.dateClearPeriod : labels.dateClear }}</button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-calendar',
    '[class.lc-calendar--range]': "mode() === 'range'",
    role: 'dialog',
    'aria-modal': 'true',
    // Un clic dans une zone morte (marge, en-têtes, pied) focalise le panneau : Échap et le piège de focus restent actifs.
    tabindex: '-1',
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

  /** Raccourcis de période (mode `range`) ; vide : aucun affiché. */
  readonly presets = input<readonly LcDateIntervalPreset[]>([]);
  /** `column` : colonne à gauche des mois ; `grid` : deux colonnes au-dessus des mois. */
  readonly presetsLayout = input<'column' | 'grid'>('grid');

  readonly picked = output<string>();
  readonly rangePicked = output<LcDateInterval>();
  readonly cleared = output<void>();
  readonly closed = output<void>();

  /** Niveau de navigation : les niveaux mois et années ne servent qu'à naviguer, la date se choisit au niveau des jours. */
  readonly level = signal<LcCalendarLevel>('day');

  /** Jour de départ : le jour choisi, sinon aujourd'hui, ramené dans `min` / `max`. */
  private readonly start = computed(() => {
    return clampIso(this.selection().from ?? this.today(), this.min(), this.max());
  });
  /** Jour qui porte le focus (tabindex tournant). */
  // En période, il reste où il est tant qu'il est dans les mois visibles (même raison que `shown`).
  protected readonly active = linkedSignal<string, string>({
    source: this.start,
    // untracked : seule la sélection relance le calcul, pas un changement de niveau ni de mois affiché.
    computation: (start, previous) => {
      const held = previous?.value;
      const visible = untracked(() => this.mode() === 'range' && this.level() === 'day' && !!held && this.inShownMonths(held!));
      return visible ? held! : start;
    },
  });
  /** Premier jour du premier mois affiché (niveau des jours). */
  // En période, le mois affiché ne saute pas tant que le début reste dans les mois visibles (début posé, valeur réécrite par l'appelant).
  private readonly shown = linkedSignal<string, string>({
    source: this.start,
    computation: (start, previous) => {
      const first = firstOfMonth(start);
      const held = previous?.value;
      const visible = untracked(() => this.mode() === 'range' && held && first >= held && first <= addMonths(held, this.months() - 1));
      return visible ? held! : first;
    },
  });
  /** Début posé au premier clic, fin attendue (mode `range`). */
  protected readonly anchor = signal<string | null>(null);
  /** Fin envisagée (survol ou flèches) tant que le début est posé : sert l'aperçu. */
  protected readonly previewEnd = signal<string | null>(null);
  /** Année qui sert de repère à la page d'années (`yearPage` : la page commence sept ans avant). */
  private readonly pageBase = linkedSignal(() => clampBase(yearOf(this.start())));
  protected readonly activeKey = computed(() => this.active().slice(0, PREFIX[this.level()]));

  private readonly titleFormat = new Intl.DateTimeFormat(this.locale, { month: 'long', year: 'numeric' });
  private readonly monthFormat = new Intl.DateTimeFormat(this.locale, { month: 'short' });
  private readonly dayFormat = new Intl.DateTimeFormat(this.locale, { dateStyle: 'full' });
  private readonly longFormat = new Intl.DateTimeFormat(this.locale, { dateStyle: 'long' });
  protected readonly weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = isoToLocalDate(addDays(MONDAY, index))!;
    return {
      narrow: new Intl.DateTimeFormat(this.locale, { weekday: 'narrow' }).format(date),
      long: new Intl.DateTimeFormat(this.locale, { weekday: 'long' }).format(date),
    };
  });

  protected readonly dialogName = computed(() => (this.mode() === 'range' ? this.labels.dateChoosePeriod : this.labels.dateChoose));

  /** Période montrée au niveau des jours : celle en cours de choix (aperçu) ou la sélection ; `anchor` n'existe que pour l'aperçu. */
  private readonly span = computed(() => {
    if (this.mode() !== 'range') return null;
    const anchor = this.anchor();
    const [a, b] = anchor ? [anchor, this.previewEnd() ?? anchor] : [this.selection().from ?? this.selection().to, this.selection().to ?? this.selection().from];
    return a && b ? { from: a < b ? a : b, to: a < b ? b : a, anchor } : null;
  });

  protected readonly status = computed(() => {
    const anchor = this.anchor();
    return anchor ? this.labels.dateStartPicked(this.longDate(anchor)) : this.labels.dateChooseStart;
  });

  /** Raccourcis rognés par `min` / `max` ; `interval` est nul quand il n'en reste rien (bouton désactivé). */
  protected readonly presetItems = computed(() => {
    if (this.mode() !== 'range') return [];
    return describePresets(this.labels, this.locale, this.presets(), this.today(), this.min(), this.max()).map((preset, index) => ({ ...preset, id: `${this.uid}-preset-${index}` }));
  });

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

  /** Précédent et suivant : désactivés au bout de 1000 à 9999, puis quand la page voisine est entièrement hors `min` / `max`. */
  protected readonly previousDisabled = computed(() => {
    const min = this.min();
    const level = this.level();
    if (level === 'day') {
      return this.shown() <= `${FIRST_YEAR}-01-01` || (!!min && lastOfMonth(addMonths(this.shown(), -1)) < min);
    }
    const year = level === 'month' ? yearOf(this.active()) : this.pageBase() - 7;
    return year <= FIRST_YEAR || (!!min && `${pad(level === 'month' ? year - 1 : this.pageBase() - 8)}-12-31` < min);
  });
  protected readonly nextDisabled = computed(() => {
    const max = this.max();
    const level = this.level();
    if (level === 'day') {
      return addMonths(this.shown(), this.months() - 1) >= `${LAST_YEAR}-12-01` || (!!max && firstOfMonth(addMonths(this.shown(), this.months())) > max);
    }
    const year = level === 'month' ? yearOf(this.active()) : this.pageBase() + 4;
    return year >= LAST_YEAR || (!!max && `${pad(level === 'month' ? year + 1 : this.pageBase() + 5)}-01-01` > max);
  });

  constructor() {
    // Moins de mois affichés (fenêtre réduite, panneau ouvert) : le jour actif revient dans les mois visibles et garde le focus.
    effect(() => {
      const months = this.months();
      const shown = this.shown();
      untracked(() => {
        if (this.level() !== 'day') return;
        const active = this.active();
        const index = (yearOf(active) - yearOf(shown)) * 12 + monthOf(active) - monthOf(shown);
        const inside = Math.min(months - 1, Math.max(0, index));
        if (inside === index) return;
        this.active.set(addMonths(active, inside - index));
        this.refocusIfLost();
      });
    });
  }

  /** À appeler à l'ouverture : rend le focus au jour de départ (jour choisi, sinon aujourd'hui, sinon le plus proche autorisé). */
  focusInitial(): void {
    this.level.set('day');
    this.resetChoice();
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

  /** Le second clic d'un double clic tombe sur la grille du niveau suivant, ou sur le même jour : il ne choisit rien, sans exception. */
  protected onCellClick(event: MouseEvent, iso: string): void {
    if (event.detail <= 1) this.pick(iso);
  }

  private inShownMonths(iso: string): boolean {
    const first = firstOfMonth(iso);
    return first >= this.shown() && first <= addMonths(this.shown(), this.months() - 1);
  }

  protected choose(iso: string): void {
    if (!this.isOut(iso)) this.picked.emit(iso);
  }

  /** « Aujourd'hui » : en période il montre le mois en cours sans rien choisir, et le focus reste sur le bouton. */
  protected onToday(): void {
    if (this.mode() === 'single') return this.choose(this.today());
    this.level.set('day');
    this.active.set(this.today());
    this.shown.set(firstOfMonth(this.today()));
  }

  protected hover(cell: Cell): void {
    if (this.anchor() && this.level() === 'day' && !cell.disabled) this.previewEnd.set(cell.iso);
  }

  /** Premier jour : le début ; second jour : la période, dans l'ordre. */
  private pickRangeDay(iso: string): void {
    if (this.isOut(iso)) return;
    const anchor = this.anchor();
    this.previewEnd.set(null);
    if (!anchor) {
      this.anchor.set(iso);
      return;
    }
    const [from, to] = anchor <= iso ? [anchor, iso] : [iso, anchor];
    this.anchor.set(null);
    this.rangePicked.emit({ from, to });
  }

  protected noEnd(): void {
    const from = this.anchor();
    if (!from) return;
    this.resetChoice();
    this.rangePicked.emit({ from, to: null });
  }

  /** « Changer le début » : le bouton disparaît, le focus revient à la cellule de l'ancien début. */
  protected changeStart(): void {
    const old = this.anchor();
    this.resetChoice();
    if (!old) return;
    this.level.set('day');
    this.move(old);
    this.focusActive();
  }

  protected applyPreset(interval: LcDateInterval | null): void {
    if (interval) this.rangePicked.emit(interval);
  }

  private resetChoice(): void {
    this.anchor.set(null);
    this.previewEnd.set(null);
  }

  private longDate(iso: string): string {
    return this.longFormat.format(isoToLocalDate(iso)!);
  }

  /** Clic, Entrée ou Espace sur une cellule : choisit un jour, ou descend d'un niveau sans rien choisir. */
  protected pick(iso: string): void {
    const level = this.level();
    if (level === 'day') {
      this.active.set(iso); // un jour hors bornes reçoit quand même le focus : les flèches repartent de lui
      return this.mode() === 'range' ? this.pickRangeDay(iso) : this.choose(iso);
    }
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

  /** Titre-bouton : jours vers mois, mois vers années ; `index` est le mois dont on a cliqué le titre (deux mois). */
  protected levelUp(index: number): void {
    if (this.level() === 'day') {
      const month = addMonths(this.shown(), index);
      if (yearOf(this.active()) !== yearOf(month)) this.active.set(month);
      this.level.set('month');
    } else {
      this.pageBase.set(clampBase(yearOf(this.active())));
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
      return this.refocusIfLost();
    }
    const years = level === 'month' ? direction : 12 * direction;
    this.active.set(addYears(this.active(), years));
    if (level === 'year') this.pageBase.update((base) => clampBase(base + years));
    this.refocusIfLost();
  }

  protected onEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation(); // dans un tiroir ou un dialogue, Échap ne ferme que le panneau
    this.resetChoice(); // pendant le choix de la fin, le début est abandonné
    this.closed.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.altKey || event.ctrlKey || event.metaKey) return; // appartient au navigateur
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.pick(this.active());
      return;
    }
    const target = this.target(event);
    if (!target || !inSupportedYears(target)) return;
    event.preventDefault();
    this.move(target);
    if (this.anchor() && this.level() === 'day' && !this.isOut(target)) this.previewEnd.set(target);
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
      this.pageBase.set(clampBase(base));
    } else if (level === 'day') {
      const first = firstOfMonth(iso);
      if (first < this.shown()) this.shown.set(first);
      else if (first > addMonths(this.shown(), this.months() - 1)) this.shown.set(addMonths(first, 1 - this.months()));
    }
  }

  /** Un bouton qui se désactive sous le focus (dernière page atteinte) le perdrait : le focus passe au jour actif. */
  private refocusIfLost(): void {
    afterNextRender(
      () => {
        const focused = this.host.ownerDocument.activeElement;
        if (!focused || focused === this.host.ownerDocument.body || (focused as HTMLButtonElement).disabled) this.focusActive();
      },
      { injector: this.injector },
    );
  }

  private focusActive(): void {
    afterNextRender(() => this.host.querySelector<HTMLElement>('td[tabindex="0"]')?.focus(), { injector: this.injector });
  }

  private cell(iso: string, level: LcCalendarLevel): Cell {
    const anchor = this.anchor();
    const { from, to } = anchor ? { from: anchor, to: null } : this.selection();
    const prefix = iso.slice(0, PREFIX[level]);
    const span = level === 'day' ? this.span() : null;
    const inSpan = !!span && iso >= span.from && iso <= span.to;
    const selected = level !== 'day' ? [from, to].some((date) => date?.startsWith(prefix)) : span ? inSpan && (!span.anchor || iso === span.anchor) : iso === from;
    const date = isoToLocalDate(iso)!;
    return {
      iso,
      label: level === 'day' ? String(Number(iso.slice(8))) : level === 'month' ? this.monthFormat.format(date) : String(yearOf(iso)),
      name: level === 'day' ? this.dayFormat.format(date) : level === 'month' ? this.titleFormat.format(date) : String(yearOf(iso)),
      selected,
      disabled: this.isOut(iso, level),
      today: this.today().startsWith(prefix),
      range: inSpan ? this.rangeTokens(iso, span) : null,
    };
  }

  /**
   * Repères d'une cellule de période : `disk` (extrémité), `left` / `right` (la bande continue de ce côté : ni début ni fin de
   * semaine, ni bord du mois affiché), `preview` (fin pas encore choisie), `hollow` (extrémité d'aperçu, disque creux).
   */
  private rangeTokens(iso: string, span: { from: string; to: string; anchor: string | null }): string {
    const monday = (isoToLocalDate(iso)!.getDay() + 6) % 7 === 0;
    const sunday = isoToLocalDate(iso)!.getDay() === 0;
    const disk = iso === span.from || iso === span.to;
    return [
      disk && 'disk',
      iso > span.from && !monday && iso !== firstOfMonth(iso) && 'left',
      iso < span.to && !sunday && iso !== lastOfMonth(iso) && 'right',
      span.anchor && 'preview',
      span.anchor && disk && iso !== span.anchor && 'hollow',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
