import { Injectable, computed, signal } from '@angular/core';

/** Une rubrique de navigation, telle qu'inscrite par `a[lcNavItem]`. */
export interface LcNavEntry {
  readonly url: string;
  readonly label: string;
  readonly icon: string | undefined;
  /** Rubrique principale (barre d'onglets). */
  readonly primary: boolean;
}

/** Rubriques de navigation de l'application, dans l'ordre du document : chaque `a[lcNavItem]` s'y inscrit, `lc-app-shell` les lit. */
@Injectable({ providedIn: 'root' })
export class LcNavRegistry {
  private readonly entries = signal<ReadonlyMap<Element, LcNavEntry>>(new Map());

  /** Rubriques inscrites, dans l'ordre du DOM. */
  readonly items = computed<readonly LcNavEntry[]>(() =>
    [...this.entries()].sort(([a], [b]) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1)).map(([, entry]) => entry),
  );

  /** Inscrit ou met à jour la rubrique de `element`. @internal Réservé à `a[lcNavItem]`. */
  register(element: Element, entry: LcNavEntry): void {
    this.entries.update((map) => new Map(map).set(element, entry));
  }

  /** Retire la rubrique de `element`. @internal Réservé à `a[lcNavItem]`. */
  unregister(element: Element): void {
    this.entries.update((map) => {
      const next = new Map(map);
      next.delete(element);
      return next;
    });
  }
}
