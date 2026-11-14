# Spec : composants d'un parcours guidé (choix en cartes, étapes, barre de durées, action par ligne)

- **Statut** : Validée
- **Auteur** : `senior-developer` (brouillon tiré du brief du projet consommateur)
- **Date** : 2026-11-12
- **Source** : `finance-rent-vs-buy/docs/design/2026-11-parcours-guide-shape.md` §5 à §8 (validé, non modifié) ; tâche T3 de `finance-rent-vs-buy/docs/specs/2026-11-parcours-guide-debutant.md`
- **Liés** : `2026-11-catalogue-composants.md`, `2026-11-graphiques.md`, ADR 0002

## 1. Contexte et problème
Un parcours guidé pour débutant a besoin de quatre éléments absents du kit : des cartes de choix avec titre et description, un fil d'étapes, une barre de segments proportionnels à une durée, et une action par ligne de liste de définitions. Tout est **générique** : aucun vocabulaire métier.

## 2. Objectifs
- Ajouter `lc-choice-card`, `lc-stepper`, `lc-timeline-bar` ; étendre `lc-description-list` sans casser son usage.
- Réutiliser l'existant (`lc-radio-group`, `lcRadio`, `lc-skeleton`, `lc-icon`) ; tokens `--lc-sys-*` seuls ; clair et sombre ; cibles 44 px ; `prefers-reduced-motion`.

## 3. Hors périmètre
- Routage (le fil d'étapes ne connaît pas Angular Router), calculs, graphiques ECharts, autres composants existants.
- `lc-timeline-bar` n'est pas interactive ; la forme compacte du fil n'est pas interactive.

## 5. Solution proposée
| Composant | Point d'entrée | Sélecteur | Entrées | Sorties |
|---|---|---|---|---|
| Carte de choix | `forms` | `lc-choice-card` | `title` (obligatoire), `description` | aucune |
| Fil d'étapes | `navigation` | `lc-stepper` | `steps` (`{id, label, state: 'done'\|'current'\|'upcoming', optional?, invalid?, disabled?, icon?}[]`), `ariaLabel` (obligatoire), `compact` (`'auto'` ou booléen), `linear` (vrai), `orientation` (`'horizontal'` ou `'vertical'`) | `stepSelect` (id d'une étape cliquable : faites si `linear`, sinon toutes sauf désactivées), `directionChange` (`'forward'\|'backward'`) |
| Barre de durées | `data` | `lc-timeline-bar` | `segments` (`{id, weight, label, colorSlot: 1-8\|'neutral', marker?}[]`), `label`, `description` (obligatoires), `startLabel`, `endLabel`, `minLabelShare` (0,06), `emptyMessage`, `stale`, `loading`, `ticks` (`{at, label}[]`, facultatif) | aucune |
| Liste de définitions | `data` | `lc-description-list` | `LcDescriptionItem.action?: {label, ariaLabel?}` | `itemAction` (index de la ligne) |

Libellés ajoutés à `LC_LABELS` (fr, en) : `stepOf(n, N)`, `stepBack(nom)` (déprécié, conservé), `stepGoTo(n, nom)`, `stepInvalid`, `stepOptionalHidden`, `stepOptional`.

