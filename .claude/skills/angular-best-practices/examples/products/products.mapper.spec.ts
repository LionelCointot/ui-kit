// features/products/data-access/products.mapper.spec.ts
// Fonctions pures : pas de TestBed, pas de mock.
import { describe, expect, it } from 'vitest';

import { ProductDto } from '../../../core/api/api-client';
import { toCreateProductRequest, toProduct } from './products.mapper';

const dto: ProductDto = {
  id: 'p-1',
  name: 'Clavier',
  unitPrice: 49.9,
  createdAt: '2026-01-10T00:00:00Z',
};

describe('toProduct', () => {
  it('marque comme nouveau un produit créé il y a moins de 30 jours', () => {
    const product = toProduct(dto, new Date('2026-01-20T00:00:00Z'));
    expect(product.isNew).toBe(true);
    expect(product.createdAt).toEqual(new Date('2026-01-10T00:00:00Z'));
  });

  it('ne marque pas comme nouveau un produit créé il y a plus de 30 jours', () => {
    const product = toProduct(dto, new Date('2026-03-01T00:00:00Z'));
    expect(product.isNew).toBe(false);
  });
});

describe('toCreateProductRequest', () => {
  it('supprime les espaces autour du nom', () => {
    expect(toCreateProductRequest({ name: '  Souris ', unitPrice: 19 })).toEqual({
      name: 'Souris',
      unitPrice: 19,
    });
  });
});
