import { ChangeDetectionStrategy, Component, DOCUMENT, Directive, ElementRef, ViewEncapsulation, afterRenderEffect, computed, contentChildren, inject, input, isDevMode, model, signal, untracked } from '@angular/core';
import { lcPrefersReducedMotion } from '@lionelcointot/ui-angular';

/** Durée maximale de la sourdine pendant un défilement provoqué, si `scrollend` n'arrive pas (Safari avant 26.2, ADR 0009). */
const PROGRAMMATIC_SCROLL_MAX_MS = 800;
/** Part visible d'un panneau à partir de laquelle il devient le panneau actif. */
const ACTIVE_THRESHOLD = 0.6;

/** Marque un enfant direct de `lc-swipe-panels` comme panneau. Le rôle et le nom du panneau restent au consommateur (`role="region"` et `aria-labelledby`). */
@Directive({
  selector: '[lcSwipePanel]',
  // tabindex -1 : le focus peut être ramené sur le panneau actif quand celui où il se trouvait devient `inert`.
  host: { class: 'lc-swipe-panel', tabindex: '-1' },
})
export class LcSwipePanelDirective {
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
}

/**
 * Bande de panneaux à accrochage natif (`scroll-snap`) : chaque enfant `[lcSwipePanel]` occupe toute la largeur et se
 * change par glissement ou par `activeIndex`. `activeIndexChange` n'est émis que par un glissement. Les panneaux hors de vue
 * sont `inert`. `progress` (0 à n - 1) et `--lc-swipe-panels-progress` suivent le doigt, pour un onglet ou un segment.
 * `layout="columns"` pose les mêmes panneaux côte à côte, sans les recréer.
 *
 * Marge de bord pour le geste retour d'iOS : `--lc-swipe-panels-gutter` (jeton `gutter`).
 * Colonnes : `--lc-swipe-panels-columns` surcharge `grid-template-columns`.
 */
