# Spec : mouvement v2 (refonte du mouvement du kit sur le modèle de Talmo)

- **Statut** : Validée le 2026-11-26 par l'utilisateur (« ok »), choix par défaut du §12 compris
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-26
- **ADR liés** : [0001 Tokens](../adr/0001-design-tokens.md) (amendé par l'ADR 0011 : portée du contrôle des valeurs en dur) · [0009 Cible navigateurs](../adr/0009-cible-navigateurs-et-primitives-natives.md) (inchangé : `Intl.Segmenter`, propriétés individuelles de transformation, `inert`, `dvh` sont dans la cible ; la révélation circulaire du thème, postérieure, a un repli écrit et testé) · [0010 Options groupées](../adr/0010-options-groupees.md) (non déclenché) · [0011 Système de mouvement](../adr/0011-systeme-de-mouvement.md)
- **Remplace** : la décision « mouvement sobre » de [2026-11-mouvement](2026-11-mouvement.md) et les valeurs de [2026-11-mouvement-ios](2026-11-mouvement-ios.md) (dont sa décision 20 « `lc-drawer` n'est pas modifié ») ; leurs mécanismes non cités ici restent valables (dont la feuille en carte sur grand écran, décision 22 de 2026-11-mouvement-ios)
- **Consommateurs** : copro-ticket (tableaux de bord gestionnaire et copropriétaire, à venir) ; toute application qui met le kit à jour hérite du mouvement
- **Référence d'inspiration** : https://demo.codeandchill.store/talmo/
- **Maquettes et preuves** : [`docs/design/explorations/2026-12-mouvement-v2/`](../design/explorations/2026-12-mouvement-v2/) — [catalogue.html](../design/explorations/2026-12-mouvement-v2/catalogue.html) (63 démos mesurées contre le site, **source des valeurs**), [comparaison-navigation.html](../design/explorations/2026-12-mouvement-v2/comparaison-navigation.html), [navigation-pages.html](../design/explorations/2026-12-mouvement-v2/navigation-pages.html), [decisions.md](../design/explorations/2026-12-mouvement-v2/decisions.md), [contre-expertise.md](../design/explorations/2026-12-mouvement-v2/contre-expertise.md), [essais/](../design/explorations/2026-12-mouvement-v2/essais/) (3 essais techniques, tous concluants), `inventaires/` (150 animations relevées sur ordinateur, 50 sur téléphone, matrice de faisabilité)

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « en fait mon objectif est de reproduire cette motion design reactive, agreable pour l'utilisateur et refondre le motion de ui kit actuelle »
  - « qu'est ce que tu propose dans ui afin d'avoir cette meme souplesse, cad qu'un utilisateur peut facilement rajouter sur ces propre composant angular les motion » ; « Et je tiens a préciser qu'on peut refondre ui kit il y a pas de soucis pour éviter de dupliquer »
  - « proposer une structure pour ui kit afin de proposer ses animations prenium facilement, intuitivement dans nos composant, de maniere strcuturé factorisé etc... »
  - « j'ai l'impression qu'il manque énormément d'animation ( sur le texte par exemple), j'aurai aimé voir toute les animations qu'on pourrai faire »
  - « et ben juste prenium et pas sobre » ; « oui le but c'est harmoniser »
  - « les composant mobile aussi ? auront un rendu visuel coherent ? »
  - « un peu a la maniere d'ios dans reglage par exemple quand on va dans une rubrique et qu'on clique sur retour, ca fait une animation vers l'avant ou l'arriere »
  - « et du coup une navbar à gauche sur desktop devient les bouton en bas de navigation sur mobile automatiquement ? » puis « ca me va »
- **Besoin en trois phrases** : Le mouvement actuel du kit est sobre et pauvre comparé au site Talmo que l'utilisateur veut reproduire. Le kit doit adopter le mouvement de Talmo comme seul mouvement, harmonisé sur tous ses composants (ordinateur et téléphone), sans code dupliqué, et offrir aux développeurs d'application des attributs simples pour animer leurs propres éléments sans connaître les courbes ni les durées. Les transitions entre pages (glissement selon le sens sur ordinateur, empilement façon iOS sur téléphone) et la barre d'onglets en bas sur téléphone font partie de la refonte.
- **Décisions de l'utilisateur** (2026-11-25 et 2026-11-26 ; numéros de [decisions.md](../design/explorations/2026-12-mouvement-v2/decisions.md), cités « D-n » dans la spec) :
  - D-1 refonte autorisée, sans doublon ; D-2 premium seul (valeurs Talmo par défaut, pas de registre sobre ni de `data-lc-motion`) ; D-3 harmoniser en bloc ; D-4 toutes les valeurs dans les tokens, réglables par le thème ; D-5 consommateurs : tableaux de bord de copro-ticket, la règle « pas de composant sans consommateur » reste ; D-6 structure de la contre-expertise sans registres ; D-7 variantes `rise` / `drop` / `fade` / `scale` / `pop` / `left` / `right` (proposées, non contestées ; `tilt` ajoutée par la démo d03, à confirmer à la validation) ;
  - D-8 composants mobiles inclus ; D-9 navigation hiérarchique façon iOS ; D-10 voile des feuilles qui suit le geste ; D-11 appui du bouton du kit gardé ; D-12 révélation circulaire du thème avec repli ; D-13 point « live » autorisé ; D-14 essais techniques avant la spec ; D-15 glisser-déposer et boutons magnétiques hors kit ;
  - D-16 changement de page sur téléphone : empilement iOS ; D-17 même niveau sur ordinateur : glissement selon l'ordre du menu ; D-18 barre d'onglets en bas sur téléphone (au plus 4 rubriques principales + « Plus » ; sans rubrique marquée, tiroir ; tablette : tiroir) ;
  - D-19 `lc-dialog` et `lc-drawer` en feuille du bas sur téléphone ; D-20 sélecteur segmenté : pastille qui glisse partout ; D-21 onglets : cascade à la première ouverture seulement ; D-22 « Plus » ouvre le tiroir existant.
  - Le chantier ne touche que le repo ui-kit ; copro-ticket est adapté par une autre session (§12).
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : dossier `motion/`, retrait de code existant, transitions de page dans `layout`, registre de navigation, contrat public changé.
  - [x] Écran : tous les composants animés ; direction choisie sur maquettes (catalogue, comparaison A/B).
  - [ ] Sécurité et données : fermé — aucune donnée lue, écrite ni transmise ; la copie figée de la page quittée reste dans le même document, `inert`, `aria-hidden`, sans `id` ni `name`, médias en pause, quelques centaines de millisecondes (§7).

## 1. Contexte et problème
Le kit a livré le 2026-11-21 un mouvement « sobre » (8 px, 350 ms, une seule courbe en S). L'utilisateur l'a comparé au site Talmo et le juge pauvre : pas de titres animés, pas de compteurs, de tracés, de jauges, de rebond, ni de transitions entre pages. Les relevés en navigateur réel montrent que le vocabulaire de Talmo (courbes qui décélèrent longtemps, léger dépassement, 0,15 à 1 s) n'est pas exprimable avec les tokens actuels. Côté développeur d'application, seul `[lcReveal]` existe ; il ne gère ni la sortie, ni les cascades à travers ses propres composants, ni les grilles, et son implémentation (transition permanente sur `transform`) entre en conflit avec le survol et la réorganisation de liste (contre-expertise B1, essai 2 : saut de 20 px). Le code de mouvement est dispersé (data-table, message-thread, core) et en partie dupliqué.

## 2. Objectifs
- **O1 — Vocabulaire Talmo** : les tokens expriment les courbes, durées, distances, échelles, angles et décalages de Talmo, et deviennent les valeurs par défaut du kit.
- **O2 — Primitives pour les applications** : un développeur anime ses propres éléments avec des attributs (`lcReveal`, `lcStagger`, `lcFill`, `lcDraw`, `lcCountUp`, `lcFlash`, `lcSplitText`, `lcFlip`) et une échappatoire (`lcAnimate`), sans écrire de durée ni de courbe.
- **O3 — Composants harmonisés** : tous les composants animés du kit adoptent les valeurs de Talmo, ordinateur et téléphone (dont les fenêtres en feuille du bas sur téléphone).
- **O4 — Transitions entre pages** : dans `lc-app-shell`, le kit déduit le sens de navigation et anime le changement de page (ordinateur : glissement selon le sens ; téléphone : empilement iOS, retour au geste, bouton retour libellé avec le titre de la page parente), à condition que l'application déclare des routes imbriquées avec un `title`.
- **O5 — Navigation mobile** : `lc-app-shell` présente une barre d'onglets en bas sur téléphone.
- **O6 — Accessibilité, robustesse, performance** : mouvement réduit = aucun mouvement, partout (CSS et JavaScript) ; rendu serveur et lecteurs d'écran corrects ; seules des propriétés bon marché sont animées.
- **O7 — Documentation** : Storybook montre et rejoue chaque mouvement, avec un guide « besoin → primitive » écrit en mots simples.
- **O8 — Pas de doublon** : un seul endroit par mécanisme ; l'ancien code de mouvement qui fait double emploi est retiré.

## 3. Hors périmètre (non-objectifs)
- Registre « sobre » ou réglage d'intensité par attribut (D-2) ; une application calme le mouvement par son thème.
- Glisser-déposer et boutons magnétiques (D-15) : recettes dans la documentation.
- Dévoilement au défilement (« on-visible ») : Talmo n'en a pas.
- Transitions entre pages par l'API View Transitions (hors Baseline 2024) ; seule la révélation du thème l'utilise, avec repli.
- Morphing de tracés SVG au-delà de ce qu'ECharts fait déjà ; composant `lc-progress-ring` (un anneau se compose avec `lcDraw` sur un `circle`).
- Palette de recherche (⌘K) : le kit n'a pas ce composant.
- Feuille « Toutes les pages » (D-22 : « Plus » ouvre le tiroir).
- Transition de page pour un changement de paramètres (`?query`) ou de fragment.
- Mise en CI des suites navigateur (§12 : choix par défaut).
- Adaptation de copro-ticket et des autres consommateurs (autre session) ; la spec liste ce qui change pour eux (§12).
- Provider ou options de configuration (`provideLcMotion`) : les tokens sont la configuration.

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : le développeur d'une application qui utilise le kit (l'utilisateur et ses agents ; « qu'un utilisateur peut facilement rajouter sur ces propre composant angular les motion »). Il connaît Angular, pas les courbes ni le motion design. Utilisateur final : la personne qui utilise l'application (ex. gestionnaire ou copropriétaire), sur ordinateur et sur téléphone.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Développeur | Met le kit à jour | Tous les composants du kit bougent comme Talmo, sans autre action |
| Développeur | Anime une liste de ses propres cartes | `lcStagger` sur le conteneur, `lcReveal` sur chaque carte : cascade à l'entrée, sortie animée au retrait, aucun rejeu quand la liste est réordonnée |
| Développeur | Affiche un KPI, une jauge, un anneau, un titre | `lcCountUp`, `lcFill`, `lcDraw`, `lcSplitText` avec une valeur ; apparition et changement de valeur animés |
| Développeur | Veut un mouvement spécial (ressort, élastique) | `lcAnimate(element, keyframes, { duration: 'move', easing: 'pop' })`, mouvement réduit géré |
| Développeur | Ajuste une vitesse pour son application | Change un token dans son thème `.tokens.json` |
| Utilisateur final (ordinateur) | Ouvre une demande depuis la liste, revient | Le contenu glisse vers l'avant puis vers l'arrière ; barre latérale et en-tête immobiles |
| Utilisateur final (téléphone) | Ouvre une demande, revient au doigt | Empilement iOS, « ‹ Mes demandes » en haut, retour en tirant depuis le bord gauche |
| Utilisateur final | A activé « réduire les animations » | Tout change instantanément |

## 5. Solution proposée

### 5.1 Vue d'ensemble de l'architecture
Quatre couches, une responsabilité chacune :

1. **Tokens** (`packages/tokens`) : valeurs brutes dans `ref/scale.tokens.json`, rôles dans `sys/default.tokens.json` (pas de fichier de registre), réglages par composant dans `components/motion.tokens.json` avec repli sur `sys`. Coupure « mouvement réduit » inchangée dans `base.css`. Tout ce qu'un thème peut vouloir changer est un token (durées, courbes, délais, distances, échelles, angles, décalages) ; les seuils de geste (1/3 de hauteur, vitesses, largeur de la bande de bord, facteur d'élastique) sont des constantes nommées et documentées dans le code (choix par défaut, §12).
2. **Runtime** (`packages/angular/src/lib/motion/runtime/`, point d'entrée principal, **sans dépendance au routeur**) : lecture des tokens sur l'élément, garde « mouvement réduit » pour tout chemin JavaScript, `lcAnimate`, compteur de cascade, lecture de positions par lot. Les fichiers motion de `core/` y déménagent.
3. **Primitives** (`packages/angular/src/lib/motion/directives/` + `packages/angular/styles/motion.css`) : directives d'attribut ; le CSS anime, la directive pose classes et variables (sauf compteur, découpage du titre et FLIP).
4. **Composants** : ils consomment tokens et primitives ; ils ne posent pas `lcReveal` sur leur propre hôte et un élément qui a son propre `animate.leave` ne porte pas `lcReveal` (pas de double animation).

**Transitions entre pages** (`packages/angular/layout/src/page-transitions/`) : service `LcPageNav` (sens, niveaux, parent, titre) et directive `lcPageTransitions`. `lc-app-shell` pose la directive sur sa zone de contenu `<main class="lc-shell__main">` (le shell projette le contenu de l'application, qui contient son `<router-outlet>`) : elle clone les enfants de `main` et n'a pas besoin de connaître l'outlet. Sans routeur fourni, aucun événement n'arrive et la directive reste inerte. Seul `layout` dépend de `@angular/router` (déjà dépendance pair du paquet).

**Registre de navigation** (`packages/angular/src/lib/navigation-registry.ts`, principal) : `LcNavRegistry` reçoit `{ url, label, icon, primary }` de chaque `a[lcNavItem]` (qui s'y inscrit) ; `lc-app-shell` y lit l'ordre des rubriques (pour le sens « même niveau ») et les rubriques principales (barre d'onglets). Aucun import `layout → navigation` (règle de CLAUDE.md respectée, aucune exception nouvelle).

**Règle de propriété des propriétés CSS** (ADR 0011) : apparition et sortie animent `opacity` et les propriétés individuelles `translate` / `scale` / `rotate` ; FLIP et survol animent `transform` ; un composant possède seul ses indicateurs.

**Contrat public et interne** : `index.ts` exporte publiquement les directives, `lcAnimate`, les types (`LcRevealVariant`, `LcMotionDuration`, `LcMotionEasing`, `LcMotionToken`, `LcStaggerPace`, `LcFillAxis`) ; les outils du runtime (`motion-tokens`, `stagger`, `flip`, `indicator-rect`, `detach-animated`, `reduced-motion`) sont exportés avec `@internal` (les points d'entrée secondaires en ont besoin), comme `reduced-motion.ts` aujourd'hui. `LcPageNav` est public (l'en-tête d'une application peut lire le titre parent) ; `lcPageTransitions` est `@internal` (posée par le shell).

```
ui-kit/
├── package.json                                  − @angular/animations (le kit ne l'importe ni ne le déclare ;
│                                                 il reste dépendance pair de Storybook)
├── packages/tokens/
│   ├── src/ref/scale.tokens.json                 valeurs brutes de mouvement
│   ├── src/sys/default.tokens.json               rôles (§5.2)
│   ├── src/components/motion.tokens.json         par composant, repli sur sys (§5.2)
│   ├── src/base.css                              coupure « mouvement réduit » (inchangée)
│   └── lib/motion.*.test.mjs                     tests réécrits aux nouvelles valeurs (§9)
├── packages/angular/src/
│   ├── public-api.ts                             + export * from './lib/motion', navigation-registry
│   └── lib/
│       ├── navigation-registry.ts                LcNavRegistry
│       └── motion/
│           ├── index.ts
│           ├── motion.types.ts
│           ├── runtime/
│           │   ├── motion-tokens.ts              lecture sur l'hôte, un appel par lot (@internal)
│           │   ├── reduced-motion.ts             (déplacé de core/, @internal)
│           │   ├── animate.ts                    lcAnimate (public)
│           │   ├── stagger.ts                    compteur par lot, plafond (@internal)
│           │   ├── flip.ts                       lecture par lot, seuil 0,5 px, lecture des tokens list-move (@internal)
│           │   ├── detach-animated.ts            (déplacé, @internal)
│           │   └── indicator-rect.ts             (déplacé, @internal)
│           └── directives/
│               ├── reveal.directive.ts           [lcReveal] entrée + sortie, [lcRevealIndex]
│               ├── stagger.directive.ts          [lcStagger]
│               ├── fill.directive.ts             [lcFill] lcFillAxis
│               ├── draw.directive.ts             [lcDraw]
│               ├── count-up.directive.ts         [lcCountUp] lcCountUpFormat
│               ├── flash.directive.ts            [lcFlash]
│               ├── split-text.directive.ts       [lcSplitText]
│               └── flip.directive.ts             [lcFlip]
├── packages/angular/styles/
│   ├── ui-angular.css                            @import "motion.css" ; ancien bloc [lcReveal] retiré
│   └── motion.css                                @keyframes, .lc-reveal, .lc-leave, .lc-pulse, .lc-lift
├── packages/angular/layout/src/
│   ├── page-transitions/                         LcPageNav (public), lcPageTransitions (@internal)
│   └── app-shell/                                transitions, barre d'onglets en bas, en-tête mobile
├── packages/angular/navigation/src/nav-list/     a[lcNavItem] : entrée primary, inscription au registre
├── packages/angular/{navigation,forms,overlay,feedback,data,charts}/…   composants harmonisés (§5.4)
├── tools/qa/
│   ├── motion-fidelity.mjs                       empreintes du catalogue et comparaison aux stories
│   ├── page-transitions-browser.mjs              porté depuis l'essai 3
│   └── storybook-browser.mjs                     commande motion étendue (CSSAnimation, WAAPI)
└── docs/
    ├── adr/0011-systeme-de-mouvement.md
    ├── design/explorations/2026-12-mouvement-v2/fidelite.json   empreintes versionnées
    └── storybook/foundations/motion.stories.ts   page refaite (§5.4.5)
```

**Disparaissent** : le bloc `[lcReveal] { transition… }` et `@starting-style` de `ui-angular.css` ; dans `message-thread-motion.ts`, ce qui fait double emploi (`ArrivalTracker`, sa mesure par le bas, `normalizePageSize` restent dans message-thread ; `cssMs` passe au runtime sous le nom `lcCssMs` en T2, `staggerDelay` y passe en T7) ; la lecture par lot dupliquée de data-table (son gel des lignes reste) ; les fichiers motion de `core/` ; la déclaration de `@angular/animations`.

**Remplacer une brique** : changer une valeur = un token ; changer une courbe d'un composant = son token composant ; ajouter un mouvement = token + règle dans `motion.css` (ou directive) + story Animation + story QA + ligne de fidélité ; remplacer la technique des transitions de page (par View Transitions un jour) = seul `lcPageTransitions` change.

### 5.2 Modèle de données (tokens)
Pas de données métier ; les tokens sont le contrat public. Les rôles `sys` référencent les valeurs `ref`. Valeurs tirées du catalogue (démo citée) ; T1 publie la table « valeur de §5.4 → token » et la vérifie (CA-2).

**Courbes** `--lc-sys-easing-*` :

| Rôle | Valeur | Démos |
|---|---|---|
| `standard` | `cubic-bezier(0.2, 0, 0, 1)` (inchangé) | — |
| `entrance` | `cubic-bezier(0.16, 1, 0.3, 1)` (expo.out) | d04, d20, d25, d54 |
| `fill` | `cubic-bezier(0.2, 1, 0.3, 1)` | d09, d21 |
| `soft` | `cubic-bezier(0.34, 1, 0.64, 1)` | cascades d06-d09 |
| `out` | `cubic-bezier(0.215, 0.61, 0.355, 1)` (power3.out) | compteur d14, survol d31, voile d25 |
| `pop` | `cubic-bezier(0.34, 1.7, 0.64, 1)` (dépassement 12-15 %) | d26, d28, d29, d39, d46, d47 |
| `pop-strong` | `cubic-bezier(0.34, 2, 0.64, 1)` | d13 |
| `title` | `cubic-bezier(0.22, 1, 0.36, 1)` (power4.out) | d01, d16, bord avant d10 |
| `draw` | `cubic-bezier(0.455, 0.03, 0.515, 0.955)` (power2.inOut) | d19, d24, d33, d49, d52 |
| `inout` | `cubic-bezier(0.645, 0.045, 0.355, 1)` (power3.inOut) | trait d02, bord arrière d10 |
| `exit` | `cubic-bezier(0.42, 0, 1, 1)` | d25, d26, d54 |
| `stack` | `cubic-bezier(0.32, 0.72, 0, 1)` | d53 |

Le ressort de la feuille (`back.out(1.6)`, d54) et l'élastique ne sont pas des `cubic-bezier` : `lc-sheet` les joue en `lcAnimate` avec `pop` (écart consigné en dette, mesuré par CA-1).

**Durées** `--lc-sys-duration-*` (noms existants gardés quand le rôle ne change pas ; changements listés plus bas) :

| Rôle | Valeur | Usage |
|---|---|---|
| `fast` | 150 ms | fermetures de menu et popover, fondus courts |
| `exit` | 200 ms | sorties (toast 250 ms en token composant) |
| `normal` | 250 ms | voiles, petits fondus |
| `slow` | 350 ms | survol, ouverture de menu |
| `enter` | 450 ms | apparitions, pops, toasts |
| `move` | 500 ms | empilement iOS, indicateurs |
| `long` | 600 ms | feuilles, panneaux |
| `view` | 700 ms | entrée de page ordinateur |
| `title` | 850 ms | titre lettre par lettre |
| `draw` | 900 ms | jauges, carte de charge, tracés, compteurs |

**Distances, décalages, échelles, angles** : `--lc-sys-motion-offset-{sm|md|lg|xl}` = 8 / 16 / 26 / 40 px ; `--lc-sys-motion-stagger-{fine|normal|cards|chars}` = 12 / 40 / 67 / 22 ms ; `--lc-sys-motion-stagger-cap` = 8 rangs ; `--lc-sys-motion-scale-{pop|enter}` = 0,94 / 0,95 ; `--lc-sys-motion-rotate-{tilt|char}` = 2,5° / 6°.

**Tokens composant** (`components/motion.tokens.json`, tous posés par T1 pour éviter les conflits entre tâches) : `button.press-duration` 100 ms et `button.press-scale` 0,97 (D-11, découplés de `duration-fast`) ; `spinner.duration` 700 ms, `skeleton.duration`, boucles de chargement (découplées de `duration-slow`) ; `shell.nav-duration` (valeur actuelle) ; `tabs.*`, `nav-item.*` (deux bords : avant 380 ms `title`, arrière 400 ms `inout` décalé de 80 ms) ; `segmented-control.*` (deux bords : 300 ms `out` / 410 ms `inout` décalé de 75 ms) ; `tabbar.*` (entrée 750 ms après 265 ms, 90 px) ; `page.exit-*` (190 ms, 16 px), `page.enter-*` (700 ms, 26 px), `page.stack-*` (500 ms, recul 30 %, voile 0,12) ; `dialog.*` (échelle 0,91, 500 ms, fermeture 150 ms) ; `drawer.*` (550 ms, fermeture 300 ms, voile 300/200 ms) ; `sheet.*` (600 ms, fermeture 300 ms, ressort 500 ms, coins 24 px, hauteur max 92 dvh) ; `popover.*` (450 ms, échelle 0,95, −3,7 px, fermeture 150 ms) ; `menu.*` (350 ms, échelle 0,94, fermeture 140 ms) ; `toast.*` (entrée 500 ms y 28 px échelle 0,95, sortie 250 ms, durée de vie existante) ; `switch.*` (465 ms `pop`) ; `steps.*` (800 ms, décalage 117 ms) ; `flash.*` (950 ms `title`) ; `title.*` (lettres ≈ 115 %, trait 550 ms `inout` démarrant 390 ms après la première lettre) ; `live.*` (2 000 ms, opacité 0,1 → 0,45) ; `lift.*` (−4 px, 350 ms `out`) ; `calendar.*` (±18 px, 450 ms, 30 ms par ligne) ; `list.move-*` (420 ms `draw`) ; `chart.*` (sparkline 1 000 ms `draw`, re-calcul 480 ms décalage 20 ms) ; `topbar.enter-*` (10 px, 450 ms, décalage 33 ms, au chargement seulement) ; `disclosure.*` (ouverture 300 ms, fermeture 100 ms, −5 px).

**Changements de contrat** (phase de développement : rupture franche, sans alias) : `duration-fast` 100 → 150 ms, `duration-slow` 300 → 350 ms, `duration-long` 350 → 600 ms, `duration-normal` 200 → 250 ms ; nouveaux rôles `exit`, `enter`, `view`, `title`, `draw` ; `--lc-sys-motion-offset` et `--lc-sys-motion-stagger` (feuilles) deviennent des groupes et disparaissent sous ces noms ; `--lc-ref-motion-stagger` aussi. La liste complète des tokens supprimés et renommés est publiée par T1 dans `CATALOGUE.md` et dans §12.

### 5.3 API / interfaces
Directives standalone, exportées par `@lionelcointot/ui-angular`, sans entrée de durée ni de courbe (les tokens les fournissent).

| API | Entrées | Comportement |
|---|---|---|
| `[lcReveal]` | `lcReveal: '' \| LcRevealVariant` (`'rise' \| 'drop' \| 'fade' \| 'scale' \| 'pop' \| 'left' \| 'right' \| 'tilt'`, `''` = `rise`) ; `lcRevealIndex?: number` | Entrée : classe `lc-reveal` (keyframes + `backwards`) liée à un signal, retirée à `animationend` (aucun rejeu au déplacement, essai 1) ; au premier `afterNextRender`, si aucune animation ne tourne (rendu serveur, animation déjà finie), la classe est retirée. Sortie : `animate.leave: 'lc-leave'` déclaré dans `host`. `tilt` = 40 px, échelle 0,95, ±2,5° alterné (cartes, d03) |
| `[lcStagger]` | `lcStagger: '' \| LcStaggerPace` (`'fine' \| 'normal' \| 'cards'`, défaut `normal`) | Fournit un compteur de lot ; chaque `lcReveal` descendant (y compris dans un composant enfant, par injection) prend son rang à sa création auprès du `lcStagger` le plus proche ; lot remis à zéro en microtâche ; délai = `min(rang, cap) × décalage` calculé en CSS. `lcRevealIndex` l'emporte |
| `[lcFill]` | `lcFill: number` (0 à 1) ; `lcFillAxis: 'x' \| 'y'` (défaut `x` ; `y` pour les cartes de charge, d22) | Écrit `--lc-progress` ; le CSS anime `scale` depuis l'origine de l'axe ; anime de 0 à la valeur à l'apparition (côté navigateur) et d'une valeur à l'autre au changement ; valeur finale présente au premier rendu |
| `[lcDraw]` | `lcDraw: number` (0 à 1) | Sur `path`, `circle`, `line`, `polyline` : pose `pathLength="1"` et `--lc-progress` ; le CSS anime `stroke-dashoffset` ; même cycle que `lcFill` |
| `[lcCountUp]` | `lcCountUp: number` ; `lcCountUpFormat: LcValueFormat` (défaut `'number'`, comme `lc-data-table`) | Texte final écrit dès le premier rendu (serveur compris), formaté par `LcFormatService` ; compte de 0 à la valeur à la première apparition côté navigateur (jamais à l'hydratation d'un texte déjà affiché), et de l'ancienne à la nouvelle valeur au changement ; valeurs intermédiaires arrondies selon le format ; aucune annonce des valeurs intermédiaires ; rAF annulé à la destruction |
| `[lcFlash]` | `lcFlash: unknown` | Ignore la première valeur ; à chaque changement, couleur accent → couleur du texte (`flash.*`). Réservé aux chiffres : un badge de statut ne flashe pas (d17, d44) |
| `[lcSplitText]` | `lcSplitText: string` | La directive possède le contenu : découpe en graphèmes (`Intl.Segmenter`) côté navigateur seulement, un masque par mot, lettres en `translate` ≈ 115 % + `rotate` 6° → 0, décalage `stagger-chars` ; `aria-label` sur l'hôte, lettres `aria-hidden` ; texte non découpé sous mouvement réduit et au rendu serveur |
| `[lcFlip]` | `lcFlip: readonly unknown[]` (liste immuable, celle que parcourt le `@for`) | Instantané des positions visibles dans `ngOnChanges`, diff dans `afterRenderEffect` (essai 2) ; enfants directs sauf `[data-leaving]` ; seuil 0,5 px ; `transform` WAAPI aux tokens `list.move-*` ; un deuxième changement en cours annule les animations puis relit |
| `lcAnimate(el, keyframes, { duration, easing, delay?, fill? })` | `duration: LcMotionDuration \| LcMotionToken`, `easing: LcMotionEasing \| LcMotionToken` (nom de rôle `sys` ou token composant `--lc-…`, pour garder le réglage par thème des tokens de §5.2) ; `delay` en ms ; `fill` (défaut `backwards`) | WAAPI avec valeurs lues dans les tokens de l'élément ; sous mouvement réduit ou sans `Element.animate`, renvoie une animation déjà finie dont seuls `playState`, `finished`, `cancel` et `finish` sont garantis ; un token absent donne durée 0 et courbe `linear` |
| `LcPageNav` (service, `layout`) | — | Signaux `direction` (`'none' \| 'forward' \| 'back' \| 'same'`), `level`, `parent` (`{ title, url } \| null`), `title` lus dans les `title` des routes au `ResolveEnd` |
| `lcPageTransitions` (posée par `lc-app-shell`, `@internal`) | — (lit `LcNavRegistry`) | Copie figée de la page quittée, animations, focus, geste (§5.4.3) |
| `a[lcNavItem]` | nouvelle entrée `primary: boolean` | Inscrit la rubrique au registre ; au plus 4 `primary` utilisés |
| `LcNavRegistry` (principal) | — | Liste ordonnée `{ url, label, icon, primary }` |
| Classes CSS | `.lc-pulse`, `.lc-lift` | Point « live » (décoratif, jamais seul porteur d'information, arrêté par le mouvement réduit) ; soulèvement au survol avec pointeur fin |
| Libellés `LC_LABELS` (fr / en) | `primaryNavigation` (Navigation principale / Main navigation), `moreNavigation` (Plus / More), `back` (Retour / Back), `backTo` (Retour à {titre} / Back to {title}) | Barre d'onglets, bouton retour (nom accessible contenant le texte visible) |

Erreurs : usage incorrect non bloquant = avertissement console en développement (`isDevMode()`), état final affiché, jamais d'exception : `lcDraw` hors SVG ; plus de 4 `primary` (les 4 premiers sont gardés). Une liste modifiée en place n'est pas détectable par `lcFlip` (même référence) : la documentation l'interdit.

### 5.4 Interface utilisateur
**Utilisateur principal** : le développeur d'application (textes de la page Foundations/Motion) ; utilisateur final (textes de navigation).

**Direction choisie par l'utilisateur** : mouvement de Talmo, seul mouvement du kit (catalogue de 63 démos, source des valeurs) ; empilement iOS sur téléphone et glissement selon l'ordre du menu sur ordinateur (comparaison A/B, options B) ; voile des feuilles qui suit le geste ; appui du bouton du kit gardé ; fenêtres en feuille du bas sur téléphone ; pastille glissante pour le sélecteur segmenté ; cascade des onglets à la première ouverture. Principe : le mouvement n'ajoute jamais d'information, il montre d'où vient et où va un élément.

#### 5.4.1 Composants harmonisés (ordinateur)
| Composant | Mouvement | Démos |
|---|---|---|
| `lc-app-shell` | entrée de la barre du haut au chargement seulement (10 px, 450 ms, décalage 33 ms), jamais rejouée à la navigation | d05 |
| Titre de page (`lc-page`) | `lcSplitText` ; trait sous le titre 550 ms `inout`, démarrant 390 ms après la première lettre | d01, d02 |
| `lc-nav-list`, `lc-nav-group` | indicateur à deux bords : avant 380 ms `title`, arrière 400 ms `inout` décalé de 80 ms ; repli du groupe comme `lc-disclosure` | d10, d48 |
| `lc-tabs` | même indicateur à deux bords (choix du kit : le trait de Talmo ne glisse pas, d12) ; cascade du panneau à la première ouverture seulement (D-21) ; aucune animation au premier rendu | d10, d45 |
| `lc-segmented-control` | pastille à deux bords (300 ms `out` / 410 ms `inout` décalé de 75 ms) partout (D-20) | d62 |
| `button[lcButton]` | enfoncement 0,97 / 100 ms gardé (D-11) | — |
| `lc-switch` | bouton qui glisse 465 ms `pop` (dépassement ≈ 2,75 px), piste de couleur 200 ms | d46 |
| `lc-stepper` | barres tracées l'une après l'autre (800 ms, décalage 117 ms) ; pastille courante en pop 600 ms `pop-strong`, décalage 40 ms | d13, d51 |
| `lc-progress-bar`, `lc-timeline-bar`, barres de `lc-file-upload` et `lc-message-composer` | `lcFill` 900 ms `fill`, décalage 39 ms (la barre de `file-upload` et `message-composer` passe de `width` à `lcFill` ; leur bande indéterminée reste) | d09, d21 |
| `lc-kpi-card` | entrée `tilt` ; `lcCountUp` (900 ms `out`) ; `lcFlash` au changement ; aucun effet au survol | d03, d14, d15, d16 |
| `lc-status-badge`, `lc-tooltip`, survol de ligne, anneau de sélection d'une date | aucun mouvement, exprès | d17, d44, d50, d41 |
| `lc-dialog` | ouverture depuis l'élément qui l'a déclenché (rectangle de l'élément actif à l'ouverture ; clavier : centre du déclencheur), échelle 0,91 → 1, `pop`, 500 ms ; fermeture 150 ms `exit`, échelle 0,95 ; sous 768 px : feuille du bas (D-19) | d26, d56 |
| `lc-drawer` | 550 ms `entrance`, fermeture 300 ms `exit`, voile 300 / 200 ms, contenu en cascade ; sous 768 px : feuille du bas (D-19) | d25 |
| `lc-menu`, liste de `lc-combobox`, calendrier de `lc-date-input` / `lc-date-range-input` | pop depuis l'ancrage : échelle 0,94, `pop`, 350 ms ; fermeture 140 ms | d28 |
| `lc-toggletip` | popover : échelle 0,95, y −3,7 px, `pop`, 450 ms, fermeture 150 ms | d39 |
| `lc-toast` (aujourd'hui sans animation) | entrée y 28 px + échelle 0,95, `pop`, 500 ms ; sortie 250 ms | d29 |
| `lc-data-table`, `lc-table` | lignes en cascade (8 px, 450 ms `soft`, décalage 40 ms) ; changement de filtre : liste vidée puis cascade ; tri : lignes qui glissent (420 ms `draw`) ; suppression d'une ligne : sortie puis glissement des voisines (gel conservé, CA-22 de 2026-11-mouvement) | d07, d08, d33, d36 |
| `lc-message-thread` | comportement inchangé ; décalage et tokens communs | — |
| `lc-activity-feed`, `lc-tree-table`, `lc-description-list` | cascade d'entrée (`lcStagger`) | d06, d07 |
| `lc-card` | `.lc-lift` au survol (pointeur fin) | d31 |
| Calendrier (`lc-date-input`) | changement de mois : glissement ±18 px selon le sens, 450 ms, 30 ms par ligne ; liste du jour en re-fondu | d41, d61 |
| `lc-chart` | durée et courbe ECharts depuis les tokens (table « rôle → nom ECharts » écrite par T11) ; sparkline 1 000 ms ; re-calcul 480 ms, décalage 20 ms ; animation coupée sous mouvement réduit | d19, d24 |
| `lc-theme-toggle` | révélation circulaire depuis le bouton, 450 ms, `cubic-bezier(.65,0,.35,1)`, par View Transitions ; repli : bascule instantanée ; pas d'appel à View Transitions sous mouvement réduit | d37 |
| `lc-disclosure` | ouverture ≈ 300 ms (hauteur + fondu, −5 px), fermeture 100 ms, chevron 300 ms | d48 |
| `lc-swipe-panels` | valeurs `entrance` / `long` (sans démo) | — |
| `lc-spinner`, `lc-skeleton`, `button` en chargement, `lcTruncate`, `lc-slider`, champs, `lc-chart-frame` | comportement gardé, valeurs recalées sur les tokens (découplées des rôles qui changent) | d42 |

#### 5.4.2 Téléphone (< 768 px)
| Élément | Mouvement | Démos |
|---|---|---|
| `lc-sheet` | ouverture 600 ms `entrance`, fermeture 300 ms `exit` ; hauteur max 92 dvh, coins 24 px (20 px pour un dialogue) ; geste depuis la poignée ou l'en-tête (le corps défile) ; fermeture si distance > 1/3 de la hauteur ou vitesse > 0,6 px/ms, sinon ressort 500 ms (dépassement ≈ 9-10 %) ; vers le haut, élastique quasi rigide ; voile = 1 − distance / hauteur (D-10) ; sur grand écran : carte (inchangé) | d54, d55, d56 |
| `lc-dialog`, `lc-drawer` | présentés en `lc-sheet` (D-19) ; confirmation en `role="alertdialog"` | d56 |
| Barre d'onglets en bas (`lc-app-shell`) | élément `nav` ; entrée y 90 → 0 après 265 ms, 750 ms ; pastille active à deux bords (avant 300 ms, arrière 410 ms décalé de 75 ms) ; « Plus » ouvre le tiroir existant (D-22), marqué actif quand la page courante n'est pas dans les 4 onglets ; affichée et masquée par media query CSS (pas de flash au rendu serveur) | d57 |
| En-tête mobile | niveau 1 : sans bouton retour ; niveau ≥ 2 : bouton `‹ titre parent` (44 px de haut, titre tronqué avec ellipse, nom accessible « Retour à {titre} ») ; titre de la page en fondu 200 ms au-delà de 80 px de défilement (copie décorative `aria-hidden`) | d53, d59 |
| `lc-toast` | au-dessus de la barre d'onglets (16 px) | d60 |
| `lc-segmented-control` à 360 px | réduit pour ne pas dépasser de l'écran (Talmo dépasse de 9 px) | d63 |
| Survol | `.lc-lift` et effets de survol inactifs sans pointeur fin | — |

#### 5.4.3 Transitions entre pages (`lc-app-shell` + `lcPageTransitions`)
- **Déclenchement** : seulement si le chemin change (pas pour `?query`, fragment ou `skipLocationChange`) ; désactivable pour une route par `data: { lcPageTransition: false }`.
- **Sens** (essai 3, fonction pure testée) : lien direct ou premier affichage = aucune animation ; retour ou avance du navigateur = selon la position dans une copie de la pile d'historique (les `navigationId` du routeur ne sont pas fiables après un retour) ; navigation dans l'application = page plus profonde : avancer, moins profonde : reculer ; même profondeur : selon l'ordre des rubriques du registre (plus bas : avancer, plus haut : reculer, identique : fondu) ; redirections : sens calculé sur l'URL finale ; `replaceUrl` géré.
- **Ordinateur** : seule la zone de contenu bouge ; sortie 190 ms (fondu + −16 px dans le sens), entrée +26 px → 0 en 700 ms `entrance` (comparaison, question 2, option B).
- **Téléphone** : empilement iOS : nouvelle page depuis la droite (100 % → 0), ancienne qui recule de 30 % avec un voile jusqu'à 0,12, 500 ms `stack` ; reculer = inverse (d53, comparaison question 1 B).
- **Retour au geste** (< 768 px) : bande de 20 px au bord gauche (`touch-action: pan-y`) ; la page suit le doigt, la copie de la page précédente est visible dessous en parallaxe ; engagé à 50 % de la largeur ou au-delà de 0,4 px/ms (valeurs de d53, vue par l'utilisateur) ; sinon retour en place, durée proportionnelle à la distance restante (minimum 180 ms) ; lien direct sans copie : fond neutre portant le titre du parent ; le geste ne s'active pas au-dessus d'un `lc-swipe-panels` ni d'une `lc-sheet` ouverte.
- **Copie figée** : `cloneNode(true)` prise au `ResolveEnd`, insérée au `NavigationEnd` en `position: fixed` à son rectangle d'avant, `inert`, `aria-hidden`, sans `id` ni `name`, `<video>` et `<audio>` en pause, retirée à la fin de sa propre animation.
- **Accessibilité** : une seule page interactive, un seul `h1` dans l'arbre d'accessibilité, focus sur le `h1` de la nouvelle page (`tabindex="-1"` posé par `lc-page` ; repli sur `#lc-main` sans `h1`), aucun `id` en double, défilement conservé (l'application active `scrollPositionRestoration: 'enabled'`).
- **Alternatives aux gestes** (WCAG 2.5.1) : retour au geste = bouton `‹ titre parent` ; feuille = croix, Échap, toucher le voile.

#### 5.4.4 États
- Nominal : mouvement complet aux valeurs des tokens.
- Mouvement réduit (système) : aucun mouvement, état final immédiat ; en Storybook, bandeau `lc-story-motion-notice`.
- Premier affichage et lien direct : aucune animation de page.
- Interrompu : un deuxième changement repart de la valeur visible, sans saut ; navigations en rafale : chaque copie disparaît à la fin de sa sortie.
- Erreur d'usage non bloquante : avertissement en développement, état final.
- Sans `Element.animate` ou sans `startViewTransition` : état final, thème basculé instantanément.
- Rendu serveur : textes, valeurs et positions finales dans le HTML.
- Titre de route dynamique non résolu : « Retour » seul, puis le titre quand il arrive, sans animation de remplacement.
- Couleurs forcées : pastilles et indicateurs restent visibles (contour `Highlight` sur l'élément actif).

#### 5.4.5 Page Foundations/Motion (refaite)
Contenu en français (contenu de démo, comme le prévoit `docs/storybook/CONVENTIONS.md`), noms de stories et JSDoc en anglais. Phrase d'ouverture : « Les composants du kit bougent déjà sans que vous fassiez rien. Cette page sert à animer vos propres éléments : un attribut par besoin. Chaque ligne a un bouton Rejouer : il sert seulement à revoir la démonstration sur cette page, vous n'avez rien à écrire pour lui. Les crochets `[…]` servent à donner une valeur qui change, par exemple `total()`, votre propre donnée. » Puis, dans l'ordre :
1. **Tableau** (une ligne par besoin, bouton Rejouer) :

| Votre besoin | À poser | Ce qui se passe | Exemple |
|---|---|---|---|
| Un bloc apparaît | `lcReveal` | Il monte un peu et apparaît quand il s'affiche. | `<div lcReveal>…</div>` |
| Il apparaît autrement | `lcReveal="…"` | `rise` monte (par défaut), `drop` descend, `left` / `right` arrivent de côté, `pop` rebondit, `tilt` s'incline, `fade` apparaît sur place, `scale` grandit. | `<div lcReveal="pop">` |
| Un élément disparaît en douceur quand je le retire | `lcReveal` | Le même attribut le fait apparaître puis disparaître, qu'il soit retiré par un `@if` ou d'une liste `@for`. | `@for (c of cartes(); track c.id) { <div lcReveal>…</div> }` |
| Des éléments apparaissent l'un après l'autre | `lcStagger` sur le parent, `lcReveal` sur chaque enfant | Dès qu'ils s'affichent, chacun arrive un peu après le précédent. Le parent peut être n'importe quel conteneur. Le rythme est le délai entre deux éléments : court (`lcStagger="fine"`, pour beaucoup de petits éléments), normal (sans valeur), long (`lcStagger="cards"`, pour des cartes). | `<section lcStagger><article lcReveal>…</article></section>` |
| Un chiffre monte jusqu'à sa valeur | `lcCountUp` | À la première apparition il compte depuis 0 ; quand la valeur change, il compte de l'ancienne à la nouvelle (de 1 200 à 1 850). Le format s'ajoute avec `lcCountUpFormat` : `number` (par défaut, « 1 850 »), `integer`, `percent` (« 12 % »), `money` (« 1 850 € »). | `<span [lcCountUp]="total()" lcCountUpFormat="money"></span>` |
| Un chiffre change et doit attirer l'œil | `lcFlash` | Le nombre ne défile pas : il brille un instant de la couleur d'accent quand il change. | `<span [lcFlash]="total()">{{ total() }}</span>` |
| Une jauge ou une barre se remplit | `lcFill` | La valeur va de 0 (vide) à 1 (pleine) : 0.7 = 70 %. La barre part de vide à l'affichage puis suit la valeur. Vous lui donnez sa hauteur et sa couleur en CSS (sinon elle reste invisible), le kit anime le remplissage sur toute la largeur de son parent. | `<div class="ma-barre" [lcFill]="0.7"></div>` avec `.ma-barre { height: 8px; background: currentColor; }` |
| Un trait, un anneau ou une courbe se dessine | `lcDraw` | Le tracé se dessine de 0 à la valeur (0 à 1), sur un `path`, `circle` ou `line` d'un SVG. | `<circle [lcDraw]="0.7" … />` |
| Un titre apparaît lettre par lettre | `lcSplitText` | Les lettres montent l'une après l'autre ; le titre reste lu en entier par un lecteur d'écran. | `<h1 [lcSplitText]="titre()"></h1>` |
| Une liste se trie ou se filtre : les lignes glissent à leur place | `lcFlip` sur la liste | Quand l'ordre ou le contenu change, les lignes qui restent glissent jusqu'à leur nouvelle place. Triez ou filtrez une copie de la liste, jamais la liste elle-même : sinon rien ne bouge. | `<ul [lcFlip]="lignes()">` et, pour trier, `lignes.set([...lignes()].sort(parNom))` |
| Une page en remplace une autre | Rien | `lc-app-shell` s'en charge. | — |
| Un mouvement que rien ne couvre (ressort, rebond) | `lcAnimate` | Pour les développeurs avancés (voir « Recettes »). | `lcAnimate(el, …, { duration: 'move' })` |
| Changer la vitesse | Une valeur dans votre thème | Il y a un réglage par type de mouvement (apparitions, panneaux, jauges…), en millisecondes, à écrire dans le fichier de thème de votre application ou sur `:root` ; la liste complète de ces réglages, avec leur valeur de départ, est plus bas sur cette page (« Régler et couper »). | `:root { --lc-sys-duration-enter: 600ms; }` |
| Un utilisateur a coupé les animations sur son appareil | Rien | Tout s'affiche directement dans son état final, sans mouvement (le chiffre final, la barre remplie, les éléments visibles), y compris vos propres éléments animés (`lcReveal`, `lcFill`…). | — |
2. **Les courbes en langage simple** : une carte par courbe (tracé + pastille qui l'exécute + Rejouer), ex. « Entrée : part vite, finit très doucement. Pour les apparitions. » ; durées dites en mots (« clin d'œil », « survol », « apparition », « déplacement », « panneau », « page », « jauge »).
3. **Ce qui ne bouge pas, exprès** : survol d'une ligne, badge de statut, champ en erreur, info-bulle, sélection d'une date. « Ces éléments changent d'un coup : le mouvement ne doit pas distraire d'une information importante. »
4. **Régler et couper** : liste des réglages de vitesse (un par type de mouvement, avec sa valeur par défaut en millisecondes et où l'écrire), réglage d'accessibilité du système, simulation du mouvement réduit.
5. **Recettes** : glisser-déposer au ressort (d32-d35) et bouton magnétique (d30), avec `lcAnimate`.
Mots absents du premier écran : easing, courbe de Bézier, token, stagger, FLIP, graphème, WAAPI, keyframes (autorisés dans les notes « pour aller plus loin »).

#### 5.4.6 Test `novice-user` — retiré
Retiré le 2026-11-26 à la demande de l'utilisateur (« il faut retirer l'agent novice car il embête plus qu'il n'aide »), après deux passes sur les textes (5/5 besoins trouvés, constats intégrés à §5.4.5). La compréhension de la page Foundations/Motion est jugée par l'utilisateur sur Storybook. Protocole d'origine, pour mémoire : l'orchestrateur lançait l'agent `novice-user` deux fois : passe 1 sur les textes de §5.4.5 avant le code ; passe 2 sur les captures de la page réelle (1280 et 360 px) après T16. Situation : « Vous développez une application Angular avec un kit de composants. Vous ne savez pas ce qu'est une courbe d'animation. Pour chaque besoin, dites quel nom vous écririez et ce que vous pensez qu'il fait. » Besoins (passe 1) : quatre cartes qui apparaissent l'une après l'autre (`lcStagger` + `lcReveal`) ; une carte supprimée qui disparaît en douceur (`lcReveal`) ; un chiffre d'affaires qui monte de 1 200 à 1 850 (`lcCountUp`) ; une liste triée dont les lignes glissent (`lcFlip`) ; une barre qui se remplit à 70 % (`lcFill`) ; plus « un utilisateur a coupé les animations : que faire ? » (rien). Passe 2 : titre lettre par lettre, courbe qui se dessine, chiffre qui attire l'œil, changement de page, ressort au lâcher, même question finale. Ordre des besoins changé entre les passes. Réussite : 5 sur 5 depuis le seul tableau, réponse « rien » juste, statut `COMPRIS` ou `COMPRIS AVEC DIFFICULTÉ` avec seulement des constats « détail », aucun mot incompris sur le chemin principal. Échec : le designer corrige les textes, au plus 2 tours, puis question à l'utilisateur.

## 6. Cas limites et gestion des erreurs
- Mouvement réduit activé ou désactivé pendant la session : les déclenchements suivants suivent la nouvelle préférence (lecture à chaque appel).
- `animationend` jamais reçu (`animation: none`, élément masqué) : la classe d'entrée reste, sans effet visible ; rejeu possible au déplacement dans ce seul cas (accepté) ; le cas du rendu serveur est traité au premier `afterNextRender`.
- `@for` sans `track` stable : les éléments sont recréés, donc traités comme des arrivées (documenté).
- Deuxième changement pendant une animation (FLIP, compteur, jauge) : repart de la position ou valeur visible, sans saut.
- Navigation en rafale : chaque copie est retirée à la fin de sa propre animation.
- Même route réutilisée (`/demandes/42` → `/43`) : la copie assure la sortie.
- Page avec formulaire, `canvas` ou vidéo : la copie ne reproduit pas leur état pendant sa sortie (≈ 200 ms ; accepté) ; médias mis en pause.
- Changement de `?query` ou de fragment : aucune transition, focus inchangé.
- Application sans routeur : `lcPageTransitions` inerte (aucune copie, focus inchangé).
- Activation clavier d'une fenêtre : origine au centre du déclencheur.
- Safari iOS : son geste de retour natif déclenche un retour navigateur ; la directive ne rejoue pas une animation par-dessus (à vérifier sur appareil, CA-34b).
- Plus de 4 rubriques `primary` : les 4 premières sont gardées, avertissement.
- Navigateur sans `startViewTransition` : thème basculé instantanément ; sans `Element.animate` : état final partout.
- Rendu serveur : textes, valeurs et positions finales dans le HTML ; aucune mesure, lecture de token ni animation côté serveur (tout passe par `afterNextRender`).

## 7. Sécurité, performance, observabilité
- **Sécurité et données** : angle fermé. Aucune donnée lue, écrite, journalisée ni transmise. La copie figée contient ce que l'utilisateur voyait déjà, reste dans le même document, `inert`, `aria-hidden`, sans `id` ni `name` (les gestionnaires de mots de passe ne la voient pas), médias en pause, retirée à la fin de sa sortie. Aucun `innerHTML` (`cloneNode`).
- **Performance** (O6) : propriétés animées limitées (CA-5) ; lectures de positions groupées avant toute écriture (FLIP : 200 éléments, une lecture par lot, +1 calcul de mise en page, essai 2) ; cascade plafonnée à 8 rangs ; aucun `will-change` permanent ; un `getComputedStyle` par lot ; compteurs en rAF annulés à la destruction ; coût de `cloneNode` mesuré sur la plus grande page de la vitrine (§12).
- **Logs / métriques** : avertissements console en développement seulement.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| GSAP (comme Talmo) | courbes et ressorts exacts | dépendance de 30 Ko+, inutile pour 80 % des cas | Non |
| `@angular/animations` | intégré à Angular | déprécié au profit du CSS natif | Non (plus importé ni déclaré) |
| Point d'entrée secondaire `motion` | séparation visible | exceptions d'import pour tous les secondaires | Non |
| Transitions de page dans le principal | tout le mouvement au même endroit | le principal dépendrait du routeur | Non : `layout` |
| Registres sobre / premium (`data-lc-motion`) | choix par application | concept de plus, double maintenance | Non (D-2) |
| Transitions de page par View Transitions | API standard | hors Baseline 2024 | Non (copie figée, essai 3) |
| `animate.leave` sur la page routée | natif | rien quand la même route est réutilisée, `id` en double | Non (essai 3) |
| `lcStagger` par `contentChildren` | simple | ne traverse pas les composants, index trop tard au rendu serveur | Non |
| Instantané FLIP dans un `effect` | idiomatique | voit déjà le nouveau DOM | Non (essai 2) |
| Feuille « Toutes les pages » pour « Plus » | fidèle à Talmo | import `layout → overlay`, composant de plus | Non (D-22) |
| Import `layout → navigation` pour la barre d'onglets | direct | exception d'import | Non : registre |
| Un token par seuil de geste et amplitude (≈ 40 de plus) | tout réglable par thème | inflation de tokens (ADR 0001) | Non : constantes nommées (§12) |
| Test du rendu serveur avec `@angular/platform-server` | preuve réelle | dépendance de développement en plus | Non : simulation `PLATFORM_ID` serveur (§9) |

## 9. Plan de test
- **Unitaires** (`senior-developer`, Vitest sous jsdom — aucun mouvement ne s'y prouve, jsdom n'a ni `Element.animate` ni `getAnimations`) : lecture des tokens et repli ; garde mouvement réduit de `lcAnimate` ; compteur de cascade (lot, microtâche, plafond, `lcStagger` le plus proche) ; **fonction pure du sens de navigation** (un cas par ligne de §5.4.3) ; extraction des titres de routes ; découpage en graphèmes (e + accent combinant, emoji famille, drapeau = un graphème chacun) ; formatage du compteur ; registre de navigation ; avertissements de développement ; **rendu initial simulé côté serveur** (TestBed avec `PLATFORM_ID` serveur, espions sur `Element.animate`, `getBoundingClientRect`, `getComputedStyle`) pour `lcFill`, `lcDraw`, `lcCountUp`, `lcSplitText`, `lcReveal`.
- **Acceptation** (`qa-engineer`, à partir des `CA-n`) : stories `*.acceptance.qa.stories.ts` pilotées par `tools/qa/storybook-browser.mjs motion` (étendu aux `CSSAnimation` et aux animations WAAPI : aujourd'hui il ne mesure que les `CSSTransition`) : mesures `getAnimations()` + `getComputedStyle` dans le même `evaluate` que l'action, durées comparées aux tokens résolus, contextes normal / mouvement réduit / couleurs forcées, 360 et 1280 px, `axeRun` sur les stories de navigation et de feuille ; `ios-motion-browser.mjs` pour les gestes.
- **Fidélité** : `tools/qa/motion-fidelity.mjs --record` relève l'empreinte de chaque démo citée du catalogue (durée, délai, courbe, keyframes calculées, valeurs à 0 / 25 / 50 / 75 / 100 % ; démos en rAF échantillonnées) dans `fidelite.json` (versionné) ; la commande de comparaison mesure la story correspondante avec le même déclencheur. Table `dNN → story, sélecteurs, déclencheur` écrite par `qa-engineer` en T0. **Contrat des stories** (validé le 2026-11-27) : chaque démo de story vit dans `[data-demo="dNN"]` avec son bouton « Rejouer » à l'intérieur ; un déclencheur autre que « Rejouer » porte `data-trigger` ; un élément échantillonné en rAF (compteur, tracé) porte `data-sample` ; les ids de story de `fidelite.json` sont confirmés ou corrigés à la création de chaque story.
- **Bout en bout** : `tools/qa/page-transitions-browser.mjs` (porté depuis l'essai 3 avant la suppression des branches) avec un routeur réel : avancer, reculer, retour et avance navigateur, lien direct, `replaceUrl`, `redirectTo`, garde qui redirige, même niveau, `?query`, sans routeur, geste.
- **Architecture** : contrôle statique des valeurs en dur (`motion.static.test.mjs`, appelé « contrôle CA-15 » dans 2026-11-mouvement) étendu par glob ; aucun import de `@angular/animations` ; `lib/motion/` n'importe aucun point d'entrée secondaire ni `@angular/router` ; aucun `@keyframes`, `.animate(` ni `getAnimations` hors `lib/motion/`, `motion.css` et une liste blanche de composants ; `tools/qa/entrypoint-imports.test.mjs` vert sans nouvelle exception.
- **Tests existants à réécrire aux nouvelles valeurs** (dans la tâche qui change la valeur, jamais assouplis) : `packages/tokens/lib/motion.acceptance.test.mjs`, `motion.move.test.mjs` (T1) ; `tools/qa/ios-motion-browser.mjs` (seuils de feuille, dialogue, tiroir : T9) ; suites `motionList` de `storybook-browser.mjs` (T3, T7) ; `MOTION_STORIES` dérivé de l'index de Storybook (T16).
- **Gate de chaque tâche** : `npx ng test ui-angular --watch=false`, `npm test --workspace @lionelcointot/ui-tokens`, `npm run build`, `node tools/qa/storybook-browser.mjs motion` et `stories-motion`, `node tools/qa/ios-motion-browser.mjs` (tâches mobiles), `node tools/qa/page-transitions-browser.mjs` (T13 à T15), `node tools/qa/motion-fidelity.mjs` (familles de la tâche), `npm run catalogue:check`.
- **Manuel** : iPhone réel sous Safari pour le geste de retour (CA-34b).

## 10. Critères d'acceptation
Cochés à la livraison, avec le test qui les prouve. « Token » = valeur résolue lue dans le navigateur.

**Tokens et règles communes (O1, O6, O8)**
- [ ] CA-1 : Les rôles et tokens composant de §5.2 existent avec leurs valeurs ; pour chaque courbe, la valeur égale celle des démos citées à 1e-3 près, ou l'écart est consigné en dette avec un dépassement mesuré à ±2 points d'amplitude ; les durées sont égales à 1 ms près. (Test tokens + `motion-fidelity.mjs`.)
- [x] CA-1b : Un thème `.tokens.json` qui surcharge un rôle de mouvement (`duration.*`, `easing.*`, `motion.*`) et un token composant de mouvement est accepté par `npx lc-tokens check --theme <fichier>` et produit la valeur surchargée dans le CSS du thème (décision de l'utilisateur D-4).
- [x] CA-2 : Contrôle statique, par glob sur tous les `.css` et `.ts` de `packages/angular/**` hors `*.spec.ts`, `*.stories.ts`, `testing/` : aucune durée, `cubic-bezier`, mot-clé `ease*`, angle, distance de mouvement, `scale` / `rotate` / `translate` numérique, `duration` / `delay` numérique en TypeScript, `setTimeout` de mouvement, hors liste blanche écrite (chemin + motif + raison : constantes de geste nommées notamment) ; T1 publie la table « valeur de §5.4 → token » et le test vérifie que chaque ligne existe avec sa valeur.
- [ ] CA-3 : Sous mouvement réduit, pour chaque primitive et chaque composant de la liste de CA-38, en contextes 360 et 1280 px : toutes les durées et délais calculés ≤ 0,01 ms et aucune animation `running` ni `pending` une image après l'action ; état final immédiat (CSS et WAAPI) ; texte de `lcSplitText` non découpé ; compteurs à leur valeur finale.
- [x] CA-4 : Un changement de préférence de mouvement réduit en cours de session (`emulateMedia`, dans les deux sens) s'applique au déclenchement suivant.
- [ ] CA-5 : Toute animation observée (`getAnimations({ subtree: true })`, keyframes, `transitionProperty`) ne porte que `opacity`, `transform`, `translate`, `scale`, `rotate`, `stroke-dashoffset`, sauf la liste blanche écrite dans le test : `color` (`lcFlash`), `grid-template-rows` (`lc-disclosure`, `lc-nav-group`), largeur ou position des indicateurs listés par sélecteur, `inline-size` (barre latérale de `lc-app-shell`), `clip-path` (pastilles à deux bords, pseudo-éléments de View Transitions).
- [ ] CA-6 : `@angular/animations` n'est plus importé ni déclaré par le kit (`package.json` racine et `packages/angular/package.json`) ; build, tests et Storybook passent.
- [ ] CA-7 : L'ancien bloc `[lcReveal]` de `ui-angular.css` n'existe plus ; un élément `lcReveal` n'a qu'une animation d'entrée (`lc-reveal-in`, aucune `CSSTransition` sur `transform`) ; `staggerDelay` et `lcCssMs` n'existent qu'une fois (runtime) ; aucun `@keyframes`, `.animate(` ni `getAnimations` hors des emplacements autorisés.

**Primitives (O2)**
- [ ] CA-8 : `lcReveal` : un élément inséré joue sa variante avec les tokens (pour `rise` : de +distance à 0, opacité 0 → 1) ; les 8 variantes sont mesurées ; `lcReveal` (vide) et `lcReveal="rise"` compilent en AOT `strictTemplates`.
- [ ] CA-9 : `lcReveal` : un élément retiré par `@if` ou `@for` reste dans le DOM pendant sa sortie et disparaît à `animation.finished` + 50 ms au plus ; sous mouvement réduit, en ≤ 70 ms (délai de retrait du DOM).
- [ ] CA-10 : `lcReveal` dans un `@for` : inverser 7 éléments ne relance aucune animation d'entrée ; ajouter un élément n'anime que lui ; après rendu serveur simulé, la classe `lc-reveal` est retirée au premier rendu côté navigateur si aucune animation ne tourne.
- [ ] CA-11 : `lcStagger` : des `lcReveal` placés dans un composant enfant reçoivent un rang du `lcStagger` le plus proche ; le délai du rang n vaut `min(n, cap) ×` le décalage choisi (`normal` par défaut, `fine`, `cards`) ; sur 500 éléments, `dernier animationend − premier animationstart ≤ cap × décalage + durée + 50 ms` ; `lcRevealIndex` impose le rang.
- [ ] CA-12 : `lcFill` : au rendu initial simulé côté serveur, `--lc-progress` vaut la valeur finale et aucune mesure ni `Element.animate` n'est appelé ; à l'apparition puis au changement de valeur, `scale` est animé avec les tokens ; l'axe `y` part du bas.
- [ ] CA-13 : `lcDraw` : `pathLength` vaut 1 et le tracé final vaut `1 − valeur` ; apparition et changement animés ; même contrôle de rendu initial que CA-12.
- [ ] CA-14 : `lcCountUp` : le texte final formaté par `LcFormatService` (format choisi) est dans le rendu initial simulé côté serveur ; à la première apparition côté navigateur, le texte compte de 0 à la valeur (échantillons rAF monotones, fin à la valeur exacte) ; au changement, de l'ancienne à la nouvelle ; la directive n'ajoute ni ne modifie de région `aria-live` ; `cancelAnimationFrame` est appelé à la destruction.
- [ ] CA-15 : `lcFlash` : aucun flash à la première valeur ; un flash à chaque changement, couleur et durée des tokens.
- [ ] CA-16 : `lcSplitText` : l'hôte porte `aria-label` = texte complet, les lettres `aria-hidden` ; les cas de graphèmes du test unitaire restent entiers ; changer le texte met à jour l'affichage ; les lettres partent de ≈ 115 % et 6° avec le décalage `stagger-chars` ; au rendu serveur et sous mouvement réduit, aucun `span` de lettre.
- [ ] CA-17 : `lcFlip` : en inversion, filtrage et ajout, chaque élément conservé a, à `currentTime = 0`, un `transform` égal à ancienne − nouvelle position (± 0,5 px) et finit à sa nouvelle place ; un deuxième changement en cours ne provoque aucun saut ; sur 200 éléments, l'instrumentation montre toutes les lectures de position avant la première écriture.
- [ ] CA-18 : Une entrée `lcReveal` et un FLIP simultanés sur un même élément : déplacement maximal par image ≤ celui du FLIP seul + 0,5 px.
- [x] CA-19 : `lcAnimate` lit durée et courbe par nom de rôle dans les tokens de l'élément et renvoie une animation terminée sous mouvement réduit ou quand `Element.animate` est absent (`delete Element.prototype.animate`).

**Composants (O3)**
- [ ] CA-20 : Fidélité : pour chaque démo citée en §5.4.1 et §5.4.2, la mesure de sa story (durée et délai à ±0,5 ms, courbe selon CA-1, keyframes à ±1 % de l'amplitude ou ±0,5 px, ordre et décalage des cascades à ±0,5 ms ; démos en rAF : temps à progression égale à ±16,7 ms) égale l'empreinte de `fidelite.json` ; une démo citée sans story ou sans ligne dans la table fait échouer le contrôle.
- [ ] CA-21 : `lc-tabs`, `lc-nav-list`, `lc-segmented-control` : indicateur ou pastille à deux bords (bord arrière décalé) ; aucune animation au premier affichage ; un onglet déjà ouvert ne rejoue pas la cascade de son contenu.
- [ ] CA-22 : `button[lcButton]` : l'appui lit `--lc-button-press-*` (0,97, 100 ms).
- [ ] CA-23 : `lc-dialog` : l'origine de transformation est le centre de l'élément déclencheur, à la souris comme au clavier ; sous 768 px, `lc-dialog` et `lc-drawer` se présentent en `lc-sheet` (aux largeurs 767 et 768 px).
- [ ] CA-24 : `lc-sheet` : ouverture et fermeture aux tokens ; tirer de 31 % ramène, de 36 % ferme ; un geste à 0,45 px/ms ramène, à 1,75 px/ms ferme ; le retour dépasse de 10 ± 3 % ; le voile vaut 1 − distance / hauteur (± 0,02) ; tirer vers le haut de 160 px déplace la feuille de moins de 1 px ; glisser dans le corps défile (`scrollTop` change) sans déplacer la feuille ; sur grand écran, carte inchangée.
- [ ] CA-25 : `lc-toast` a une entrée et une sortie animées aux tokens ; sur téléphone il s'affiche 16 px au-dessus de la barre d'onglets.
- [ ] CA-26 : `lc-data-table` : cascade d'entrée, filtre (liste vidée puis cascade), tri (glissement) et suppression (sortie puis glissement des voisines) aux tokens ; les suites `motionList` réécrites passent.
- [ ] CA-27 : `lc-message-thread` : `node tools/qa/message-thread-browser.mjs` passe avec les tokens communs.
- [ ] CA-28 : `lc-chart` : un espion sur `setOption` montre `animationDuration` = token résolu et `animationEasing` = nom ECharts de la table de T11 ; sous mouvement réduit, `animation: false`.
- [ ] CA-29 : `lc-theme-toggle` : avec View Transitions, le cercle part à ±1 px du centre du bouton, son rayon final atteint le coin le plus éloigné, durée = token ; sous mouvement réduit ou sans `document.startViewTransition` (supprimé par `addInitScript`), bascule en une image sans erreur.
- [ ] CA-30 : `.lc-pulse` pulse de 0,1 à 0,45 d'opacité sur 2 s en boucle (tokens `live.*`) ; `.lc-lift` soulève de 4 px en 350 ms au survol avec un pointeur fin, rien quand `(pointer: coarse)` (contexte `hasTouch`, `isMobile`).
- [ ] CA-31 : À 360 px, aucune story de la liste de CA-38 ne crée de défilement horizontal de la page (`scrollWidth ≤ clientWidth`) à 0, 50 et 100 % de ses animations, feuilles et empilement compris.

**Navigation (O4, O5)**
- [ ] CA-32 : La fonction de sens donne le bon résultat pour chaque cas de §5.4.3 (lien direct, avancer, reculer, retour navigateur y compris vers une page plus profonde, avance navigateur, `replaceUrl`, `redirectTo`, garde qui redirige, même niveau plus bas / plus haut / identique) ; `page-transitions-browser.mjs` vérifie les mêmes cas avec un routeur réel ; un changement de `?query` ou de fragment et une route `data: { lcPageTransition: false }` ne déclenchent rien ; sans routeur, rien ne se passe.
- [ ] CA-33 : Ordinateur : pendant une transition, la barre latérale et l'en-tête ne bougent pas ; la zone de contenu sort et entre aux tokens `page.*`. Téléphone : empilement aux tokens `page.stack-*` dans les deux sens ; à partir du niveau 2, le bouton retour affiche le titre de la page parente (lien direct profond et titre dynamique compris), son nom accessible contient ce texte.
- [ ] CA-34a : Retour au geste (Chromium tactile, 360 px) : tirer de 20 % ramène la page sans naviguer ; tirer de 70 % ou au-delà de 0,4 px/ms navigue vers la page précédente sans rejouer la transition ; l'URL ne change pas pendant le geste ; la copie de la page précédente est présente dessous (`inert`).
- [ ] CA-34b : Manuel, iPhone réel sous Safari : le geste de retour natif ne produit pas de seconde animation ; procédure et résultat consignés au §13. Sans cette vérification, CA-34 n'est pas coché.
- [ ] CA-35 : Pendant et après toute transition, à chaque image : une seule page interactive, un seul `h1` hors `[inert]` et `[aria-hidden]`, aucun `id` en double ; focus sur le `h1` de la nouvelle page ; défilement de la page quittée conservé pendant sa sortie ; après 4 navigations en rafale et la durée maximale écoulée, aucune copie ne reste.
- [ ] CA-36 : `lc-app-shell` : sous 768 px, barre d'onglets `nav` (`aria-label` « Navigation principale », onglet courant `aria-current="page"`, cibles ≥ 44 px) avec les rubriques `primary` (au plus 4) et « Plus », qui ouvre le tiroir existant ; entrée et pastille aux tokens `tabbar.*` ; titre de l'en-tête en fondu au-delà de 80 px ; sans rubrique `primary`, tiroir actuel ; de 768 à 1023 px, tiroir actuel ; vérifié à 767, 768, 1023 et 1024 px ; `axeRun` sans violation.

**Documentation (O7)**
- [ ] CA-37 : La page Foundations/Motion suit §5.4.5 (tableau « Votre besoin / À poser / Ce qui se passe / Exemple », courbes en langage simple, ce qui ne bouge pas, réglages, recettes glisser-déposer et bouton magnétique), chaque ligne a un bouton Rejouer qui relance une animation, et aucun mot de la liste interdite n'apparaît sur le premier écran.
- [ ] CA-38 : Chaque primitive et chaque composant de §5.4.1 et §5.4.2 a une story Animation avec Rejouer ; la liste est dérivée de l'index de Storybook (plus de liste codée en dur) et sert aux CA-3 et CA-31.
- [ ] CA-39 : `CATALOGUE.md` liste les primitives, les rôles de tokens, les tokens composant et les tokens supprimés ou renommés ; `npm run catalogue:check` passe.

## 11. Découpage en tâches
Une tâche = un appel à `senior-developer`, une branche, puis vérification ; `qa-engineer` écrit les tests d'acceptation de la tâche avant. Chaque tâche livre la story Animation et la story QA de ce qu'elle touche, et réécrit les tests existants qu'elle rend faux.
- [ ] T0 : ADR 0011 (emplacement, transitions dans `layout`, registre, règle de propriété des propriétés CSS, portée du contrôle des valeurs en dur, rupture de tokens, point de rupture 768 px, copie figée, contrat public / interne) ; amendement d'une ligne de l'ADR 0001 ; DESIGN.md (règle des 200 ms remplacée, North Star nuancée, exception du point « live ») ; **QA** : portage des harnais des trois essais dans `tools/qa/`, extension de `storybook-browser.mjs` aux `CSSAnimation` / WAAPI, `motion-fidelity.mjs` + `fidelite.json` + table `dNN → story` (S + M QA)
- [x] T1 (livrée le 2026-11-27 ; CA-1 prouvé pour les valeurs des tokens, sa partie « dépassement mesuré contre le catalogue » attend l'outil de fidélité de T0) : tokens : `ref`, rôles `sys`, **tous** les tokens composant de §5.2, découplage bouton / spinner / skeleton / shell ; réécriture des tests de tokens ; table « valeur → token » ; contrôle statique étendu ; ouverture du mouvement au schéma des thèmes `.tokens.json` (`lc-tokens check`), sans changer l'interface du theme-builder (M, couvre CA-1, CA-1b, CA-2)
- [x] T2 (livrée le 2026-11-27) : runtime : déménagement des fichiers motion de `core/`, `motion-tokens.ts`, `lcAnimate`, `stagger.ts` ; exports public / `@internal` ; registre `LcNavRegistry` et entrée `primary` de `a[lcNavItem]` (M, couvre CA-4, CA-19)
- [ ] T3 : `motion.css` + `lcReveal` (entrée, sortie, variantes, index) + `lcStagger` ; migration de data-table et des stories qui utilisent `[attr.lcReveal]` ; retrait de l'ancien bloc `[lcReveal]` dans la même tâche (M, couvre CA-3, CA-5, CA-7 en partie, CA-8 à CA-11)
- [ ] T4 : `lcFill` + `lcDraw` + `.lc-pulse` + `.lc-lift` (S, couvre CA-12, CA-13, CA-30) — après T3
- [ ] T5 : `lcCountUp` + `lcFlash` (M, couvre CA-14, CA-15) — après T3
- [ ] T6 : `lcSplitText` + titre et trait de `lc-page` (focus `tabindex="-1"`) (M, couvre CA-16) — après T3
- [ ] T7 : `flip.ts` (lecture par lot, seuil, tokens) + `lcFlip` ; data-table (tri, filtre, suppression) et message-thread reprennent les morceaux partagés (M, couvre CA-17, CA-18, CA-26, CA-27, CA-7) — après T3
- [ ] T8 : indicateurs : `lc-tabs`, `lc-nav-list`, `lc-nav-group`, `lc-segmented-control` (y compris 360 px), `lc-switch`, `lc-stepper` ; bouton (M, couvre CA-21, CA-22) — après T1
- [ ] T9a : `lc-dialog` (origine du déclencheur) et `lc-drawer` (valeurs, contenu en cascade) ; présentation en `lc-sheet` sous 768 px (M, couvre CA-23) — après T3
- [ ] T9b : `lc-sheet` : valeurs, seuils, ressort, élastique, voile ; réécriture de `ios-motion-browser.mjs` (M, couvre CA-24)
- [ ] T9c : pops d'ancrage : `lc-menu`, liste de `lc-combobox`, calendriers, `lc-toggletip` ; changement de mois du calendrier (M, couvre CA-20 pour ces démos)
- [ ] T10 : `lc-toast` ; `lc-progress-bar`, `lc-timeline-bar`, barres de `lc-file-upload` et `lc-message-composer`, `lc-kpi-card`, `lc-card`, `lc-activity-feed`, `lc-tree-table`, `lc-description-list`, `lc-disclosure` (M, couvre CA-25, CA-31) — après T4 et T5
- [ ] T11 : `lc-chart` : table « rôle → nom ECharts », animation depuis les tokens (S, couvre CA-28)
- [ ] T12 : `lc-theme-toggle` : révélation circulaire + repli (S, couvre CA-29)
- [ ] T13a : `LcPageNav` : fonction pure du sens, pile d'historique, titres des routes (M, couvre CA-32 en partie)
- [ ] T13b : `lcPageTransitions` : copie figée, ordinateur, téléphone, déclenchement, accessibilité ; pose dans `lc-app-shell` sur `main` (L, couvre CA-32, CA-33, CA-35) — après T13a
- [ ] T14 : retour au geste + en-tête mobile (bouton retour libellé, titre au défilement) (M, couvre CA-33, CA-34a) — après T13b
- [ ] T15 : barre d'onglets en bas de `lc-app-shell` (registre, « Plus » → tiroir) (M, couvre CA-36) — après T2 et T13b
- [ ] T16 : page Foundations/Motion (§5.4.5), recettes, dérivation des stories, `CATALOGUE.md`, retrait de `@angular/animations` (M, couvre CA-6, CA-37 à CA-39) — en dernier

Ordre : T0 → T1 → T2 → T3 ; puis T4, T5, T6, T7, T8, T9a, T9b, T9c, T11, T12, T13a en parallèle (chacun avec ses fichiers ; `motion.css`, `CATALOGUE.md` et `index.ts` fusionnés par l'orchestrateur) ; T10 après T4 et T5 ; T13b → T14 ; T15 après T13b ; T16 en dernier. Plan de repli : si T15 est coupée, T13 et T14 livrent seuls les transitions de page. Branches d'essai supprimées après le portage des harnais (T0).

## 12. Risques et questions ouvertes
- **Choix par défaut à confirmer à la validation** :
  - Variante `tilt` (cartes qui s'inclinent à l'entrée, d03) gardée.
  - Seuils de geste et amplitudes propres à un composant en constantes nommées, pas en tokens (évite ≈ 40 tokens) ; les durées, courbes, décalages et distances restent dans les tokens (D-4).
  - Point de rupture 768 px (celui du kit) au lieu de 760 px (Talmo).
  - Compteurs à 900 ms (démo d14) et non 1,2 s (mesure brute de Talmo).
  - `lc-data-table` : filtre = liste vidée puis cascade, comme Talmo (change le comportement validé le 2026-11-21) ; suppression d'une ligne inchangée.
  - Rendu serveur prouvé par simulation (`PLATFORM_ID` serveur), sans ajouter `@angular/platform-server`.
  - Suites navigateur lancées en gate local (comme aujourd'hui), pas en CI.
  - Point « live » : décoratif, jamais seul porteur d'information, arrêté par le mouvement réduit (WCAG 2.2.2).
- **Ce qui change pour les applications** (à transmettre à la session copro-ticket) : variantes de `lcReveal` renommées (`rise` / `drop`…), apparition par le bas au lieu du haut, `[attr.lcReveal]` ne déclenche plus rien (directive) ; durées plus longues et tokens renommés ou supprimés (§5.2) ; `lc-dialog` et `lc-drawer` en feuille du bas sous 768 px ; barre d'onglets en bas si l'application marque `primary` sur ses rubriques ; routes imbriquées avec `title` pour le bouton retour ; `scrollPositionRestoration: 'enabled'` recommandé ; listes immuables pour `lcFlip` ; changement de comportement du filtre de `lc-data-table`.
- **Risques** :
  - Safari iOS : geste de retour natif (CA-34b, iPhone réel requis).
  - Coût de `cloneNode` sur les très grandes pages : à mesurer en T13b sur la plus grande page de la vitrine.
  - Durées plus longues : une application dense peut sembler lente ; le thème permet de les réduire.
  - Tableau de fidélité (une trentaine de démos) : plusieurs heures de travail QA en T0 ; sans lui, CA-20 n'est pas prouvé.
- **Dettes** : ressort de la feuille et élastique joués avec la courbe `pop` (équivalents, pas identiques à `back.out` de GSAP) ; deux valeurs non mesurées sur le site (courbe du spinner, durée de l'annulation d'un déplacement) ; `animationend` jamais reçu peut laisser un rejeu au déplacement.
- **Questions ouvertes** : aucune autre.

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| 2026-11-26 | architecte Angular externe (contre-expertise) | conception | Fait | Structure retenue ; B1, B2, M1 à M8 intégrés ; registres écartés (D-2) |
| 2026-11-26 | `cadreur` | spec | Écarts, aucun bloquant | Intégrés : numérotation (contrôle statique ≠ CA de cette spec), dépendances entre tâches, CA mobiles, CA-5 élargi, O8, O4 reformulé, `mask` retiré, libellé « Plus ». Questions posées : fenêtres en feuille (D-19 oui), `tilt` (défaut oui, §12) |
| 2026-11-26 | `architect` | conception | À revoir → corrigé | Intégrés : directive sur `main` (pas d'outlet dans le shell), registre de navigation, migration de data-table dans T3, transitions dans `layout`, rupture de tokens listée, 768 px, `LcValueFormat`, `lcStagger` à rythme, pas de transition sur `?query`, public / `@internal`, SSR, découpage T9 et T13, `lcFlip` sans avertissement indétectable, `pan-y`, copie sans `name` ni média, focus `tabindex="-1"`. Question posée : « Plus » (D-22 tiroir) |
| — | `security-reviewer` | conception | Angle fermé (§0) | Points de l'architecte sur la copie (`name`, médias) intégrés au §7 |
| 2026-11-26 | `qa-engineer` | plan de test | À préciser → corrigé | Intégrés : CA-1 à tolérance, outil de fidélité, rendu serveur simulé, CA-2 et CA-5 réécrits, harnais portés en T0, tests existants à réécrire, CA-34 séparé (Chromium / iPhone), CA-3 sur `running`, CA-11 à rythme, mesures par `finished` et `currentTime`, CA-28 par espion, CA-31 pendant le mouvement, bornes de largeur, gate exact. Choix par défaut : simulation SSR, gate local (§12) |
| 2026-11-26 | `ui-ux-designer` | brief §5.4 | Fait | Intégrés : démos et valeurs corrigées (status-badge sans mouvement, d02 en `inout`, d10 sur nav-list, toggletip d39, disclosure d48, sortie de page, geste d53), composants oubliés (file-upload, message-composer, nav-group, app-shell, spinner, skeleton, truncate, slider, chart-frame), découplages de tokens, libellés `LC_LABELS`, page Foundations en français, protocole `novice-user`. Questions posées : segmenté (D-20 pastille), onglets (D-21 première fois) ; `lc-progress-ring` hors périmètre |
| 2026-11-26 | `novice-user` | brief §5.4.5, passe 1 | COMPRIS AVEC DIFFICULTÉ (5/5, 7 gênants) | Textes de §5.4.5 corrigés (colonne « Ce qui se passe », Rejouer, sortie dans une liste, compteur, jauge, vitesse, mouvement coupé) ; amendement de la spec validée accepté par l'utilisateur (« ok ») ; passe 1 à refaire avec un agent neuf |
| 2026-11-26 | `novice-user` (agent neuf) | brief §5.4.5, passe 1 bis | COMPRIS AVEC DIFFICULTÉ (5/5, 7 gênants, dont 3 hors public : bases d'Angular) | 6 précisions ajoutées (CSS de la barre, copie de liste pour `lcFlip`, renvoi vers « Régler et couper », formats du compteur, sens du rythme, état final sous mouvement coupé). Limite de 2 tours atteinte : l'utilisateur accepte d'avancer (« oui vas y ») ; la passe 2 sur la page réelle après T16 reste le critère de CA-37 |

**Écarts constatés à l'implémentation** :
- T1 (2026-11-27) : tests existants d'anciennes specs adaptés par le développeur à cause des nouvelles valeurs ou de l'emplacement des tokens (`sheet.static.test.mjs`, `theme/theme.test.mjs`, `message-composer.static.test.mjs`), jugés légitimes et sans assouplissement par `qa-engineer`. Ouverture des thèmes au mouvement durcie après revue (refus d'une courbe piégée de 100 000 caractères en moins de 50 ms, unité par token, `NOT_THEMEABLE` pour les seuils de geste et la mise en page). Restes reportés : saut de ligne accepté dans une courbe par la validation puis refusé au rendu (T2), harnais navigateur aux anciennes valeurs (T8, T9b), `sheet.dismiss-ratio` (T9b), tokens de mouvement du fil de messages hors `motion.tokens.json` (T7), branchement du calendrier sur `menu.*` (T9c).
- T0 (2026-11-27) : l'empreinte du catalogue (`fidelite.json`, 44 démos) diffère de la spec sur trois valeurs, le catalogue faisant foi (CA-20) : fermeture de `lc-dialog` 250 ms (spec : 150 ms, à recaler en T9a), décalage de d21 40 ms (spec : 39 ms, dans la tolérance), décalage de d09 37,5 ms. Story Animation du stepper sans bandeau de mouvement réduit (manque préexistant révélé par la liste dérivée de l'index) : à corriger en T8.
- T2 (2026-11-27) : `lcAnimate` accepte aussi un token composant (`LcMotionToken`) ; `cssMs` renommé `lcCssMs` ; registre de navigation retrié à la fin de chaque rendu (ordre de l'écran, vérifié sur un `@for` réordonné) ; correctif du saut de ligne dans les courbes de thème (reporté de T1). Restes reportés à T3 : avertissement en développement quand `lcAnimate` reçoit un token absent (faute de frappe = animation instantanée silencieuse), `LC_MOTION_DURATIONS` / `LC_MOTION_EASINGS` à marquer `@internal`, renommage de la méthode privée `sort` du registre en `publish`. Registre vide au rendu serveur et avec `navMode='none'` (à prendre en compte en T13 et T15) ; doublons d'une même rubrique affichée deux fois à gérer en T15.
