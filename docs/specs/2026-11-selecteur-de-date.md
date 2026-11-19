# Spec : sélecteur de date (date simple et période)

- **Statut** : En revue
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-19
- **ADR liés** : [0001 Tokens](../adr/0001-design-tokens.md) · [0002 Comportement CDK et sélecteurs](../adr/0002-comportement-cdk-et-selecteurs.md) · [0006 Thèmes à l'exécution](../adr/0006-themes-a-l-execution.md) · [0008 Sélecteur de date : calendrier du kit ou sélecteur du système](../adr/0008-selecteur-de-date-kit-ou-systeme.md) (nouveau)
- **Consommateurs relevés dans le code** : copro-ticket (filtre « Du / Au » du journal d'audit), finance-credit (date des règles, date de début d'un prêt)
- **Brief de conception** : [`docs/design/briefs/2026-11-selecteur-de-date.md`](../design/briefs/2026-11-selecteur-de-date.md)

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « J'aimeeai faire evolui ui kit sur le datepicker. En effet lorsqu'on deploe j'ai l'impression que le theme n'est pas appliqué sur le selecteur de date. Est-ce qu'il serai possible de l'ameliorer ( rendre plus ergonomique comme kendo ui ou autre framework? Cnest un travail du ui ux designer »
  - « Ben est-ce que l'orsqu'on est sur mobile, on pourrai pas dire de prendre le picker de l'os et sur desktop notre personalise? »
  - « Ben il faudrait les deux simp'e et plagr »
  - Sur maquettes : « On fait B et C »
- **Besoin en trois phrases** : Sur ordinateur, le calendrier qui se déplie sous un champ de date est celui du navigateur : il ignore le thème du produit et change d'un navigateur à l'autre. L'utilisateur veut un calendrier du kit, aux couleurs du thème et aussi agréable que celui de Kendo UI, pour choisir une date ou une période. Sur téléphone et tablette, le sélecteur du système reste utilisé.
- **Lecture retenue** : « lorsqu'on deploe » est lu « quand on déplie le sélecteur ». L'autre lecture (« une fois l'application déployée ») désigne le même défaut.
- **Décisions prises pendant le cadrage** :
  - 2026-11-19, utilisateur : sélecteur du système sur mobile, calendrier du kit sur ordinateur.
  - 2026-11-19, utilisateur : date simple et période.
  - 2026-11-19, `ui-ux-designer` : trois directions maquettées (`docs/design/explorations/2026-11-date-picker/index.html`) : A (sobre), B (riche : saisie par zones, calendrier à trois niveaux, « Aujourd'hui » et « Effacer »), C (période : deux mois, raccourcis).
  - 2026-11-19, utilisateur, sur maquettes : **B pour la date simple, C pour la période.**
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : un composant public évolue sans rupture de contrat, un composant public est ajouté, un calendrier interne est partagé par les deux.
  - [x] Écran : champ à zones, panneau de calendrier, champ de période.
  - [ ] Sécurité et données : fermé. Le composant ne lit, n'envoie ni ne stocke rien ; la seule entrée est une date tapée ou collée, analysée par une fonction pure, jamais injectée en HTML.

## 1. Contexte et problème

`lc-date-input` pose un `input[type=date]` natif. Le champ suit le thème, mais le calendrier qui se déplie appartient au navigateur : ni couleurs, ni rayons, ni police du thème ne s'y appliquent (seul le mode clair ou sombre est suivi), et son ergonomie diffère entre Chrome, Firefox et Safari.

Pour une période, le kit n'offre pas de champ : le journal d'audit de copro-ticket pose deux champs de date côte à côte et contrôle lui-même l'ordre des deux dates.

Le catalogue (`2026-11-catalogue-composants.md`, n° 9) reportait le calendrier personnalisé à un futur `lc-date-picker`. Cette spec le réalise en faisant évoluer `lc-date-input`.

## 2. Objectifs

- **O1** : sur ordinateur, `lc-date-input` ouvre un calendrier du kit, stylé par les tokens du thème actif (clair et sombre).
- **O2** : ergonomie de la direction B : saisie par zones (jour, mois, année), calendrier à trois niveaux (jours, mois, années), « Aujourd'hui » et « Effacer ».
- **O3** : sur appareil tactile, le champ natif et le sélecteur du système, comme aujourd'hui.
- **O4** : le contrat de code de `lc-date-input` ne change pas : les usages existants compilent et fonctionnent sans modification.
- **O5** : un champ de période `lc-date-range-input` selon la direction C : deux champs à zones, deux mois côte à côte, période surlignée, raccourcis.
- **O6** : tout se fait au clavier et se lit au lecteur d'écran (motif ARIA *date picker dialog*).

## 3. Hors périmètre (non-objectifs)

- Heure, date et heure, sélection de mois ou d'année seuls, plusieurs dates isolées.
- Calendrier affiché en permanence dans une page : il reste interne aux deux champs, faute de consommateur.
- Jours désactivés selon une règle libre (jours fériés, week-ends) : seules les bornes `min` et `max` existent.
- Premier jour de la semaine configurable : lundi, toujours.
- Forçage du mode (calendrier ou natif) champ par champ : le choix se fait pour toute l'application (jeton d'injection), pas par une entrée du composant.
- Filtre de dates des colonnes de `lc-data-table` : il garde ses deux champs natifs et ses raccourcis (`data` n'importe pas `forms`).
- Migration des consommateurs vers le champ de période : chaque dépôt le fait dans sa propre tâche.

## 4. Utilisateurs et cas d'usage

**Utilisateur principal** : toute personne qui remplit un formulaire d'un produit consommateur (copropriétaire, gestionnaire de syndic, particulier qui simule un prêt), sans connaissance technique. *À confirmer par l'utilisateur.*

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Personne sur ordinateur | Clique dans le champ et tape 1, 2, 1, 1, 2, 0, 2, 6 | Le champ affiche 12/11/2026, la valeur vaut `2026-11-12` |
| Personne sur ordinateur | Ouvre le calendrier, clique un jour | Le panneau se ferme, le champ affiche la date |
| Personne qui vise une date lointaine | Clique le titre « novembre 2026 », puis « 2026 », avance de dix ans, choisit 2031, puis mars, puis le 5 | Cinq clics de navigation au lieu de cinquante-deux clics sur « mois suivant » |
| Personne au clavier | Ouvre le panneau, se déplace aux flèches, valide avec Entrée | Même résultat, sans souris |
| Personne sur téléphone | Touche le champ | Le sélecteur de date du système s'ouvre, comme aujourd'hui |
| Gestionnaire (audit) | Choisit « 7 derniers jours » | Les deux champs sont remplis et le panneau se ferme |
| Gestionnaire (audit) | Clique un jour de début puis un jour de fin | La période est surlignée, la valeur porte les deux dates |
| Gestionnaire (audit) | Clique un jour de début, puis « Sans date de fin » | La valeur porte le début seul : « depuis le 1er novembre » |
| Intégrateur | Garde `<lc-date-input [formField]="…">` tel quel | Aucun changement de code ; le calendrier du kit apparaît sur ordinateur |

## 5. Solution proposée

### 5.1 Vue d'ensemble de l'architecture

Tout vit dans le point d'entrée `forms`, sans nouvel import entre points d'entrée et sans nouvelle dépendance (CDK Overlay, A11y et Layout ; `lc-combobox` emploie déjà les deux premiers).

```
forms/src/date-input/
  date-input.component.ts        (existant, évolue)
  date-range-input.component.ts  (nouveau, public)
  date-picker-mode.ts            (nouveau, public : jeton LC_DATE_PICKER)
  calendar-panel.component.ts    (nouveau, interne)
  date-math.ts                   (nouveau, interne : fonctions pures sur des dates ISO)
  date-mask.ts                   (nouveau, interne : fonctions pures de la saisie par zones)
packages/tokens/src/components/calendar.tokens.json   (nouveau)
```

- **`date-math.ts`** : grille d'un mois, ajout de jours, de mois et d'années, dernier jour d'un mois, comparaison, bornes. Entrées et sorties en chaînes ISO `AAAA-MM-JJ` ; les conversions passent par `isoToLocalDate` et `localDateToIso` du cœur, déjà existantes. Aucun fuseau n'intervient.
- **`date-mask.ts`** : état des trois zones, frappe d'un chiffre, passage automatique, flèches, analyse d'un texte collé, ordre des zones selon `LC_LOCALE`. Aucune dépendance à Angular : testable seul.
- **`toIsoDate`** (fonction publique existante) : inchangée, toujours exportée, toujours « jour d'abord ». L'analyse selon la locale est une fonction interne distincte.
- **`date-picker-mode.ts`** : jeton `LC_DATE_PICKER` (`'auto' | 'native' | 'calendar'`, défaut `'auto'`). En `auto`, `document.defaultView.matchMedia('(pointer: fine) and (hover: hover)')` est lu une fois à la création du champ : vrai donne le calendrier du kit ; faux, absent ou en erreur donne le champ natif (ADR 0008). Storybook et les tests fournissent le jeton pour forcer un mode.
- **`calendar-panel.component.ts`** : un seul composant interne, paramétré par le nombre de mois (1 ou 2), le niveau (`day`, `month`, `decade`) et une sélection `{ from, to }` (la date simple est `from` seul). Une grille générique de cellules sert les trois niveaux. Il ne connaît ni champ ni surcouche : il reçoit valeur et bornes, émet un choix. Les deux champs l'ouvrent dans une surcouche CDK accrochée au champ, avec la stratégie de position et de défilement de `lc-combobox`.
- **Styles** : le panneau vit dans la surcouche, hors du composant ; ses règles vont dans la feuille globale `styles/ui-angular.css`, comme `.lc-combobox-panel`. Tokens de composant `--lc-calendar-*` (liste au brief, §1) déclarés dans `calendar.tokens.json` avec repli sur `--lc-sys-*` ; aucun `--lc-ref-*`, aucune valeur en dur. Les paires de contraste du brief s'ajoutent à `contrast-pairs.json`.
- **Thème** : la surcouche est attachée à `body` et hérite du thème posé sur `html` par `LcThemeService` (`data-theme` et variables en ligne), aperçu du theme-builder compris. Un thème posé sur un sous-arbre de la page ne s'applique pas au panneau : même limite que `lc-combobox` et les dialogues.

### 5.2 Modèle de données

Aucune persistance. Types publics ajoutés (`forms`) :

```ts
/** Période de dates ISO (AAAA-MM-JJ), bornes incluses ; une borne nulle ne borne pas. */
export interface LcDateInterval {
  readonly from: string | null;
  readonly to: string | null;
}

/** Raccourci de période, calculé à partir de la date du jour du poste (ISO). */
export interface LcDateIntervalPreset {
  readonly label: string;
  readonly interval: (today: string) => LcDateInterval;
}

export type LcDatePickerMode = 'auto' | 'native' | 'calendar';
export const LC_DATE_PICKER: InjectionToken<LcDatePickerMode>;
```

Le nom `LcDateRange` est déjà pris par le filtre de `lc-data-table` (`{ preset?, from?, to? }`) : d'où `LcDateInterval`, avec les mêmes noms de bornes `from` / `to`.

### 5.3 API / interfaces

**`lc-date-input`** : sélecteur, classe hôte, entrées, sorties, type de valeur et `focus()` inchangés (`value` model `string | null` ISO, `min`, `max`, `disabled`, `readonly`, `invalid`, `touched`, `required`, `errors`, `size`, `fillMode`, `rounded`, `inputId`, `ariaLabel`, sortie `touch`). **Aucune entrée ajoutée.** Le champ reste un `input` unique, désigné par `inputId` et par le `label for` de `lc-form-field`.

Mode calendrier, **champ à zones** (un seul `input` texte, `inputmode="numeric"`, `autocomplete="off"`) :

- Vide, le champ montre les lettres des zones dans l'ordre de la locale : `jj/mm/aaaa`. Un clic ou l'arrivée du focus sélectionne une zone.
- Chiffres : ils remplissent la zone active. Le jour passe seul à la zone suivante après deux chiffres ou un premier chiffre de 4 à 9 ; le mois après deux chiffres ou un premier chiffre de 2 à 9 ; l'année s'arrête à quatre chiffres. Les barres ne se tapent pas ; les taper ne gêne pas (elles passent à la zone suivante).
- Flèches gauche et droite, ou `/`, `.`, `-` : zone voisine. Flèches haut et bas : plus ou moins un dans la zone, en boucle, sans toucher aux autres zones. Retour arrière ou Suppr : vide la zone. Tab quitte le champ. Alt + flèche bas ouvre le panneau.
- **Valeur** : elle vaut la date dès que les trois zones forment une date qui existe, et `null` sinon. C'est déjà ce que fait le champ natif, dont la valeur est vide tant que la date est incomplète.
- **Date qui n'existe pas, tapée ou collée** (31 février) : rien n'est corrigé à la place de la personne. Le champ garde ce qui a été tapé, la valeur vaut `null`, et le message « Cette date n'existe pas : février 2026 n'a que 28 jours. » s'affiche dès que les trois zones sont remplies. *(Le test du novice a écarté la correction automatique en 28 février : « j'ai tapé 31 et on m'affiche 28, sans un mot ».)*
- **Flèches haut et bas** : le jour boucle sur les jours du mois affiché ; changer le mois ou l'année à la flèche ramène le jour au dernier jour du mois s'il le dépasse (29/02/2024, flèche haut sur l'année : 28/02/2025). Ici la personne regarde la zone qu'elle modifie, et la nouvelle valeur de la zone est annoncée.
- **Date incomplète à la sortie du champ** (une ou deux zones remplies) : valeur `null`, état invalide, message « Date incomplète. Exemple : 12/11/2026 ». Champ entièrement vide : aucun message propre (l'obligation reste celle du formulaire).
- **Collage ou remplacement de tout le texte** (collage, remplissage automatique, `fill()` d'un test) : accepté sous les formes jour, mois, année dans l'ordre de la locale avec `/`, `.` ou `-`, un ou deux chiffres pour le jour et le mois, année sur quatre chiffres ; ou la forme ISO. Texte illisible : le champ ne change pas, le message « Date non reconnue. Exemple : 12/11/2026 » s'affiche jusqu'à la frappe suivante.
- **Remontée des erreurs de saisie** : par `transformedValue` de Signal Forms (`parse` rend la valeur et une erreur `{ kind: 'parse', message }`), ce qui rend le champ du formulaire invalide et fait revenir le message par `errors` jusqu'à `lc-form-field`. Hors formulaire, le champ affiche lui-même le message, relié par `aria-describedby`.
- `min` et `max` : jours, mois et années hors bornes ne sont pas sélectionnables dans le panneau. Une date hors bornes tapée est transmise telle quelle, comme aujourd'hui : la validation reste celle du formulaire.
- Une valeur changée par le code (`[value]`, formulaire) remet le texte du champ en forme.
- Bouton calendrier à droite : « Choisir une date », ou « Changer la date, 12 novembre 2026 » ; `aria-haspopup="dialog"`, `aria-expanded`. Absent si `disabled` ou `readonly`.
- Lecteur d'écran : le champ est un champ de texte étiqueté ; une aide (« Tapez la date, ou changez chaque zone avec les flèches haut et bas. ») et une annonce de la zone active (« Jour, 12 ») complètent.

Mode natif : rendu et comportement actuels, sans bouton ni panneau.

**`lc-date-range-input`** (nouveau), `FormValueControl<LcDateInterval>` et `[(value)]` :

| Entrée | Type | Défaut | Rôle |
|---|---|---|---|
| `value` (model) | `LcDateInterval` | `{ from: null, to: null }` | Période choisie |
| `min`, `max` | `string \| undefined` | — | Bornes ISO communes aux deux dates |
| `presets` | `readonly LcDateIntervalPreset[]` | les 4 raccourcis du kit | `[]` les masque (une période à venir n'a que faire de « 7 derniers jours ») |
| `disabled`, `readonly`, `invalid`, `touched`, `required`, `errors`, `size`, `fillMode`, `rounded`, `inputId`, `ariaLabel` | comme `lc-date-input` | | `inputId` désigne le champ de début ; `ariaLabel` nomme le groupe (« Période » par défaut) |

Sortie `touch`, méthode `focus()` (champ de début). Règles :

- Deux champs à zones identiques à celui de `lc-date-input`, précédés de « Du » et « Au » (libellés existants de `LC_LABELS`), et un seul bouton calendrier.
- Une seule borne remplie est une valeur valide, dans les deux sens : `{ from: '2026-11-01', to: null }` (« depuis le 1er novembre ») et `{ from: null, to: '2026-11-30' }`. Un champ laissé vide n'est pas une erreur.
- **Règle unique : une borne inutilisable vaut `null`, avec un message.** Borne incomplète : « Date incomplète… ». Date qui n'existe pas : « Cette date n'existe pas… ». Fin tapée avant le début : la borne en cours de frappe vaut `null`, message existant « La date de fin est avant la date de début. ». La valeur émise a donc toujours `from <= to` quand les deux existent.
- Au calendrier, cliquer un second jour antérieur au premier inverse les deux.
- Raccourcis du kit : « 7 derniers jours » et « 30 derniers jours » (libellé existant `lastDays`, aujourd'hui compris, comme `dateRangeBounds` du tableau de données), « Ce mois-ci » (du 1er au dernier jour du mois), « Le mois dernier » (le mois précédent entier). Cliquer un raccourci remplit les deux champs et ferme le panneau : les dates retenues se lisent dans les champs. Chaque raccourci décrit ses dates au survol et au lecteur d'écran (« du 13 au 19 novembre 2026 »). Un raccourci qui dépasse `min` ou `max` est rogné aux bornes ; s'il n'en reste rien, il est désactivé.
- « Sans date de fin » : bouton du pied, présent une fois le début choisi au calendrier ; il valide le début seul et ferme.
- « Aujourd'hui » : montre le mois en cours dans le panneau, sans rien choisir. « Effacer » : vide les deux bornes et ferme ; absent si le champ est obligatoire.
- Mode natif : deux `input[type=date]`, le premier borné par la fin choisie, le second par le début ; pas de panneau ; les raccourcis en rangée de boutons sous les champs.

**Libellés ajoutés à `LC_LABELS`** (français et anglais) : liste et textes exacts au brief, §2. Noms des mois et des jours par `Intl.DateTimeFormat` et `LC_LOCALE`, jamais écrits en dur.

### 5.4 Interface utilisateur

Directions choisies par l'utilisateur : **B** (date simple) et **C** (période). Maquettes : `docs/design/explorations/2026-11-date-picker/` (`B-1280.png`, `C-1280.png`, variantes à 360 px). Le brief fait foi pour l'anatomie, les tokens, les textes, les états et les dimensions ; l'essentiel :

**Panneau de date simple** : en-tête (précédent, titre cliquable, suivant), corps de hauteur fixe, pied (« Aujourd'hui », « Effacer »). Largeur fixe de 304 px, cellules de 40 px.
- Niveau jours : en-têtes « l m m j v s d » (nom complet en `abbr`), jours du mois seulement.
- Niveau mois (clic sur « novembre 2026 ») : douze mois, titre « 2026 ».
- Niveau années (clic sur « 2026 ») : douze années, titre « 2020 à 2029 », non cliquable ; les flèches se nomment « Années précédentes » et « Années suivantes ».
- **Le titre a l'apparence d'un bouton au repos** (fond ou contour, et chevron), pas seulement au survol : le novice n'avait pas deviné qu'il se cliquait.
- Les niveaux ne servent qu'à naviguer : choisir une année ramène aux mois, choisir un mois ramène aux jours ; la date se choisit toujours au niveau des jours.
- « Aujourd'hui » choisit la date du jour et ferme (désactivé si hors bornes). Le bouton porte le même point que le jour d'aujourd'hui dans la grille, qui sert ainsi de légende. « Effacer » vide le champ et ferme (absent si obligatoire).

**Trois repères, trois formes** (jamais la seule couleur) : disque plein pour le jour choisi, point sous le chiffre pour aujourd'hui (info-bulle « Aujourd'hui »), anneau carré intérieur pour le focus clavier. Hors bornes : texte atténué, `aria-disabled`, atteignable au clavier mais sans effet.

**Panneau de période** : même coque. Ligne d'état visible (« Choisissez la date de début. » puis « Choisissez la date de fin. »). Deux mois côte à côte à partir de 640 px de large de fenêtre, un seul en dessous. Raccourcis en colonne à gauche à partir de 840 px, en rangée au-dessus des mois en dessous. Premier clic : début ; survol ou flèches : aperçu (bande à bords en tirets) ; second clic : fin, le panneau se ferme. Après le premier clic, le pied propose « Sans date de fin ». Un clic sur un titre remplace les deux mois par une seule grille de mois ou d'années, pleine largeur ; le mois choisi revient à gauche.

**Clavier** : dialogue `role="dialog"` et `aria-modal="true"`, nommé ; focus piégé ; premier focus sur le jour choisi, sinon aujourd'hui, sinon le jour autorisé le plus proche. Une seule étape de tabulation pour la grille ; ordre : précédent, titre, suivant, grille, boutons du pied. Grille `role="grid"` nommée par le titre, lignes `row`, cellules `gridcell` portant `aria-selected`, en-têtes `columnheader`, aujourd'hui `aria-current="date"`. Flèches : jour et semaine (aux niveaux mois et années : ±1 et ±4). Début et Fin : lundi et dimanche de la semaine. Page précédente et suivante : un pas du niveau (mois, année, dix ans). Maj + Page : une année, au niveau des jours. Entrée ou Espace : choisir, ou changer de niveau sur le titre. Échap : ferme tout le panneau sans rien changer, focus rendu au bouton ; pendant le choix d'une fin, le début est abandonné. Clic hors du panneau : comme Échap. Le titre (`aria-live="polite"`) est relu quand le mois, l'année ou le niveau change.

**États du champ** : désactivé et lecture seule (ni bouton ni panneau, zones non modifiables), invalide, obligatoire. Aucun état de chargement : rien n'est chargé.

**Mouvement** : fondu court à l'apparition (`--lc-calendar-duration`), instantané sous `prefers-reduced-motion` ; changement de mois ou de niveau sans mouvement.

**Test `novice-user` sur les textes** : résultats en section 13.

## 6. Cas limites et gestion des erreurs

- 29 février tapé : accepté les années bissextiles, « Cette date n'existe pas… » sinon. 31 avril tapé : même message.
- Année sur deux chiffres collée (« 12/11/26 ») : non reconnue (pas de siècle deviné).
- `min` postérieur à `max` : aucune date sélectionnable, avertissement console en développement (`isDevMode()`), pas d'exception.
- `value` reçue qui n'est pas une date ISO valide : champ vide, avertissement console en développement.
- Mois affiché à l'ouverture : celui de la valeur ; sinon celui d'aujourd'hui, ramené dans `min` / `max`.
- Navigation vers un mois, une année ou une décennie entièrement hors bornes : bouton désactivé.
- Page suivante depuis un 31 vers un mois plus court : focus sur le dernier jour du mois.
- La valeur change par le code pendant que le panneau est ouvert : le panneau reflète la nouvelle valeur.
- Champ dans un dialogue ou un tiroir du kit : le panneau s'ouvre au-dessus ; Échap ferme le panneau seul, le dialogue reste ouvert.
- Panneau près d'un bord de la fenêtre : repositionné par le CDK ; défilement de la page : le panneau suit le champ.
- Fenêtre d'ordinateur de 360 px : un seul mois, raccourcis en rangée, pas de défilement horizontal.
- `matchMedia` absent ou en erreur (rendu serveur, jsdom, vieux navigateur) : mode natif. Les tests des consommateurs, qui tournent sous jsdom, restent donc en mode natif sans rien changer.
- Souris branchée en cours de session sur un appareil tactile : le mode ne change pas avant la prochaine création du champ.

## 7. Sécurité, performance, observabilité

- **Sécurité et données** : angle fermé (section 0). Texte analysé par expressions régulières bornées, jamais rendu par `innerHTML`.
- **Performance** : le panneau n'est créé qu'à l'ouverture et détruit à la fermeture ; 42 cellules au plus par mois ; instances `Intl` de `LcFormatService`, déjà mises en cache. Poids ajouté à `forms` mesuré à la livraison et noté en section 13.
- **Logs** : avertissements console en développement uniquement.

## 8. Alternatives envisagées

| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Faire évoluer `lc-date-input` | Les usages existants profitent du calendrier sans changer de code ; un seul champ de date simple dans le kit | Le composant grossit ; son rendu change sur ordinateur (version mineure) | **Oui** |
| Nouveau `lc-date-picker` à côté de `lc-date-input` (prévu au catalogue) | Rien ne change pour l'existant | Deux champs pour le même besoin ; chaque consommateur doit migrer pour corriger le défaut signalé | Non |
| Calendrier du kit partout, mobile compris | Un seul rendu | Moins bon au doigt ; l'utilisateur a demandé l'inverse | Non |
| Styler le calendrier natif (`color-scheme`, `accent-color`) | Presque aucun code | Deux couleurs seulement, dans certains navigateurs | Non |
| Bibliothèque tierce (Angular Material, flatpickr, Kendo) | Peu de code à écrire | Dépendance, licence pour Kendo, style à contourner, écart avec « CDK uniquement » (ADR 0002) | Non |
| Direction A (champ à saisie libre, un seul niveau) | Deux fois moins de code | Écartée par l'utilisateur au profit de B | Non |
| Zones : trois `role="spinbutton"` au lieu d'un `input` masqué | Meilleure annonce au lecteur d'écran | `lc-form-field` relie le libellé par `label for` à un seul champ (`labelable` constant) : il faudrait changer le contrat de tous les contrôles ; collage et remplissage automatique à recoder | Non ; **repli** si le test au lecteur d'écran échoue |
| Entrée `picker` sur chaque champ | Forçage champ par champ | Deux entrées publiques figées pour toujours, pour un choix qui se fait par application | Non : jeton `LC_DATE_PICKER` |
| Date qui n'existe pas : ramener le jour au dernier du mois (comme Kendo) | Pas de message d'erreur | Change la saisie sans le dire ; rejeté au test du novice | Non, sauf aux flèches |
| Saisie incomplète : garder la dernière date valide (comme les champs numériques) | Cohérent avec `numeric-input-base` | Le champ montrerait « jj/11/2026 » pendant que la valeur resterait l'ancienne date ; le champ natif actuel, lui, rend une valeur vide | Non |
| Période = deux `lc-date-input` assemblés par le consommateur | Rien à ajouter au kit | Ni période surlignée ni raccourcis ; contrôle d'ordre réécrit dans chaque produit | Non |

## 9. Plan de test

- **Caractérisation, avant tout changement** (`qa-engineer`, T0) : `date-input.component.spec.ts` n'existe pas ; il est écrit sur le composant actuel (valeur ISO, événements `change` et `input`, `min` / `max` en attributs, `focus()`, états, `[formField]` dans `signal-forms.spec.ts`) et doit rester vert, sans modification, en mode natif.
- **Unitaires** (`senior-developer`) : `date-math.spec.ts`, `date-mask.spec.ts` (frappe, passage automatique, flèches, date qui n'existe pas, collage, ordre selon la locale), `date-picker-mode.spec.ts` (faux `matchMedia` : vrai, faux, absent, en erreur), raccourcis avec `vi.setSystemTime`.
- **Acceptation** (`qa-engineer`, Vitest sous jsdom, un test par critère, identifiant dans le nom) : `date-input.component.spec.ts`, `date-range-input.component.spec.ts`, `signal-forms.spec.ts`, `calendar-panel.architecture.spec.ts` (lecture de la feuille de styles, exports, imports). La surcouche, le clavier et le focus se testent comme dans `combobox.component.spec.ts`.
- **Navigateur réel** (`qa-engineer`) : fonctions `play` de stories, par le projet Vitest « storybook » déjà configuré (`@vitest/browser-playwright`), pour ce que jsdom ne calcule pas : styles réellement appliqués, thème, largeur, taille des cibles. T0 vérifie que ce projet tourne sur le poste ; sinon, repli sur une vérification par captures, notée comme telle.
- **Manuel** : lecteur d'écran (NVDA ou VoiceOver) sur le champ à zones, par une personne, avant de brancher le panneau (T5) ; test `novice-user` sur captures de l'écran réel.
- **Commandes** (preuve du verdict, pas des tests Vitest) : `npm run build`, `npx ng test ui-angular --watch=false`, `npm run catalogue:check`, `npx lc-tokens check`.

## 10. Critères d'acceptation

« (navigateur) » : prouvé en navigateur réel, pas sous jsdom.

Mode et contrat :
- [ ] CA-1 : avec `LC_DATE_PICKER = 'calendar'`, le champ est un `input` texte suivi d'un bouton calendrier ; avec `'native'`, un `input[type=date]` sans bouton.
- [ ] CA-2 : avec `'auto'`, le mode est « calendrier » si `matchMedia('(pointer: fine) and (hover: hover)')` répond vrai ; « natif » s'il répond faux, lève une erreur ou n'existe pas.
- [ ] CA-3 : en mode natif, les tests de caractérisation écrits en T0 passent sans modification ; `catalogue:check` ne montre aucune entrée ni sortie ajoutée ou retirée sur `lc-date-input` ; `toIsoDate` est toujours exportée et rend les mêmes résultats.

Champ à zones (locale `fr-FR` sauf mention) :
- [ ] CA-4 : frapper 1, 2, 1, 1, 2, 0, 2, 6 donne `12/11/2026` et la valeur `2026-11-12` ; frapper 5 (jour) passe seul au mois ; frapper 3 (mois) passe seul à l'année.
- [ ] CA-5 : flèches haut et bas changent la zone active de ±1 en boucle (jour 31 → 1 en janvier, mois 12 → 1) sans changer les autres zones ; flèches gauche et droite et les touches `/`, `.`, `-` changent de zone ; Retour arrière vide la zone et la valeur devient `null`.
- [ ] CA-6 : 31, 02, 2026 : le champ garde `31/02/2026`, la valeur vaut `null`, `aria-invalid="true"` et le message « Cette date n'existe pas : février 2026 n'a que 28 jours. » est relié par `aria-describedby` ; 29, 02, 2024 est accepté (`2024-02-29`) ; 29/02/2024 puis flèche haut sur l'année donne `28/02/2025`.
- [ ] CA-7 : sortir du champ (`blur`) avec `12/mm/aaaa` : valeur `null`, `aria-invalid="true"`, message « Date incomplète. Exemple : 12/11/2026 » relié par `aria-describedby` ; sous `[formField]`, le champ du formulaire est invalide avec une erreur de nature `parse` ; l'état disparaît quand la date est complète ou le champ vide.
- [ ] CA-8 : remplacer tout le texte par « 12/11/2026 », « 1/2/2026 », « 01/02/2026 », « 12.11.2026 », « 12-11-2026 » ou « 2026-11-12 » donne la valeur ISO attendue ; « 12/11/26 » et « demain » laissent champ et valeur inchangés et affichent « Date non reconnue. Exemple : 12/11/2026 » jusqu'à la frappe suivante.
- [ ] CA-9 : avec la locale `en-US`, les zones sont dans l'ordre mois, jour, année, et « 11/12/2026 » collé vaut `2026-11-12`.
- [ ] CA-10 : une valeur posée par le code (`value.set('2026-03-05')`) affiche `05/03/2026` ; une date hors `min` / `max` tapée est transmise telle quelle.
- [ ] CA-11 : `disabled` et `readonly` : aucun bouton calendrier, aucun panneau, zones non modifiables (date simple et période).
- [ ] CA-12 : le bouton se nomme « Choisir une date » sans valeur et « Changer la date, 12 novembre 2026 » avec ; il porte `aria-haspopup="dialog"` et `aria-expanded` ; Alt + flèche bas dans le champ ouvre le panneau.

Panneau, date simple :
- [ ] CA-13 : choisir un jour met la valeur à jour, affiche la date, ferme le panneau et rend le focus au bouton.
- [ ] CA-14 : le panneau s'ouvre sur le mois de la valeur ; sans valeur, sur le mois d'aujourd'hui ramené dans les bornes ; le premier focus est le jour choisi, sinon aujourd'hui, sinon le jour autorisé le plus proche.
- [ ] CA-15 : niveaux : le titre des jours ouvre douze mois (titre « 2026 »), le titre des mois ouvre douze années (titre « 2020 à 2029 », non cliquable, flèches nommées « Années précédentes » et « Années suivantes ») ; choisir une année revient aux mois, choisir un mois revient aux jours ; aucun de ces choix ne change la valeur.
- [ ] CA-16 : les jours hors `min` / `max` portent `aria-disabled="true"`, reçoivent le focus clavier, et ni le clic ni Entrée ne les choisit ; les mois et années entièrement hors bornes de même ; les boutons précédent et suivant sont désactivés quand la page voisine est entièrement hors bornes.
- [ ] CA-17 : clavier au niveau des jours, un cas par touche : flèches (±1 jour, ±7 jours), Début et Fin (lundi, dimanche), Page précédente et suivante (±1 mois, jour gardé ou ramené au dernier du mois), Maj + Page (±12 mois), Entrée et Espace (choisir) ; aux niveaux mois et années : flèches ±1 et ±4, Page d'un pas, Entrée.
- [ ] CA-18 : Échap et le clic hors du panneau ferment sans changer la valeur et rendent le focus au bouton, quel que soit le niveau.
- [ ] CA-19 : rôles et attributs : `role="dialog"` avec `aria-modal="true"` et un nom non vide ; `role="grid"` nommé par le titre ; `gridcell` avec `aria-selected="true"` sur le jour choisi ; `columnheader` ; `aria-current="date"` et l'info-bulle « Aujourd'hui » sur le jour d'aujourd'hui ; le titre porte `aria-live="polite"`.
- [ ] CA-20 : Tab depuis le dernier élément du panneau revient au premier ; la grille est une seule étape de tabulation.
- [ ] CA-21 : « Aujourd'hui » (horloge figée) choisit la date du jour et ferme ; il est désactivé si aujourd'hui est hors bornes ; « Effacer » met `null` et ferme ; il n'existe pas quand le champ est obligatoire.
- [ ] CA-22 : dans un `lc-dialog`, Échap ferme le panneau seul : le dialogue reste ouvert et le focus revient au bouton calendrier.
- [ ] CA-23 : `min` postérieur à `max`, puis `value` non ISO : aucune exception, un avertissement console en développement, champ vide dans le second cas.

Thème et rendu :
- [ ] CA-24 : dans `styles/ui-angular.css`, les règles du calendrier n'emploient aucun `--lc-ref-*`, aucun littéral de couleur (`#`, `rgb(`, `hsl(`), aucune longueur ni durée littérale hors `var(...)` et `calc(...)` sur des variables (test par lecture du fichier).
- [ ] CA-25 (navigateur) : panneau ouvert, passer `data-theme` de clair à sombre sur `html` change le fond calculé du panneau et celui du jour choisi.
- [ ] CA-26 (navigateur) : jour choisi, aujourd'hui et focus clavier ont chacun leur marque propre : fond plein en disque, point présent, contour ; le titre a un fond ou un contour au repos ; une cellule de jour mesure au moins 40 px de côté.
- [ ] CA-27 : `npx lc-tokens check` passe sur les thèmes du kit avec les paires de contraste du brief ajoutées.

Période :
- [ ] CA-28 : `lc-date-range-input` fonctionne avec `[formField]` ; il fonctionne avec `[(value)]` ; sa valeur est un `LcDateInterval`.
- [ ] CA-29 : deux clics dans le panneau donnent `{ from, to }` dans l'ordre ; un second jour antérieur au premier inverse les deux ; le panneau se ferme au second clic ; un clic alors qu'une période complète existe commence un nouveau début.
- [ ] CA-30 : après le premier clic, la ligne d'état affiche « Choisissez la date de fin. », les jours survolés ou parcourus aux flèches portent la marque d'aperçu et le bouton « Sans date de fin » apparaît ; ce bouton donne `{ from, to: null }` et ferme ; Échap à ce moment ferme et laisse la valeur d'avant.
- [ ] CA-31 : une seule borne est une valeur valide, dans les deux sens (`{ from: '2026-11-01', to: null }` et `{ from: null, to: '2026-11-30' }`), sans état invalide.
- [ ] CA-32 : taper une fin antérieure au début : la borne tapée vaut `null`, état invalide, message « La date de fin est avant la date de début. » ; une borne incomplète à la sortie vaut `null` avec « Date incomplète… ».
- [ ] CA-33 : avec la date du jour figée au 19 novembre 2026 : « 7 derniers jours » = 13 au 19 novembre ; « 30 derniers jours » = 21 octobre au 19 novembre ; « Ce mois-ci » = 1er au 30 novembre ; « Le mois dernier » = 1er au 31 octobre. Au 1er mars 2026, « Le mois dernier » = 1er au 28 février ; au 1er janvier 2026, 1er au 31 décembre 2025. Cliquer un raccourci remplit les deux champs et ferme le panneau ; chaque raccourci expose ses dates en description (« du 13 au 19 novembre 2026 »). Avec `max` = aujourd'hui, « Ce mois-ci » s'arrête à aujourd'hui ; un raccourci entièrement hors bornes est désactivé ; `presets = []` n'affiche aucun raccourci.
- [ ] CA-34 : le panneau contient deux mois quand la fenêtre fait 640 px de large ou plus, un seul à 639 px (faux `matchMedia` sous jsdom) ; (navigateur) à 360 px de large, pas de défilement horizontal.
- [ ] CA-35 : un clic sur un titre du panneau à deux mois affiche une seule grille de douze mois ; choisir un mois revient à deux mois, le mois choisi à gauche, sans changer la valeur.
- [ ] CA-36 : mode natif : deux `input[type=date]` ; `max` du premier = fin choisie, `min` du second = début choisi, aucun de ces attributs sans valeur ; les raccourcis sont une rangée de boutons sous les champs.
- [ ] CA-37 : `focus()` donne le focus au champ de début ; le groupe porte `role="group"` et un nom (« Période » ou `ariaLabel`).

Transverse :
- [ ] CA-38 : chaque clé ajoutée à `LC_LABELS` existe en français et en anglais ; avec les libellés anglais, le panneau affiche « Today », « Clear » et « Choose a date » ; avec `LC_LOCALE` en anglais, les noms des mois et des jours sont anglais.
- [ ] CA-39 : `calendar-panel`, `date-math` et `date-mask` ne sont pas exportés par `forms/src/public-api.ts` ; aucun fichier de `forms/src/date-input/` n'importe un autre point d'entrée secondaire.
- [ ] CA-40 : `packages/angular/CATALOGUE.md` régénéré décrit `lc-date-range-input`, `LcDateInterval`, `LcDateIntervalPreset` et `LC_DATE_PICKER` ; `npm run build`, `npx ng test ui-angular --watch=false` et `npm run catalogue:check` passent.

Vérifications manuelles (hors tests automatiques) :
- [ ] V-1 : lecteur d'écran sur le champ à zones : la personne entend le libellé du champ, la zone active et sa valeur, et parvient à saisir une date.
- [ ] V-2 : test `novice-user` sur captures de l'écran réel : la personne choisit une date, une date lointaine, puis une période avec et sans fin, sans mot incompris ni hésitation bloquante.
- [ ] V-3 : les tests de bout en bout de copro-ticket et de finance-credit passent avec le kit mis à jour.

## 11. Découpage en tâches

| Tâche | Contenu | Taille | Couvre |
|---|---|---|---|
| T0 | `qa-engineer` : tests de caractérisation du mode natif actuel ; vérifier que le projet de tests en navigateur tourne | S | CA-3 |
| T1 | `date-math.ts`, `date-picker-mode.ts` et jeton `LC_DATE_PICKER`, export explicite de `toIsoDate` | S | CA-2, CA-3 |
| T2 | `date-mask.ts` et champ à zones dans `lc-date-input`, sans panneau : frappe, flèches, date qui n'existe pas, collage, erreurs par `transformedValue`, annonces, mode natif gardé. Le plus risqué : à prototyper en premier | L | CA-1, CA-4 à CA-11 |
| — | V-1 : test au lecteur d'écran, par une personne ; en cas d'échec, repli sur trois `spinbutton` (décision à reprendre avec l'utilisateur) | | V-1 |
| T3 | `calendar-panel`, niveau jours : API à niveau, nombre de mois et sélection `{ from, to }` dès le départ ; clavier, ARIA, styles, `calendar.tokens.json`, paires de contraste, libellés | M | CA-16 (jours), CA-17 (jours), CA-19, CA-20, CA-24, CA-27, CA-38 |
| T4 | Niveaux mois et années : grille générique, titres, bornes, clavier | M | CA-15, CA-16, CA-17 |
| T5 | Branchement dans `lc-date-input` : bouton, surcouche, focus, « Aujourd'hui », « Effacer », cas du dialogue, stories et tests en navigateur | M | CA-12 à CA-14, CA-18, CA-21 à CA-23, CA-25, CA-26 |
| T6 | Période dans le panneau : deux mois, aperçu, ligne d'état, « Sans date de fin », raccourcis, règle des titres | M | CA-29, CA-30, CA-33 à CA-35 |
| T7 | `lc-date-range-input` : deux champs à zones, modes, erreurs, stories, catalogue | M | CA-28, CA-31, CA-32, CA-36, CA-37, CA-39, CA-40 |
| T8 | Vérification finale : `novice-user` sur captures, tests de bout en bout des consommateurs, catalogue de spec (n° 9), `CLAUDE.md` | S | V-2, V-3 |

Ordre : T0, T1, puis T2 et T3 (indépendantes), T4 après T3, T5 après T2 et T4, T6 puis T7, T8. La date simple (T0 à T5) est livrable avant la période. Version : mineure (ajouts ; le rendu de `lc-date-input` change sur ordinateur, son contrat de code non).

## 12. Risques et questions ouvertes

- **Choix par défaut, à défaire si besoin** :
  1. Ordinateur à écran tactile avec souris ou pavé tactile : calendrier du kit. Le sélecteur du système ne sert que sur les appareils sans pointeur fin (téléphone, tablette).
  2. « Ce mois-ci » va jusqu'à la fin du mois ; un écran d'historique pose `max` à aujourd'hui pour l'arrêter là.
  3. Utilisateur principal (section 4).
  4. Une date incomplète ou qui n'existe pas vaut « pas de date » (`null`) avec un message, sans correction automatique.
- **Risques** :
  - **Lecteur d'écran sur le champ à zones** : un `input` masqué est annoncé comme un champ de texte, et la lecture de la zone sélectionnée varie d'un lecteur à l'autre. Les agents ne peuvent pas faire ce test : il demande une personne avec NVDA ou VoiceOver (V-1). Repli prévu : trois `spinbutton`, au prix d'un changement du contrat de `lc-form-field`.
  - Sélection de zone par `setSelectionRange` : fragile avec le remplissage automatique et les claviers virtuels ; limité par le fait que le mode calendrier ne s'active que sur pointeur fin.
  - Le rendu de `lc-date-input` change sur ordinateur dès la mise à jour du kit. Un test de bout en bout qui remplit le champ par sa valeur ISO continue de marcher ; un test qui relirait la valeur affichée du champ (`toHaveValue('2026-11-12')`) casserait. Aucun n'a été trouvé dans copro-ticket ; V-3 le vérifie pour les deux consommateurs.
  - Piège de focus du panneau dans un dialogue du kit : pas de précédent (`lc-combobox` n'en a pas) ; couvert par CA-22, à prototyper tôt en T5.
  - `transformedValue` est récent (Angular 22) et n'est pas encore employé dans le kit : T2 commence par le vérifier.
- **Dettes** : le filtre de dates de `lc-data-table` garde le calendrier natif et son propre type `LcDateRange` ; pas de test visuel par comparaison d'images dans le kit.
- **Questions ouvertes** : qui fait le test au lecteur d'écran (V-1) ? À défaut, le risque est accepté et noté.

## 13. Relectures et écarts

| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| 2026-11-19 | `cadreur` | cadrage et spec | À CORRIGER | Retenu : lecture de « deploe » dite dans la fiche ; objectifs O2 et O5 qui portent la saisie, les raccourcis et les boutons (choisis par l'utilisateur avec B et C) ; `startLabel` / `endLabel` retirés ; entrée `picker` retirée ; règle unique pour une borne inutilisable ; clavier, ARIA et repères étendus à la période ; O4 reformulé « contrat de code » ; cas en locale anglaise ; rattachement des critères aux tâches. Écarté : retirer les consommateurs de l'en-tête (ils sont relevés dans le code, pas supposés). |
| 2026-11-19 | `architect` | conception | À REVOIR, trois bloquants | Retenu : `LcDateInterval` avec `from` / `to` (le nom `LcDateRange` existe déjà dans `data`) ; erreurs de saisie par `transformedValue`, jamais par le signal `errors` ; tests de caractérisation avant tout changement (T0) ; jeton `LC_DATE_PICKER` à la place d'une entrée ; `matchMedia` par `document.defaultView` ; `toIsoDate` inchangée ; un seul `input` masqué pour les zones ; un seul `calendar-panel` à niveaux ; pas de correction silencieuse d'une date tapée ou collée ; critère du dialogue ; nouveau découpage ; ADR 0008. Écarté : garder la dernière date valide sur saisie incomplète (le champ natif actuel rend déjà une valeur vide ; section 8) ; niveaux absents du panneau de période (le designer a réglé l'affichage par une grille unique). |
| 2026-11-19 | `qa-engineer` | plan de test | À CORRIGER (mineur) | Retenu : critères découpés et chiffrés ; critères de rendu déplacés vers le navigateur réel (projet Vitest « storybook ») ; CA-24 par lecture de la feuille ; raccourcis définis au jour près ; borne de fin seule ; cas de la section 6 dotés de critères ; `novice-user`, lecteur d'écran et commandes sortis des tests automatiques (V-1 à V-3). |
| 2026-11-19 | `ui-ux-designer` | brief (B et C) | FAIT | Retenu : un `input` masqué (D1) ; niveaux et zones dans la période (D2) ; trois repères par la forme ; `aria-modal`, `gridcell`, tabulation unique, jours hors bornes atteignables ; seuils de 640 et 840 px ; tokens `--lc-calendar-*` ; textes français et anglais. Écarté après le test du novice : ramener une date tapée au dernier jour du mois. |
| 2026-11-19 | `novice-user` | textes du brief | COMPRIS AVEC DIFFICULTÉ | Retenu : une date qui n'existe pas n'est plus corrigée mais signalée ; le point « aujourd'hui » a sa légende (même point sur le bouton « Aujourd'hui », info-bulle) ; le titre a l'apparence d'un bouton ; « 2020 à 2029 » et « Années suivantes » à la place de « 2020 – 2029 » et « Décennie » ; un raccourci remplit les champs, ferme et décrit ses dates ; « Sans date de fin » et champ vide sans erreur pour une période ouverte. |

**Écarts constatés à l'implémentation** : (à remplir)
