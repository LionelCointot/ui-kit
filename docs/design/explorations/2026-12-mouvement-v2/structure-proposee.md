# Motion v2 — structure proposée (à contre-expertiser)

Contexte : l'utilisateur veut reproduire le motion « premium » du site Talmo (https://demo.codeandchill.store/talmo/) dans le ui-kit, utilisable facilement par n'importe quel développeur d'application sur ses propres composants, de façon structurée et factorisée. **La refonte du motion existant est autorisée** (phase de développement, aucune rétrocompatibilité) : le but est d'éviter les doublons, pas de préserver l'existant.

Matériaux : `catalogue.html` (52 démos), `inventaires/` (150 animations relevées sur le site + matrice de faisabilité QA), `captures/`.

## Principe : 4 couches, une responsabilité chacune

1. **Tokens** : toutes les valeurs (courbes, durées, distances, décalages). Deux registres : `sober` (l'actuel) et `expressive` (Talmo), choisis par l'application avec `<html data-lc-motion="expressive">`.
2. **Runtime** : lecture des tokens résolus, garde « mouvement réduit » sur tout chemin JavaScript, outils communs (mémoire « déjà vu », cascade plafonnée, FLIP de liste).
3. **Primitives** (attributs posés par le développeur) : `lcReveal`, `lcStagger`, `lcFill`, `lcDraw`, `lcCountUp`, `lcFlash`, `lcSplitText`.
4. **Composants du kit** : ils utilisent ces primitives au lieu d'avoir chacun leur code de motion.

Pas de provider ni d'options de configuration : les tokens sont la configuration. Mouvement réduit non réglable (tout saute à l'état final). Deux déclencheurs : apparition (par défaut) et changement de valeur. Pas de déclenchement au défilement (décision du 2026-11-21).

## Arborescence

