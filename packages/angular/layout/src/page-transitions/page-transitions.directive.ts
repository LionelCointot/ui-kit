import { Directive, ElementRef, Injector, afterNextRender, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResolveEnd, Router } from '@angular/router';
import { lcAnimate, lcPrefersReducedMotion, type LcMotionToken } from '@lionelcointot/ui-angular';
import { LcPageNav, type LcPageChange } from './page-nav.service';

const COPY = 'data-lc-page-copy';
const VEIL = 'data-lc-page-veil';
const PHONE = '(max-width: 767.98px)';

/** `value` (« 16px », « 30% ») avec le signe `sign` ; 0 si le token est absent. */
function signed(value: string, sign: number): string {
  const amount = parseFloat(value);
  return Number.isFinite(amount) ? `${sign * amount}${value.trim().replace(/^[-+\d.]+/, '')}` : '0px';
}

/** Copie figée d'une page : sans `id` ni `name` (doublons, gestionnaires de mots de passe), médias en pause, aucun `innerHTML`. */
function frozenCopy(page: Element): Element {
  const copy = page.cloneNode(true) as Element;
  for (const node of [copy, ...copy.querySelectorAll('[id], [name]')]) {
    node.removeAttribute('id');
    node.removeAttribute('name');
  }
  for (const media of copy.querySelectorAll<HTMLMediaElement>('audio, video')) {
    media.removeAttribute('autoplay');
    media.pause();
  }
  return copy;
}

/** Élément `position: fixed` aux dimensions `rect`, au-dessus de la page courante (`z-index`), qui ne reçoit ni clic ni focus. */
function overlay(attribute: string, rect: DOMRect, zIndex: number): HTMLElement {
  const element = document.createElement('div');
  element.setAttribute(attribute, '');
  element.setAttribute('aria-hidden', 'true');
  for (const [name, value] of Object.entries({ position: 'fixed', margin: '0', 'pointer-events': 'none', 'z-index': `${zIndex}`, top: `${rect.top}px`, left: `${rect.left}px`, width: `${rect.width}px`, height: `${rect.height}px` })) {
    element.style.setProperty(name, value);
  }
  return element;
}

interface Snapshot {
  readonly rect: DOMRect;
  readonly pages: readonly Element[];
}

/**
 * Transitions entre pages, posée par `lc-app-shell` sur `<main>` : à chaque `LcPageNav.change`, une copie figée de la page quittée (prise au `ResolveEnd`,
 * insérée au `NavigationEnd` à sa place, `inert`) sort pendant que la nouvelle entre ; ordinateur : fondu et glissement ; téléphone (< 768 px) : empilement iOS ;
 * même niveau sans ordre : fondu. Le focus va sur le `h1` de la nouvelle page (repli sur `<main>`), même sans animation. Sans routeur actif, rien ne se passe.
 * Un hôte de page `inline` (`<ng-component>`) devient `block` le temps de la transition : `translate` ne s'applique pas à un élément `inline`.
 *
 * @internal Posée par `lc-app-shell` seule : exportée par aucun point d'entrée.
 */
