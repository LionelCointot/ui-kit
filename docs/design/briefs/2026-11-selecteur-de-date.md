# Brief : sélecteur de date (date simple B, période C)

Complète la §5.4 de `docs/specs/2026-11-selecteur-de-date.md`. Direction retenue par l'utilisateur : **B** (saisie par zones, calendrier à trois niveaux) pour la date simple, **C** pour la période. Maquettes : `docs/design/explorations/2026-11-date-picker/`. Statut : aligné sur la spec réécrite (révision après le test `novice-user`, 2026-11-19). Types de la spec : `LcDateInterval` (`from` / `to`), jeton `LC_DATE_PICKER` (aucune entrée `picker`). Tokens : `--lc-sys-*` seulement ; les `--lc-calendar-*` vont dans `packages/tokens/src/components/calendar.tokens.json` (références `{sys.…}`, comme `card.tokens.json`) et dans le CSS avec repli sur `--lc-sys-*`. Aucun `--lc-ref-*`, aucune valeur en dur.

## 0. Décisions de conception

**D1. Saisie par zones : un seul `input` texte (retenu), pas trois `spinbutton`.**

| | Un `input` texte masqué « jj/mm/aaaa », zone active sélectionnée | Trois zones `role="spinbutton"` dans un groupe |
|---|---|---|
| Lecteur d'écran | Un champ de texte étiqueté par `label for`. Le texte sélectionné est lu par la plupart des lecteurs, pas tous (VoiceOver moins sûr). On ajoute une annonce polie du nom et de la valeur de la zone (« Jour, 12 »). | Meilleur : « Jour, 12, bouton de réglage », plage et nom du mois par `aria-valuetext`. Mais l'étiquette ne désigne que la première zone : il faut un groupe étiqueté. |
| Souris | Un clic sélectionne la zone sous le curseur ; le collage d'une date entière marche ; le remplissage automatique du navigateur aussi. | Un clic place la zone ; le collage demande du code. |
| Contrat | `inputId`, `label for`, `focus()` inchangés. | `inputId` ne désigne qu'une zone ; `focus()` change de sens. |
| Coût | Masque, sélection de zone, annonces : un fichier pur `date-mask.ts` + tests. | Trois éléments, navigation entre zones, groupe : plus de code et de cas. |

Limites assumées du choix : les lettres de zone vides (« jj ») ont la même couleur que les chiffres (distinction par la forme : lettres contre chiffres) ; Tab quitte le champ au lieu de passer de zone en zone (flèches gauche / droite, ou la frappe, avancent). Le calendrier n'est actif que sur pointeur fin (peu de claviers virtuels, donc peu de soucis de saisie). **Repli si le test avec lecteur d'écran échoue** : trois `spinbutton` ; à noter en risque.

**D2. Période : oui aux niveaux mois / années et oui à la saisie par zones**, avec une règle qui évite la confusion : dans le panneau à deux mois, cliquer **n'importe quel titre** remplace les deux mois par **une seule grille** (12 mois, ou 12 années) pleine largeur. Choisir un mois ou une année ne choisit aucune date : on revient aux deux mois, le mois choisi à gauche. Les niveaux ne servent qu'à naviguer, la date se choisit toujours au niveau des jours (aussi pour la date simple). Les champs « Du » et « Au » sont deux champs à zones identiques à `lc-date-input`.

**Date qui n'existe pas : jamais corrigée à la place de la personne** (test novice : « j'ai tapé 31 et on m'affiche 28, sans un mot »). Tapée ou collée, elle reste affichée telle quelle, la valeur vaut `null`, le champ est invalide et le message du §2 apparaît dès que les trois zones sont remplies. Seules les **flèches haut / bas** ramènent le jour au dernier du mois (29/02/2024 + flèche haut sur l'année donne 28/02/2025) : la personne regarde la zone qu'elle change ; comme le jour change ailleurs que sous ses yeux, ce changement est annoncé (« Jour ramené au 28 février. »). **Date incomplète à la sortie** : valeur `null`, état invalide, message « Date incomplète. Exemple : 12/11/2026 ». Champ entièrement vide : aucune erreur propre (l'obligation reste celle du formulaire). Dans une période, un champ « Du » ou « Au » vide n'est **jamais** une erreur.

