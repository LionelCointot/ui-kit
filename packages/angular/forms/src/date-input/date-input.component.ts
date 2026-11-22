import { OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  afterRenderEffect,
  Component,
  ComponentRef,
  ElementRef,
  Injector,
  booleanAttribute,
  DestroyRef,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  isDevMode,
  linkedSignal,
  model,
  output,
  signal,
  untracked,
  viewChild,
  ViewContainerRef,
} from '@angular/core';
import { transformedValue } from '@angular/forms/signals';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  LC_DEFAULTS, LC_LABELS, LC_LOCALE, LcFillMode, LcFormatService, LcIconComponent, LcRounded, LcSize, joinIds, lcUniqueId, localDateToIso,
  lcDetachAnimated,
} from '@lionelcointot/ui-angular';
import { LC_FORM_FIELD, LC_FORM_FIELD_CONTROL, LcFormFieldControl } from '../form-field/form-field-control';
import {
  EMPTY_ZONES, MaskChange, Zone, Zones, clear, fromIso, isEmpty, neighbor, parsePaste, render, settle, step, toIso,
  typeDigit, zoneAt, zoneOrder,
} from './date-mask';
import { LcCalendarPanelComponent } from './calendar-panel.component';
import { createCalendarOverlay } from './calendar-overlay';
import { LC_DATE_PART } from './date-range-part';
import { compareIso, isValidIsoDate, toIsoDate } from './date-math';
import { LC_DATE_PICKER, resolveDatePickerMode } from './date-picker-mode';

/** Types de saisie qui insèrent du texte : lus par `beforeinput`, jamais laissés au navigateur. */
const INSERTIONS: ReadonlySet<string> = new Set(['insertText', 'insertFromPaste', 'insertFromDrop', 'insertReplacementText']);

/** Saisie du champ à zones vers le modèle : `iso` `undefined` laisse la valeur telle quelle ; `error` remonte par `transformedValue`. */
interface DateEntry {
  readonly iso: string | null | undefined;
  /** Date incomplète : saisie invalide (erreur `parse` sans texte ; le champ n'affiche aucun message). */
  readonly error: boolean;
  /** Vrai quand la saisie vient du champ ; faux quand le modèle ou `reset()` a posé la valeur (les zones repartent d'elle). */
  readonly typed: boolean;
}

/**
 * Saisie de date : `input[type=date]` natif, ou en mode calendrier (jeton `LC_DATE_PICKER`) un champ texte à zones
 * jour, mois, année (`date-mask.ts`). Valeur (model) au format ISO `AAAA-MM-JJ` ou `null` :
 * aucun objet `Date`, donc aucun décalage de fuseau (cohérent avec `DateOnly` côté .NET).
 * Implémente `FormValueControl<string | null>` (Signal Forms) et `[(value)]`.
 */
