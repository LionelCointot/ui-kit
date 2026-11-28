# Spec : squelette automatique des composants de données

- **Statut** : Livrée le 2026-11-28 (fusion dans `main`). Validée le 2026-11-28 par l'utilisateur (« Oui je valide »), avec une demande : voir le squelette de chaque composant avant de coder
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-28
- **ADR liés** : 0012 (à écrire en T0 : règle commune `undefined` / `null` des entrées de données) · [0010 Options groupées](../adr/0010-options-groupees.md) (`loading`, `stale` et l'entrée de données restent à plat)
- **Consommateur** : copro-ticket (tableau de bord gestionnaire, puis toutes ses pages de données)

## 0. Fiche de cadrage

- **Demande, dans les mots de l'utilisateur** : « Petite question est-ce que le squeletton d'un application est directement dzduit de la disposition des elements ? Ainsi automatiquement l'application lorsqu'il se chargerai serai en squeletton sans que le développeur utilisant le framwork ui kit ai a faire quoi que ce soir » ; puis « Mais chaque composant de ui lit ne pourrait pas ilolementer un skeletton ? Pendant son chargement? » ; au concept « chaque composant de données porte son squelette » : « Oui ».
- **Besoin en trois phrases** : un développeur qui lie un composant de données à une donnée pas encore arrivée voit un squelette à la forme du composant, sans rien écrire de plus. Une donnée vide (`null` ou liste vide) donne l'état vide, et un rechargement garde les données à l'écran, atténuées. Les conteneurs (cartes, grilles, pages) n'ont rien à faire.
- **Décisions prises pendant le cadrage** (2026-11-28, utilisateur) :
  - D-0 le squelette déduit de la disposition de l'application est abandonné au profit d'un squelette porté par chaque composant (réponse « Oui » au concept, qui répondait à sa deuxième question).
  - D-1 règle commune (concept accepté) : entrée de données `undefined` = squelette ; `null` ou liste vide = état vide ; `[loading]="true"` force le squelette ; `[stale]="true"` = rechargement.
  - D-2 périmètre : « Tous ceux qui ont une entrée de données » ; `ol[lcActivityFeed]` exclu (contenu projeté) ; `lc-data-table` garde son chargement par sa source.
  - D-3 état vide là où il manque : « Aucune donnée » (`LC_LABELS.noData`, remplaçable par `emptyMessage`), tiret « — » pour la mini-courbe.
  - D-4 `stale` ajouté à tous les composants du périmètre.
  - D-5 hors périmètre : stepper, barre d'onglets du bas et champs de formulaire (« Oui, hors périmètre »).
- **Taille** : fonctionnalité
- **Angles ouverts** : architecture (contrat public : types des entrées de données élargis, nouvelles entrées, ADR), écran (formes de squelette). Sécurité et données : fermé (aucune donnée nouvelle, aucun service extérieur).

## 1. Contexte et problème

Inventaire du 2026-11-28 : aucun composant ne distingue `undefined` de `null`. Six ont un squelette, seulement si l'application pose `[loading]` (`lc-kpi-card`, `lc-timeline-bar`, graphiques par `lc-chart-frame`) ou par leur source (`lc-data-table`). Six n'en ont aucun (`lc-table`, `lc-tree-table`, `lc-description-list`, `lc-sparkline`, `lc-message-thread`, `ol[lcActivityFeed]`). Trois n'ont pas d'état vide (`lc-description-list`, `lc-sparkline`, `lc-message-thread`). `stale` n'existe que sur la carte, la frise et les graphiques. Chaque application recopie donc des `@if (chargement)` autour des composants.

## 2. Objectifs

- O1 : une donnée `undefined` affiche le squelette à la forme du composant, sans autre entrée (D-1).
- O2 : `null` ou une liste vide affiche l'état vide, partout, avec un libellé remplaçable (D-1, D-3).
- O3 : `[loading]` force le squelette ; `[stale]` atténue et signale le rechargement ; mêmes noms et même comportement sur les 13 composants (D-1, D-4).

## 3. Hors périmètre (non-objectifs)

- `ol[lcActivityFeed]` (contenu projeté) et `lc-data-table` (chargement par `LcDataSource`, inchangé ; sa forme tableau n'est pas élargie à `undefined`, ses tests existants restent verts).
- Stepper, barre d'onglets, champs de formulaire (`lc-combobox`, `lc-list-editor`, `lc-file-upload`, `lc-message-composer`…) et feedback sans données (`lc-progress-bar`, `lc-alert`, `lc-toast`) (D-5).
- Squelette déduit de la disposition de l'application (D-0, §8).
- Erreur de chargement : reste à l'application (`lc-error-state`).
- Avertissement en développement pour une entrée jamais liée : non retenu (voir §12).

## 4. Utilisateurs et cas d'usage

Le développeur d'une application lie `[data]="rows()"`, où `rows` est un signal initialisé à `undefined` puis rempli par l'API : la page s'affiche aussitôt en squelettes, puis en données. Au rechargement d'un filtre, il passe `[stale]="true"` : les anciennes données restent, atténuées. Une liste vide renvoyée par l'API donne « Aucune donnée » sans code de sa part. La personne qui lit l'écran voit des formes stables et, au lecteur d'écran, un composant « occupé » (`aria-busy`).

## 5. Solution proposée

### 5.1 Vue d'ensemble

Une fonction pure du point d'entrée principal, `lcDataState(data, loading)`, rend `'loading' | 'empty' | 'ready'`. Chaque composant la lit dans un `computed` et choisit son gabarit. Les points d'entrée secondaires importent déjà le principal : aucune dépendance nouvelle entre points d'entrée. Pas de directive (elle ne sait pas choisir le gabarit de l'hôte) ni de classe de base (entrées héritées, catalogue et ng-packagr compliqués). Les graphiques gardent `lc-chart-frame` comme seul rendu du squelette et du vide : chaque graphique lui passe `loading` et `empty` calculés.

### 5.2 Modèle (`src/lib/core/data-state.ts`, exporté)

```ts
export type LcDataState = 'loading' | 'empty' | 'ready';
/** `undefined` ou `loading` : squelette ; `null` ou tableau vide : vide ; sinon : prêt. */
export function lcDataState(data: unknown, loading = false): LcDataState;
```

- « Vide » : `null`, tableau de longueur 0. `0`, `''`, `NaN`, `{}` et `[0]` sont prêts (un chiffre à 0 s'affiche). `loading = true` l'emporte sur tout, `null` compris.
- Un composant peut affiner « vide » en gardant `undefined` → squelette : graphiques (aucune catégorie, aucune série, ou toutes les valeurs `null`, règle existante) ; frise (ni segment ni couloir).
- `data: unknown` accepte tout : un champ mal nommé côté application donne `undefined`, donc un squelette (risque §12).

### 5.3 API par composant (contrat public)

Entrée de données : type élargi à `| null | undefined`. Une entrée `required` le reste (`input.required` force la liaison, pas une valeur définie : `[data]="rows()"` avec `Signal<T[] | undefined>` compile). Dans le composant, les usages internes lisent `data() ?? []` (tri, sélection, regroupement, pied de tableau). Une entrée facultative passe au défaut `undefined`. `emptyMessage` suit la syntaxe existante `input<string>()` ; une chaîne vide retombe sur `noData`.

| # | Composant | Entrée de données | Squelette (forme) | État vide | Rechargement (classe) | Ajouts |
|---|---|---|---|---|---|---|
| 1 | `lc-kpi-card` | `value` et `valueText` (défaut `null` → `undefined`) | celui d'aujourd'hui si les deux valent `undefined` | `value: null` → « — » (inchangé) | existante | — |
| 2 | `lc-timeline-bar` | `segments`, `lanes` | rectangle d'aujourd'hui | texte d'aujourd'hui (`emptyMessage` ou `noData`) | `lc-timeline-bar--stale` (existante) | — |
| 3 | `lc-table` | `data` | en-têtes réels + 3 lignes de squelette (`colspan`) | `@empty` d'aujourd'hui | `lc-table--stale` | `loading`, `stale` |
| 4 | `lc-tree-table` | `data` | en-têtes réels + 3 lignes de squelette | `@empty` d'aujourd'hui | `lc-tree-table--stale` | `loading`, `stale` |
| 5 | `lc-description-list` | `items` | 3 paires terme / valeur en squelette, selon `layout` | `noData` | `lc-description-list--stale` | `loading`, `stale`, `emptyMessage` |
| 6 | `lc-chart` | `options` | rectangle de `lc-chart-frame` | `null` → texte de `lc-chart-frame` | `lc-chart-frame__chart--stale` (existante) | `emptyMessage` relayé au cadre |
| 7-9 | `lc-line-chart`, `lc-area-chart`, `lc-bar-chart` | `data` | idem | idem (règle d'affinage existante) | idem | — |
| 10 | `lc-segmented-bar` | `parts` | idem | idem | idem | — |
| 11 | `lc-sparkline` (sans cadre) | `values` | rectangle à sa hauteur | « — » visible, nom accessible = `ariaLabel` + `noData` | `lc-sparkline--stale` | `loading`, `stale` |
| 12 | `lc-message-thread` | `messages` | 3 bulles alternées en squelette | `noData` | `lc-message-thread--stale` | `loading`, `stale`, `emptyMessage` ; le signal interne de pagination `loading` devient `loadingOlder` |
| 13 | `lc-chart-frame` (cadre partagé de 6 à 10) | reçoit `loading` et `empty` calculés | rectangle d'aujourd'hui | texte d'aujourd'hui | existante | aucun changement d'API ; l'entrée `empty` reste son contrat interne |

- **Rechargement** (révisé le 2026-11-28 par l'utilisateur : « Fine barre animée, texte intact », l'atténuation à 60 % faisait passer le texte secondaire sous 4,5:1) : le contenu garde ses couleurs ; une fine barre de progression indéterminée court en haut du composant (immobile sous mouvement réduit), stylée une fois par une classe commune ; `aria-busy="true"` sur l'hôte (sur le cadre pour les graphiques 6 à 10) ; ignoré pendant le squelette (ni classe ni atténuation). Le fil : `aria-busy` = `loadingOlder() || squelette || stale`.
- **Accessibilité** : `lc-skeleton` reste `aria-hidden` ; l'hôte (ou le cadre) porte `aria-busy="true"` pendant le squelette ; jamais dans l'état vide.
- **Mouvement** : rien de nouveau ; le passage squelette → données réutilise l'entrée existante du composant.

### 5.4 Interface

Pas d'écran nouveau. Les formes reprennent le composant : hauteur du squelette proche de celle d'un rendu de 3 éléments, pour éviter un saut de mise en page à l'arrivée des données (choix par défaut, §12). Chaque composant gagne une story `States` (Chargement par `undefined`, Vide par `null` ou `[]`, Rechargement par `stale`, et un rendu de 3 éléments pour comparaison) ; les stories `Loading` existantes passent à `undefined`. Captures en clair et sombre montrées à l'utilisateur.

## 6. Cas limites et gestion des erreurs

- `loading` vrai et données présentes : squelette (D-1).
- `stale` vrai et donnée `undefined` : squelette, sans classe de rechargement (choix par défaut).
- Données qui passent de valeurs à `undefined`, puis reviennent : squelette, puis données.
- Carte à `0` ou `valueText: ''` : prête, jamais squelette.
- Graphique dont les séries ne contiennent que `null`, ou sans série : état vide ; frise avec `segments: []` mais `lanes` remplis : prête.
- `emptyMessage: ''` : retombe sur `noData`.
- Entrée jamais liée ou mal nommée : squelette permanent (risque accepté, §12).

## 7. Sécurité, performance, observabilité

- **Sécurité et données** : angle fermé (aucune donnée nouvelle, aucun `innerHTML`).
- **Performance** : un `computed` par composant ; 3 lignes de squelette fixes, quel que soit le nombre de colonnes.
- **Observabilité** : sans objet (bibliothèque).

## 8. Alternatives envisagées

- Squelette déduit de la disposition de l'application (balayage du DOM, gabarit généré) : le kit ne connaît pas la forme des données de l'application ; fragile et coûteux. Abandonné (D-0).
- Directive conteneur `*lcLoading` posée par l'application : du code à chaque usage, contraire à la demande. Écartée.
- Classe de base commune aux composants de données : entrées héritées, catalogue et empaquetage compliqués. Écartée au profit d'une fonction pure.

## 9. Plan de test

Une preuve par critère, sans nouvelle suite :
- **`unit`, pur** : `src/lib/core/data-state.spec.ts`, table de cas de `lcDataState` (CA-1), une seule fois.
- **`unit`, DOM, un fichier par point d'entrée** (la règle d'imports interdit un fichier commun) : `data/src/data-states.acceptance.spec.ts` (composants 1 à 5), `charts/src/components/data-states.acceptance.spec.ts` (6 à 11, faux moteur `LC_ECHARTS_ENGINE` et `ResizeObserver` simulé comme `charts.component.spec.ts`), `feedback/src/message-thread/data-states.acceptance.spec.ts` (12). Une table de cas par fichier (`describe.each`), sans aide partagée. Le test de rechargement existant de `charts.component.spec.ts` (l. 147-154) est retiré une fois le nouveau vert.
- **navigateur, suite existante `dom`** (`storybook-browser.mjs dom`) : hauteurs de CA-6 sur les stories `States`.
- **existants** : `axe`, `controls`, `catalogue:check`, `snippets`, `motion` ; specs de `lc-data-table` inchangées.
- **manuel** : captures du §5.4.

## 10. Critères d'acceptation

- [x] CA-1 (O1, O2) : `lcDataState` rend `loading` pour `undefined` et pour toute valeur avec `loading = true` (`null` compris), `empty` pour `null` et `[]`, `ready` pour `0`, `''`, `NaN`, `{}`, `[0]` et un tableau non vide.
- [x] CA-2 (O1) : pour les composants 1 à 12, la donnée `undefined` affiche au moins un `lc-skeleton`, ni le texte `noData` ni « — » ni de cellule, terme ou bulle de donnée, et l'hôte (le cadre pour 6 à 10) porte `aria-busy="true"`.
- [x] CA-3 (O2) : (a) `null` affiche l'état vide : texte `emptyMessage` ou, s'il est absent ou vide, `LC_LABELS.noData` pour 2 à 10 et 12 ; « — » pour 1 et 11 (11 : nom accessible = `ariaLabel` + `noData`) ; (b) `[]` donne le même résultat pour les entrées de liste (2 à 5, 7 à 12) ; (c) graphique aux séries toutes `null` ou sans série : vide ; frise `segments: []` avec `lanes` : prête ; (d) dans l'état vide, aucun `lc-skeleton` ni `aria-busy`.
- [x] CA-4 (O3) : `[loading]="true"` avec une donnée présente affiche le squelette, garde `aria-busy="true"` et ne rend pas la donnée, sur les composants 1 à 12.
- [x] CA-5 (O3) : `[stale]="true"` avec une donnée présente garde la donnée, pose `aria-busy="true"` et la classe de rechargement du §5.3 ; avec `undefined`, c'est le squelette, sans cette classe ; sur les composants 1 à 12. Séquence : valeurs → `undefined` → valeurs (avec `stale` posé en cours) revient au squelette puis aux données.
- [x] CA-6 (O1) : dans la suite `dom`, à 1280 et 360 px, la hauteur du squelette de `lc-table`, `lc-tree-table`, `lc-description-list` et `lc-message-thread` diffère de celle du même composant avec 3 éléments (mêmes colonnes, même `layout`) de moins de 25 % ou de moins de 24 px.
- [x] CA-7 : la carte à `0` et à `valueText: ''` est prête (pas de squelette) ; `lc-message-thread` garde ses tests existants verts après le renommage `loadingOlder`, et la pagination pendant `stale` garde `aria-busy` sans squelette.
- [x] CA-8 : (a) les 12 stories `States` (le cadre `lc-chart-frame` est montré par celles des graphiques) passent `axe` (clair et sombre) et `controls` ; (b) `catalogue:check` vert ; (c) les tests unitaires existants restent verts, les stories et tests qui passaient `[loading]` sont adaptés sans retirer d'assertion (preuve : diff des tests).

## 11. Découpage en tâches

- [x] T0 ADR 0012 (règle commune `undefined` / `null` / `loading` / `stale`), ligne ADR du CLAUDE.md. S.
- [x] T1 `lcDataState`, son type, export public, `data-state.spec.ts` (CA-1). S. Après T0.
- [x] T2 `data` : composants 1 à 5 (CA-2 à CA-5, CA-7 pour la carte). M. Après T1.
- [x] T3 `charts` : composants 6 à 11 et `lc-chart-frame` (CA-2 à CA-5). M. Après T1, en parallèle de T2.
- [x] T4 `feedback` : `lc-message-thread`, renommage `loadingOlder` (CA-2 à CA-5, CA-7 pour le fil). S. Après T1, en parallèle de T2 et T3.
- [x] T5 stories `States`, catalogue, note de migration copro-ticket, captures (CA-6, CA-8). S. Après T2 à T4.

## 12. Risques et questions ouvertes

- **Choix par défaut à confirmer à la validation** :
  - 3 lignes de squelette pour les listes, tableaux et le fil ; hauteur proche d'un rendu de 3 éléments (tolérance de CA-6 : 25 % ou 24 px).
  - `stale` sur une donnée `undefined` : squelette, sans atténuation.
  - Libellé générique `noData` partout (pas de « Aucun message » propre au fil) ; `emptyMessage: ''` retombe sur `noData`.
  - Pas d'avertissement en développement pour une entrée jamais liée (l'architecte proposait tout ou rien ; « rien » est le plus simple).
- **Casse de contrat** (phase de développement, sans alias) : types d'entrées élargis ; défaut de `lc-kpi-card.value` et `valueText` à `undefined` (une carte qui ne lie rien passe du « — » au squelette) ; signal interne du fil renommé ; nouvelles entrées `loading`, `stale`, `emptyMessage`. copro-ticket est corrigé dans la même passe si besoin (note de migration T5).
- **Risque** : une donnée `undefined` par erreur (champ mal nommé) donne un squelette permanent au lieu d'un vide.
- **Questions ouvertes** : aucune.

## 13. Relectures et écarts

- 2026-11-28, `cadreur` (spec) : périmètre fermé et validé (D-5) ; choix par défaut reclassés au §12 ; CA-7 (avertissement) retiré ; O4 (moyen, non besoin) retiré ; composants numérotés ; abandon du squelette déduit de la disposition consigné (D-0).
- 2026-11-28, `architect` : graphiques par `lc-chart-frame` (chaque graphique calcule `loading` et `empty`) ; un test d'acceptation par point d'entrée (règle d'imports) ; `valueText` au même défaut que `value` ; `data() ?? []` dans les composants ; `emptyMessage` à la syntaxe existante ; ADR 0012 ajouté (T0) ; `aria-busy` du fil fusionné.
- 2026-11-28, `qa-engineer` (plan de test) : 13 composants recomptés ; CA-2 à CA-5 rendus mesurables (textes, cellules, `aria-busy`, classes de rechargement nommées, hôte ou cadre) ; CA-6 mesuré dans la suite `dom` existante, à 1280 et 360 px, quatre composants ; cas limites du §6 couverts (séquence, séries `null`, frise, carte à 0, `emptyMessage: ''`) ; test de rechargement des graphiques dédoublonné ; CA-8 éclaté.
- 2026-11-28, `senior-developer` (T5), note de migration copro-ticket (casse franchement, sans alias, ADR 0012) : types des entrées de données élargis à `| null | undefined` ; défaut de `lc-kpi-card.value` et `valueText` passé à `undefined` (une carte qui ne lie rien passe du « — » au squelette) ; défaut `undefined` de `segments` et `lanes` de la frise ; nouvelles entrées `loading`, `stale`, `emptyMessage` selon le §5.3 ; `aria-busy` du fil posé sur l'hôte `lc-message-thread` ; légende des graphiques masquée pendant le chargement ; signal interne `loading` du fil renommé `loadingOlder` ; `lcDataState` exporté du point d'entrée principal. Règle d'usage : lier un signal initialisé à `undefined` (`signal<T[] | undefined>(undefined)`), jamais à `[]`, tant que la donnée n'est pas arrivée ; `[]` ou `null` veut dire « chargé, vide ». Rechargement : fine barre de progression en haut (classe commune `lc-reloading`, en plus des classes du §5.3), contenu intact. Stories retirées : `LoadingAndStale` de la carte, `Stale` et `Empty` de la frise, `Stale` du graphique en courbes, `Empty` des tableaux (`lc-table`, `lc-tree-table`) ; `States` les remplace. Règle de migration : remplacer `[loading]` par une donnée `undefined` quand le composant attend ses données.
- 2026-11-28, `senior-developer` (T5), écarts : les stories `States` existent pour 12 composants (`lc-chart-frame` n'a pas de story propre : elle est montrée par `States` de `lc-chart` et des graphiques) ; la hauteur du squelette du fil (3 lignes à `--lc-sys-space-10`, 200 px) était à 83 px (1280) et 131 px (360) d'un rendu de 3 messages, hors de la tolérance de CA-6 : lignes portées à `--lc-sys-space-12` (224 px contre 283 px) ; CA-6 mesuré par `dom` : 8 mesures vertes.
- 2026-11-28, `senior-developer`, écart à §5.3 (décision de l'utilisateur) : le rechargement n'atténue plus le contenu (axe : `data-description-list--states` 2,87:1, `feedback-message-thread--states` 2,73:1) ; une fine barre indéterminée court en haut (classe commune `lc-reloading`, règle unique dans `styles/ui-angular.css`, immobile et pleine sous mouvement réduit). Jeton `sys.state.stale-opacity` et jetons composant `--lc-*-stale-opacity` retirés (jamais livrés). Audit de simplification : stories `Stale` (`lc-line-chart`) et `Empty` (`lc-table`, `lc-tree-table`) retirées, redondantes avec `States` (aucun id lu par `tools/qa`, `.storybook` ou `docs`).
- Livraison (2026-11-28) : preuves. CA-1 : `src/lib/core/data-state.spec.ts`. CA-2 à CA-5 et CA-7 : `data/src/data-states.acceptance.spec.ts`, `charts/src/components/data-states.acceptance.spec.ts`, `feedback/src/message-thread/data-states.acceptance.spec.ts` (2 669 tests unitaires verts). CA-6 : suite `dom`, 8 mesures (squelette / 3 éléments : tableau 222 / 246 px, tableau en arbre 222 / 276, liste 99 / 123, fil 224 / 283, à 1280 et 360 px). CA-8 : `axe` sur les 12 stories `States` en clair et en sombre, `controls` (64 Playground), `snippets`, `catalogue:check`. Suites navigateur des composants touchés vertes (`thread`, `relief`, `count-flash`, `treegrid`). Seuls KO : `axe-autres`, contrastes préexistants hors périmètre (curseur désactivé, theme-builder) ; `perf` instable (pire de 5 passes > 500 ms), sans régression : 7 lancements alternés `main` / branche donnent la même médiane (≈ 420 ms), le seuil sur la pire passe dépasse aussi sur `main` sous charge (à revoir dans le nettoyage des tests). Captures montrées à l'utilisateur (maquette approuvée, puis stories `States` et barre de rechargement).
- Adaptations de tests (CA-8c) : test de rechargement de `charts.component.spec.ts` retiré (remplacé par l'acceptation, §9) ; tests du développeur dédoublonnés contre l'acceptation ; `timeline-bar.component.spec.ts` lit la classe `lc-reloading` au lieu de l'opacité, et un test CA-21 passe `segments: null` (le défaut est désormais `undefined`).
