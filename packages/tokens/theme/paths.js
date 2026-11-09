// Correspondance entre un chemin de token `sys` (« color.primary ») et sa variable CSS.

const SYS_PREFIX = '--lc-sys-';

/**
 * « color.primary » → « --lc-sys-color-primary ».
 * @param {string} tokenPath chemin sans le préfixe `sys`
 */
export function cssVarOf(tokenPath) {
  return SYS_PREFIX + tokenPath.replaceAll('.', '-');
}
