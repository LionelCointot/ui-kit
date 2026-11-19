# Spec : sélecteur de date (date simple et période)

- **Statut** : En revue
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-19
- **ADR liés** : [0001 Tokens](../adr/0001-design-tokens.md) · [0002 Comportement CDK et sélecteurs](../adr/0002-comportement-cdk-et-selecteurs.md) · [0006 Thèmes à l'exécution](../adr/0006-themes-a-l-execution.md)
- **Consommateurs identifiés** : copro-ticket (filtre « Du / Au » du journal d'audit), finance-credit (date des règles, date de début d'un prêt)

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « J'aimeeai faire evolui ui kit sur le datepicker. En effet lorsqu'on deploe j'ai l'impression que le theme n'est pas appliqué sur le selecteur de date. Est-ce qu'il serai possible de l'ameliorer ( rendre plus ergonomique comme kendo ui ou autre framework? Cnest un travail du ui ux designer »
  - « Ben est-ce que l'orsqu'on est sur mobile, on pourrai pas dire de prendre le picker de l'os et sur desktop notre personalise? »
  - « Ben il faudrait les deux simp'e et plagr »
- **Besoin en trois phrases** : Sur ordinateur, le calendrier qui s'ouvre sous un champ de date est celui du navigateur : il ignore le thème du produit et change d'un navigateur à l'autre. L'utilisateur veut un calendrier du kit, aux couleurs du thème et agréable à utiliser, pour choisir une date ou une période. Sur téléphone et tablette, le sélecteur du système reste utilisé, parce qu'il est fait pour le doigt.
- **Décisions prises pendant le cadrage** :
  - 2026-11-19, utilisateur : sélecteur du système sur mobile, calendrier du kit sur ordinateur.
  - 2026-11-19, utilisateur : les deux besoins sont couverts, date simple et période.
  - 2026-11-19, `ui-ux-designer` : trois directions maquettées (`docs/design/explorations/2026-11-date-picker/index.html`), recommandation A (sobre) pour la date simple et C pour la période. **Le choix entre A et B pour la date simple reste à confirmer par l'utilisateur** (section 12).
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : un composant public évolue sans rupture de contrat, un composant public est ajouté, un calendrier interne est partagé par les deux.
  - [x] Écran : nouveau panneau de calendrier, nouveau champ de période.
  - [ ] Sécurité et données : fermé. Le composant ne lit, n'envoie ni ne stocke rien ; la seule entrée est une date tapée, convertie par une fonction pure, jamais injectée en HTML.

## 1. Contexte et problème

`lc-date-input` pose un `input[type=date]` natif. Le champ lui-même suit le thème, mais le calendrier qui s'ouvre appartient au navigateur : ni couleurs, ni rayons, ni police du thème ne s'y appliquent (seul `color-scheme` clair ou sombre est suivi), et son ergonomie diffère entre Chrome, Firefox et Safari. C'est ce que l'utilisateur a vu une fois l'application déployée.

Pour une période, le kit n'offre rien : le journal d'audit de copro-ticket pose deux champs de date côte à côte et contrôle lui-même l'ordre des deux dates.

Le catalogue (`2026-11-catalogue-composants.md`, n° 9) reportait le calendrier personnalisé à un futur `lc-date-picker`. Cette spec le réalise, en faisant évoluer `lc-date-input` plutôt qu'en créant un second champ de date simple.

## 2. Objectifs

- **O1** : sur ordinateur, `lc-date-input` ouvre un calendrier du kit, entièrement stylé par les tokens du thème actif (clair et sombre).
- **O2** : sur appareil tactile, `lc-date-input` garde le champ natif et le sélecteur du système.
- **O3** : le contrat public de `lc-date-input` ne change pas : les trois usages existants fonctionnent sans modification.
- **O4** : un nouveau champ de période `lc-date-range-input` (début et fin), avec le même partage ordinateur / tactile.
- **O5** : tout se fait au clavier et se lit au lecteur d'écran (motif ARIA *date picker dialog*).

## 3. Hors périmètre (non-objectifs)

- Heure, date et heure, sélection de mois ou d'année seuls, sélection de plusieurs dates isolées.
- Calendrier affiché en permanence dans une page (le calendrier reste interne aux deux champs, faute de consommateur).
- Jours désactivés selon une règle libre (jours fériés, week-ends) : seules les bornes `min` et `max` existent.
- Premier jour de la semaine configurable : lundi, toujours.
- Filtre de dates des colonnes de `lc-data-table` : il garde ses deux champs natifs (`data` n'importe pas `forms`).
- Migration des consommateurs : chaque dépôt adopte la période dans sa propre tâche. `lc-date-input`, lui, s'améliore sans rien toucher chez eux.
- Niveaux « mois » et « décennie » du calendrier et saisie segmentée (direction B), sauf si l'utilisateur la choisit.

## 4. Utilisateurs et cas d'usage

**Utilisateur principal** : toute personne qui remplit un formulaire d'un produit consommateur (copropriétaire, gestionnaire de syndic, particulier qui simule un prêt). Aucune connaissance technique supposée. *À confirmer par l'utilisateur.*

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Personne sur ordinateur | Tape « 12/11/2026 » dans le champ | La valeur vaut `2026-11-12`, comme aujourd'hui |
| Personne sur ordinateur | Clique sur le bouton calendrier, puis sur un jour | Le panneau se ferme, le champ affiche la date, la valeur est mise à jour |
| Personne au clavier | Ouvre le panneau, se déplace aux flèches, valide avec Entrée | Même résultat, sans souris |
| Personne sur téléphone | Touche le champ | Le sélecteur de date du système s'ouvre, comme aujourd'hui |
| Gestionnaire (audit) | Choisit « 7 derniers jours » | Les deux bornes sont remplies d'un geste |
| Gestionnaire (audit) | Clique un jour de début puis un jour de fin | La période est surlignée, la valeur porte les deux dates |
| Intégrateur | Garde `<lc-date-input [formField]="…">` tel quel | Aucun changement de code ; le calendrier du kit apparaît sur ordinateur |

## 5. Solution proposée

### 5.1 Vue d'ensemble de l'architecture

Tout vit dans le point d'entrée `forms`, sans nouvel import entre points d'entrée et sans nouvelle dépendance (CDK Overlay et A11y y sont déjà utilisés par `lc-combobox`).

```
forms/src/date-input/
  date-input.component.ts        (existant, évolue)
  date-range-input.component.ts  (nouveau, public)
  calendar-panel.component.ts    (nouveau, interne : non exporté par public-api.ts)
  date-math.ts                   (nouveau, interne : fonctions pures sur des dates ISO)
  picker-mode.ts                 (nouveau, interne : choix natif / calendrier du kit)
```

- **`date-math.ts`** : fonctions pures sur des chaînes ISO `AAAA-MM-JJ` (grille d'un mois, ajout de jours et de mois, comparaison, bornes, analyse d'un texte tapé). Aucun objet `Date` ne sort de ce fichier ; aucun fuseau n'intervient. `toIsoDate` (déjà exportée) y déménage et reste exportée.
- **`picker-mode.ts`** : `matchMedia('(pointer: fine) and (hover: hover)')`, lu une fois à la création du champ. Vrai : calendrier du kit. Faux, ou `matchMedia` absent : champ natif. Un ordinateur à écran tactile avec souris a un pointeur principal fin : calendrier du kit.
- **`calendar-panel.component.ts`** : grille d'un ou deux mois, navigation, sélection d'une date ou d'une période. Il ne connaît ni champ ni surcouche : il reçoit valeur et bornes, émet un choix. Les deux champs l'ouvrent dans une surcouche CDK accrochée au champ (même stratégie de position et de défilement que `lc-combobox`).
- **Styles** : le panneau vit hors du composant, dans la surcouche. Ses règles vont donc dans la feuille globale `styles/ui-angular.css`, comme `.lc-combobox-panel`. Tokens de composant `--lc-calendar-*` avec repli sur `--lc-sys-*` ; aucun `--lc-ref-*`, aucune valeur en dur.
- **Thème** : la surcouche CDK est attachée à `body`. Elle hérite donc du thème posé sur `html` (`data-theme`), ce que font tous les consommateurs. Un thème posé sur un sous-arbre de la page ne s'applique pas au panneau : même limite que `lc-combobox`, `lc-select` et les dialogues.

### 5.2 Modèle de données

Aucune persistance. Types publics :

```ts
/** Période de dates ISO (AAAA-MM-JJ), bornes incluses ; une borne nulle ne borne pas. */
export interface LcDateRange {
  readonly start: string | null;
  readonly end: string | null;
}

/** Raccourci de période, calculé à partir de la date du jour (ISO). */
export interface LcDateRangePreset {
  readonly label: string;
  readonly range: (today: string) => LcDateRange;
}
```

### 5.3 API / interfaces

**`lc-date-input`** (existant). Sélecteur, entrées, sorties et type de valeur inchangés : `value` (model, `string | null` ISO), `min`, `max`, `disabled`, `readonly`, `invalid`, `touched`, `required`, `errors`, `size`, `fillMode`, `rounded`, `inputId`, `ariaLabel`, sortie `touch`, méthode `focus()`. Une entrée ajoutée :

| Entrée | Type | Défaut | Rôle |
|---|---|---|---|
| `picker` | `'auto' \| 'native' \| 'calendar'` | `'auto'` | `auto` applique la règle de `picker-mode.ts` ; les deux autres la forcent (Storybook, tests, choix d'un produit) |

Comportement en mode calendrier :

- Le champ est un `input` texte (`inputmode="numeric"`, texte d'exemple « jj/mm/aaaa » venu de `LC_LABELS`). Il affiche la valeur au format court de `LcFormatService` et accepte à la frappe : jour, mois, année sur 4 chiffres dans l'ordre de la locale configurée (`LC_LOCALE`), séparés par `/`, `.` ou `-` ; un ou deux chiffres pour le jour et le mois ; ou la forme ISO.
- La valeur est mise à jour dès que le texte forme une date valide, et vaut `null` quand le champ est vidé : comportement actuel.
- **Texte non reconnu à la sortie du champ** (« 31/02/2026 », « demain ») : le texte reste affiché tel que tapé, la valeur passe à `null`, le champ prend l'état invalide (`aria-invalid`, cadre d'erreur) et le message « Date non reconnue. Exemple : 12/11/2026 » s'ajoute aux erreurs exposées à `lc-form-field` (signal `errors` de `LcFormFieldControl`). Dès que le texte redevient valide ou vide, l'état disparaît. Sans `lc-form-field`, le message est porté par le champ lui-même (`aria-describedby` vers un texte lu par le lecteur d'écran et affiché sous le champ).
- `min` et `max` : les jours hors bornes ne sont pas sélectionnables dans le calendrier. Une date hors bornes **tapée** est transmise telle quelle, comme aujourd'hui avec le champ natif : la validation reste celle du formulaire.
- Bouton calendrier à droite du champ, nom accessible « Choisir une date » (ou « Changer la date, 12 novembre 2026 » quand une valeur existe). Absent si `disabled` ou `readonly`.

**`lc-date-range-input`** (nouveau), `FormValueControl<LcDateRange>` et `[(value)]` :

| Entrée | Type | Défaut | Rôle |
|---|---|---|---|
| `value` (model) | `LcDateRange` | `{ start: null, end: null }` | Période choisie |
| `min`, `max` | `string \| undefined` | — | Bornes ISO communes aux deux dates |
| `presets` | `readonly LcDateRangePreset[]` | 4 raccourcis du kit | `[]` masque les raccourcis |
| `startLabel`, `endLabel` | `string` | « Du », « Au » (`LC_LABELS`) | Libellés visibles des deux champs |
| `picker` | comme `lc-date-input` | `'auto'` | |
| `disabled`, `readonly`, `invalid`, `touched`, `required`, `errors`, `size`, `fillMode`, `rounded`, `inputId`, `ariaLabel` | comme `lc-date-input` | | `inputId` désigne le champ de début |

Sortie `touch`, méthode `focus()` (champ de début). Règles :

- Une borne peut rester vide : `{ start: '2026-11-01', end: null }` signifie « depuis le 1er novembre » (usage du journal d'audit).
- La valeur émise a toujours `start <= end` quand les deux existent. Au calendrier, cliquer un second jour antérieur au premier inverse les deux. À la frappe, une fin antérieure au début garde les deux textes, met l'état invalide et le message existant `dateOrderError` (« La date de fin est avant la date de début. ») ; la valeur garde la dernière période valide.
- Raccourcis du kit, calculés depuis la date du jour du poste : « 7 derniers jours », « 30 derniers jours », « Ce mois-ci », « Le mois dernier ». Un raccourci dont la période sort de `min` / `max` est rogné aux bornes ; s'il n'en reste rien, il est désactivé.
- Mode natif (tactile) : deux `input[type=date]`, le premier borné par la fin choisie, le second par le début ; pas de panneau ; les raccourcis s'affichent en ligne de boutons sous les champs.

**Libellés ajoutés à `LC_LABELS`** (français et anglais) : texte d'exemple du champ, « Choisir une date », « Changer la date, … », « Mois précédent », « Mois suivant », « Aujourd'hui », « Effacer », « Date non reconnue. Exemple : … », « Choisir une période », les quatre raccourcis, annonce « Du … au … ». Noms des mois et des jours : `Intl.DateTimeFormat` avec la locale de `LC_LOCALE`, jamais écrits en dur.

### 5.4 Interface utilisateur

Maquettes d'exploration : `docs/design/explorations/2026-11-date-picker/index.html` (captures `A-1280.png`, `C-1280.png`, et les variantes à 360 px). Direction proposée : **A** pour la date simple, **C** pour la période. Le brief détaillé (`/impeccable shape`) et le test `novice-user` complètent cette section avant validation.

**Panneau de date simple (A)** :
- En-tête : bouton « Mois précédent », titre « novembre 2026 », bouton « Mois suivant ».
- Grille : une ligne d'en-têtes « lu ma me je ve sa di » (nom complet en `abbr`), six lignes de jours au plus ; les jours du mois voisin ne sont pas affichés.
- Repères distincts, jamais par la seule couleur : jour choisi (fond plein `primary`), aujourd'hui (point sous le chiffre), focus clavier (anneau `focus-ring`), jour hors bornes (texte atténué, non cliquable). Le défaut relevé sur la maquette (anneau de focus trop proche du repère « aujourd'hui ») est corrigé par ce point.
- Pied : « Aujourd'hui » (choisit la date du jour et ferme ; désactivé si hors bornes) et « Effacer » (vide et ferme ; absent si le champ est obligatoire).
- Cible minimale de 40 px par jour ; largeur du panneau fixe, indépendante de celle du champ.

**Panneau de période (C)** :
- Deux mois côte à côte ; un seul sous 640 px de large.
- Colonne de raccourcis à gauche (au-dessus de la grille sous 640 px).
- Premier clic : début. Survol ou flèches : aperçu de la période. Second clic : fin, le panneau se ferme. Un clic alors qu'une période complète existe recommence un début.
- Période surlignée (fond `primary-container`), extrémités pleines.

**Clavier (motif ARIA *date picker dialog*)** : le bouton ouvre un `role="dialog"` nommé, focus piégé (`cdkTrapFocus`), focus posé sur le jour choisi, sinon aujourd'hui, sinon le premier jour autorisé. Flèches : jour et semaine. Début / Fin : début et fin de semaine. Page précédente / suivante : mois. Maj + Page : année. Entrée ou Espace : choisir. Échap : fermer sans changer, focus rendu au bouton. Grille `role="grid"`, jour choisi `aria-selected`, aujourd'hui `aria-current="date"`, changement de mois annoncé (`aria-live="polite"` sur le titre). Clic hors du panneau : fermer sans changer.

**États** : désactivé et lecture seule (pas de bouton, pas de panneau), invalide, obligatoire. Pas d'état de chargement ni d'état vide : rien n'est chargé.

**Mouvement** : apparition du panneau en fondu court (`--lc-sys-motion-*`), supprimée sous `prefers-reduced-motion`.

## 6. Cas limites et gestion des erreurs

- 29 février : accepté les années bissextiles seulement. « 31/04/2026 » : non reconnu.
- Année sur 2 chiffres (« 12/11/26 ») : non reconnue (pas de siècle deviné).
- `min` postérieur à `max` : aucune date sélectionnable, avertissement console en développement (`isDevMode()`), pas d'exception.
- `value` reçue qui n'est pas une date ISO valide : champ affiché vide, avertissement console en développement.
- Mois affiché à l'ouverture : celui de la valeur ; sinon celui d'aujourd'hui, ramené dans `min` / `max`.
- Navigation vers un mois entièrement hors bornes : bouton désactivé.
- Changement de mois au clavier depuis le 31 vers un mois plus court : focus sur le dernier jour du mois.
- Panneau près du bas ou du bord de la fenêtre : repositionné par le CDK (au-dessus, aligné à droite). Défilement de la page : le panneau suit le champ.
- Champ dans un dialogue ou un tiroir du kit : le panneau s'ouvre au-dessus ; Échap ferme le panneau seul.
- Fenêtre d'ordinateur réduite à 360 px : le calendrier du kit reste utilisable (un seul mois pour la période).
- `matchMedia` indisponible (rendu serveur, vieux navigateur) : mode natif.
- La valeur change par le code pendant que le panneau est ouvert : le panneau reflète la nouvelle valeur.

## 7. Sécurité, performance, observabilité

- **Sécurité et données** : angle fermé (section 0). Texte tapé analysé par expression régulière bornée, jamais rendu par `innerHTML`.
- **Performance** : le panneau n'est créé qu'à l'ouverture et détruit à la fermeture. Une grille compte 42 cellules au plus (84 pour la période) ; les instances `Intl` sont celles, mises en cache, de `LcFormatService`. Poids ajouté à `forms` mesuré à la livraison et noté en section 13.
- **Logs** : avertissements console en développement uniquement (cas de la section 6).

## 8. Alternatives envisagées

| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Faire évoluer `lc-date-input` | Les trois usages profitent du calendrier sans changer de code ; un seul champ de date simple dans le kit | Le composant grossit ; son rendu change sur ordinateur (version mineure) | **Oui** |
| Nouveau `lc-date-picker` à côté de `lc-date-input` (prévu au catalogue) | Aucun changement pour l'existant | Deux champs pour le même besoin ; chaque consommateur doit migrer ; le défaut signalé reste en place tant qu'il ne l'a pas fait | Non |
| Calendrier du kit partout, mobile compris | Un seul rendu | Moins bon au doigt que le sélecteur du système ; l'utilisateur a demandé l'inverse | Non |
| Styler le calendrier natif (`color-scheme`, `accent-color`) | Presque aucun code | Ne change que deux couleurs dans certains navigateurs ; ni thème ni ergonomie | Non |
| Bibliothèque tierce (Angular Material, flatpickr…) | Peu de code à écrire | Nouvelle dépendance, style à contourner, écart avec la règle « CDK uniquement » (ADR 0002) | Non |
| Période = deux `lc-date-input` assemblés par le consommateur | Rien à ajouter au kit | Pas de période surlignée ni de raccourcis ; contrôle d'ordre réécrit dans chaque produit | Non |
| Direction B (saisie segmentée, niveaux mois / décennie) | Plus proche de Kendo ; dates lointaines plus rapides à la souris | Environ deux fois plus de code et de cas clavier ; la frappe couvre déjà les dates lointaines | À trancher par l'utilisateur |

## 9. Plan de test

- **Unitaires** (`senior-developer`) : `date-math.spec.ts` (grilles, mois courts, années bissextiles, bornes, analyse des textes) ; règle de `picker-mode` avec un faux `matchMedia` ; raccourcis de période avec une date du jour figée (horloge simulée de Vitest).
- **Acceptation** (`qa-engineer`, Vitest, un test par `CA-n`) : `date-input.component.spec.ts`, `date-range-input.component.spec.ts`, intégration Signal Forms dans `signal-forms.spec.ts` (`[formField]` sur les deux champs).
- **Bout en bout** : aucun outil en place dans le ui-kit (Playwright visuel « pas encore »). Les stories Storybook servent de banc manuel : une story par mode (`picker="calendar"`, `picker="native"`), par thème, et pour la période.
- **Accessibilité** : parcours clavier complet et attributs ARIA vérifiés en test d'acceptation ; contraste des repères contrôlé par `lc-tokens check` sur les thèmes du kit.
- **Architecture** : `calendar-panel` et `date-math` absents de `forms/src/public-api.ts` ; `npm run catalogue:check` à jour ; aucun import d'un autre point d'entrée secondaire.

## 10. Critères d'acceptation

Date simple :
- [ ] CA-1 : avec `picker="calendar"`, le champ est un `input` texte accompagné d'un bouton calendrier ; avec `picker="native"`, un `input[type=date]` sans bouton (rendu actuel).
- [ ] CA-2 : avec `picker="auto"`, le mode est « calendrier » quand `matchMedia('(pointer: fine) and (hover: hover)')` répond vrai, « natif » quand il répond faux ou n'existe pas.
- [ ] CA-3 : les tests existants de `lc-date-input` et de `signal-forms.spec.ts` passent sans modification en mode natif ; sélecteur, entrées, sorties et type de valeur sont inchangés (`catalogue:check`, une seule entrée ajoutée : `picker`).
- [ ] CA-4 : taper « 12/11/2026 », « 1/2/2026 », « 12.11.2026 », « 12-11-2026 » ou « 2026-11-12 » donne la valeur ISO attendue ; vider le champ donne `null`.
- [ ] CA-5 : « 31/02/2026 », « 12/11/26 » et « demain », à la sortie du champ : texte conservé, valeur `null`, `aria-invalid="true"`, message « Date non reconnue. Exemple : 12/11/2026 » relié par `aria-describedby` ; l'état disparaît dès que le texte redevient valide ou vide.
- [ ] CA-6 : choisir un jour dans le panneau met la valeur à jour, affiche la date au format court de la locale, ferme le panneau et rend le focus au bouton.
- [ ] CA-7 : les jours hors `min` / `max` portent `aria-disabled="true"` et ne se choisissent ni à la souris ni au clavier ; les boutons de mois sont désactivés quand le mois voisin est entièrement hors bornes.
- [ ] CA-8 : clavier : flèches, Début, Fin, Page précédente / suivante, Maj + Page, Entrée, Espace et Échap se comportent comme décrit en 5.4 ; Échap ne change pas la valeur.
- [ ] CA-9 : le panneau porte `role="dialog"` nommé, la grille `role="grid"`, le jour choisi `aria-selected="true"`, aujourd'hui `aria-current="date"` ; le focus ne sort pas du panneau tant qu'il est ouvert.
- [ ] CA-10 : « Aujourd'hui » choisit la date du jour et ferme (désactivé si hors bornes) ; « Effacer » met `null` et ferme, et n'existe pas quand le champ est obligatoire.
- [ ] CA-11 : `disabled` et `readonly` : aucun bouton calendrier, aucun panneau.
- [ ] CA-12 : jour choisi, aujourd'hui et focus clavier se distinguent deux à deux par autre chose que la couleur (forme : fond plein, point, anneau).

Thème :
- [ ] CA-13 : les règles du panneau n'emploient que des `--lc-calendar-*` avec repli sur `--lc-sys-*` : aucun `--lc-ref-*`, aucune couleur, taille ni durée en dur (contrôle automatique par recherche dans la feuille).
- [ ] CA-14 : une story montre le panneau en thème clair et en thème sombre ; changer `data-theme` sur `html`, panneau ouvert, change ses couleurs.

Période :
- [ ] CA-15 : `lc-date-range-input` fonctionne avec `[formField]` et `[(value)]` ; sa valeur est un `LcDateRange`.
- [ ] CA-16 : deux clics dans le panneau donnent `{ start, end }` avec `start <= end`, même si le second jour est antérieur au premier ; le panneau se ferme au second clic.
- [ ] CA-17 : une seule borne remplie est une valeur valide (`{ start: '2026-11-01', end: null }`).
- [ ] CA-18 : taper une fin antérieure au début : état invalide, message « La date de fin est avant la date de début. », valeur inchangée.
- [ ] CA-19 : chacun des quatre raccourcis donne la période attendue pour une date du jour figée (dont un 31 mars et un 1er janvier) ; `presets = []` les masque ; un raccourci hors bornes est rogné ou désactivé.
- [ ] CA-20 : le panneau montre deux mois à partir de 640 px de large, un seul en dessous.
- [ ] CA-21 : mode natif : deux `input[type=date]`, le premier avec `max` égal à la fin choisie, le second avec `min` égal au début.

Transverse :
- [ ] CA-22 : aucun libellé en dur : tous viennent de `LC_LABELS` (français et anglais fournis) ; noms de mois et de jours par `Intl` et `LC_LOCALE`.
- [ ] CA-23 : `packages/angular/CATALOGUE.md` régénéré décrit `picker` et `lc-date-range-input` ; `npm run build` et `npx ng test ui-angular --watch=false` passent.
- [ ] CA-24 : test `novice-user` sur captures de l'écran réel : la personne choisit une date, puis une période, sans mot incompris ni hésitation bloquante.

## 11. Découpage en tâches

- [ ] T1 : `date-math.ts` et `picker-mode.ts`, avec leurs tests ; `toIsoDate` déplacée et toujours exportée (S ; prépare CA-2, CA-4, CA-19).
- [ ] T2 : `calendar-panel` en date simple : grille, navigation, clavier, ARIA, styles et tokens `--lc-calendar-*`, libellés (M ; CA-7 à CA-9, CA-12, CA-13, CA-22).
- [ ] T3 : `lc-date-input` : entrée `picker`, champ texte, bouton, surcouche, erreur de saisie, stories (M ; CA-1 à CA-6, CA-10, CA-11, CA-14).
- [ ] T4 : `calendar-panel` en période : deux mois, aperçu, raccourcis (M ; CA-16, CA-19, CA-20).
- [ ] T5 : `lc-date-range-input` : champs, modes, erreurs, stories, catalogue (M ; CA-15, CA-17, CA-18, CA-21, CA-23).
- [ ] T6 : vérification finale, test `novice-user` sur captures, mise à jour du catalogue de spec (n° 9) et de `CLAUDE.md` (S ; CA-24).

Version : mineure (ajouts ; le rendu de `lc-date-input` change sur ordinateur, son contrat non). Les trois premières tâches sont livrables seules : la date simple n'attend pas la période.

## 12. Risques et questions ouvertes

- **Choix par défaut à confirmer par l'utilisateur** :
  1. Direction **A** (sobre) pour la date simple, plutôt que **B** (saisie segmentée et niveaux mois / décennie, plus proche de Kendo, environ deux fois plus de travail).
  2. Faire évoluer `lc-date-input` plutôt que créer un second composant.
  3. Les quatre raccourcis de période proposés.
  4. Utilisateur principal (section 4).
- **Risques** :
  - Le rendu de `lc-date-input` change sur ordinateur dès la mise à jour du kit : les tests de bout en bout des consommateurs qui remplissent un champ de date par sa valeur ISO (`fill('2026-11-12')`) continuent de marcher (la forme ISO est acceptée), mais une capture d'écran de référence changerait.
  - Ordinateur hybride (écran tactile, sans souris branchée) : la règle peut donner le calendrier du kit à quelqu'un qui touche l'écran. Cibles de 40 px prévues pour ce cas ; `picker="native"` reste possible.
  - Signal Forms est récent : la façon d'exposer une erreur de saisie propre au champ (CA-5) est à vérifier sur la version installée avant T3 ; repli prévu : message porté par le champ lui-même.
- **Dettes** : pas de test visuel automatique dans le kit ; le filtre de dates de `lc-data-table` garde le calendrier natif.
- **Questions ouvertes** : aucune autre.

## 13. Relectures et écarts

| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| | `cadreur` | cadrage et spec | | |
| | `architect` | conception | | |
| | `qa-engineer` | plan de test | | |
| | `ui-ux-designer` | brief (5.4) | | |
| | `novice-user` | textes du brief | | |

**Écarts constatés à l'implémentation** : (à remplir)
