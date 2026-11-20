import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ComponentRef,
  DestroyRef,
  ElementRef,
  Injector,
  ViewContainerRef,
  booleanAttribute,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { transformedValue } from '@angular/forms/signals';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  LC_LABELS, LC_LOCALE, LcFillMode, LcFormatService, LcIconComponent, LcRounded, LcSize, joinIds, lcUniqueId, localDateToIso,
} from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';
import { LcCalendarPanelComponent } from './calendar-panel.component';
import { createCalendarOverlay } from './calendar-overlay';
import { describeInterval } from './date-describe';
import { LcDateInputComponent } from './date-input.component';
import type { LcDateInterval, LcDateIntervalPreset } from './date-interval';
import { clipInterval, isValidIsoDate } from './date-math';
import { LC_DATE_PICKER, resolveDatePickerMode } from './date-picker-mode';
import { kitDatePresets } from './date-presets';
import { LC_DATE_PART, LcDatePartHost } from './date-range-part';

/** Seuils de la fenêtre (pas de la feuille de styles : `BreakpointObserver`) : deux mois dès 640 px, raccourcis en colonne dès 840 px. */
const TWO_MONTHS = '(min-width: 640px)';
const PRESETS_COLUMN = '(min-width: 840px)';

type Part = 'start' | 'end';
type PartState = 'incomplete' | 'order' | null;

/** Saisie vers le modèle : `state` remonte par `transformedValue` (`order` porte le seul message du composant). */
interface RangeEntry {
  readonly interval: LcDateInterval;
  readonly state: PartState;
  /** Faux quand le modèle ou le panneau a posé la valeur : les états de saisie repartent de zéro. */
  readonly typed: boolean;
}

const isoOrUndefined = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const EMPTY: LcDateInterval = { from: null, to: null };

/**
 * Saisie de période : deux champs « Du » et « Au » (des `lc-date-input`, donc la même saisie par zones, ou deux
 * `input[type=date]` en mode natif) et, en mode calendrier, un seul bouton qui ouvre le panneau de période.
 * Valeur (model) `{ from, to }` en dates ISO ; une seule borne remplie est valide. `from <= to` quand les deux existent.
 * Implémente `FormValueControl<LcDateInterval>` (Signal Forms, hors `min` et `max` qui sont des dates ISO) et `[(value)]`.
 */
