import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Directive, ElementRef, OnDestroy, ViewContainerRef, inject, input, signal } from '@angular/core';
import { lcDetachAnimated, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcMenuComponent } from './menu.component';

/** Ouvre un `lc-menu` sous l'élément (ou au-dessus s'il manque de place) : `<button [lcMenuTriggerFor]="menu">`. */
@Directive({
  selector: '[lcMenuTriggerFor]',
  host: {
    'aria-haspopup': 'menu',
    '[attr.aria-expanded]': 'expanded()',
    '[attr.aria-controls]': 'expanded() ? panelId : null',
    '(click)': 'toggle()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class LcMenuTriggerDirective implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly viewContainer = inject(ViewContainerRef);
  private overlayRef?: OverlayRef;

  readonly lcMenuTriggerFor = input.required<LcMenuComponent>();

  protected readonly expanded = signal(false);
  protected readonly panelId = lcUniqueId('menu');

  protected toggle(): void {
    if (this.expanded()) this.close(true);
    else this.open('first');
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.expanded()) {
      event.preventDefault();
      this.close(true);
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.expanded()) this.open(event.key === 'ArrowUp' ? 'last' : 'first');
    }
  }

  open(focus: 'first' | 'last' | 'none' = 'first'): void {
    if (this.expanded()) return;
    const menu = this.lcMenuTriggerFor();
    const trigger = this.element.nativeElement;
    this.overlayRef ??= this.createOverlay();
    this.overlayRef.updateSize({ minWidth: trigger.getBoundingClientRect().width });
    menu.closeRequest = (restoreFocus) => this.close(restoreFocus);
    // Réouverture pendant le fondu de fermeture : le rattachement annule le retrait (lcDetachAnimated).
    if (this.overlayRef.hasAttached()) this.overlayRef.detach();
    this.overlayRef.attach(new TemplatePortal(menu.panel(), this.viewContainer));
    this.overlayRef.overlayElement.querySelector('.lc-menu-panel')?.setAttribute('id', this.panelId);
    this.expanded.set(true);
    menu.onOpened(focus);
  }

  private createOverlay(): OverlayRef {
    const trigger = this.element.nativeElement;
    const overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().flexibleConnectedTo(trigger).withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', panelClass: 'lc-overlay--above' },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', panelClass: 'lc-overlay--above' },
      ]).withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
      panelClass: 'lc-menu-overlay',
    });
    overlayRef.backdropClick().subscribe(() => this.close(false));
    overlayRef.detachments().subscribe(() => {
      if (!this.expanded()) return;
      this.expanded.set(false);
      this.lcMenuTriggerFor().onClosed();
    });
    return overlayRef;
  }

  close(restoreFocus: boolean): void {
    if (!this.overlayRef || !this.expanded()) return;
    this.expanded.set(false);
    this.lcMenuTriggerFor().onClosed();
    void lcDetachAnimated(this.overlayRef);
    if (restoreFocus) this.element.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.overlayRef?.dispose();
  }
}
