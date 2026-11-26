# Motion System — avis du panneau d'experts (2026-11-25)

**Objet** : évaluer la proposition de Motion System (`angular/motion/` + API `lcMotion`/`lcStagger` + `provideLcMotion` + modes on-insert/on-visible/on-state-change + stratégies once/always/reset), visant un motion « plus riche, inspiré de Talmo » dans le ui-kit.

**Méthode** : 4 experts indépendants (architecte logiciel, designer motion UI/UX, spécialiste Angular 22, revueur accessibilité/perf), chacun ayant lu la proposition intégrale, le rapport d'analyse Talmo (`~/Projects/talmo-preuve/rapport-animations-talmo.md`) et l'état réel du repo. Avis bruts : workflow `ui-kit-motion-expert-panel` (sorties structurées dans la session du 2026-11-25).

## Constat majeur (unanime, 4/4)

**La proposition reconstruit un système de motion qui existe déjà, est livré et a été validé par l'utilisateur le 2026-11-21.** Ce qui existe aujourd'hui dans le repo :

| Brique | Emplacement | État |
|---|---|---|
| Tokens de motion (3 couches ref/sys/composant) | `packages/tokens/src/components/motion.tokens.json` + sys tokens | Livré — durées fast 100 / normal 200 / slow 300 / long 350 / move 500 ms, `easing-standard cubic-bezier(0.2,0,0,1)`, offset 8 px, stagger 80 ms (la décision 5 de la spec fixait 50 ms — vraisemblablement relevé après validation : « pour la liste en cascade je mettrait plus long l'animation » ; à confirmer) |
| Attribut `[lcReveal]` en CSS pur (`@starting-style`, délai = min(index,7) × stagger) | `packages/angular/styles/ui-angular.css` | Livré |
| Kill switch reduced-motion global (durées ET délais → 0.01 ms !important) | `packages/tokens/src/base.css` | Livré |
| Garde JS `lcPrefersReducedMotion()` (relue à chaque appel) + `detach-animated.ts` + `indicator-rect.ts` | `packages/angular/src/lib/core/` | Livré |
| Indicateur d'onglets glissant (500 ms) + fondu de panneau + **aucune animation au 1er affichage** (`lc-tabs--ready`) | `LcTabsComponent` (`packages/angular/navigation/src/tabs/`) | Livré — c'est exactement le cas « onglets Talmo » de la proposition |
| FLIP de liste (WAAPI, `.animateDiff()/.glide()`, `timing()` qui lit les tokens et renvoie null sous reduced motion) | `LcDataTableComponent` + `message-thread` (deux implémentations dupliquées) | Livré sur lc-data-table |
| Pattern « une seule fois » : `ArrivalTracker` (Set des ids vus) + bornes de stagger (8 éléments, 300 ms total via `MAX_STAGGER_MS`/`staggerDelay()`) | `packages/angular/feedback/src/message-thread/message-thread-motion.ts` | Livré |
| Catalogue Storybook Foundations/Motion (bouton Rejouer, bandeau reduced-motion qui suit matchMedia, captures `-reduit`) | `docs/storybook/foundations/motion.stories.ts` | **Livré** (la proposition dit « déjà commencé ») |
| QA navigateur : 544 checks Chromium + contrôle statique CA-15 (aucune valeur en dur hors `var(--lc-…)`) | `tools/qa/storybook-browser.mjs motion`, `packages/tokens/lib/motion.static.test.mjs` | Livré, vert le 2026-11-21 |
| Specs de référence | `docs/specs/2026-11-mouvement.md` + `2026-11-mouvement-ios.md` | Implémentées et validées le 2026-11-21 par l'utilisateur |

À noter : `LcRevealDirective` a été **retirée du kit le 2026-11-22 faute de consommateur** (l'attribut `[lcReveal]` + le CSS sont restés). Et `@angular/animations` 22.2.5 est dans `package.json` mais **importé nulle part** (dépendance morte — la spec §8 l'a explicitement rejetée au profit du CSS natif).

## Convergences (les 4 experts s'accordent)

1. **Blocker — réinvention d'un système existant.** Le module `angular/motion/` + `lcMotion`/`lcStagger`/`[motionOptions]`/`provideLcMotion` duplique : les tokens, `[lcReveal]`, `provideLcUiKit`, `lcPrefersReducedMotion()`, le stagger plafonné et la sémantique « once ». Deux systèmes parallèles = double maintenance + contradiction avec la règle du repo (« tout le mouvement vient des tokens ; les mettre à 0 ms coupe tout », spec §5.1).
2. **`on-visible` contredit une décision validée par l'utilisateur** (décision 2 / non-objectif 17 de la spec : « Déclenchement à l'insertion seulement, pas de dévoilement au défilement » — l'utilisateur avait répondu « A très bien » au cadrage) **et n'existe pas chez Talmo** (rapport §1 : « Pas de scroll-reveal — les reveals se déclenchent au mount / changement de vue »).
3. **`respectReducedMotion`/`enabled`/`defaults` ne doivent pas être des options.** WCAG 2.3.3 est non configurable ; le repo a déjà la réponse exacte de Talmo en deux couches (kill switch CSS + garde JS relue à chaque appel). Les tokens sont le seul canal de configuration.
4. **La structure de module viole les conventions du monorepo** (infra transversale dans `packages/angular/src/lib/`, pas un point d'entrée secondaire `motion/` pair de `navigation`/`data` ; CLAUDE.md interdit l'import entre points d'entrée secondaires sans exception). Le dossier `testing/` n'a aucun consommateur identifié (le pattern QA est `*.acceptance.qa.stories.ts`).
5. **Les 3 « modes » × 3 stratégies existent déjà comme patterns implémentés** : on-insert = `@starting-style` ; on-state-change = effet signal + FLIP WAAPI ; once/always/reset = seen-set / clé de rendu / réinsertion. La matrice 3×3 est sur-dimensionnée (9 combinaisons dont plusieurs mortes).

## Ce que chaque expert ajoute

### Architecte logiciel
- Ce qui est **juste** dans la proposition : « pas de moteur universel », « GSAP non obligatoire », « centraliser les primitives, pas les animations métier », catalogue Storybook, tests de comportement — tout cela concorde avec l'architecture existante et y est déjà en place.
- Le vrai écart Talmo n'est pas une structure de module mais **des mécaniques à consommateurs nommés** : extraction du FLIP (2ᵉ consommateur), count-up si un composant KPI apparaît, transition de vue direction-aware uniquement via nouvel ADR.
- Recommandation : refuser Partie A et l'API telles qu'écrites ; montrer d'abord à l'utilisateur ce qui existe (specs + QA 544/544) avant de figer quoi que ce soit.

### Designer motion UI/UX
- Le vrai écart avec Talmo est le **vocabulaire** : aucune courbe à dépassement (back.out), aucune courbe expo-like, durées plafonnées à 500 ms contre le cluster .15–.95 s de Talmo, une seule distance (8 px) contre y:26 des rises.
- Propose **6 tokens d'extension** (aucun code) : `--lc-ref-easing-entrance cubic-bezier(0.16, 1, 0.3, 1)` [expo.out — entrées de vues, fills], `--lc-ref-easing-pop cubic-bezier(0.34, 1.56, 0.64, 1)` [dépassement type back.out 1.7 — pops d'éléments petits], `--lc-ref-duration-enter 600 ms`, `--lc-ref-duration-draw 900 ms` [fills, count-up, tracés], `--lc-sys-motion-offset-lg 16 px`, `--lc-sys-motion-scale-pop 0.9`. À valider sur une page de démo à 3 réglages (workflow de la décision 14) avant figeage.
- **4 presets sous forme de bundles de tokens + règles CSS globales** (pas des fichiers `.ts`) : `pop` (scale .9→1 + fade, 200 ms easing-pop — toasts, badges, dots), `flash` (pulse couleur accent + micro-pop 1.03→1, ~500 ms — « une valeur a changé »), `fill` (scaleX/Y 0→1 depuis left/bottom, 900 ms easing-entrance — jauges, timelines) ; plus formaliser dans le catalogue les presets existants (`reveal`, `move`).
- **Le piège des onglets** (« ne pas rejouer si le panneau a déjà été vu ») : la mémoire doit vivre dans le propriétaire (Set des panneaux visités dans `LcTabsComponent`, sur le modèle d'`ArrivalTracker`) — sinon, avec les panneaux en `@if`, « once » se comporte comme « always ».
- Exclusions motivées à écrire dans la spec : révélation circulaire du thème (Baseline 2024 / ADR 0009 → revue annuelle), drag elastic + followers (pas de DnD dans le kit), magnetic buttons (faible valeur B2B), tracé SVG (niche), count-up (plus tard).

### Spécialiste Angular 22
- **Extraire le helper FLIP dupliqué** (data-table `L273-366` + message-thread `L243-300` implémentent deux fois le même mécanisme) dans `packages/angular/src/lib/core/list-flip.ts` — deux call sites existants suffisent à justifier.
- **Au plus une directive `lcStagger` (~50 lignes)** dans le paquet principal, livrée seulement si un consommateur est identifié : requête signal `contentChildren()`, assignation de `--lc-reveal-index` aux enfants `[lcReveal]` en `afterRenderEffect`, plafonnée à 8 ; « seulement les nouveaux éléments » = pattern ArrivalTracker. Sinon les composants posent la variable eux-mêmes (déjà le cas dans data-table).
- **View Transitions : différer** jusqu'à la revue annuelle ADR 0009 — fait vérifié : `@angular/router` 22.2.5 exporte déjà `withViewTransitions({skipInitialTransition, onViewTransitionCreated})` (developerPreview depuis v19/20, fallback gracieux). La révélation circulaire Talmo = WAAPI clip-path circle() sur `::view-transition-new(root)` dans `onViewTransitionCreated` — une petite spec à part, pas le cœur du motion system.
- **Nettoyage** : retirer `@angular/animations` de `package.json` (dépendance morte, vérifié par grep).
- Tests : étendre le trio existant (tests tokens node:test + specs Vitest unitaires + acceptance via `storybook-browser.mjs motion`) — pas de nouveau harness.

### Revueur accessibilité & performance
- **Stagger sans borne = risque n°1** de l'API proposée : `lcStagger` sur un `@for` de 500 lignes sans plafond = 40 s de cascade. Réutiliser telles quelles les deux bornes existantes (8 éléments + 300 ms total) et exporter `staggerDelay()` en core.
- **Le kill switch CSS ne couvre pas WAAPI** : tout chemin JS d'animation (FLIP, futurs count-up) doit appeler `lcPrefersReducedMotion()` et passer directement à l'état final. Contrat sous reduced motion = « rien du tout » (saut instantané, délais 0 s), pas un fallback « fade seul » — c'est O5/CA-13, plus strict que WCAG 2.3.3.
- **7 tests de comportement manquants** à ajouter : (1) animations JS sous PRM (`getAnimations()` vide ou tout fini) ; (2) focus-visible pendant l'animation (anneau stable pendant un scale d'appui) ; (3) aria-live + animation simultanée (annonce non bloquée) ; (4) interruption par re-rend (aucun élément coincé à opacity 0) ; (5) navigation rapide A→B→C <100 ms (un seul panneau en animation à la fois) ; (6) layout shift des frères stable au pixel (transform ne reflowe pas) ; (7) changement runtime de la préférence (déclencheurs suivants instantanés).
- **Règle de test minimale par preset** : valeurs uniquement en tokens + passage CA-15 ; story d'acceptation dans 3 contextes (normal/reduced/forced-colors) × 2 largeurs (360/1280) ; propriétés animées ∈ {opacity, transform} (+ width/height seulement pour indicateurs position absolue) ; stagger vérifié sur N=500 ; capture `-reduit`.
- **Perf** : passage de mesure type `perf()` sur une liste de 500 lignes avec reveal (entrée terminée ≤ maxDelay + duration) ; aucun `will-change` (Talmo n'en a pas non plus).

## Désaccords (mineurs)

| Sujet | Positions | Arbitrage proposé |
|---|---|---|
| Transition de vue direction-aware (« view ») | Designer : la prévoir en preset pour les apps. Architecte : nouvel ADR d'abord (non-objectif aujourd'hui). Angular : différer à la revue annuelle ADR 0009. | **Documenter comme recette applicative** (avec `withViewTransitions()` + WAAPI, prêtes dans le router 22), pas de code kit en v1. |
| Directive `lcStagger` générique | Angular : OK si consommateur identifié (~50 lignes). Architecte/a11y : seulement avec consommateur nommé (règle du repo). | **Conditionnel** — même chose en pratique. |

## Recommandation de synthèse (plan v1)

1. **Ne pas créer** `packages/angular/motion/`, ni `lcMotion`/`[motionOptions]`/`provideLcMotion`. Le motion reste là où il est : tokens + core (`packages/angular/src/lib/`) + `ui-angular.css` + comportements portés par les composants.
2. **Étendre le vocabulaire en tokens uniquement** (les 6 tokens du designer), validés sur une démo Foundations/Motion à 3 réglages avant figeage — c'est la seule façon légitime de déplacer le curseur « sobre → riche ».
3. **Cas flagship onglets** : Set des panneaux visités dans `LcTabsComponent` (généraliser `ArrivalTracker`) ; un panneau non visité entre en reveal (stagger ≤ 8), un panneau déjà vu ne rejoue rien.
4. **Extractions en core** : `list-flip.ts` (2 call sites existants) + export de `staggerDelay()` (bornes 8 / 300 ms).
5. **3 presets nouveaux** comme bundles de tokens + règles CSS globales : `pop`, `flash`, `fill` ; tableau « besoin → preset » en tête du catalogue Storybook (« un bloc apparaît » → reveal, « une valeur change » → flash, « des éléments apparaissent un à un » → reveal+stagger, « une liste se réorganise » → move, « une vue remplace une vue » → view).
6. **Durcissement a11y/perf** : WAAPI sous PRM (garde `lcPrefersReducedMotion()` sur chaque chemin JS), les 7 tests manquants en stories d'acceptation, CA-15 étendu aux nouveaux fichiers, retrait de la dépendance morte `@angular/animations`.

**Exclusions explicites (à écrire dans la spec)** : on-visible (décision 2 validée), révélation circulaire du thème + transition de vue direction-aware dans le kit (Baseline 2024 / ADR 0009 → revue annuelle), drag elastic + followers (pas de DnD), magnetic buttons, tracé SVG, count-up (plus tard si un composant KPI apparaît).

## Questions ouvertes pour l'utilisateur

1. **Sobre ou riche ?** Le kit a validé « sobre » le 2026-11-21 (8 px / 350 ms / `cubic-bezier(0.2,0,0,1)` sur démo à 3 réglages). Talmo est « riche » (y:26, overshoot visible, .55–.95 s). Déplacer ce curseur exige une **nouvelle démo**, pas un changement d'office — et il se fait par les tokens du point 2.
2. **on-visible : confirmer le « non »** (votre décision du 21/11, « A très bien ») ou la renverser explicitement ? Si oui : nouvelle section de spec + CA dédiées, pas un mode glissé dans une API.
3. **Quelles mécaniques Talmo voulez-vous réellement, pour quel consommateur ?** (simulateur ? copro-ticket ?) — règle du repo : pas de composant sans consommateur identifié. Sans réponse, tout le reste est spéculatif.
