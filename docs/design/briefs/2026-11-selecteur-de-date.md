# Brief : sélecteur de date (date simple B, période C)

> **État à la livraison (2026-11-20).** Ce brief a servi à concevoir ; le livré s'en écarte sur les points suivants, décidés ensuite (détail : spec, sections 0 et 13).
> - Plus aucun message propre aux champs de date : ni « Date incomplète… », ni « Date non reconnue… », ni message sous le cadre. Une date incomplète ne montre qu'un cadre invalide ; un collage illisible est ignoré. Seul reste, pour la période, « La date de fin est avant la date de début. ».
> - Un jour qui n'existe pas ne se saisit pas : chiffre ignoré, ou jour ramené au dernier jour du mois (annonce au lecteur d'écran seulement).
> - L'annonce « Période choisie : … » à la fermeture est retirée ; le bouton calendrier, qui reprend le focus, dit la période.
> - Le panneau rouvert sur une sélection existante le dit : « Période : du 12 au 20 novembre 2026 inclus. Cliquez un jour pour la changer. ».
> - Les dates se disent comme `Intl` les rend : « 1 novembre », pas « 1er novembre ».
> - Zone active du champ en `primary` / `on-primary` ; jours hors bornes barrés ; raccourcis natifs en une colonne à 390 px.

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

**D2. Période : oui aux niveaux mois / années et oui à la saisie par zones**, avec une règle qui évite la confusion : dans le panneau à deux mois, cliquer **n'importe quel titre** remplace les deux mois par **une seule grille** (12 mois, ou 12 années qui se suivent) pleine largeur. Choisir un mois ou une année ne choisit aucune date : on revient aux deux mois, le mois choisi à gauche. Les niveaux ne servent qu'à naviguer, la date se choisit toujours au niveau des jours (aussi pour la date simple). Les champs « Du » et « Au » sont deux champs à zones identiques à `lc-date-input`.

