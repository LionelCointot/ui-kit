import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, booleanAttribute, inject, input, signal, untracked, viewChild } from '@angular/core';
import { lcPlaceIndicator } from '@lionelcointot/ui-angular';

/**
 * Liste de navigation : conteneur d'éléments `a[lcNavItem]`. À placer dans un `<nav>` (par exemple
 * l'emplacement `[lcShellNav]` de `lc-app-shell`, qui fournit le repère de navigation).
 */
@Component({
  selector: 'lc-nav-list',
  template: `
    <span #indicator class="lc-nav-list__indicator lc-nav-list__indicator--hidden" aria-hidden="true"></span>
    <ng-content />
  `,
  styleUrl: './nav-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-nav-list', '[class.lc-nav-list--collapsed]': 'collapsed()', '[class.lc-nav-list--ready]': 'ready()' },
})
export class LcNavListComponent {
  /** Mode réduit : seules les icônes sont visibles, le libellé passe en info-bulle native. */
  readonly collapsed = input(false, { transform: booleanAttribute });

  /** Vrai après la première mesure de l'indicateur : avant, il se pose sans transition. */
  protected readonly ready = signal(false);
  private readonly activeItem = signal<HTMLElement | null>(null);
  private readonly indicator = viewChild.required<ElementRef<HTMLElement>>('indicator');
  private placedItem: HTMLElement | null = null;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Changement d'élément actif : l'indicateur glisse. Bascule `collapsed` : nouvelle mesure sans glissement.
    afterRenderEffect(() => this.place(this.activeItem(), false));
    afterRenderEffect(() => {
      this.collapsed();
      this.place(untracked(() => this.activeItem()), true);
    });
    afterRenderEffect((onCleanup) => {
      // Dépliage ou repli d'un groupe : la liste change de taille, l'indicateur se remesure sans glisser.
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.place(untracked(() => this.activeItem()), true));
      observer?.observe(this.host.nativeElement);
      onCleanup(() => observer?.disconnect());
    });
  }

  /** Appelé par chaque `lcNavItem` de la liste quand son état actif change. */
  register(item: HTMLElement, active: boolean): void {
    if (active) this.activeItem.set(item);
    else if (this.activeItem() === item) this.activeItem.set(null);
  }

  /** Place l'indicateur sous `item` ; masqué sans élément visible. Sans glissement si `instant`, à la réapparition ou pour le même élément. */
  private place(item: HTMLElement | null, instant: boolean): void {
    const indicator = this.indicator().nativeElement;
    const box = item?.getBoundingClientRect();
    // Un groupe replié est `inert` dès le début du repli animé, alors que ses éléments gardent une taille tant qu'il se referme.
    const visible = !!box && (box.width > 0 || box.height > 0) && !item?.closest('[inert]');
    const wasHidden = indicator.classList.contains('lc-nav-list__indicator--hidden');
    indicator.classList.toggle('lc-nav-list__indicator--hidden', !visible);
    if (visible) {
      const host = this.host.nativeElement;
      // shortcut: écriture directe dans le DOM, car l'ordre classe `--instant` / position doit être synchrone dans ce rappel ; à lever si l'on passe aux liaisons de signaux.
      indicator.classList.toggle('lc-nav-list__indicator--instant', instant || wasHidden || item === this.placedItem);
      // `scrollTop` : la position est relative au contenu de la liste, qui peut défiler. Bord fixe de la boîte : bas de la liste (`scrollHeight` compterait l'indicateur lui-même).
      const start = box.top - host.getBoundingClientRect().top + host.scrollTop;
      lcPlaceIndicator(indicator, 'y', start, start + box.height, Math.max(start + box.height, host.clientHeight + host.scrollTop));
    }
    this.placedItem = visible ? item : null;
    this.ready.set(true);
  }
}