**Trois lisibilités ajoutées après le test novice** : le point « aujourd'hui » a une légende (bouton « Aujourd'hui » + info-bulle), le titre se voit cliquable au repos, un raccourci dit ses dates (§1.2, §1.4, §3).

## 1. Anatomie et tokens

Rayons : `radius-sm` (cadres), `radius-full` (jour, mois, année choisis).

**1.1 Champ de date en mode calendrier** (`input[lcInput]` texte + bouton) : reprend le champ du kit (hauteur `control-height-*`, bordure, rayon, état invalide : tokens `--lc-input-*` existants, rien de nouveau). Bouton icône à droite : icône `calendar` (déjà au registre), `icon-size-md`, cible = hauteur du champ. `inputmode="numeric"`, `autocomplete="off"`, `aria-describedby` vers la phrase d'aide (lecteur d'écran seulement). Zone active : `::selection` en `--lc-calendar-zone-bg` / `--lc-calendar-zone-text`. Le bouton porte `aria-haspopup="dialog"` et `aria-expanded`.

**1.2 Panneau (dialogue)**, de haut en bas : en-tête, corps, pied.
- Conteneur : fond `--lc-calendar-background`, bordure `--lc-calendar-border` (`border-width-thin`), rayon `--lc-calendar-radius`, ombre `--lc-calendar-shadow`, `z-overlay`, texte `--lc-calendar-text`, `font-size-md`.
- En-tête : bouton précédent · **titre-bouton** · bouton suivant. Boutons icône `chevron-left` / `chevron-right`, cible `--lc-calendar-cell-size`. **Titre = bouton visible au repos** : contour `--lc-calendar-title-border` (`border-width-thin`), `radius-sm`, hauteur `--lc-calendar-cell-size`, marge `space-3` de chaque côté, texte `font-weight-semibold` en `--lc-calendar-text`, suivi d'une icône `chevron-down` (`icon-size-sm`, même couleur, écart `space-2`) ; survol : fond `--lc-calendar-day-hover-bg`. Au niveau années le titre (« 2020 à 2029 ») est du texte simple, sans contour ni chevron (sommet, rien à ouvrir).
- Corps, **hauteur fixe** = 7 lignes de cellules (en-tête des jours + 6 semaines) pour ne pas sauter d'un niveau à l'autre ; mois et années s'étirent sur 4 colonnes × 3 lignes.
  - Jours : en-têtes `columnheader` (lettre, `abbr` = nom complet) en `--lc-calendar-weekday-text`, `font-size-sm`. Cellule = carré de `--lc-calendar-cell-size`, chiffre centré, chiffres tabulaires.
  - Mois : libellé court (« janv. »), 12 cellules. Années : 12 cellules (les dix années de la plage affichée, plus l'année avant et l'année après en `--lc-calendar-weekday-text`, choisissables).