@Component({
  selector: 'lc-date-input',
  imports: [LcIconComponent],
  template: `
    @if (isCalendar) {
      <input #input class="lc-field__input" type="text" inputmode="numeric" autocomplete="off" spellcheck="false"
        [id]="inputId()" [value]="mask().text" [disabled]="disabled()" [readOnly]="readonly()"
        [attr.aria-label]="ariaLabel() || null" [attr.aria-invalid]="showInvalid() ? 'true' : null"
        [attr.aria-required]="isRequired() ? 'true' : null" [attr.aria-describedby]="describedBy()"
        (keydown)="onKeydown($event)" (beforeinput)="onBeforeInput($event)" (paste)="onPaste($event)" (input)="onText($event)" (click)="onClick()" (focus)="onFocus()" (blur)="onBlur()" />
      <span class="lc-visually-hidden" [id]="hintId">{{ labels.dateInputHint }}</span>
      <span class="lc-visually-hidden" aria-live="polite">{{ announcement() }}</span>
      @if (!disabled() && !readonly() && !part) {
        <button #calendarButton type="button" class="lc-field__step lc-date-input__button" aria-haspopup="dialog"
          [attr.aria-expanded]="open()" [attr.aria-label]="buttonName()" (click)="toggle()">
          <lc-icon name="calendar" />
        </button>
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
    '[class.lc-date-input--calendar]': 'isCalendar',
  },
})
export class LcDateInputComponent implements FormValueControl<string | null>, LcFormFieldControl {
  private readonly defaults = inject(LC_DEFAULTS);
  private readonly field = inject(LC_FORM_FIELD, { optional: true });
  /** Présent quand le champ est une moitié de `lc-date-range-input` : pas de bouton, et la période décide de l'admissibilité. */
  protected readonly part = inject(LC_DATE_PART, { optional: true });

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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly isCalendar = resolveDatePickerMode(inject(LC_DATE_PICKER), this.doc) === 'calendar';
  protected readonly labels = inject(LC_LABELS);
  // Tout ce qui sert au champ à zones n'est construit qu'en mode calendrier.
  private readonly locale = this.isCalendar ? inject(LC_LOCALE).locale : '';
  private readonly order = this.isCalendar ? zoneOrder(this.locale) : [];
  protected readonly hintId = lcUniqueId('date-hint');
  private readonly entry = this.isCalendar
    ? transformedValue<string | null, DateEntry>(this.value, {
        parse: (entry) => ({ value: entry.iso, error: entry.error ? { kind: 'parse' } : undefined }),
        format: (iso) => ({ iso, error: false, typed: false }),
      })
    : undefined;

  /** Zones affichées : celles de la saisie tant qu'elle vient du champ (une date incomplète garde ses zones) ; sinon la valeur du modèle. */
  private readonly zones = linkedSignal<DateEntry | undefined, Zones>({
    source: () => this.entry?.(),
    computation: (entry, previous) =>
      !entry || (entry.typed && previous) ? (previous?.value ?? EMPTY_ZONES) : fromIso(entry.iso ?? null),
  });
  private readonly active = signal<Zone>(this.order[0]);
  protected readonly announcement = signal('');
  protected readonly mask = computed(() =>
    render(this.zones(), this.order, { day: this.labels.dateZoneDay, month: this.labels.dateZoneMonth, year: this.labels.dateZoneYear }));
  /** Date incomplète : le cadre est invalide, aucun message. */
  private readonly hasParseError = computed(() => (this.entry?.parseErrors().length ?? 0) > 0);

  private readonly inputRef = viewChild.required<ElementRef<HTMLInputElement>>('input');
  private readonly blurred = signal(false);

  // Overlay et LcFormatService ne sont demandés qu'à l'usage : le mode natif n'en construit aucun.
  private readonly injector = inject(Injector);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly buttonRef = viewChild<ElementRef<HTMLButtonElement>>('calendarButton');
  private overlayRef?: OverlayRef;
  /** Panneau ouvert ; créé à l'ouverture, détruit à la fermeture. */
  private readonly panel = signal<ComponentRef<LcCalendarPanelComponent> | null>(null);
  protected readonly open = computed(() => this.panel() !== null);
  /** Valeur ISO valide, sinon `null` : une valeur illisible laisse le champ et le panneau vides. */
  private readonly validValue = computed(() => {
    const value = this.value();
    return value && isValidIsoDate(value) ? value : null;
  });
  protected readonly buttonName = computed(() => {
    const value = this.validValue();
    return value ? this.labels.dateChange(this.injector.get(LcFormatService).date(value, 'long')) : this.labels.dateChoose;
  });

  constructor() {
    // La zone active reste sélectionnée tant que le champ a le focus, aussi après un rendu ou une valeur posée par le code.
    if (!this.isCalendar) return;
    afterRenderEffect(() => {
      this.mask();
      this.active();
      this.selectActive();
    });
    inject(DestroyRef).onDestroy(() => this.overlayRef?.dispose());
    // Le panneau suit la valeur et les bornes posées par le code ; il se ferme si le champ devient inactif.
    effect(() => {
      const panel = this.panel();
      if (!panel) return;
      if (this.disabled() || this.readonly()) untracked(() => this.close(false));
      else this.syncPanel(panel);
    });
    if (isDevMode()) {
      effect(() => {
        const [min, max] = [this.min(), this.max()];
        if (min && max && isValidIsoDate(min) && isValidIsoDate(max) && compareIso(min, max) > 0) {
          console.warn(`[lc-date-input] \`min\` (${min}) est postérieur à \`max\` (${max}) : aucune date ne peut être choisie.`);
        }
      });
      effect(() => {
        const value = this.value();
        if (value && !isValidIsoDate(value)) console.warn(`[lc-date-input] \`value\` doit être une date ISO AAAA-MM-JJ valide, reçu : ${value}`);
      });
    }
  }

  protected toggle(): void {
    if (this.panel()) this.close(true);
    else this.openPanel();
  }

  private openPanel(): void {
    if (this.panel() || this.disabled() || this.readonly()) return;
    this.overlayRef ??= createCalendarOverlay(this.injector, this.host, this.doc, (target) => !!this.buttonRef()?.nativeElement.contains(target), (restore) => this.close(restore));
    // Réouverture pendant le fondu de fermeture : le rattachement annule le retrait (lcDetachAnimated).
    if (this.overlayRef.hasAttached()) this.overlayRef.detach();
    const panel = this.overlayRef.attach(new ComponentPortal(LcCalendarPanelComponent, this.viewContainerRef));
    this.syncPanel(panel);
    panel.instance.picked.subscribe((iso) => this.choose(fromIso(iso)));
    panel.instance.cleared.subscribe(() => this.choose(EMPTY_ZONES));
    panel.instance.closed.subscribe(() => this.close(true));
    this.panel.set(panel);
    panel.instance.focusInitial();
  }

  private syncPanel(panel: ComponentRef<LcCalendarPanelComponent>): void {
    panel.setInput('selection', { from: this.validValue(), to: null });
    panel.setInput('min', this.min() ?? null);
    panel.setInput('max', this.max() ?? null);
    panel.setInput('required', this.isRequired());
  }

  private close(restoreFocus: boolean): void {
    if (!this.panel()) return;
    this.panel.set(null);
    if (this.overlayRef) void lcDetachAnimated(this.overlayRef);
    if (restoreFocus) this.buttonRef()?.nativeElement.focus();
  }

  /** Jour choisi ou date effacée : le texte du champ est remis en forme (aussi une date incomplète), le panneau se ferme. */
  private choose(zones: Zones): void {
    this.commit(zones);
    this.refresh(false);
    this.close(true);
  }

  protected readonly showInvalid = computed(() =>
    this.hasParseError() || (this.field ? this.field.showInvalid() : this.invalid() && (this.touched() || this.blurred())));
  protected readonly isRequired = computed(() => this.required() || (this.field?.isRequired() ?? false));
  protected readonly describedBy = computed(() =>
    joinIds(this.field?.describedBy(), this.isCalendar && this.hintId));
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

  /** Sortie du champ : la zone en cours est mise en forme ; une date incomplète vaut `null`, invalide, sans message. */
  private leave(): void {
    const zones = settle(this.zones(), this.active());
    const incomplete = !isEmpty(zones) && toIso(zones) === null;
    if (zones !== this.zones() || incomplete) this.commit(zones, incomplete);
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
   * et effacements, `beforeinput` ne voyant pas les flèches). Collage et remplissage automatique arrivent par `paste` et `beforeinput` ; `input` n'est qu'un repli.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const { key } = event;
    if (this.readonly() || key === 'Tab') return;
    if (event.altKey && key === 'ArrowDown') {
      event.preventDefault();
      this.openPanel();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      // Couper et effacer un mot détruiraient le masque : ni message ni changement.
      if (/^x$/i.test(key) || key === 'Backspace' || key === 'Delete') event.preventDefault();
      return;
    }
    const zones = this.zones();
    const zone = this.active();
    if (/^\d$/.test(key)) this.apply(typeDigit(zones, zone, key, this.order));
    else if (key === '/' || key === '.' || key === '-' || key === 'ArrowRight') this.goTo(neighbor(this.order, zone, 1));
    else if (key === 'ArrowLeft') this.goTo(neighbor(this.order, zone, -1));
    else if (key === 'ArrowUp' || key === 'ArrowDown') {
      this.apply(step(settle(zones, zone), zone, key === 'ArrowUp' ? 1 : -1, this.today()));
    } else if (key === 'Backspace' || key === 'Delete') this.apply({ zones: clear(zones, zone), zone });
    else if (key.length !== 1) return;
    event.preventDefault();
  }

  /**
   * Texte inséré d'un coup (frappe de clavier virtuel, collage, glisser-déposer, remplissage automatique, `fill()`) : un seul
   * chiffre vaut une frappe ; une date entière lisible remplace TOUT le champ, quelle que soit la sélection ; le reste est ignoré.
   */
  protected onBeforeInput(event: InputEvent): void {
    if (this.readonly() || !event.cancelable || !INSERTIONS.has(event.inputType)) return;
    event.preventDefault();
    this.insert(event.data ?? event.dataTransfer?.getData('text/plain') ?? '');
  }

  /** Collage : lu ici, avant `beforeinput`, pour que la sélection (la zone active, toujours) ne limite pas le remplacement. */
  protected onPaste(event: ClipboardEvent): void {
    if (this.readonly()) return;
    event.preventDefault();
    this.insert(event.clipboardData?.getData('text') ?? '');
  }

  private insert(text: string): void {
    const trimmed = text.trim();
    if (/^\d$/.test(trimmed)) return this.apply(typeDigit(this.zones(), this.active(), trimmed, this.order));
    const change = trimmed.length > 1 ? parsePaste(trimmed, this.order) : null;
    if (change) this.apply(change); // texte illisible : ignoré en silence
  }

  /** Seul un remplacement de tout le texte (collage, remplissage automatique) est lu ; le reste (composition, touche morte, coupe) est annulé sans message. */
  protected onText(event: Event): void {
    const text = (event.target as HTMLInputElement).value.trim();
    const type = (event as InputEvent).inputType;
    const wholeText = !type || type === 'insertFromPaste' || type === 'insertFromDrop' || type === 'insertReplacementText';
    if (wholeText && text !== this.mask().text) {
      const change = text === '' ? { zones: EMPTY_ZONES, zone: this.order[0] } : parsePaste(text, this.order);
      if (change) this.apply(change); // texte illisible : ignoré en silence, `refresh` remet le texte du champ
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
  private commit(zones: Zones, error = false): void {
    const iso = toIso(zones);
    const rejected = !!iso && !!this.part?.rejects(this, iso);
    this.zones.set(zones);
    this.entry!.set({ iso: rejected ? null : iso, error: error || rejected, typed: true });
    this.part?.entered(this, rejected ? 'order' : error || (!isEmpty(zones) && iso === null) ? 'incomplete' : null, iso);
  }

  /** Réécrit le texte (un collage illisible est annulé), sélectionne la zone active et l'annonce. */
  private refresh(announce = true, clamped?: MaskChange['clamped']): void {
    const el = this.inputRef().nativeElement;
    el.value = this.mask().text;
    this.selectActive();
    if (!announce || this.doc.activeElement !== el) return;
    this.announcement.set(
      clamped
        ? this.labels.dateDayClamped(clamped.day, this.monthName(clamped.month))
        : this.zoneAnnouncement(this.zones(), this.active()),
    );
  }

  private selectActive(): void {
    const el = this.inputRef().nativeElement;
    if (this.doc.activeElement !== el) return;
    const [start, end] = this.mask().ranges[this.active()];
    el.setSelectionRange(start, end);
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
    return fromIso(localDateToIso(new Date()));
  }
}
