# Brief : sélecteur de date (date simple B, période C)

Complète la §5.4 de `docs/specs/2026-11-selecteur-de-date.md`. Direction retenue par l'utilisateur : **B** (saisie par zones, calendrier à trois niveaux) pour la date simple, **C** pour la période. Maquettes : `docs/design/explorations/2026-11-date-picker/`. Statut : à valider ; test `novice-user` sur les textes du §2 à lancer par l'orchestrateur. Tokens : `--lc-sys-*` seulement ; les `--lc-calendar-*` vont dans `packages/tokens/src/components/calendar.tokens.json` (références `{sys.…}`, comme `card.tokens.json`) et dans le CSS avec repli sur `--lc-sys-*`. Aucun `--lc-ref-*`, aucune valeur en dur.

## 0. Deux décisions de conception

**D1. Saisie par zones : un seul `input` texte (retenu), pas trois `spinbutton`.**

| | Un `input` texte masqué « jj/mm/aaaa », zone active sélectionnée | Trois zones `role="spinbutton"` dans un groupe |
|---|---|---|
| Lecteur d'écran | Un champ de texte étiqueté par `label for`. Le texte sélectionné est lu par la plupart des lecteurs, pas tous (VoiceOver moins sûr). On ajoute une annonce polie du nom et de la valeur de la zone (« Jour, 12 »). | Meilleur : « Jour, 12, bouton de réglage », plage et nom du mois par `aria-valuetext`. Mais l'étiquette ne désigne que la première zone : il faut un groupe étiqueté. |
| Souris | Un clic sélectionne la zone sous le curseur ; le collage d'une date entière marche ; le remplissage automatique du navigateur aussi. | Un clic place la zone ; le collage demande du code. |
| Contrat | `inputId`, `label for`, `focus()` inchangés. | `inputId` ne désigne qu'une zone ; `focus()` change de sens. |
| Coût | Masque, sélection de zone, annonces : un fichier pur `date-mask.ts` + tests. | Trois éléments, navigation entre zones, groupe : plus de code et de cas. |

Limites assumées du choix : les lettres de zone vides (« jj ») ont la même couleur que les chiffres (distinction par la forme : lettres contre chiffres) ; Tab quitte le champ au lieu de passer de zone en zone (flèches gauche / droite, ou la frappe, avancent). Le calendrier n'est actif que sur pointeur fin (peu de claviers virtuels, donc peu de soucis de saisie). **Repli si le test avec lecteur d'écran échoue** : trois `spinbutton` ; à noter en risque.

**D2. Période : oui aux niveaux mois / décennie et oui à la saisie par zones**, avec une règle qui évite la confusion : dans le panneau à deux mois, cliquer **n'importe quel titre** remplace les deux mois par **une seule grille** (12 mois, ou 12 années) pleine largeur. Choisir un mois ou une année ne choisit aucune date : on revient aux deux mois, le mois choisi à gauche. Les niveaux ne servent qu'à naviguer, la date se choisit toujours au niveau des jours (aussi pour la date simple). Les champs « Du » et « Au » sont deux champs à zones identiques à `lc-date-input`.

