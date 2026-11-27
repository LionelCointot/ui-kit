import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, ViewEncapsulation, afterNextRender, effect, inject, input, model, output, signal, untracked, viewChild } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent, type LcMotionToken, lcAnimate, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcSheetSample, SHEET_FLICK_WINDOW_MS, sheetShouldDismiss, sheetTranslation } from './sheet-gesture';

/** Mêmes ruptures que le CSS : au-delà du téléphone, la feuille est une carte centrée. */
const CARD = '(min-width: 48em)';
const isCard = (): boolean => typeof matchMedia === 'function' && matchMedia(CARD).matches;

/** Hors écran, la carte est à mi-écran (shortcut: distance de la carte propre au composant, à passer en token si un thème doit la régler). */
const OFFSCREEN_CARD = '50dvh';

interface Drag {
  readonly pointerId: number;
  readonly startY: number;
  readonly height: number;
  readonly samples: LcSheetSample[];
  offset: number;
  frame: number;
}

/**
 * Bottom sheet (iOS style) on a native modal `<dialog>`: it rises from the bottom, stops under the top of the screen (the page stays visible, dimmed),
 * and can be pulled down by its handle or header. Above the phone width it is a centred card (no handle, no gesture). Header with title and close button (icon, or text before the title with `closeText`), scrolling body, optional footer projected with `lcSheetFooter`.
 *
 * Opening, closing and the spring back are Web Animations on the `<dialog>` itself (`lcAnimate`, `--lc-sheet-*` tokens); the backdrop follows the finger.
 *
 * `open` becomes false as soon as a closing is intended (close button, gesture, Escape, or the parent writing it); the sheet plays its exit, closes the
 * `<dialog>`, then emits `closed` (never if it is reopened during the exit). The parent unmounts the projected content on `closed` only. Closing never
 * applies anything: the parent applies, then writes `open = false`. A click on the backdrop closes it only on wide screens (centred card), never on a phone.
 *
 * Limit: a modal `<dialog>` lives in the top layer, so a CDK overlay opened from inside the sheet (calendar, list) can stay hidden below it.
 */
