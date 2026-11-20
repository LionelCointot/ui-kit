# Spec : sélection et teinte de ligne dans `lc-table`, info-bulle cliquable, texte tronqué qui défile (K1 à K4)

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
| K4 | Teinte de ligne dans `lc-table` | `data` | Une ligne peut prendre la teinte d'un rôle d'état (succès, information, erreur, avertissement) : fond `*-container` et liseré de la couleur du rôle, pour distinguer d'un coup d'œil les lignes qui changent (demandé par la maquette retenue : « vert : tout est nouveau, bleu : modification, rouge pour la suppression, orange pour dire conservation par contrainte ») |

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
Conventions du kit (`CLAUDE.md`) : signaux, OnPush, `host: {}`, tokens `--lc-<composant>-*` avec repli sur `--lc-sys-*`, libellés par `LC_LABELS` (français et anglais), comportement par le CDK seulement, styles `.css`, aucune fonctionnalité CSS hors Baseline 2024. K1 et K4 complètent `lc-table` sans changer son contrat actuel (ajouts seulement : version mineure). La case de K1 est un `<input type="checkbox" class="lc-checkbox">` natif, stylé par la feuille globale : `data` n'importe pas `forms` (aucune nouvelle exception d'import). K2 est dans `overlay`, à côté de `lcTooltip` ; les positions et l'ordre de repli de `lcTooltip` passent dans un fichier interne partagé (`overlay/src/tooltip/tooltip-positions.ts`, hors `public-api`), sans changer le comportement de `lcTooltip`. K3 est une directive du point d'entrée principal, sans dépendance.

### 5.2 Modèle de données
N/A.

### 5.3 API / interfaces
**K1, sélection dans `lc-table`** (ajouts) :
- `selectable = input(false, { transform: booleanAttribute })` : première colonne de cases natives `.lc-checkbox`, en-tête compris ; lignes de groupe, pied et ligne vide reçoivent une cellule de plus (`colspan` ajusté).
- `selection = model<ReadonlySet<unknown>>(new Set())` : clés rendues par `trackBy` ; chaque changement émet un nouveau `Set` (jamais muté).
- `isRowSelectable = input<(row: T) => boolean>(() => true)` : case désactivée sinon.
- `rowSelectionLabel = input<(row: T) => string>()` : nom accessible de chaque case (par défaut `LC_LABELS`, « Sélectionner la ligne ») ; `selectionLabel = input<string>()` : nom de la case d'en-tête (par défaut « Tout sélectionner »).
- `selectAllHint = input<string>()` : texte d'aide affiché sous le tableau, relié à la case d'en-tête par `aria-describedby` (le consommateur ne peut pas relier lui-même une case interne au tableau ; consommateur : copro-ticket, « La case en haut du tableau agit sur toute la copropriété »).
- Case d'en-tête : calculée sur `data()` entier (groupes repliés compris, ordre de tri indifférent), sur les seules lignes cochables ; cochée si toutes le sont, vide si aucune, partielle sinon (propriété DOM `indeterminate`, qui expose « mixte » ; pas d'`aria-checked`). Un clic coche toutes les lignes cochables si elle n'était pas cochée, les décoche toutes sinon. Désactivée si aucune ligne n'est cochable.
- Les clés absentes de `data` ou de lignes devenues non cochables restent dans `selection` (le consommateur décide) ; elles ne comptent ni pour la case d'en-tête ni pour l'annonce ; une ligne non cochable déjà sélectionnée s'affiche cochée et désactivée.
- Annonce : une région `aria-live="polite"` donne « {n} sélectionnées sur {m} » (lignes cochables de `data`, par `LC_LABELS`) après chaque changement fait dans le tableau ; rien au premier rendu ni quand le consommateur change `selection`.
- Clavier : Tab atteint chaque case ; Espace la bascule (comportement natif).