- Pied : « Aujourd'hui » et « Effacer », boutons texte du kit (variante `text`), séparés du corps par un filet `--lc-calendar-border`. « Effacer » absent si le champ est obligatoire. **Le bouton « Aujourd'hui » commence par le même point** que la cellule d'aujourd'hui (`--lc-calendar-today-mark`, `--lc-calendar-today-mark-size`, écart `space-2` avant le texte) : il sert de légende, sans mot de plus. La cellule d'aujourd'hui a en plus `title="Aujourd'hui"` (attribut natif : `forms` n'importe pas `overlay`).

**1.3 Champ de période** : groupe `role="group"` étiqueté (« Période » ou `ariaLabel`), deux champs à zones (1.1) précédés des libellés visibles « Du » / « Au » (`font-size-sm`, `--lc-calendar-weekday-text`), un seul bouton calendrier à droite. À moins de 28 rem de large (requête de conteneur, Baseline 2024) : les deux champs s'empilent.

**1.4 Panneau de période** : même coque que 1.2, corps = deux mois côte à côte (`--lc-calendar-month-gap`), une ligne d'état visible au-dessus (`role="status"`, `font-size-sm`, `--lc-calendar-weekday-text`) : « Choisissez la date de début. » puis, après le premier clic, « Choisissez la date de fin, ou cliquez sur « Sans date de fin ». ». Pied : à gauche « Aujourd'hui » (avec son point ; montre le mois en cours à gauche, sans rien choisir), à droite « Sans date de fin » (**apparaît après le premier clic**, même variante `text`, aucune place réservée avant) puis « Effacer ». Sous 400 px de large les boutons du pied passent à la ligne (écart `space-2`). Raccourcis : colonne à gauche ≥ 840 px de large de fenêtre, sinon rangée de boutons (retour à la ligne) au-dessus des mois. Bouton de raccourci : `font-size-sm`, hauteur `control-height-sm`, `radius-sm`. Un clic remplit les deux champs et ferme le panneau. Chaque raccourci porte ses dates en description : `title` (survol) et `aria-describedby` vers un texte masqué (lecteur d'écran), formes du §2.

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
| `today-mark-size` | `space-1` | taille du point (cellule et bouton « Aujourd'hui ») |
| `title-border` | `color-border-strong` | contour du titre-bouton, visible au repos |
| `focus-ring` | `color-focus-ring` | anneau clavier |
| `zone-bg` / `zone-text` | `color-primary-container` / `color-on-primary-container` | zone active du champ |
| `duration` / `easing` | `duration-fast` / `easing-standard` | mouvement |

Contrôle `npx lc-tokens check` : ajouter à `packages/tokens/src/checks/contrast-pairs.json`, si absentes : `on-primary`/`primary` 4,5 · `on-primary-container`/`primary-container` 4,5 · `on-surface-muted`/`surface-raised` 4,5 · `border-strong`/`surface-raised` 3 (contour du titre) · `primary`/`surface-raised` 3 et `primary`/`primary-container` 3 (point) · `focus-ring`/`surface-raised` 3 et `focus-ring`/`primary-container` 3.

## 2. Textes (mot pour mot ; clés `LC_LABELS` à ajouter)

| Usage | Français | Anglais |
|---|---|---|
| Zones vides, dans l'ordre de `LC_LOCALE` | jj / mm / aaaa | dd / mm / yyyy |
| Noms des zones (annonce) | Jour · Mois · Année | Day · Month · Year |
| Annonce d'une zone | « Jour, 12 » · « Mois, novembre » · « Année, 2026 » · « Jour, vide » | « Day, 12 » · « Month, November » · « Year, 2026 » · « Day, empty » |
| Aide du champ (lecteur d'écran) | Tapez la date, ou changez chaque zone avec les flèches haut et bas. | Type the date, or change each part with the up and down arrow keys. |
| Bouton, sans valeur | Choisir une date | Choose a date |
| Bouton, avec valeur | Changer la date, 12 novembre 2026 | Change date, November 12, 2026 |
| Bouton de période | Choisir une période · Changer la période, du 3 au 12 novembre 2026 | Choose a period · Change period, from November 3 to 12, 2026 |
| Titre du dialogue (`aria-label`) | Choisir une date · Choisir une période | Choose a date · Choose a period |
| Titre-bouton, jours | « novembre 2026 » (nom : « novembre 2026 : choisir un mois ») | "November 2026" (name: "November 2026: choose a month") |
| Titre-bouton, mois | « 2026 » (nom : « 2026 : choisir une année ») | "2026" (name: "2026: choose a year") |
| Titre, années (texte seul) | 2020 à 2029 | 2020 to 2029 |
| Boutons de navigation | Mois précédent · Mois suivant · Année précédente · Année suivante · **Années précédentes · Années suivantes** (niveau années) | Previous month · Next month · Previous year · Next year · **Previous years · Next years** |
| Cellule jour (nom) | jeudi 12 novembre 2026 | Thursday, November 12, 2026 |
| Cellule mois (nom) | novembre 2026 | November 2026 |
| Cellule d'aujourd'hui (`title`) | Aujourd'hui | Today |
| Pied | Aujourd'hui · Effacer · **Sans date de fin** | Today · Clear · **No end date** |
| Date incomplète (à la sortie du champ) | Date incomplète. Exemple : 12/11/2026 | Incomplete date. Example: 11/12/2026 |
| **Date qui n'existe pas** (trois zones remplies) | **Cette date n'existe pas : février 2026 n'a que 28 jours.** | **This date does not exist: February 2026 has only 28 days.** |
| Même message, mois ou jour hors plage (mois 13, jour 00, année 0000) | Cette date n'existe pas. Exemple : 12/11/2026 | This date does not exist. Example: 11/12/2026 |
| Collage illisible (champ inchangé, message jusqu'à la frappe suivante) | Date non reconnue. Exemple : 12/11/2026 | Date not recognized. Example: 11/12/2026 |
| Jour ramené (annonce polie, **flèches haut / bas seulement**) | Jour ramené au 28 février. | Day set to February 28. |
| Libellés de période | Du · Au · Période | From · To · Period |
| Ligne d'état, début | Choisissez la date de début. | Choose the start date. |
| Ligne d'état, après le premier clic | Choisissez la date de fin, ou cliquez sur « Sans date de fin ». | Choose the end date, or click "No end date". |
| Début choisi (annonce) | Début : 3 novembre 2026. Choisissez la date de fin, ou cliquez sur « Sans date de fin ». | Start: November 3, 2026. Choose the end date, or click "No end date". |
| Période choisie (annonce) | Période choisie : du 3 novembre 2026 au 12 novembre 2026. | Period selected: from November 3, 2026 to November 12, 2026. |
| Début seul choisi (annonce) | Période choisie : à partir du 3 novembre 2026. | Period selected: from November 3, 2026, no end date. |
| Rangée native | Raccourcis | Shortcuts |

**Date qui n'existe pas** : « février 2026 » est le mois et l'année saisis, composés par `Intl` avec `LC_LOCALE` (minuscule en français, majuscule en anglais). Le nombre est celui du mois (28, 29, 30) ; « 1 jour » ne peut pas arriver (un mois a au moins 28 jours) donc **pas de singulier à gérer**, « n'a que » vaut pour 28, 29 et 30. Pour jour 31 dans un mois de 30 jours : « avril 2026 n'a que 30 jours. » Le message court sert quand le mois ou le jour est hors plage et qu'aucun nombre de jours ne se dit. L'exemple est le 12 novembre 2026 mis en forme par la locale (11/12/2026 en anglais américain).

**Description d'un raccourci** (`title` et lecteur d'écran), la tournure dépend des dates ; les noms de mois et l'ordre jour / mois viennent d'`Intl` :

| Cas | Français | Anglais (américain) |
|---|---|---|
| Même mois | du 13 au 19 novembre 2026 · du 1er au 30 novembre 2026 | from November 13 to 19, 2026 · from November 1 to 30, 2026 |
| Mois différents, même année | du 25 octobre au 24 novembre 2026 | from October 25 to November 24, 2026 |
| Années différentes | du 15 décembre 2025 au 14 janvier 2026 | from December 15, 2025 to January 14, 2026 |
| Un seul jour (raccourci rogné par les bornes) | le 12 novembre 2026 | November 12, 2026 |
| Raccourci désactivé | Aucune date autorisée sur cette période. | No allowed date in this period. |

Le premier jour du mois s'écrit « 1er » en français : à composer à la main si `Intl` ne le donne pas (à vérifier en T1). En anglais britannique l'ordre devient « from 13 to 19 November 2026 » : c'est `Intl` qui le décide, pas les libellés.

L'annonce du changement de mois, d'année ou de niveau est la relecture du titre (`aria-live="polite"`) ; rien à l'ouverture.

**Raccourcis (confirmés)** : « 7 derniers jours » = 6 jours avant aujourd'hui jusqu'à aujourd'hui (aujourd'hui compris) · « 30 derniers jours » = 29 jours avant jusqu'à aujourd'hui · « Ce mois-ci » = du 1er au dernier jour du mois, rogné par `max` · « Le mois dernier » = le mois précédent entier. Anglais : Last 7 days · Last 30 days · This month · Last month.

## 3. États

Trois repères, trois **formes** : **disque** plein (choisi), **point** sous le chiffre (aujourd'hui), **anneau carré** (focus). L'anneau est un contour de la cellule carrée, **à l'intérieur** (`outline-offset` négatif de `focus-ring-width`) ; le disque est inscrit avec une marge de `space-1` : ils ne se confondent pas et le point n'est jamais touché. Mois et années : le disque devient une pilule (`radius-full`), point et anneau identiques.

| État | Rendu |
|---|---|
| Repos | texte `--lc-calendar-text`, pas de fond |
| Survol | disque en `--lc-calendar-day-hover-bg` ; boutons et titre : même fond |
| Focus clavier | anneau carré `--lc-calendar-focus-ring`, largeur `focus-ring-width` ; un seul focus visible à la fois |
| Choisi | disque `selected-bg`, chiffre `selected-text`, `font-weight-semibold`, `aria-selected` |
| Aujourd'hui | point `today-mark` sous le chiffre ; `aria-current="date"` ; `title="Aujourd'hui"` ; **même point en tête du bouton « Aujourd'hui »** du pied (légende) |
| Aujourd'hui et choisi | disque + point en `selected-text` ; focus en plus : anneau |
| Titre-bouton | repos : contour `title-border` + chevron ; survol : fond `day-hover-bg` ; focus : anneau ; année : texte simple |
| Hors bornes | `day-disabled-text`, `aria-disabled="true"`, curseur interdit, pas de survol ; atteignable au clavier, sans effet ; bouton de navigation hors bornes : désactivé (`state-disabled-opacity`) |
| Période : extrémités | disque plein, avec une demi-bande `range-bg` du côté de l'intérieur |
| Période : intérieur | bande pleine largeur `range-bg`, chiffre `range-text`, coins arrondis (`radius-full`) seulement en début et fin de semaine |
| Période : aperçu | même bande, **bords haut et bas en tirets** `range-preview-edge` ; extrémité d'aperçu en disque creux (contour `border-width-thick`) |
| Raccourci | repos : bouton texte ; survol : `title` avec les dates ; désactivé : `state-disabled-opacity`, description « Aucune date autorisée sur cette période. » |
| « Sans date de fin » | absent avant le premier clic ; ensuite bouton du pied ; un clic valide le début seul (`to = null`) et ferme ; le champ « Au » reste vide, sans erreur |
| Désactivé / lecture seule (champ) | pas de bouton, pas de panneau ; désactivé : `state-disabled-opacity` ; lecture seule : texte normal, sélectionnable, zones non modifiables |
| Invalide | cadre d'erreur du kit, `aria-invalid`, message sous le champ relié par `aria-describedby` (date incomplète, date qui n'existe pas, fin avant début) ; **un champ vide n'est jamais invalide de lui-même** |

## 4. Dimensions et disposition

- Cellule 40 px (`space-10`) : un mois = 7 × 40 + 2 × `padding` = 304 px, **fixe**. Les niveaux mois et années gardent la même largeur et la même hauteur.
- Deux mois : 2 × 280 + `month-gap` + 2 × `padding` = 608 px, tient dans 640 px (marge `space-2` de chaque côté). Seuils dans le code (`BreakpointObserver` du CDK, une requête de média n'accepte pas de token) : 640 px pour les deux mois, **840 px** pour la colonne de raccourcis (608 + 160 + marges).
- Cellules de 40 px et non 44 : 44 donnerait 664 px, qui ne tient plus à 640 px ; pointeur fin seulement. Boutons du pied et raccourcis : au moins `control-height-sm` (36 px) de haut.
- Fenêtre d'ordinateur de 360 px : un mois (304 px) + marge : pas de défilement horizontal ; raccourcis en rangée au-dessus, retour à la ligne ; trois boutons du pied tiennent sur une ligne ou passent à la ligne. Le CDK repositionne le panneau ; le corps défile si la fenêtre est trop basse.

## 5. Clavier et lecteur d'écran (comparé au motif ARIA *date picker dialog*)

Conforme dans la spec : `role="dialog"` nommé et `aria-modal="true"`, focus piégé et rendu au bouton, `aria-haspopup="dialog"` et `aria-expanded` sur le bouton, flèches / Début / Fin / Page, Maj + Page, Entrée ou Espace, Échap sans changement, titre `aria-live="polite"`, `aria-current="date"`, `aria-selected` sur la `gridcell` (pas sur le bouton), `columnheader`, `aria-labelledby` de la grille vers le titre, une seule étape de tabulation pour la grille, jours hors bornes atteignables, premier focus sur le jour autorisé le plus proche. Précisions du brief :
1. **Ordre de tabulation**, période : précédent, titre, suivant, grille, « Aujourd'hui », « Sans date de fin » (s'il est là), « Effacer » ; Maj + Tab à l'envers. Raccourcis (colonne ou rangée) : avant l'en-tête.
2. **Niveaux** : Entrée ou Espace sur le titre = niveau supérieur ; sur un mois ou une année = niveau inférieur, focus sur la cellule choisie. Flèches ±1 et ±4 (quatre colonnes). Page : un pas du niveau (mois, année, dix ans) ; Maj + Page : une année, au niveau des jours seulement. Échap ferme toujours tout le panneau.
3. **Période au clavier** : Entrée sur un jour = début, flèches = aperçu, Entrée = fin et fermeture. Quand « Sans date de fin » apparaît, la ligne d'état (`role="status"`) le dit à voix haute ; Entrée sur le bouton valide le début seul. Échap pendant le choix de la fin : ferme et abandonne le début, valeur inchangée. « Aujourd'hui » (période) : le mois en cours passe à gauche, le focus reste sur le bouton.
4. **Raccourcis** : boutons ordinaires ; `aria-describedby` vers le texte masqué des dates (le `title` seul serait ignoré par la plupart des lecteurs au clavier). Entrée ou Espace = remplir les deux champs, fermer, rendre le focus au bouton calendrier.
5. **Champ à zones** : flèches gauche / droite ou `/`, `.`, `-` : zone voisine ; haut / bas : ±1 dans la zone, en boucle, sans toucher aux autres zones sauf le jour ramené (§0, annoncé) ; chiffres : le jour (premier chiffre 4 à 9) et le mois (premier chiffre 2 à 9) passent seuls à la zone suivante, deux chiffres aussi, l'année s'arrête à quatre ; Retour arrière / Suppr : vide la zone (valeur `null` aussitôt) ; Tab quitte le champ ; Alt + flèche bas ouvre le panneau ; Ctrl + V : date entière dans les formes de la spec. Le message d'une date inexistante est relié par `aria-describedby` et se lit quand la dernière zone est remplie (`role="status"` sous le champ si le champ est seul).
6. Le nom d'un jour est sa date complète ; mois et années : mois et année complets. Le point d'aujourd'hui a sa légende pour tous : bouton « Aujourd'hui » (vue), `aria-current` (lecteur d'écran), `title` (survol).

## 6. Mouvement

Apparition du panneau : fondu `opacity` en `--lc-calendar-duration` / `--lc-calendar-easing`, pas de glissement. Survol : changement de fond sur la même durée. Apparition de « Sans date de fin » : sans mouvement. Changement de mois ou de niveau : aucun mouvement. `@media (prefers-reduced-motion: reduce)` : apparition et survol instantanés. Aucune minuterie.

## 7. Écarts restants entre le brief et la spec

1. **Ligne d'état de la période** : la spec (§5.4) écrit « Choisissez la date de début. » puis « Choisissez la date de fin. » ; le brief écrit pour la seconde « Choisissez la date de fin, ou cliquez sur « Sans date de fin ». » (le bouton n'a pas d'autre moyen de se faire découvrir). À reporter dans la spec.
2. **Message « Cette date n'existe pas »** : la spec donne le cas « février 2026 n'a que 28 jours » ; le brief ajoute la forme courte « Cette date n'existe pas. Exemple : 12/11/2026 » pour un mois 13, un jour 00 ou une année 0000 (aucun nombre de jours à dire). À ajouter en §5.3 et au critère.
3. **Annonce « Jour ramené au 28 février. »** : la spec dit « la nouvelle valeur de la zone est annoncée » ; le brief garde en plus cette annonce pour les flèches seulement (le jour change hors de la zone regardée). À confirmer.
4. **Description des raccourcis** : la spec donne un seul exemple ; les cinq tournures (même mois, mois différents, années différentes, un jour, désactivé) et le « 1er » français sont au §2 du brief, avec la vérification `Intl` en T1.
5. **Bouton « Aujourd'hui » de la période** : la spec dit « montre le mois en cours » ; le brief précise que le focus reste sur le bouton et que le bouton n'est jamais désactivé (rien n'est choisi).
6. **Titre-bouton** : le brief fixe le rendu (contour `border-strong`, chevron) et le token `title-border`, absents de la spec ; les paires de contraste incluent `border-strong`/`surface-raised`.
