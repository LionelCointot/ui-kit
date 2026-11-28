# Mouvement v2 : valeurs relevées dans le code du site Talmo

Source : paramètres GSAP relevés par l'orchestrateur dans le code du site de référence (valeurs numériques seulement, aucun code repris : le site est sous licence). Décision de l'utilisateur du 2026-11-27 : « Compare directement au site Talmo et ajuste les durées » ; objectif = rendu équivalent à Talmo (decisions.md n°2). Ces valeurs font foi sur `catalogue.html`, qui les avait approchées à l'œil.

Équivalences de courbes : power3.out = `easing-out` ; expo.out = `entrance` ; power2.inOut = `draw` ; power3.inOut = `inout` ; back.out(n) ≈ `pop`.

| Geste | Site Talmo | Kit avant | Kit après (jeton) |
|---|---|---|---|
| lcReveal, variantes de base (rise, drop, fade, scale, left, right) | 550 ms, power3.out, 8 à 12 px | 450 ms, `soft` (`duration-enter`) | 550 ms, `out` : `--lc-reveal-duration`, `--lc-reveal-easing` ; distance inchangée (8 px) ; `pop` garde sa courbe |
| lcReveal `tilt` (KPI) | 850 ms, back.out(1,4), y 40, ±2,5°, échelle 0,95 | 450 ms, `soft` | 850 ms, `pop` : `--lc-reveal-tilt-duration` (= `duration-title`), rythme `--lc-reveal-tilt-pace` 70 ms (stagger .07 du site, cartes : 60 ms) |
| Trait sous le titre de lc-page | 700 ms, power3.inOut, départ 320 ms | 550 ms, 390 ms | `--lc-title-line-duration` 700 ms (= `duration-view`), `--lc-title-line-delay` 320 ms |
| lcDraw (tracé) | 1100 ms, power2.inOut | 900 ms (`duration-draw`) | `--lc-sys-duration-draw` 1100 ms (le compteur ne le lit plus) |
| lcCountUp (compteur) | 1,2 s, power3.out (0,9 s sur la page Rapports) | 900 ms (`duration-draw`) | `--lc-count-up-duration` 1200 ms, courbe `out` |
| lcFill (remplissage) | 950 ms, expo.out | 900 ms (`duration-draw`) | nouveau rôle `--lc-sys-duration-fill` 950 ms (`--lc-flash-duration` s'y replie), courbe `--lc-sys-easing-fill` = `cubic-bezier(0.16, 1, 0.3, 1)` (expo.out, comme `entrance`) |
| Sparkline de lc-chart | 1300 ms | 1000 ms | `--lc-chart-sparkline-duration` 1300 ms |
| Mise à jour des données de lc-chart | 700 ms, power3.inOut, décalage 20 ms | 480 ms | `--lc-chart-update-duration` 700 ms (= `duration-view`) ; décalage inchangé |
| lc-drawer | entrée 600 ms expo.out, sortie 320 ms | 550 ms, 300 ms | `--lc-drawer-enter-duration` 600 ms (= `duration-long`), `--lc-drawer-exit-duration` 320 ms |
| lc-sheet | entrée 550 ms | 600 ms (`duration-long`) | `--lc-sheet-enter-duration` 550 ms (littéral) ; le reste inchangé |
| lc-dialog | échelle de départ 0,86, sortie 200 ms, échelle de sortie 0,94 | 0,91, 150 ms, 0,95 | `--lc-dialog-enter-scale` 0,86, `--lc-dialog-exit-duration` 200 ms (= `duration-exit`), `--lc-dialog-exit-scale` 0,94 |
| lc-menu | entrée 400 ms, décalage -6 px, échelle 0,92, sortie 150 ms | 350 ms, -5 px, 0,94, 140 ms | `--lc-menu-enter-duration` 400 ms, `-enter-offset` -6px, `-enter-scale` 0,92, `-exit-duration` 150 ms (= `duration-fast`) |
| Barre du haut | 500 ms, décalage 30 ms, distance 10 px | 450 ms, 33 ms | `--lc-topbar-enter-duration` 500 ms (= `duration-move`), `--lc-topbar-enter-stagger` 30 ms |
| lc-toast | décalage 30 px, échelle 0,94 (durées justes) | 28 px, 0,95 | `--lc-toast-enter-offset` 30px, `--lc-toast-enter-scale` 0,94 |

Déjà conformes, non touchés : titre lettre par lettre, transitions de page, glissement du calendrier, interrupteur, popover, feuille (ressort, sortie), décalage de cascade `normal` (40 ms), durées du toast.

## Hors de cette tâche (pour T10)

- **Cascade de cartes** : le site pose y 26, échelle 0,985, 800 ms expo.out, décalage 60 ms. Le kit n'a pas de variante lcReveal pour cela (`rise` et `tilt` seulement).
- **Chorégraphie par couches** : KPI vers 0,1 s, cartes 0,1 à 0,25 s, lignes 0,25 à 0,65 s, jauges 0,4 à 0,6 s, points 0,7 à 0,9 s. Le kit ne la pose nulle part : chaque composant démarre à son propre rythme.

## Relevé complémentaire du 2026-11-27 (écarts restants du passage final)

| Geste | Site Talmo | Kit | Décision |
|---|---|---|---|
| Sortie du toast | y 16 px, 250 ms, power2.in | 16 px, 250 ms | Kit conforme ; catalogue d29 (13 px) et d60 (10 px) périmés |
| Survol d'une carte (`[data-lift]`) | y −4 px, entrée 450 ms power3.out, sortie 500 ms power3.out ; aucune ombre animée | −4 px, 350 ms `out`, aller et retour | Kit à corriger : 450 ms à l'entrée, 500 ms au retour ; catalogue d31 (ombre animée) périmé |
| Chevron de section repliable (`.fold`) | `rotate: 180deg` à l'ouverture (CSS, sans transition propre) | 90° | Kit à aligner sur 180° (durée du kit conservée) |
| Onglets | liens de navigation : le panneau change de page, son contenu réapparaît en cascade (lignes y 8 px, 450 ms power3.out, 40 ms) | démo sans cascade du panneau | Démo à corriger (d45) |
| Mini-courbe de carte de chiffre (`.kpi__foot .spark`, 92 × 30 px) | tracé 1,2 s, départ 0,3 s, power2.inOut, aire à 12 % d'opacité ; masquée en dessous d'une largeur | `lc-kpi-card` sans mini-courbe | Reportée au chantier « relief » (évolutions de `lc-kpi-card`) |
