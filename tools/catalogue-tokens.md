## Tokens de mouvement supprimés, renommés ou revalorisés (mouvement v2)

Supprimés (aucun alias : les consommateurs passent aux nouveaux noms) :
- `--lc-sys-motion-offset` (8 px) : remplacé par `--lc-sys-motion-offset-{sm|md|lg|xl}` (8 / 16 / 26 / 40 px), `-sm` reprend l'ancienne valeur.
- `--lc-sys-motion-stagger` (80 ms) : remplacé par `--lc-sys-motion-stagger-{fine|normal|cards|chars}` (12 / 40 / 67 / 22 ms) et `--lc-sys-motion-stagger-cap` (8 rangs).
- `--lc-ref-motion-stagger` : remplacé par `--lc-ref-motion-stagger-*` et `--lc-ref-motion-offset-*`, mêmes suffixes que les rôles.

Renommés :
- `--lc-tabs-indicator-duration`, `--lc-nav-item-indicator-duration`, `--lc-segmented-control-indicator-duration` : `--lc-<composant>-indicator-front-duration` (bord avant).
- `--lc-tabs-indicator-easing`, `--lc-nav-item-indicator-easing`, `--lc-segmented-control-indicator-easing` : `--lc-<composant>-indicator-front-easing` (bord avant) ; le bord arrière a ses propres jetons `-indicator-back-duration`, `-indicator-back-easing` et `-indicator-back-delay`.

Même nom, autre valeur :
- `--lc-sys-duration-fast` 100 → 150 ms, `-normal` 200 → 250 ms, `-slow` 300 → 350 ms, `-long` 350 → 600 ms.
- `--lc-dialog-enter-scale` 0,96 → 0,91 ; `--lc-list-move-duration` 500 → 420 ms (littéral, plus un rôle) ; `--lc-list-move-easing` : `easing-standard` → `easing-draw`.
- `--lc-button-press-duration` : 100 ms littéral, découplé de `duration-fast` ; `--lc-shell-nav-duration` : 350 ms littéral, découplé de `duration-long`.
- `--lc-reveal-stagger` : repliée sur `--lc-sys-motion-stagger-normal` (40 ms) ; `--lc-reveal-offset` et `--lc-overlay-offset` : sur `--lc-sys-motion-offset-sm`.
