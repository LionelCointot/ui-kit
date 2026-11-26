// SPIKE jetable (motion v2) : une directive d'attribut peut-elle déclarer `animate.leave` ? Quatre écritures comparées.
import { Directive, signal } from '@angular/core';
import type { AnimationCallbackEvent } from '@angular/core';

/** A : attribut statique dans `host`. */
@Directive({ selector: '[lcSpikeA]', host: { class: 'lc-spike-reveal', 'animate.leave': 'lc-spike-leave' } })
export class LcSpikeA {}

/** B : liaison de propriété dans `host`. */
@Directive({ selector: '[lcSpikeB]', host: { class: 'lc-spike-reveal', '[animate.leave]': "'lc-spike-leave'" } })
export class LcSpikeB {}

/** C : liaison d'événement dans `host` (fonction de rappel). */
@Directive({ selector: '[lcSpikeC]', host: { class: 'lc-spike-reveal', '(animate.leave)': 'onLeave($event)' } })
export class LcSpikeC {
  protected onLeave({ target, animationComplete }: AnimationCallbackEvent): void {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return animationComplete();
    const animation = target.animate({ opacity: [1, 0] }, { duration: 300, fill: 'forwards' });
    animation.finished.catch(() => undefined).then(animationComplete);
  }
}

/** E : entrée ET sortie déclarées par la directive via `animate.enter` / `animate.leave` (classes posées par Angular à la seule création / suppression, pas au déplacement). */
@Directive({ selector: '[lcSpikeE]', host: { 'animate.enter': 'lc-spike-enter', 'animate.leave': 'lc-spike-leave' } })
export class LcSpikeE {}

/** F : classe de reveal retirée à `animationend` (une seule lecture par instance) : un nœud déplacé puis réinséré par @for ne la rejoue pas. */
@Directive({
  selector: '[lcSpikeF]',
  host: { '[class.lc-spike-reveal]': 'playing()', '(animationend)': 'end($event)', 'animate.leave': 'lc-spike-leave' },
})
export class LcSpikeF {
  protected readonly playing = signal(true);
  protected end(event: AnimationEvent): void {
    if (event.target === event.currentTarget && event.animationName === 'lc-spike-in') this.playing.set(false);
  }
}

/** D : repli, la directive ne pose que l'entrée ; `animate.leave="lc-spike-leave"` est écrit par le développeur dans le gabarit. */
@Directive({ selector: '[lcSpikeD]', host: { class: 'lc-spike-reveal' } })
export class LcSpikeD {}