@Component({
  selector: 'lc-swipe-panels',
  template: '<ng-content />',
  styleUrl: './swipe-panels.component.css',
  // Les panneaux sont projetés : leurs styles ne peuvent pas être encapsulés.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-swipe-panels',
    '[class.lc-swipe-panels--columns]': "layout() === 'columns'",
    '[class.lc-swipe-panels--chain]': 'chain()',
    '[style.--lc-swipe-panels-count]': 'panels().length',
    '[style.--lc-swipe-panels-progress]': 'progress()',
  },
})
export class LcSwipePanelsComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly document = inject(DOCUMENT);

  /** Panneau affiché ; la sortie `activeIndexChange` n'est émise que par un glissement. */
  readonly activeIndex = model(0);
  /** `strip` : bande glissante ; `columns` : panneaux côte à côte (grille), sans `inert`. */
  readonly layout = input<'strip' | 'columns'>('strip');
  /** `true` : au bord, le geste passe au conteneur qui défile au-dessus ; `false` : il s'arrête ici. */
  readonly chain = input(false);

  protected readonly panels = contentChildren(LcSwipePanelDirective);
  private readonly scrolled = signal(0);
  /** Position réelle de la bande, de 0 à n - 1 (en colonnes : l'index actif). */
  readonly progress = computed(() => (this.layout() === 'columns' ? this.index() : this.scrolled()));

  /** `activeIndex` ramené dans les bornes (sans écrire dans le modèle : aucune émission). */
  private readonly index = computed(() => Math.min(Math.max(Math.round(this.activeIndex()) || 0, 0), Math.max(this.panels().length - 1, 0)));
  private muted = false;
  private mutedTimer: ReturnType<typeof setTimeout> | undefined;
  private placed = false;

  constructor() {
    afterRenderEffect(() => {
      const index = this.index();
      const columns = this.layout() === 'columns';
      const panels = this.panels();
      untracked(() => {
        if (isDevMode() && panels.length > 0 && index !== this.activeIndex()) console.warn(`[lc-swipe-panels] activeIndex ${this.activeIndex()} hors bornes, ramené à ${index}.`);
        this.applyInert(index, columns);
        if (columns) this.placed = false;
        else if (!this.placed) this.place(index, true);
        else if (index !== this.snapped()) this.place(index, false);
      });
    });
    afterRenderEffect((onCleanup) => {
      if (this.layout() === 'columns' || typeof IntersectionObserver === 'undefined') return;
      const elements = this.panels().map((panel) => panel.element);
      const sync = (target: Element | null | undefined): void => {
        const index = target ? elements.indexOf(target as HTMLElement) : -1;
        if (!this.muted && index >= 0 && index !== this.index()) this.activeIndex.set(index);
      };
      const intersection = new IntersectionObserver(
        (entries) => entries.forEach((entry) => entry.isIntersecting && entry.intersectionRatio >= ACTIVE_THRESHOLD && sync(entry.target)),
        { root: this.host, threshold: [ACTIVE_THRESHOLD] },
      );
      elements.forEach((element) => intersection.observe(element));
      let frame = 0;
      const onScroll = (): void => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => this.scrolled.set(this.host.clientWidth ? Math.abs(this.host.scrollLeft) / this.host.clientWidth : 0));
      };
      // `scrollsnapchange` (Chrome, Edge) devance l'observateur ; son absence ne change rien.
      const onSnap = (event: Event): void => sync((event as Event & { snapTargetInline?: Element | null }).snapTargetInline);
      // Rotation, clavier, passage de colonnes à bande : le panneau affiché reste en place.
      const resize = new ResizeObserver(() => {
        this.place(this.index(), true);
        onScroll();
      });
      resize.observe(this.host);
      this.host.addEventListener('scroll', onScroll, { passive: true });
      this.host.addEventListener('scrollsnapchange', onSnap);
      onCleanup(() => {
        intersection.disconnect();
        resize.disconnect();
        cancelAnimationFrame(frame);
        clearTimeout(this.mutedTimer);
        this.host.removeEventListener('scroll', onScroll);
        this.host.removeEventListener('scrollsnapchange', onSnap);
      });
    });
  }

  private isRtl(): boolean {
    return getComputedStyle(this.host).direction === 'rtl';
  }

  /** Panneau actuellement accroché, d'après la position de défilement. */
  private snapped(): number {
    return this.host.clientWidth ? Math.round(Math.abs(this.host.scrollLeft) / this.host.clientWidth) : this.index();
  }

  /** Hors de vue : `inert`. Si le focus était dans un panneau qui le devient, il passe au panneau actif. */
  private applyInert(index: number, columns: boolean): void {
    const elements = this.panels().map((panel) => panel.element);
    const swipes = !columns && elements.length > 1;
    elements.forEach((element, i) => (!swipes || i === index) && element.removeAttribute('inert'));
    const focused = this.document.activeElement;
    if (swipes && focused && elements.some((element, i) => i !== index && element.contains(focused))) elements[index].focus({ preventScroll: true });
    elements.forEach((element, i) => swipes && i !== index && element.setAttribute('inert', ''));
  }

  /** Amène le panneau en vue. Pendant un défilement animé, les panneaux traversés ne doivent pas devenir actifs (sourdine). */
  private place(index: number, instant: boolean): void {
    const width = this.host.clientWidth;
    if (!width) return;
    this.placed = true;
    const behavior = instant || lcPrefersReducedMotion() ? 'instant' : 'smooth';
    this.muted = true;
    clearTimeout(this.mutedTimer);
    const done = (): void => {
      this.muted = false;
      clearTimeout(this.mutedTimer);
    };
    this.host.addEventListener('scrollend', done, { once: true });
    this.mutedTimer = setTimeout(() => {
      this.host.removeEventListener('scrollend', done);
      done();
    }, PROGRAMMATIC_SCROLL_MAX_MS);
    this.host.scrollTo({ left: (this.isRtl() ? -1 : 1) * index * width, behavior });
  }
}
