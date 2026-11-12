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
| Fil d'étapes | `navigation` | `lc-stepper` | `steps` (`{id, label, state: 'done'\|'current'\|'upcoming'}[]`), `ariaLabel` (obligatoire), `compact` (`'auto'` ou booléen) | `stepSelect` (id, étapes faites seulement) |
| Barre de durées | `data` | `lc-timeline-bar` | `segments` (`{id, weight, label, colorSlot: 1-8\|'neutral', marker?}[]`), `label`, `description` (obligatoires), `startLabel`, `endLabel`, `minLabelShare` (0,06), `emptyMessage`, `stale`, `loading` | aucune |
| Liste de définitions | `data` | `lc-description-list` | `LcDescriptionItem.action?: {label, ariaLabel?}` | `itemAction` (index de la ligne) |

Libellés ajoutés à `LC_LABELS` (fr, en) : `stepOf(n, N)`, `stepBack(nom)`.

### 5.4 Interface utilisateur
Brief du designer (§5 à §8) appliqué tel quel ; pas de nouvelle direction visuelle.
- **Carte de choix** : `<label>` carte autour de l'`input[lcRadio]` projeté ; titre (600) et description (`sm`, `on-surface-muted`) reliés au radio par `aria-labelledby` et `aria-describedby` ; repos bord 1 px `border-strong`, sélectionnée bord 2 px `primary` (le radio coché porte le point), survol, anneau de focus par `:has(:focus-visible)`, désactivée, invalide (`aria-invalid`). Dans `lc-radio-group[orientation=horizontal]`, les cartes se répartissent à 180 px minimum, sinon s'empilent.
- **Fil d'étapes** : `nav` + `ol` ; pastille (coche si faite, numéro sinon) + nom ; faite = bouton « Revenir à : {nom} », en cours = `aria-current="step"`, à venir = non focalisable. Sous 768 px : « Étape n sur N : nom » + piste fine décorative.
- **Barre** : piste 32 px, segments contigus séparés de 2 px, plancher 2 px ; motif selon l'emplacement (impair plein, pair rayé 4 px, `neutral` pointillé) ; légende sous la barre (repère rond, carré ou losange + libellé, masquée sous `minLabelShare`) ; bornes début et fin ; `role="img"` + `aria-label` = `description` ; `stale` : barre et repères à 60 % (textes inchangés, contraste AA) ; `loading` = squelette ; vide = `emptyMessage`.

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
