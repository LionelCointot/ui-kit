# Spec : tableau de données filtrable par colonne (`lc-data-table`)

- **Statut** : En revue
- **Auteur** : senior-developer (traduction de la maquette validée)
- **Date** : 2026-11-17
- **ADR liés** : ADR-0002 (comportement : CDK), ADR-0004 (2 000 lignes sans virtualisation)

## 1. Contexte et problème
Les applications (premier consommateur : la file des demandes de copro-ticket) ont besoin d'un tableau filtrable colonne par colonne, sur ordinateur et sur téléphone. Aujourd'hui chaque application devrait recoder menus, pastilles, panneau et cartes. La maquette `copro-ticket/docs/design/explorations/2026-11-filtres-tableau/` a été validée par l'utilisateur ; cette spec la traduit en composant générique du kit.

## 2. Objectifs
- Un composant `lc-data-table` : l'application déclare ses colonnes, fournit une source (tableau local ou fonctions serveur) et reçoit la requête (`[(query)]`) pour la reporter dans son adresse.
- Toute la logique de rendu dans le kit : en-têtes avec tri et entonnoir, menus de filtre, ligne de résumé, pastilles, cartes sous 768 px, panneau plein écran du téléphone, annonces.

## 3. Hors périmètre (non-objectifs)
- Onglets de vues enregistrées ; pagination ; regroupement et totaux (restent dans `lc-table`).
- Sérialisation de la requête dans l'adresse (faite par l'application).
- Colonne « Voir la demande » sur ordinateur : l'application met le lien dans une cellule (gabarit) ou une colonne `cardOnly`.

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : développeur d'une application consommatrice ; utilisateur final : personnel qui trie une file de lignes (confirmé par la maquette validée).

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Gestionnaire (ordinateur) | Filtre une colonne par son entonnoir | Menu ancré, tableau filtré à « Appliquer » |
| Gestionnaire (téléphone) | Ouvre « Filtres (N) », règle plusieurs colonnes | Rien ne change avant « Afficher N … » |
| Développeur | Branche une API serveur | Fournit `rows` et `distinct`, reçoit `queryChange` |

## 5. Solution proposée
### 5.1 Vue d'ensemble
Point d'entrée `data`, dossier `data/src/data-table/` : `data-table-model.ts` (types et fonctions pures : filtrage local, valeurs distinctes, tri), `column-filter.component.ts` (corps d'un filtre, commun au menu et au panneau), `data-table.component.ts`. Nouveau composant plutôt qu'extension de `lc-table` : les en-têtes, le mode cartes et la source asynchrone changeraient trop `lc-table` ; on réutilise `LcCellDirective`, `LcSort`, `nextSort`, `sortRows`, `columnAlign` et les styles natifs du kit (`lc-checkbox`, `lc-radio`, `lc-input`, `lc-select`, `lcButton`). Menu : CDK Overlay (non modal, `cdkTrapFocus`). Panneau du téléphone : `<dialog>` natif modal. Annonces : `LiveAnnouncer` du CDK. Info-bulles : `lcTooltip` (nouvelle exception d'import `data` → `overlay`).

### 5.2 Modèle de données
```ts
type LcFilterValue = readonly string[] | string | LcDateRange;      // multi | text, single | dateRange
interface LcDateRange { preset?: number; from?: string; to?: string } // dates ISO AAAA-MM-JJ, incluses
interface LcTableQuery { filters: Readonly<Record<string, LcFilterValue>>; sort: LcSort | null }
```
Un filtre vide (liste vide, texte blanc, période sans borne) est retiré de `filters`.