### 5.4 Interface utilisateur
Brief du designer (§5 à §8) appliqué tel quel ; pas de nouvelle direction visuelle.
- **Carte de choix** : `<label>` carte autour de l'`input[lcRadio]` projeté ; titre (600) et description (`sm`, `on-surface-muted`) reliés au radio par `aria-labelledby` et `aria-describedby` ; repos bord 1 px `border-strong`, sélectionnée fond `primary-container`, textes `on-primary-container` et bord 2 px `primary` (1 px de bord + 1 px d'ombre interne, sans décalage ; le radio coché porte le point), survol (voile seulement sous `@media (hover: hover)`, jamais sur écran tactile), anneau de focus par `:has(:focus-visible)`, désactivée, invalide (`aria-invalid`). Dans `lc-radio-group[orientation=horizontal]`, les cartes se répartissent à 180 px minimum, sinon s'empilent.
- **Fil d'étapes** : `nav` + `ol` ; pastille (coche si faite, numéro sinon) + nom ; faite = bouton « Revenir à : {nom} », en cours = `aria-current="step"`, à venir = non focalisable. Sous 768 px : « Étape n sur N : nom » + piste fine décorative.
- **Barre** : piste 32 px, segments contigus séparés de 2 px, plancher 2 px ; motif selon l'emplacement (impair plein, pair rayé 4 px, `neutral` pointillé) ; légende sous la barre (repère rond, carré ou losange + libellé, masquée sous `minLabelShare`) ; bornes début et fin ; `role="img"` + `aria-label` = `description` ; `ticks` : graduations courtes sous la piste (`at` dans l'unité des poids, de 0 au total ; hors intervalle ou non fini : ignorée), libellé centré sur la graduation (calé à l'extrémité pour 0 et le total), décoratif (`aria-hidden`, `description` reste le texte équivalent), libellé masqué visuellement s'il chevauche le précédent (graduation conservée), sans `ticks` rendu inchangé ; `stale` : barre et repères à 60 % (textes inchangés, contraste AA) ; `loading` = squelette ; vide = `emptyMessage`.

## 6. Cas limites
- Barre : poids nul, négatif ou non fini = segment non dessiné ; un seul segment ; un même `colorSlot` plusieurs fois accepté ; transition de largeur coupée sous `prefers-reduced-motion`.
- Fil : aucune étape « en cours » (compact : première étape non faite, sinon dernière) ; clic sur une étape non faite ignoré.
- Liste : `action` absente = rendu actuel inchangé.

## 9. Plan de test (écrit par `qa-engineer`)
Unitaires de chaque composant (rendu, états, sorties, ARIA) ; axe Storybook en clair et en sombre.

## 10. Critères d'acceptation
- [ ] CA-1 : `lc-choice-card` enveloppe un `input[lcRadio]` ; le nom accessible du radio est le titre, sa description est la description ; la valeur et l'état restent sur le radio ; carte entière cliquable (≥ 44 px).
- [ ] CA-2 : la carte sélectionnée se distingue sans la couleur seule (bord 2 px et point du radio) ; focus visible sur la carte ; états désactivé et invalide rendus.
- [ ] CA-3 : `lc-stepper` rend un `nav[aria-label]` et un `ol` ; l'étape en cours porte `aria-current="step"` ; seules les étapes faites sont des boutons (nom « Revenir à : {nom} ») ; `stepSelect` émet l'id d'une étape faite et jamais d'une autre.
- [ ] CA-4 : sous 768 px (ou `compact` vrai) le fil affiche « Étape n sur N : nom » et masque la liste ; au-delà, la liste complète.
- [ ] CA-5 : `lc-timeline-bar` dessine un segment par poids > 0, de largeur proportionnelle ; un poids nul n'est pas dessiné ; un même `colorSlot` peut revenir.
- [ ] CA-6 : chaque segment a une couleur de rôle (`--lc-sys-chart-categorical-N`) et un motif (plein ou rayé) ; la légende reprend le repère de forme et le libellé ; les segments sous `minLabelShare` ne figurent pas dans la légende.
- [ ] CA-7 : la barre est `role="img"` avec `description` pour nom ; `startLabel` et `endLabel` s'affichent aux extrémités ; `loading` = squelette et `aria-busy` ; vide = `emptyMessage`.
- [ ] CA-8 : `lc-description-list` affiche un bouton par ligne dotée d'une `action` et émet `itemAction` avec l'index de la ligne ; sans `action`, le rendu est identique à l'existant.
- [ ] CA-9 : aucune couleur, taille ni durée en dur ; thèmes clair et sombre ; animations coupées sous `prefers-reduced-motion` ; exports publics et stories présents ; `npm run build` réussit.

## 11. Découpage en tâches
- [ ] T1 : `lc-choice-card` (S, CA-1, CA-2)
- [ ] T2 : `lc-stepper` et libellés (M, CA-3, CA-4)
- [ ] T3 : `lc-timeline-bar` (M, CA-5 à CA-7)
- [ ] T4 : `lc-description-list` : `action` et `itemAction` (S, CA-8)
- [ ] T5 : exports, stories, build (S, CA-9)

## 12. Risques et questions ouvertes
- Le brief fixe le seuil compact à 640 px (§8.2) et à 768 px (§5) : retenu 768 px, valeur de la fiche de tâche.
- Le brief fixe la barre sur 2 motifs ; le pointillé de `neutral` (égalité, §5) est ajouté.

## 13. Évolution : fil d'étapes v2, inspiré du stepper de Kendo UI (2026-11-12)

Demande du porteur du produit : un `lc-stepper` qui ressemble davantage au stepper de Kendo UI pour Angular (https://www.telerik.com/kendo-angular-ui/components/layout/stepper), **générique** et réutilisé par le parcours guidé du module Acheter ou louer. Inspiration de comportement et de structure, pas une copie de l'apparence : le rendu reste celui des tokens du kit.

**Compatibilité** : évolution **additive**. `steps` (`{id, label, state}`), `ariaLabel`, `compact` et `stepSelect` gardent leur sens ; un consommateur de la v1 fonctionne sans modification.

### 13.1 Anatomie (horizontal)
- Une **pastille** par étape, réparties sur toute la largeur, reliées par une **piste** (trait de 2 px, `border`) qui passe derrière les pastilles ; la **partie parcourue** de la piste (de la première étape à l'étape en cours) est remplie en `primary`.
- **Libellé** centré sous chaque pastille (`label`, 500) ; étape facultative : mention « Facultative » en `sm`, `on-surface-muted`, sous le libellé.
- Pastille **faite** : remplie `primary`, coche (`check`) en `on-primary`. **En cours** : remplie `primary`, numéro (ou icône) en `on-primary`, **plus grande** (40 px contre 32 px) et entourée d'un anneau `primary-container` de 4 px ; libellé en 600. **À venir** : fond `surface`, bord 2 px `border-strong`, numéro en `on-surface-muted`. **En erreur** (`invalid`) : bord et icône `error` (`alert-circle`) ; le libellé reste lisible. **Désactivée** : opacité réduite, non cliquable.
- `icon` facultatif par étape : remplace le numéro (pas la coche d'une étape faite ni l'icône d'erreur).

### 13.2 Navigation au clic
- Nouvelle entrée `linear` (booléen, **vrai par défaut**) :
  - `linear` vrai : les étapes **faites** sont cliquables (revenir en arrière ou sur une étape déjà vue) ; l'étape en cours et les étapes à venir ne le sont pas.
  - `linear` faux : toute étape non désactivée est cliquable, en avant comme en arrière.
- Une étape cliquable est un `button` ; son nom accessible est « Aller à l'étape n : {nom} » (libellé `stepGoTo(n, nom)`, fr et en), qui remplace « Revenir à : {nom} » ; `stepSelect` émet son `id`. Une étape non cliquable n'a aucun élément focalisable.
- Le composant ne change jamais lui-même l'étape en cours : le consommateur met à jour `steps` (ou `state`) en réponse à `stepSelect`.

### 13.3 Animation quand l'étape change
- Le composant détecte le **sens** du changement (index de l'étape en cours avant et après) et pose sur l'hôte la classe `lc-stepper--forward` ou `lc-stepper--backward` le temps de l'animation.
- La partie remplie de la piste **s'allonge ou se raccourcit** (transition de largeur) ; la pastille qui devient « en cours » **grandit** (échelle de 0,8 à 1) et son anneau apparaît en fondu ; celle qu'on quitte **reprend sa taille**. Durées et courbes : `--lc-sys-duration-*` et `--lc-sys-easing-standard` (aucune durée en dur ; ajouter un token de durée moyenne au besoin).
- Nouvelle sortie `directionChange` (`'forward' | 'backward'`) émise au même moment, pour que le consommateur anime son contenu dans le même sens.
- Sous `prefers-reduced-motion: reduce` : aucune transition ni échelle ; l'état final s'affiche directement.

### 13.4 Orientation et petits écrans
- Nouvelle entrée `orientation` : `'horizontal'` (défaut) ou `'vertical'` (pastilles en colonne, piste verticale, libellé à droite).
- Forme compacte (`compact` vrai, ou `'auto'` sous 768 px) : les **pastilles et la piste restent** (sans libellés) ; sous la piste, le texte « Étape n sur N : nom » de la v1. Les étapes cliquables restent des boutons de 44 px de cible au moins (zone de clic plus large que la pastille).

### 13.5 Accessibilité
- `nav[aria-label]` > `ol` conservés ; `aria-current="step"` sur l'étape en cours ; étape désactivée : `aria-disabled` sur le bouton ou absence de bouton ; erreur : texte masqué « (à corriger) » ajouté au nom ; facultative : « (facultative) ».
- Contraste AA des numéros et libellés dans les deux thèmes ; focus visible sur chaque bouton ; la taille seule ne porte pas l'information « en cours » (anneau, graisse et `aria-current`).

### 13.6 Critères d'acceptation
- [ ] CA-10 : rendu horizontal à pastilles reliées par une piste dont la partie parcourue va jusqu'à l'étape en cours ; pastille en cours plus grande (40 px contre 32 px) avec anneau ; faite = coche ; à venir = numéro sur fond `surface`.
- [ ] CA-11 : `linear` vrai par défaut : seules les étapes faites sont des boutons ; `linear` faux : toutes les étapes non désactivées le sont ; nom accessible « Aller à l'étape n : {nom} » ; `stepSelect` émet l'id de l'étape cliquée et jamais celui d'une étape non cliquable.
- [ ] CA-12 : au changement d'étape en cours, classe `lc-stepper--forward` ou `--backward` sur l'hôte et `directionChange` émis avec le bon sens ; aucune émission au premier rendu.
- [ ] CA-13 : sous `prefers-reduced-motion: reduce`, aucune transition ni transformation n'est appliquée.
- [ ] CA-14 : `orientation="vertical"`, `optional`, `invalid`, `disabled` et `icon` rendus comme décrit au §13.1 et §13.5.
- [ ] CA-15 : compatibilité : un consommateur v1 (`steps` avec `state`, `stepSelect`, `compact`) compile et se comporte comme avant, sauf le nom accessible (« Aller à l'étape n : … »).

### 13.7 Tâches
- [ ] T6 : `lc-stepper` v2 (M, CA-10 à CA-15) ; stories : horizontal, vertical, non linéaire, erreur, facultative, compact, démonstration « Suivant / Précédent » pour voir l'animation.

### 13.8 Écarts constatés à l'implémentation (T6)
- Icône d'erreur : le registre ne contient pas `alert-circle` ; c'est `circle-alert` qui est utilisé.
- Libellés : `stepGoTo(n, nom)`, `stepInvalid` (« (à corriger) »), `stepOptionalHidden` (« (facultative) »), `stepOptional` (« Facultative », visible) ; `stepBack` est conservé et marqué déprécié.
- Une étape en erreur affiche l'icône d'erreur quel que soit son état (elle l'emporte sur la coche d'une étape faite) ; l'icône de `icon` ne remplace que le numéro.
- Animation : la pastille qui devient « en cours » grandit par **transition de taille** (32 px vers 40 px, soit l'échelle 0,8 à 1) et son anneau apparaît en fondu, après la piste (délai d'une durée `normal`) ; aucune `transform` n'est utilisée, donc rien à neutraliser sous `prefers-reduced-motion`. Aucun nouveau token : `--lc-sys-duration-normal` et `--lc-sys-easing-standard` suffisent.
- La classe de sens est retirée à la fin d'une animation CSS sans effet visible (minuterie de `2 x duration-normal`, 1 ms sous `prefers-reduced-motion`).
- Forme compacte (horizontale) : les libellés sont masqués visuellement mais restent dans le nom accessible ; l'ancienne piste fine du résumé est supprimée (la piste des pastilles la remplace). En vertical, `compact` est ignoré (les libellés restent affichés).
- Étape désactivée : `span` avec `aria-disabled="true"` (pas de bouton), ce qui exempte son texte du contrôle de contraste d'axe. En mode non linéaire, l'étape en cours est un bouton.

### 13.9 Écarts constatés (correctifs de revue de conformité du consommateur, 2026-11-13)
- Carte de choix : le voile de survol restait collé après un toucher et la carte paraissait désactivée ; il n'existe plus que sous `@media (hover: hover)`. La carte cochée a désormais le fond `primary-container` et les textes `on-primary-container` (paire contrôlée en AA par `lc-tokens`, clair et sombre) ; le bord de 2 px reste obtenu par 1 px de bord + 1 px d'ombre interne.
- Barre de durées : entrée facultative `ticks` ajoutée (graduations décoratives sous la piste). Le masquage des libellés qui se chevauchent est mesuré dans le navigateur (`getBoundingClientRect`, recalculé quand la largeur change via `ResizeObserver`) ; les graduations proches d'une extrémité mais pas à 0 ou au total gardent un libellé centré, qui peut déborder un peu de la barre.

## 14. Évolution : fil du projet (`lc-stepper` variante `rail`) et frise à deux voies (`lc-timeline-bar` `lanes`) (2026-11-14)

Source : tâches T3 et T4 de `finance-rent-vs-buy/docs/specs/2026-11-refonte-fil-du-projet.md` (CA-1, CA-9, CA-26), brief §3, §5, §9, §10, §11. Évolutions **additives** : sans `variant` ni `lanes`, rendu et API inchangés. Décision de T3 : l'extension ne déforme pas l'API du stepper (une variante, deux champs d'étape, un gabarit) ; `lc-step-rail` n'est pas créé.

### 14.1 `lc-stepper` : `variant="rail"`
| Ajout | Détail |
|---|---|
| `variant` (`'default'` \| `'rail'`) | `rail` : liste verticale à pastilles reliées (liaison pleine après une étape faite) quand la forme est large ; sinon « Étape n sur N · nom », une barre de N segments (décorative) et le bouton « Voir vos réponses » (`aria-expanded`, `aria-controls`) qui déplie la **même** liste. |
| `LcStep.answer`, `LcStep.detail` | Réponse en cours et ligne de détail atténuée, en texte brut (aucun HTML : pas de gras partiel). |
| Gabarit `ng-template[lcStepAction]` (`let-step`) | Rendu une fois par étape sous la réponse (ex. « Modifier ») ; l'application décide quelles étapes en portent. Directive `LcStepActionDirective`. |
| `compact` | En `rail` : `'auto'` = forme selon le conteneur ; `true` = étroite ; `false` = large. |
| `LC_LABELS.stepAnswers` | « Voir vos réponses » / « View your answers ». |

- **Largeur** : requête de conteneur (`@container (min-width: 900px)`), pas de fenêtre. Le conteneur est l'ancêtre le plus proche déclarant `container-type: inline-size` (le cadre de page, pas la colonne de 290 px du fil) ; **sans conteneur, forme étroite**.
- **Forme étroite** : seules les étapes qui ont une réponse ou un détail figurent dans la liste repliée ; pastilles et liaisons masquées ; les actions restent atteignables au clavier une fois la liste dépliée (liste repliée = `display: none`, hors ordre de tabulation).
- **Accessibilité** : `nav[aria-label]` > `ol`, `aria-current="step"` sur l'étape en cours, pastilles décoratives, mentions « (à corriger) » / « (facultative) » lues ; en `rail`, `orientation`, `linear` et `stepSelect` sont sans effet (les boutons sont ceux du gabarit) ; le titre est du texte, pas un bouton.
- CA-16 : en `rail`, chaque étape affiche pastille, titre, `answer`, `detail` et le gabarit d'action ; l'étape en cours porte `aria-current="step"`. CA-17 : `compact` vrai ou conteneur < 900 px : « Étape n sur N · nom » (n = étape en cours, sinon première non faite), N segments dont les n premiers pleins, bouton qui bascule `aria-expanded` et la visibilité de la liste ; `compact` faux ou conteneur ≥ 900 px : liste visible, bouton et en-tête masqués. CA-18 : sans `variant`, aucun changement (CA-10 à CA-15).

### 14.2 `lc-timeline-bar` : `lanes`
| Ajout | Détail |
|---|---|
| `lanes` (`LcTimelineLane[]`) | `{id, label, caption?, colorSlot, marker?, spans: {from, to}[]}` : une voie par ligne sur un axe commun, de 0 à `axisEnd`. Non vide, remplace `segments` (qui devient facultatif, défaut `[]`). Le motif découle de `colorSlot` (impair plein, pair rayé) et le repère de forme de `marker` : forme et motif portent le sens, pas la couleur. `caption` (ex. « devant de 0 à 5 ans », « jamais devant ») vient de l'application. |
| `axisEnd` | Fin de l'axe (défaut : plus grande fin de période). |
| `reference` (`{at, label}`) | Repère transversal : trait de 2 px en encre sur chaque voie, étiqueté sous la dernière ; hors de l'axe : ignoré. |
| `axisLabel` | Légende de l'axe, sous les graduations (`ticks` s'applique à l'axe des voies). |
| `description` | Texte équivalent de toute la frise : en mode voies, voies et repère sont dans un `role="img"` nommé par `description`. |

- **Largeur** : l'hôte devient conteneur (`container-type: inline-size`, il doit donc être un bloc de pleine largeur). Dès 700 px, le nom de la voie (160 px, `--lc-timeline-bar-lane-label-width`) est à gauche de sa piste ; dessous, il la surmonte. Graduations, repère, bornes et légende de l'axe restent alignés sur les pistes.
- Tokens : `--lc-sys-color-surface-sunken` (piste), `--lc-sys-chart-categorical-*`, `--lc-sys-color-on-surface` (repère) ; hauteur `--lc-timeline-bar-lane-height` (défaut `control-height-md`). Le liseré du rayé fait 2 px et mêle 30 % de `--lc-sys-color-on-surface` à la couleur d'emplacement (plus sombre en clair, plus clair en sombre : ≥ 3,5:1 contre la piste pour les emplacements rayés 2, 4, 6 et 8 dans les deux thèmes) ; réglable par `--lc-timeline-bar-striped-edge` et `--lc-timeline-bar-striped-edge-width`. La voie pleine est inchangée.
- CA-19 : deux voies partagent l'axe (`inset-inline-start` et `inline-size` en % de `axisEnd`) ; périodes invalides ou hors axe ignorées ou bornées ; voie sans période = piste vide et légende présente. CA-20 : le repère traverse toutes les voies à `at / axisEnd`, son étiquette est sous la dernière voie. CA-21 : sans `lanes`, rendu et DOM inchangés (CA-5 à CA-7).

### 14.3 Écarts constatés à l'implémentation (T3, T4)
- Le brief met la première valeur de la réponse en gras (« **{prix}** · … ») : `answer` est du texte brut, la réponse entière est en `on-surface-muted`. Pour un gras partiel, une extension (gabarit de réponse) reste à décider.
- Le brief nomme « Voir vos réponses » : le libellé est dans `LC_LABELS` (surchargeable), pas une entrée.
- Le séparateur « · » du résumé étroit diffère du « : » du résumé de la forme compacte par défaut (brief §3).
- Ni `lc-step-rail` ni nouveau token ne sont créés.

### 14.4 Correctifs de la revue de conformité du consommateur (`fix/refonte-conformite`, 2026-11-14)
- **Cibles tactiles (B4)** : `lcButton` garde une zone de frappe de 44 px dans les deux axes quand il est plus petit (taille `small`, icône seule) : pseudo-élément `::before` invisible, rendu inchangé, valeur réglable par `--lc-button-hit-size`. L'ancien `::before` de `small` tombait à 42 px (il ne comptait pas la bordure). Les champs n'ont pas changé : `--lc-sys-control-height-md` vaut déjà 44 px dans le kit (taille `small` : 36 px, sans zone étendue).
- **Liseré de la voie rayée (B5)** : voir 14.2.
- **Motif par série (I3)** : `LcChartSeries.pattern` (`'solid' | 'hatch' | 'hatch-reverse' | 'dots'`) pour les barres et les aires ; appliqué à l'écran et à l'impression, même avec `patterns: 'never'` ; la pastille `rect` de la légende le reproduit. Le rôle (`colorRole`) reste prioritaire ; sans `pattern`, comportement inchangé.
- **Rôle du dialogue (I7)** : `LcDialogConfig.role` (`'dialog' | 'alertdialog'`, défaut `dialog`) et `LcDialogConfig.ariaDescribedBy` (id du message) ; `confirm()` reste un `alertdialog`.
