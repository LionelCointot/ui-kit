import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  booleanAttribute,
  computed,
  forwardRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { transformedValue } from '@angular/forms/signals';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { LC_DEFAULTS, LC_LABELS, LC_LOCALE, LcFillMode, LcRounded, LcSize, joinIds, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';
import {
  EMPTY_ZONES, MaskChange, Zone, Zones, clear, fromIso, isEmpty, neighbor, parsePaste, render, settle, step, toIso,
  typeDigit, zoneAt, zoneOrder,
} from './date-mask';
import { toIsoDate } from './date-math';
import { LC_DATE_PICKER, resolveDatePickerMode } from './date-picker-mode';

/** Saisie du champ à zones vers le modèle : `iso` `undefined` laisse la valeur telle quelle ; `error` remonte par `transformedValue`. */
interface DateEntry {
  readonly iso: string | null | undefined;
  readonly error: string | null;
}

/**
 * Saisie de date : `input[type=date]` natif, ou en mode calendrier (jeton `LC_DATE_PICKER`) un champ texte à zones
 * jour, mois, année (`date-mask.ts`). Valeur (model) au format ISO `AAAA-MM-JJ` ou `null` :
 * aucun objet `Date`, donc aucun décalage de fuseau (cohérent avec `DateOnly` côté .NET).
 * Implémente `FormValueControl<string | null>` (Signal Forms) et `[(value)]`.
 */
@Component({
  selector: 'lc-date-input',
  template: `
    @if (isCalendar) {
      <input #input class="lc-field__input" type="text" inputmode="numeric" autocomplete="off" spellcheck="false"
        [id]="inputId()" [value]="mask().text" [disabled]="disabled()" [readOnly]="readonly()"
        [attr.aria-label]="ariaLabel() || null" [attr.aria-invalid]="showInvalid() ? 'true' : null"
        [attr.aria-required]="isRequired() ? 'true' : null" [attr.aria-describedby]="describedBy()"
        (keydown)="onKeydown($event)" (input)="onText($event)" (click)="onClick()" (focus)="onFocus()" (blur)="onBlur()" />
      <span class="lc-visually-hidden" [id]="hintId">{{ labels.dateInputHint }}</span>
      <span class="lc-visually-hidden" aria-live="polite">{{ announcement() }}</span>
      @if (message(); as text) {
        <span class="lc-date-input__message" [id]="messageId">{{ text }}</span>
      }
    } @else {
      <input #input class="lc-field__input" type="date" [id]="inputId()" [value]="value() ?? ''"
        [attr.min]="min() ?? null" [attr.max]="max() ?? null" [disabled]="disabled()" [readOnly]="readonly()"
        [attr.aria-label]="ariaLabel() || null" [attr.aria-invalid]="showInvalid() ? 'true' : null"
        [attr.aria-required]="isRequired() ? 'true' : null" [attr.aria-describedby]="describedBy()"
        (change)="onInput($event)" (input)="onInput($event)" (blur)="onBlur()" />
    }
  `,
  styleUrls: ['../shared/field-frame.css', './date-input.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: LC_FORM_FIELD_CONTROL, useExisting: forwardRef(() => LcDateInputComponent) }],
  host: {
    class: 'lc-date-input',
    '[class]': 'frameClasses()',
    '[class.lc-field--invalid]': 'showInvalid()',
    '[class.lc-field--disabled]': 'disabled()',
    '[class.lc-field--readonly]': 'readonly()',
  },
})
export class LcDateInputComponent implements FormValueControl<string | null>, LcFormFieldControl {
  private readonly defaults = inject(LC_DEFAULTS);
  private readonly field = inject(LC_FORM_FIELD, { optional: true });

  readonly value = model<string | null>(null);
  /** Date minimale ISO (AAAA-MM-JJ). */
  readonly min = input<string | undefined>(undefined);
  /** Date maximale ISO (AAAA-MM-JJ). */
  readonly max = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly size = input<LcSize | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
  readonly rounded = input<LcRounded | undefined>(undefined);
  readonly inputId = input<string>(lcUniqueId('date'));
  readonly ariaLabel = input<string>();
  readonly touch = output<void>();

  readonly controlId = computed(() => this.inputId());
  readonly labelable = true;

  private readonly doc = inject(DOCUMENT);
  protected readonly isCalendar = resolveDatePickerMode(inject(LC_DATE_PICKER), this.doc) === 'calendar';
  protected readonly labels = inject(LC_LABELS);
  private readonly locale = inject(LC_LOCALE).locale;
  private readonly order = zoneOrder(this.locale);
  private readonly example = new Intl.DateTimeFormat(this.locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    .format(new Date(2026, 10, 12));
  protected readonly hintId = lcUniqueId('date-hint');
  protected readonly messageId = lcUniqueId('date-message');

  /** Zones affichées : suivent `value`, mais une date incomplète (valeur `null`) garde ses zones remplies. */
  private readonly zones = linkedSignal<string | null, Zones>({
    source: this.value,
    computation: (iso, previous) =>
      previous && toIso(previous.value) === iso ? previous.value : fromIso(iso),
  });
  private readonly active = signal<Zone>(this.order[0]);
  protected readonly announcement = signal('');
  protected readonly mask = computed(() =>
    render(this.zones(), this.order, { day: this.labels.dateZoneDay, month: this.labels.dateZoneMonth, year: this.labels.dateZoneYear }));
  private readonly entry = transformedValue<string | null, DateEntry>(this.value, {
    parse: (entry) => ({ value: entry.iso, error: entry.error ? { kind: 'parse', message: entry.error } : undefined }),
    format: (iso) => ({ iso, error: null }),
  });
  private readonly parseError = computed(() => this.entry.parseErrors()[0]?.message ?? null);
  /** Hors formulaire le champ affiche lui-même son message ; sous `[formField]` il revient par `errors`. */
  protected readonly message = computed(() =>
    this.parseError() && !this.errors().some((error) => error.kind === 'parse') ? this.parseError() : null);

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly blurred = signal(false);

  protected readonly showInvalid = computed(() =>
    this.parseError() !== null || (this.field ? this.field.showInvalid() : this.invalid() && (this.touched() || this.blurred())));
  protected readonly isRequired = computed(() => this.required() || (this.field?.isRequired() ?? false));
  protected readonly describedBy = computed(() =>
    joinIds(this.field?.describedBy(), this.isCalendar && this.hintId, this.message() && this.messageId));
  protected readonly frameClasses = computed(() => {
    const size = this.size() ?? this.defaults.size;
    const fillMode = this.fillMode() ?? this.defaults.fillMode;
    const rounded = this.rounded() ?? this.defaults.rounded;
    return `lc-field lc-field--${size} lc-field--${fillMode} lc-field--rounded-${rounded}`;
  });

  focus(options?: FocusOptions): void {
    this.inputRef().nativeElement.focus(options);
  }

  protected onInput(event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    const iso = toIsoDate(text);
    if (iso !== undefined && iso !== this.value()) {
      this.value.set(iso);
    }
  }

  protected onBlur(): void {
    if (this.isCalendar && !this.readonly()) this.leave();
    this.blurred.set(true);
    this.touch.emit();
  }

  /** Sortie du champ : la zone en cours est mise en forme ; une date incomplète vaut `null` avec son message. */
  private leave(): void {
    const zones = settle(this.zones(), this.active());
    const incomplete = !isEmpty(zones) && toIso(zones) === null;
    if (zones !== this.zones() || incomplete) this.commit(zones, incomplete ? this.labels.dateIncomplete(this.example) : null);
    this.refresh(false);
  }

  protected onFocus(): void {
    this.refresh();
  }

  protected onClick(): void {
    const el = this.inputRef().nativeElement;
    if (this.readonly() || el.selectionStart !== el.selectionEnd) return;
    this.goTo(zoneAt(this.mask().ranges, this.order, el.selectionStart ?? 0));
  }

  /**
   * Toute la saisie passe par `keydown` (retenu plutôt que `beforeinput` : un seul gestionnaire pour chiffres, flèches
   * et effacements, `beforeinput` ne voyant pas les flèches). Collage et remplissage automatique arrivent par `input`.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (this.readonly() || event.ctrlKey || event.metaKey || event.altKey || event.key === 'Tab') return;
    const { key } = event;
    const zones = this.zones();
    const zone = this.active();
    if (/^\d$/.test(key)) this.apply(typeDigit(zones, zone, key, this.order));
    else if (key === '/' || key === '.' || key === '-' || key === 'ArrowRight') this.goTo(neighbor(this.order, zone, 1));
    else if (key === 'ArrowLeft') this.goTo(neighbor(this.order, zone, -1));
    else if (key === 'Home') this.goTo(this.order[0]);
    else if (key === 'End') this.goTo(this.order[2]);
    else if (key === 'ArrowUp' || key === 'ArrowDown') {
      this.apply(step(settle(zones, zone), zone, key === 'ArrowUp' ? 1 : -1, this.today()));
    } else if (key === 'Backspace' || key === 'Delete') this.apply({ zones: clear(zones, zone), zone });
    else if (key.length !== 1) return;
    event.preventDefault();
  }

  protected onText(event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    if (text !== this.mask().text) {
      const change = text === '' ? { zones: EMPTY_ZONES, zone: this.order[0] } : parsePaste(text, this.order);
      if (change) this.apply(change);
      else this.entry.set({ iso: undefined, error: this.labels.dateUnrecognized(this.example) });
    }
    this.refresh(false);
  }

  private goTo(zone: Zone): void {
    const zones = settle(this.zones(), this.active());
    if (zones !== this.zones()) this.commit(zones);
    this.active.set(zone);
    this.refresh();
  }

  private apply(change: MaskChange): void {
    this.active.set(change.zone);
    this.commit(change.zones);
    this.refresh(true, change.clamped);
  }

  /** Les zones font foi : la valeur du modèle suit (`null` tant que la date est incomplète). */
  private commit(zones: Zones, error: string | null = null): void {
    this.zones.set(zones);
    this.entry.set({ iso: toIso(zones), error });
  }

  /** Réécrit le texte (un collage illisible est annulé), sélectionne la zone active et l'annonce. */
  private refresh(announce = true, clamped?: MaskChange['clamped']): void {
    const el = this.inputRef().nativeElement;
    el.value = this.mask().text;
    if (this.doc.activeElement !== el) return;
    const [start, end] = this.mask().ranges[this.active()];
    el.setSelectionRange(start, end);
    if (!announce) return;
    this.announcement.set(
      clamped
        ? this.labels.dateDayClamped(clamped.day, this.monthName(clamped.month))
        : this.zoneAnnouncement(this.zones(), this.active()),
    );
  }

  private monthName(month: number): string {
    return new Intl.DateTimeFormat(this.locale, { month: 'long' }).format(new Date(2026, month - 1, 1));
  }

  private zoneAnnouncement(zones: Zones, zone: Zone): string {
    const digits = zones[zone];
    const names = { day: this.labels.dateDayName, month: this.labels.dateMonthName, year: this.labels.dateYearName };
    const shown = !digits
      ? null
      : zone === 'month' && digits.length === 2
        ? this.monthName(Number(digits))
        : zone === 'year'
          ? digits
          : String(Number(digits));
    return this.labels.dateZoneAnnounce(names[zone], shown);
  }

  private today(): Zones {
    const now = new Date();
    return {
      day: String(now.getDate()).padStart(2, '0'),
      month: String(now.getMonth() + 1).padStart(2, '0'),
      year: String(now.getFullYear()),
    };
  }
}
