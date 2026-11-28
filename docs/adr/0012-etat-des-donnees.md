# ADR-0012 : État des composants de données (`undefined`, `null`, `loading`, `stale`)

- **Statut** : Acceptée (2026-11-28)
- **Date** : 2026-11-28
- **Spec** : [2026-12-squelette-automatique](../specs/2026-12-squelette-automatique.md)

## Contexte
- L'utilisateur veut qu'une application en cours de chargement s'affiche en squelettes « sans que le développeur […] ait à faire quoi que ce soit ».
- Aujourd'hui aucun composant ne distingue `undefined` de `null` ; le squelette n'apparaît que si l'application pose `[loading]`, et chaque application recopie des `@if (chargement)`.
- Contraintes : contrat public (entrées), pas d'import entre points d'entrée secondaires (CLAUDE.md), ADR-0010 (`loading`, `stale` et l'entrée de données restent à plat).

## Options considérées
- Squelette déduit de la disposition de l'application : le kit ne connaît pas la forme des données ; abandonné au cadrage.
- Directive conteneur posée par l'application : du code à chaque usage, contraire à la demande.
- Classe de base commune : entrées héritées, catalogue et empaquetage compliqués.
- Fonction pure partagée, lue par chaque composant : retenue.

## Décision
1. Règle commune à tous les composants qui ont une entrée de données (liste fermée dans la spec) : entrée `undefined` = squelette ; `null` ou tableau vide = état vide (`LC_LABELS.noData`, remplaçable par `emptyMessage`) ; `[loading]="true"` force le squelette ; `[stale]="true"` garde la donnée, atténuée, avec `aria-busy`.
2. La décision vit dans une seule fonction du point d'entrée principal, `lcDataState(data, loading): 'loading' | 'empty' | 'ready'` ; un composant peut affiner « vide » (graphiques, frise) mais pas « chargement ».
3. Les entrées de données sont typées `T | null | undefined` ; une entrée `required` le reste (liaison obligatoire), une entrée facultative a le défaut `undefined`.
4. Les graphiques gardent `lc-chart-frame` comme seul rendu du squelette et du vide.

## Conséquences
- Une application lie un signal initialisé à `undefined` et n'écrit plus d'état de chargement autour des composants.
- Casse de contrat assumée (phase de développement) : types élargis, défaut de `lc-kpi-card.value` et `valueText` à `undefined`.
- Risque : une donnée `undefined` par erreur (champ mal nommé) donne un squelette permanent au lieu d'un vide.
- Un nouveau composant de données suit la règle en lisant `lcDataState` et en ajoutant sa ligne au test d'acceptation de son point d'entrée.
