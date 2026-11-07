// features/products/pages/products-page.component.ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { Product } from '../data-access/products.mapper';
import { ProductsStore } from '../state/products.store';
import { ProductListComponent } from '../ui/product-list.component';

/**
 * Conteneur routé : branche le store sur les composants de présentation.
 * Pas de logique métier, pas d'appel HTTP, pas de calcul dans le template.
 */
@Component({
  selector: 'app-products-page',
  imports: [ProductListComponent],
  providers: [ProductsStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Produits</h1>

    <label for="product-search">Rechercher un produit</label>
    <input
      id="product-search"
      type="search"
      [value]="store.query()"
      (input)="store.setQuery($any($event.target).value)"
    />

    @if (store.isLoading()) {
      <p role="status">Chargement…</p>
    } @else if (store.loadError()) {
      <p role="alert">{{ store.loadError() }}</p>
      <button type="button" (click)="store.retry()">Réessayer</button>
    } @else if (store.isEmpty()) {
      <p>Aucun produit ne correspond à « {{ store.query() }} ».</p>
    } @else {
      <app-product-list [products]="store.products()" (selected)="open($event)" />
    }
  `,
})
export class ProductsPageComponent {
  protected readonly store = inject(ProductsStore);
  private readonly router = inject(Router);

  protected open(product: Product): void {
    void this.router.navigate(['/products', product.id]);
  }
}
