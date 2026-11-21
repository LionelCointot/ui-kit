# Spec : mouvement sobre (indicateurs qui glissent, appui du bouton, apparition du haut vers le bas)

- **Statut** : Cadrage (2026-11-21)
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-21
- **ADR liés** : [0001 Tokens](../adr/0001-design-tokens.md) · [0009 Cible navigateurs](../adr/0009-cible-navigateurs-et-primitives-natives.md) (inchangé : Baseline 2024 conservée)
- **Consommateurs** : simulateur immobilier (premier consommateur du kit) ; tous les projets qui utilisent `lc-tabs`, `lc-nav-list`, `button[lcButton]`, `lc-menu`, `lc-combobox`, `lc-date-input`

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « Sur ui kit comment on ferai pour avoir un asoect responsive sympa mais sobre ( deplacement dans la nav bar du selected vers le prochain eleemnt au lieux d'instantane, le bouton lorsqu'il est cliqué, Un effet d'apparition du haut vers le bas ( un peu a la apple) je sais pas si tu vois ce que je veux dire ? »
  - « View transition se base sur quelle baseline? Car on leut faire evoluer si jamais Et en fonction de la reponse par rapport au baseline, on y comlencera le développement. Aussi pour le storybook il faudrait des rubrique animation. Qui rejoue les animations pour la demo »
  - « La nav laterale egalement »
  - À la question « Quand l'effet d'apparition doit-il se déclencher ? A. à l'affichage seulement ; B. à l'arrivée dans l'écran au défilement ; C. les deux » : « A tres bien »
  - « Propose toute tes recommandation et je dirais oui ou non en fonction » ; sur la liste des 18 recommandations : « Tres bien »
- **Lectures retenues** :
  - « responsive » est lu « réactif au toucher et au clic » (sensation de mouvement), pas « adapté à la largeur d'écran ».
  - « nav bar » désigne `lc-tabs` : le kit n'a pas d'autre barre de navigation horizontale ; la nav latérale (`lc-nav-list`) est couverte par « La nav laterale egalement ».
  - « on peut faire évoluer [la Baseline] si jamais » : la cible reste revue chaque année par ADR (ADR 0009) ; rien dans cette spec n'empêche d'adopter les View Transitions lors d'une revue future.
- **Besoin en trois phrases** : Aujourd'hui, l'onglet ou l'élément de navigation sélectionné change d'un coup, le bouton ne réagit pas à l'appui et les blocs apparaissent sans transition. L'utilisateur veut un mouvement court et discret : l'indicateur glisse vers le nouvel élément, le bouton s'enfonce légèrement, les panneaux et blocs se déplient du haut vers le bas. Storybook doit montrer et rejouer chaque animation.
- **Décisions prises pendant le cadrage** (2026-11-21, utilisateur) :
  1. Apparition : directive `lcReveal` **et** panneaux déroulants du kit (`lc-menu`, liste de `lc-combobox`, calendrier de `lc-date-input`) ; dialogues inchangés.
  2. Déclenchement à l'insertion seulement (`@starting-style`, sans JavaScript) ; pas de dévoilement au défilement.
  3. Panneau retourné au-dessus du champ par le CDK : il se déplie de bas en haut, depuis le champ.
  4. Fermeture : fondu court (`duration-fast`), sans déplacement.
  5. Décalage en liste : entrée `lcRevealIndex`, délai = index × `--lc-sys-motion-stagger` (50 ms), plafonné à 8 éléments.
  6. Onglets : un seul trait qui glisse et prend la largeur du nouvel onglet ; pas d'animation au premier affichage ; recalcul au redimensionnement (`ResizeObserver`).
  7. Nav latérale : le fond de l'élément actif glisse verticalement au sein d'une même `lc-nav-list` ; élément actif dans un groupe replié : pas de glissement, le fond apparaît.
  8. Bouton : `scale(0.97)` sur `:active`, `duration-fast`, toutes variantes y compris icône ; rien si désactivé ; pas de ripple.
  9. Nouveaux tokens `sys` : `--lc-sys-easing-emphasized` (`cubic-bezier(0.2, 0, 0, 1)`), `--lc-sys-motion-offset` (`space-2`, 8 px), `--lc-sys-motion-stagger` (50 ms) ; durées existantes réutilisées (100 / 200 / 300 ms). **Valeurs provisoires** (réglage « standard ») : la décision 14 les fixe définitivement.
  10. Tokens par composant avec repli sur `sys` (modèle du calendrier).
  11. Cible Baseline 2024 conservée : pas de View Transitions (document entier Baseline 2025 ; version limitée à un élément : Chrome/Edge 147 seulement), pas de nouvel ADR.
  12. « Réduire les animations » : règle globale existante (`packages/tokens/src/base.css`) ; l'indicateur saute, l'apparition est immédiate.
  13. Storybook : page `Foundations/Motion` (durées et courbes côte à côte, bouton Rejouer) ; story `Animation` par composant animé avec bouton Rejouer et bandeau si le système demande de réduire les animations ; `docs/storybook/CONVENTIONS.md` mis à jour.
  14. Exploration : une page de démo HTML, trois réglages (*discret*, *standard*, *marqué*) différant par la durée et la distance ; le réglage choisi fixe la valeur des tokens.
  15. Contrat public : ajouts seulement, aucun consommateur à corriger.
  16. Tests : position de l'indicateur en navigateur réel (Playwright) ; tests unitaires pour le reste.
  17. Non-objectifs : dévoilement au défilement, View Transitions, ripple, transitions de page, animation des dialogues.
  18. Utilisateurs : les développeurs des projets consommateurs et, au bout, les personnes qui utilisent le simulateur ; `PRODUCT.md` reste à créer à part (`/impeccable init`).
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : nouveaux tokens `sys`, nouvelle directive publique `lcReveal`, mesure de position dans `lc-tabs` et `lc-nav-list`, règle de stories modifiée.
  - [x] Écran : ce que l'utilisateur voit bouger sur six composants.
  - [ ] Sécurité et données : fermé. Aucune entrée utilisateur, aucune donnée lue, envoyée ni stockée ; uniquement du CSS et des mesures de position.

## Relectures et écarts
- 2026-11-21, `cadreur` (mode cadrage) : AMBIGUÏTÉS. Retenu : question du déclenchement citée, lecture de « nav bar », revue de la Baseline, valeurs de la décision 9 déclarées provisoires. Écarté : remise en cause des décisions 1, 3, 4, 5, 8, 10, 12, 16 (proposées une à une et validées explicitement par l'utilisateur). À traiter dans la conception : onglets qui défilent horizontalement (l'indicateur suit le défilement), changement rapide pendant une animation, onglets ajoutés ou retirés, `forced-colors`, conflit de nom avec la méthode interne `LcTabsComponent.reveal()`. Baseline vérifiée : `@starting-style` 2024-08-06, `ResizeObserver` 2020.
