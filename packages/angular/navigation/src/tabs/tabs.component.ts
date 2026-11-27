import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DOCUMENT, ElementRef, afterRenderEffect, computed, contentChildren, inject, input, model, output, signal, viewChild, viewChildren } from '@angular/core';
import { LcIconComponent, lcIndicatorRect, lcPlaceIndicator, lcPrefersReducedMotion, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcSwipePanelDirective, LcSwipePanelsComponent } from '../swipe-panels/swipe-panels.component';
import { LcTabComponent } from './tab.component';

/** Réglages du glissement de `lc-tabs` (ADR 0010 : `swipe` vaut `boolean | LcTabsSwipeSettings`). */
export interface LcTabsSwipeSettings {
  /** `true` : au bord, le geste passe à la bande qui défile au-dessus (bandes imbriquées). */
  readonly chain?: boolean;
}

/**
 * Onglets (`tablist`, `tab`, `tabpanel`). Flèches gauche et droite, Début et Fin ; activation
 * automatique (l'onglet focalisé est sélectionné) ou manuelle (Entrée ou Espace). Le contenu d'un onglet
 * n'est créé qu'à sa première sélection, puis conservé ; à cette première ouverture (pas à l'onglet affiché au départ), ses enfants directs entrent
 * en cascade (`lc-reveal`, voir `motion.css`), une seule fois.
 *
 * Avec `swipe`, les panneaux sont ceux d'un `lc-swipe-panels` (un seul jeu de `tabpanel`, tous créés d'emblée, `inert`
 * hors de vue, jamais `hidden`) : un glissement change d'onglet et le trait suit le doigt. L'hôte remplit son conteneur
 * (liste fixe, bande qui prend le reste). Un onglet désactivé n'a pas de panneau.
 */
@Component({
  selector: 'lc-tabs',
  imports: [NgTemplateOutlet, LcIconComponent, LcSwipePanelsComponent, LcSwipePanelDirective],
  template: `
    <div #list class="lc-tabs__list" role="tablist" [attr.aria-label]="ariaLabel() || null"
      [class.lc-tabs__list--fade-left]="fadeLeft()" [class.lc-tabs__list--fade-right]="fadeRight()"
      (scroll)="updateFades()">
      <span #indicator class="lc-tabs__indicator" role="presentation" aria-hidden="true" hidden></span>
      @for (tab of tabs(); track tab.id()) {
        <button #tabButton type="button" role="tab" class="lc-tabs__tab"
          [id]="tabId(tab.id())" [attr.aria-selected]="tab.id() === current()"
          [attr.aria-controls]="swipeOn() && tab.disabled() ? null : panelId(tab.id())" [tabIndex]="tab.id() === focusable() ? 0 : -1"
          [disabled]="tab.disabled()" (click)="select(tab.id())" (keydown)="onKeydown($event, $index)">
          @if (tab.icon()) {
            <lc-icon [name]="tab.icon()!" />
          }
          <span>{{ tab.label() }}</span>
        </button>
      }
    </div>
    @if (swipeOn()) {
      <lc-swipe-panels #strip class="lc-tabs__strip" [chain]="chain()" [activeIndex]="swipeIndex()" (activeIndexChange)="onSwipe($event)">
        @for (tab of swipeTabs(); track tab.id()) {
          <div lcSwipePanel role="tabpanel" class="lc-tabs__panel" tabindex="0"
            [id]="panelId(tab.id())" [attr.aria-labelledby]="tabId(tab.id())">
            <ng-container [ngTemplateOutlet]="tab.contentTemplate()" />
          </div>
        }
      </lc-swipe-panels>
    } @else {
      @for (tab of tabs(); track tab.id()) {
        <div #panel role="tabpanel" class="lc-tabs__panel" tabindex="0" (animationend)="endReveal($event)"
          [id]="panelId(tab.id())" [attr.aria-labelledby]="tabId(tab.id())" [hidden]="tab.id() !== current()">
          @if (visited().has(tab.id()) || tab.id() === current()) {
            <ng-container [ngTemplateOutlet]="tab.contentTemplate()" />
          }
        </div>
      }
    }
  `,
  styleUrl: './tabs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-tabs', '[class.lc-tabs--ready]': 'ready()', '[class.lc-tabs--swipe]': 'swipeOn()' },
})
export class LcTabsComponent {
  readonly selected = model<string | null>(null);
  readonly activation = input<'automatic' | 'manual'>('automatic');
  readonly ariaLabel = input<string>();
  /** Panneaux glissants (voir la description du composant) ; un objet règle le glissement. */
  readonly swipe = input<boolean | LcTabsSwipeSettings, boolean | LcTabsSwipeSettings | ''>(false, { transform: (value) => value === '' || value });
  /** Émis à chaque changement d'onglet ; `source` distingue un choix (`tab` : clic, clavier) d'un glissement (`swipe`). */
  readonly selectionChange = output<{ id: string; source: 'tab' | 'swipe' }>();