@Component({
  selector: 'lc-sheet',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <dialog #dialog class="lc-sheet__dialog" [attr.aria-labelledby]="titleId" (cancel)="onCancel($event)" (close)="onNativeClose()" (pointerdown)="downTarget = $event.target" (click)="onDialogClick($event)">
      <div class="lc-sheet__drag" (pointerdown)="onPointerDown($event)" (pointermove)="onPointerMove($event)" (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerCancel()" (lostpointercapture)="onPointerCancel()">
        <div class="lc-sheet__grip"><span class="lc-sheet__handle" aria-hidden="true"></span></div>
        <header class="lc-sheet__header" [class.lc-sheet__header--text]="!!closeText()">
          @if (closeText(); as text) {
            <button lcButton type="button" fillMode="flat" themeColor="neutral" class="lc-sheet__close" autofocus (click)="open.set(false)">{{ text }}</button>
          }
          <h2 class="lc-sheet__title" [id]="titleId">{{ title() }}</h2>
          @if (!closeText()) {
            <button lcButton type="button" fillMode="flat" themeColor="neutral" [iconOnly]="true" class="lc-sheet__close" autofocus
              [attr.aria-label]="closeLabel() ?? labels.close" (click)="open.set(false)"><lc-icon name="x" /></button>
          }
        </header>
      </div>
      <div #body class="lc-sheet__body" [attr.tabindex]="scrolls() ? 0 : null" [attr.role]="scrolls() ? 'region' : null" [attr.aria-labelledby]="scrolls() ? titleId : null"><div class="lc-sheet__content"><ng-content /></div></div>
      <footer class="lc-sheet__footer"><ng-content select="[lcSheetFooter]" /></footer>
    </dialog>
  `,
  styleUrl: './sheet.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'lc-sheet' },
})
export class LcSheetComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly injector = inject(Injector);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');
  private destroyed = false;
  /** Cible du dernier `pointerdown` dans le dialogue : un clic ne ferme que s'il a commencé sur le fond aussi. */
  protected downTarget: EventTarget | null = null;
  /** Le corps défile : il devient un arrêt de tabulation nommé (axe `scrollable-region-focusable`), sinon rien en plus. */
  protected readonly scrolls = signal(false);

  /** Open state (two-way). */
  readonly open = model(false);
  readonly title = input.required<string>();
  /** Accessible name of the close button (defaults to `labels.close`). */
  readonly closeLabel = input<string>();
  /** Text of the close button (iOS style, before the title, e.g. "Cancel"); replaces the close icon, whose name is then this text. */
  readonly closeText = input<string>();
  /** Emitted once, at the end of the exit, after the `<dialog>` is closed. */
  readonly closed = output<void>();

  protected readonly titleId = lcUniqueId('sheet-title');
  /** Le `<dialog>` est ouvert (et pas encore fermé par `hide`). */
  private shown = false;
  /** Incrémenté à chaque ouverture et fermeture : une sortie dépassée par une réouverture ne ferme rien. */
  private token = 0;
  private drag: Drag | undefined;
  /** Animation de glissement en cours (ouverture, fermeture ou ressort) ; le tirage n'en a pas. */
  private slide: Animation | undefined;

  constructor() {
    const destroyRef = inject(DestroyRef);
    destroyRef.onDestroy(() => (this.destroyed = true));
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const body = this.body().nativeElement;
      const observer = new ResizeObserver(() => this.scrolls.set(body.scrollHeight > body.clientHeight));
      observer.observe(body);
      // Le corps garde une hauteur fixe : seul le contenu interne change de taille quand du contenu est monté plus tard.
      observer.observe(body.firstElementChild ?? body);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    effect(() => {
      if (this.open()) untracked(() => this.show());
      else untracked(() => void this.hide());
    });
  }

  private show(): void {
    this.token++;
    // Une fois le contenu projeté rendu : `showModal()` donne le focus au contrôle `autofocus`.
    afterNextRender(() => {
      if (!this.open()) return;
      const dialog = this.dialog().nativeElement;
      const reopening = dialog.open; // réouverture pendant la sortie : repart de la position courante, le voile revient par sa transition
      const from = reopening ? this.current(dialog) : undefined;
      this.endDrag(dialog);
      dialog.removeAttribute('data-closing');
      if (!reopening) dialog.showModal?.();
      this.shown = true;
      this.play(dialog, [from ?? this.hidden(dialog), this.rest()], 'enter');
      if (!reopening) this.fadeInBackdrop(dialog);
    }, { injector: this.injector });
  }

  private async hide(): Promise<void> {
    if (!this.shown) return;
    const token = ++this.token;
    const dialog = this.dialog().nativeElement;
    const from = this.current(dialog); // avant que l'écriture en ligne du tirage soit retirée : la sortie part de la position courante
    this.endDrag(dialog);
    dialog.setAttribute('data-closing', '');
    await this.play(dialog, [from, this.hidden(dialog)], 'exit', 'forwards').finished.catch(() => undefined); // annulée par une réouverture : rejetée
    if (token !== this.token || this.destroyed) return; // rouverte pendant la sortie, ou détruite
    this.finish(dialog);
  }

  private finish(dialog: HTMLDialogElement): void {
    this.shown = false;
    dialog.removeAttribute('data-closing');
    dialog.close?.();
    this.slide?.cancel();
    this.closed.emit();
  }

  /** Échap : la fermeture native est remplacée par la sortie animée. */
  protected onCancel(event: Event): void {
    event.preventDefault();
    this.open.set(false);
  }

  /** Fermeture que la feuille n'a pas voulue (`dialog.close()` d'ailleurs) : on s'aligne. */
  protected onNativeClose(): void {
    if (!this.shown) return;
    this.shown = false;
    this.token++;
    this.open.set(false);
    this.closed.emit();
  }

  /** Clic sur le fond (la cible est le `<dialog>` lui-même) : ferme en carte seulement, jamais au téléphone. */
  protected onDialogClick(event: MouseEvent): void {
    const dialog = this.dialog().nativeElement;
    const pressed = this.downTarget;
    this.downTarget = null;
    if (event.target === dialog && pressed === dialog && isCard()) this.open.set(false);
  }

  // ---------- Geste ----------
  protected onPointerDown(event: PointerEvent): void {
    if (this.drag || !this.open() || !event.isPrimary || isCard() || (event.target as Element).closest('button')) return;
    const dialog = this.dialog().nativeElement;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    const grabbed = this.currentY(dialog); // saisie pendant l'ouverture : le tirage part d'où est la feuille
    this.slide?.cancel();
    dialog.setAttribute('data-dragging', '');
    const drag: Drag = { pointerId: event.pointerId, startY: event.clientY - grabbed, height: dialog.offsetHeight, samples: [], offset: grabbed, frame: 0 };
    this.drag = drag;
    if (grabbed) this.paint(drag);
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.offset = event.clientY - drag.startY;
    drag.samples.push({ time: event.timeStamp, offset: drag.offset });
    while (drag.samples.length && event.timeStamp - drag.samples[0].time > SHEET_FLICK_WINDOW_MS) drag.samples.shift();
    drag.frame ||= requestAnimationFrame(() => {
      drag.frame = 0;
      this.paint(drag);
    });
  }

  protected onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dialog = this.dialog().nativeElement;
    cancelAnimationFrame(drag.frame);
    this.paint(drag);
    this.drag = undefined;
    dialog.removeAttribute('data-dragging');
    if (sheetShouldDismiss(drag.offset, drag.height, drag.samples, event.timeStamp)) {
      this.open.set(false); // `hide` part de la position affichée, puis retire l'écriture en ligne
    } else {
      this.release(dialog, sheetTranslation(drag.offset));
    }
  }

  protected onPointerCancel(): void {
    const drag = this.drag;
    if (!drag) return;
    const dialog = this.dialog().nativeElement;
    this.release(dialog, this.endDrag(dialog));
  }

  private paint(drag: Drag): void {
    const y = sheetTranslation(drag.offset);
    const style = this.dialog().nativeElement.style;
    style.setProperty('translate', `0 ${y}px`);
    style.setProperty('--lc-sheet-progress', String(Math.min(1, Math.max(0, y / drag.height)))); // le voile suit le geste : 1 − distance / hauteur
  }

  /** Retour à sa place en ressort depuis `y` (sous mouvement réduit : immédiat). */
  private release(dialog: HTMLDialogElement, y: number): void {
    dialog.style.removeProperty('translate');
    dialog.style.removeProperty('--lc-sheet-progress');
    if (Math.abs(y) > 0.5) this.play(dialog, [{ translate: `0 ${y}px` }, this.rest()], 'spring');
  }

  /** Termine le tirage, retire l'écriture en ligne et rend le déplacement affiché. */
  private endDrag(dialog: HTMLDialogElement): number {
    const drag = this.drag;
    this.drag = undefined;
    if (drag) cancelAnimationFrame(drag.frame);
    dialog.removeAttribute('data-dragging');
    dialog.style.removeProperty('translate');
    dialog.style.removeProperty('--lc-sheet-progress');
    return drag ? sheetTranslation(drag.offset) : 0;
  }

  // ---------- Glissement (Web Animations sur le <dialog>) ----------
  private play(dialog: HTMLDialogElement, keyframes: Keyframe[], kind: 'enter' | 'exit' | 'spring', fill?: FillMode): Animation {
    this.slide?.cancel();
    const card = isCard();
    const duration: LcMotionToken = card ? `--lc-slide-${kind === 'spring' ? 'exit' : kind}-duration` : `--lc-sheet-${kind}-duration`;
    const easing: LcMotionToken = card ? '--lc-overlay-easing' : `--lc-sheet-${kind}-easing`;
    return (this.slide = lcAnimate(dialog, keyframes, { duration, easing, fill }));
  }

  /** Fondu du voile à l'ouverture, joué après le glissement (même ordre que le catalogue) ; la carte garde ceux du voile des fenêtres. */
  private fadeInBackdrop(dialog: HTMLDialogElement): void {
    const card = isCard();
    lcAnimate(dialog, [{ opacity: 0 }, { opacity: 1 }], {
      duration: card ? '--lc-overlay-enter-duration' : '--lc-sheet-backdrop-enter-duration',
      easing: card ? '--lc-overlay-easing' : '--lc-sheet-backdrop-enter-easing',
      pseudoElement: '::backdrop',
    });
  }

  /** Hors écran : la feuille de toute sa hauteur sous le bas (en px : la position se lit en px), la carte translatée et transparente. */
  private hidden(dialog: HTMLDialogElement): Keyframe {
    return isCard() ? { translate: `0 ${OFFSCREEN_CARD}`, opacity: 0 } : { translate: `0 ${dialog.offsetHeight}px` };
  }

  private rest(): Keyframe {
    return isCard() ? { translate: '0 0', opacity: 1 } : { translate: '0 0' };
  }

  /** Position affichée à cet instant (animation en cours ou écriture en ligne comprises). */
  private current(dialog: HTMLDialogElement): Keyframe {
    const style = getComputedStyle(dialog);
    return isCard() ? { translate: style.translate, opacity: style.opacity } : { translate: style.translate };
  }

  private currentY(dialog: HTMLDialogElement): number {
    const y = getComputedStyle(dialog).translate.split(' ')[1] ?? '';
    return (parseFloat(y) || 0) * (y.endsWith('%') ? dialog.offsetHeight / 100 : 1);
  }
}
