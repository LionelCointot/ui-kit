# Spec : ressenti iOS (feuille de filtres du téléphone, hauteurs et sorties animées)

- **Statut** : Brouillon (2026-11-21), en relecture
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-21
- **ADR liés** : [0009 Cible navigateurs](../adr/0009-cible-navigateurs-et-primitives-natives.md) (Baseline 2024, inchangée)
- **Specs liées** : [`2026-11-mouvement.md`](2026-11-mouvement.md) (décisions 17, 19, 20, 22 et Q5 révisées ici) · [`2026-11-tableau-filtrable.md`](2026-11-tableau-filtrable.md)
- **Consommateurs** : `lc-sheet` : `lc-data-table` (premier usage) puis les applications ; simulateur immobilier, copro-ticket (file des demandes, `lc-data-table` sur téléphone) et tout projet qui utilise `lc-disclosure`, `lc-drawer`, `lc-dialog`, `lc-nav-group`, `lc-tabs`, `lc-app-shell`, le calendrier

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « Il faut pour le filtrage des table en version mobile avec la fenetre de filtrage qui s'anime en venant du bas vers le haut, si tu vois ce que je ceux dire »
  - À « A. plein écran qui monte ; B. feuille façon iOS (coins arrondis, poignée, tableau assombri visible) » : « Oui B »
  - À « peut-on fermer la feuille en la tirant vers le bas ? A. non (poignée retirée) ; B. oui » : « b »
  - Sur les 10 recommandations de la feuille : « Oui tres bien , par contre quand on deplie les differents filtre, je trouve que ca fait encore abrupte tu peux faire un point sur tout les animatiosn afin d'avoir un ressentie ios et smooth »
  - Sur les 11 corrections de l'audit : « Fait tout les points »
  - Sur la maquette de comparaison (Q1 durée des dépliages 500 / 350 ms, Q2 fond qui s'éclaircit ou fixe, Q3 marge 32 / 40 px) : « A A et B »
  - « Il faut vien penser que c'est generique les compsant donc je sais si c'est deja le cas mais la fenetre qui apparaît du bas vers le haut est un composant particulier que le filtre du tableau reprend n'est ce pas? » ; à la proposition d'un composant générique `lc-sheet` repris par le filtre du tableau, et au contrôle statique permanent sur `:hover` (Q4) : « Oui c'est bon »
  - « Et egalement, je remarque par clic au touch, on a le rendu du hover qui s'applique j'ai l'impression et ca fait un rendu bizarre, est-ce qu'on peut avoir l'animation du hover h' uniquement lorsqu'in survol ( souris) je pense au nav bar ou menu qu'il y a ce probleme »
- **Besoin en trois phrases** : Sur téléphone, le panneau des filtres du tableau doit se comporter comme une feuille iOS : il monte du bas, se referme vers le bas, et se tire au doigt. Plus largement, tout ce qui change de taille dans le kit (sections, accordéons, pastilles, groupes de nav) saute aujourd'hui d'un coup, et plusieurs sorties sont sèches ; l'utilisateur veut un ressenti iOS doux et cohérent. On garde la courbe et les durées existantes, on les applique aux hauteurs et aux sorties.
- **Audit** (2026-11-21, `ui-ux-designer`, mesures Chromium) : entrées conformes ; hauteurs et sorties abruptes ; `cubic-bezier(0.2, 0, 0, 1)` équivaut au ressort iOS sans rebond, pas de nouvelle courbe ; seule incohérence de courbe : fond du dialogue et du tiroir (valeur CDK 400 ms).
- **Décisions prises pendant le cadrage** (2026-11-21 ; 2 à 10 : recommandations de la feuille acceptées en bloc par « Oui tres bien » ; 11 à 18 : corrections de l'audit acceptées en bloc par « Fait tout les points ») :
  1. **Feuille de filtres (téléphone)**, forme B : monte du bas et s'arrête sous le haut de l'écran (le tableau assombri reste visible), coins supérieurs arrondis, poignée, contenu qui défile à l'intérieur.
  2. Ouverture : montée en `duration-move` (500 ms), fond assombri en fondu.
  3. Fermeture (croix, Échap, « Afficher N … », geste) : descente en `duration-normal` (200 ms), fond en fondu.
  4. **Geste** : tirer la poignée ou l'en-tête vers le bas (jamais la liste des filtres) ; la feuille suit le doigt ; fermeture au-delà d'un quart de sa hauteur ou sur un geste rapide, sinon retour à sa place ; rien n'est appliqué (comme la croix).
  5. Pas de recul ni de réduction de la page derrière.
  6. Ordinateur inchangé (menu de filtre).
  7. Réduction des animations : apparition et disparition sans mouvement ; le geste suit toujours le doigt, sans animation de fin.
  8. Poignée purement visuelle pour les lecteurs d'écran ; croix et Échap restent ; focus inchangé.
  9. Tokens de composant : marge haute, arrondi, seuil de fermeture, avec repli sur `sys`.
  10. Story `Animation` du tableau à 360 px mise à jour ; contrôles navigateur avec geste simulé au pointeur.
  11. **Hauteurs animées** (audit 1, 2, 4, 8) : sections dépliables du panneau de filtres, `lc-disclosure`, groupes repliables de `lc-nav-group` ; ouverture et repli animés, les éléments du dessous glissent ; chevrons qui tournent au même rythme (`lc-nav-group` : un seul chevron qui tourne au lieu de deux icônes). Durée `duration-move` (500 ms, recommandation retenue faute de réponse contraire), `easing-standard`.
  12. **Retrait d'une pastille** (audit 3) : fondu puis resserrement de la rangée ; la liste glisse (un seul glissement, comme la différence de liste) au lieu de remonter d'un coup.
  13. **Tiroir `lc-drawer`** (audit 5) : entrée en glissant sur toute sa largeur (`duration-move`), sortie en glissant (`duration-normal`) via `lcDetachAnimated`.
  14. **Dialogues `lc-dialog`** (audit 6) : apparition en fondu et léger zoom (0,96 → 1, `duration-normal`), sortie en fondu (`duration-fast`) ; lève la décision 17 de `2026-11-mouvement.md`.
  15. **Fond assombri** du dialogue et du tiroir (audit 7) : `duration-normal` et `easing-standard` au lieu des valeurs CDK.
  16. **Contenu des onglets** (audit 9) : le panneau affiché apparaît en fondu (`duration-normal`) pendant que le trait glisse.
  17. **Calendrier** (audit 10) : fondu de la grille au changement de mois (`duration-normal`).
  18. **Nav latérale de `lc-app-shell`** (audit 11) : changement de largeur en `duration-long` (350 ms), tiroir mobile en `duration-move`.
  19. **Survol réservé aux appareils qui survolent** : tous les styles `:hover` du kit (49 règles dans 23 fichiers, dont nav latérale, menu, onglets, boutons, tableau ; seuls `lc-disclosure` et `choice-card` le font déjà) passent sous `@media (hover: hover)` ; au toucher, le retour visuel reste `:active` (appui) et `:focus-visible` ; un test statique interdit tout `:hover` hors de cette requête.
  20. **Composant générique `lc-sheet`** (point d'entrée `overlay`, à côté de `lc-dialog` et `lc-drawer`) : feuille déclarative `<lc-sheet [(open)] title>` (en-tête avec titre et croix, corps qui défile, pied optionnel par projection), sur `<dialog>` natif modal (ADR 0009 : primitive native admise pour un nouveau composant, avec test en navigateur réel) ; porte tout le comportement des décisions 1 à 10. Le panneau des filtres de `lc-data-table` sur téléphone l'utilise à la place de son `<dialog>` (import `data` → `overlay` déjà autorisé). `lc-drawer` n'est pas modifié pour cela.
  21. Réponses du 2026-11-21 : **Q1** dépliages en 500 ms (`duration-move`) ; **Q2** le fond s'éclaircit avec la distance du geste ; **Q3** marge haute de 40 px (`sys.space.10`) ; **Q4** contrôle statique permanent sur `:hover` gardé.
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : nouvelle technique partagée d'animation de hauteur (feuille globale), geste au pointeur dans `lc-data-table`, `lcDetachAnimated` étendu au tiroir et au dialogue.
  - [x] Écran : ce que l'utilisateur voit bouger sur dix composants.
  - [ ] Sécurité et données : fermé. Aucune donnée ; uniquement du CSS, des mesures et des événements de pointeur.

## 1. Contexte et problème
La spec du mouvement a livré entrées, indicateurs et différence de liste. L'audit montre que les changements de taille et plusieurs sorties ne sont pas animés : une section de filtre qui s'ouvre fait sauter les suivantes de plus de 100 px en une image, une pastille retirée fait remonter la liste de 44 px d'un coup, le tiroir et le dialogue disparaissent instantanément, et leur fond suit une courbe du CDK étrangère aux tokens. Le panneau des filtres du téléphone apparaît en fondu, alors que le geste attendu sur téléphone est une feuille qui monte du bas.

## 2. Objectifs
- O1 : composant générique `lc-sheet` (feuille iOS) repris par le panneau des filtres du téléphone (décisions 1 à 10, 20).
- O2 : aucune hauteur qui saute : sections, accordéons, groupes de nav, rangée de pastilles (11, 12).
- O3 : sorties animées et fonds cohérents : tiroir, dialogue (13 à 15).
- O4 : contenus qui changent en douceur : onglets, calendrier, nav de l'app-shell (16 à 18).
- O5 : mêmes tokens partout, réduction des animations respectée.
- O6 : aucun état de survol « collé » après un toucher (décision 19).

## 3. Hors périmètre
- Nouvelle courbe ou nouvelle durée système (l'audit conclut qu'il n'en faut pas ; seuls des tokens de composant sont ajoutés).
- Recul ou réduction de la page derrière la feuille ; « détentes » multiples (demi-hauteur) de la feuille.
- Animation des info-bulles et toggletips (laissées sans animation, décision Q5 de `2026-11-mouvement.md`).
- `interpolate-size`, `::details-content`, View Transitions (hors cible Baseline 2024).
- Changement de comportement des filtres (application, focus, textes).

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : les personnes qui utilisent le simulateur et copro-ticket, surtout sur téléphone ; les développeurs consommateurs, sans code d'animation à écrire.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Gestionnaire sur téléphone | Ouvre « Filtres (N) » | La feuille monte du bas en 500 ms, le tableau s'assombrit derrière |
| Gestionnaire sur téléphone | Tire la poignée vers le bas | La feuille suit le doigt ; lâchée assez bas ou d'un geste vif, elle se ferme sans appliquer ; sinon elle remonte |
| Gestionnaire sur téléphone | Déplie « Reçue le » | La section s'ouvre en 500 ms, les sections du dessous glissent |
| Gestionnaire | Retire une pastille | Elle s'efface, la rangée se referme, la liste glisse |
| Utilisateur | Ouvre / ferme un tiroir, un dialogue | Entrée et sortie animées, fond cohérent |
| Personne qui réduit les animations | Tout ce qui précède | Aucun mouvement ; le geste suit le doigt, sans animation de fin |

## 5. Solution proposée
### 5.1 Vue d'ensemble (après relecture de l'`architect`)
- **Hauteur animée** : bloc CSS d'une dizaine de lignes **dans la feuille de chaque composant** (`disclosure.component.css`, `nav-group.component.css`, `data-table.component.css` ; partiel `@import` si ng-packagr le résout, sinon duplication), jamais dans `ui-angular.css` (un consommateur sans la feuille globale aurait des régions toujours ouvertes). Région `display: grid; grid-template-rows: 0fr; visibility: hidden` → ouverte `1fr` / `visible` ; au repli, `visibility` décalée de `--lc-collapse-duration` ; enfant `min-block-size: 0; overflow: hidden`, **padding et espacement portés par l'enfant** (sinon visibles une fois replié : padding de `.lc-disclosure__region` et `.lc-data-table__section-body`, `gap` de `.lc-nav-group__group`). `inert` posé immédiatement au repli. Les sections de `lc-data-table` gardent leur filtre rendu après la première ouverture (aujourd'hui `@if (section.open)` le détruit, le repli serait vide). Suppression de `@keyframes lc-disclosure-open` et du `@starting-style` du corps de section. Précédent : `app-shell.component.css` (visibility décalée).
- **Chevrons** : rotation en `--lc-collapse-duration`, `easing-standard` ; sections du panneau : `chevron-down` tourné de 180° ; `lc-disclosure` et `lc-nav-group` : `chevron-right` tourné de 90° (un seul chevron dans `lc-nav-group`) ; toujours `aria-hidden`, état porté par `aria-expanded`.
- **`lc-sheet`** (nouveau, `packages/angular/overlay/src/sheet/`) : composant à `<dialog>` modal, entrées `open` (`model`), `title`, sortie `closed` ; libellé de la croix via `LC_LABELS` ; contenu projeté (corps, pied `[lcSheetFooter]`) ; il porte la poignée, le geste, l'entrée, la sortie, le fond, les tokens `--lc-sheet-*` et `--lc-slide-*`. `lc-data-table` remplace son `<dialog>` de panneau par `<lc-sheet>` ; sa logique de filtres (brouillon, « Afficher N … », focus rendu à « Filtres ») reste dans le tableau. Feuille : `::backdrop` à `--lc-sys-color-backdrop` (le panneau actuel est opaque) ; entrée `@starting-style` `translateY(100%)` en `--lc-slide-enter-duration` ; sortie : la règle `[open][data-closing]` passe de l'opacité à `transform: translateY(100%)` en `--lc-slide-exit-duration`. Geste : `data-dragging` (`transition: none`) et `transform` en ligne écrit une fois par image ; `setPointerCapture` sur poignée et en-tête (`touch-action: none` sur ces zones seulement, `overscroll-behavior: contain` sur le corps) ; `pointercancel` et `lostpointercapture` → retour à 0 ; borné à 0 vers le haut (pas d'élastique) ; au relâchement on retire `data-dragging` et le transform en ligne, puis `data-closing` ou rien : les transitions repartent de la position courante (réouverture pendant la descente comprise). Fermeture si déplacement > `--lc-sheet-dismiss-ratio` (0,25) de la hauteur, ou vitesse vers le bas > 0,5 px/ms sur les 100 dernières ms avec au moins 16 px de déplacement (constantes nommées du code). Le fond s'éclaircit avec la distance (`--lc-sheet-progress`, Q2).
- **Attente des animations** : `lcAnimationsEnd(el, { subtree: false })` pour la feuille et les panneaux CDK (sinon une section en cours de repli retarderait la fermeture jusqu'à 500 ms).
- **Pastilles** : `animate.leave` (fondu `duration-fast`, `data-leaving`, `pointer-events: none`) ; positions des lignes mesurées **relativement à `.lc-data-table__scroll`** ; décalage du bloc entier animé en un seul `translateY`, mesuré dans `removeChip` / `clearAll` avant `setQuery`. Les pastilles voisines se décalent encore horizontalement d'un coup (écart accepté).
- **Dialogue et tiroir** (`@angular/cdk/dialog`) : `LcDialogRef.close(result)` (partagé par `LcDrawerRef`) pose `lc-overlay--closing` sur le panneau, retire `cdk-overlay-backdrop-showing` du fond, attend `lcAnimationsEnd(…, { subtree: false })`, puis appelle `cdkRef.close(result)` (garde d'idempotence ; la valeur de retour est conservée ; `closed` est émis à la fin de la sortie). Le dialogue passe en `disableClose: true`, Échap et fond gérés par le kit comme le tiroir. `lcDetachAnimated` n'est **pas** employé ici (il détacherait et perdrait le résultat). Entrée par `@keyframes` sur `> *` du panneau ; l'animation actuelle du panneau du tiroir (`ui-angular.css`) est retirée ; règles dédiées (tiroir en `transform`, dialogue en fondu et `scale(var(--lc-dialog-enter-scale))`), sans ajouter ces panneaux au `:is(...)` des menus. Fond : `.cdk-overlay-backdrop.lc-dialog-backdrop` / `.lc-drawer-backdrop` seulement, en `--lc-overlay-enter-duration` et `--lc-overlay-easing`, réinitialisé en réduction.
- **Onglets** : `@starting-style` d'opacité sur le panneau affiché (le panneau garde `hidden`). **Calendrier** : fondu de la grille rejoué par clé de mois. **App-shell** : `--lc-shell-nav-duration`.
- **Survol** (décision 19) : `@media (hover: hover)` seule, comme `lc-disclosure` et `choice-card` aujourd'hui ; aucun `:hover` en JavaScript ; on ne crée pas de style `:active` là où il n'y en a pas.

### 5.2 Tokens (composant, dans `packages/tokens/src/components/motion.tokens.json`, valeurs en `{sys.*}`)
| Token | Valeur |
|---|---|
| `--lc-collapse-duration` | `duration-move` (500 ms, Q1) |
| `--lc-slide-enter-duration` / `-exit-duration` | `duration-move` / `duration-normal` (feuille et tiroir) |
| `--lc-sheet-top-gap` | `sys.space.10` (40 px, Q3), plus `env(safe-area-inset-top)` |
| `--lc-sheet-radius` | `sys.radius.lg` |
| `--lc-sheet-dismiss-ratio` | 0.25 (nombre lu par `getComputedStyle`) |
| `--lc-dialog-enter-scale` | 0.96 (nombre) |
| `--lc-shell-nav-duration` | `duration-long` |

Le fond réutilise `--lc-overlay-enter-duration` et `--lc-overlay-easing`. Poignée : 36 × 5 px avec les tokens de taille existants.

### 5.3 API
Aucune entrée ni sortie nouvelle. Classes CSS internes ajoutées. `lc-nav-group` : un seul chevron (icône) au lieu de deux ; `lc-disclosure` : plus de `[hidden]` sur la région (remplacé par `visibility` après transition).

### 5.4 Interface
Brief de `ui-ux-designer` (2026-11-21) et maquette `docs/design/explorations/2026-11-mouvement-ios/index.html` (vérifiée en Chromium à 360 et 1 280 px). Feuille (`lc-sheet`) : marge haute 40 px plus zone sûre ; rayon 12 px en haut ; fond `--lc-sys-color-backdrop` ; en-tête et pied `surface-raised`, corps `background` ; poignée 36 × 5 px `border-strong` (≈ 3,5:1), centrée à 8 px du haut dans une bande de 24 px, `aria-hidden` ; zone de geste = bande + en-tête (≈ 76 px), croix exclue ; titre « Filtres » `font-size-lg`, croix 44 × 44 ; focus initial inchangé. `forced-colors` : bordure `CanvasText`, poignée `forced-color-adjust: none; background: CanvasText`. Pleine largeur jusqu'au point de rupture du menu de bureau ; en paysage, le corps défile. Aucun texte nouveau. Test `novice-user` sur captures à 360 px (fermée, ouverte, en cours de tirage, section dépliée).

## 6. Cas limites
- Contenu de la feuille plus haut que l'écran : défile à l'intérieur ; le geste ne démarre jamais depuis la zone qui défile.
- Geste commencé puis souris / doigt sorti de l'écran (`pointercancel`) : retour à la place.
- Rouvrir pendant la descente : la feuille remonte depuis sa position courante.
- Dépliage puis repli rapide : la transition repart de la hauteur courante.
- Section repliée : contenu non focalisable (visibility), lu par aucun lecteur d'écran.
- `forced-colors` : poignée et coins conservés (bordure système).
- Réduction des animations : aucune transition ; le geste suit le doigt.

## 7. Sécurité, performance
- Sécurité : angle fermé.
- Performance : `transform`/`opacity` pour feuille, tiroir, dialogue ; `grid-template-rows` provoque une mise en page sur la seule région (petite) ; geste en `requestAnimationFrame` sans lecture de mise en page à chaque image.

## 8. Alternatives
| Option | Pour | Contre | Retenue ? |
|---|---|---|---|
| `grid-template-rows 0fr → 1fr` | CSS seul, dans la cible | une enveloppe de plus | **Oui** |
| `interpolate-size` / `::details-content` | natif | hors cible | Non |
| Hauteur mesurée + WAAPI | précis | JS pour chaque composant | Non (sauf si un cas le demande) |
| `max-height` en dur | simple | durée faussée, coupe le contenu | Non |
| Feuille en `lc-drawer` | composant existant | pas de geste, comportement différent du `<dialog>` déjà en place | Non |

## 9. Plan de test
- Unitaires (`senior-developer`) : logique du geste (seuils de distance et de vitesse, `pointercancel`), état ouvert/fermé des régions, chevrons.
- Acceptation navigateur (`qa-engineer`, Chromium) : extension de `storybook-browser.mjs` (feuille : entrée, sortie, geste au pointeur ; hauteurs : voisins qui glissent sans saut ; sorties tiroir et dialogue ; fonds ; onglets ; calendrier ; app-shell ; réduction ; forced-colors ; axe).
- Non-régression : suites existantes, `motion`, `stories-motion`, `filter-date`.

## 10. Critères d'acceptation
- [ ] CA-S0 : `lc-sheet` est exporté par `@lionelcointot/ui-angular/overlay`, documenté (story `Overlays/Sheet` avec `Playground` et `Animation`, catalogue) et utilisable hors du tableau ; `lc-data-table` n'a plus de `<dialog>` propre et utilise `lc-sheet` ; aucun import nouveau entre points d'entrée hors exceptions de `CLAUDE.md`.
- [ ] CA-S1 : À 360 px, « Filtres (N) » ouvre une feuille ancrée en bas, coins supérieurs arrondis, poignée, haut à `--lc-sheet-top-gap` (± 1 px) ; entrée `translateY` de 100 % à 0 en `--lc-slide-enter-duration` ; fond `--lc-sys-color-backdrop` en fondu ; le tableau reste visible au-dessus.
- [ ] CA-S2 : Les trois fermetures (croix, Échap, « Afficher N … ») posent `data-closing`, font descendre la feuille en `--lc-slide-exit-duration` puis `dialog.open === false` ; filtres émis comme aujourd'hui ; focus sur le bouton « Filtres ».
- [ ] CA-S3 : Poignée tirée de plus de 25 % de la hauteur : fermeture, rien d'émis, focus sur « Filtres ». Moins de 25 % à moins de 0,5 px/ms : retour à `translateY(0)` en 200 ms. Moins de 25 % à plus de 0,5 px/ms avec au moins 16 px : fermeture. Un toucher sans déplacement ne ferme rien. Vers le haut : jamais au-delà de 0. Pendant le tirage, le `transform` suit le doigt sans transition.
- [ ] CA-S4 : Liste plus haute que sa zone : un glissement tactile commencé dans la liste augmente son `scrollTop` et laisse la feuille à `translateY(0)` ; `touch-action: none` seulement sur la poignée et l'en-tête.
- [ ] CA-S5 : En réduction des animations : aucune transition à l'ouverture ni à la fermeture ; le geste suit le doigt.
- [ ] CA-S6 : `pointercancel` (ou perte de capture) pendant un tirage : retour à `translateY(0)`, la feuille reste ouverte, rien n'est émis.
- [ ] CA-S7 : Rouvrir pendant la descente : la feuille repart de sa position courante, `data-closing` est retiré, `dialog.open === true` à la fin ; une double fermeture n'appelle `close()` qu'une fois.
- [ ] CA-H1 : Pour une section du panneau, un `lc-disclosure` et un groupe de `lc-nav-group` (trois tests) : à l'ouverture, une transition sur `grid-template-rows` de durée `--lc-collapse-duration` et de courbe `easing-standard` démarre ; la hauteur rendue va de 0 à sa hauteur finale (± 1 px) ; en positionnant l'animation à t = 0, 16,7, 33,3 … ms, le haut de l'élément suivant évolue de façon monotone et d'au plus 25 % de la hauteur finale entre deux pas ; le repli suit la même règle.
- [ ] CA-H2 : Dès le repli, la région est `inert` ; une fois la transition finie, `visibility: hidden`, Tab ne place jamais le focus dedans et elle est absente de l'instantané d'accessibilité ; à l'ouverture, `visibility: visible` dès la première image ; `aria-expanded` à jour.
- [ ] CA-H3 : Chevrons : rotation de même durée que la région (180° pour les sections du panneau, 90° pour `lc-disclosure` et `lc-nav-group`) ; `lc-nav-group` n'affiche qu'une icône.
- [ ] CA-H4 : Retrait d'une pastille : fondu `duration-fast`, pastille non cliquable pendant le fondu ; la rangée se resserre ; le bloc de la liste porte une seule animation de glissement dont le premier pas le place à sa position d'avant (± 1 px).
- [ ] CA-H5 : Repli commencé à mi-ouverture : la hauteur repart de sa valeur courante (± 5 %), sans saut vers 0 ni vers la hauteur finale.
- [ ] CA-O1 : `lc-drawer` : entrée par glissement de toute sa largeur en 500 ms, sortie par glissement en 200 ms ; le panneau quitte le DOM et `closed` est émis (avec la valeur passée à `close`) à la fin de la sortie.
- [ ] CA-O2 : `lc-dialog` : entrée en fondu et échelle 0,96 → 1 en 200 ms, sortie en fondu de 100 ms ; Échap et clic sur le fond passent par la sortie animée ; `closed` émis à la fin avec la valeur passée à `close`.
- [ ] CA-O3 : Fond du dialogue et du tiroir : `--lc-overlay-enter-duration` et `easing-standard`, en même temps que le panneau à la sortie.
- [ ] CA-T1 : `lc-tabs` : le panneau nouvellement affiché apparaît en fondu de 200 ms.
- [ ] CA-C1 : Calendrier : la grille apparaît en fondu de 200 ms au changement de mois.
- [ ] CA-A1 : `lc-app-shell` : largeur de la nav en 350 ms (1 280 px), tiroir mobile en 500 ms (360 px).
- [ ] CA-V1 : Contexte tactile (360 px, `hasTouch`, `(hover: hover)` faux) : après un toucher puis retrait du focus, la couleur de fond d'un élément de `lc-nav-list`, de `lc-menu`, d'un onglet, d'un `button[lcButton]` (trois `fillMode`) et d'une ligne de `lc-data-table` est égale à celle d'un élément identique non touché. Contexte souris (1 280 px) : le survol change la propriété visée par la règle.
- [ ] CA-V2 : Contrôle statique (`node --test`) sur `packages/angular/**/*.css` (hors `dist`, `node_modules`) : toute règle dont le sélecteur contient `:hover` (y compris dans `:is()`, `:not()`, `:has()`) est dans un `@media` dont la condition contient `hover: hover` (imbrication admise) ; le nombre de règles `:hover` ne baisse pas (49 au départ) ; au moins 23 fichiers lus.
- [ ] CA-F1 : `forced-colors: active` : poignée visible (couleur système), bordure de la feuille, coins arrondis conservés.
- [ ] CA-R1 : Sous `prefers-reduced-motion: reduce`, pour la feuille, la section, `lc-disclosure`, `lc-nav-group`, les chevrons, la pastille, le tiroir, le dialogue, leurs fonds, l'onglet, la grille du calendrier et la nav de l'app-shell : aucune animation de plus de 0,01 ms pendant ni après l'action ; l'état final est atteint tout de suite.
- [ ] CA-R2 : `packages/tokens/lib/motion.static.test.mjs` corrigé (chemin réel `packages/angular/styles/ui-angular.css`) et étendu aux fichiers touchés : aucune valeur en dur ; suite Vitest verte ; modes `motion`, `stories-motion`, `filter-date` verts ; axe sans erreur (feuille ouverte, section dépliée, tiroir, dialogue, à 360 px) ; stories `Animation` mises à jour et sans erreur.
- [ ] CA-R3 (manuel) : test `novice-user` sur captures de la feuille à 360 px.

## 11. Tâches
- [ ] S1 : hauteur animée dans `lc-disclosure`, `lc-nav-group` et les sections du panneau, chevrons (M ; CA-H1 à H3, H5).
- [ ] S2 : composant `lc-sheet` (forme, fond, entrée, sortie, geste, tokens, `lcAnimationsEnd({ subtree: false })`), stories et catalogue (M ; CA-S0, CA-S1 à S7, CA-F1).
- [ ] S2b : `lc-data-table` remplace son `<dialog>` par `lc-sheet` (S ; CA-S0, non-régression du filtrage sur téléphone).
- [ ] S3 : retrait des pastilles (S ; CA-H4).
- [ ] S4 : `LcDialogRef.close` asynchrone, tiroir, dialogue, fonds (M ; CA-O1 à O3).
- [ ] S5 : onglets, calendrier, app-shell (S ; CA-T1, C1, A1).
- [ ] S8 : survol sous `@media (hover: hover)` dans les 23 fichiers, sans changer les styles (S ; CA-V1, CA-V2).
- [ ] S6 (QA) : contrôles navigateur, réduction, `forced-colors`, axe, stories, contrôle statique corrigé (CA-R1, R2, F1, V1, V2) ; S7 : test novice (CA-R3) ; mise à jour des décisions révisées dans `2026-11-mouvement.md` et `catalogue:build`.

## 12. Risques et questions ouvertes
- **Questions tranchées** (2026-11-21, décision 21) : Q1 500 ms, Q2 fond qui s'éclaircit, Q3 40 px, Q4 contrôle statique gardé.
- **Tests existants à réécrire** (comportement changé volontairement) : `disclosure.component.spec.ts` (≈ 10 assertions sur `region.hidden`), `nav-group.component.spec.ts` (≈ 10, CA-K8.2), `dialog.service.spec.ts` et `drawer.service.spec.ts` (`close()` devient asynchrone), `storybook-browser.mjs` (mutations sur `hidden` des sections, fondu de la feuille).
- **Limites** : geste et survol prouvés en Chromium seulement (pointeur simulé, `hasTouch`), pas sur un vrai téléphone ; `visibility` décalée non vérifiée sous Safari iOS ; les pastilles voisines se décalent horizontalement d'un coup ; appareils hybrides (tactile et souris) : la requête suit le dispositif principal.
- **Bug trouvé en relecture** : `motion.static.test.mjs` pointait un chemin inexistant pour `ui-angular.css` et ne le contrôlait pas (corrigé en S6).

## 13. Relectures et écarts
- 2026-11-21, `cadreur` : ÉCARTS de rédaction. Retenu : décisions 2 à 18 marquées « acceptées en bloc », décision Q5 de la spec du mouvement citée, seuil de vitesse chiffré, cas limites en critères (S6, S7, H5, F1), tokens ramenés à 7, survol rattaché (O6). Questions Q1 et Q4 posées.
- 2026-11-21, `qa-engineer` (plan de test) : À PRÉCISER. Retenu : CA-S2, S3, S4, H1 (seuil 25 % par pas de 16,7 ms, mesure par animation en pause), H2, H4, O1, O2, R1, R2, V1, V2 réécrits ; CA-S6, S7, H5, F1 ajoutés ; liste des tests à risque. Tranché par la session principale : requête `(hover: hover)` seule, nombre de règles `:hover` qui ne baisse pas, `closed` émis à la fin de la sortie, pas d'effet élastique vers le haut, seuils du geste en constantes nommées.
- 2026-11-21, `ui-ux-designer` (brief, maquette) : FAIT. Retenu en 5.1 et 5.4. Questions Q2 et Q3.
- 2026-11-21, `architect` : RÉSERVES. Retenu : hauteur animée dans la feuille de chaque composant (pas dans `ui-angular.css`), padding et espacement sur l'enfant, `inert` immédiat, sections gardées rendues, `LcDialogRef.close` asynchrone au lieu de `lcDetachAnimated` (résultat conservé, `disableClose`), entrée du tiroir et du dialogue sur `> *`, fonds ciblés, `lcAnimationsEnd({ subtree: false })`, pastilles mesurées par rapport au conteneur, tokens dans `motion.tokens.json` avec les noms `slide-*` et `shell-*`, chemin corrigé de `motion.static.test.mjs`.
- 2026-11-21, utilisateur : Q1 à Q4 tranchées (décision 21) ; composant générique `lc-sheet` demandé (décision 20), relu par l'`architect`.
