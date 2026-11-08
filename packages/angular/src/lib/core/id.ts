let nextId = 0;

/** Identifiant DOM unique (`lc-<prefix>-<n>`), pour relier libellés, descriptions et panneaux. */
export function lcUniqueId(prefix: string): string {
  nextId += 1;
  return `lc-${prefix}-${nextId}`;
}

/** Concatène des identifiants pour aria-describedby / aria-labelledby (null si aucun). */
export function joinIds(...ids: readonly (string | null | undefined | false)[]): string | null {
  const joined = ids.filter((id): id is string => typeof id === 'string' && id.length > 0).join(' ');
  return joined.length > 0 ? joined : null;
}
