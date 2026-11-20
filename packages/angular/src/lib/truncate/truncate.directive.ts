import { DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/** Vitesse de repli (px/s) quand le jeton `--lc-truncate-speed` n'est pas chargé. */
const FALLBACK_SPEED = 96;
/** Part de l'animation consacrée au défilement aller (voir `@keyframes lc-truncate-scroll`) : durée totale = aller / part. */
const FORWARD_SHARE = 0.4;

/**
 * Texte sur une seule ligne, tronqué par « … » ; au survol, il défile jusqu'à la fin puis revient.
 * Rien ne bouge s'il ne déborde pas. Avec `prefers-reduced-motion: reduce`, pas de défilement :
 * `title` donne le texte entier, seulement s'il déborde. Styles : feuille globale `ui-angular.css`.
 */
@Directive({
  selector: '[lcTruncate]',
  host: {
    class: 'lc-truncate',
    '(mouseenter)': 'setHovered(true)',
    '(mouseleave)': 'setHovered(false)',
  },
})
export class LcTruncateDirective {
  private readonly element: HTMLElement = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private hovered = false;
  private ownsTitle = false;

  constructor() {
    const destroyRef = inject(DestroyRef);
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.sync());
    resize?.observe(this.element);
    const mutation = new MutationObserver(() => this.sync());
    mutation.observe(this.element, { childList: true, characterData: true, subtree: true });
    destroyRef.onDestroy(() => {
      resize?.disconnect();
      mutation.disconnect();
    });
  }

  protected setHovered(hovered: boolean): void {
    this.hovered = hovered;
    this.sync();
  }

  /** Mesure le débordement et aligne `title`, classe et variables de défilement. Le mouvement réduit est relu à chaque appel. */
  private sync(): void {
    const el = this.element;
    const overflow = el.scrollWidth - el.clientWidth;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced && overflow > 0) {
      if (!el.hasAttribute('title') || this.ownsTitle) {
        el.title = el.textContent ?? '';
        this.ownsTitle = true;
      }
    } else if (this.ownsTitle) {
      el.removeAttribute('title');
      this.ownsTitle = false;
    }

    if (this.hovered && !reduced && overflow > 0) {
      const speed = parseFloat(getComputedStyle(el).getPropertyValue('--lc-truncate-speed')) || FALLBACK_SPEED;
      el.style.setProperty('--lc-truncate-overflow', `${overflow}px`);
      el.style.setProperty('--lc-truncate-duration', `${overflow / speed / FORWARD_SHARE}s`);
      el.classList.add('lc-truncate--scrolling');
    } else {
      el.classList.remove('lc-truncate--scrolling');
      el.style.removeProperty('--lc-truncate-overflow');
      el.style.removeProperty('--lc-truncate-duration');
    }
  }
}
