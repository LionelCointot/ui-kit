import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, DOCUMENT, ElementRef, afterRenderEffect, computed, contentChildren, inject, input, model, signal, viewChild, viewChildren } from '@angular/core';
import { LcIconComponent, lcPrefersReducedMotion, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcTabComponent } from './tab.component';

/**
 * Onglets (`tablist`, `tab`, `tabpanel`). Flèches gauche et droite, Début et Fin ; activation
 * automatique (l'onglet focalisé est sélectionné) ou manuelle (Entrée ou Espace). Le contenu d'un onglet
 * n'est créé qu'à sa première sélection, puis conservé.
 */
@Component({
  selector: 'lc-tabs',
  imports: [NgTemplateOutlet, LcIconComponent],
  template: `
    <div #list class="lc-tabs__list" role="tablist" [attr.aria-label]="ariaLabel() || null"
      [class.lc-tabs__list--fade-left]="fadeLeft()" [class.lc-tabs__list--fade-right]="fadeRight()"
      (scroll)="updateFades()">
      <span #indicator class="lc-tabs__indicator" role="presentation" aria-hidden="true" hidden></span>
      @for (tab of tabs(); track tab.id()) {
        <button #tabButton type="button" role="tab" class="lc-tabs__tab"
          [id]="tabId(tab.id())" [attr.aria-selected]="tab.id() === current()"
          [attr.aria-controls]="panelId(tab.id())" [tabIndex]="tab.id() === focusable() ? 0 : -1"
          [disabled]="tab.disabled()" (click)="select(tab.id())" (keydown)="onKeydown($event, $index)">
          @if (tab.icon()) {
            <lc-icon [name]="tab.icon()!" />
          }
          <span>{{ tab.label() }}</span>
        </button>
      }
    </div>
    @for (tab of tabs(); track tab.id()) {
      <div role="tabpanel" class="lc-tabs__panel" tabindex="0"
        [id]="panelId(tab.id())" [attr.aria-labelledby]="tabId(tab.id())" [hidden]="tab.id() !== current()">
        @if (visited().has(tab.id()) || tab.id() === current()) {
          <ng-container [ngTemplateOutlet]="tab.contentTemplate()" />
        }
      </div>
    }
  `,
  styleUrl: './tabs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-tabs', '[class.lc-tabs--ready]': 'ready()' },
})
export class LcTabsComponent {
  readonly selected = model<string | null>(null);
  readonly activation = input<'automatic' | 'manual'>('automatic');
  readonly ariaLabel = input<string>();

  protected readonly tabs = contentChildren(LcTabComponent);
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');
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
  protected readonly visited = signal<ReadonlySet<string>>(new Set());

  /** Onglet affiché : `selected` s'il existe et n'est pas désactivé, sinon le premier onglet actif. */
  protected readonly current = computed(() => {
    const tabs = this.tabs();
    const wanted = this.selected();
    const found = tabs.find((tab) => tab.id() === wanted && !tab.disabled());
    return (found ?? tabs.find((tab) => !tab.disabled()))?.id() ?? null;
  });
  /** Onglet atteignable par Tab (focus itinérant), suit la sélection tant que le focus n'a pas bougé. */
  private readonly focusedTab = signal<string | null>(null);
  protected readonly focusable = computed(() => this.focusedTab() ?? this.current());

  constructor() {
    // Ramène l'onglet focalisable (sélectionné ou au focus) dans la zone visible, puis met à jour les fondus.
    afterRenderEffect(() => {
      const index = this.tabs().findIndex((tab) => tab.id() === this.focusable());
      this.scrollTabIntoView(this.buttons()[index]?.nativeElement);
      this.updateFades();
      this.placeIndicator(false);
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
    const indicator = this.indicator().nativeElement;
    const id = this.current();
    const button = this.buttons()[this.tabs().findIndex((tab) => tab.id() === id)]?.nativeElement;
    indicator.hidden = !button;
    if (!button) return;
    // shortcut: écriture directe dans le DOM, car l'ordre classe `--instant` / position doit être synchrone dans ce rappel ; à lever si l'on passe aux liaisons de signaux.
    indicator.classList.toggle('lc-tabs__indicator--instant', resized || id === this.placedId);
    this.placedId = id;
    indicator.style.transform = `translateX(${button.offsetLeft}px)`;
    indicator.style.width = `${button.offsetWidth}px`;
    this.ready.set(true);
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