@Directive({ selector: '[lcPageTransitions]' })
export class LcPageTransitionsDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly nav = inject(LcPageNav);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private snapshot: Snapshot | null = null;
  private settle: () => void = () => {};

  constructor() {
    let seen = this.nav.change();
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof ResolveEnd) this.capture(event.urlAfterRedirects);
    });
    effect(() => {
      const change = this.nav.change();
      if (!change || change === seen) return;
      seen = change;
      // Après le rendu de la nouvelle page, avant la peinture.
      afterNextRender(() => this.run(change), { injector: this.injector });
    });
  }

  private animates(): boolean {
    return typeof this.host.animate === 'function' && !lcPrefersReducedMotion();
  }

  /** Pages affichées : enfants de `<main>` hors copies, voiles et `router-outlet`. */
  private pages(): Element[] {
    return [...this.host.children].filter((el) => !el.hasAttribute(COPY) && !el.hasAttribute(VEIL) && el.localName !== 'router-outlet');
  }

  private capture(url: string): void {
    this.snapshot = null;
    if (!this.animates() || !this.nav.willTransition()) return;
    // Seule lecture de position de la transition : avant toute écriture.
    this.snapshot = { rect: this.host.getBoundingClientRect(), pages: this.pages().map(frozenCopy) };
  }

  private run(change: LcPageChange): void {
    const snapshot = this.snapshot;
    this.snapshot = null;
    if (change.from === null) return; // premier affichage
    const heading = this.pages().map((page) => page.querySelector<HTMLElement>('h1')).find(Boolean);
    (heading ?? this.host).focus({ preventScroll: true });
    if (!this.animates()) return;

    this.settle();
    const style = getComputedStyle(this.host);
    const token = (name: string) => style.getPropertyValue(name).trim();
    const forward = change.direction !== 'back';
    const sign = forward ? 1 : -1;
    const mode = change.direction === 'same' ? 'fade' : typeof matchMedia === 'function' && matchMedia(PHONE).matches ? 'stack' : 'slide';
    const pages = this.pages();
    const recede = signed(token('--lc-page-stack-recede'), -1);
    const dim = parseFloat(token('--lc-page-stack-dim')) || 0;
    const slide = { exit: signed(token('--lc-page-exit-offset'), -sign), enter: signed(token('--lc-page-enter-offset'), sign) };

    const undo: (() => void)[] = [];
    const set = (element: HTMLElement, name: string, value: string) => {
      const before = element.style.getPropertyValue(name);
      element.style.setProperty(name, value);
      undo.push(() => element.style.setProperty(name, before));
    };
    set(this.host, 'overflow-x', 'clip'); // le glissement ne crée pas de défilement horizontal de la page
    // Un composant routé sans sélecteur s'affiche dans `<ng-component>`, `inline` : `translate` n'y a aucun effet.
    for (const page of pages as HTMLElement[]) if (getComputedStyle(page).display === 'inline') set(page, 'display', 'block');
    if (mode === 'stack' && forward) {
      for (const page of pages as HTMLElement[]) {
        set(page, 'position', 'relative');
        set(page, 'z-index', '3');
        set(page, 'background', 'var(--lc-sys-color-background)');
      }
    }

    const rise = (duration: LcMotionToken, easing: LcMotionToken | 'exit') => ({ duration, easing });
    const exitTiming = mode === 'stack' ? rise('--lc-page-stack-duration', '--lc-page-stack-easing') : rise('--lc-page-exit-duration', 'exit');
    const enterTiming = mode === 'stack' ? exitTiming : rise('--lc-page-enter-duration', '--lc-page-enter-easing');
    const from = { stack: forward ? '100% 0' : `${recede} 0`, slide: `${slide.enter} 0` }[mode as 'stack' | 'slide'];
    const entering = pages.map((page) => lcAnimate(page, mode === 'fade' ? [{ opacity: 0 }, { opacity: 1 }] : mode === 'slide' ? [{ opacity: 0, translate: from }, { opacity: 1, translate: '0 0' }] : [{ translate: from }, { translate: '0 0' }], enterTiming));

    const removeAt = (animation: Animation, node: Element) => {
      const remove = () => node.remove();
      animation.finished.then(remove, remove);
    };
    if (snapshot) {
      const copy = overlay(COPY, snapshot.rect, mode === 'stack' && forward ? 1 : 2);
      copy.setAttribute('inert', '');
      copy.style.setProperty('overflow', 'clip');
      const inner = document.createElement('div');
      inner.append(...snapshot.pages);
      copy.append(inner);
      this.host.append(copy);
      const to = mode === 'stack' ? (forward ? `${recede} 0` : '100% 0') : `${slide.exit} 0`;
      const leaving = mode === 'fade' ? [{ opacity: 1 }, { opacity: 0 }] : mode === 'slide' ? [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: to }] : [{ translate: '0 0' }, { translate: to }];
      removeAt(lcAnimate(inner, leaving, exitTiming), copy);
      if (mode === 'stack') {
        const veil = overlay(VEIL, snapshot.rect, forward ? 2 : 1);
        veil.style.setProperty('opacity', '0');
        veil.style.setProperty('background', 'var(--lc-sys-color-backdrop)'); // repli si la couleur relative n'est pas prise en charge
        veil.style.setProperty('background', 'rgb(from var(--lc-sys-color-backdrop) r g b / 1)'); // opaque : l'opacité animée est celle du token (Baseline 2024)
        this.host.append(veil);
        removeAt(lcAnimate(veil, forward ? [{ opacity: 0 }, { opacity: dim }] : [{ opacity: dim }, { opacity: 0 }], exitTiming), veil);
      }
    }

    const settle = () => {
      for (const animation of entering) animation.cancel();
      undo.splice(0).reverse().forEach((restore) => restore());
    };
    this.settle = settle;
    void Promise.allSettled(entering.map((animation) => animation.finished)).then(() => {
      if (this.settle === settle) settle();
    });
  }
}
