# Spec : ressenti iOS (feuille de filtres du téléphone, hauteurs et sorties animées)

- **Statut** : Brouillon (2026-11-21), en relecture
- **Auteur** : Lionel Cointot (rédaction Claude)
- **Date** : 2026-11-21
- **ADR liés** : [0009 Cible navigateurs](../adr/0009-cible-navigateurs-et-primitives-natives.md) (Baseline 2024, inchangée)
- **Specs liées** : [`2026-11-mouvement.md`](2026-11-mouvement.md) (décisions 17, 19, 20, 22 révisées ici) · [`2026-11-tableau-filtrable.md`](2026-11-tableau-filtrable.md)
- **Consommateurs** : simulateur immobilier, copro-ticket (file des demandes, `lc-data-table` sur téléphone) et tout projet qui utilise `lc-disclosure`, `lc-drawer`, `lc-dialog`, `lc-nav-group`, `lc-tabs`, `lc-app-shell`, le calendrier

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « Il faut pour le filtrage des table en version mobile avec la fenetre de filtrage qui s'anime en venant du bas vers le haut, si tu vois ce que je ceux dire »
  - À « A. plein écran qui monte ; B. feuille façon iOS (coins arrondis, poignée, tableau assombri visible) » : « Oui B »
  - À « peut-on fermer la feuille en la tirant vers le bas ? A. non (poignée retirée) ; B. oui » : « b »
  - Sur les 10 recommandations de la feuille : « Oui tres bien , par contre quand on deplie les differents filtre, je trouve que ca fait encore abrupte tu peux faire un point sur tout les animatiosn afin d'avoir un ressentie ios et smooth »
  - Sur les 11 corrections de l'audit : « Fait tout les points »
- **Besoin en trois phrases** : Sur téléphone, le panneau des filtres du tableau doit se comporter comme une feuille iOS : il monte du bas, se referme vers le bas, et se tire au doigt. Plus largement, tout ce qui change de taille dans le kit (sections, accordéons, pastilles, groupes de nav) saute aujourd'hui d'un coup, et plusieurs sorties sont sèches ; l'utilisateur veut un ressenti iOS doux et cohérent. On garde la courbe et les durées existantes, on les applique aux hauteurs et aux sorties.
- **Audit** (2026-11-21, `ui-ux-designer`, mesures Chromium) : entrées conformes ; hauteurs et sorties abruptes ; `cubic-bezier(0.2, 0, 0, 1)` équivaut au ressort iOS sans rebond, pas de nouvelle courbe ; seule incohérence de courbe : fond du dialogue et du tiroir (valeur CDK 400 ms).
- **Décisions prises pendant le cadrage** (2026-11-21, utilisateur) :
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
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : nouvelle technique partagée d'animation de hauteur (feuille globale), geste au pointeur dans `lc-data-table`, `lcDetachAnimated` étendu au tiroir et au dialogue.
  - [x] Écran : ce que l'utilisateur voit bouger sur dix composants.
  - [ ] Sécurité et données : fermé. Aucune donnée ; uniquement du CSS, des mesures et des événements de pointeur.

## 1. Contexte et problème
La spec du mouvement a livré entrées, indicateurs et différence de liste. L'audit montre que les changements de taille et plusieurs sorties ne sont pas animés : une section de filtre qui s'ouvre fait sauter les suivantes de plus de 100 px en une image, une pastille retirée fait remonter la liste de 44 px d'un coup, le tiroir et le dialogue disparaissent instantanément, et leur fond suit une courbe du CDK étrangère aux tokens. Le panneau des filtres du téléphone apparaît en fondu, alors que le geste attendu sur téléphone est une feuille qui monte du bas.

