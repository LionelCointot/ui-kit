/** Nombre de pages pour `total` éléments (toujours au moins une page, même vide). */
export function lcPageCount(total: number, pageSize: number): number {
  assertPageSize(pageSize);
  return Math.max(1, Math.ceil(Math.max(0, total) / pageSize));
}

/**
 * Éléments d'une page (1 = première). Une page hors bornes est recadrée : 0 ou négative donne la première page,
 * au-delà de la dernière donne la dernière. Une liste vide donne une liste vide.
 * @throws RangeError si `pageSize` n'est pas un entier supérieur ou égal à 1.
 */
export function lcPageSlice<T>(items: readonly T[], page: number, pageSize: number): readonly T[] {
  const count = lcPageCount(items.length, pageSize);
  const current = Number.isFinite(page) ? Math.min(count, Math.max(1, Math.trunc(page))) : 1;
  return items.slice((current - 1) * pageSize, current * pageSize);
}

function assertPageSize(pageSize: number): void {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError(`La taille de page doit être un entier supérieur ou égal à 1 (reçu : ${pageSize}).`);
  }
}
