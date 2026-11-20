# Spec : sélection dans `lc-table`, info-bulle cliquable, texte tronqué qui défile (K1 à K3)

- **Statut** : En revue (demandé par l'utilisateur le 2026-11-20, pendant la conception de l'écran « Ouverture des copropriétés » de `copro-ticket`)
- **Date** : 2026-11-20
- **Source** : maquettes `copro-ticket/docs/design/explorations/2026-11-import-progressif/` (direction B : `b-deux-colonnes.html`, `b-detail.html`, `b-detail-copro.html`) ; spec `copro-ticket/docs/specs/2026-11-import-progressif.md`, section 5.4
- **Liés** : `2026-11-catalogue-composants.md`, `2026-11-composants-suivi-de-demandes.md` (D4 tri de colonne, D5 info-bulle), `DESIGN.md`

Tout est **générique** : aucun vocabulaire métier dans les API, les libellés, les tokens ni les stories. Le consommateur identifié de chaque élément est copro-ticket (écran de la responsable qui choisit les copropriétés et les personnes à ouvrir).

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** (2026-11-20, sur les maquettes de copro-ticket) :
  - « Ca pourrai etre plutot sous forme d'info bule ( ui kit nouvelle feature?) au lieux dnavoir une popup pour le detail » ; puis « Ben si on clique dessus si il faut afficher l'infovul'e ».
  - « On peut etre plus intelligent, l'inforbule est l'icone ( modification , conservation etc...) comme ca on a pas deux pastilles mais 1 seule. [...] au lieux d'avoir un bouton cocher tout ou non , il faudrait la case a cocher dans le header la liste ( evoluer ui lit avec un bookean show checkbox) afin que ce soit natif ».
  - « Il faudrait faire evoluer label afin d'eviter wrapp le text si c'est trop long et d'animer pour faire deffiler le nom uniquement au survol, feature de ui kit je pense ».
