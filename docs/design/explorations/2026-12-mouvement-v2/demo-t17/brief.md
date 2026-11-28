# T17 : brief de la page de démonstration du mouvement

Maquettes : `direction-a.html`, `direction-b.html` (statiques, tokens du kit, lisibles à 1280 et 360 px, valeurs d'exemple). Statut : à valider par l'utilisateur avant le code.
Réserve : `PRODUCT.md` n'existe pas ; l'utilisateur principal ci-dessous est une `[hypothèse]` (développeur qui évalue le kit) à confirmer.

## Directions
**A, « Application complète »** : une vraie application dans `lc-app-shell` (barre latérale, barre d'onglets sous 760 px), trois rubriques et un détail de niveau 2. Prouve que tout s'anime sans code applicatif. Limite : les surfaces (fenêtre, tiroir, feuille) ne s'y montrent que si on les place dans les rubriques.
**B, « Visite par famille de mouvement »** : rubriques Entrée de page, Surfaces, Indicateurs, bouton « Rejouer ». Plus complète en composants, mais ressemble à un catalogue, pas à une page réelle, et ne prouve pas l'automatisme.

## Recommandation : A, avec les surfaces de B placées dans A
Demande de l'utilisateur : « une page comme sa page » avec boutons de navigation. A est l'application ; les surfaces s'y logent naturellement (détail dans la liste, fenêtre de confirmation à la suppression, menu dans l'en-tête, toast aux réglages). B reste utile comme page Foundations/Motion (T16), pas ici.

## Story
`Vitrine/Démonstration du mouvement`, fichier unique `*.stories.ts` (anglais pour le titre et la JSDoc, français pour le contenu). Story `Playground`-less : exemple figé (`fixedExample`), avec bouton « Rejouer » (`replayable()`) et `<lc-story-motion-notice />`. Composants de démo locaux dans le fichier.

## Rubriques (nom : mouvements dans l'ordre des couches)
Navigation : barre latérale ; barre d'onglets en bas sous 760 px avec 3 rubriques « principales » (Tableau de bord, Liste, Réglages).
1. **Tableau de bord** : titre lettre par lettre, trait (0 ms) ; 4 `lc-kpi-card` (100 ms, compteur, inclinaison au survol) ; `lc-card` en cascade dans `lc-grid` (120 ms, 60 ms entre cartes) ; `lc-activity-feed` (400 ms) ; `lc-progress-bar` x3 (500 ms) ; `lc-chart` barres (500 ms, depuis les tokens) ; points d'état (800 ms).
2. **Liste** : `lc-segmented-control` (pastille qui glisse) pour filtrer ; `lc-data-table` : lignes en cascade (400 ms, 40 ms entre lignes) ; tri ; suppression d'une ligne avec `lc-dialog` de confirmation (origine du déclencheur) ; filtre et suppression sans délai de couche. Un clic sur une ligne ouvre le détail.
3. **Détail (niveau 2)** : arrive par la droite, la liste recule en parallaxe (500 ms) ; bouton retour libellé « Liste » ; retour au geste depuis le bord gauche sur téléphone ; `lc-description-list` et `lc-card` en cascade.
4. **Réglages** : `lc-tabs` (indicateur, cascade à la première ouverture seulement) ; champs ; `lc-switch` ; `lc-disclosure` (hauteur) ; « Enregistrer » affiche un `lc-toast` ; `lc-theme-toggle` dans l'en-tête (révélation circulaire).
Entre rubriques de même niveau sur ordinateur : glissement selon l'ordre du menu (sortie 190 ms, entrée 700 ms).

## Données génériques
Équipe « Atelier » ; projets : Refonte du site, Migration des données, Documentation ; tâches : Maquette de l'accueil (Design, en cours), Plan de test (Qualité, terminée), Atelier de lancement (Produit, en cours), Migration des données (Technique, en retard) ; personnes : Camille, Yanis, Nadia ; KPI : 24 projets actifs, 1 248 tâches terminées, 7 en retard, 92 % ; 6 semaines de tâches pour le graphique. Format français (espace insécable dans `1 248`).

## Critères vérifiables
1. La story existe sous `Vitrine/Démonstration du mouvement` et `STORYBOOK_PUBLIC=1 npm run build-storybook` réussit ; le test de rendu `--project storybook` passe.
2. Aucun code d'animation dans la story : ni `lcReveal`, ni `lcStagger`, ni keyframes locaux ; seuls les composants du kit et `lcPageTransitions` posé par `lc-app-shell` animent.
3. Premier affichage et chaque changement de rubrique : couches dans l'ordre et aux délais des tokens (KPI 100, cartes 120, lignes 400, jauges 500, points 800 ms, ±1 image) ; filtre et suppression de ligne sans délai (CA-40).
4. Liste vers détail : entrée par la droite et recul de l'ancienne page ; retour par le bouton ; retour au geste à 360 px.
5. À 360 px : barre d'onglets en bas, aucun défilement horizontal (`scrollWidth <= clientWidth`), cibles >= 44 px ; à 1280 px : barre latérale.
6. « Rejouer » relance l'entrée de la rubrique courante ; sous `prefers-reduced-motion`, rien ne bouge, le bandeau `role="status"` s'affiche.
7. Les quatre états ne sont pas tous requis (démo) : au moins la liste vide (après suppression de toutes les lignes) avec message et action « Réinitialiser la liste ».
8. Navigation et formulaires au clavier ; focus visible ; focus rendu au déclencheur à la fermeture de la fenêtre.
9. Libellés de démo dans la story, pas dans `LC_LABELS` ; thème clair et sombre lisibles.

## Contraintes
- Rien du visuel, des textes ni du contenu de Talmo (licence) : style du kit (`DESIGN.md`), données ci-dessus.
- Libellés de la démo écrits dans la story, jamais dans `LC_LABELS`.
- Aucune nouvelle API publique, aucun composant ni token nouveau ; composants du kit seulement.
- Respect de `docs/storybook/CONVENTIONS.md` : titre `Vitrine/…` à confirmer (la convention liste des familles sans `Vitrine` ; ajouter la famille ou prendre `Foundations/Démonstration du mouvement`), anglais pour la navigation et la JSDoc, `fixedExample`, bouton « Rejouer », bandeau de mouvement réduit, extrait « Show code » écrit à la main.
