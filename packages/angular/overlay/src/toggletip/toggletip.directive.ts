import { FlexibleConnectedPositionStrategy, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { DestroyRef, Directive, ElementRef, Injector, ViewContainerRef, afterNextRender, inject, input, isDevMode, signal } from '@angular/core';
import { LcToggletipComponent } from './toggletip.component';
import { type LcOverlayDirection, POSITIONS, positionsFor } from '../tooltip/tooltip-positions';

/**
 * Info-bulle ouverte au clic : `<button type="button" [lcToggletip]="detail">` et `<lc-toggletip #detail>…</lc-toggletip>`.
 * Contrairement à `lcTooltip`, elle peut porter une information indispensable : le clic, le toucher, Entrée et Espace l'ouvrent.
 * Elle se ferme au second clic, sur Échap (le focus revient au bouton), au clic ailleurs ou quand le focus quitte le bouton et la bulle.
 */
@Directive({
  selector: '[lcToggletip]',
  host: {
    '[attr.aria-expanded]': 'isOpen()',
    '[attr.aria-controls]': 'lcToggletip().id',
    '(click)': 'toggle()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class LcToggletipDirective {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);
  private readonly viewContainer = inject(ViewContainerRef);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private overlayRef?: OverlayRef;
  protected readonly isOpen = signal(false);

  readonly lcToggletip = input.required<LcToggletipComponent>();
  readonly lcToggletipPosition = input<'below' | 'above' | 'start' | 'end'>('below');

  constructor() {
    if (isDevMode() && this.element.tagName !== 'BUTTON') {
      console.warn('[lcToggletip] Le déclencheur doit être un <button> natif (clavier et toucher) ; sinon la bulle n\'est pas atteignable.');
    }
    inject(DestroyRef).onDestroy(() => this.close());
  }

  protected toggle(): void {
    if (this.overlayRef) this.close();
    else this.open();
  }

  private open(): void {
    const panel = this.lcToggletip();
    const strategy = this.overlay.position().flexibleConnectedTo(this.element).withPositions(positionsFor(this.lcToggletipPosition())).withPush(true);
    const ref = (this.overlayRef = this.overlay.create({ positionStrategy: strategy, scrollStrategy: this.overlay.scrollStrategies.reposition() }));
    strategy.positionChanges.subscribe(({ connectionPair }) => {
      panel.direction.set((Object.keys(POSITIONS) as LcOverlayDirection[]).find((key) => POSITIONS[key] === connectionPair) ?? 'below');
      this.pointArrow(panel, ref);
    });
    ref.attach(new TemplatePortal(panel.panel(), this.viewContainer));
    this.isOpen.set(true);

    ref.outsidePointerEvents().subscribe((event) => {
      if (!this.element.contains(event.target as Node)) this.close();
    });
    ref.keydownEvents().subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.close();
      this.element.focus();
    });
    ref.overlayElement.addEventListener('focusout', (event) => this.onFocusOut(event));

    // La région `role="status"` est rendue vide d'abord, puis remplie : une région déjà présente est annoncée, une région qui apparaît avec son texte non.
    afterNextRender(() => {
      if (this.overlayRef !== ref) return;
      panel.filled.set(true);
      afterNextRender(() => {
        // Le CDK n'émet `positionChanges` que si la position change : la flèche est donc replacée à la main, une fois le contenu mesuré.
        ref.updatePosition();
        this.pointArrow(panel, ref);
      }, { injector: this.injector });
    }, { injector: this.injector });
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!this.overlayRef || (next && (this.element.contains(next) || this.overlayRef.overlayElement.contains(next)))) return;
    this.close();
  }

  private close(): void {
    if (!this.overlayRef) return;
    this.overlayRef.dispose();
    this.overlayRef = undefined;
    this.isOpen.set(false);
    this.lcToggletip().filled.set(false);
  }

  /** Place la flèche sur le centre du bouton, même quand la bulle a été poussée dans la fenêtre. */
  private pointArrow(panel: LcToggletipComponent, ref: OverlayRef): void {
    const direction = panel.direction();
    const box = ref.overlayElement.querySelector('.lc-toggletip')?.getBoundingClientRect();
    if (!box || !box.width) return;
    const trigger = this.element.getBoundingClientRect();
    const vertical = direction === 'start' || direction === 'end';
    const offset = vertical ? trigger.top + trigger.height / 2 - box.top : trigger.left + trigger.width / 2 - box.left;
    const length = vertical ? box.height : box.width;
    const margin = 16; // shortcut: marge fixe (de quoi garder la flèche dans le rayon d'angle) ; à passer en token si un thème le demande.
    panel.arrowOffset.set(Math.min(Math.max(offset, margin), length - margin));
  }
}
