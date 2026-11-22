# Spec : composants de pilotage d'une tâche (tiroir, journal, ligne dépliable, icônes d'état)

- **Statut** : Validée
- **Auteur** : `senior-developer` (brouillon tiré du brief du projet consommateur)
- **Date** : 2026-11-13
- **Source** : `qa-platform/docs/design/2026-11-pilotage-shape.md` §10.2 à §10.5 ; tâches T22 et T23 de `qa-platform/docs/specs/2026-11-pilotage-depuis-le-tableau-de-bord.md`
- **Liés** : `2026-11-catalogue-composants.md`, ADR 0002

## 1. Contexte et problème
Piloter une tâche longue depuis un écran demande quatre éléments absents du kit : un tiroir latéral modal, un journal à ajout continu, une ligne dépliable et quatre icônes d'état. Tout est **générique** : aucun vocabulaire métier.

## 2. Objectifs
- Ajouter `lc-drawer` + `LcDrawerService` (modèle de `lc-dialog`, sur CDK Dialog), `lc-log-view`, `lc-disclosure`, et les icônes `play`, `square`, `circle-dashed`, `clock`.
- Tokens `--lc-sys-*` seuls ; clair et sombre ; cibles de 44 px ; `prefers-reduced-motion` ; libellés dans `LC_LABELS` (fr, en).

## 3. Hors périmètre
- Interprétation des séquences ANSI, dédoublonnage des lignes, recherche dans le journal, accordéon (un seul ouvert).
- Animation de fermeture du tiroir (le CDK retire le panneau immédiatement).

## 5. Solution proposée
| Composant | Point d'entrée | Sélecteur / service | Entrées | Sorties |
|---|---|---|---|---|
| Tiroir | `overlay` | `lc-drawer`, `[lcDrawerActions]`, `[lcDrawerInitialFocus]`, `LcDrawerService.open(composant, {side, size, data, disableClose, closeOnBackdrop, ariaLabel})` → `LcDrawerRef<R>` (`close(r)`, `closed`, `afterClosed()`) | `title` (obligatoire), `hideClose` ; `side` `'end'` (défaut) ou `'start'` ; `size` `'small'`, `'medium'` (défaut), `'large'` (24, 32, 40 rem) ; `LC_DRAWER_DATA` | aucune |
| Journal | `data` | `lc-log-view` | `lines` (`{id, text, prefix?, kind?: 'out'\|'err'\|'info'}[]`), `ariaLabel` (obligatoire), `maxLines` (500), `height` (`'16rem'`), `wrap` (vrai), `copyable` (vrai), `live` (`'off'` ou `'polite'`), `emptyText`, `copyLabel`, `resumeLabel`, `truncatedLabel` ; modèle `following` (vrai) | `copied` |
| Ligne dépliable | `layout` | `lc-disclosure`, `[lcDisclosureSummary]`, `[lcDisclosureActions]` | `expanded` (modèle, faux), `headingLevel` (`2` à `6` ou `null`), `disabled`, `lazy` (faux), `bordered` (faux) | `expandedChange` ; méthodes `toggle()`, `focusSummary()` |
| Icônes | `ui-angular` | `LC_DEFAULT_ICONS` | `play`, `square`, `circle-dashed`, `clock` (Lucide, même générateur `tools/generate-icons.mjs`) | |

Libellés ajoutés (fr, en) : `logCopy`, `logResume` (« Revenir en bas »), `logTruncated(n)`, `logEmpty`, `logLevelError` (« err »), `logLevelInfo` (« info »).

### 5.4 Interface utilisateur
Brief du designer appliqué ; pas de nouvelle direction visuelle.
- **Tiroir** : voile `backdrop`, panneau `surface-raised`, `shadow-3`, filet `border` côté ouverture, arrondi `lg` sur le bord libre, en-tête collant (h2 + bouton `x` 44 px), corps défilant avec ombre interne sous l'en-tête quand il défile, pied collant. Sous 768 px : plein écran, sans arrondi. Entrée par translation et fondu (`--lc-sys-duration-normal`), aucune sous `prefers-reduced-motion`.
- **Journal** : cadre `surface-sunken`, filet, rayon `md` ; barre avec « Copier le journal » ; lignes en `--lc-sys-font-family-mono` ; avis « n lignes plus anciennes masquées » en tête si plafonné ; bouton « Revenir en bas » quand le suivi est en pause. Les lignes `err` portent le préfixe texte « err » et la couleur `error` ; `info` la couleur `info` avec le repère « info » ; la couleur `error` est assombrie vers l'encre pour tenir 4,5:1 sur `surface-sunken`.
- **Ligne dépliable** : bouton résumé pleine largeur (chevron `chevron-right` pivotant de 90°, min 44 px) puis actions hors du bouton ; région `role="group"` sous l'en-tête ; hauteur non animée si `prefers-reduced-motion`.

