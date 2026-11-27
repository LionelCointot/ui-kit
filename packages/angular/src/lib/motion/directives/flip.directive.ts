import { DestroyRef, Directive, ElementRef, OnChanges, afterNextRender, afterRenderEffect, inject, input } from '@angular/core';
import { lcFlipPlay, lcFlipRead } from '../runtime/flip';

/**
 * Fait glisser les enfants directs d'un conteneur (listes verticales : lignes, éléments empilés ; pas de grille) quand la liste qu'il affiche change (tri, filtre, suppression) : chaque élément conservé va de son ancienne place à la nouvelle
 * (`transform`, tokens `--lc-list-move-*`) ; les ajoutés entrent par `lcReveal`, les retirés sortent par leur propre sortie. Les enfants `[data-leaving]` ou `.lc-leave` sont ignorés ;
 * quand un sortant est enfin retiré (retrait différé, vu par un `MutationObserver`), les suivants glissent.
 *
 * Passer à `lcFlip` la liste **immuable** que parcourt le `@for` (une nouvelle référence à chaque changement : une liste modifiée en place n'est pas détectée), et un `track` stable.
 * Rien ne bouge sous « mouvement réduit ».
 */
@Directive({ selector: '[lcFlip]' })
export class LcFlipDirective implements OnChanges {
  readonly lcFlip = input<readonly unknown[]>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  /** Positions d'avant le rendu (lues dans `ngOnChanges`, quand le DOM montre encore l'ancienne liste). */
  private before: Map<Element, number> | undefined;
  /** Positions au dernier rendu : l'état « avant » d'un retrait différé (sortie terminée). */
  private settled = new Map<Element, number>();
  private playing: Animation[] = [];
  private observer: MutationObserver | undefined;
  private destroyed = false;

  constructor() {
    afterRenderEffect(() => {
      this.lcFlip();
      this.flip();
    });
    afterNextRender(() => {
      if (typeof MutationObserver === 'undefined') return;
      this.observer = new MutationObserver((records) => {
        if (!records.some((record) => record.removedNodes.length)) return;
        // shortcut: un retrait pendant un glissement attend la fin de celui-ci (une seule lecture par lot) ; les suivants sautent puis glissent de leur place d'avant.
        void Promise.allSettled(this.playing.map((animation) => animation.finished)).then(() => {
          if (this.destroyed) return;
          this.before ??= this.settled;
          this.flip();
        });
      });
      this.observer.observe(this.host, { childList: true });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.observer?.disconnect();
    });
  }

  ngOnChanges(): void {
    this.before ??= lcFlipRead(this.children());
  }

  private children(): Element[] {
    return Array.from(this.host.children).filter((child) => !child.matches('[data-leaving], .lc-leave'));
  }

  /** Annule les glissements en cours, lit toutes les positions, puis écrit toutes les animations. */
  private flip(): void {
    this.playing.forEach((animation) => animation.cancel());
    const after = lcFlipRead(this.children());
    const before = this.before;
    this.before = undefined;
    this.playing = before ? lcFlipPlay(before, after) : [];
    this.settled = after;
    this.observer?.takeRecords(); // les retraits de ce rendu sont déjà pris en compte
  }
}