@Component({
  selector: 'lc-date-range-input',
  imports: [LcDateInputComponent, LcIconComponent],
  template: `
    <div #group class="lc-date-range-input__group" role="group" [attr.aria-label]="ariaLabel() || labels.datePeriod"
      [attr.aria-describedby]="describedBy()" (focusout)="onFocusOut($event)">
      @for (epoch of [epoch()]; track epoch) {
        <div class="lc-date-range-input__part">
          <label class="lc-date-range-input__label" [for]="inputId()">{{ labels.dataTable.from }}</label>
          <lc-date-input #fromInput [inputId]="inputId()" [value]="value().from" (valueChange)="setBound('start', $event)"
            [min]="fromMin()" [max]="fromMax()" [disabled]="disabled()" [readonly]="readonly()" [required]="required()"
            [invalid]="startInvalid()" [touched]="true" [size]="size()" [fillMode]="fillMode()" [rounded]="rounded()" />
        </div>
        <div class="lc-date-range-input__part">
          <label class="lc-date-range-input__label" [for]="toId">{{ labels.dataTable.to }}</label>
          <lc-date-input #toInput [inputId]="toId" [value]="value().to" (valueChange)="setBound('end', $event)"
            [min]="toMin()" [max]="toMax()" [disabled]="disabled()" [readonly]="readonly()" [required]="required()"
            [invalid]="endInvalid()" [touched]="true" [size]="size()" [fillMode]="fillMode()" [rounded]="rounded()" />
        </div>
      }
      @if (isCalendar && !disabled() && !readonly()) {
        <button #calendarButton type="button" class="lc-date-range-input__button" aria-haspopup="dialog"
          [attr.aria-expanded]="open()" [attr.aria-label]="buttonName()" (click)="toggle()">
          <lc-icon name="calendar" />
        </button>
      }
    </div>
    @if (openLine(); as line) {
      <p class="lc-date-range-input__note" [id]="noteId">{{ line }}</p>
    }
    @if (orderMessage(); as message) {
      <p class="lc-date-range-input__error" [id]="errorId">{{ message }}</p>
    }
    @if (!isCalendar && shortcuts().length) {
      <div class="lc-date-range-input__shortcuts" role="group" [attr.aria-label]="labels.dateShortcuts">
        @for (shortcut of nativeShortcuts(); track $index) {
          <button type="button" class="lc-calendar__preset" [disabled]="!shortcut.interval || disabled() || readonly()" (click)="choose(shortcut.interval!)">
            <span class="lc-calendar__preset-label">{{ shortcut.label }}</span>
            <span class="lc-calendar__preset-dates">{{ shortcut.dates }}</span>
          </button>
        }
      </div>
    }
  `,
  styleUrl: './date-range-input.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcDateRangeInputComponent) }],
  // Les deux champs ne sont pas des contrôles de formulaire : ils ne lisent ni `lc-form-field` ni ne portent de bouton ; la période décide.
  viewProviders: [
    { provide: LC_FORM_FIELD, useValue: null },
    { provide: LC_DATE_PART, useExisting: forwardRef(() => LcDateRangeInputComponent) },
  ],
  host: { class: 'lc-date-range-input' },
})
export class LcDateRangeInputComponent implements Omit<FormValueControl<LcDateInterval>, 'min' | 'max'>, LcFormFieldControl, LcDatePartHost {
  // skipSelf : nos `viewProviders` masquent `lc-form-field` aux deux champs, pas à nous.
  private readonly field = inject(LC_FORM_FIELD, { optional: true, skipSelf: true });

  readonly value = model<LcDateInterval>(EMPTY);
  // Écriture `unknown` : sous `[formField]`, Signal Forms type `min` et `max` comme la valeur (ici une période) ; seule une date ISO est retenue.
  readonly min = input<string | undefined, unknown>(undefined, { transform: isoOrUndefined });
  readonly max = input<string | undefined, unknown>(undefined, { transform: isoOrUndefined });
  /** Raccourcis ; par défaut les quatre du kit, `[]` les masque. */
  readonly presets = input<readonly LcDateIntervalPreset[] | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
  readonly rounded = input<LcRounded | undefined>(undefined);
  /** Désigne le champ de début. */
  readonly inputId = input<string>(lcUniqueId('date-range'));
  /** Nom du groupe (« Période » par défaut). */
  readonly ariaLabel = input<string>();
  readonly touch = output<void>();

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;

  protected readonly labels = inject(LC_LABELS);
  private readonly locale = inject(LC_LOCALE).locale;
  private readonly doc = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly viewContainerRef = inject(ViewContainerRef);
  protected readonly isCalendar = resolveDatePickerMode(inject(LC_DATE_PICKER), this.doc) === 'calendar';
  protected readonly toId = lcUniqueId('date-range-to');
  protected readonly noteId = lcUniqueId('date-range-note');
  protected readonly errorId = lcUniqueId('date-range-error');

  private readonly fromInput = viewChild<LcDateInputComponent>('fromInput');
  private readonly toInput = viewChild<LcDateInputComponent>('toInput');
  private readonly group = viewChild.required<ElementRef<HTMLElement>>('group');
  private readonly buttonRef = viewChild<ElementRef<HTMLButtonElement>>('calendarButton');

  private readonly states = signal<Record<Part, PartState>>({ start: null, end: null });
  private readonly blurred = signal(false);
  /** Change quand le panneau remet les champs en forme : les champs sont recréés, leur texte repart de la valeur. */
  protected readonly epoch = signal(0);

  private readonly entry = transformedValue<LcDateInterval, RangeEntry>(this.value, {
    parse: (entry) => ({
      value: entry.interval,
      error: entry.state === 'order' ? { kind: 'parse', message: this.labels.dataTable.dateOrderError } : entry.state ? { kind: 'parse' } : undefined,
    }),
    format: (interval) => ({ interval, state: null, typed: false }),
  });

