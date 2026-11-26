# Contre-expertise de la structure motion v2 (2026-11-26)

Revue indépendante (architecte Angular, lecture seule) de [structure-proposee.md](structure-proposee.md), refonte autorisée.

## Verdict

Bonne structure dans son principe (tokens, runtime mince, attributs posés par le développeur, composants consommateurs) et bien placée dans le point d'entrée principal. Elle sur-construit le JavaScript là où du CSS suffit (fragile en SSR et en composition avec les composants du kit) et laisse sans réponse des besoins courants : sortie d'un élément, réorganisation de liste, index explicite en grille. Corrigée, elle couvre ~45 des 59 familles.

## Corrections retenues

| # | Gravité | Problème | Correction |
|---|---|---|---|
| B1 | bloquant | `[lcReveal]` pose une `transition` permanente avec délai sur l'élément : le survol hérite du délai d'entrée, et le FLIP de data-table entre en conflit (d'où le bricolage `hidden`/`freeze`) | Animation `@keyframes` avec `animation-fill-mode: backwards` qui s'éteint seule ; reveal = `opacity` + propriétés individuelles `translate`/`scale`/`rotate`, FLIP et survol = `transform`. Tableau « qui possède quelle propriété » dans l'ADR |
| B2 | bloquant | `<h1 lcSplitText>{{ titre }}</h1>` casse les mises à jour Angular (nœud texte détaché) | La directive possède le contenu : `<h1 [lcSplitText]="titre()">` ; découpe en graphèmes (`Intl.Segmenter`) ; `aria-label` sur l'hôte, lettres `aria-hidden` ; texte final dès le serveur ; rien découpé en mouvement réduit |
| M1 | majeur | Fichiers de tokens en double (`ref/motion`, `sys/motion`, `sober`) avec l'existant ; échelle de durées renommée | Valeurs brutes dans `ref/scale.tokens.json` ; sobre = défaut ; expressif = `sys/motion-expressive.tokens.json` qui surcharge seulement `sys`, comme le thème sombre, appliqué par `[data-lc-motion="expressive"]` sur `<html>` uniquement ; garder `fast/normal/slow/long/move` + ajouter `draw`, `count` |
| M2 | majeur | `lcFill` et `lcDraw` n'ont pas besoin de JavaScript d'animation | La directive écrit `--lc-progress` (0 à 1) ; le CSS anime (`scaleX` / `stroke-dashoffset` avec `pathLength="1"`) ; SSR correct, changement de valeur animé tout seul ; API homogène `[lcDraw]="0.62"` |
| M3 | majeur | `lcStagger` par `contentChildren` ne voit pas les éléments d'un composant enfant (cas normal d'une app) et pose l'index trop tard en SSR | `lcReveal` s'inscrit auprès du `lcStagger` parent par injection et prend son rang à la création ; lot remis à zéro en microtâche (gère « charger plus ») ; plafond en CSS `min()` ; un seul plafond |
| M4 | majeur | « Mémoire déjà vu par track id » impossible (la directive ne connaît pas la clé) et inutile | Supprimer `seen-tracker` commun : une nouvelle instance = une arrivée. `ArrivalTracker` reste dans message-thread. Vérifier en navigateur qu'un déplacement dans `@for` ne rejoue pas |
| M5 | majeur | Aucune primitive de sortie (toasts, fermetures, filtres) | Spike : `animate.leave` déclarable par la directive en Angular 22 ? Sinon contrat documenté `lcReveal` + `animate.leave="lc-leave"` |
| M6 | majeur | `list-flip.ts` sans directive est inutilisable par une app ; fusion avec message-thread forcée | Directive `[lcFlip]="items()"` (spike sur le moment d'exécution) ; data-table garde son `freeze` ; message-thread garde sa mesure par le bas et ne partage que stagger et tokens |
| M7 | majeur | Pas d'index explicite : cascades en grille impossibles (calendrier, kanban, heatmap) | `[lcRevealIndex]="n"` |
| M8 | majeur | Double animation si `lcReveal` est posé dans un composant qui anime déjà ; écriture `[lcReveal]="'up'"` impose la directive | Règle d'ADR : les composants du kit n'utilisent pas `lcReveal` sur leur hôte ; accepter aussi `lcReveal="rise"` en CSS pur ; lire les tokens sur l'élément hôte, un appel par lot ; `lcCountUp` formate via `LcFormatService`, texte final dès le serveur ; `lcFlash` ignore la première valeur |

Mineurs : variantes `rise`/`drop`/`fade`/`scale`/`pop`/`left`/`right` (au lieu de `up`/`down`, ambigus) ; trait sous le titre = `lcFill` à 1 ; classes CSS `.lc-pulse` et `.lc-lift` pour le point « live » et le survol ; exposer `lcAnimate()` comme échappatoire publique avec garde « mouvement réduit » (élastique, ressort) ; `indicator-rect` marqué `@internal` ; CA-15 étendu au dossier motion.

À ajouter à « Ce qui disparaît » : la `transition` permanente de `[lcReveal]`, le `freeze`/`hidden` de data-table (à vérifier après B1), le `seen-tracker` commun.

## Arborescence corrigée

```
ui-kit/
├── package.json                                  − @angular/animations
├── packages/
│   ├── tokens/
│   │   ├── src/
│   │   │   ├── ref/scale.tokens.json             + courbes entrance, pop, title ; durées draw, count ; décalage fin
│   │   │   ├── sys/default.tokens.json           échelle fast→move + draw, count ; easings standard, emphasized,
│   │   │   │                                     entrance, exit, pop, title ; motion.{offset, stagger, stagger-cap,
│   │   │   │                                     scale-pop, rotate} ; registre sobre = défaut
│   │   │   ├── sys/motion-expressive.tokens.json surcharge de sys seulement → [data-lc-motion="expressive"] sur <html>
│   │   │   ├── components/motion.tokens.json     + toast, switch, live, steps
│   │   │   └── base.css                          coupure « mouvement réduit » (inchangé)
│   │   └── lib/
│   │       ├── build-all.mjs                     + sélecteur expressive
│   │       ├── motion.static.test.mjs            CA-15 étendu au dossier motion
│   │       ├── motion.registers.test.mjs         toute clé de l'expressif existe dans le défaut
│   │       └── motion.acceptance.test.mjs
│   └── angular/
│       ├── src/
│       │   ├── public-api.ts                     + export * from './lib/motion'
│       │   └── lib/motion/
│       │       ├── index.ts
│       │       ├── motion.types.ts
│       │       ├── runtime/
│       │       │   ├── motion-tokens.ts          tokens lus sur l'hôte, un appel par lot
│       │       │   ├── reduced-motion.ts         (déplacé de core/)
│       │       │   ├── animate.ts                lcAnimate public (échappatoire)
│       │       │   ├── stagger.ts                compteur par lot
│       │       │   ├── flip.ts                   flip(container, mutate, { measure })
│       │       │   ├── detach-animated.ts        (déplacé)
│       │       │   ├── indicator-rect.ts         (déplacé, @internal)
│       │       │   └── *.spec.ts
│       │       ├── directives/
│       │       │   ├── reveal.directive.ts       [lcReveal]="rise|drop|fade|scale|pop|left|right" + [lcRevealIndex]
│       │       │   ├── stagger.directive.ts      [lcStagger] fournit le compteur de lot
│       │       │   ├── fill.directive.ts         [lcFill]="0..1" lcFillAxis="x|y" → --lc-progress
│       │       │   ├── draw.directive.ts         [lcDraw]="0..1" → pathLength=1 + --lc-progress
│       │       │   ├── count-up.directive.ts     [lcCountUp] [lcCountUpFormat]
│       │       │   ├── flash.directive.ts        [lcFlash]
│       │       │   ├── flip.directive.ts         [lcFlip]="items()"
│       │       │   ├── split-text.directive.ts   [lcSplitText]="titre" lcSplitTextVariant="rotate|mask"
│       │       │   └── *.spec.ts
│       │       └── stories/
│       ├── styles/
│       │   ├── ui-angular.css                    @import "motion.css"
│       │   └── motion.css                        @keyframes + fill backwards ; translate/scale/rotate ;
│       │                                         plafond min() ; .lc-pulse, .lc-lift
│       ├── navigation/src/tabs/                  indicateur inchangé ; pas de lcStagger dans les panneaux
│       ├── navigation/src/segmented-control/
│       ├── feedback/src/toast/                   entrée pop + sortie animate.leave
│       ├── feedback/src/message-thread/          garde ArrivalTracker et sa mesure
│       ├── overlay/src/dialog/                   ouverture depuis le point de clic
│       ├── overlay/src/drawer|sheet/
│       ├── data/src/data-table/                  animateDiff() → runtime/flip.ts
│       └── charts/                               durée et courbe ECharts depuis les tokens
├── docs/
│   ├── adr/0011-motion-system.md                 registres, emplacement, propriétaire de chaque propriété, exclusions
│   ├── specs/2026-12-mouvement-v2.md
│   ├── storybook/foundations/motion.stories.ts   catalogue + registre + « besoin → primitive » (dont « faire sortir »)
│   └── design/explorations/2026-12-mouvement-v2/
└── tools/qa/storybook-browser.mjs
```

## Questions pour l'utilisateur

1. Expressif par défaut pour tout le kit, ou option activée par les applications qui le veulent ?
2. Point « live » qui pulse en continu : exception écrite dans DESIGN.md, ou non ?
3. Consommateur désigné pour `lcCountUp`, `lcFill`, `lcDraw`, `lcFlip` — sinon livraison par étapes (`lcReveal`, `lcStagger`, `lcFill` d'abord) ?
4. Accepter des spikes avant la spec (sortie par `animate.leave`, `lcFlip`) ?
5. message-thread garde sa mesure par le bas et ne reprend que stagger et tokens ?
6. Noms : `rise`/`drop` ou `up`/`down` ; `data-lc-motion` ou sans préfixe comme `data-theme` ?
7. Durées des composants existants (indicateur, drawer, modale, toast) alignées sur Talmo en bloc dans le registre expressif ?