### 5.3 API publique
```ts
<lc-data-table [source]="source" [columns]="colonnes" [trackBy]="fn" caption="…" [(query)]="query"
  [chips]="'auto'" [captionHidden]="true" emptyMessage="…" (queryChange)="…">
  <ng-template lcCell="etat" let-row>…</ng-template>
</lc-data-table>

interface LcDataColumn<T> {
  key: string; label: string;
  value?: (row: T) => unknown;            // texte par défaut, tri et filtres locaux
  format?: LcValueFormat; align?: 'start' | 'center' | 'end';
  width?: string; minWidth?: string;      // la colonne sans width prend le reste ; sous la somme, défilement dans la carte
  cardOnly?: boolean; sortable?: boolean; chipLabel?: string;
  filter?: LcColumnFilter<T>;
}
type LcColumnFilter<T> =
  | { type: 'multi'; format?: (v: string) => string; icon?: (v: string) => string | null; order?: readonly string[] }
  | { type: 'dateRange'; presets?: readonly number[] }                 // défaut [7, 30]
  | { type: 'text'; label: string; hint?: string }
  | { type: 'single'; options: readonly { value: string; label: string; match?: (row: T) => boolean }[] };
interface LcDataSource<T> {
  rows(q: LcTableQuery): Observable<LcPage<T>>;                         // LcPage = { rows; total (sans filtre) }
  distinct(column: string, q: LcTableQuery): Observable<readonly LcDistinctValue[]>; // { value; label?; count }
}
source: LcDataSource<T> | readonly T[]
chips: 'auto' | 'always' | 'never'
```
`(queryChange)` est émis à chaque Appliquer, Effacer, retrait de pastille, Tout effacer, application du panneau et tri. `distinct` reçoit la requête **sans** le filtre de sa colonne. Données locales : le kit filtre (texte sans accents ni casse, inclusion), compte les valeurs distinctes et trie (`compareValues`). Libellés : `LC_LABELS.dataTable` (« résultat(s) » par défaut ; l'application peut dire « demandes »).

### 5.4 Interface utilisateur
Direction : maquette validée (configurations a à j, notes comprises), avec la décision de l'utilisateur d'un **espacement net** (`space-3`) entre le libellé (et son icône de tri) et l'entonnoir. En-tête : seul le texte du libellé passe à la ligne, tri et entonnoir restent sur sa dernière ligne, cellules alignées en bas (entonnoirs à la même hauteur). Entonnoir plein sur fond `primary` quand le filtre est actif, libellé plus contrasté. Ordinateur : ligne « N … sur total · Effacer les filtres » si un filtre est actif. Sous 768 px : cartes (chaque valeur précédée de son libellé), bouton « Filtres (N) », liste de tri, pastilles (`chips='auto'`), panneau plein écran avec un dépliant par colonne filtrable. États : chargement (squelette), erreur (alerte + Réessayer), vide, aucun résultat (« Effacer les filtres »).

## 6. Cas limites et gestion des erreurs
- Valeur cochée tombée à 0 : reste listée (compte 0) pour pouvoir la décocher.
- Aucune valeur disponible : message, « Appliquer » désactivé, « Effacer » actif si un filtre existe.
- Erreur de `distinct` : alerte, rappel que le filtre appliqué reste, « Réessayer » qui reçoit le focus.
- Erreur de `rows` : alerte dans le tableau et « Réessayer ».
- Fin de période avant le début : message relié au champ, application refusée, focus sur « Du ».
- Requêtes concurrentes : la dernière gagne (`switchMap` via `rxResource`).

## 7. Sécurité, performance, observabilité
- Sécurité : aucun `innerHTML` ; textes de l'application interpolés.
- Performance : filtrage local en mémoire, limité comme `lc-table` (2 000 lignes affichées, ADR-0004).
- Logs : aucun.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Étendre `lc-table` | Un seul composant | En-têtes, cartes et source asynchrone : risque de casser ses 400 lignes de tests | Non |
| `lc-data-table` qui réutilise les briques de `lc-table` | Aucun changement cassant | Deux tableaux à documenter | Oui |
| Liste des valeurs fournie par l'application | Plus simple | Refusé par l'utilisateur | Non |

## 9. Plan de test (écrit par la QA)
- Unitaires (`data-table-model`) : filtrage par type, période et raccourcis (horloge simulée), valeurs distinctes hors filtre de la colonne, ordre, valeur cochée à 0.
- Composant : source simulée (`of`, `throwError`, délai), émissions de `queryChange`, clavier, focus, annonces.
- Storybook : stories à 360 et 1 280 px, clair et sombre ; contrôle a11y.

## 10. Critères d'acceptation
- [ ] CA-1 : Chaque colonne avec `filter` porte un bouton entonnoir nommé « Filtrer la colonne X », complété quand le filtre est actif (« (2 valeurs choisies) » pour un filtre multiple, « (résumé) » sinon), `aria-haspopup="dialog"` et `aria-expanded`.
- [ ] CA-2 : Le libellé passe à la ligne seul ; tri et entonnoir restent sur sa dernière ligne, séparés du texte par `space-3` ; tous les entonnoirs d'un en-tête sont à la même hauteur.
- [ ] CA-3 : Entonnoir plein (forme et fond) quand le filtre de la colonne est actif.
- [ ] CA-4 : `width` fixe la colonne ; la colonne sans `width` prend le reste sans descendre sous `minWidth` ; en dessous, la zone du tableau défile horizontalement, jamais la page.
- [ ] CA-5 : À l'ouverture d'un filtre `multi`, `distinct(colonne, requête sans cette colonne)` est appelé (local : calcul du kit) ; pendant le chargement, squelette, `aria-busy`, « Appliquer » désactivé et annonce « Chargement des valeurs de X ».
- [ ] CA-6 : Valeurs chargées : case et nombre par valeur, annonce « N valeurs disponibles » ; recherche au-delà de 8 valeurs ; « Tout sélectionner » (état mixte) agit sur les valeurs visibles et devient « Sélectionner les N résultats » pendant une recherche ; une valeur cochée à 0 reste.
- [ ] CA-7 : Erreur de `distinct` : alerte, focus sur « Réessayer », qui relance l'appel.
- [ ] CA-8 : Filtre `dateRange` : raccourcis (défaut 7 et 30 jours) et « Période choisie » ; un raccourci remplit Du et Au, modifier une date repasse sur « Période choisie » ; fin avant début refusée avec message relié (`aria-describedby`, `aria-invalid`).
- [ ] CA-9 : Filtre `text` : focus sur le champ à l'ouverture, Entrée applique ; local : sans accents ni casse.
- [ ] CA-10 : Filtre `single` : groupe de boutons radio ; local : `match` de l'option, sinon égalité de valeur.
- [ ] CA-11 : Menu : Échap ferme sans appliquer et rend le focus à l'entonnoir ; un clic extérieur ferme sans appliquer ; la liste de cases est un seul arrêt de tabulation ; Tab reste dans le menu ; flèches haut et bas, Début et Fin dans la liste de cases ; « Appliquer » ferme, rend le focus, émet `queryChange` et annonce « Filtre X appliqué. N résultats. ».
- [ ] CA-12 : Ordinateur : ligne « N … sur total » et « Effacer les filtres » seulement si un filtre est actif ; « Effacer les filtres » vide les filtres, émet, met le focus sur le premier entonnoir et annonce le nombre.
- [ ] CA-13 : `chips='auto'` : pastilles seulement sous 768 px ; `'always'` : aussi sur ordinateur (à la place de la ligne de résumé) ; `'never'` : jamais. Pastille = « Modifier le filtre X : résumé » (rouvre le panneau sur sa colonne, ou le menu sur ordinateur) + « Retirer le filtre X » (focus à la pastille suivante, sinon au bouton « Filtres »).
- [ ] CA-14 : Sous 768 px : cartes (première colonne en titre, chaque autre valeur précédée de son libellé), colonnes `cardOnly` visibles seulement en cartes, bouton « Filtres (N) » (nom « Filtres, N actifs »), liste de tri.
- [ ] CA-15 : Panneau : dialogue modal plein écran, un dépliant (`aria-expanded`) par colonne filtrable avec résumé du choix ; mêmes corps que le menu ; rien n'est appliqué avant « Afficher N … », dont le nombre suit les choix et est annoncé ; Échap ou « Fermer sans appliquer » rendent le focus au bouton « Filtres ».
- [ ] CA-16 : Tri : bouton dans l'en-tête, `aria-sort`, cycle croissant, décroissant, aucun ; émet `queryChange`.
- [ ] CA-17 : Aucun résultat avec filtres : en-têtes conservés, état vide « Aucun résultat ne correspond à ces filtres » et « Effacer les filtres » ; erreur de `rows` : alerte et « Réessayer ».
- [ ] CA-18 : Légende cachée du tableau : nombre de lignes et filtres actifs.
- [ ] CA-19 : Stories Storybook des configurations de la maquette (local, source simulée avec délai et erreur), sans violation a11y, à 360 et 1 280 px, clair et sombre.

## 11. Découpage en tâches
- [ ] T1 : modèle, composant, libellés, icônes `funnel`, `funnel-x`, `search-x`, stories (L, CA-1 à CA-19).
- [ ] T2 : tests (QA).

## 12. Risques et questions ouvertes
- Exception d'import `data` → `overlay` (info-bulle des entonnoirs) : à confirmer.
- Le panneau du téléphone compte « Afficher N … » en appelant `rows` avec la requête en brouillon : un appel serveur par changement ; une fonction `count` dédiée serait plus légère.
- Mots du domaine (« demandes ») : passent par `LC_LABELS.dataTable`, pas par une entrée du composant.
- Aide à la sérialisation de la requête dans l'adresse : à fournir par le kit si un deuxième consommateur en a besoin.

## 13. Écarts constatés à l'implémentation (T1)
- En-tête : le début du libellé est hors du bouton de tri (un bouton ne se coupe pas sur deux lignes) ; il trie aussi au clic, le bouton porte le nom complet (`aria-label`). Le dernier mot, l'icône de tri et l'entonnoir ne se séparent jamais.
- Avec l'espacement net de `space-3`, un libellé d'un seul long mot demande une colonne un peu plus large que dans la maquette (« Copropriété » : 8 rem au lieu de 7,25) ; sinon l'entonnoir déborde sur la colonne voisine.
- Libellés génériques (« résultats », « Rechercher une valeur », « ordre croissant ») au lieu de « demandes », « Rechercher une copropriété », « la plus récente d'abord » : l'application les remplace par `LC_LABELS.dataTable`.
- Fin de période avant le début : « Appliquer » est désactivé tant que le message est affiché (au lieu d'un refus au clic).
- Nom de l'entonnoir d'un filtre multiple : « (2 valeurs choisies) » (consigne de la tâche) ; les autres types gardent leur résumé ; l'info-bulle donne les valeurs.
- 2026-11-22, B10 : les jetons de `lc-data-table` passent au jeu de `lc-table` : `--lc-table-radius`, `--lc-table-background`, `--lc-table-cell-padding-inline`, `--lc-table-header-background` (les `--lc-data-table-*` correspondants n'existent plus ; `--lc-data-table-min-width` reste). Rayon par défaut : `md` pour les deux tableaux (`lg` n'était validé ni par `DESIGN.md` ni par une spec : il datait du 2026-11-17, `md` du 2026-11-08 ; le `md` du kit est la valeur de référence). Le remplissage horizontal garde le défaut propre à chaque composant. Aides communes (`cellClass`, `ariaSort`, `sortIcon`, `cellText`, `sortDirection`) dans `table/table-shared.ts` (hors API publique) ; icône de tri unique : `arrow-up-down`, `arrow-up`, `arrow-down`.
