// features/products/state/products.store.spec.ts
// Le store est testé avec un faux client : aucun appel HTTP réel.
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductDto, ProductsClient } from '../../../core/api/api-client';
import { ProductsStore } from './products.store';

const created: ProductDto = {
  id: 'p-2',
  name: 'Souris',
  unitPrice: 19,
  createdAt: '2026-01-15T10:00:00Z',
};

describe('ProductsStore', () => {
  const api = {
    search: vi.fn(() => of({ items: [], nextCursor: null })),
    create: vi.fn(() => of(created)),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [ProductsStore, { provide: ProductsClient, useValue: api }],
    });
  });

  it('envoie au backend la requête attendue à la création', async () => {
    const store = TestBed.inject(ProductsStore);

    const ok = await store.create({ name: ' Souris ', unitPrice: 19 });

    expect(ok).toBe(true);
    expect(api.create).toHaveBeenCalledWith({ name: 'Souris', unitPrice: 19 });
    expect(store.saveError()).toBeNull();
  });

  it('expose un message utilisateur si la création échoue', async () => {
    api.create.mockReturnValueOnce(throwError(() => new Error('500')));
    const store = TestBed.inject(ProductsStore);

    const ok = await store.create({ name: 'Souris', unitPrice: 19 });

    expect(ok).toBe(false);
    expect(store.saveError()).toBe("Le produit n'a pas pu être enregistré.");
  });

  it('normalise la requête de recherche', () => {
    const store = TestBed.inject(ProductsStore);

    store.setQuery('  clavier  ');

    expect(store.query()).toBe('clavier');
  });
});
