import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, booleanAttribute, computed, effect, inject, input, untracked } from '@angular/core';
import { IsActiveMatchOptions, Router, RouterLink, isActive as isUrlActive } from '@angular/router';
import { LcIconComponent, LcNavRegistry } from '@lionelcointot/ui-angular';
import { LcNavListComponent } from './nav-list.component';

/**
 * Élément de navigation : `<a lcNavItem routerLink="/credit" icon="landmark">Crédit</a>`.
 * L'élément actif reçoit la classe `lc-nav-item--active` et `aria-current` (`ariaCurrentWhenActive`, `"page"` par défaut). Par défaut l'URL décide
 * (`routerLinkActiveOptions`, mêmes types qu'Angular, par exemple `{ exact: true }` ; `null` : jamais actif) ; `[active]` défini
 * (vrai ou faux) devient la seule source et l'URL est ignorée.
 */
@Component({
  selector: 'a[lcNavItem]',
  imports: [LcIconComponent],
  template: `
    @if (icon()) {
      <lc-icon class="lc-nav-item__icon" [name]="icon()!" />
    }
    <span class="lc-nav-item__label"><ng-content /></span>
    @if (badge()) {
      <span class="lc-nav-item__badge">{{ badge() }}</span>
    }
  `,
  styleUrl: './nav-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-nav-item',
    '[class.lc-nav-item--active]': 'isActive()',
    '[attr.aria-current]': 'isActive() ? ariaCurrentWhenActive() : null',
    '[class.lc-nav-item--indicated]': '!!list',
    '[class.lc-nav-item--collapsed]': 'list?.collapsed()',
    '[attr.title]': 'list?.collapsed() ? label() : null',
  },
})
export class LcNavItemComponent {
  protected readonly list = inject(LcNavListComponent, { optional: true });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly icon = input<string>();
  readonly badge = input<string>();
  /** Rubrique principale : affichée dans la barre d'onglets de `lc-app-shell` (au plus 4). */
  readonly primary = input(false, { transform: booleanAttribute });
  /** Entrée active choisie par l'application (par exemple selon le contexte) ; non définie : l'URL décide. */
  readonly active = input<boolean | undefined>();

  /** Valeur d'`aria-current` quand l'entrée est active (`'true'` pour une section dont on est sur une sous-page) ; même sens que `RouterLinkActive`. */
  readonly ariaCurrentWhenActive = input<'page' | 'location' | 'true'>('page');

  /** Même sens que `RouterLinkActive` : `{ exact: true }`, options de correspondance complètes, ou `null` (jamais actif par l'URL). */
  readonly routerLinkActiveOptions = input<{ exact: boolean } | IsActiveMatchOptions | null>({ exact: false });

  private readonly router = inject(Router);
  private readonly link = inject(RouterLink, { optional: true, self: true });
  // Aucun `RouterLinkActive` : il écrit lui-même `aria-current` (et le retire), ce qui doublerait la source de l'hôte.
  // Mêmes noms que les entrées de `RouterLink` qui changent l'adresse : Angular lie aussi ces entrées à ce composant, ce qui relance le calcul.
  // Les autres entrées de `RouterLink` (`relativeTo`, `queryParamsHandling`…) ne sont prises en compte qu'à la navigation suivante.
  readonly routerLink = input<unknown>();
  readonly queryParams = input<unknown>();
  readonly fragment = input<unknown>();

  /** Adresse du lien, relue à chaque appel (un lien relatif change avec la navigation) ; lue dans un contexte réactif, elle suit les entrées ci-dessus. */
  private currentTree() {
    this.routerLink();
    this.queryParams();
    this.fragment();
    return this.link?.urlTree;
  }

  private readonly routeActive = computed(() => {
    const options = this.routerLinkActiveOptions();
    const tree = this.currentTree();
    if (!options || !tree) return false;
    const match: Partial<IsActiveMatchOptions> =
      'exact' in options
        ? { paths: options.exact ? 'exact' : 'subset', queryParams: options.exact ? 'exact' : 'subset', matrixParams: 'ignored', fragment: 'ignored' }
        : options;
    return isUrlActive(tree, this.router, match)();
  });
  protected readonly isActive = computed(() => this.active() ?? this.routeActive());

  constructor() {
    const element = this.element.nativeElement;
    const destroyRef = inject(DestroyRef);

    // Inscription au registre de navigation.
    // shortcut: le libellé n'est relu que quand l'adresse, `icon` ou `primary` changent, pas quand le texte projeté change seul ;
    // à lever si un libellé dynamique projeté est utilisé dans la barre d'onglets (lire le texte via un MutationObserver).
    const registry = inject(LcNavRegistry);
    afterRenderEffect(() => {
      const tree = this.currentTree();
      registry.register(element, { url: tree ? this.router.serializeUrl(tree) : '', label: this.label(), icon: this.icon(), primary: this.primary() });
    });
    destroyRef.onDestroy(() => registry.unregister(element));

    // Dans une liste, le fond actif est porté par son indicateur glissant.
    const list = this.list;
    if (!list) return;
    effect(() => {
      const active = this.isActive();
      // `register` lit le signal de la liste : sans `untracked`, l'effet suivrait aussi l'entrée active des autres.
      untracked(() => list.register(element, active));
    });
    destroyRef.onDestroy(() => list.register(element, false));
  }

  /** Texte du libellé (info-bulle et nom accessible en mode réduit). */
  protected label(): string {
    return this.element.nativeElement.querySelector('.lc-nav-item__label')?.textContent?.trim() ?? '';
  }
}