  private readonly breakpoints = this.isCalendar ? inject(BreakpointObserver) : null;
  private readonly viewport = this.breakpoints ? toSignal(this.breakpoints.observe([TWO_MONTHS, PRESETS_COLUMN]), { requireSync: true }) : null;

  private overlayRef?: OverlayRef;
  private readonly panel = signal<ComponentRef<LcCalendarPanelComponent> | null>(null);
  protected readonly open = computed(() => this.panel() !== null);

  protected readonly shortcuts = computed(() => this.presets() ?? kitDatePresets(this.labels));
  /** Raccourcis du mode natif, rognés par `min` / `max` comme dans le panneau. */
  protected readonly nativeShortcuts = computed(() => {
    const today = localDateToIso(new Date());
    return this.shortcuts().map((preset) => {
      const interval = clipInterval(preset.interval(today), this.min() ?? null, this.max() ?? null);
      return { label: preset.label, interval, dates: interval ? describeInterval(this.labels, this.locale, interval) : this.labels.dateNoneAllowed };
    });
  });

  /** Bornes ISO valides, sinon `null` : une valeur illisible laisse le champ vide. */
  private readonly valid = computed<LcDateInterval>(() => {
    const { from, to } = this.value();
    return { from: from && isValidIsoDate(from) ? from : null, to: to && isValidIsoDate(to) ? to : null };
  });

  // En mode natif, chaque champ est borné par l'autre ; en mode calendrier, seul le panneau borne.
  protected readonly fromMin = computed(() => this.min());
  protected readonly toMax = computed(() => this.max());
  protected readonly fromMax = computed(() => (this.isCalendar ? this.max() : (this.valid().to ?? this.max())));
  protected readonly toMin = computed(() => (this.isCalendar ? this.min() : (this.valid().from ?? this.min())));

  private readonly format = (iso: string) => this.injector.get(LcFormatService).date(iso, 'long');

  protected readonly buttonName = computed(() => {
    const { from, to } = this.valid();
    const text = from && to ? describeInterval(this.labels, this.locale, { from, to })
      : from ? this.labels.dateStartingFrom(this.format(from))
        : to ? this.labels.dataTable.until(this.format(to))
          : null;
    return text ? this.labels.dateChangePeriod(text) : this.labels.dateChoosePeriod;
  });

  /** Une seule borne remplie : la phrase le dit en clair. */
  protected readonly openLine = computed(() => {
    const { from, to } = this.valid();
    return from && !to ? this.labels.dateOpenEnd(this.format(from)) : to && !from ? this.labels.dateOpenStart(this.format(to)) : null;
  });

  /** Fin avant début : hors `lc-form-field` (qui affiche l'erreur `parse` lui-même), le message s'affiche sous le groupe. */
  protected readonly orderMessage = computed(() => (!this.field && (this.states().start === 'order' || this.states().end === 'order') ? this.labels.dataTable.dateOrderError : null));

  private readonly groupInvalid = computed(() => (this.field ? this.field.showInvalid() : this.invalid() && (this.touched() || this.blurred())));
  protected readonly describedBy = computed(() =>
    joinIds(this.field?.describedBy(), this.openLine() && this.noteId, this.orderMessage() && this.errorId));

  constructor() {
    // Une valeur posée par le code ou par le panneau efface les états de saisie.
    effect(() => {
      if (!this.entry().typed) untracked(() => this.states.set({ start: null, end: null }));
    });
    // `FormValueControl` : le modèle seul fait foi.
    inject(DestroyRef).onDestroy(() => this.overlayRef?.dispose());
    effect(() => {
      const panel = this.panel();
      if (!panel) return;
      if (this.disabled() || this.readonly()) untracked(() => this.close(false));
      else this.syncPanel(panel);
    });
  }

