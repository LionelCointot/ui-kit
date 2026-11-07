// features/products/ui/product-list.component.ts
import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { Product } from '../data-access/products.mapper';

/**
 * Composant de présentation pur : reçoit des données, émet des événements.
 * Il ne connaît ni le store, ni le routeur, ni l'API, donc il est réutilisable et testable seul.
 */
@Component({
  selector: 'app-product-list',
  imports: [CurrencyPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="product-list">
      @for (product of products(); track product.id) {
        <li>
          <button type="button" (click)="selected.emit(product)">
            <span class="name">{{ product.name }}</span>
            <span class="price">{{ product.unitPrice | currency: 'EUR' }}</span>
            @if (product.isNew) {
              <span class="badge">Nouveau</span>
            }
          </button>
        </li>
      }
    </ul>
  `,
})
export class ProductListComponent {
  readonly products = input.required<readonly Product[]>();
  readonly selected = output<Product>();
}
