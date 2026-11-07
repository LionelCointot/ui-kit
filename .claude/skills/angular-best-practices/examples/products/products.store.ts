// features/products/state/products.store.ts
import { Injectable, computed, inject, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';

import { ProductsClient } from '../../../core/api/api-client'; // client généré depuis l'OpenAPI du back
import { NewProduct, toCreateProductRequest, toProduct } from '../data-access/products.mapper';

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 20;

/**
 * État de la page Produits.
 * Fourni dans `providers` de la route/page : un état neuf à chaque visite.
 * Les composants lisent des signaux en lecture seule et appellent des méthodes : jamais de `.set()` depuis l'extérieur.
 */
@Injectable()
export class ProductsStore {
  private readonly api = inject(ProductsClient);

  // --- État privé (écriture) ---
  private readonly _query = signal('');
  private readonly _saveError = signal<string | null>(null);

  // --- Flux d'événements : RxJS seulement pour le debounce ---
  private readonly debouncedQuery = toSignal(
    toObservable(this._query).pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged()),
    { initialValue: '' },
  );

  // --- Données serveur : le resource gère chargement, erreur, annulation des requêtes obsolètes ---
  private readonly searchResource = rxResource({
    params: () => ({ query: this.debouncedQuery() }),
    stream: ({ params }) => this.api.search(params.query || undefined, PAGE_SIZE, undefined),
  });

  // --- Lecture publique ---
  readonly query = this._query.asReadonly();
  readonly saveError = this._saveError.asReadonly();
  readonly isLoading = this.searchResource.isLoading;

  readonly products = computed(() => {
    if (!this.searchResource.hasValue()) return [];
    const today = new Date();
    return this.searchResource.value().items.map((dto) => toProduct(dto, today));
  });

  readonly loadError = computed(() =>
    this.searchResource.error() ? 'Impossible de charger les produits. Réessayez dans un instant.' : null,
  );

  readonly isEmpty = computed(() => !this.isLoading() && !this.loadError() && this.products().length === 0);

  // --- Actions ---
  setQuery(query: string): void {
    this._query.set(query.trim());
  }

  retry(): void {
    this.searchResource.reload();
  }

  async create(product: NewProduct): Promise<boolean> {
    this._saveError.set(null);
    try {
      await firstValueFrom(this.api.create(toCreateProductRequest(product)));
      this.searchResource.reload();
      return true;
    } catch {
      // Le détail technique est journalisé par l'intercepteur d'erreurs ; ici, le message utilisateur.
      this._saveError.set("Le produit n'a pas pu être enregistré.");
      return false;
    }
  }
}
