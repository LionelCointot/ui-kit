## Tokens de mouvement supprimés, renommés ou revalorisés (mouvement v2)

Supprimés (aucun alias : les consommateurs passent aux nouveaux noms) :
- `--lc-sys-motion-offset` (8 px) : remplacé par `--lc-sys-motion-offset-{sm|md|lg|xl}` (8 / 16 / 26 / 40 px), `-sm` reprend l'ancienne valeur.
- `--lc-sys-motion-stagger` (80 ms) : remplacé par `--lc-sys-motion-stagger-{fine|normal|cards|chars}` (12 / 40 / 67 / 22 ms) et `--lc-sys-motion-stagger-cap` (8 rangs).
- `--lc-ref-motion-stagger` : remplacé par `--lc-ref-motion-stagger-*` et `--lc-ref-motion-offset-*`, mêmes suffixes que les rôles.
- `--lc-reveal-offset`, `--lc-reveal-stagger` (groupe `reveal` des jetons composant) : plus lus par personne, `lcReveal` lit `--lc-sys-motion-offset-sm` et `--lc-sys-motion-stagger-normal` ; `--lc-reveal-offset` n'est plus un jeton mais le délai de départ posé par l'hôte (0 par défaut). `--lc-reveal-duration`, `--lc-reveal-easing` (550 ms, `--lc-sys-easing-out`, variantes de base) et `--lc-reveal-tilt-duration` (850 ms, courbe `pop`, variante `tilt`) sont les jetons propres de `lcReveal`, séparés de `--lc-sys-duration-enter` (popover, calendrier, bascule de thème).

Renommés :
- `--lc-tabs-indicator-duration`, `--lc-nav-item-indicator-duration`, `--lc-segmented-control-indicator-duration` : `--lc-<composant>-indicator-front-duration` (bord avant).
- `--lc-tabs-indicator-easing`, `--lc-nav-item-indicator-easing`, `--lc-segmented-control-indicator-easing` : `--lc-<composant>-indicator-front-easing` (bord avant) ; le bord arrière a ses propres jetons `-indicator-back-duration`, `-indicator-back-easing` et `-indicator-back-delay`.

Règle de signe des décalages (`*-offset`) :
- Valeur positive, sans signe : le CSS applique le sens voulu (`translateY(calc(-1 * …))`, départ du bas, du haut ou du côté). C'est le cas de `--lc-sys-motion-offset-*`, `--lc-overlay-offset`, `--lc-page-exit-offset`, `--lc-page-enter-offset`, `--lc-toast-enter-offset`, `--lc-tabbar-enter-offset`, `--lc-topbar-enter-offset`, `--lc-calendar-slide-offset` (le sens du mois s'ajoute) et `--lc-title-letter-offset` (part de la hauteur de la lettre).
- Valeur signée, appliquée telle quelle : `--lc-popover-enter-offset` (−3,7 px), `--lc-lift-offset` (−4 px) et `--lc-disclosure-offset` (−5 px).

Même nom, autre valeur :
- `--lc-sys-duration-fast` 100 → 150 ms, `-normal` 200 → 250 ms, `-slow` 300 → 350 ms, `-long` 350 → 600 ms ; tout composant qui lit directement ces rôles change avec eux.
- `--lc-sys-duration-draw` 900 → 1100 ms (tracé `lcDraw`) ; nouveau rôle `--lc-sys-duration-fill` (950 ms) pour `lcFill`, qui lisait `-draw` ; nouveau jeton `--lc-count-up-duration` (1200 ms) pour `lcCountUp`, qui lisait `-draw`.
- `--lc-dialog-enter-scale` 0,96 → 0,86 (Talmo) ; `--lc-list-move-duration` 500 → 420 ms (littéral, plus un rôle) ; `--lc-list-move-easing` : `easing-standard` → `easing-draw`.
- `--lc-button-press-duration` : 100 ms littéral, découplé de `duration-fast` ; `--lc-shell-nav-duration` : 350 ms littéral, découplé de `duration-long`.

Valeurs qui changent par héritage des rôles (le nom du jeton composant ne bouge pas) :
- `--lc-message-thread-enter-stagger` 80 → 40 ms (`stagger-normal`) et `--lc-message-thread-enter-fade-duration` 200 → 250 ms (`duration-normal`).
- `--lc-slide-exit-duration` 200 → 250 ms (`duration-normal`).
- `--lc-overlay-enter-duration` 200 → 250 ms (`duration-normal`), `--lc-overlay-exit-duration` 100 → 150 ms (`duration-fast`), `--lc-chip-enter-duration` 100 → 150 ms.
- Spinner 900 → 700 ms (`--lc-spinner-duration`), y compris le spinner du bouton (`--lc-button-spinner-duration`) et celui du filtre de colonne (`--lc-table-filter-spinner-duration`), qui suivent le spinner. Squelette, bandes indéterminées (`--lc-progress-bar-indeterminate-duration`, reprise par `file-upload` et `message-composer`), appui du bouton et largeur de la barre latérale gardent leur valeur actuelle.