## 2. Objectifs
- O1 : panneau des filtres du téléphone en feuille iOS (décisions 1 à 10).
- O2 : aucune hauteur qui saute : sections, accordéons, groupes de nav, rangée de pastilles (11, 12).
- O3 : sorties animées et fonds cohérents : tiroir, dialogue (13 à 15).
- O4 : contenus qui changent en douceur : onglets, calendrier, nav de l'app-shell (16 à 18).
- O5 : mêmes tokens partout, réduction des animations respectée.

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
### 5.1 Vue d'ensemble
- **Hauteur animée (technique partagée)** dans `styles/ui-angular.css` : une classe utilitaire interne (ex. `lc-collapse` sur la région, `lc-collapse__inner` sur l'enfant) : `display: grid; grid-template-rows: 0fr; visibility: hidden` → ouvert `grid-template-rows: 1fr; visibility: visible`, transition `grid-template-rows` en `--lc-collapse-duration` (repli `duration-move`) et `easing-standard`, `visibility` décalée de la même durée à la fermeture (retire le contenu de la tabulation et de l'arbre d'accessibilité une fois replié, remplace `[hidden]`) ; enfant `min-block-size: 0; overflow: hidden` ; fondu d'opacité de l'enfant en `duration-normal`. `grid-template-rows` est animable depuis 2023 (dans la cible). Utilisée par les sections du panneau de filtres, `lc-disclosure`, `lc-nav-group`, la rangée de pastilles.
- **Chevrons** : rotation en `--lc-collapse-duration`.
- **Feuille de filtres** (`lc-data-table`, `<dialog>` modal existant) : position en bas, hauteur max `100dvh − marge haute`, coins supérieurs arrondis, poignée décorative ; entrée `@starting-style` `translateY(100%) → 0` en `duration-move` ; sortie par `data-closing` (mécanisme existant) `translateY(100%)` en `duration-normal` ; fond en fondu `duration-normal`. Geste : événements pointer sur la poignée et l'en-tête (`touch-action: none` sur ces zones seulement), `transform` suivi du doigt sans transition, au relâchement : fermeture si déplacement > seuil (quart de la hauteur, token) ou vitesse > seuil, sinon retour `duration-normal`. Fermeture par geste = même chemin que la croix (rien d'appliqué, focus rendu à « Filtres »).
- **Pastilles** : retrait par `animate.leave` (fondu `duration-fast`) puis resserrement ; la liste prend les positions avant le changement de pastille pour un seul glissement (correction de la mesure, audit).
- **Tiroir et dialogue** (`overlay`) : entrée par `@keyframes` sur le contenu (comme les panneaux CDK), sortie par `lcDetachAnimated` / `lc-overlay--closing` (dialogue : fondu ; tiroir : glissement) ; fond CDK (`.cdk-overlay-backdrop` du kit) en `duration-normal` + `easing-standard`.
- **Onglets** : `@starting-style` d'opacité sur le panneau affiché.
- **Calendrier** : fondu de la grille rejoué par clé de mois.
- **App-shell** : durées repointées sur les tokens.

### 5.2 Tokens (composant, repli sur `sys`)
| Token | Valeur |
|---|---|
| `--lc-collapse-duration` | `duration-move` |
| `--lc-sheet-top-gap` | `sys.space.8` (à confirmer au brief) |
| `--lc-sheet-radius` | `sys.radius.lg` |
| `--lc-sheet-enter-duration` / `-exit-duration` | `duration-move` / `duration-normal` |
| `--lc-sheet-dismiss-ratio` | 0.25 |
| `--lc-dialog-enter-scale` | 0.96 |
| `--lc-drawer-enter-duration` / `-exit-duration` | `duration-move` / `duration-normal` |
| `--lc-scrim-duration` | `duration-normal` |
| `--lc-app-shell-nav-duration` | `duration-long` |

### 5.3 API
Aucune entrée ni sortie nouvelle. Classes CSS internes ajoutées. `lc-nav-group` : un seul chevron (icône) au lieu de deux ; `lc-disclosure` : plus de `[hidden]` sur la région (remplacé par `visibility` après transition).

