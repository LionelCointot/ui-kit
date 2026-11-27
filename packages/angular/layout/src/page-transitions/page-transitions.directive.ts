import { DestroyRef, Directive, ElementRef, Injector, afterNextRender, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ResolveEnd, Router } from '@angular/router';
import { lcAnimate, lcPrefersReducedMotion, type LcMotionToken } from '@lionelcointot/ui-angular';
import { PAGE_BACK_FLICK_WINDOW_MS, pageBackSettleMs, pageBackShouldEngage, pageBackTranslation, type LcPageSample } from './page-gesture';
import { pathOf } from './page-nav.direction';
import { LC_PHONE_QUERY } from '../phone-query';
import { LcPageNav, type LcPageChange } from './page-nav.service';

const COPY = 'data-lc-page-copy';
const VEIL = 'data-lc-page-veil';
/** Bande du bord gauche posée par `lc-app-shell` (< 768 px, niveau ≥ 2) : seul endroit où le geste de retour démarre. */
const EDGE = 'data-lc-page-edge';

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

/** Écritures de style en ligne, défaites en bloc par `restore()`. */
function inlineStyles() {
  const undo: (() => void)[] = [];
  return {
    set(element: HTMLElement, name: string, value: string): void {
      const before = element.style.getPropertyValue(name);
      element.style.setProperty(name, value);
      undo.push(() => element.style.setProperty(name, before));
    },
    restore: () => undo.splice(0).reverse().forEach((restore) => restore()),
  };
}

/** Voile de l'empilement : opaque, l'opacité animée est celle du token (Baseline 2024). */
function stackVeil(rect: DOMRect, zIndex: number): HTMLElement {
  const veil = overlay(VEIL, rect, zIndex);
  veil.style.setProperty('opacity', '0');
  veil.style.setProperty('background', 'var(--lc-sys-color-backdrop)'); // repli si la couleur relative n'est pas prise en charge
  veil.style.setProperty('background', 'rgb(from var(--lc-sys-color-backdrop) r g b / 1)');
  return veil;
}

interface Snapshot {
  readonly rect: DOMRect;
  readonly pages: readonly Element[];
}

/** Dernière page quittée par un empilement, gardée pour le geste de retour (la copie de la sortie est consommée par son animation). */
interface Previous {
  readonly url: string;
  readonly pages: readonly Element[];
}

interface Drag {
  readonly pointerId: number;
  readonly startX: number;
  readonly width: number;
  readonly pages: readonly HTMLElement[];
  readonly under: HTMLElement;
  readonly inner: HTMLElement;
  readonly veil: HTMLElement;
  readonly styles: ReturnType<typeof inlineStyles>;
  readonly recede: string;
  readonly dim: number;
  readonly samples: LcPageSample[];
  offset: number;
  frame: number;
}

/**
 * Transitions entre pages, posée par `lc-app-shell` sur `<main>` : à chaque `LcPageNav.change`, une copie figée de la page quittée (prise au `ResolveEnd`,
 * insérée au `NavigationEnd` à sa place, `inert`) sort pendant que la nouvelle entre ; ordinateur : fondu et glissement ; téléphone (< 768 px) : empilement iOS ;
 * même niveau sans ordre : fondu. Le focus va sur le `h1` de la nouvelle page (repli sur `<main>`), même sans animation. Sans routeur actif, rien ne se passe.
 * Un hôte de page `inline` (`<ng-component>`) devient `block` le temps de la transition : `translate` ne s'applique pas à un élément `inline`.
 *
 * @internal Posée par `lc-app-shell` seule : exportée par aucun point d'entrée.
 */
