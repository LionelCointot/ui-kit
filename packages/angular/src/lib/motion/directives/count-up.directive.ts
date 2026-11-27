import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Directive, ElementRef, type OnChanges, PLATFORM_ID, inject, input } from '@angular/core';
import { LcFormatService } from '../../core/format.service';
import type { LcValueFormat } from '../../core/types';
import { lcReadMotion } from '../runtime/motion-tokens';
import { lcPrefersReducedMotion } from '../runtime/reduced-motion';

/** Courbe `cubic-bezier(x1, y1, x2, y2)` → progression ; toute autre courbe (`linear`, jeton absent) donne une progression linéaire. */
function curveOf(css: string): (t: number) => number {
  const p = /^cubic-bezier\(([^)]+)\)$/.exec(css)?.[1].split(',').map(Number);
  if (p?.length !== 4 || p.some(Number.isNaN)) return (t) => t;
  const [x1, y1, x2, y2] = p;
  const axis = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  return (t) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i += 1) {
      const mid = (lo + hi) / 2;
      if (axis(x1, x2, mid) < t) lo = mid; else hi = mid;
    }
    return axis(y1, y2, (lo + hi) / 2);
  };
}

/**
 * Écrit `lcCountUp` dans le texte de l'élément, formaté par `LcFormatService` comme `lc-data-table` (`number` : 2 décimales).
 * Le texte final est dans le premier rendu (serveur compris) ; à la première apparition côté navigateur il compte de 0 à la valeur,
 * jamais à l'hydratation d'un texte déjà affiché ; à chaque changement il compte de la valeur affichée à la nouvelle, sans repasser par 0.
 * Durée `--lc-count-up-duration`, courbe `--lc-sys-easing-out`. Sous mouvement réduit, la valeur finale est immédiate.
 * Aucun attribut ARIA n'est posé : les valeurs intermédiaires ne sont pas annoncées (le consommateur gère son éventuelle région `aria-live`).
 */
@Directive({ selector: '[lcCountUp]' })
export class LcCountUpDirective implements OnChanges {
  readonly lcCountUp = input.required<number>();
  readonly lcCountUpFormat = input<LcValueFormat>('number');

  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly formatter = inject(LcFormatService);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly window = inject(DOCUMENT).defaultView;
  /** Valeur actuellement affichée ; `undefined` avant le premier rendu. */
  private shown: number | undefined;
  /** Texte déjà là à la création : rendu serveur hydraté, la valeur de départ est la valeur finale. */
  private readonly prerendered = this.element.textContent?.trim() !== '';
  private frame = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  // ngOnChanges plutôt qu'un effet : le texte est écrit avant le premier rendu, sans passage supplémentaire du planificateur.
  ngOnChanges(): void {
    const target = this.lcCountUp();
    const format = this.lcCountUpFormat();
    this.stop();
    const from = this.shown ?? (this.browser && !this.prerendered ? 0 : target);
    const write = (value: number) => {
      this.shown = value;
      this.element.textContent = this.formatter.format(value, format);
    };
    if (!this.browser || !this.window || from === target || lcPrefersReducedMotion()) return write(target);
    const { duration, easing } = lcReadMotion(this.element, '--lc-count-up-duration', 'out');
    if (duration <= 0) return write(target);
    const curve = curveOf(easing);
    const start = performance.now();
    write(from);
    const tick = () => {
      const progress = Math.min(1, (performance.now() - start) / duration);
      write(progress < 1 ? from + (target - from) * curve(progress) : target);
      this.frame = progress < 1 ? this.window!.requestAnimationFrame(tick) : 0;
    };
    this.frame = this.window.requestAnimationFrame(tick);
  }

  private stop(): void {
    if (this.frame) this.window?.cancelAnimationFrame(this.frame);
    this.frame = 0;
  }
}