### 5.4 Interface
Brief à rédiger par `ui-ux-designer` (marge haute, poignée, rayon, seuil, sens des chevrons), puis test `novice-user` sur captures (360 px) de la feuille.

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
- [ ] CA-S1 : À 360 px, « Filtres (N) » ouvre une feuille ancrée en bas, coins supérieurs arrondis, poignée, haut à `--lc-sheet-top-gap` du haut de l'écran ; entrée `translateY` de 100 % à 0 en 500 ms ; fond en fondu.
- [ ] CA-S2 : Les trois fermetures (croix, Échap, « Afficher N … ») font descendre la feuille en 200 ms puis `dialog.open === false` ; filtres et focus inchangés.
- [ ] CA-S3 : Glisser la poignée de plus d'un quart de la hauteur ferme la feuille sans rien émettre, focus rendu à « Filtres » ; moins d'un quart et lentement : retour à 0 ; geste rapide court : fermeture.
- [ ] CA-S4 : Un glissement commencé dans la liste des filtres fait défiler la liste et ne déplace pas la feuille.
- [ ] CA-S5 : En réduction : aucune transition à l'ouverture ni à la fermeture ; le geste suit le doigt.
- [ ] CA-H1 : Ouvrir une section du panneau, un `lc-disclosure`, un groupe de `lc-nav-group` : la hauteur passe de 0 à la valeur finale en 500 ms ; les éléments placés dessous se déplacent sans saut (aucun déplacement de plus de 20 % de la hauteur finale entre deux images) ; le repli est animé de même.
- [ ] CA-H2 : Région repliée : contenu non focalisable et absent de l'arbre d'accessibilité.
- [ ] CA-H3 : Chevrons : rotation de même durée que la région ; `lc-nav-group` n'affiche qu'une icône de chevron.
- [ ] CA-H4 : Retirer une pastille : fondu, rangée qui se referme, liste qui glisse en un seul mouvement (aucun saut).
- [ ] CA-O1 : `lc-drawer` : entrée par glissement de toute sa largeur en 500 ms, sortie par glissement en 200 ms avant retrait du DOM.
- [ ] CA-O2 : `lc-dialog` : entrée en fondu et échelle 0,96 → 1 en 200 ms, sortie en fondu de 100 ms avant retrait.
- [ ] CA-O3 : Fond du dialogue et du tiroir : 200 ms et `easing-standard`.
- [ ] CA-T1 : `lc-tabs` : le panneau nouvellement affiché apparaît en fondu de 200 ms.
- [ ] CA-C1 : Calendrier : la grille apparaît en fondu de 200 ms au changement de mois.
- [ ] CA-A1 : `lc-app-shell` : largeur de la nav en 350 ms, tiroir mobile en 500 ms.
- [ ] CA-R1 : Avec `prefers-reduced-motion: reduce`, aucune des animations ci-dessus ne joue.
- [ ] CA-R2 : Aucune valeur en dur (contrôle `motion.static.test.mjs` étendu aux fichiers touchés) ; tests existants verts ; axe sans erreur ; stories `Animation` mises à jour.
- [ ] CA-R3 (manuel) : test `novice-user` sur captures de la feuille à 360 px.

## 11. Tâches
- [ ] S1 : technique partagée de hauteur + sections du panneau de filtres + `lc-disclosure` + `lc-nav-group` + chevrons (M ; CA-H1 à H3).
- [ ] S2 : feuille de filtres : forme, entrée, sortie, geste, tokens (M ; CA-S1 à S5).
- [ ] S3 : retrait des pastilles (S ; CA-H4).
- [ ] S4 : tiroir, dialogue, fonds (M ; CA-O1 à O3).
- [ ] S5 : onglets, calendrier, app-shell (S ; CA-T1, C1, A1).
- [ ] S6 (QA) : contrôles navigateur, réduction, axe, stories (CA-R1, R2) ; S7 : test novice (CA-R3).

## 12. Risques et questions ouvertes
- 500 ms pour des petites hauteurs peut paraître lent : à juger sur la démo ou en Storybook ; repli possible sur 350 ms par le token `--lc-collapse-duration`.
- Le geste n'est prouvé qu'en Chromium (pointeur simulé), pas sur un vrai téléphone.
- `visibility` décalée : vérifier qu'aucun test existant ne repose sur `[hidden]`.

## 13. Relectures et écarts
