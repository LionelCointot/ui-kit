import type { LcNavEntry } from '@lionelcointot/ui-angular';
import { pathOf } from '../page-transitions/page-nav.direction';

/** Nombre maximal d'onglets (« Plus » s'y ajoute). */
export const LC_TABBAR_MAX_TABS = 4;

/** Rubriques `primary` à adresse, sans doublon d'adresse (une même rubrique affichée deux fois), dans l'ordre de l'écran. @internal */
export function lcPrimaryEntries(items: readonly LcNavEntry[]): LcNavEntry[] {
  const seen = new Set<string>();
  return items.filter((item) => item.primary && item.url && !seen.has(item.url) && !!seen.add(item.url));
}

/** Onglets de la barre : les {@link LC_TABBAR_MAX_TABS} premières rubriques principales. @internal */
export const lcTabbarTabs = (items: readonly LcNavEntry[]): LcNavEntry[] => lcPrimaryEntries(items).slice(0, LC_TABBAR_MAX_TABS);

/**
 * Index de l'onglet de la page `current` : le plus spécifique dont le chemin est celui de la page ou l'un de ses parents (`/credit` pour `/credit/nouveau`) ;
 * la racine `/` ne correspond qu'à elle-même. -1 si aucun : « Plus » est alors l'onglet actif. Requête et fragment ignorés.
 * shortcut: `exact` et `[active]` de `a[lcNavItem]` ne sont pas lus (le registre ne les porte pas) ; si un consommateur a besoin d'un `exact`,
 * ajouter `exact?: boolean` à `LcNavEntry` (navigation-registry.ts), le renseigner dans `a[lcNavItem]` et le lire ici.
 * @internal
 */
export function lcActiveTab(tabs: readonly LcNavEntry[], current: string): number {
  const path = pathOf(current).replace(/\/$/, '') || '/';
  let best = -1;
  let bestLength = -1;
  tabs.forEach((tab, index) => {
    const section = pathOf(tab.url).replace(/\/$/, '') || '/';
    const matches = section === '/' ? path === '/' : path === section || path.startsWith(section + '/');
    if (matches && section.length > bestLength) [best, bestLength] = [index, section.length];
  });
  return best;
}
