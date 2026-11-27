# ADR-0011 : Système de mouvement (premium, primitives, transitions de page)

- **Statut** : Acceptée (2026-11-26)
- **Date** : 2026-11-26
- **Amende** : ADR-0001 (portée du contrôle des valeurs en dur et place des seuils de geste, voir Décision 6).
- **Spec** : [2026-12-mouvement-v2](../specs/2026-12-mouvement-v2.md)

## Contexte
- Le mouvement « sobre » livré le 2026-11-21 ne suffit pas : l'utilisateur veut reproduire le mouvement du site Talmo (« juste prenium et pas sobre », « le but c'est harmoniser ») et que les développeurs d'application animent leurs propres éléments sans connaître les courbes.
- Le code de mouvement est dispersé (core, data-table, message-thread) et l'attribut `[lcReveal]` actuel (transition permanente sur `transform`) entre en conflit avec le survol et la réorganisation de liste (essai 2 : saut de 20 px).
- Contraintes : Baseline 2024 (ADR-0009), tokens à 3 couches (ADR-0001), interdiction d'importer un point d'entrée secondaire depuis un autre (CLAUDE.md), rendu serveur possible, mouvement réduit non négociable.
- Trois essais techniques (branches `spike/motion-*`) ont prouvé la sortie animée par directive, le FLIP par directive et les transitions de page sans View Transitions.

## Options considérées
1. **GSAP comme Talmo** : courbes et ressorts exacts ; dépendance de plus de 30 Ko, inutile pour la plupart des cas, contraire à la ligne « primitives natives » du kit.
2. **Module `motion` en point d'entrée secondaire, avec provider et registres sobre / premium** : séparation visible ; exceptions d'import pour tous les secondaires, double configuration (provider et tokens), double maintenance.
3. **CSS natif + Web Animations, primitives dans le point d'entrée principal, transitions de page dans `layout`, un seul registre (premium)** : aucune dépendance, aucune exception d'import, configuration par les seuls tokens ; quelques courbes GSAP seulement approchées.

## Décision
Option 3.
1. **Un seul mouvement, celui de Talmo**, porté par les tokens (`ref` → `sys` → composant). Pas de registre sobre, pas d'attribut `data-lc-motion`, pas de provider : une application règle le mouvement par son thème.
2. **Emplacement** : tokens dans `packages/tokens` ; runtime et primitives dans `packages/angular/src/lib/motion/` (point d'entrée principal, **sans dépendance au routeur**) ; transitions de page (`LcPageNav`, `lcPageTransitions`) dans `packages/angular/layout/src/page-transitions/` ; registre de navigation `LcNavRegistry` dans le principal, pour que `lc-app-shell` (layout) connaisse les rubriques sans importer `navigation`. Aucune nouvelle exception d'import.
3. **Propriétaire de chaque propriété CSS** : apparition et sortie animent `opacity` et les propriétés individuelles `translate` / `scale` / `rotate` ; FLIP et survol animent `transform` ; un composant possède seul ses indicateurs ; un composant ne pose pas `lcReveal` sur son hôte (sauf quand l'hôte est l'élément qui entre : `lc-card`, `lc-kpi-card`, `li[lcActivityItem]`, par `hostDirectives`, pour qu'une carte entre sans attribut côté application), et un élément qui a son propre `animate.leave` ne porte pas `lcReveal`.
4. **Techniques** : apparition en `@keyframes` + `backwards` dont la classe est retirée à `animationend` ; sortie par `animate.leave` déclaré dans la directive ; FLIP avec instantané dans `ngOnChanges` et diff dans `afterRenderEffect` ; jauges et tracés par une variable CSS (`--lc-progress`) ; transitions de page par copie figée (`cloneNode`, `inert`, `aria-hidden`, sans `id` ni `name`) ; sens déduit d'une copie de la pile d'historique, de la profondeur et de l'ordre du registre. Tout chemin JavaScript passe par la garde « mouvement réduit ». View Transitions seulement pour la révélation circulaire du thème, avec bascule instantanée en repli (ADR-0009).
5. **Point de rupture téléphone** : 768 px, celui du kit (pas de cinquième point de rupture).
6. **Amendement d'ADR-0001** : est un token tout ce qu'un thème peut vouloir changer (durées, courbes, délais, distances, échelles, angles, décalages, y compris les amplitudes propres à un composant listées en §5.2 de la spec) ; seuls les seuils de geste (fraction de hauteur ou de largeur, vitesses, largeur de la bande de bord, facteur d'élastique) sont des constantes nommées et documentées dans le code, inscrites dans la liste blanche du contrôle statique. Le contrôle des valeurs en dur couvre par glob tout `packages/angular/**`. Un thème `.tokens.json` peut surcharger les rôles et tokens de mouvement, comme les couleurs (vérifié par `lc-tokens check --theme`). *Précision du 2026-11-26, avant toute tâche consommatrice : la première rédaction rangeait aussi les amplitudes de composant en constantes, en contradiction avec la spec et la décision de l'utilisateur « toutes les valeurs dans les tokens ».*
7. **Rupture de contrat assumée** (phase de développement) : durées `fast`, `normal`, `slow`, `long` revalorisées, `--lc-sys-motion-offset` et `--lc-sys-motion-stagger` remplacés par des groupes, variantes de `lcReveal` renommées ; liste publiée dans `CATALOGUE.md`.

## Conséquences
- Positives : un seul endroit par mécanisme ; un développeur d'application anime ses éléments par attributs ; aucune dépendance nouvelle ; rendu serveur sûr (valeurs finales dans le HTML) ; le passage futur à View Transitions pour les pages ne touche que `lcPageTransitions`.
- Négatives / dette : ressorts et élastiques approchés en `cubic-bezier` ou en Web Animations (pas identiques à GSAP) ; la copie figée ne reproduit pas l'état des champs, `canvas` et vidéos pendant sa sortie ; durées plus longues pour toutes les applications ; adaptation des consommateurs (copro-ticket par une autre session).
- À surveiller : le geste de retour natif de Safari iOS (double animation possible) ; le coût de `cloneNode` sur les très grandes pages ; le nombre de tokens composant (YAGNI, ADR-0001) ; la revue annuelle de la cible (View Transitions pour les pages quand elles entreront dans le millésime).