**Un jour qui n'existe pas ne peut pas être saisi, et aucun message ne s'affiche** (décision de l'utilisateur ; elle prime sur le test novice qui demandait un message). Règle unique : le jour ne dépasse jamais le dernier jour du mois affiché.
- Mois déjà rempli : le chiffre qui donnerait un jour trop grand est ignoré (février 2026, après « 2 », le « 9 » ne s'inscrit pas).
- Jour rempli avant le mois ou l'année : il est ramené au dernier jour du mois (31 puis 02 donne 28/02 ; 29/02 puis 2025 donne 28/02/2025). Idem aux flèches haut / bas et au collage.
- Jour 00, mois 00 ou supérieur à 12, année 0000 : le chiffre fautif est ignoré.
- Le champ montre toujours la date retenue. Seul le lecteur d'écran, qui ne voit pas le chiffre changer, entend « Jour ramené au 28 février. » ; quand un chiffre est ignoré, la zone relit simplement sa valeur (« Jour, 2 »).
- **Il ne reste que deux états invalides de saisie** : date incomplète à la sortie (valeur `null`, message « Date incomplète. Exemple : 12/11/2026 ») et collage illisible (champ inchangé, « Date non reconnue. Exemple : 12/11/2026 », jusqu'à la frappe suivante). Champ entièrement vide : aucune erreur propre ; dans une période, un « Du » ou un « Au » vide n'est jamais une erreur.

**Lisibilité ajoutée après les deux tests novice** : légende du point « aujourd'hui » (bouton + info-bulle) ; titre visible comme bouton au repos ; dates visibles sous chaque raccourci ; « Changer le début » après un premier clic erroné ; « Sans date de fin » ; une ligne dit en clair qu'une borne est vide ; années affichées = titre ; « Effacer la date » / « Effacer la période » (§1.2, §1.4, §3).

## 1. Anatomie et tokens

Rayons : `radius-sm` (cadres), `radius-full` (jour, mois, année choisis).

**1.1 Champ de date en mode calendrier** (`input[lcInput]` texte + bouton) : reprend le champ du kit (hauteur `control-height-*`, bordure, rayon, état invalide : tokens `--lc-input-*` existants, rien de nouveau). Bouton icône à droite : icône `calendar` (déjà au registre), `icon-size-md`, cible = hauteur du champ. `inputmode="numeric"`, `autocomplete="off"`, `aria-describedby` vers la phrase d'aide (lecteur d'écran seulement). Zone active : `::selection` en `--lc-calendar-zone-bg` / `--lc-calendar-zone-text`. Le bouton porte `aria-haspopup="dialog"` et `aria-expanded`.

**1.2 Panneau (dialogue)**, de haut en bas : en-tête, corps, pied.
- Conteneur : fond `--lc-calendar-background`, bordure `--lc-calendar-border` (`border-width-thin`), rayon `--lc-calendar-radius`, ombre `--lc-calendar-shadow`, `z-overlay`, texte `--lc-calendar-text`, `font-size-md`.
- En-tête : bouton précédent · **titre-bouton** · bouton suivant. Boutons icône `chevron-left` / `chevron-right`, cible `--lc-calendar-cell-size`. **Titre = bouton visible au repos** : contour `--lc-calendar-title-border` (`border-width-thin`), `radius-sm`, hauteur `--lc-calendar-cell-size`, marge `space-3` de chaque côté, texte `font-weight-semibold` en `--lc-calendar-text`, suivi d'une icône `chevron-down` (`icon-size-sm`, même couleur, écart `space-2`) ; survol : fond `--lc-calendar-day-hover-bg`. Au niveau années le titre (« 2019 à 2030 ») est du texte simple, sans contour ni chevron (sommet, rien à ouvrir).
- Corps, **hauteur fixe** = 7 lignes de cellules (en-tête des jours + 6 semaines) pour ne pas sauter d'un niveau à l'autre ; mois et années s'étirent sur 4 colonnes × 3 lignes.
  - Jours : en-têtes `columnheader` (lettre, `abbr` = nom complet) en `--lc-calendar-weekday-text`, `font-size-sm`. Cellule = carré de `--lc-calendar-cell-size`, chiffre centré, chiffres tabulaires.
  - Mois : libellé court (« janv. »), 12 cellules. Années : 12 années qui se suivent, titre = première et dernière affichées (« 2019 à 2030 »), aucune année atténuée ni notion de décennie. À l'ouverture, la plage commence 7 ans avant l'année affichée (2026 donne 2019 à 2030) ; les flèches avancent de 12 ans ; une flèche du clavier qui sort de la plage la décale de 12 ans en gardant le focus.
- Pied : « Aujourd'hui » et « Effacer la date », boutons texte du kit (variante `text`), séparés du corps par un filet `--lc-calendar-border`. « Effacer » absent si le champ est obligatoire. **Le bouton « Aujourd'hui » commence par le même point** que la cellule d'aujourd'hui (`--lc-calendar-today-mark`, `--lc-calendar-today-mark-size`, écart `space-2` avant le texte) : il sert de légende, sans mot de plus. La cellule d'aujourd'hui a en plus `title="Aujourd'hui"` (attribut natif : `forms` n'importe pas `overlay`).

**1.3 Champ de période** : groupe `role="group"` étiqueté (« Période » ou `ariaLabel`), deux champs à zones (1.1) précédés des libellés visibles « Du » / « Au » (`font-size-sm`, `--lc-calendar-weekday-text`), un seul bouton calendrier à droite. À moins de 28 rem de large (requête de conteneur, Baseline 2024) : les deux champs s'empilent.

**1.4 Panneau de période** : même coque que 1.2, corps = deux mois côte à côte (`--lc-calendar-month-gap`).
- **Ligne d'état** au-dessus des mois (`role="status"`, `font-size-sm`, `--lc-calendar-weekday-text`), hauteur réservée de deux lignes (pas de saut) : « Choisissez la date de début. » puis, après le premier clic, « Début : 3 novembre 2026. Choisissez la date de fin, ou cliquez sur « Sans date de fin ». ». À sa droite, **« Changer le début »** (bouton `text`, `font-size-sm`), présent seulement une fois le début choisi ; il passe sous le texte si la place manque. Un clic efface le début, remet « Choisissez la date de début. » sans fermer, et **rend le focus à la cellule de l'ancien début** (le bouton disparaît : le focus ne doit pas se perdre).
- **Pied** : à gauche « Aujourd'hui » (avec son point ; montre le mois en cours à gauche, sans rien choisir), à droite « Sans date de fin » (**apparaît après le premier clic**, bouton `text`, aucune place réservée avant), puis « Effacer la période ». Sous 400 px de large les boutons passent à la ligne (écart `space-2`).
- **Raccourcis** : colonne à gauche de `--lc-calendar-presets-width` à partir de 840 px de large de fenêtre ; en dessous, grille de 2 × 2 au-dessus des mois (`space-2` d'écart). Chaque raccourci est un **bouton à deux lignes** : libellé (`font-size-sm`, `font-weight-medium`, `--lc-calendar-text`) et ses dates en dessous (`font-size-xs`, `--lc-calendar-weekday-text`, formes du §2), sans `title`. Hauteur au moins `control-height-md`, texte aligné au début, retour à la ligne permis (jamais de coupe : la date la plus longue, « du 15 décembre 2025 au 14 janvier 2026 », tient sur deux lignes). Nom accessible = le libellé ; dates = description (`aria-describedby` vers la ligne des dates, qui est `aria-hidden` pour ne pas être lue deux fois). Raccourci désactivé : la seconde ligne devient « Aucune date autorisée sur cette période. ». Un clic remplit les deux champs et ferme le panneau.
- **Une seule borne remplie** (hors panneau, sous les deux champs, aussi en mode natif) : ligne d'une phrase, `font-size-sm`, `--lc-calendar-weekday-text`, reliée au groupe par `aria-describedby` (pas de `role="status"` : le nom du bouton calendrier dit déjà la période en rendant le focus). Absente si les deux bornes sont vides ou remplies ; aucune place réservée.

**1.5 Mode natif tactile** : un ou deux `input[type=date]` du kit, sans bouton ni panneau. Période : sous les champs, rangée « Raccourcis » (`role="group"`) des mêmes boutons qu'en 1.4.

**Tokens de composant à créer** (nom → repli `--lc-sys-*` : rôle)

| Token `--lc-calendar-…` | Repli | Rôle |
|---|---|---|
| `cell-size` | `space-10` (40 px) | côté d'une cellule, cible minimale |
| `padding` | `space-3` | marge intérieure du panneau |
| `month-gap` | `space-6` | espace entre deux mois |
| `presets-width` | `calc(var(--lc-sys-space-16) * 3)` (192 px) | colonne des raccourcis à deux lignes |
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
| Bouton de période, une seule borne | Changer la période, à partir du 1er novembre 2026 · Changer la période, jusqu'au 30 novembre 2026 | Change period, starting November 1, 2026 · Change period, until November 30, 2026 |
| Titre du dialogue (`aria-label`) | Choisir une date · Choisir une période | Choose a date · Choose a period |
| Titre-bouton, jours | « novembre 2026 » (nom : « novembre 2026 : choisir un mois ») | "November 2026" (name: "November 2026: choose a month") |
| Titre-bouton, mois | « 2026 » (nom : « 2026 : choisir une année ») | "2026" (name: "2026: choose a year") |
| Titre, années (texte seul) | 2019 à 2030 | 2019 to 2030 |
| Boutons de navigation | Mois précédent · Mois suivant · Année précédente · Année suivante · Années précédentes · Années suivantes (niveau années, 12 ans) | Previous month · Next month · Previous year · Next year · Previous years · Next years |
| Cellule jour (nom) | jeudi 12 novembre 2026 | Thursday, November 12, 2026 |
| Cellule mois (nom) | novembre 2026 | November 2026 |
| Cellule d'aujourd'hui (`title`) | Aujourd'hui | Today |
| Pied, date simple | Aujourd'hui · **Effacer la date** | Today · **Clear date** |
| Pied, période | Aujourd'hui · Sans date de fin · **Effacer la période** | Today · No end date · **Clear period** |
| Date incomplète (à la sortie du champ) | Date incomplète. Exemple : 12/11/2026 | Incomplete date. Example: 11/12/2026 |
| Collage illisible (champ inchangé, message jusqu'à la frappe suivante) | Date non reconnue. Exemple : 12/11/2026 | Date not recognized. Example: 11/12/2026 |
| Jour ramené (annonce au lecteur d'écran seulement ; frappe, flèches, collage) | Jour ramené au 28 février. | Day set to February 28. |
| Libellés de période | Du · Au · Période | From · To · Period |
| Ligne d'état, début | Choisissez la date de début. | Choose the start date. |
| Ligne d'état, après le premier clic | Début : 3 novembre 2026. Choisissez la date de fin, ou cliquez sur « Sans date de fin ». | Start: November 3, 2026. Choose the end date, or click "No end date". |
| **Changer le début** (bouton à côté de la ligne d'état) | Changer le début | Change start date |
| **Une seule borne**, ligne sous les champs | Sans date de fin : tout depuis le 1er novembre 2026. · Sans date de début : tout jusqu'au 30 novembre 2026. | No end date: everything from November 1, 2026. · No start date: everything up to November 30, 2026. |
| Période choisie (annonce) | Période choisie : du 3 novembre 2026 au 12 novembre 2026. | Period selected: from November 3, 2026 to November 12, 2026. |
| Début seul choisi (annonce) | Période choisie : à partir du 3 novembre 2026. | Period selected: starting November 3, 2026, no end date. |
| Rangée native | Raccourcis | Shortcuts |

L'exemple est le 12 novembre 2026 mis en forme par la locale (11/12/2026 en anglais américain). Le « 1er » du français est à composer à la main si `Intl` ne le donne pas (à vérifier en T1). Plus aucun message pour un jour impossible : rien à traduire.

**Dates sous un raccourci** (ligne du bouton, petite ; noms de mois et ordre jour / mois par `Intl`) :

| Cas | Français | Anglais (américain) |
|---|---|---|
| Même mois | du 13 au 19 novembre 2026 · du 1er au 30 novembre 2026 | from November 13 to 19, 2026 · from November 1 to 30, 2026 |
| Mois différents, même année | du 25 octobre au 24 novembre 2026 | from October 25 to November 24, 2026 |
| Années différentes | du 15 décembre 2025 au 14 janvier 2026 | from December 15, 2025 to January 14, 2026 |
| Un seul jour (raccourci rogné par les bornes) | le 12 novembre 2026 | November 12, 2026 |
| Raccourci désactivé | Aucune date autorisée sur cette période. | No allowed date in this period. |

En anglais britannique : « from 13 to 19 November 2026 » (c'est `Intl` qui décide). L'annonce du changement de mois, d'année ou de niveau est la relecture du titre (`aria-live="polite"`) ; rien à l'ouverture.

**Raccourcis (confirmés)** : « 7 derniers jours » = 6 jours avant aujourd'hui jusqu'à aujourd'hui · « 30 derniers jours » = 29 jours avant jusqu'à aujourd'hui · « Ce mois-ci » = du 1er au dernier jour du mois, rogné par `max` · « Le mois dernier » = le mois précédent entier. Anglais : Last 7 days · Last 30 days · This month · Last month.

## 3. États

Trois repères, trois **formes** : **disque** plein (choisi), **point** sous le chiffre (aujourd'hui), **anneau carré** (focus). L'anneau est un contour de la cellule carrée, **à l'intérieur** (`outline-offset` négatif de `focus-ring-width`) ; le disque est inscrit avec une marge de `space-1` : ils ne se confondent pas et le point n'est jamais touché. Mois et années : le disque devient une pilule (`radius-full`), point et anneau identiques.

| État | Rendu |
|---|---|
| Repos | texte `--lc-calendar-text`, pas de fond |
| Survol | disque en `--lc-calendar-day-hover-bg` ; boutons, titre et raccourcis : même fond |
| Focus clavier | anneau carré `--lc-calendar-focus-ring`, largeur `focus-ring-width` ; un seul focus visible à la fois |
| Choisi | disque `selected-bg`, chiffre `selected-text`, `font-weight-semibold`, `aria-selected` |
| Aujourd'hui | point `today-mark` sous le chiffre ; `aria-current="date"` ; `title="Aujourd'hui"` ; même point en tête du bouton « Aujourd'hui » (légende) |
| Aujourd'hui et choisi | disque + point en `selected-text` ; focus en plus : anneau |
| Titre-bouton | repos : contour `title-border` + chevron ; survol : fond `day-hover-bg` ; focus : anneau ; niveau années : texte simple |
| Hors bornes | `day-disabled-text`, `aria-disabled="true"`, curseur interdit, pas de survol ; atteignable au clavier, sans effet ; bouton de navigation hors bornes : désactivé (`state-disabled-opacity`) ; année hors bornes du niveau années : idem |
| Période : extrémités | disque plein, avec une demi-bande `range-bg` du côté de l'intérieur |
| Période : intérieur | bande pleine largeur `range-bg`, chiffre `range-text`, coins arrondis seulement en début et fin de semaine |
| Période : aperçu | même bande, **bords haut et bas en tirets** `range-preview-edge` ; extrémité d'aperçu en disque creux (contour `border-width-thick`) |
| Raccourci | deux lignes : libellé + dates visibles ; survol : fond ; désactivé : `state-disabled-opacity`, seconde ligne « Aucune date autorisée sur cette période. » |
| « Changer le début » | absent avant le premier clic ; ensuite à droite de la ligne d'état ; efface le début, ne ferme pas |
| « Sans date de fin » | absent avant le premier clic ; ensuite dans le pied ; valide le début seul (`to = null`) et ferme |
| Une seule borne (champ) | ligne explicative sous les champs ; ni erreur ni cadre d'erreur |
| Désactivé / lecture seule (champ) | pas de bouton, pas de panneau ; désactivé : `state-disabled-opacity` ; lecture seule : texte normal, sélectionnable, zones non modifiables |
| Invalide | cadre d'erreur du kit, `aria-invalid`, message sous le champ relié par `aria-describedby` : **date incomplète, collage illisible, fin avant début** seulement ; un champ vide n'est jamais invalide de lui-même ; un jour impossible n'existe pas (§0) |

## 4. Dimensions et disposition

- Cellule 40 px (`space-10`) : un mois = 7 × 40 + 2 × `padding` = 304 px, **fixe**. Mois et années : même largeur et même hauteur (4 colonnes × 3 lignes).
- Deux mois : 2 × 280 + `month-gap` + 2 × `padding` = 608 px, tient dans 640 px (marge `space-2` de chaque côté). Avec la colonne de raccourcis de 192 px : 12 + 192 + 16 + 584 + 12 = 816 px, plus marges : **840 px** reste le seuil (`BreakpointObserver` du CDK : une requête de média n'accepte pas de token). Seuil des deux mois : 640 px.
- Sous 840 px : raccourcis en 2 × 2 au-dessus des mois, pleine largeur du panneau (584 px avec deux mois, 280 px avec un) ; à 280 px chaque bouton fait 136 px et la ligne de dates passe sur deux lignes : voulu.
- Cellules de 40 px et non 44 : 44 donnerait 664 px, qui ne tient plus à 640 px ; pointeur fin seulement. Boutons du pied : au moins `control-height-sm` (36 px) de haut ; boutons de raccourci : `control-height-md` (44 px) au moins.
- Fenêtre d'ordinateur de 360 px : un mois (304 px) + marge : pas de défilement horizontal ; raccourcis 2 × 2, pied qui passe à la ligne, ligne d'état sur deux lignes ; hauteur environ 530 px, le corps du panneau défile si la fenêtre est plus basse. Le CDK repositionne le panneau.

## 5. Clavier et lecteur d'écran (comparé au motif ARIA *date picker dialog*)

Conforme dans la spec : `role="dialog"` nommé et `aria-modal="true"`, focus piégé et rendu au bouton, `aria-haspopup="dialog"` et `aria-expanded`, flèches / Début / Fin / Page, Maj + Page, Entrée ou Espace, Échap sans changement, titre `aria-live="polite"`, `aria-current="date"`, `aria-selected` sur la `gridcell`, `columnheader`, `aria-labelledby`, une seule étape de tabulation pour la grille, jours hors bornes atteignables, premier focus sur le jour autorisé le plus proche. Précisions du brief :
1. **Ordre de tabulation**, date simple : précédent, titre, suivant, grille, « Aujourd'hui », « Effacer la date ». **Période** : raccourcis (colonne ou grille), **« Changer le début »** (s'il est là), précédent, titre, suivant, grille, « Aujourd'hui », « Sans date de fin » (s'il est là), « Effacer la période » ; Maj + Tab à l'envers. Le premier focus à l'ouverture reste sur le jour (pas sur un raccourci).
2. **Niveaux** : Entrée ou Espace sur le titre = niveau supérieur ; sur un mois ou une année = niveau inférieur, focus sur la cellule choisie. Flèches ±1 et ±4 ; Page : un pas du niveau (un mois, une année, **douze ans**) ; Maj + Page : une année, niveau des jours seulement. Échap ferme tout le panneau.
3. **Période au clavier** : Entrée sur un jour = début ; la ligne d'état (`role="status"`) lit « Début : … Choisissez la date de fin, ou cliquez sur « Sans date de fin ». » ; flèches = aperçu ; Entrée = fin et fermeture. « Changer le début » : efface le début, la ligne d'état relit « Choisissez la date de début. », focus sur la cellule de l'ancien début. Échap pendant le choix de la fin : ferme et abandonne le début. « Aujourd'hui » : le mois en cours passe à gauche, focus sur le bouton.
4. **Raccourcis** : boutons à deux lignes ; nom = libellé, description = dates (`aria-describedby`, ligne des dates `aria-hidden`). Entrée ou Espace = remplir les deux champs, fermer, focus rendu au bouton calendrier, dont le nom dit la période.
5. **Champ à zones** : flèches gauche / droite ou `/`, `.`, `-` : zone voisine ; haut / bas : ±1 en boucle ; chiffres : jour (premier chiffre 4 à 9) et mois (2 à 9) passent seuls à la zone suivante, deux chiffres aussi, l'année s'arrête à quatre ; chiffre fautif (jour trop grand, 00, mois > 12, année 0000) ignoré et valeur de la zone relue ; jour ramené annoncé « Jour ramené au 28 février. » (polie, sans texte à l'écran) ; Retour arrière / Suppr : vide la zone ; Tab quitte le champ ; Alt + flèche bas ouvre le panneau ; Ctrl + V : date entière.
6. Le nom d'un jour est sa date complète ; le point d'aujourd'hui a sa légende pour tous : bouton « Aujourd'hui » (vue), `aria-current` (lecteur d'écran), `title` (survol).

## 6. Mouvement

Apparition du panneau : fondu `opacity` en `--lc-calendar-duration` / `--lc-calendar-easing`, pas de glissement. Survol : changement de fond sur la même durée. Apparition de « Changer le début », de « Sans date de fin » et de la ligne « une seule borne » : sans mouvement. Changement de mois ou de niveau : aucun mouvement. `@media (prefers-reduced-motion: reduce)` : apparition et survol instantanés. Aucune minuterie.

## 7. Écarts restants entre le brief et la spec

1. **Ordre de tabulation de la période** : la spec dit « précédent, titre, suivant, grille, boutons du pied » ; le brief ajoute les raccourcis en premier et « Changer le début » avant « précédent ».
2. **Focus après « Changer le début »** : absent de la spec ; le brief le rend à la cellule de l'ancien début (le bouton disparaît).
3. **Plage du niveau années** : la spec fixe le titre « 2019 à 2030 » et le pas de douze ans ; le brief ajoute la règle d'ouverture (début 7 ans avant l'année affichée) et le décalage de 12 ans quand une flèche sort de la plage.
4. **Nom du bouton calendrier d'une période à une seule borne** (« Changer la période, à partir du 1er novembre 2026 ») et ligne « une seule borne » non vivante (reliée par `aria-describedby`, visible aussi en mode natif) : à ajouter en §5.3.
5. **Chiffre ignoré** : le brief relit la valeur de la zone (« Jour, 2 ») ; la spec n'en parle pas.
6. **Tokens** : `title-border`, `presets-width` à 192 px (colonne des raccourcis à deux lignes) et paire de contraste `border-strong`/`surface-raised` sont au brief, pas dans la spec.
