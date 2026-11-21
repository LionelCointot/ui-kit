import { ChangeDetectionStrategy, Component, ElementRef, afterRenderEffect, booleanAttribute, inject, input, signal, viewChild } from '@angular/core';

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
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    // Changement d'élément actif : l'indicateur glisse. Bascule `collapsed` : nouvelle mesure sans glissement.
    afterRenderEffect(() => {
      this.activeItem();
      this.place(false);
    });
    afterRenderEffect(() => {
      this.collapsed();
      this.place(true);
    });
    afterRenderEffect((onCleanup) => {
      // Dépliage ou repli d'un groupe : la liste change de taille, l'indicateur se remesure sans glisser.
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.place(true));
      observer?.observe(this.host.nativeElement);
      onCleanup(() => observer?.disconnect());
    });
  }

  /** Appelé par chaque `lcNavItem` de la liste quand son état actif change. */
  register(item: HTMLElement, active: boolean): void {
    if (active) this.activeItem.set(item);
    else if (this.activeItem() === item) this.activeItem.set(null);
  }

  /** Place l'indicateur sous l'élément actif ; masqué sans élément actif visible. `instant` coupe le glissement. */
  private place(instant: boolean): void {
    const indicator = this.indicator().nativeElement;
    const item = this.activeItem();
    const box = item?.getBoundingClientRect();
    const visible = !!box && (box.width > 0 || box.height > 0);
    const wasHidden = indicator.classList.contains('lc-nav-list__indicator--hidden');
    indicator.classList.toggle('lc-nav-list__indicator--hidden', !visible);
    if (visible) {
      const host = this.host.nativeElement;
      indicator.classList.toggle('lc-nav-list__indicator--instant', instant || wasHidden);
      indicator.style.transform = `translateY(${box.top - host.getBoundingClientRect().top + host.scrollTop}px)`;
      indicator.style.height = `${box.height}px`;
    }
    this.ready.set(true);
  }
}
