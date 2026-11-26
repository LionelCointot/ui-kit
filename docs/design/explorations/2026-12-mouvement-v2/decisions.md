# Motion v2 — décisions de l'utilisateur (cadrage, 2026-11-26)

Base de la future spec `docs/specs/2026-12-mouvement-v2.md`.

1. **Objectif** : reproduire le mouvement du site https://demo.codeandchill.store/talmo/ et refondre le motion du kit (refonte autorisée, pas de doublon avec l'existant).
2. **Premium seul** : les valeurs mesurées sur Talmo deviennent les valeurs par défaut du kit. Pas de registre sobre, pas d'attribut `data-lc-motion`, pas de fichier `motion-expressive.tokens.json`. Annule la décision « mouvement sobre » de la spec 2026-11-mouvement. Mots de l'utilisateur : « juste premium et pas sobre ».
3. **Harmoniser** : les durées et courbes des composants existants (indicateur d'onglets, panneaux, modales, toasts…) s'alignent en bloc sur Talmo, pas composant par composant. Mots : « oui le but c'est harmoniser ».
4. **Réglage centralisé** : toutes les valeurs de mouvement restent dans les tokens ; une application les ajuste depuis son thème `.tokens.json`, comme les couleurs. Une application qui met le kit à jour a toutes les animations sans autre action.
5. **Consommateurs** : copro-ticket, tableaux de bord gestionnaire et copropriétaire (usage à venir) → toutes les primitives peuvent être livrées ensemble. La règle « pas de composant sans consommateur identifié » reste dans le CLAUDE.md.
6. **Structure** : celle de [contre-expertise.md](contre-expertise.md) (dossier `motion/` dans le point d'entrée principal), sans la partie registres.
7. **Noms de variantes** : `rise` / `drop` / `fade` / `scale` / `pop` / `left` / `right` (proposé, non contesté).

8. **Composants mobiles inclus** dans l'harmonisation (investigation mobile de Talmo en cours).
9. **Navigation hiérarchique façon iOS demandée** (« comme dans Réglages sur iOS, quand on va dans une rubrique et qu'on clique sur retour, ça fait une animation vers l'avant ou l'arrière ») : la page entre par la droite, l'ancienne recule en parallaxe, retour inverse et au geste depuis le bord. Était un non-objectif de la spec 2026-11-mouvement ; faisable sans View Transitions (Talmo le fait). Démo en cours dans le catalogue.

## Encore ouvert

- Point « live » qui pulse en continu : autorisé dans DESIGN.md ?
- Essais techniques avant la spec : sortie d'un élément (`animate.leave` dans une directive) et `lcFlip` ?
- message-thread garde sa mesure par le bas et ne reprend que le décalage et les tokens ?
- Fidélité des démos du catalogue : correction en cours par le designer.

10. **Voile des feuilles du bas** : il suit le geste, s'éclaircit progressivement quand on tire la feuille vers le bas et se réassombrit si elle remonte (comportement actuel du kit, gardé ; Talmo le laisse fixe). Mots : « le fond derrière s'éclaircit ou s'assombrit graduellement (kit actuel) ».
12. **Révélation circulaire du thème** clair/sombre (cercle qui part du bouton, 450 ms) : dans le kit, avec repli écrit et testé (bascule instantanée sans View Transitions), conformément à la règle Baseline du CLAUDE.md. Mot : « oui ».
13. **Point « live » qui pulse en continu** : autorisé dans le kit (exception à écrire dans DESIGN.md). Mot : « oui ».
14. **Essais techniques avant la spec** : sortie d'un élément animée, réorganisation de liste, conservation de l'ancienne page pendant sa sortie. Mot : « oui ».
15. **Exclusions confirmées** : glisser-déposer et boutons magnétiques hors du kit, documentés comme recettes applicatives. Mot : « oui ».
16. **Changement de page sur téléphone : empilement iOS** (la nouvelle page arrive par la droite, l'ancienne recule de 30 % avec un voile, 500 ms, retour inverse et au geste depuis le bord, bouton retour libellé avec le titre de la page précédente), choisi sur la comparaison A/B (`comparaison-navigation.html`, question 1, option B). Mot : « version B ».
17. **Changement de rubrique au même niveau sur ordinateur : glissement selon l'ordre du menu** (Talmo : sortie 190 ms −16 px, entrée +26 px → 0 en 700 ms ; rubrique plus bas = vers l'avant, plus haut = vers l'arrière), choisi sur la comparaison A/B (question 2, option B). Mot : « version B ».
18. **Barre d'onglets en bas sur téléphone** : `lc-app-shell` affiche la barre latérale sur ordinateur et, sous 760 px, une barre d'onglets en bas avec au plus 4 rubriques marquées « principales » par l'application, plus un onglet « More » qui ouvre une feuille avec toutes les pages (démo d57). Sans rubrique marquée, le tiroir actuel reste. Entre 760 et 1024 px : tiroir actuel conservé (non tranché explicitement par l'utilisateur, à confirmer à la relecture de la spec). Mot : « ça me va ».
19. **Fenêtres sur téléphone** : sous 768 px, `lc-dialog` et `lc-drawer` s'affichent en feuille du bas, comme Talmo. Réponse : « Oui, comme Talmo ».
20. **Sélecteur segmenté** : pastille qui glisse partout (deux bords décalés, valeurs Talmo mobile), un seul comportement. Réponse : « Pastille qui glisse partout ».
21. **Onglets** : la cascade du contenu ne joue qu'à la première ouverture d'un onglet. Réponse : « Seulement la première fois ».
22. **Onglet « Plus » de la barre du bas** : ouvre le tiroir de navigation existant (pas de feuille « Toutes les pages »). Réponse : « Le tiroir actuel ».
11. **Appui sur un bouton** : on garde le retour visuel du kit (le bouton s'enfonce légèrement), alors que Talmo n'en a aucun. Mots : « on garde celui du kit pour le bouton ».
- **Transitions entre pages pour les applications** (exemple de l'utilisateur : copro-ticket, liste « Mes demandes » → détail « Test », aujourd'hui instantané) : le kit fournirait une directive sur le conteneur des pages qui déduit le sens (page plus profonde = avancer, retour navigateur ou page moins profonde = reculer, même niveau = fondu) et choisit le style selon l'écran (ordinateur : glissement discret de la zone de contenu, barre latérale et en-tête fixes ; mobile : empilement iOS ou fondu, selon le choix en attente), plus un en-tête mobile dont le bouton retour affiche le titre de la page précédente (lu dans le `title` des routes). Essai technique requis : garder l'ancienne page le temps de sa sortie sans View Transitions.
- Démos mobiles à ajouter au catalogue (liste dans le rapport de l'investigation mobile) : après la passe 2 du designer.
