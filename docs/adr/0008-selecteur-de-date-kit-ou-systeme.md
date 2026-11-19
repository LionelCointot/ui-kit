# ADR-0008 : Sélecteur de date : calendrier du kit ou sélecteur du système

- **Statut** : Proposée
- **Date** : 2026-11-19
- **Spec** : [`2026-11-selecteur-de-date.md`](../specs/2026-11-selecteur-de-date.md)

## Contexte
`lc-date-input` s'appuie sur `input[type=date]`. Le calendrier que le navigateur déplie ne suit pas le thème du produit et diffère d'un navigateur à l'autre. L'utilisateur demande un calendrier du kit sur ordinateur et le sélecteur du système sur mobile, où il est fait pour le doigt. Il faut une règle unique, la même dans tous les produits, pour décider lequel des deux un champ affiche.

## Options considérées
1. **Selon le pointeur principal** : `matchMedia('(pointer: fine) and (hover: hover)')`. Vrai : calendrier du kit. Faux : champ natif.
2. **Selon la largeur de la fenêtre** (seuil en pixels). Une fenêtre d'ordinateur étroite passerait au sélecteur natif, et une tablette large au calendrier du kit : la largeur ne dit pas si l'on touche l'écran.
3. **Selon l'agent utilisateur** (détection de « mobile »). Fragile, à maintenir, et faux pour les tablettes qui se présentent comme des ordinateurs.
4. **Une entrée par champ** (`picker`). Le choix serait refait dans chaque formulaire, et deux entrées publiques seraient figées (date simple et période) pour une décision qui vaut pour toute une application.

## Décision
Option 1, portée par un jeton d'injection `LC_DATE_PICKER` (`'auto' | 'native' | 'calendar'`, défaut `'auto'`) dans le point d'entrée `forms`.
- En `auto`, la requête est lue **une fois, à la création du champ**, par `document.defaultView.matchMedia` (jamais `window`, comme `LcThemeService`). Absente ou en erreur, elle vaut « faux » : champ natif.
- Une application, Storybook ou un test fournit le jeton pour forcer un mode. Aucune entrée de composant ne le fait.
- Le mode natif garde le rendu et le comportement actuels de `lc-date-input`.

## Conséquences
- Positives :
  - le contrat de `lc-date-input` ne change pas, et les tests des consommateurs, qui tournent sous jsdom (sans `matchMedia`), restent en mode natif sans modification ;
  - téléphone et tablette gardent le sélecteur du système ; une fenêtre d'ordinateur étroite garde le calendrier du kit ;
  - une seule règle, écrite à un seul endroit.
- Négatives :
  - un ordinateur à écran tactile dont le pointeur principal est une souris ou un pavé tactile reçoit le calendrier du kit, même si la personne touche l'écran (cellules de 40 px prévues pour ce cas) ;
  - une souris branchée en cours de session ne change pas le mode d'un champ déjà créé ;
  - deux rendus à tester et à maintenir pour chaque champ de date.
- À revoir si : un produit demande à forcer le mode champ par champ, ou si le calendrier du kit devient assez bon au doigt pour remplacer le sélecteur du système.