  protected readonly startInvalid = computed(() => this.states().start !== null || this.groupInvalid());
  protected readonly endInvalid = computed(() => this.states().end !== null || this.groupInvalid());

  // --- Partie de période (`LcDatePartHost`) : appelé par les `lc-date-input` pendant la saisie en mode calendrier.

  rejects(part: unknown, iso: string): boolean {
    const { from, to } = this.valid();
    return part === this.fromInput() ? !!to && iso > to : !!from && iso < from;
  }

  entered(part: unknown, state: PartState): void {
    const key: Part = part === this.fromInput() ? 'start' : 'end';
    this.states.update((states) => ({ ...states, [key]: state }));
    this.write(this.value());
  }

  /** Une borne change : l'autre ne bouge pas. En natif, une fin avant le début est refusée ici (en calendrier, le champ l'a déjà refusée). */
  protected setBound(part: Part, iso: string | null): void {
    const key = part === 'start' ? "from" : "to"; // guillemets doubles : un test d'architecture lit les imports au regex
    const next = { ...this.value(), [key]: iso };
    const refused = !!next.from && !!next.to && next.from > next.to;
    if (!this.isCalendar) this.states.update((states) => ({ ...states, [part]: refused ? 'order' : null }));
    this.write(refused ? { ...next, [key]: null } : next);
  }

  private write(interval: LcDateInterval): void {
    const { start, end } = this.states();
    this.entry.set({ interval, state: start === 'order' || end === 'order' ? 'order' : start || end, typed: true });
  }

  /** Raccourci, effacement ou fin du panneau : la valeur est posée telle quelle et les champs remis en forme. */
  protected choose(interval: LcDateInterval): void {
    const dirty = this.states().start !== null || this.states().end !== null;
    this.entry.set({ interval, state: null, typed: false });
    this.states.set({ start: null, end: null });
    if (dirty) this.epoch.update((epoch) => epoch + 1);
    this.close(true);
  }

  focus(options?: FocusOptions): void {
    this.fromInput()?.focus(options);
  }

  protected onFocusOut(event: FocusEvent): void {
    if (this.group().nativeElement.contains(event.relatedTarget as Node | null)) return;
    this.blurred.set(true);
    this.touch.emit();
  }

  // --- Panneau

  protected toggle(): void {
    if (this.panel()) this.close(true);
    else this.openPanel();
  }

  private openPanel(): void {
    if (this.panel() || this.disabled() || this.readonly()) return;
    this.overlayRef ??= createCalendarOverlay(this.injector, this.group().nativeElement, this.doc,
      (target) => !!this.buttonRef()?.nativeElement.contains(target), (restore) => this.close(restore));
    const panel = this.overlayRef.attach(new ComponentPortal(LcCalendarPanelComponent, this.viewContainerRef));
    panel.setInput('mode', 'range');
    this.syncPanel(panel);
    panel.instance.rangePicked.subscribe((interval) => this.choose(interval));
    panel.instance.cleared.subscribe(() => this.choose(EMPTY));
    panel.instance.closed.subscribe(() => this.close(true));
    this.panel.set(panel);
    panel.instance.focusInitial();
  }

  /** Le panneau suit la valeur, les bornes, les raccourcis et la largeur de la fenêtre. */
  private syncPanel(panel: ComponentRef<LcCalendarPanelComponent>): void {
    const breakpoints = this.viewport!().breakpoints;
    panel.setInput('selection', this.valid());
    panel.setInput('min', this.min() ?? null);
    panel.setInput('max', this.max() ?? null);
    panel.setInput('required', this.required() || (this.field?.isRequired() ?? false));
    panel.setInput('presets', this.shortcuts());
    panel.setInput('months', breakpoints[TWO_MONTHS] ? 2 : 1);
    panel.setInput('presetsLayout', breakpoints[PRESETS_COLUMN] ? 'column' : 'grid');
  }

  private close(restoreFocus: boolean): void {
    if (!this.panel()) return;
    this.panel.set(null);
    this.overlayRef?.detach();
    if (restoreFocus) this.buttonRef()?.nativeElement.focus();
  }
}