```
ui-kit/
├── package.json                                  − @angular/animations (dépendance morte)
├── packages/
│   ├── tokens/
│   │   ├── src/
│   │   │   ├── ref/motion.tokens.json            valeurs brutes : courbes (standard, out-quint, out-expo,
│   │   │   │                                     back), durées 100→1200 ms, distances 8/16/26/44 px,
│   │   │   │                                     décalages 25/45/80 ms, échelles, angles
│   │   │   ├── sys/motion.tokens.json            rôles : easing-{standard|entrance|exit|pop|draw},
│   │   │   │                                     duration-{instant|fast|normal|enter|move|draw|count},
│   │   │   │                                     distance-{sm|md|lg}, stagger-{fine|normal},
│   │   │   │                                     stagger-cap-{count|total}, scale-{pop|press}, rotate-{tilt|char}
│   │   │   ├── motion/
│   │   │   │   ├── sober.tokens.json             registre sobre (valeurs actuelles)
│   │   │   │   └── expressive.tokens.json        registre premium (valeurs mesurées sur Talmo)
│   │   │   ├── components/motion.tokens.json     tokens par composant (tabs, dialog, drawer, sheet,
│   │   │   │                                     toast, menu, data-table…) avec repli sur sys
│   │   │   └── base.css                          kill switch « mouvement réduit » (existant)
│   │   └── lib/
│   │       ├── motion.static.test.mjs            CA-15 étendu : aucune valeur en dur hors var(--lc-…)
│   │       ├── motion.registers.test.mjs         les 2 registres définissent exactement les mêmes rôles
│   │       └── motion.acceptance.test.mjs        (existant, mis à jour)
│   │
│   └── angular/
│       ├── src/                                  point d'entrée principal (importable par tous)
│       │   ├── public-api.ts                     + export * from './lib/motion'
│       │   └── lib/
│       │       ├── core/                         reduced-motion, detach-animated, indicator-rect
│       │       │                                 déménagent dans motion/runtime
│       │       └── motion/
│       │           ├── index.ts
│       │           ├── motion.types.ts           LcRevealVariant, LcFillAxis, LcMotionRegister…
│       │           ├── runtime/
│       │           │   ├── motion-tokens.ts      lit les tokens résolus (getComputedStyle) → ms, easing
│       │           │   ├── reduced-motion.ts     (déplacé de core/)
│       │           │   ├── animate.ts            enveloppe WAAPI : tokens + garde mouvement réduit + finished
│       │           │   ├── seen-tracker.ts       mémoire « déjà vu » (remplace ArrivalTracker)
│       │           │   ├── stagger.ts            délais plafonnés 8 él. / 300 ms, décalage fin auto
│       │           │   │                         (remplace staggerDelay de message-thread)
│       │           │   ├── list-flip.ts          FLIP de liste (remplace data-table + message-thread)
│       │           │   ├── detach-animated.ts    (déplacé de core/)
│       │           │   ├── indicator-rect.ts     (déplacé de core/)
│       │           │   └── *.spec.ts
│       │           ├── directives/
│       │           │   ├── reveal.directive.ts       [lcReveal]="'up'|'down'|'fade'|'scale'|'tilt'"
│       │           │   ├── stagger.directive.ts      [lcStagger] conteneur : contentChildren(LcReveal),
│       │           │   │                             pose --lc-motion-index, seen-tracker par track id
│       │           │   ├── fill.directive.ts         [lcFill]="0.62"  lcFillAxis="x|y"
│       │           │   ├── draw.directive.ts         [lcDraw] sur path/circle/line  [lcDrawProgress]
│       │           │   ├── count-up.directive.ts     [lcCountUp]="valeur"  [lcCountUpFormat]
│       │           │   ├── flash.directive.ts        [lcFlash]="valeur surveillée"
│       │           │   ├── split-text.directive.ts   [lcSplitText] masque par mot, lettres en
│       │           │   │                             translateY + rotation
│       │           │   └── *.spec.ts
│       │           └── stories/
│       │               ├── <primitive>.stories.ts             une page par primitive (rubrique Animation)
│       │               └── motion.acceptance.qa.stories.ts    preuves navigateur de chaque primitive
│       ├── styles/
│       │   ├── ui-angular.css                    @import "motion.css" (bloc [lcReveal] retiré d'ici)
│       │   └── motion.css                        règles CSS des attributs + sélecteurs data-lc-motion
│       ├── navigation/src/tabs/                  panneaux : lcStagger + seen-tracker ; indicateur inchangé
│       ├── navigation/src/segmented-control/     tokens communs
│       ├── feedback/src/toast/                   entrée « pop », sortie « exit » (absentes aujourd'hui)
│       ├── feedback/src/message-thread/          message-thread-motion.ts supprimé → runtime
│       ├── overlay/src/dialog/                   ouverture depuis le point de clic
│       ├── overlay/src/drawer|sheet/             contenu en cascade, fermeture glissée
│       ├── data/src/data-table/                  animateDiff() → list-flip
│       └── charts/                               durée et courbe des animations ECharts lues dans les tokens
│
├── docs/
│   ├── adr/0011-motion-system.md                 registres, primitives, emplacement, exclusions
│   ├── specs/2026-12-mouvement-v2.md             critères CA-n
│   ├── storybook/foundations/motion.stories.ts   catalogue (issu de catalogue.html), sélecteur de registre,
│   │                                             tableau « besoin → primitive »
│   └── design/explorations/2026-12-mouvement-v2/ POC, captures, inventaires
└── tools/qa/storybook-browser.mjs                commande motion : + contrôles des primitives
```

## Usage côté application

```html
<h1 lcSplitText>Projects</h1>

<section lcStagger>
  @for (p of projects(); track p.id) {
    <article lcReveal>
      <svg><circle lcDraw [lcDrawProgress]="p.progress" /></svg>
      <strong [lcCountUp]="p.fee"></strong>
      <div class="meter"><i [lcFill]="p.feeUsed"></i></div>
    </article>
  }
</section>

<span [lcFlash]="hoursBooked()">{{ hoursBooked() }}</span>
```

## Ce qui disparaît

`message-thread-motion.ts`, le FLIP privé de `data-table`, le bloc `[lcReveal]` de `ui-angular.css`, les fichiers motion de `core/`, la dépendance `@angular/animations`.

## Hors du kit (recettes côté application)

Glisser-déposer, boutons magnétiques, révélation circulaire du thème (attend la revue annuelle de l'ADR 0009).

## Point ouvert à trancher

Emplacement : `src/lib/motion/` dans le point d'entrée principal (proposé, aucune exception d'import à déclarer) **ou** un point d'entrée secondaire `@lionelcointot/ui-angular/motion` que tous les autres auraient le droit d'importer (change la règle d'import du CLAUDE.md).