- **Besoin en trois phrases** : un tableau du kit doit pouvoir porter une colonne de cases avec une case d'en-tête native (tout, rien, partiel). Une pastille doit pouvoir ouvrir au clic une petite bulle qui porte une information indispensable, ce que `lcTooltip` interdit. Un texte d'une ligne trop long doit se couper sans passer à la ligne et défiler au survol pour se lire en entier.
- **Décisions prises pendant le cadrage** : 2026-11-20, l'utilisateur : la bulle s'ouvre au clic (« si on clique dessus ») ; la case d'en-tête vit dans le tableau, activée par une entrée booléenne ; le défilement se fait « uniquement au survol ».
- **Taille** : Fonctionnalité (trois éléments, un point d'entrée chacun).
- **Angles ouverts** :
  - [x] Architecture : contrat public du kit (nouvelles entrées de `lc-table`, deux nouveaux éléments).
  - [x] Écran : comportement et rendu de trois éléments.
  - [ ] Sécurité et données : fermé, aucun contenu injecté en HTML, aucune donnée stockée.

## 1. Contexte et problème
L'écran de copro-ticket compare l'annuaire de l'application à sa source et laisse la responsable cocher les personnes à ouvrir. Il lui faut :
- une case par ligne et une case d'en-tête dans `lc-table`, qui n'a pas de sélection aujourd'hui ;
- une bulle ouverte au clic sur la pastille d'un changement (« Nom : Hélène Roux → Hélène Roux-Martin »). `lcTooltip` ne prend qu'une chaîne, s'ouvre au survol ou au focus et, par sa documentation, ne porte jamais d'information indispensable (inaccessible au toucher) ;
- des lignes de liste à hauteur constante, donc des noms sur une ligne, coupés s'ils sont trop longs, lisibles en entier au survol.
La règle de copro-ticket interdit d'écrire ces éléments génériques chez lui.

## 2. Objectifs
| Id | Élément | Point d'entrée | Besoin |
|---|---|---|---|
| K1 | Sélection dans `lc-table` | `data` | Entrée booléenne `selectable` : première colonne de cases `lcCheckbox` ; `selection` en `model()` (clés `trackBy` des lignes cochées, sur tout le jeu de données) ; `isRowSelectable` (prédicat) : case désactivée et ignorée par l'en-tête ; case d'en-tête : coche ou décoche toutes les lignes cochables du jeu, état partiel (`indeterminate`, `aria-checked="mixed"`) |
| K2 | Info-bulle cliquable `lc-toggletip` | `overlay` | Bulle ancrée à un bouton natif, ouverte au clic, au toucher, à Entrée ou Espace ; fermée par Échap (le focus reste sur le bouton), un clic ailleurs, un second clic ou la perte du focus ; une seule ouverte à la fois ; contenu riche projeté ; flèche ; repli de position si la place manque ; peut porter une information indispensable |
| K3 | Texte tronqué qui défile `[lcTruncate]` | principal | Sur un élément de texte : une ligne, points de suspension s'il déborde ; au survol, le texte défile jusqu'à la fin puis revient ; rien ne bouge s'il ne déborde pas ; texte entier exposé aux technologies d'assistance |

## 3. Hors périmètre (non-objectifs)
- Sélection par plage (Maj+clic), sélection dans `lc-data-table` et `lc-tree-table` : sans consommateur.
- Remplacement de `lcTooltip` : il reste pour les libellés courts d'icônes.
- Troncature sur plusieurs lignes.
- Tout libellé propre à copro-ticket.

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : le développeur d'un projet consommateur.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Développeur | Laisser cocher des lignes d'un tableau | `selectable` et `[(selection)]`, sans écrire de case ni de logique d'en-tête |
| Développeur | Expliquer un changement au clic sur une pastille | Un bouton natif et `lc-toggletip` autour du contenu |
| Développeur | Garder des lignes de liste à hauteur constante | `lcTruncate` sur le nom |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
Conventions du kit (`CLAUDE.md`) : signaux, OnPush, `host: {}`, tokens `--lc-<composant>-*` avec repli sur `--lc-sys-*`, libellés par `LC_LABELS` (français et anglais), comportement par le CDK seulement, styles `.css`, aucune fonctionnalité CSS hors Baseline 2024. K1 complète `lc-table` sans changer son contrat actuel (ajout seulement : version mineure). K2 est dans `overlay`, à côté de `lcTooltip`, et réutilise son positionnement (CDK Overlay, repli de D5). K3 est une directive du point d'entrée principal, sans dépendance.

### 5.2 Modèle de données
N/A.

### 5.3 API / interfaces
**K1, `lc-table`** (ajouts) :
- `selectable = input(false, { transform: booleanAttribute })`.
- `selection = model<ReadonlySet<unknown>>(new Set())` : clés rendues par `trackBy`.
- `isRowSelectable = input<(row: T) => boolean>(() => true)`.
- `selectionLabel = input<string>()` : nom accessible de la case d'en-tête (par défaut `LC_LABELS`, « Tout sélectionner ») ; `rowSelectionLabel = input<(row: T) => string>()` : nom accessible de chaque case (par défaut « Sélectionner la ligne »).
- `selectAllHint = input<string>()` : texte d'aide affiché sous le tableau et relié à la case d'en-tête par `aria-describedby`.
- La case d'en-tête agit sur toutes les lignes cochables de `data` (pas seulement celles d'un groupe replié ni d'une page). Lignes non cochables : case désactivée, jamais modifiées par l'en-tête, leur clé n'entre ni ne sort de `selection` par l'en-tête.
- Une région `aria-live="polite"` annonce le compte après chaque changement (« 45 sélectionnées sur 46 », par `LC_LABELS`).
- Clavier : Tab atteint chaque case ; Espace la bascule. Aucun raccourci de plage.

**K2, `lc-toggletip`** :
- Utilisation : `<button type="button" [lcToggletip]="detail">…</button>` et `<lc-toggletip #detail>…contenu…</lc-toggletip>`. Le déclencheur est un `button` natif stylé librement par le consommateur (par exemple en pastille).
- Entrées de la directive : `lcToggletip` (requis, le composant), `lcToggletipPosition` (`'below' | 'above' | 'start' | 'end'`, défaut `'below'`), `lcToggletipOpen = model(false)`.
- Le bouton porte `aria-expanded` et `aria-controls`. La bulle n'est pas un dialogue : pas de piège à focus ; un contenu interactif est atteint par Tab depuis le bouton. Le contenu est annoncé à l'ouverture (région `role="status"` gardée dans le DOM, contenu inséré à l'ouverture).
- Largeur au plus `min(20rem, calc(100vw - 2 * marge))` ; hauteur au plus la fenêtre, avec défilement interne.
- Ouvrir une bulle ferme celle qui était ouverte. Fermeture aussi au défilement de la page et au redimensionnement.

**K3, `[lcTruncate]`** :
- Sur un élément de texte (`<span lcTruncate>`, `<a lcTruncate>`…) : `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`.
- Au survol (`mouseenter`), si le texte déborde (`scrollWidth > clientWidth`), il défile horizontalement jusqu'à sa fin à vitesse constante (token de durée par caractère débordant), marque une pause, puis revient ; il revient au début à la sortie (`mouseleave`). Rien ne bouge s'il ne déborde pas.
- `prefers-reduced-motion: reduce` : pas de défilement ; le texte entier est donné par l'attribut `title`, posé seulement s'il déborde.
- Le texte entier reste dans le DOM : un lecteur d'écran le lit en entier, sans changement.
- Mesure refaite au redimensionnement (`ResizeObserver`), sans boucle de rendu.

### 5.4 Interface utilisateur
Référence visuelle : maquettes de copro-ticket citées en source. Rendu selon `DESIGN.md` du kit : tokens seulement, deux thèmes, focus visible, cibles de 44 px (la case dans sa cellule, le bouton déclencheur). Bulle : `surface-raised`, bordure, rayon et ombre du kit, flèche vers le déclencheur. Chaque élément a sa story (états, deux thèmes, 360 px), dont : tableau avec lignes non cochables et case d'en-tête partielle ; bulle près d'un bord ; nom tronqué au survol et en mouvement réduit.

## 6. Cas limites et gestion des erreurs
- K1 : `data` vide : case d'en-tête désactivée ; aucune ligne cochable : idem ; `selection` contenant une clé absente de `data` : gardée telle quelle (le consommateur décide), la case d'en-tête ne la compte pas ; `trackBy` qui rend deux fois la même clé : avertissement console en développement.
- K2 : déclencheur qui n'est pas un `button` : avertissement en développement ; déclencheur retiré du DOM bulle ouverte : bulle fermée ; place manquante de tous les côtés : la bulle reste dans la fenêtre.
- K3 : texte changé pendant le défilement : défilement arrêté, mesure refaite ; élément sans largeur bornée : rien ne déborde, rien ne bouge.

## 7. Sécurité, performance, observabilité
- Sécurité : aucun `innerHTML` ; contenu de la bulle par projection.
- Performance : aucune dépendance ajoutée ; K3 n'anime qu'au survol, une seule animation CSS (`transform`) par élément.
- Observabilité : N/A (bibliothèque).

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Élargir `lcTooltip` au clic et au contenu riche | Un seul élément | Change son contrat et sa règle « jamais d'information indispensable » ; mélange deux usages | Non |
| Ligne dépliée sous la ligne du tableau | Aucun nouvel élément | Écartée par l'utilisateur (« info bulle ») | Non |
| Boutons « Tout cocher » et « Tout décocher » chez le consommateur | Aucun changement du kit | Écartés par l'utilisateur (« afin que ce soit natif ») | Non |
| Texte sur deux lignes au lieu de défiler | Pas d'animation | Hauteur variable, contraire à la demande | Non |

## 9. Plan de test
- Unitaires (Vitest, à côté de chaque élément) : K1 : en-tête tout, rien, partiel ; lignes non cochables ignorées ; `selection` en double liaison ; annonce du compte ; Espace. K2 : ouverture au clic, à Entrée, à Espace ; fermeture par Échap (focus sur le bouton), clic dehors, second clic, perte de focus ; une seule ouverte ; `aria-expanded`, `aria-controls`. K3 : pas de défilement sans débordement ; défilement et retour avec débordement ; mouvement réduit ; `title` posé seulement en cas de débordement.
- Stories : une par élément, avec ses états et les deux thèmes.
- Catalogue : `npm run catalogue:build` puis `catalogue:check`.

## 10. Critères d'acceptation
- [ ] CA-K1-1 : `selectable` affiche une première colonne de cases ; sans lui, le rendu de `lc-table` est identique à avant (tests existants inchangés et verts).
- [ ] CA-K1-2 : la case d'en-tête coche toutes les lignes cochables de `data`, les décoche toutes, et passe à l'état partiel (`indeterminate`, `aria-checked="mixed"`) quand une partie seulement est cochée ; les lignes refusées par `isRowSelectable` ont une case désactivée et ne changent jamais.
- [ ] CA-K1-3 : `selection` reflète les clés `trackBy` des lignes cochées, dans les deux sens (modifier `selection` coche les cases).
- [ ] CA-K1-4 : chaque case a un nom accessible ; le compte est annoncé par une région polie ; `selectAllHint` est relié par `aria-describedby`.
- [ ] CA-K2-1 : la bulle s'ouvre au clic, au toucher, à Entrée et à Espace sur le bouton, jamais au seul survol ; elle se ferme par Échap (focus resté sur le bouton), un clic ailleurs, un second clic et la perte du focus.
- [ ] CA-K2-2 : ouvrir une bulle ferme l'autre ; le bouton porte `aria-expanded` et `aria-controls` ; le contenu est annoncé à l'ouverture.
- [ ] CA-K2-3 : près d'un bord, la bulle prend une position de repli et reste entière dans la fenêtre, à 360 px compris.
- [ ] CA-K3-1 : un texte qui tient n'a ni points de suspension, ni `title`, ni défilement.
- [ ] CA-K3-2 : un texte qui déborde est coupé par des points de suspension sur une ligne ; au survol, il défile jusqu'à sa fin puis revient ; à la sortie, il revient au début.
- [ ] CA-K3-3 : avec `prefers-reduced-motion: reduce`, aucun défilement ; `title` donne le texte entier.
- [ ] CA-K-4 : libellés par `LC_LABELS` (français et anglais), tokens seulement, stories dans les deux thèmes, catalogue à jour.

## 11. Découpage en tâches
- [ ] K1 : sélection dans `lc-table`, tests, story (M).
- [ ] K2 : `lc-toggletip`, tests, story (M).
- [ ] K3 : `lcTruncate`, tests, story (S).
- [ ] K4 : catalogue, `CLAUDE.md` du kit si besoin, publication locale pour copro-ticket (`deps:refresh`) (S).

## 12. Risques et questions ouvertes
- **Choix par défaut à confirmer** :
  - Le nom d'entrée `selectable` plutôt que « showCheckbox » (convention des entrées booléennes du kit, comme `stickyHeader`) ; même rôle.
  - Le défilement de K3 se déclenche au survol seulement, comme demandé ; au clavier, le texte entier reste lu par le lecteur d'écran, et `title` n'est posé qu'en mouvement réduit.
- **Dettes** : pas de sélection par plage.
- **Questions ouvertes** : aucune.

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| | `architect` | conception | | |
| | `qa-engineer` | plan de test | | |

**Écarts constatés à l'implémentation** : aucun pour l'instant.
