let nextId = 0;

/** Identifiant DOM unique (`lc-<prefix>-<n>`), pour relier libellés, descriptions et panneaux. */
export function lcUniqueId(prefix: string): string {
  nextId += 1;
  return `lc-${prefix}-${nextId}`;
}