**K2, `lc-toggletip`** :
- Utilisation : `<button type="button" [lcToggletip]="detail">…</button>` et `<lc-toggletip #detail>…contenu…</lc-toggletip>`. Le déclencheur est un `button` natif stylé librement par le consommateur (par exemple en pastille).
- Entrées : `lcToggletip` (requis, le composant), `lcToggletipPosition` (`'below' | 'above' | 'start' | 'end'`, défaut `'below'` : la bulle explique ce qui est sous les yeux, au-dessous du déclencheur, sans masquer la ligne précédente d'un tableau ; `lcTooltip` garde `above`).
- Ouverture par l'événement `click` du bouton (souris, toucher, Entrée et Espace natifs) ; aucun écouteur de survol. Fermeture : second clic, Échap (focus rendu au bouton), clic hors du bouton et de la bulle, focus qui sort du bouton **et** de la bulle. Ouvrir une bulle ferme donc l'autre, sans état global.
- Le bouton porte `aria-expanded` et `aria-controls` ; une région `role="status"`, présente et vide bulle fermée, reçoit le contenu à l'ouverture. Pas de piège à focus ; un contenu interactif est atteint par Tab depuis le bouton.
- Largeur au plus `min(20rem, calc(100vw - 2 * marge))` ; hauteur au plus la fenêtre, défilement interne (qui ne ferme pas la bulle). Défilement de la page ou d'un parent : la bulle suit son bouton (stratégie `reposition` du CDK) ; bouton retiré du DOM : bulle fermée.

**K3, `[lcTruncate]`** :
- Sur un élément de texte (`<span lcTruncate>`, `<a lcTruncate>`…) : l'hôte passe en `display: block`, `min-width: 0`, `white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`.
- Au survol (`mouseenter`), la directive mesure le débordement (`scrollWidth - clientWidth`) ; s'il est positif et que `matchMedia('(prefers-reduced-motion: reduce)')` est faux (relu à chaque survol), elle pose `--lc-truncate-overflow` (px) et une classe qui anime `text-indent` de 0 à `calc(-1 * var(--lc-truncate-overflow))` (`@keyframes`, `text-overflow: clip` pendant le défilement), à la vitesse `--lc-truncate-speed` (px par seconde, repli sur une valeur de `sys`), avec une pause en fin puis retour. `mouseleave` retire la classe : le texte revient au début.
- Mouvement réduit : aucun défilement ; `title` = texte entier, posé seulement s'il déborde (un `title` permanent doublerait l'annonce du lecteur d'écran).
- Le texte entier reste dans le DOM. Mesure refaite au redimensionnement (`ResizeObserver`) et au changement du texte.

**K4, teinte de ligne dans `lc-table`** (ajout) :
- `rowTone = input<(row: T) => 'success' | 'info' | 'error' | 'warning' | null>()` : la ligne prend le fond `--lc-sys-color-<rôle>-container`, le texte `on-<rôle>-container` et un liseré de début de ligne `--lc-sys-color-<rôle>` (tokens `--lc-table-row-*` avec repli sur `sys`). Couleur jamais seule porteuse de sens : le consommateur garde un libellé dans la ligne.

### 5.4 Interface utilisateur
Référence visuelle : maquettes de copro-ticket citées en source. Rendu selon `DESIGN.md` du kit : tokens seulement, deux thèmes, focus visible, cibles de 44 px (la case dans sa cellule, le bouton déclencheur). Bulle : `surface-raised`, bordure, rayon et ombre du kit, flèche vers le déclencheur. Chaque élément a sa story (états, deux thèmes, 360 px), dont : tableau avec lignes non cochables, case d'en-tête partielle et lignes teintées ; bulle près d'un bord ; nom tronqué au survol.

## 6. Cas limites et gestion des erreurs
- K1 : `data` vide ou sans ligne cochable : case d'en-tête désactivée ; tri client ou externe : la sélection suit les clés, pas les positions ; groupes repliés : comptés par l'en-tête ; `trackBy` qui rend deux fois la même clé : avertissement console en développement.
- K2 : déclencheur qui n'est pas un `button` : avertissement en développement ; déclencheur retiré (ligne triée ou supprimée) : bulle fermée ; place manquante de tous les côtés : la bulle est poussée dans la fenêtre.
- K3 : texte changé pendant le défilement : défilement arrêté, mesure refaite ; parent sans largeur bornée : rien ne déborde, rien ne bouge ; texte de droite à gauche : défilement dans le sens de lecture (`text-indent` est relatif au sens).
- K4 : rôle inconnu : aucune teinte, avertissement en développement.

## 7. Sécurité, performance, observabilité
- Sécurité : aucun `innerHTML` ; contenu de la bulle par projection.
- Performance : aucune dépendance ajoutée ; K3 n'anime qu'au survol, une seule animation CSS par élément.
- Observabilité : N/A (bibliothèque).

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Élargir `lcTooltip` au clic et au contenu riche | Un seul élément | Change son contrat et sa règle « jamais d'information indispensable » ; mélange deux usages | Non |
| `lcCheckbox` dans `lc-table` | Même composant que les formulaires | `data` importerait `forms`, interdit ; inutile hors formulaire | Non : case native `.lc-checkbox` |
| Service racine pour « une seule bulle ouverte » | Explicite | État global ; les fermetures par clic ailleurs et perte de focus suffisent | Non |
| `transform` pour faire défiler le texte | Accéléré | Déplacerait l'élément entier, pas son texte, sans enveloppe ajoutée | Non : `text-indent` |
| Ligne dépliée sous la ligne du tableau | Aucun nouvel élément | Écartée par l'utilisateur (« info bulle ») | Non |
| Boutons « Tout cocher » et « Tout décocher » chez le consommateur | Aucun changement du kit | Écartés par l'utilisateur (« afin que ce soit natif ») | Non |
| `rowClass` libre | Souple | Styles du consommateur à percer dans le composant ; couleurs hors tokens | Non : `rowTone` |

## 9. Plan de test
Outillage : `npx ng test ui-angular` tourne sous jsdom (pas de mise en page, pas d'animation, pas de toucher). Faux à réutiliser : `FakeResizeObserver`, `scrollWidth` espionné, `matchMedia` surchargé (`tabs.component.spec.ts`), lecture de la stratégie de position du CDK (`tooltip-positions.spec.ts`). Événements clavier : tester le `click()` du bouton, jsdom ne transforme pas Entrée en clic.
- Unitaires (Vitest, à côté de chaque élément) : tout le comportement des critères marqués « unitaire ».
- Stories : une par élément ; `tools/qa/storybook-browser.mjs` (axe) en clair et en sombre.
- Manuel (consigné à la livraison) : lecteur d'écran (annonce du compte, contenu de la bulle), toucher réel, cible de 44 px à 360 px, défilement réel du texte et bulle au bord à 360 px.
- Catalogue : `npm run catalogue:build` puis `catalogue:check`.

## 10. Critères d'acceptation
- [ ] CA-K1-1 (unitaire) : sans `selectable`, ni colonne de cases ni région d'annonce dans le DOM, et les tests existants de `lc-table` passent sans changement ; avec `selectable`, une première colonne de cases, en-tête compris.
- [ ] CA-K1-2 (unitaire) : la case d'en-tête coche toutes les lignes cochables de `data` (groupes repliés compris), les décoche toutes, et a `indeterminate` vrai quand une partie seulement est cochée ; les lignes refusées par `isRowSelectable` ont une case désactivée et ne changent jamais ; elle est désactivée sans ligne cochable.
- [ ] CA-K1-3 (unitaire) : `selection` reflète les clés `trackBy` des lignes cochées, dans les deux sens (`selection.set` depuis le parent coche les cases ; un clic émet un nouveau `Set`) ; après un tri, les mêmes lignes restent cochées.
- [ ] CA-K1-4 (unitaire) : chaque case a un nom accessible ; après un clic, la région polie contient « {n} sélectionnées sur {m} » (français et anglais) ; rien n'est annoncé au premier rendu ni après `selection.set` du parent ; `selectAllHint` est affiché et relié par `aria-describedby`.
- [ ] CA-K1-5 (unitaire) : quand `data` perd des lignes cochées, le compte et l'état de l'en-tête sont recalculés sans elles ; leurs clés restent dans `selection`.
- [ ] CA-K2-1 (unitaire) : la bulle s'ouvre au `click` du bouton et jamais sur `mouseenter` seul ; elle se ferme au second clic, sur Échap (focus resté sur le bouton), au clic hors du bouton et de la bulle, et quand le focus sort des deux ; le focus qui passe du bouton à un lien de la bulle ne la ferme pas.
- [ ] CA-K2-2 (unitaire) : avec deux bulles, ouvrir la seconde ferme la première ; le bouton porte `aria-expanded` et `aria-controls` vers un identifiant existant ; la région `role="status"` est présente et vide bulle fermée, remplie à l'ouverture ; retirer le bouton du DOM ferme la bulle.
- [ ] CA-K2-3 (unitaire, puis manuel) : la stratégie de position a un repli dans les quatre directions et pousse la bulle dans la fenêtre ; à 360 px, la bulle d'une story placée au bord est entière (vérification manuelle).
- [ ] CA-K2-4 (unitaire) : `lcTooltip` garde exactement son comportement (`tooltip-positions.spec.ts` et ses tests existants passent sans changement).
- [ ] CA-K3-1 (unitaire) : sans débordement mesuré, ni `title`, ni classe de défilement au survol.
- [ ] CA-K3-2 (unitaire, puis story) : avec débordement, au survol la directive pose `--lc-truncate-overflow` égal au débordement et la classe de défilement, et les retire à la sortie ; dans la story, le texte se termine par « … » au repos et défile au survol.
- [ ] CA-K3-3 (unitaire) : avec `prefers-reduced-motion: reduce`, aucune classe de défilement ; `title` donne le texte entier, posé seulement s'il déborde ; le réglage est relu à chaque survol.
- [ ] CA-K4-1 (unitaire) : `rowTone` pose sur la ligne la classe du rôle rendu, aucune pour `null` ; story : fond et liseré par tokens, contraste du texte vérifié dans les deux thèmes.
- [ ] CA-K-5 : libellés par `LC_LABELS` en français et en anglais (unitaire) ; aucune couleur, taille ni durée en dur (revue) ; chaque story passe `storybook-browser.mjs` en clair et en sombre ; `catalogue:check` vert.

## 11. Découpage en tâches
- [ ] K1 : sélection dans `lc-table`, tests, story (M).
- [ ] K2 : positions partagées avec `lcTooltip`, `lc-toggletip`, tests, story (M).
- [ ] K3 : `lcTruncate`, token `--lc-truncate-speed`, tests, story (S).
- [ ] K4 : `rowTone` dans `lc-table`, tests, story (S).
- [ ] K5 : catalogue, publication locale pour copro-ticket (`deps:refresh`) (S).

## 12. Risques et questions ouvertes
- **Choix par défaut à confirmer** :
  - L'entrée s'appelle `selectable` plutôt que « showCheckbox » (convention des entrées booléennes du kit, comme `stickyHeader`) ; même rôle.
  - Le défilement de K3 se déclenche au survol seulement, comme demandé.
- **Dettes** : pas de sélection par plage ; pas de test automatique du rendu réel (bulle au bord, défilement), vérifié à la main.
- **Questions ouvertes** : aucune.

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| 2026-11-20 | `architect` | conception | Changements requis (3 de fond) | Retenu : case native `.lc-checkbox` (pas d'import `data` → `forms`) ; positions partagées avec `lcTooltip` ; pas de service pour « une seule bulle » ; défilement par `text-indent` et vitesse en px par seconde ; `rowSelectionLabel` gardé ; `lcToggletipOpen` retiré ; en-tête calculé sur `data`. Écarté : retirer `selectAllHint` (le consommateur ne peut pas relier une case interne au tableau) ; position par défaut alignée sur `above` (justifiée en 5.3) |
| 2026-11-20 | `qa-engineer` | plan de test | 7 critères à reformuler, 12 cas oubliés | Retenu : niveau de preuve par critère (unitaire, story, manuel), cas tri, groupes repliés, lignes retirées, ligne devenue non cochable, annonce seulement après un geste, défilement dans la bulle, focus vers un lien de la bulle, texte de droite à gauche |

**Écarts constatés à l'implémentation** : aucun pour l'instant.
