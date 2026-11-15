import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';

const SHOW_DELAY_MS = 500;

type Direction = 'above' | 'below' | 'start' | 'end';

/** Position demandée d'abord, puis son opposé, puis les deux autres : la première qui tient dans la fenêtre est retenue. */
const ORDER: Record<Direction, Direction[]> = {
  above: ['above', 'below', 'end', 'start'],
  below: ['below', 'above', 'end', 'start'],
  start: ['start', 'end', 'above', 'below'],
  end: ['end', 'start', 'above', 'below'],
};

/* Aucun `offsetX`/`offsetY` : le CDK les applique en `translate` après la poussée dans la fenêtre, et ce sont des nombres de px
   (pas de token). L'écart avec l'élément est donc un remplissage transparent du panneau (token `space-1`), compté dans sa taille :
   il est pris en compte pour le choix de la position et pour la poussée, et l'info-bulle reste entière dans la fenêtre. */
const POSITIONS: Record<Direction, ConnectedPosition> = {
  above: { originX: 'center', originY: 'top', overlayX: 'center', overlayY: 'bottom' },
  below: { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top' },
  start: { originX: 'start', originY: 'center', overlayX: 'end', overlayY: 'center' },
  end: { originX: 'end', originY: 'center', overlayX: 'start', overlayY: 'center' },
};

/** Panneau de l'info-bulle (interne) : l'hôte porte l'écart transparent, `.lc-tooltip__box` la partie visible. */
@Component({
  selector: 'lc-tooltip-panel',
  template: '<span class="lc-tooltip__box">{{ text() }}</span>',
  styles: `
    :host {
      display: block;
      padding: var(--lc-sys-space-1);
      pointer-events: none;
    }
    .lc-tooltip__box {
      display: block;
      max-width: calc(var(--lc-sys-space-16) * 4);
      padding: var(--lc-sys-space-1) var(--lc-sys-space-2);
      border-radius: var(--lc-sys-radius-sm);
      background: var(--lc-tooltip-background, var(--lc-sys-color-on-surface));
      color: var(--lc-tooltip-color, var(--lc-sys-color-surface));
      font-size: var(--lc-sys-font-size-sm);
    }
    @media (forced-colors: active) {
      .lc-tooltip__box { border: 1px solid CanvasText; }
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
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().flexibleConnectedTo(this.element.nativeElement)
        .withPositions(ORDER[this.lcTooltipPosition()].map((position) => POSITIONS[position])).withPush(true),
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