## 6. Cas limites
- Tiroir : composant ouvert sans `lc-drawer` (nom accessible par `ariaLabel`) ; un `lc-dialog` ouvert depuis le tiroir passe au-dessus ; `disableClose` : Échap, voile et bouton `x` sans effet.
- Journal : `lines` vide = `emptyText` ; plus de `maxLines` lignes = les plus anciennes sont retirées du DOM et l'avis s'affiche ; ids non uniques non gérés (à l'appelant) ; presse-papiers refusé = « Copie impossible » annoncée.
- Ligne dépliable : `lazy` : contenu rendu au premier dépliage puis conservé ; replié = `hidden` et `inert` ; `disabled` : bouton désactivé.

## 7. Sécurité, performance
- Texte du journal inséré comme texte (jamais `innerHTML`) ; SVG des icônes = constantes du code.
- Journal : au plus `maxLines` nœuds ; suivi de la fin sans défilement animé.

## 10. Critères d'acceptation
- [ ] CA-1 : `lc-drawer` est rendu à droite par défaut (`side="start"` : à gauche), dans la largeur de `size` ; en-tête (h2 + bouton de fermeture), corps défilant, pied d'actions.
- [ ] CA-2 : le panneau a `role="dialog"`, `aria-modal="true"` et un nom accessible (titre ou `ariaLabel`) ; le focus est piégé, va au premier contrôle ou à `[lcDrawerInitialFocus]`, puis revient à l'élément ouvrant.
- [ ] CA-3 : Échap, le voile (si `closeOnBackdrop`) et le bouton de fermeture ferment et résolvent `afterClosed()` avec le résultat ; `disableClose` les neutralise et masque le bouton.
- [ ] CA-4 : sous 768 px le tiroir est plein écran ; l'animation d'entrée est coupée sous `prefers-reduced-motion` ; `forced-colors` : filet visible.
- [ ] CA-5 : `lc-log-view` est `role="log"` focusable, nommé par `ariaLabel`, `aria-live` = `live` (`off` par défaut) ; lignes en police à chasse fixe ; état vide.
- [ ] CA-6 : un ajout en bas suit la fin tant que `following` est vrai ; un défilement vers le haut le passe à faux et affiche « Revenir en bas » ; ce bouton, la touche Fin ou l'arrivée en bas le rétablit.
- [ ] CA-7 : au-delà de `maxLines`, les plus anciennes lignes sont retirées et « n lignes plus anciennes masquées » s'affiche ; la copie reprend les lignes présentes avec leur préfixe et émet `copied`.
- [ ] CA-8 : les lignes `err` et `info` portent un préfixe texte en plus de la couleur ; contraste AA clair et sombre.
- [ ] CA-9 : `lc-disclosure` : bouton avec `aria-expanded` et `aria-controls` ; région `role="group"` `aria-labelledby` du résumé ; `expandedChange` à chaque bascule ; les actions ne sont jamais dans le bouton ; plusieurs ouverts en même temps.
- [ ] CA-10 : `lazy` ne rend le contenu qu'au premier dépliage ; replié = `hidden` + `inert` ; `headingLevel` enveloppe l'en-tête d'un titre ; `disabled` empêche la bascule.
- [ ] CA-11 : les icônes `play`, `square`, `circle-dashed`, `clock` sont résolues par `lc-icon`.
- [ ] CA-12 : aucune couleur, taille ni durée en dur ; thèmes clair et sombre ; cibles ≥ 44 px ; exports publics et stories présents ; `npm run build` réussit ; axe sans violation.

## 11. Découpage en tâches
- [ ] T22 : `lc-drawer` et `LcDrawerService` (M, CA-1 à CA-4)
- [ ] T23a : `lc-log-view` (M, CA-5 à CA-8)
- [ ] T23b : `lc-disclosure` (S, CA-9, CA-10)
- [ ] T23c : icônes (S, CA-11)
- [ ] T23d : exports, stories, build (S, CA-12)

## 12. Risques et questions ouvertes
- Écarts entre le brief (§10) et la fiche de tâche, tranchés en faveur de la fiche : plein écran sous 768 px (brief : 640), bouton « Revenir en bas » (brief : « Revenir à la fin »), `aria-live` réglable par `live` (brief : fixé à `off`) ; **défaut conservé à `off`** (aucune annonce de ligne, décision du brief), `polite` sur demande.

- Écart du 2026-11-22 : `lc-log-view` (T23a, CA-5 à CA-8) est retiré du kit (aucun consommateur), avec ses libellés `log*`.

- Écart du 2026-11-22 : `LcDrawerConfig.dismissible` (défaut true, comme `LcDialogService`) remplace `disableClose` et `closeOnBackdrop`.