  protected readonly tabs = contentChildren(LcTabComponent);
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');
  private readonly panels = viewChildren<ElementRef<HTMLElement>>('panel');
  private readonly strip = viewChild(LcSwipePanelsComponent);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');
  private readonly indicator = viewChild.required<ElementRef<HTMLElement>>('indicator');
  private readonly view = inject(DOCUMENT).defaultView;
  private readonly baseId = lcUniqueId('tabs');
  /** Onglets cachés à gauche / à droite de la rangée : un fondu de bord le signale. */
  protected readonly fadeLeft = signal(false);
  protected readonly fadeRight = signal(false);
  /** Vrai après la première mesure de l'indicateur : avant, il se pose sans transition. */
  protected readonly ready = signal(false);
  private placedId: string | null = null;
  /** Onglets déjà affichés au moins une fois : seule leur première ouverture déclenche la cascade, sauf l'onglet de départ. */
  private readonly opened = new Set<string>();
  protected readonly visited = signal<ReadonlySet<string>>(new Set());

  /** Onglet affiché : `selected` s'il existe et n'est pas désactivé, sinon le premier onglet actif. */
  protected readonly current = computed(() => {
    const tabs = this.tabs();
    const wanted = this.selected();
    const found = tabs.find((tab) => tab.id() === wanted && !tab.disabled());
    return (found ?? tabs.find((tab) => !tab.disabled()))?.id() ?? null;
  });
  protected readonly swipeOn = computed(() => !!this.swipe());
  protected readonly chain = computed(() => { const swipe = this.swipe(); return typeof swipe === 'object' && !!swipe.chain; });
  protected readonly swipeTabs = computed(() => this.tabs().filter((tab) => !tab.disabled()));
  protected readonly swipeIndex = computed(() => Math.max(0, this.swipeTabs().findIndex((tab) => tab.id() === this.current())));
  /** Onglet atteignable par Tab (focus itinérant), suit la sélection tant que le focus n'a pas bougé. */
  private readonly focusedTab = signal<string | null>(null);
  protected readonly focusable = computed(() => this.focusedTab() ?? this.current());

