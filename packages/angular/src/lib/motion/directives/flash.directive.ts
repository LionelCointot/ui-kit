import { DestroyRef, Directive, ElementRef, type OnChanges, type SimpleChanges, inject, input } from '@angular/core';
import { lcAnimate } from '../runtime/animate';

/**
 * Fait passer la couleur du texte de l'accent (`--lc-sys-color-primary`) à la couleur héritée chaque fois que `lcFlash` change de valeur
 * (la première valeur et une même valeur ne flashent pas). Un changement pendant un flash le relance. Durée `--lc-flash-duration`, courbe `--lc-flash-easing`.
 * Sous mouvement réduit, rien ne joue. Aucun attribut ARIA n'est posé.
 */
@Directive({ selector: '[lcFlash]', host: { class: 'lc-flash' } })
export class LcFlashDirective implements OnChanges {
  readonly lcFlash = input<unknown>();

  private readonly element = inject<ElementRef<Element>>(ElementRef).nativeElement;
  private animation: Animation | undefined;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.animation?.cancel());
  }

  // Angular n'appelle ngOnChanges que si la valeur a changé (même valeur : rien) ; la première est ignorée.
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['lcFlash'].firstChange) return;
    this.animation?.cancel();
    // Un seul keyframe, au départ (offset 0) : la fin est la couleur héritée de l'élément.
    this.animation = lcAnimate(this.element, [{ color: 'var(--lc-sys-color-primary)', offset: 0 }], { duration: '--lc-flash-duration', easing: '--lc-flash-easing' });
  }
}