**Date impossible : confirmé, on ramène le jour au dernier du mois** (31/02 devient 28/02 ou 29/02), pas de message d'erreur. Garde-fous : le changement est **visible** (le champ affiche le jour corrigé) et **annoncé** (« Jour ramené au 28 février. »), sinon une faute de frappe passerait inaperçue. Même règle au collage et quand une flèche change l'année ou le mois (29/02/2024 + flèche haut sur l'année). **Date incomplète à la sortie** : confirmé, valeur `null`, état invalide, message « Date incomplète. Exemple : 12/11/2026 ». Champ entièrement vide : pas d'erreur propre (l'obligation reste celle du formulaire).

## 1. Anatomie et tokens

Rayons : `radius-sm` (cadres), `radius-full` (jour, mois, année choisis).

**1.1 Champ de date en mode calendrier** (`input[lcInput]` texte + bouton) : reprend le champ du kit (hauteur `control-height-*`, bordure, rayon, état invalide : tokens `--lc-input-*` existants, rien de nouveau). Bouton icône à droite : icône `calendar` (déjà au registre), `icon-size-md`, cible = hauteur du champ. `inputmode="numeric"`, `autocomplete="off"`, `aria-describedby` vers la phrase d'aide (lecteur d'écran seulement). Zone active : `::selection` en `--lc-calendar-zone-bg` / `--lc-calendar-zone-text`. Le bouton porte `aria-haspopup="dialog"` et `aria-expanded`.

**1.2 Panneau (dialogue)**, de haut en bas : en-tête, corps, pied.
- Conteneur : fond `--lc-calendar-background`, bordure `--lc-calendar-border` (`border-width-thin`), rayon `--lc-calendar-radius`, ombre `--lc-calendar-shadow`, `z-overlay`, texte `--lc-calendar-text`, `font-size-md`.
- En-tête : bouton précédent · **titre-bouton** · bouton suivant. Boutons icône `chevron-left` / `chevron-right`, cible `--lc-calendar-cell-size`. Titre : `font-weight-semibold`, survol `--lc-calendar-day-hover-bg`, pas de soulignement ; une petite icône `chevron-down` indique qu'il s'ouvre. Au niveau décennie le titre n'est pas un bouton (sommet).
- Corps, **hauteur fixe** = 7 lignes de cellules (en-tête des jours + 6 semaines) pour ne pas sauter d'un niveau à l'autre ; mois et années s'étirent sur 4 colonnes × 3 lignes.
  - Jours : en-têtes `columnheader` (lettre, `abbr` = nom complet) en `--lc-calendar-weekday-text`, `font-size-sm`. Cellule = carré de `--lc-calendar-cell-size`, chiffre centré, chiffres tabulaires.
  - Mois : libellé court (« janv. »), 12 cellules. Années : 12 cellules (la décennie, plus l'année avant et l'année après en `--lc-calendar-weekday-text`, choisissables).
- Pied : « Aujourd'hui » et « Effacer », boutons texte du kit (variante `text`), séparés du corps par un filet `--lc-calendar-border`. « Effacer » absent si le champ est obligatoire.

**1.3 Champ de période** : groupe `role="group"` étiqueté (« Période » ou `ariaLabel`), deux champs à zones (1.1) précédés des libellés visibles « Du » / « Au » (`font-size-sm`, `--lc-calendar-weekday-text`), un seul bouton calendrier à droite. À moins de 28 rem de large (requête de conteneur, Baseline 2024) : les deux champs s'empilent.

**1.4 Panneau de période** : même coque que 1.2, corps = deux mois côte à côte (`--lc-calendar-month-gap`), une ligne d'état visible au-dessus (`role="status"`, `font-size-sm`, `--lc-calendar-weekday-text`) : « Choisissez la date de début. » puis « Choisissez la date de fin. ». Raccourcis : colonne à gauche ≥ 840 px de large de fenêtre, sinon rangée de boutons (retour à la ligne) au-dessus des mois. Bouton de raccourci : `font-size-sm`, hauteur `control-height-sm`, `radius-sm`.

**1.5 Mode natif tactile** : un ou deux `input[type=date]` du kit, sans bouton ni panneau. Période : sous les champs, rangée « Raccourcis » (`role="group"`) des mêmes boutons qu'en 1.4.

**Tokens de composant à créer** (nom → repli `--lc-sys-*` : rôle)

| Token `--lc-calendar-…` | Repli | Rôle |
|---|---|---|
| `cell-size` | `space-10` (40 px) | côté d'une cellule, cible minimale |
| `padding` | `space-3` | marge intérieure du panneau |
| `month-gap` | `space-6` | espace entre deux mois |
| `presets-width` | `calc(var(--lc-sys-space-16) * 2.5)` | colonne des raccourcis |
| `radius` | `radius-md` | coins du panneau |
| `background` | `color-surface-raised` | fond |
| `border` | `color-border` | contour et filet du pied |
| `shadow` | `shadow-3` | ombre |
| `text` | `color-on-surface` | chiffres et titres |
| `weekday-text` | `color-on-surface-muted` | jours de la semaine, années voisines, ligne d'état |
| `day-hover-bg` | `color-surface-sunken` | survol d'une cellule, du titre |
| `day-disabled-text` | `color-on-surface-subtle` | hors bornes |
| `selected-bg` / `selected-text` | `color-primary` / `color-on-primary` | jour, mois, année choisis, extrémités |
| `range-bg` / `range-text` | `color-primary-container` / `color-on-primary-container` | intérieur de la période |
| `range-preview-edge` | `color-primary` | bords en tirets de l'aperçu |
| `today-mark` | `color-primary` | point « aujourd'hui » |
| `today-mark-size` | `space-1` | taille du point |
| `focus-ring` | `color-focus-ring` | anneau clavier |
| `zone-bg` / `zone-text` | `color-primary-container` / `color-on-primary-container` | zone active du champ |
| `duration` / `easing` | `duration-fast` / `easing-standard` | mouvement |

Contrôle `npx lc-tokens check` : ajouter à `packages/tokens/src/checks/contrast-pairs.json`, si absentes : `on-primary`/`primary` 4,5 · `on-primary-container`/`primary-container` 4,5 · `on-surface-muted`/`surface-raised` 4,5 · `primary`/`surface-raised` 3 et `primary`/`primary-container` 3 (point) · `focus-ring`/`surface-raised` 3 et `focus-ring`/`primary-container` 3.

## 2. Textes (mot pour mot ; clés `LC_LABELS` à ajouter)

| Usage | Français | Anglais |
|---|---|---|
| Zones vides, dans l'ordre de `LC_LOCALE` | jj / mm / aaaa | dd / mm / yyyy |
| Noms des zones (annonce) | Jour · Mois · Année | Day · Month · Year |
| Annonce d'une zone | « Jour, 12 » · « Mois, novembre » · « Année, 2026 » · « Jour, vide » | « Day, 12 » · « Month, November » · « Year, 2026 » · « Day, empty » |
| Aide du champ (lecteur d'écran) | Tapez la date, ou changez chaque zone avec les flèches haut et bas. | Type the date, or change each part with the up and down arrow keys. |
| Bouton, sans valeur | Choisir une date | Choose a date |
| Bouton, avec valeur | Changer la date, 12 novembre 2026 | Change date, November 12, 2026 |
| Bouton de période | Choisir une période · Changer la période, du 3 au 12 novembre 2026 | Choose a period · Change period, from November 3 to November 12, 2026 |
| Titre du dialogue (`aria-label`) | Choisir une date · Choisir une période | Choose a date · Choose a period |
| Titre-bouton, jours | « novembre 2026 » (nom : « novembre 2026 : choisir un mois ») | "November 2026" (name: "November 2026: choose a month") |
| Titre-bouton, mois | « 2026 » (nom : « 2026 : choisir une année ») | "2026" (name: "2026: choose a year") |
| Titre, décennie (texte seul) | 2020 – 2029 | 2020 – 2029 |
| Boutons de navigation | Mois précédent · Mois suivant · Année précédente · Année suivante · Décennie précédente · Décennie suivante | Previous month · Next month · Previous year · Next year · Previous decade · Next decade |
| Cellule jour (nom) | jeudi 12 novembre 2026 | Thursday, November 12, 2026 |
| Cellule mois (nom) | novembre 2026 | November 2026 |
| Pied | Aujourd'hui · Effacer | Today · Clear |
| Date incomplète (à la sortie) | Date incomplète. Exemple : 12/11/2026 | Incomplete date. Example: 11/12/2026 |
| Collage illisible (champ inchangé, annoncé et affiché jusqu'à la frappe suivante) | Date non reconnue. Exemple : 12/11/2026 | Date not recognized. Example: 11/12/2026 |
| Jour ramené (annonce, polie) | Jour ramené au 28 février. | Day set to February 28. |
| Libellés de période | Du · Au · Période | From · To · Period |
| Ligne d'état | Choisissez la date de début. · Choisissez la date de fin. | Choose the start date. · Choose the end date. |
| Début choisi (annonce) | Début : 3 novembre 2026. Choisissez la date de fin. | Start: November 3, 2026. Choose the end date. |
| Période choisie (annonce) | Période choisie : du 3 novembre 2026 au 12 novembre 2026. | Period selected: from November 3, 2026 to November 12, 2026. |
| Rangée native | Raccourcis | Shortcuts |

L'exemple « 12/11/2026 » est le 12 novembre 2026 mis en forme par la locale (l'anglais américain donne 11/12/2026). Changement de mois, d'année ou de niveau : le titre (`aria-live="polite"`) est relu ; pas d'annonce à l'ouverture.

**Raccourcis (confirmés, précisés)** : « 7 derniers jours » = 6 jours avant aujourd'hui jusqu'à aujourd'hui (aujourd'hui compris) · « 30 derniers jours » = 29 jours avant, jusqu'à aujourd'hui · « Ce mois-ci » = du 1er au dernier jour du mois, rogné par `max` (un filtre d'historique pose `max` = aujourd'hui) · « Le mois dernier » = tout le mois précédent. Anglais : Last 7 days · Last 30 days · This month · Last month. Je n'ajoute pas « Cette semaine » : quatre suffisent.

## 3. États

Trois repères, trois **formes** : **disque** plein (choisi), **point** sous le chiffre (aujourd'hui), **anneau carré** (focus). L'anneau est un contour de la cellule carrée, **à l'intérieur** (`outline-offset` négatif de `focus-ring-width`), le disque est inscrit avec une marge de `space-1` : les deux ne se confondent plus et le point n'est jamais touché. Mois et années : le disque devient une pilule (`radius-full`), le point et l'anneau sont identiques.

| État | Rendu |
|---|---|
| Repos | texte `--lc-calendar-text`, pas de fond |
| Survol | disque en `--lc-calendar-day-hover-bg` ; titre et boutons : même fond |
| Focus clavier | anneau carré `--lc-calendar-focus-ring`, largeur `focus-ring-width` ; un seul focus visible à la fois (grille à tabulation unique) |
| Choisi | disque `selected-bg`, chiffre `selected-text`, `font-weight-semibold`, `aria-selected` |
| Aujourd'hui | point `today-mark` ; nom `aria-current="date"` |
| Aujourd'hui et choisi | disque + point en `selected-text` ; focus en plus : anneau |
| Hors bornes | `day-disabled-text`, `aria-disabled="true"`, curseur interdit, pas de survol ; reste atteignable au clavier (on comprend pourquoi on ne peut pas) ; navigation hors bornes : bouton désactivé (`state-disabled-opacity`) |
| Période : extrémités | disque plein, avec une demi-bande `range-bg` du côté de l'intérieur |
| Période : intérieur | bande pleine largeur `range-bg`, chiffre `range-text`, sans coins sauf en début et fin de semaine (`radius-full` sur le bord) |
| Période : aperçu | même bande mais **bords haut et bas en tirets** `range-preview-edge` (forme, pas seulement couleur) ; extrémité d'aperçu en disque creux (contour `border-width-thick`) |
| Désactivé / lecture seule (champ) | pas de bouton, pas de panneau ; `state-disabled-opacity` pour désactivé ; lecture seule : texte normal, sélectionnable, zones non modifiables |
| Invalide | cadre d'erreur du kit, `aria-invalid`, message sous le champ relié par `aria-describedby` |

## 4. Dimensions et disposition

- Cellule 40 px (`space-10`) : un mois = 7 × 40 + 2 × `padding` = 304 px, **fixe**, indépendant du champ. Les niveaux mois et décennie gardent la même largeur et la même hauteur.
- Deux mois : 2 × 280 + `month-gap` + 2 × `padding` = 608 px, donc tient dans une fenêtre de 640 px (+ marge de `space-2` de chaque côté). **Deux mois à partir de 640 px, un seul en dessous** : confirmé. Une requête de média n'accepte pas de token : le seuil vit dans le code (`BreakpointObserver` du CDK), en 640 px pour les mois et **840 px** pour la colonne de raccourcis (608 + 160 + marges).
- 44 px (`control-height-md`) pour les cellules ferait 664 px : ne tiendrait plus à 640 px. Pointeur fin seulement, donc 40 px suffit ; boutons du pied et raccourcis : au moins `control-height-sm` (36 px) de haut, plus large que haut.
- Fenêtre d'ordinateur de 360 px : un mois (304 px) + marge `space-2` : tient, pas de défilement horizontal ; raccourcis en rangée au-dessus, retour à la ligne. Le CDK repositionne le panneau (au-dessus, aligné à droite) ; hauteur maximale : celle de la fenêtre, le corps défile si besoin.

## 5. Clavier et lecteur d'écran (comparé au motif ARIA *date picker dialog*)

Ce qui est juste dans la spec : `role="dialog"` nommé, focus piégé et rendu au bouton, flèches / Début / Fin / Page, Maj + Page = année, Entrée ou Espace, Échap sans changement, `aria-live="polite"` sur le titre, `aria-current="date"`, grille `role="grid"`. **À corriger ou ajouter** :
1. `aria-modal="true"` sur le dialogue (manquant). Le bouton déclencheur : `aria-haspopup="dialog"`, `aria-expanded`.
2. `aria-selected` va sur la **cellule** (`role="gridcell"` dans un `role="row"`), pas sur le bouton ; les en-têtes sont des `columnheader` ; la grille a `aria-labelledby` vers le titre.
3. **Tabulation** : une seule étape pour la grille (focus mobile, `tabindex` tournant). Ordre : précédent, titre, suivant, grille, Aujourd'hui, Effacer ; Maj + Tab à l'envers.
4. Jours hors bornes : atteignables au clavier, `aria-disabled`, Entrée sans effet (la spec disait seulement « non cliquable »).
5. Début / Fin = début et fin de **semaine** (lundi, dimanche) : conforme. Ajout : Alt + Flèche bas dans le champ ouvre le panneau.
6. Premier focus : jour choisi, sinon aujourd'hui, sinon le **jour autorisé le plus proche d'aujourd'hui** (la spec disait « le premier »).
7. **Niveaux** : Entrée ou Espace sur le titre = niveau supérieur ; sur un mois ou une année = niveau inférieur, focus sur la cellule choisie. Flèches : ±1 et ±4 (4 colonnes). Page : un pas du niveau (mois, année, décennie). Maj + Page : seulement au niveau des jours (année). Échap ferme toujours le panneau entier (pas de retour d'un niveau) : un comportement unique.
8. Période : Entrée sur un jour = début, flèches = aperçu, Entrée = fin et fermeture. Échap pendant le choix de la fin : ferme et **abandonne** le début, valeur inchangée.
9. Champ à zones : flèches gauche / droite ou `/`, `.`, `-` : zone voisine ; flèches haut / bas : ±1 dans la zone (jour de 1 au dernier du mois, mois de 1 à 12, année), avec retour au début de la plage sans toucher aux autres zones ; chiffres : jour dont le premier chiffre est 4 à 9 et mois dont le premier chiffre est 2 à 9 passent seuls à la zone suivante, deux chiffres aussi, l'année s'arrête à 4 ; Retour arrière / Suppr : vide la zone (valeur `null` aussitôt) ; Ctrl + V : date entière dans les formes de la §5.3.
10. Le nom d'un jour est sa date complète ; mois et années : mois et année complets.

## 6. Mouvement

Apparition du panneau : fondu `opacity` en `--lc-calendar-duration` / `--lc-calendar-easing`, pas de glissement. Survol : changement de fond sur la même durée. Changement de mois ou de niveau : aucun mouvement (remplacement net). `@media (prefers-reduced-motion: reduce)` : apparition et survol instantanés. Aucune minuterie.

## 7. Ce que je changerais dans la spec

1. §3 et §8 : retirer « saisie segmentée » et « niveaux mois / décennie » des non-objectifs ; B devient la direction retenue ; §12 : supprimer la question A / B.
2. §5.3 : décrire le champ à zones (D1 : un `input` masqué, comportements du §5 ci-dessus, point 9) à la place de « texte libre analysé » ; la forme libre reste acceptée au collage. Ajouter la règle du jour ramené et le message « Date incomplète ».
3. §5.3 / CA-5 : l'erreur « Date non reconnue » ne concerne plus que le collage ; ajouter CA pour : date incomplète à la sortie, jour ramené (28 / 29 février, annonce), passage automatique de zone, flèches haut / bas, collage.
4. §5.4 : remplacer « une grille, pas de jours voisins » par les trois niveaux ; ajouter D2 (une grille pleine largeur dans la période) et un CA par niveau (navigation, titres, 12 cellules, bornes).
5. §5.4 / CA-12 : repères = disque, point, anneau **carré intérieur** ; testable par styles calculés (fond, point présent, contour).
6. §5.4 / CA-9 : `aria-modal`, `aria-selected` sur la cellule, `columnheader`, tabulation unique, jours hors bornes atteignables ; Échap pendant la période abandonne le début.
7. §5.4 / CA-20 : 640 px pour les deux mois confirmé ; **colonne de raccourcis à partir de 840 px** (la spec disait 640 px) ; cellule 40 px, panneau 304 px.
8. §5.3 / CA-19 : définitions des raccourcis (aujourd'hui compris ; « Ce mois-ci » jusqu'à la fin du mois, rogné par `max`).
9. §5.3 / CA-22 : le texte d'exemple se compose des lettres de zone (jj, mm, aaaa) dans l'ordre de la locale, pas d'une chaîne entière ; ajouter les libellés du §2 de ce brief ; ligne d'état de la période visible.
10. §5.1 / §11 : tokens dans `calendar.tokens.json` + paires de contraste ; ajouter un fichier pur `date-mask.ts` (zones, clamp, auto-avance) et scinder T2 en T2 (jours) et T2b (niveaux mois / décennie) ; T3 inclut le champ à zones. Les écarts de coût : B ≈ deux fois A, déjà dit en §8.
11. §12 : ajouter le risque « lecteur d'écran sur l'`input` à zones, test manuel NVDA et VoiceOver avant T3 ; repli trois `spinbutton` ».