  constructor() {
    // Ramène l'onglet focalisable (sélectionné ou au focus) dans la zone visible, puis met à jour les fondus.
    afterRenderEffect(() => {
      const index = this.tabs().findIndex((tab) => tab.id() === this.focusable());
      this.scrollTabIntoView(this.buttons()[index]?.nativeElement);
      this.updateFades();
      if (!this.swipeOn()) this.placeIndicator(false);
    });
    afterRenderEffect(() => {
      const id = this.current();
      if (id === null || this.swipeOn() || this.opened.has(id)) return;
      const initial = this.opened.size === 0;
      this.opened.add(id);
      if (!initial) this.revealPanel(id);
    });
    // En glissement, le trait suit la progression de la bande (position et largeur interpolées, sans transition).
    afterRenderEffect(() => {
      if (this.swipeOn()) this.followStrip();
    });
    afterRenderEffect((onCleanup) => {
      // Une remesure due à la taille (et non à une sélection) pose l'indicateur sans transition.
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => {
        this.updateFades();
        this.placeIndicator(true);
      });
      observer?.observe(this.list().nativeElement);
      this.buttons().forEach((button) => observer?.observe(button.nativeElement));
      onCleanup(() => observer?.disconnect());
    });
  }

  protected updateFades(): void {
    const list = this.list().nativeElement;
    const max = list.scrollWidth - list.clientWidth;
    const rtl = this.view?.getComputedStyle(list).direction === 'rtl';
    const hiddenLeft = rtl ? max + list.scrollLeft : list.scrollLeft;
    this.fadeLeft.set(hiddenLeft > 1);
    this.fadeRight.set(max - hiddenLeft > 1);
  }

  /**
   * Place le trait sous l'onglet sélectionné ; masqué sans sélection. Seul un changement d'onglet sélectionné
   * glisse : une remesure (`resized`) ou une même sélection (ajout d'onglet, focus) pose le trait sans transition.
   */
  private placeIndicator(resized: boolean): void {
    if (this.swipeOn()) return this.followStrip();
    const indicator = this.indicator().nativeElement;
    const id = this.current();
    const button = this.buttons()[this.tabs().findIndex((tab) => tab.id() === id)]?.nativeElement;
    indicator.hidden = !button;
    if (!button) return;
    // shortcut: écriture directe dans le DOM, car l'ordre classe `--instant` / position doit être synchrone dans ce rappel ; à lever si l'on passe aux liaisons de signaux.
    // Premier placement (`placedId` nul) : sans transition, même si `lc-tabs--ready` arrive dans le même calcul de style.
    indicator.classList.toggle('lc-tabs__indicator--instant', resized || this.placedId === null || id === this.placedId);
    this.placedId = id;
    lcPlaceIndicator(indicator, 'x', button.offsetLeft, button.offsetLeft + button.offsetWidth, this.rightEdge());
    this.ready.set(true);
  }

  /** Bord droit du dernier onglet : bord fixe de la boîte de l'indicateur (`lcPlaceIndicator`). */
  private rightEdge(): number {
    const last = this.buttons().at(-1)?.nativeElement;
    return last ? last.offsetLeft + last.offsetWidth : 0;
  }

  private followStrip(): void {
    const indicator = this.indicator().nativeElement;
    const tabs = this.tabs();
    const buttons = this.buttons();
    const rects = this.swipeTabs().map((tab) => buttons[tabs.indexOf(tab)]?.nativeElement).filter((button) => !!button).map((button) => ({ left: button.offsetLeft, width: button.offsetWidth }));
    const rect = lcIndicatorRect(rects, this.strip()?.progress() ?? 0);
    indicator.hidden = !rect;
    if (!rect) return;
    indicator.classList.add('lc-tabs__indicator--instant');
    lcPlaceIndicator(indicator, 'x', rect.left, rect.left + rect.width, this.rightEdge());
    this.ready.set(true);
  }

  /** Première ouverture d'un onglet : ses enfants directs entrent l'un après l'autre (`lc-reveal`, rang = position, courbe « soft »). */
  private revealPanel(id: string): void {
    const panel = this.panels().find((ref) => ref.nativeElement.id === this.panelId(id))?.nativeElement;
    if (!panel || lcPrefersReducedMotion()) return;
    Array.from(panel.children, (child, rank) => {
      const element = child as HTMLElement;
      element.classList.add('lc-reveal');
      element.style.setProperty('--lc-reveal-rank', `${rank}`);
      element.style.setProperty('--lc-reveal-curve', 'var(--lc-sys-easing-soft)');
    });
  }

  /** Fin de l'entrée d'un enfant du panneau : la classe et les variables posées par `revealPanel` sont retirées. */
  protected endReveal(event: AnimationEvent): void {
    const child = event.target as HTMLElement;
    if (event.animationName !== 'lc-reveal-in' || child.parentElement !== event.currentTarget) return;
    child.classList.remove('lc-reveal');
    child.style.removeProperty('--lc-reveal-rank');
    child.style.removeProperty('--lc-reveal-curve');
  }

  protected onSwipe(index: number): void {
    const tab = this.swipeTabs()[index];
    if (tab) this.pick(tab.id(), 'swipe');
  }

  /** Fait défiler la rangée (jamais la page) jusqu'à l'onglet, en laissant la largeur du fondu de chaque côté. */
  private scrollTabIntoView(button: HTMLElement | undefined): void {
    if (!button || !this.view) return;
    const list = this.list().nativeElement;
    const margin = parseFloat(this.view.getComputedStyle(list).scrollPaddingLeft) || 0;
    const listBox = list.getBoundingClientRect();
    const box = button.getBoundingClientRect();
    const delta = box.left < listBox.left + margin ? box.left - listBox.left - margin
      : box.right > listBox.right - margin ? box.right - listBox.right + margin : 0;
    if (delta === 0) return;
    const reduced = lcPrefersReducedMotion();
    list.scrollBy({ left: delta, behavior: reduced ? 'auto' : 'smooth' });
  }

  protected tabId(id: string): string {
    return `${this.baseId}-tab-${id}`;
  }

  protected panelId(id: string): string {
    return `${this.baseId}-panel-${id}`;
  }

  protected select(id: string): void {
    this.pick(id, 'tab');
  }

  private pick(id: string, source: 'tab' | 'swipe'): void {
    if (id !== this.current()) this.selectionChange.emit({ id, source });
    this.selected.set(id);
    this.focusedTab.set(null);
    this.visited.update((set) => new Set(set).add(id));
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const tabs = this.tabs();
    let target = -1;
    switch (event.key) {
      case 'ArrowRight': target = this.step(index, 1); break;
      case 'ArrowLeft': target = this.step(index, -1); break;
      case 'Home': target = this.step(-1, 1); break;
      case 'End': target = this.step(tabs.length, -1); break;
      default: return;
    }
    event.preventDefault();
    if (target < 0) return;
    this.buttons()[target]?.nativeElement.focus();
    this.focusedTab.set(tabs[target].id());
    if (this.activation() === 'automatic') this.select(tabs[target].id());
  }

  /** Prochain onglet actif à partir de `from` dans le sens `direction`, avec retour à l'autre extrémité. */
  private step(from: number, direction: 1 | -1): number {
    const tabs = this.tabs();
    for (let offset = 1; offset <= tabs.length; offset += 1) {
      const index = (((from + direction * offset) % tabs.length) + tabs.length) % tabs.length;
      if (!tabs[index].disabled()) return index;
    }
    return -1;
  }
}
