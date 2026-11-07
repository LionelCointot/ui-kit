// features/products/data-access/products.mapper.ts
// Fonctions pures : DTO généré (contrat backend) <-> modèle de vue (ce dont l'écran a besoin).
import { CreateProductRequest, ProductDto } from '../../../core/api/api-client';

const NEW_PRODUCT_MAX_AGE_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly unitPrice: number;
  readonly createdAt: Date;
  readonly isNew: boolean;
}

export type NewProduct = Pick<Product, 'name' | 'unitPrice'>;

export function toProduct(dto: ProductDto, today: Date): Product {
  const createdAt = new Date(dto.createdAt);
  const ageInDays = (today.getTime() - createdAt.getTime()) / MS_PER_DAY;
  return {
    id: dto.id,
    name: dto.name,
    unitPrice: dto.unitPrice,
    createdAt,
    isNew: ageInDays <= NEW_PRODUCT_MAX_AGE_DAYS,
  };
}

export function toCreateProductRequest(product: NewProduct): CreateProductRequest {
  return { name: product.name.trim(), unitPrice: product.unitPrice };
}
