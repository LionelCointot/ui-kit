import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ChangeDetectionStrategy, Component, DestroyRef, Directive, ElementRef, inject, input, signal } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import { positionsFor } from './tooltip-positions';

const SHOW_DELAY_MS = 500;
/** Délai de grâce pour passer du déclencheur à la bulle sans qu'elle se ferme (WCAG 1.4.13 : survolable). */
const HIDE_GRACE_MS = 150;

/** Panneau de l'info-bulle (interne) : l'hôte porte l'écart transparent, `.lc-tooltip__box` la partie visible. */
@Component({
  selector: 'lc-tooltip-panel',
  template: '<span class="lc-tooltip__box">{{ text() }}</span>',
  styles: `
    :host {
      display: block;
      padding: var(--lc-sys-space-1);
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
 * Info-bulle : `<button [lcTooltip]="'Dupliquer'">`. Apparaît au survol et au focus après 500 ms, disparaît sur Échap,
 * à la perte du focus ou à la sortie du pointeur (qui peut passer sur la bulle), reliée par `aria-describedby`. Elle ne porte jamais d'information indispensable (inaccessible au toucher).
 */
@Directive({
  selector: '[lcTooltip]',
  host: {
    '[attr.aria-describedby]': 'describedBy()',
    '(mouseenter)': 'scheduleShow()',
    '(focusin)': 'scheduleShow()',
    '(mouseleave)': 'hideSoon()',
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
    // `hide()` annule aussi le délai d'affichage en cours : sinon l'info-bulle s'ouvrirait après la destruction.
    inject(DestroyRef).onDestroy(() => this.hide());
  }

  protected scheduleShow(): void {
    if (this.overlayRef) return this.cancelTimer(); // retour sur le déclencheur pendant le délai de grâce
    if (this.timer || !this.lcTooltip()) return;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.show();
    }, SHOW_DELAY_MS);
  }

  private show(): void {
    this.overlayRef = this.overlay.create({
      positionStrategy: this.overlay.position().flexibleConnectedTo(this.element.nativeElement)
        .withPositions(positionsFor(this.lcTooltipPosition())).withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.close(),
    });
    const ref = this.overlayRef.attach(new ComponentPortal(LcTooltipPanelComponent));
    ref.instance.text.set(this.lcTooltip());
    this.describedBy.set(ref.instance.id);
    const tip = ref.location.nativeElement as HTMLElement;
    tip.addEventListener('mouseenter', () => this.cancelTimer());
    tip.addEventListener('mouseleave', () => this.hideSoon());
    // Échap ferme aussi une bulle ouverte au seul survol (le focus n'est pas sur le déclencheur).
    document.addEventListener('keydown', this.onDocumentKeydown);
  }

  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') this.hide();
  };

  private cancelTimer(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  protected hideSoon(): void {
    if (!this.overlayRef) return this.hide(); // pas encore affichée : annule l'affichage
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.hide(), HIDE_GRACE_MS);
  }

  protected hide(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.dispose();
  }

  private dispose(): void {
    document.removeEventListener('keydown', this.onDocumentKeydown);
    this.overlayRef?.dispose();
    this.overlayRef = undefined;
    this.describedBy.set(null);
  }
}
