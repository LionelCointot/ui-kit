# Spec : mouvement sobre (indicateurs qui glissent, appui du bouton, apparition du haut vers le bas)

- **Statut** : Validée le 2026-11-21 par l'utilisateur (« Oui pour tout »)
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
  9. Nouveaux tokens `sys` : ~~`--lc-sys-easing-emphasized`~~ (retiré en relecture : `--lc-sys-easing-standard` vaut déjà `cubic-bezier(0.2, 0, 0, 1)`), `--lc-sys-motion-offset` (`space-2`, 8 px), `--lc-sys-motion-stagger` (50 ms) ; durées existantes réutilisées (100 / 200 / 300 ms). **Valeurs provisoires** (réglage « standard ») : la décision 14 les fixe définitivement.
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
- **Réglages choisis sur la démo** (2026-11-21, utilisateur) : **Standard** pour les indicateurs, le bouton et les panneaux (200 ms, 8 px, fermeture 100 ms) ; **cascade C** pour `lcReveal` (350 ms par élément, 80 ms d'écart). Les valeurs provisoires de la décision 9 sont remplacées par celles-ci (écart de cascade 80 ms au lieu de 50 ; durée de cascade 350 ms, nouveau token `duration-long`).
- **Choix validés après relecture** (2026-11-21, utilisateur, « oui » à Q1–Q5) : `Foundations/Motion` remplace la section Motion (`Foundations/Elevation`) ; `lc-calendar-fade` remplacé par l'entrée commune ; exception de `DESIGN.md` à 350 ms pour la cascade ; nouvelle durée `duration-long` 350 ms ; `lcTooltip`, `lc-toggletip`, `lc-drawer` inchangés, calendrier de `lc-date-range-input` inclus.
- **Animation de la différence de liste et ressort** (2026-11-21, utilisateur) : à la question « que ferait Apple ? Si une ligne apparaît entre deux lignes après un changement de filtre, elle apparaît et fait pousser gracieusement ? » puis « Mais un peu en bounce ? Ou comme une courbe de vélocité ? » : « Pour la 1. Tu fais la B » et « pour le 2. Une demo comparative ».
  26. Après le premier affichage (cascade inchangée), tout changement de la liste (filtre, tri, retrait de pastille) anime la **différence** : lignes conservées qui glissent vers leur nouvelle place (FLIP, Web Animations API), lignes ajoutées en fondu à leur place, lignes retirées en fondu puis resserrement (`animate.leave` d'Angular). Sur les **cartes du téléphone et les lignes du tableau sur ordinateur**. Remplace la cascade rejouée de la décision 23.
  27. Courbe de déplacement : un token `--lc-sys-easing-spring` en `linear()` (Baseline 2023-12-11), pour les seuls déplacements (lignes, indicateurs des onglets et de la nav latérale). Après « je trouve un peu trop abrupt et des fois les listes sortent beaucoup de leur zone », recherche (Apple SwiftUI, Material 3) et démo v2 ; choix de l'utilisateur (« Facon apple alors ») : **ressort sans rebond (amortissement critique, `x(t) = 1 − (1 + ωt)·e^(−ωt)`, ω = 8 sur une durée normalisée), 500 ms fixes** (nouveau token `duration-move`).
- **Ordre de livraison** : après [`2026-11-filtre-periode-tableau.md`](2026-11-filtre-periode-tableau.md) (mêmes fichiers que T6).
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : nouveaux tokens `sys`, nouvelle directive publique `lcReveal`, mesure de position dans `lc-tabs` et `lc-nav-list`, règle de stories modifiée.
  - [x] Écran : ce que l'utilisateur voit bouger sur sept composants et une directive.
  - [ ] Sécurité et données : fermé. Aucune entrée utilisateur, aucune donnée lue, envoyée ni stockée ; uniquement du CSS et des mesures de position.

## 1. Contexte et problème
Le kit change d'état d'un coup : l'onglet ou l'élément de navigation actif saute, le bouton ne réagit pas à l'appui, les panneaux (menus, liste du combobox, calendrier, filtres du tableau) et les blocs de contenu apparaissent et disparaissent instantanément. Quelques détails bougent déjà (bordure des champs, chevron des sections du tableau, fondu du calendrier `lc-calendar-fade`, entrée latérale de `lc-drawer`), avec `--lc-sys-duration-*` et `--lc-sys-easing-standard` (déjà `cubic-bezier(0.2, 0, 0, 1)`, la courbe choisie sur la démo). La règle globale `prefers-reduced-motion` (`packages/tokens/src/base.css:47-55`) réduit les durées mais pas les délais.

## 2. Objectifs
- O1 : l'indicateur de sélection glisse d'un élément à l'autre dans `lc-tabs` et `lc-nav-list`.
- O2 : le bouton (`lcButton`) répond à l'appui par un léger enfoncement.
- O3 : les panneaux déroulants du kit et le panneau de filtres du téléphone se déplient du haut vers le bas et se ferment en fondu.
- O4 : une directive `lcReveal` fait apparaître des blocs en cascade, utilisée aussi par les cartes de `lc-data-table`.
- O5 : un mouvement unique et réglable par thème (tokens), entièrement coupé (durées et délais) quand le système demande de réduire les animations.
- O6 : Storybook montre et rejoue chaque animation.

## 3. Hors périmètre (non-objectifs)
- Dévoilement au défilement, View Transitions (document ou élément), transitions de page, ripple (décisions 2, 8, 11, 17).
- Animation des dialogues (`lc-dialog`), sauf le panneau de filtres du téléphone (décisions 17 et 19).
- Superpositions autres que les panneaux déroulants : `lcTooltip`, `lc-toggletip`, `lc-drawer` (qui garde son entrée actuelle) restent inchangés (validé, Q5).
- Animation de hauteur (sections dépliables, `lc-disclosure`) : `interpolate-size` hors cible (décision 20).
- Glissement des pastilles voisines au retrait, animation au chargement de résultats supplémentaires (décisions 22, 23).
- Changement de la cible navigateurs (reste Baseline 2024, ADR 0009) et `animate.enter` / `animate.leave` d'Angular (section 8).

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : les développeurs des projets consommateurs, qui posent les composants sans écrire d'animation ; au bout, les personnes qui utilisent le simulateur (aucune connaissance requise : le mouvement ne porte pas d'information). Décision 18 ; `PRODUCT.md` à créer à part.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Personne sur le simulateur | Change d'onglet ou de rubrique de la nav latérale | L'indicateur glisse en 200 ms vers le nouvel élément |
| Personne sur le simulateur | Appuie sur un bouton | Le bouton s'enfonce (0,97) puis revient |
| Personne sur le simulateur | Ouvre un menu, une liste, un calendrier, un filtre | Le panneau descend de 8 px en fondu ; il se referme en fondu |
| Personne sur téléphone | Ouvre « Filtres (N) », déplie une colonne, applique | Panneau et section en fondu-descente ; cartes en cascade |
| Développeur | Pose `lcReveal` (et `lcRevealIndex`) sur des blocs | Les blocs apparaissent en cascade sans code d'animation |
| Développeur de thème | Ralentit ou coupe le mouvement | Change les tokens `--lc-sys-*` ou `--lc-<composant>-*` |
| Personne qui réduit les animations | Utilise le kit | Aucun mouvement ni délai, les états changent immédiatement |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
- **Tokens** (`packages/tokens`) : nouveaux tokens (5.2) ; tokens de composant avec repli sur `sys` (modèle de `calendar.tokens.json`). `base.css` : la règle de réduction met aussi `transition-delay` et `animation-delay` à `0s !important`.
- **Principal** (`packages/angular/src`, autorisé depuis tous les secondaires, aucune nouvelle exception d'import) :
  - `lib/reveal/reveal.directive.ts` : `LcRevealDirective` (5.3).
  - `lib/core/detach-animated.ts` : `lcDetachAnimated(overlayRef)` (5.3), seul point de fermeture animée des panneaux CDK ; contient en interne l'attente des animations (`Promise.allSettled` sur les `finished` des animations **finies** de `el.getAnimations({ subtree: true })` — les animations infinies, comme celles du spinner ou du squelette, sont ignorées ; immédiate sans animation). Type `OverlayRef` importé de `@angular/cdk/overlay` (dépendance déjà présente).
- **Feuille globale** `styles/ui-angular.css` : appui du bouton, entrée et sortie des panneaux CDK (`.lc-menu-panel`, `.lc-combobox-panel`, panneau du calendrier, menu de `lc-data-table`), `[lcReveal]`. Entrée de `[lcReveal]` par `@starting-style` (Baseline 2024-08-06) ; entrée des panneaux CDK par `@keyframes` posé sur le contenu du panneau (`… > *`), le fondu de sortie restant une transition sur le conteneur pour pouvoir démarrer pendant l'entrée (le CDK calcule le style du panneau avant de poser sa classe, `@starting-style` n'y joue jamais ; sens porté par la variable `--lc-overlay-enter-sign`, qui ne relance pas l'animation au retournement). Le fondu `lc-calendar-fade` est remplacé par l'entrée commune (validé, Q2).
- **Sens du panneau** : chaque position « au-dessus » des stratégies CDK porte `panelClass: 'lc-overlay--above'` ; la descente devient une montée ; un retournement après ouverture change le sens sans rejouer l'entrée.
- **Fermeture des panneaux CDK** (`menu-trigger.directive.ts`, `combobox.component.ts`, `date-input.component.ts`, `date-range-input.component.ts`, menu de `lc-data-table`) : appel de `lcDetachAnimated`, qui pose `lc-overlay--closing` sur `overlayElement`, attend la fin du fondu, puis `detach()`. Une réouverture pendant le fondu annule le retrait (jeton) ; la destruction du composant détache immédiatement.
- **`lc-tabs`** : un élément `lc-tabs__indicator` (`aria-hidden="true"`, `role="presentation"`) dans `lc-tabs__list` (conteneur qui défile, `position: relative`). Position (`offsetLeft`) et largeur (`offsetWidth`) de l'onglet sélectionné mesurées dans l'`afterRenderEffect` existant ; le `ResizeObserver` existant observe aussi les onglets. Transition sur `transform: translateX` (position) et `width` (largeur ; élément en `position: absolute`, sans effet sur la mise en page ; trait sans rayon). Classe `lc-tabs--ready` posée après la première mesure. La bordure par onglet sélectionné disparaît. La méthode privée `reveal()` devient `scrollTabIntoView()`.
- **`lc-nav-list`** : un élément `lc-nav-list__indicator` avant `<ng-content />`, `inset-inline: 0`. Chaque `lcNavItem` dans une liste s'enregistre (`list.register(el, active)`) à partir de `isActiveChange` de `RouterLinkActive` (sorties via `hostDirectives`) et porte `lc-nav-item--indicated` ; un élément hors liste garde le fond actuel (`:host(.lc-nav-item--active:not(.lc-nav-item--indicated))`). Mesure par `getBoundingClientRect()` (élément moins liste, plus `scrollTop`), insensible à `lc-nav-group`. Transition sur `transform: translateY` et `height`. Élément actif invisible (groupe replié, rect nul) : indicateur masqué ; réapparition en fondu sans glissement ; dépliage ou repli d'un groupe et bascule `collapsed` : nouvelle mesure sans glissement (`ResizeObserver` sur la liste). Les éléments passent devant l'indicateur (`position: relative`) ; le survol reste un `color-mix`. En `forced-colors`, indicateur masqué et style actif actuel conservé sur l'élément.
- **`lc-data-table`** : `<dialog>` du téléphone avec `data-closing` puis `close()` après la fin du fondu (de la fiche `animate-to-from-top-layer`, seul `@starting-style` est suivi : ni `overlay` ni `display` en `allow-discrete`, hors cible) ; `::backdrop` en fondu ; `@starting-style` sur le corps des sections (s'il est masqué par `[hidden]`, `transition-behavior: allow-discrete`, Baseline 2024-08-06) et sur les pastilles ; `lcReveal` sur les 8 premières cartes, rejouée après application (clé de rendu incrémentée).
- **Remplacer une brique** : tout le mouvement vient des tokens ; les mettre à `0ms` coupe tout. Ajouter un panneau CDK animé : `panelClass` de sens, `lcDetachAnimated`, sélecteur dans `ui-angular.css`, story.

### 5.2 Modèle de données (tokens)
| Token | Valeur | Couche |
|---|---|---|
| `--lc-ref-duration-long` / `--lc-sys-duration-long` | 350ms | ref + sys (nouveau ; validé, Q4) |
| `--lc-ref-motion-stagger` / `--lc-sys-motion-stagger` | 80ms | ref + sys (nouveau) |
| `--lc-sys-motion-offset` | `{sys.space.2}` (8 px) | sys (nouveau) |
| Courbe | `--lc-sys-easing-standard` existant (`cubic-bezier(0.2, 0, 0, 1)`) ; `easing-emphasized` existant non utilisé ni modifié | — |
| `--lc-tabs-indicator-duration` / `-easing` | `duration-normal` / `easing-standard` | composant |
| `--lc-nav-item-indicator-duration` / `-easing` | idem | composant |
| `--lc-button-press-scale` / `-duration` | 0.97 / `duration-fast` | composant |
| `--lc-overlay-enter-duration` / `-exit-duration` / `-easing` / `-offset` | `normal` / `fast` / `standard` / `motion-offset` | composant (panneaux CDK, dialogue de filtres, corps des sections) |
| `--lc-chip-enter-duration` | `duration-fast` | composant (pastilles du tableau) |
| `--lc-reveal-duration` / `-easing` / `-offset` / `-stagger` | `long` / `standard` / `motion-offset` / `motion-stagger` | composant |

`--lc-calendar-duration` / `-easing` (existants) se replient sur `--lc-overlay-enter-*` pour l'entrée du calendrier. Pas de donnée applicative ; `lc-tokens check` accepte les nouveaux tokens `sys`.

### 5.3 API / interfaces
- `LcRevealDirective` : sélecteur `[lcReveal]`, `lcRevealIndex = input<number>(0)` ; pose `--lc-reveal-index` = min(index, 7) sur l'hôte. Index négatif ou non entier : 0 et avertissement en développement (`isDevMode()`). Exportée (`public-api.ts`).
- `lcDetachAnimated(overlayRef: OverlayRef): Promise<void>` : exportée et marquée `@internal` dans la JSDoc (usage réservé aux points d'entrée du kit, hors catalogue).
- Aucun changement d'entrée ou de sortie des composants existants. Classes CSS ajoutées : `lc-tabs__indicator`, `lc-tabs--ready`, `lc-nav-list__indicator`, `lc-nav-item--indicated`, `lc-overlay--above`, `lc-overlay--closing`.

### 5.4 Interface utilisateur
Direction choisie par l'utilisateur sur la maquette : **Standard** (200 ms, 8 px, fermeture 100 ms) et **cascade C** (350 ms, 80 ms). Brief de `ui-ux-designer` (2026-11-21).

**Principe commun.** Seules `opacity` et `transform` bougent, plus `width` / `height` des indicateurs (positionnés en absolu). Le mouvement ne porte jamais d'information et ne retarde aucune action (clic et clavier pris en compte dès le premier instant). Réduction des animations : tout saute à l'état final, délais compris ; les fermetures différées se résolvent aussitôt.

| Composant | Ce qui bouge, depuis où | Durée, courbe | État final | Forced-colors |
|---|---|---|---|---|
| `lc-tabs` | Le trait glisse en `translateX` et prend la largeur du nouvel onglet. Rien au premier affichage ni au redimensionnement. Interrompu : repart de la position courante. | `--lc-tabs-indicator-*` (normal, standard) | Sous l'onglet sélectionné (± 1 px), défile avec la liste | Trait en `Highlight` ; saute sans glisser en réduction |
| `lc-nav-list` | Le fond actif glisse en `translateY` (et `height`) vers le nouvel élément, dans une même liste. Groupe replié : masqué ; au dépliage, fondu sans glissement. | `--lc-nav-item-indicator-*` (normal, standard) ; réapparition `duration-fast` | Sous l'élément actif (± 1 px) | Indicateur masqué, style actif actuel sur l'élément |
| `button[lcButton]` | `scale(0.97)` au centre à l'appui, retour au relâchement ; toutes variantes, icône comprise ; rien si désactivé. | `--lc-button-press-*` (fast, standard) | Taille normale | Inchangé |
| Panneaux : `lc-menu`, liste de `lc-combobox`, calendriers de `lc-date-input` et `lc-date-range-input`, menu de filtre de `lc-data-table` | Naît à opacité 0, 8 px au-dessus de sa place, et descend depuis son déclencheur ; `lc-overlay--above` : monte de 8 px depuis le champ. Fermeture : fondu seul ; réouverture pendant le fondu : reste ouvert. | Entrée `--lc-overlay-enter-*` (normal, standard) ; sortie `--lc-overlay-exit-duration` (fast) | Opacité 1, décalage 0 | Contour conservé |
| `lc-data-table` téléphone : panneau de filtres | Fondu et descente de 8 px ; `::backdrop` en fondu. Fermeture (croix, Échap, « Afficher N … ») : fondu (`data-closing`), puis `close()`. | `--lc-overlay-*` | Panneau net | Fond et contour système |
| Sections du panneau | Corps en fondu et descente de 8 px ; pas d'animation de hauteur ; chevron inchangé. | `--lc-overlay-enter-*` | Corps visible | Inchangé |
| Pastilles de filtres actifs | Apparition en fondu sur place ; retrait immédiat. | `--lc-chip-enter-duration` | Visible | Contour conservé |
| Cartes de résultats (téléphone) | Cascade : chaque carte descend de 8 px en fondu, 8 cartes au plus, au premier affichage et après chaque application. | `lcReveal` (350 ms, standard, 80 ms) | Opacité 1 | Inchangé |
| Bouton « Filtres (N) » | Effet d'appui du bouton. | `lcButton` | Normal | Inchangé |
| `lcReveal` | À l'insertion : fondu et descente de 8 px ; délai min(index, 7) × 80 ms. Rejoue à chaque réinsertion (`@if`, clé changée) : à ne pas poser sur un contenu réinséré à chaque rendu. | `--lc-reveal-*` | Opacité 1, décalage 0 | Inchangé |

**Storybook** (T7) :
- `Foundations/Motion` : remplace la section Motion de `Foundations/Elevation and motion`, renommée `Foundations/Elevation` (validé, Q1). Durées et écart résolus, courbe `standard` tracée, distance, trois mini-démos (panneau, cascade de 4 lignes, appui), un « Rejouer », le bandeau de réduction, renvoi aux `--lc-sys-*`.
- `lcReveal` dans `Layout/Reveal` (`packages/angular/src/lib/reveal/reveal.stories.ts`, comme `Layout/Truncate`) : `Playground` (contrôle `lcRevealIndex`) puis `Animation`.
- Story `Animation` dans `Navigation/Tabs`, `Navigation/Nav list`, `Buttons/Button`, `Navigation/Menu`, `Forms/Combobox`, `Forms/Date input`, `Layout/Reveal`, `Data/Data table` (360 px) : bouton « Rejouer » (réinsertion par clé de rendu ; onglets et nav : retour sans transition au premier élément puis sélection du dernier) ; extrait de code écrit à la main, limité à l'usage du composant ; JSDoc en anglais d'une phrase.
- Bandeau (`role="status"`, au-dessus de la démo, si `matchMedia('(prefers-reduced-motion: reduce)')`, suit les changements) : « Les animations sont réduites par votre système : rien ne bouge dans cette démo. »
- `CONVENTIONS.md`, « Page d'un composant » : un composant qui bouge a une story `Animation` après les exemples figés (Rejouer, bandeau, extrait limité au composant) ; les stories d'acceptation du mouvement vont dans `*.qa.stories.ts`.
- `DESIGN.md` : la règle « Don't animer plus de 200 ms » devient « 200 ms au plus, sauf la cascade `lcReveal` (350 ms par élément) » (validé, Q3).

Test `novice-user` : sans objet sur le produit (aucun texte ni étape nouvelle) ; jalon manuel sur la page `Foundations/Motion` une fois construite (CA-17).

## 6. Cas limites et gestion des erreurs
- Changement de sélection pendant un glissement : la transition repart de la position courante, pas de saut.
- Onglets qui défilent : l'indicateur est dans le contenu qui défile et le suit ; l'onglet sélectionné reste ramené dans la vue (`scrollTabIntoView`).
- Onglets ou éléments ajoutés, retirés, libellé qui change de largeur, police chargée après coup, groupe déplié ou replié, nav `collapsed` : nouvelle mesure ; seule une sélection fait glisser.
- Aucun onglet ou élément actif : indicateur masqué.
- `lcNavItem` hors `lc-nav-list` : fond actif actuel, sans indicateur.
- Panneau refermé avant la fin de l'entrée : le fondu de sortie part de l'état courant ; réouverture pendant la sortie : le panneau reste ouvert.
- Composant détruit pendant une fermeture animée : `detach` et `close()` appelés immédiatement (pas de panneau orphelin).
- Retournement du panneau par le CDK après ouverture : la classe de sens suit, sans rejouer l'entrée.
- Animation annulée pendant l'attente : la fermeture a lieu quand même (`allSettled`).
- `prefers-reduced-motion: reduce` : durées et délais nuls ; fermetures immédiates.
- `forced-colors` : sélection et élément actif identifiables.
- Rendu serveur : mesures seulement dans les rappels de rendu navigateur (`afterRenderEffect`, `afterNextRender`) ; contrainte d'implémentation, sans critère.

## 7. Sécurité, performance, observabilité
- **Sécurité et données** : angle fermé (fiche de cadrage). Aucune donnée, aucun `innerHTML`.
- Performance : `opacity` et `transform` partout ; `width` / `height` seulement sur deux indicateurs en position absolue (pas de remise en page du reste) ; mesures regroupées dans les rappels de rendu et de `ResizeObserver` ; aucun minuteur JavaScript pour la cascade (`transition-delay`). Ajout au paquet : quelques centaines d'octets de JavaScript.
- Logs : avertissement en développement seulement pour un `lcRevealIndex` invalide.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| View Transitions (document) | déclaratif, partagé | Baseline 2025 ; masque menus et éléments fixes ; bloque les transitions simultanées | Non |
| View Transitions limitées à un élément | idéales pour un composant | Chrome/Edge 147 seulement | Non |
| `@angular/animations` | API Angular connue | dépréciée au profit du CSS natif, plus lourde | Non |
| `animate.enter` / `animate.leave` d'Angular | natif Angular | seule l'entrée serait gagnée (retraits immédiats décidés), au prix d'un couplage Angular et de `@keyframes` en plus ; ne couvre ni les panneaux CDK (portail) ni le `<dialog>` | Non (`architect`) |
| `@starting-style` + mesure + fermeture différée | CSS natif Baseline 2024, sans dépendance | un peu de code de mesure ; fermeture différée centralisée dans `lcDetachAnimated` | **Oui** |
| Indicateur par `anchor positioning` | sans mesure JS | hors cible | Non |
| Indicateur d'onglet en `scaleX` | `transform` seule | déforme le trait | Non |

## 9. Plan de test
- **Unitaires** (`senior-developer`, Vitest, jsdom ; aucun test de position, de CSS ni de transition) : `LcRevealDirective` (variable posée, plafond 7, index invalide avec avertissement en développement seulement) ; `lcDetachAnimated` avec `getAnimations` simulé (immédiat sans animation, attente avec, animation annulée, réouverture qui annule le retrait, destruction qui détache) ; classes `lc-overlay--above` / `--closing` ; dialogue fermé après la sortie ; `lc-tabs--ready` absente avant la première mesure ; enregistrement des `lcNavItem` et classe `lc-nav-item--indicated`.
- **Acceptation navigateur** (`qa-engineer`) : nouvelle commande `node tools/qa/storybook-browser.mjs motion` (Chromium par Playwright) sur le Storybook statique, stories `*.qa.stories.ts` ; contextes normal, `reducedMotion: 'reduce'`, `forcedColors: 'active'`, 360 et 1 280 px. Mesures par `getAnimations()` et `getComputedStyle` lues dans le même `evaluate` que l'action ; état de départ par `pause()` puis `currentTime = 0` ; fin par `finish()` ; `transform` comparé via `DOMMatrix` ; durées et distances comparées aux tokens résolus, jamais à des nombres écrits dans le test ; aucun `waitForTimeout`.
- **Tokens** (Vitest du workspace tokens) : CA-1.
- **Contrôles statiques** (Vitest, T8) : aucune valeur en dur (CA-15) ; aucun import d'un secondaire vers un autre ajouté.
- **Bout en bout** : parcours téléphone de `Data/Data table` à 360 px (ouvrir, déplier, appliquer, cartes en cascade, fermer par les trois sorties).
- **Manuel** : CA-17 (`novice-user`). Limite : Chromium seulement (Firefox et Safari non exécutés).
- Un test instable est un constat, pas une relance.

## 10. Critères d'acceptation
- [x] CA-1 : Les tokens de 5.2 existent dans la CSS générée avec ces valeurs, `easing-standard` et `easing-emphasized` inchangés ; `npm test --workspace @lionelcointot/ui-tokens` passe.
- [ ] CA-2 : `lc-tabs` : juste après le clic sur un autre onglet (même tâche), l'indicateur a une transition sur `transform` de durée `--lc-tabs-indicator-duration` résolue ; après `finish()`, son rectangle a la position et la largeur de l'onglet sélectionné (± 1 px). Aucune transition sur `left`.
- [ ] CA-2b : deux clics rapprochés : la seconde transition part de la position courante (différente de l'arrivée de la première) et finit sous le dernier onglet cliqué.
- [ ] CA-2c : aucun onglet sélectionné : indicateur masqué.
- [ ] CA-3 : `lc-tabs` : au premier affichage, aucune transition sur l'indicateur et `lc-tabs--ready` absente avant la première mesure ; dès la deuxième sélection, transition présente.
- [ ] CA-4 : `lc-tabs` à 360 px avec onglets qui défilent : après défilement de la liste (`scrollLeft`) puis après changement de largeur du viewport, le rectangle de l'indicateur reste sous l'onglet sélectionné (± 1 px).
- [ ] CA-4b : ajout ou retrait d'un onglet, ou changement de libellé : après le rappel du `ResizeObserver`, indicateur sous l'onglet sélectionné.
- [ ] CA-5 : `lc-nav-list` : (a) l'indicateur prend la position et la hauteur de l'élément actif (± 1 px) avec transition sur `transform` ; (b) élément actif dans un groupe replié : indicateur masqué ; (c) au dépliage, aucune transition sur `transform` à la première image ; (d) `lcNavItem` hors liste : fond actif sur l'élément.
- [x] CA-6 : `lcButton` (variantes pleine, contour, texte, icône) pendant l'appui (`mouse.down`) : `transform` calculé = échelle `--lc-button-press-scale` ; désactivé : `none`. Même chose pour le bouton « Filtres (N) ».
- [x] CA-7 : Pour `lc-menu`, `lc-combobox`, le calendrier de `lc-date-input`, celui de `lc-date-range-input` et le menu de filtre de `lc-data-table`, à l'ouverture : transitions sur `opacity` (0 → 1) et `transform` (décalage `--lc-sys-motion-offset` vers le haut → 0) ; avec `lc-overlay--above`, décalage de signe inverse (vérifié sur au moins `lc-menu` et `lc-combobox`).
- [x] CA-7b : changement de sens après ouverture : aucune nouvelle transition d'entrée.
- [x] CA-8 : (a) fermeture : `lc-overlay--closing` présent, transition d'opacité de `--lc-overlay-exit-duration`, panneau retiré du DOM après ; (b) réouverture pendant le fondu : panneau présent, classe retirée ; (c) après fermeture au clavier, `document.activeElement` est le déclencheur.
- [x] CA-9 : `lcReveal` : élément inséré avec transitions sur `opacity` et `transform` ; `transition-delay` calculé pour les index 0, 3, 7, 12 = 0, 3, 7, 7 × `--lc-reveal-stagger` ; index invalide → 0 et un avertissement en développement uniquement.
- [ ] CA-10 : Panneau de filtres du téléphone : entrée en fondu-descente avec `::backdrop` en fondu ; pour chacune des trois sorties (croix, Échap, « Afficher N … ») : `data-closing` posé puis `dialog.open === false` après la fin du fondu.
- [ ] CA-11 : (a) section dépliée : corps en fondu-descente ; (b) pastille ajoutée : transition d'opacité de `--lc-chip-enter-duration` ; (c) pastille retirée : absente du DOM immédiatement, aucune transition sur ses voisines.
- [ ] CA-12 : Cartes du téléphone : `transition-delay` croissant pour les cartes 1 à 8, aucun délai ni transition pour la 9e et suivantes ; cascade rejouée après « Afficher N … » ; aucune transition au défilement ni au chargement suivant.
- [ ] CA-13 : Avec `reducedMotion: 'reduce'`, pour les indicateurs, le bouton, les cinq panneaux, le dialogue et les cartes : durée et délai calculés ≤ 0,01 ms ; panneaux et dialogue fermés sans attente.
- [ ] CA-14 : En `forced-colors: active`, l'onglet sélectionné et l'élément de nav actif ont une bordure, un contour ou un fond calculé non transparent et différent de celui d'un élément inactif.
- [ ] CA-15 : Contrôle automatique : aucun motif `\d+(ms|s|px)`, `cubic-bezier(` ni `scale(0.` hors `var(--lc-…)` dans les `.css` et `.ts` touchés (tabs, nav-list, nav-item, button, menu, combobox, date-input, date-range-input, data-table, reveal, `ui-angular.css`) ; fichiers de tokens exclus.
- [ ] CA-16a : `Foundations/Motion` et les 8 stories `Animation` de 5.4 s'ouvrent sans erreur de page.
- [ ] CA-16b : « Rejouer » relance l'animation (`getAnimations().length > 0` juste après le clic).
- [ ] CA-16c : bandeau présent avec `reducedMotion: 'reduce'`, absent sinon.
- [ ] CA-16d : `node tools/qa/storybook-controls.mjs` et le contrôle axe (clair et sombre) passent.
- [ ] CA-16e : `CONVENTIONS.md` contient la règle de la story `Animation` ; `DESIGN.md` porte l'exception de durée.
- [ ] CA-17 (manuel) : test `novice-user` sur `Foundations/Motion` : COMPRIS.
- [ ] CA-20 : Après un changement de filtre ou de tri, une ligne ou carte conservée (même clé) garde son élément DOM et joue une animation de `transform` de sa position précédente à la nouvelle ; aucune cascade ne se rejoue.
- [ ] CA-21 : Une ligne ou carte ajoutée apparaît en fondu à sa place ; ses voisines glissent (CA-20).
- [ ] CA-22 : Une ligne ou carte retirée reste dans le DOM le temps d'un fondu (`--lc-overlay-exit-duration`), puis disparaît et les suivantes glissent pour combler.
- [ ] CA-23 : Avec `prefers-reduced-motion: reduce`, aucun glissement ni fondu de liste ; premier affichage : cascade inchangée (CA-12).
- [ ] CA-24 : `--lc-sys-easing-spring` (`linear(…)` d'un ressort sans rebond : valeurs croissantes de 0 à 1, aucune > 1) et `--lc-sys-duration-move` (500 ms) existent et servent aux déplacements des lignes, du trait des onglets et du fond de la nav latérale ; fondus et entrées gardent `easing-standard` et leurs durées.
- [ ] CA-18 : `npx ng test ui-angular --watch=false` passe sans modification ni suppression d'un test existant (vérifié sur le diff) ; `npm run catalogue:check` passe après régénération.

## 11. Découpage en tâches
- [x] T1 : tokens `ref`, `sys` et de composant ; délais dans la règle de réduction de `base.css` ; tests des tokens (S, CA-1, CA-13).
- [x] T2 : `LcRevealDirective`, `lcDetachAnimated`, styles globaux de `[lcReveal]` et de l'appui du bouton (S, CA-6, CA-9, CA-15).
- [x] T3 : entrée et sortie des panneaux CDK (`lc-menu`, `lc-combobox`, calendriers de `lc-date-input` et `lc-date-range-input`, remplacement de `lc-calendar-fade`), classes de sens et de fermeture (M, CA-7, CA-7b, CA-8, CA-15).
- [x] T4 : indicateur de `lc-tabs` (M, CA-2 à CA-4b, CA-14, CA-15).
- [x] T5 : indicateur de `lc-nav-list` (M, CA-5, CA-14, CA-15).
- [ ] T6 : `lc-data-table` : menu de filtre, dialogue du téléphone, sections, pastilles, cartes (M, CA-7, CA-8, CA-10 à CA-12, CA-15).
- [ ] T6b : différence de liste animée sur `lc-data-table` (cartes et lignes, décision 26) et retouches de relecture de T6 (jeton de fermeture du dialogue, tests du menu pendant le fondu, `pendingReveal` en erreur) (M, CA-20 à CA-23).
- [ ] T6c : tokens `--lc-sys-easing-spring` (ressort sans rebond) et `--lc-sys-duration-move` (500 ms), tokens `--lc-list-move-*`, appliqués aux déplacements des lignes, du trait des onglets et du fond de la nav latérale (S, CA-24).
- [ ] T7 : Storybook (`Foundations/Motion`, `Foundations/Elevation`, stories `Animation`, bandeau), `CONVENTIONS.md`, `DESIGN.md`, catalogue (M, CA-16a à CA-16e, CA-17, CA-18).
- [ ] T8 (QA) : commande `motion` de `storybook-browser.mjs`, stories d'acceptation, contrôles statiques (CA-13, CA-15, et preuves de tous les CA navigateur).

## 12. Risques et questions ouvertes
- **Choix confirmés par l'utilisateur le 2026-11-21** : Q1 `Foundations/Motion` remplace la section Motion (page renommée `Foundations/Elevation`) ; Q2 le calendrier perd `lc-calendar-fade` au profit de l'entrée commune ; Q3 exception de `DESIGN.md` à 350 ms pour la cascade ; Q4 nouvelle durée `long` 350 ms (plutôt que `slow` 300 ms) ; Q5 `lcTooltip`, `lc-toggletip`, `lc-drawer` inchangés, calendrier de `lc-date-range-input` inclus.
- **Dettes** : fermeture différée à appeler pour chaque nouveau panneau CDK (centralisée dans `lcDetachAnimated`) ; à revoir si `overlay` et `display` en `allow-discrete` deviennent Baseline (revue annuelle, ADR 0009) ; preuves en Chromium seulement.
- **Questions ouvertes** : aucune autre.

## 13. Relectures et écarts
- 2026-11-21, `cadreur` (mode cadrage) : AMBIGUÏTÉS. Retenu : question du déclenchement citée, lecture de « nav bar », revue de la Baseline, valeurs de la décision 9 déclarées provisoires. Écarté : remise en cause des décisions 1, 3, 4, 5, 8, 10, 12, 16 (proposées une à une et validées explicitement par l'utilisateur). À traiter dans la conception : onglets qui défilent horizontalement (l'indicateur suit le défilement), changement rapide pendant une animation, onglets ajoutés ou retirés, `forced-colors`, conflit de nom avec la méthode interne `LcTabsComponent.reveal()`. Baseline vérifiée : `@starting-style` 2024-08-06, `ResizeObserver` 2020.
- 2026-11-21, `cadreur` (mode spec) : ÉCARTS, aucun bloquant. Retenu : question `animate.*` close (section 8), `duration-long` explicite en section 0, largeur de l'indicateur décrite, superpositions exclues (Q5), `lc-date-range-input` ajouté, CA-15 rattaché à T3–T6, CA-17 manuel, bouton « Filtres (N) » dans CA-6. Écarté : non-objectif des lignes du tableau (retiré).
- 2026-11-21, `qa-engineer` (plan de test) : À PRÉCISER. Retenu : méthode de mesure (section 9), CA-2, 7, 8, 13, 14, 16 réécrits ou éclatés, CA-2b, 2c, 4b, 7b ajoutés, délais coupés en réduction (T1), CA-17 manuel, rendu serveur sans critère.
- 2026-11-21, `ui-ux-designer` (brief) : FAIT. Retenu : tableau 5.4, Storybook, bandeau, `Layout/Reveal`, tokens des sections et pastilles. Questions Q1, Q2, Q3 posées à l'utilisateur. Écarté : `scaleX` (avis `architect`).
- 2026-11-21, `architect` : RÉSERVES. Retenu : `easing-emphasized` non créé (la courbe choisie est `standard`), `lcDetachAnimated` au lieu d'une logique copiée cinq fois, `lc-nav-list` (élément hors liste, enregistrement par `isActiveChange`, mesure par rectangle, remesures), indicateur d'onglet `aria-hidden` et largeur par `width`, `@starting-style` plutôt que `animate.*`, `overlay` non utilisé, `allSettled`. Question Q4 posée à l'utilisateur.
- 2026-11-21, T1 livrée : tokens `ref`/`sys`/composant de 5.2 (composants regroupés dans `motion.tokens.json`, bouton dans `button.tokens.json`), délais coupés en réduction dans `base.css`, `motion` exclu du thème builder comme `duration` et `easing`. `qa-engineer` : CA-1 (21 tests) vert, 73/73 tests des tokens ; `code-reviewer` APPROUVÉ.
- 2026-11-21, `code-reviewer` (T2) : CHANGEMENTS REQUIS. Bloquant : `lcDetachAnimated` attendait aussi les animations infinies (spinner, squelette…) et ne détachait jamais un panneau qui en contient ; corrigé (filtre sur les animations finies, 5.1 mise à jour). Retenu aussi : avertissement dans la JSDoc de `lcReveal` (transition et délai restent posés sur l'hôte).
- 2026-11-21, T2 livrée : `LcRevealDirective`, `lcDetachAnimated` (animations infinies ignorées), entrée de `[lcReveal]` dans `ui-angular.css`, appui dans `button.component.css` (là où les boutons sont stylés). 2 005 tests verts ; `code-reviewer` APPROUVÉ après correctif. CA-6 et CA-9 restent à prouver en navigateur (T8) ; pas de test « aucun avertissement en production » (`isDevMode` non simulable).
- 2026-11-21, T4 codée : indicateur de `lc-tabs` (mesure dans les rappels de rendu, écriture directe dans le DOM pour garder l'ordre classe/position synchrone, glissement seulement si l'onglet sélectionné change, `--instant` sur redimensionnement, ajout d'onglet ou focus ; bordure de l'onglet conservée en `forced-colors`). 2 020 tests ; `code-reviewer` APPROUVÉ après correctifs. CA-2 à CA-4b et CA-14 restent à prouver en navigateur (T8).
- 2026-11-21, `code-reviewer` (T3) : CHANGEMENTS REQUIS tant que non prouvé en navigateur : le CDK pose la classe de position après le premier calcul de style, l'entrée « au-dessus » risque de jouer à l'envers. En attente de la preuve Chromium (qa-engineer).
- 2026-11-21, `qa-engineer` (T8 partiel, Chromium, `storybook-browser.mjs motion`, 214 OK / 32 KO) : GO CA-6, CA-8, CA-9, CA-13 (éléments livrés) ; NO-GO CA-7 : l'entrée des panneaux ne jouait jamais (cause : `@starting-style` et calcul de style du CDK avant `panelClass`) ; correctif en `@keyframes` demandé (5.1 mise à jour). Limites relevées : pendant le fondu de sortie (100 ms), le fond transparent du CDK avale un clic de souris (réouverture au clavier seulement) ; `lc-date-range-input` à 360 px place son calendrier ni au-dessus ni au-dessous du champ (antérieur, hors périmètre, à examiner).
- 2026-11-21, T5 codée : fond glissant de `lc-nav-list` (enregistrement des éléments via `isActiveChange`, mesure par rectangle, glissement seulement au changement d'élément actif, remesure instantanée au repli et au redimensionnement). Défaut bloquant trouvé en relecture (la lecture suivie d'`activeItem` relançait la remesure instantanée et annulait le glissement), corrigé avec `untracked` ; test qui échoue sans le correctif vérifié par la session principale. 2 026 tests stables ; `code-reviewer` APPROUVÉ. Fuite d'un faux `matchMedia` dans les tests de `lc-tabs` (suite instable) trouvée et corrigée. CA-5 et CA-14 restent à prouver en navigateur (T8).
- 2026-11-21, correctif T3 : une propriété animée par `@keyframes` ne déclenche pas de transition ; pour qu'une fermeture pendant l'entrée garde son fondu, l'entrée est posée sur le contenu du panneau et la sortie sur son conteneur (décision de la session principale). Limite acceptée : pendant le fondu de sortie (100 ms), un clic de souris est avalé par le fond du CDK.
- 2026-11-21, `qa-engineer` (Chromium, `storybook-browser.mjs motion`, 290 OK) : GO CA-6, CA-7 (4 panneaux, haut et bas, 3 contextes, 2 largeurs), CA-7b (à 1 280 px), CA-8 (dont fermeture pendant l'entrée), CA-9, CA-13 partiel (bouton, `lcReveal`, panneaux). Menu de filtre et bouton « Filtres (N) » couverts avec T6. **Limite connue, antérieure** : à 360 px, le calendrier de `lc-date-range-input` recouvre le champ (positions de `calendar-overlay.ts` non modifiées par T3 ; contrôle de placement passé en information).
- 2026-11-21, T3 livrée : `code-reviewer` APPROUVÉ sur le CSS final (entrée `@keyframes` sur le contenu, sens par variable héritée, sortie sur le conteneur) ; sélecteur `.lc-data-table__overlay` à confirmer en T6.