@Directive({
  selector: '[lcPageTransitions]',
  host: {
    '(pointerdown)': 'onDown($event)',
    '(pointermove)': 'onMove($event)',
    '(pointerup)': 'onUp($event)',
    '(pointercancel)': 'release(false)',
    '(lostpointercapture)': 'release(false)',
  },
})
export class LcPageTransitionsDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly nav = inject(LcPageNav);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private snapshot: Snapshot | null = null;
  private settle: () => void = () => {};
  /** Un seul clone de la page quittée (sans `id` ni `name`), libéré par `run()` à la navigation suivante. */
  private previous: Previous | null = null;
  private destroyed = false;
  private drag: Drag | null = null;
  /** Vrai entre l'engagement du geste et le rendu de la page précédente : la navigation finale ne rejoue pas la transition. */
  private silent = false;
  private finishGesture: () => void = () => {};

  constructor() {
    let seen = this.nav.change();
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof ResolveEnd) this.capture(event.urlAfterRedirects);
    });
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.abort();
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
    return [...this.host.children].filter((el) => !el.hasAttribute(COPY) && !el.hasAttribute(VEIL) && !el.hasAttribute(EDGE) && el.localName !== 'router-outlet');
  }

  private capture(url: string): void {
    this.snapshot = null;
    if (this.silent || !this.animates() || !this.nav.willTransition()) return;
    // Seule lecture de position de la transition : avant toute écriture.
    this.snapshot = { rect: this.host.getBoundingClientRect(), pages: this.pages().map(frozenCopy) };
  }

  private run(change: LcPageChange): void {
    const snapshot = this.snapshot;
    const silent = this.silent;
    this.snapshot = null;
    this.silent = false;
    this.previous = null;
    if (change.from === null) return; // premier affichage
    const heading = this.pages().map((page) => page.querySelector<HTMLElement>('h1')).find(Boolean);
    (heading ?? this.host).focus({ preventScroll: true });
    if (silent) return this.finishGesture(); // le geste a déjà montré la page précédente
    if (!this.animates()) return;

    this.settle();
    const style = getComputedStyle(this.host);
    const token = (name: string) => style.getPropertyValue(name).trim();
    const forward = change.direction !== 'back';
    const sign = forward ? 1 : -1;
    const mode = change.direction === 'same' ? 'fade' : typeof matchMedia === 'function' && matchMedia(LC_PHONE_QUERY).matches ? 'stack' : 'slide';
    const pages = this.pages();
    const recede = signed(token('--lc-page-stack-recede'), -1);
    const dim = parseFloat(token('--lc-page-stack-dim')) || 0;
    const slide = { exit: signed(token('--lc-page-exit-offset'), -sign), enter: signed(token('--lc-page-enter-offset'), sign) };

    const { set, restore } = inlineStyles();
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
      if (mode === 'stack' && forward && change.from) this.previous = { url: change.from, pages: snapshot.pages.map((page) => page.cloneNode(true) as Element) };
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
        const veil = stackVeil(snapshot.rect, forward ? 2 : 1);
        this.host.append(veil);
        removeAt(lcAnimate(veil, forward ? [{ opacity: 0 }, { opacity: dim }] : [{ opacity: dim }, { opacity: 0 }], exitTiming), veil);
      }
    }

    const settle = () => {
      for (const animation of entering) animation.cancel();
      restore();
    };
    this.settle = settle;
    void Promise.allSettled(entering.map((animation) => animation.finished)).then(() => {
      if (this.settle === settle) settle();
    });
  }

  /** Geste impossible ici : feuille ouverte, ou doigt posé sur une bande de panneaux. */
  private blocked(event: PointerEvent): boolean {
    if (document.querySelector('dialog[open]')) return true;
    return (document.elementsFromPoint?.(event.clientX, event.clientY) ?? []).some((element) => element.closest('lc-swipe-panels'));
  }

  /** Fin brutale (destruction) : retire voile et copie, rend les styles, sans navigation. */
  private abort(): void {
    const drag = this.drag;
    this.drag = null;
    if (drag) {
      cancelAnimationFrame(drag.frame);
      drag.under.remove();
      drag.veil.remove();
      drag.styles.restore();
    }
    this.finishGesture();
  }

  /** Sans page parente titrée, le geste n'est pas armé : le bouton garde `Location.back()`. */
  protected onDown(event: PointerEvent): void {
    const edge = (event.target as Element).closest?.(`[${EDGE}]`);
    if (!edge || this.drag || !this.nav.parent() || !event.isPrimary || event.pointerType === 'mouse' || !this.animates() || !matchMedia(LC_PHONE_QUERY).matches || this.blocked(event)) return;
    this.settle();
    const rect = this.host.getBoundingClientRect();
    const style = getComputedStyle(this.host);
    const styles = inlineStyles();
    const pages = this.pages() as HTMLElement[];
    styles.set(this.host, 'overflow-x', 'clip');
    for (const page of pages) {
      if (getComputedStyle(page).display === 'inline') styles.set(page, 'display', 'block'); // `<ng-component>` : `translate` n'agit pas sur un élément `inline`
      styles.set(page, 'translate', '0px 0'); // `paint` l'écrase ; `restore` rend la valeur d'origine
      styles.set(page, 'position', 'relative');
      styles.set(page, 'z-index', '3');
      styles.set(page, 'background', 'var(--lc-sys-color-background)');
    }
    // Sous la page : sa copie figée si elle est celle de la page parente, sinon un fond neutre qui porte le titre du parent (lien direct).
    const parent = this.nav.parent();
    const under = overlay(COPY, rect, 1);
    under.setAttribute('inert', '');
    under.style.setProperty('overflow', 'clip');
    const inner = document.createElement('div');
    inner.style.setProperty('block-size', '100%');
    if (this.previous && parent && pathOf(this.previous.url) === pathOf(parent.url)) {
      inner.append(...this.previous.pages.map((page) => page.cloneNode(true)));
    } else {
      for (const [name, value] of Object.entries({ padding: 'var(--lc-sys-space-4)', 'box-sizing': 'border-box', background: 'var(--lc-sys-color-background)', color: 'var(--lc-sys-color-on-surface-variant)', 'font-weight': 'var(--lc-sys-font-weight-semibold)' })) inner.style.setProperty(name, value);
      inner.textContent = parent?.title ?? '';
    }
    under.append(inner);
    const veil = stackVeil(rect, 2);
    this.host.append(under, veil);
    edge.setPointerCapture?.(event.pointerId);
    this.drag = { pointerId: event.pointerId, startX: event.clientX, width: rect.width, pages, under, inner, veil, styles, recede: style.getPropertyValue('--lc-page-stack-recede').trim(), dim: parseFloat(style.getPropertyValue('--lc-page-stack-dim')) || 0, samples: [], offset: 0, frame: 0 };
  }

  protected onMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.offset = event.clientX - drag.startX;
    drag.samples.push({ time: event.timeStamp, offset: drag.offset });
    while (drag.samples.length && event.timeStamp - drag.samples[0].time > PAGE_BACK_FLICK_WINDOW_MS) drag.samples.shift();
    drag.frame ||= requestAnimationFrame(() => {
      drag.frame = 0;
      this.paint(drag);
    });
  }

  protected onUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    this.release(pageBackShouldEngage(drag.offset, drag.width, drag.samples, event.timeStamp));
  }

  /** Style de chaque élément du geste quand la page est tirée de la part `progress` (0 à 1) : la page suit le doigt, la précédente avance de son recul à 0, le voile s'éteint. */
  private frame(drag: Drag, progress: number): [HTMLElement, Record<string, string>][] {
    return [
      ...drag.pages.map((page): [HTMLElement, Record<string, string>] => [page, { translate: `${progress * drag.width}px 0` }]),
      [drag.inner, { translate: `${signed(drag.recede, -(1 - progress))} 0` }],
      [drag.veil, { opacity: `${drag.dim * (1 - progress)}` }],
    ];
  }

  private paint(drag: Drag): void {
    for (const [element, style] of this.frame(drag, pageBackTranslation(drag.offset, drag.width) / drag.width)) Object.assign(element.style, style);
  }

  /** Relâchement : engage (la page sort, puis navigation silencieuse vers la parente) ou ramène la page en place ; durée proportionnelle à la distance restante. */
  protected release(engage: boolean): void {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    cancelAnimationFrame(drag.frame);
    const progress = pageBackTranslation(drag.offset, drag.width) / drag.width;
    const to = this.frame(drag, engage ? 1 : 0);
    const animations = this.frame(drag, progress).map(([element, from], index) => lcAnimate(element, [from, to[index][1]], { duration: '--lc-page-stack-duration', easing: '--lc-page-stack-easing', fill: 'forwards' }));
    // La course entière dure `page.stack-duration` ; ici seule la part restante, sans passer sous le minimum.
    const full = Number(animations[0]?.effect?.getTiming().duration) || 0;
    for (const animation of animations) animation.effect?.updateTiming({ duration: pageBackSettleMs(engage ? 1 - progress : progress, full) });
    const cleanup = () => {
      for (const animation of animations) animation.cancel();
      drag.under.remove();
      drag.veil.remove();
      drag.styles.restore();
      this.finishGesture = () => {};
    };
    void Promise.allSettled(animations.map((animation) => animation.finished)).then(() => {
      if (!engage || this.destroyed) return cleanup();
      this.silent = true;
      this.finishGesture = cleanup; // appelé par `run` une fois la page précédente rendue
      const before = this.nav.change();
      const clean = () => {
        this.silent = false;
        cleanup();
      };
      // Le `change` est posé au `NavigationEnd`, avant cette résolution : s'il n'a pas bougé, aucun `run` ne viendra (route sans transition, navigation ignorée ou échouée).
      this.nav.back().then((done) => (done && this.nav.change() !== before ? undefined : clean()), clean);
    });
  }
}
