import { ChangeDetectionStrategy, Component, ElementRef, Injector, ViewEncapsulation, afterNextRender, effect, inject, input, model, output, untracked, viewChild } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent, lcAnimationsEnd, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcSheetSample, SHEET_DEFAULT_DISMISS_RATIO, SHEET_FLICK_WINDOW_MS, sheetShouldDismiss } from './sheet-gesture';

/** Mêmes ruptures que le CSS : au-delà du téléphone, la feuille est une carte centrée. */
const CARD = '(min-width: 48em)';
const isCard = (): boolean => typeof matchMedia === 'function' && matchMedia(CARD).matches;

interface Drag {
  readonly pointerId: number;
  readonly startY: number;
  readonly height: number;
  readonly ratio: number;
  readonly samples: LcSheetSample[];
  offset: number;
  frame: number;
}

/**
 * Bottom sheet (iOS style) on a native modal `<dialog>`: it rises from the bottom, stops under the top of the screen (the page stays visible, dimmed),
 * and can be pulled down by its handle or header. Above the phone width it is a centred card (no handle, no gesture). Header with title and close button, scrolling body, optional footer projected with `lcSheetFooter`.
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
    <dialog #dialog class="lc-sheet__dialog" [attr.aria-labelledby]="titleId" (cancel)="onCancel($event)" (close)="onNativeClose()" (click)="onDialogClick($event)" (transitionend)="onTransitionEnd($event)">
      <div class="lc-sheet__drag" (pointerdown)="onPointerDown($event)" (pointermove)="onPointerMove($event)" (pointerup)="onPointerUp($event)"
        (pointercancel)="onPointerCancel()" (lostpointercapture)="onPointerCancel()">
        <div class="lc-sheet__grip"><span class="lc-sheet__handle" aria-hidden="true"></span></div>
        <header class="lc-sheet__header">
          <h2 class="lc-sheet__title" [id]="titleId">{{ title() }}</h2>
          <button lcButton type="button" fillMode="flat" themeColor="neutral" [iconOnly]="true" class="lc-sheet__close" autofocus
            [attr.aria-label]="closeLabel() ?? labels.close" (click)="open.set(false)"><lc-icon name="x" /></button>
        </header>
      </div>
      <div class="lc-sheet__body"><ng-content /></div>
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

  /** Open state (two-way). */
  readonly open = model(false);
  readonly title = input.required<string>();
  /** Accessible name of the close button (defaults to `labels.close`). */
  readonly closeLabel = input<string>();
  /** Emitted once, at the end of the exit, after the `<dialog>` is closed. */
  readonly closed = output<void>();

  protected readonly titleId = lcUniqueId('sheet-title');
  /** Le `<dialog>` est ouvert (et pas encore fermé par `hide`). */
  private shown = false;
  /** Incrémenté à chaque ouverture et fermeture : une sortie dépassée par une réouverture ne ferme rien. */
  private token = 0;
  private drag: Drag | undefined;

  constructor() {
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
      this.endDrag(dialog);
      dialog.removeAttribute('data-closing'); // réouverture pendant la sortie : repart de la position courante
      dialog.removeAttribute('data-returning');
      if (!dialog.open) dialog.showModal?.();
      this.shown = true;
    }, { injector: this.injector });
  }

  private async hide(): Promise<void> {
    if (!this.shown) return;
    const token = ++this.token;
    const dialog = this.dialog().nativeElement;
    this.endDrag(dialog); // retire l'écriture en ligne et `data-dragging` : la sortie part de la position courante
    dialog.removeAttribute('data-returning');
    dialog.setAttribute('data-closing', '');
    await lcAnimationsEnd(dialog, { subtree: false });
    if (token !== this.token) return; // rouverte pendant la sortie
    this.finish(dialog);
  }

  private finish(dialog: HTMLDialogElement): void {
    this.shown = false;
    dialog.removeAttribute('data-closing');
    dialog.close?.();
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
    if (event.target === this.dialog().nativeElement && isCard()) this.open.set(false);
  }

  protected onTransitionEnd(event: TransitionEvent): void {
    const dialog = this.dialog().nativeElement;
    if (event.target === dialog && event.propertyName === 'transform') dialog.removeAttribute('data-returning');
  }

  // ---------- Geste ----------
  protected onPointerDown(event: PointerEvent): void {
    if (this.drag || !event.isPrimary || isCard() || (event.target as Element).closest('button')) return;
    const dialog = this.dialog().nativeElement;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    dialog.setAttribute('data-dragging', '');
    dialog.removeAttribute('data-returning');
    const ratio = parseFloat(getComputedStyle(dialog).getPropertyValue('--lc-sheet-dismiss-ratio'));
    this.drag = {
      pointerId: event.pointerId, startY: event.clientY, height: dialog.offsetHeight, ratio: ratio > 0 ? ratio : SHEET_DEFAULT_DISMISS_RATIO,
      samples: [], offset: 0, frame: 0,
    };
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.offset = Math.max(0, event.clientY - drag.startY); // pas d'élastique vers le haut
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
    if (sheetShouldDismiss(drag.offset, drag.height, drag.ratio, drag.samples, event.timeStamp)) {
      this.open.set(false); // `hide` retire l'écriture en ligne en même temps qu'elle pose `data-closing`
    } else {
      this.release(dialog);
    }
  }

  protected onPointerCancel(): void {
    const drag = this.drag;
    if (!drag) return;
    const dialog = this.dialog().nativeElement;
    cancelAnimationFrame(drag.frame);
    this.endDrag(dialog);
    this.release(dialog);
  }

  private paint(drag: Drag): void {
    const style = this.dialog().nativeElement.style;
    style.setProperty('transform', `translateY(${drag.offset}px)`);
    style.setProperty('--lc-sheet-progress', String(Math.min(1, drag.offset / drag.height)));
  }

  /** Retour à la place : les transitions repartent de la position courante. */
  private release(dialog: HTMLDialogElement): void {
    dialog.setAttribute('data-returning', '');
    this.clearInline(dialog);
  }

  private endDrag(dialog: HTMLDialogElement): void {
    if (this.drag) cancelAnimationFrame(this.drag.frame);
    this.drag = undefined;
    dialog.removeAttribute('data-dragging');
    this.clearInline(dialog);
  }

  private clearInline(dialog: HTMLDialogElement): void {
    dialog.style.removeProperty('transform');
    dialog.style.removeProperty('--lc-sheet-progress');
  }
}
