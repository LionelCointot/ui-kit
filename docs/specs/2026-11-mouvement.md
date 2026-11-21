# Spec : mouvement sobre (indicateurs qui glissent, appui du bouton, apparition du haut vers le bas)

- **Statut** : Brouillon (2026-11-21), en relecture
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-21
- **ADR liés** : [0001 Tokens](../adr/0001-design-tokens.md) · [0009 Cible navigateurs](../adr/0009-cible-navigateurs-et-primitives-natives.md) (inchangé : Baseline 2024 conservée)
- **Consommateurs** : simulateur immobilier (premier consommateur du kit) ; tous les projets qui utilisent `lc-tabs`, `lc-nav-list`, `button[lcButton]`, `lc-menu`, `lc-combobox`, `lc-date-input`, `lc-data-table`
- **Maquette** : [`docs/design/explorations/2026-11-mouvement/index.html`](../design/explorations/2026-11-mouvement/index.html)

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « Sur ui kit comment on ferai pour avoir un asoect responsive sympa mais sobre ( deplacement dans la nav bar du selected vers le prochain eleemnt au lieux d'instantane, le bouton lorsqu'il est cliqué, Un effet d'apparition du haut vers le bas ( un peu a la apple) je sais pas si tu vois ce que je veux dire ? »
  - « View transition se base sur quelle baseline? Car on leut faire evoluer si jamais Et en fonction de la reponse par rapport au baseline, on y comlencera le développement. Aussi pour le storybook il faudrait des rubrique animation. Qui rejoue les animations pour la demo »
  - « La nav laterale egalement »
  - À la question « Quand l'effet d'apparition doit-il se déclencher ? A. à l'affichage seulement ; B. à l'arrivée dans l'écran au défilement ; C. les deux » : « A tres bien »
  - « Propose toute tes recommandation et je dirais oui ou non en fonction » ; sur la liste des 18 recommandations : « Tres bien »
  - Sur la démo : « pour la liste en cascade je mettrait plus long l'animation » ; « oui MAJ la demo en ligne » ; sur les variantes de cascade (recommandation C) : « tres bien »
  - « il faudrai vérifier également pour les tables les filtre en mode mobile qu'il y a bien des animation sobre et cohérente » ; sur les recommandations 19 à 25 : « tres bien »
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
  19. Panneau plein écran des filtres de `lc-data-table` (téléphone) : fondu et descente de 8 px en 200 ms, fond assombri en fondu ; fermeture en fondu de 100 ms (attribut `data-closing`, `close()` après la fin de l'animation). Exception assumée à la décision 17.
  20. Sections dépliables de ce panneau : contenu en fondu et descente de 8 px, sans animation de hauteur (`interpolate-size` hors cible).
  21. Menu de filtre de `lc-data-table` sur ordinateur : même effet que les panneaux déroulants.
  22. Pastilles de filtres actifs : apparition en fondu de 100 ms ; retrait immédiat, les voisines ne glissent pas.
  23. Cartes de résultats du téléphone : cascade au premier affichage et après chaque application des filtres, 8 cartes au plus ; ni au défilement ni au chargement de résultats supplémentaires.
  24. Bouton « Filtres (N) » : effet d'appui de la décision 8 (c'est un `lcButton`).
  25. Storybook : story `Animation` de `Data/Data table` à 360 px.
- **Réglages choisis sur la démo** (2026-11-21, utilisateur) : **Standard** pour les indicateurs, le bouton et les panneaux (200 ms, 8 px, fermeture 100 ms) ; **cascade C** pour `lcReveal` (350 ms par élément, 80 ms d'écart). Les valeurs provisoires de la décision 9 sont remplacées par celles-ci (écart de cascade 80 ms au lieu de 50).
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : nouveaux tokens `sys`, nouvelle directive publique `lcReveal`, mesure de position dans `lc-tabs` et `lc-nav-list`, règle de stories modifiée.
  - [x] Écran : ce que l'utilisateur voit bouger sur sept composants et une directive.
  - [ ] Sécurité et données : fermé. Aucune entrée utilisateur, aucune donnée lue, envoyée ni stockée ; uniquement du CSS et des mesures de position.

## 1. Contexte et problème
Le kit change d'état d'un coup : l'onglet ou l'élément de navigation actif saute, le bouton ne réagit pas à l'appui, les panneaux (menus, liste du combobox, calendrier, filtres du tableau) et les blocs de contenu apparaissent et disparaissent instantanément. Seuls quelques détails bougent déjà (bordure des champs, chevron des sections du tableau, cases du calendrier), avec `--lc-sys-duration-*` et `--lc-sys-easing-standard`. La règle globale `prefers-reduced-motion` existe déjà (`packages/tokens/src/base.css`).

## 2. Objectifs
- O1 : l'indicateur de sélection glisse d'un élément à l'autre dans `lc-tabs` et `lc-nav-list`.
- O2 : le bouton (`lcButton`) répond à l'appui par un léger enfoncement.
- O3 : les panneaux déroulants du kit et le panneau de filtres du téléphone se déplient du haut vers le bas et se ferment en fondu.
- O4 : une directive `lcReveal` fait apparaître des blocs en cascade, utilisée aussi par les cartes et pastilles de `lc-data-table`.
- O5 : un mouvement unique et réglable par thème (tokens), coupé quand le système demande de réduire les animations.
- O6 : Storybook montre et rejoue chaque animation.

## 3. Hors périmètre (non-objectifs)
- Dévoilement au défilement, View Transitions (document ou élément), transitions de page, ripple.
- Animation des dialogues (`lc-dialog`), sauf le panneau de filtres du téléphone (décision 19).
- Animation de hauteur (sections dépliables, `lc-disclosure`) : `interpolate-size` hors cible.
- Glissement des pastilles voisines au retrait, animation des lignes du tableau sur ordinateur, animation au chargement de résultats supplémentaires.
- Changement de la cible navigateurs (reste Baseline 2024, ADR 0009).

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : les développeurs des projets consommateurs, qui posent les composants sans écrire d'animation ; au bout, les personnes qui utilisent le simulateur (connaissance du sujet : aucune requise, le mouvement ne porte pas d'information). Décision 18 ; `PRODUCT.md` à créer à part.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Personne sur le simulateur | Change d'onglet ou de rubrique de la nav latérale | L'indicateur glisse en 200 ms vers le nouvel élément |
| Personne sur le simulateur | Appuie sur un bouton | Le bouton s'enfonce (0,97) puis revient |
| Personne sur le simulateur | Ouvre un menu, une liste, un calendrier, un filtre | Le panneau descend de 8 px en fondu ; il se referme en fondu |
| Personne sur téléphone | Ouvre « Filtres (N) », déplie une colonne, applique | Panneau et section en fondu-descente ; cartes en cascade |
| Développeur | Pose `lcReveal` (et `lcRevealIndex`) sur des blocs | Les blocs apparaissent en cascade sans code d'animation |
| Développeur de thème | Ralentit ou coupe le mouvement | Change les tokens `--lc-sys-*` ou `--lc-<composant>-*` |
| Personne qui réduit les animations | Utilise le kit | Aucun mouvement, les états changent immédiatement |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
- **Tokens** (`packages/tokens`) : nouveaux tokens `ref`/`sys` (5.2) ; tokens de composant avec repli sur `sys`.
- **Principal** (`packages/angular/src`) : `LcRevealDirective` (`[lcReveal]`) et un utilitaire interne `lcFinishAnimations(element): Promise<void>` (attend `element.getAnimations()` ; immédiat sans animation). Exporté pour les points d'entrée secondaires (secondaire → principal est autorisé).
- **Feuille globale** `styles/ui-angular.css` : appui du bouton, entrée et sortie des panneaux CDK (`.lc-menu-panel`, `.lc-combobox-panel`, panneau du calendrier, menu de `lc-data-table`), `[lcReveal]`. Entrée par `@starting-style` (Baseline 2024-08-06).
- **Sens du panneau** : chaque position « au-dessus » des stratégies CDK porte `panelClass: 'lc-overlay--above'` ; la descente devient une montée.
- **Fermeture des panneaux CDK** : la classe `lc-overlay--closing` déclenche le fondu, puis `detach()` après `lcFinishAnimations`. Une réouverture pendant la fermeture annule le fondu.
- **`lc-tabs`** : un élément `lc-tabs__indicator` dans la liste qui défile ; position et largeur mesurées (`offsetLeft`, `offsetWidth`) à chaque sélection et par `ResizeObserver` (liste et onglets) ; seules `transform` est animée ; la classe `lc-tabs--ready` n'est posée qu'après la première mesure (pas d'animation au premier affichage). La bordure par onglet sélectionné disparaît.
- **`lc-nav-list`** : un élément `lc-nav-list__indicator` derrière les éléments ; mesure de l'élément actif (`offsetTop`, `offsetHeight`) ; élément actif invisible (groupe replié) : indicateur masqué, réapparition en fondu sans glissement. Le fond de `:host(.lc-nav-item--active)` passe sur l'indicateur ; en `forced-colors`, le style actuel de l'élément actif est conservé.
- **`lc-data-table`** : `<dialog>` du téléphone avec `data-closing` puis `close()` après `lcFinishAnimations` (fiche `animate-to-from-top-layer`) ; `::backdrop` en fondu ; `@starting-style` sur le corps des sections et les pastilles ; `lcReveal` sur les 8 premières cartes, rejouée après application (clé de rendu incrémentée).
- **Remplacer une brique** : tout le mouvement vient des tokens ; les retirer à `0ms` coupe tout sans toucher au code.

### 5.2 Modèle de données (tokens)
| Token | Valeur | Couche |
|---|---|---|
| `--lc-ref-duration-long` | 350ms | ref (nouveau) |
| `--lc-sys-duration-long` | `{ref.duration.long}` | sys (nouveau) |
| `--lc-sys-easing-emphasized` | `cubic-bezier(0.2, 0, 0, 1)` | sys (nouveau, avec ref) |
| `--lc-sys-motion-offset` | `{sys.space.2}` (8 px) | sys (nouveau) |
| `--lc-sys-motion-stagger` | 80ms | sys (nouveau, avec ref) |
| `--lc-tabs-indicator-duration` / `-easing` | `duration-normal` / `easing-emphasized` | composant |
| `--lc-nav-item-indicator-duration` / `-easing` | idem | composant |
| `--lc-button-press-scale` / `-duration` | 0.97 / `duration-fast` | composant |
| `--lc-overlay-enter-duration` / `-exit-duration` / `-easing` / `-offset` | `normal` / `fast` / `emphasized` / `motion-offset` | composant (panneaux CDK et dialogue de filtres) |
| `--lc-reveal-duration` / `-easing` / `-offset` / `-stagger` | `long` / `emphasized` / `motion-offset` / `motion-stagger` | composant |

Pas de nouvelle donnée applicative ; le contrôle `lc-tokens check` accepte les nouveaux tokens `sys`.

### 5.3 API / interfaces
- `LcRevealDirective` : sélecteur `[lcReveal]`, `lcRevealIndex = input<number>(0)` ; pose `--lc-reveal-index` = min(index, 7) sur l'hôte. Index négatif ou non entier : traité comme 0, avertissement en développement (`isDevMode()`).
- Aucun changement d'entrée ou de sortie des composants existants. Classes CSS ajoutées : `lc-tabs__indicator`, `lc-tabs--ready`, `lc-nav-list__indicator`, `lc-overlay--above`, `lc-overlay--closing`.
- Renommer la méthode privée `LcTabsComponent.reveal()` en `scrollTabIntoView()` (lève l'ambiguïté avec `lcReveal`, pas de contrat public).

### 5.4 Interface utilisateur
Direction choisie par l'utilisateur sur la maquette : **Standard** (200 ms, 8 px, fermeture 100 ms) et **cascade C** (350 ms, 80 ms). Brief de `ui-ux-designer` : à compléter en relecture. Aucun texte nouveau à l'écran hors Storybook (bandeau « Les animations sont réduites par votre système : rien ne bouge dans cette démo. ») ; test `novice-user` sans objet sur le produit (le mouvement ne porte ni texte ni étape), fait sur la page `Foundations/Motion`.

Storybook : page `Foundations/Motion` (durées et courbes côte à côte, Rejouer) ; story `Animation` dans `Navigation/Tabs`, `Navigation/Nav list`, `Buttons/Button`, `Navigation/Menu`, `Forms/Combobox`, `Forms/Date input`, `Layout/Reveal` (ou famille décidée en relecture), `Data/Data table` (360 px). Chaque story a un bouton « Rejouer » et le bandeau de réduction. Règle ajoutée à `docs/storybook/CONVENTIONS.md`.

## 6. Cas limites et gestion des erreurs
- Changement de sélection pendant un glissement : la transition repart de la position courante (transition CSS interrompue), pas de saut.
- Onglets qui défilent : l'indicateur est dans le contenu qui défile et le suit ; l'onglet sélectionné reste ramené dans la vue (`scrollTabIntoView`).
- Onglets ou éléments ajoutés, retirés, libellé qui change de largeur, police chargée après coup : nouvelle mesure (`ResizeObserver` et changement des enfants).
- Aucun onglet ou élément actif : indicateur masqué.
- Panneau ouvert puis refermé avant la fin de l'entrée : le fondu de sortie part de l'état courant ; réouverture pendant la sortie : le panneau reste ouvert.
- Composant détruit pendant une fermeture animée : `detach` et `close()` sont appelés tout de même (pas de panneau orphelin).
- Retournement du panneau par le CDK après ouverture (défilement) : la classe de sens suit la position, sans rejouer l'entrée.
- `prefers-reduced-motion: reduce` : règle globale ; `lcFinishAnimations` se résout immédiatement ; aucun délai de cascade (le délai est aussi réduit).
- `forced-colors` : indicateurs visibles (bordure ou `Highlight`), style actuel conservé.
- Rendu serveur : aucune mesure hors navigateur (`afterNextRender`).

## 7. Sécurité, performance, observabilité
- **Sécurité et données** : angle fermé (fiche de cadrage). Aucune donnée, aucun `innerHTML`.
- Performance : seules `opacity` et `transform` sont animées (pas de mise en page) ; mesures regroupées dans `afterNextRender` / rappel de `ResizeObserver` ; aucun minuteur JavaScript pour la cascade (CSS `transition-delay`). Taille ajoutée au paquet : quelques centaines d'octets de JavaScript (directive, utilitaire, mesures).
- Logs : avertissement en développement seulement pour un `lcRevealIndex` invalide.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| View Transitions (document) | déclaratif, partagé | Baseline 2025 ; masque menus et éléments fixes ; bloque les transitions simultanées | Non |
| View Transitions limitées à un élément | idéales pour un composant | Chrome/Edge 147 seulement | Non |
| `@angular/animations` | API Angular connue | dépendance dépréciée au profit de CSS natif (`animate.enter`/`animate.leave`), plus lourde | Non |
| `animate.enter` / `animate.leave` d'Angular | natif Angular, sortie gérée | ne couvre pas les panneaux CDK ni le `<dialog>` ; à reconsidérer en relecture d'architecture pour `lcReveal` | À trancher par `architect` |
| `@starting-style` + mesure + classes de sortie | CSS natif Baseline 2024, sans dépendance | un peu de code de mesure et de fermeture différée | **Oui** |
| Indicateur par `anchor positioning` | sans mesure JS | hors cible | Non |

## 9. Plan de test
- Unitaires (`senior-developer`, Vitest) : `LcRevealDirective` (variable posée, plafond 7, index invalide), `lcFinishAnimations` (sans animation : résolution immédiate ; avec animations simulées : attend), classes `lc-overlay--above` / `--closing`, pas de classe `lc-tabs--ready` avant la première mesure, `detach` différé puis appelé, dialogue fermé après la sortie.
- Acceptation (`qa-engineer`) : stories d'acceptation exécutées par `tools/qa/storybook-browser.mjs` (Chromium) pour tout ce qui dépend du CSS et des mesures : position et largeur de l'indicateur, glissement, sens du panneau, fondu de sortie, cascade, réduction des animations (émulée).
- Bout en bout : parcours du téléphone sur `Data/Data table` (ouvrir, déplier, appliquer, cartes en cascade, fermer).
- Architecture : aucun import entre points d'entrée secondaires ajouté ; aucune durée, distance ou courbe en dur dans un composant (contrôle par recherche dans les `.css`).

## 10. Critères d'acceptation
- [ ] CA-1 : Les tokens de 5.2 existent dans la CSS générée avec ces valeurs ; `npm test --workspace @lionelcointot/ui-tokens` passe.
- [ ] CA-2 : `lc-tabs` : après sélection d'un autre onglet, l'indicateur a, en fin de transition, la position et la largeur de l'onglet sélectionné (± 1 px), et une transition sur `transform` de `--lc-tabs-indicator-duration` est en cours juste après le clic.
- [ ] CA-3 : `lc-tabs` : au premier affichage, aucune animation de l'indicateur ne tourne.
- [ ] CA-4 : `lc-tabs` à 360 px avec onglets qui défilent : l'indicateur reste sous l'onglet sélectionné après défilement et après changement de largeur du conteneur.
- [ ] CA-5 : `lc-nav-list` : l'indicateur prend la position et la hauteur de l'élément actif (± 1 px) avec transition ; élément actif dans un groupe replié : indicateur masqué ; au dépliage, il apparaît sans glisser.
- [ ] CA-6 : `lcButton` actif (`:active`) : `transform: scale(0.97)` ; bouton désactivé : aucune transformation.
- [ ] CA-7 : À l'ouverture de `lc-menu`, `lc-combobox`, du calendrier de `lc-date-input` et du menu de filtre de `lc-data-table`, le panneau démarre à opacité 0 et décalé de `--lc-sys-motion-offset` vers le bas (vers le haut si `lc-overlay--above`), puis atteint opacité 1 et décalage 0.
- [ ] CA-8 : À la fermeture de ces panneaux, un fondu de `--lc-overlay-exit-duration` a lieu avant le retrait du DOM ; une réouverture pendant le fondu garde le panneau ouvert ; le focus revient au déclencheur comme aujourd'hui.
- [ ] CA-9 : `lcReveal` : un élément inséré démarre à opacité 0 et décalé, son `transition-delay` vaut min(index, 7) × `--lc-reveal-stagger` ; index invalide → 0 et avertissement en développement uniquement.
- [ ] CA-10 : Panneau de filtres du téléphone : entrée en fondu-descente avec fond en fondu ; à la fermeture (croix, Échap, « Afficher N … »), fondu puis `close()` ; le comportement des filtres et du focus reste celui de la spec `2026-11-tableau-filtrable.md`.
- [ ] CA-11 : Section dépliée du panneau : le corps apparaît en fondu-descente ; pastille ajoutée : fondu de `duration-fast` ; pastille retirée : disparaît immédiatement.
- [ ] CA-12 : Cartes du téléphone : les 8 premières jouent la cascade au premier affichage et après chaque application ; aucune cascade au défilement ni au chargement suivant.
- [ ] CA-13 : Avec `prefers-reduced-motion: reduce` émulé, aucune transition ni animation perceptible (durées ≤ 0,01 ms) sur tous les cas ci-dessus et les panneaux se ferment sans attente.
- [ ] CA-14 : En `forced-colors: active`, l'onglet sélectionné et l'élément de nav actif restent identifiables.
- [ ] CA-15 : Aucune durée, distance, échelle ou courbe écrite en dur dans les `.css` et `.ts` des composants touchés (seulement des `var(--lc-…)`).
- [ ] CA-16 : Storybook : `Foundations/Motion` et une story `Animation` par composant de 5.4, chacune avec « Rejouer » qui relance l'animation et le bandeau visible en réduction émulée ; `node tools/qa/storybook-controls.mjs` et le contrôle axe passent ; `CONVENTIONS.md` décrit la règle.
- [ ] CA-17 : Test `novice-user` sur la page `Foundations/Motion` : rendu COMPRIS.
- [ ] CA-18 : Les tests existants des composants touchés passent sans modification (`npx ng test ui-angular --watch=false`) ; `npm run catalogue:check` passe après régénération.

## 11. Découpage en tâches
- [ ] T1 : tokens `ref`, `sys` et de composant ; tests des tokens (S, CA-1).
- [ ] T2 : `LcRevealDirective`, `lcFinishAnimations`, styles globaux de `[lcReveal]` et appui du bouton (S, CA-6, CA-9, CA-15).
- [ ] T3 : entrée et sortie des panneaux CDK (`lc-menu`, `lc-combobox`, calendrier), classes de sens et de fermeture (M, CA-7, CA-8).
- [ ] T4 : indicateur de `lc-tabs` (M, CA-2 à CA-4, CA-14).
- [ ] T5 : indicateur de `lc-nav-list` (M, CA-5, CA-14).
- [ ] T6 : `lc-data-table` : menu de filtre, dialogue du téléphone, sections, pastilles, cartes (M, CA-7, CA-8, CA-10 à CA-12).
- [ ] T7 : Storybook : `Foundations/Motion`, stories `Animation`, bandeau, `CONVENTIONS.md`, catalogue (M, CA-16, CA-17, CA-18).
- [ ] T8 : réduction des animations, passe transverse et stories d'acceptation (QA, CA-13).

## 12. Risques et questions ouvertes
- **Choix par défaut à confirmer** : famille Storybook de `lcReveal` (`Layout` proposé) ; nom de la durée 350 ms (`duration-long`).
- **Dettes** : fermeture différée des panneaux CDK à maintenir à chaque nouvelle superposition ; à revoir si `overlay` et `transition-behavior` pour `display` deviennent Baseline (revue annuelle, ADR 0009).
- **Questions ouvertes** : `animate.enter`/`animate.leave` d'Angular pour `lcReveal` et les pastilles (relecture `architect`).

## 13. Relectures et écarts
- 2026-11-21, `cadreur` (mode cadrage) : AMBIGUÏTÉS. Retenu : question du déclenchement citée, lecture de « nav bar », revue de la Baseline, valeurs de la décision 9 déclarées provisoires. Écarté : remise en cause des décisions 1, 3, 4, 5, 8, 10, 12, 16 (proposées une à une et validées explicitement par l'utilisateur). À traiter dans la conception : onglets qui défilent horizontalement (l'indicateur suit le défilement), changement rapide pendant une animation, onglets ajoutés ou retirés, `forced-colors`, conflit de nom avec la méthode interne `LcTabsComponent.reveal()`. Baseline vérifiée : `@starting-style` 2024-08-06, `ResizeObserver` 2020.
