import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';

const SHOW_DELAY_MS = 500;

/** Panneau de l'info-bulle (interne). */
@Component({
  selector: 'lc-tooltip-panel',
  template: '{{ text() }}',
  styles: `
    :host {
      display: block;
      max-width: calc(var(--lc-sys-space-16) * 4);
      padding: var(--lc-sys-space-1) var(--lc-sys-space-2);
      border-radius: var(--lc-sys-radius-sm);
      background: var(--lc-tooltip-background, var(--lc-sys-color-on-surface));
      color: var(--lc-tooltip-color, var(--lc-sys-color-surface));
      font-size: var(--lc-sys-font-size-sm);
      pointer-events: none;
    }
    @media (forced-colors: active) {
      :host { border: 1px solid CanvasText; }
    }`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'tooltip', '[id]': 'id' },
})
export class LcTooltipPanelComponent {
  readonly text = signal('');
  readonly id = lcUniqueId('tooltip');
}

/**
 * Info-bulle : `<button [lcTooltip]="'Dupliquer'">`. Apparaît au survol et au focus après 500 ms, disparaît sur Échap
 * ou à la sortie, reliée par `aria-describedby`. Elle ne porte jamais d'information indispensable (inaccessible au toucher).
 */
@Directive({
  selector: '[lcTooltip]',
  host: {
    '[attr.aria-describedby]': 'describedBy()',
    '(mouseenter)': 'scheduleShow()',
    '(focusin)': 'scheduleShow()',
    '(mouseleave)': 'hide()',
    '(focusout)': 'hide()',
    '(keydown.escape)': 'hide()',
  },
})
export class LcTooltipDirective {
  private readonly overlay = inject(Overlay);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private overlayRef?: OverlayRef;
  private timer?: ReturnType<typeof setTimeout>;
  protected readonly describedBy = signal<string | null>(null);

  readonly lcTooltip = input.required<string>();
  readonly lcTooltipPosition = input<'above' | 'below' | 'start' | 'end'>('above');

  constructor() {
    inject(DestroyRef).onDestroy(() => this.dispose());
  }

  protected scheduleShow(): void {
    if (this.overlayRef || this.timer || !this.lcTooltip()) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.show();
    }, SHOW_DELAY_MS);
  }

  private show(): void {
    const position = this.lcTooltipPosition();
    const origin = {
      above: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
      below: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
      start: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' },
      end: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
    }[position] as { originX: 'start' | 'center' | 'end'; originY: 'top' | 'center' | 'bottom'; overlayX: 'start' | 'center' | 'end'; overlayY: 'top' | 'center' | 'bottom' };
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().flexibleConnectedTo(this.element.nativeElement)
        .withPositions([origin]).withPush(true).withDefaultOffsetY(position === 'above' ? -4 : position === 'below' ? 4 : 0),
      scrollStrategy: this.overlay.scrollStrategies.close(),
    });
    const ref = this.overlayRef.attach(new ComponentPortal(LcTooltipPanelComponent));
    ref.instance.text.set(this.lcTooltip());
    this.describedBy.set(ref.instance.id);
  }

  protected hide(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.dispose();
  }

  private dispose(): void {
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.describedBy.set(null);
  }
}
