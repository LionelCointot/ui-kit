import { Injectable, afterEveryRender, computed, signal, untracked } from '@angular/core';

/** Une rubrique de navigation, telle qu'inscrite par `a[lcNavItem]`. */
export interface LcNavEntry {
  readonly url: string;
  readonly label: string;
  readonly icon: string | undefined;
  /** Rubrique principale (barre d'onglets). */
  readonly primary: boolean;
}

/** Ordre du document : un élément avant l'autre si l'autre le suit. */
const byDocumentOrder = (a: Element, b: Element) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

/** Rubriques de navigation de l'application : chaque `a[lcNavItem]` s'y inscrit, `lc-app-shell` les lit. */
@Injectable({ providedIn: 'root' })
export class LcNavRegistry {
  /** Toujours dans l'ordre du DOM : une inscription trie, et la fin de chaque rendu retrie si un `@for` a déplacé des rubriques. */
  private readonly entries = signal<ReadonlyMap<Element, LcNavEntry>>(new Map());

  /**
   * Rubriques inscrites, dans l'ordre du DOM au dernier rendu (un réordonnancement par `@for` est pris en compte sans réinscription).
   * Limites : le registre est vide au rendu serveur (l'inscription se fait côté navigateur, après le rendu), et avec `navMode='none'`
   * (aucun `a[lcNavItem]` affiché, donc rien à inscrire).
   */
  readonly items = computed<readonly LcNavEntry[]>(() => [...this.entries().values()]);

  constructor() {
    afterEveryRender(() => this.publish(this.entries()));
  }

  /** Inscrit ou met à jour la rubrique de `element`. @internal Réservé à `a[lcNavItem]`. */
  register(element: Element, entry: LcNavEntry): void {
    // `untracked` : appelé depuis un effet de `a[lcNavItem]`, qui ne doit pas suivre les inscriptions des autres rubriques.
    untracked(() => this.publish(new Map(this.entries()).set(element, entry), true));
  }

  /** Retire la rubrique de `element`. @internal Réservé à `a[lcNavItem]`. */
  unregister(element: Element): void {
    untracked(() => {
      const next = new Map(this.entries());
      if (next.delete(element)) this.entries.set(next);
    });
  }

  /** Publie `map` triée ; sans `force`, seulement si l'ordre a changé (évite de réveiller les lecteurs à chaque rendu). */
  private publish(map: ReadonlyMap<Element, LcNavEntry>, force = false): void {
    const before = [...map.keys()];
    const sorted = [...map].sort(([a], [b]) => byDocumentOrder(a, b));
    if (force || sorted.some(([element], index) => element !== before[index])) this.entries.set(new Map(sorted));
  }
}
