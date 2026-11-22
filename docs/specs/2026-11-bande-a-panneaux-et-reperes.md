# Spec : Bande à panneaux glissante, repères du fil et arrivée du premier message

- **Statut** : Validée le 2026-11-22 (« Ok fait tout les recomander alors » : recommandations de Q1 à Q6 retenues)
- **Auteur** : agent de la tâche T2 de copro-ticket (`copro-ticket/docs/specs/2026-11-suivi-conversation.md`), pour la session principale
- **Date** : 2026-11-22
- **ADR liés** : 0009 (cible Baseline 2024, primitives natives sous conditions : `scrollend` et `scrollsnapchange` ont un repli écrit ici), 0010 (options groupées : aucune option nouvelle n'atteint trois entrées d'une même fonction), 0005 (icônes). Pas de nouvel ADR : aucune dépendance, aucune primitive hors cible sans repli.

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** (copro-ticket, spec `2026-11-suivi-conversation.md` §0, puis ce chantier) :
  - « C'est pas mal il faudrait mais je sais comment faire proprement dans ui kit mais avec un scroll horionztal on change de ribrique ? »
  - « J'aimerai conserver egalement l'entatere avec les dueix navigation avec comme la bel "information" et ocnserver les 3 sous menus c'est plus simole »
  - « Les sous rubrique aussi peuvent etre avec le scroll » puis « Non je geux pas 4 »
  - « […] et pour la conversation je sais pas si on peut mettre des genre de flag ( les lessages system quand par elle change l'etat etc..) et conserver la rubrique historique […] »
  - « Ok tres bien bien rajoute dans les spec […] » (décision Q3 de copro-ticket : spec de `lc-swipe-panels` écrite dans `../ui-kit`)
  - « Il lanque des chose car je remarque que je n'ai pas les animation lorsque jnenvoie des message alors que ui kit est maj »
  - « Et oui il faut daire le t2 sur ui kit, si tu dois modifier ce repo tu peux »
- **Consommateur identifié** : copro-ticket, page de suivi d'une demande (copropriétaire) et page de traitement (gestionnaire), tâches T4 à T7 et T11 à T14 de sa spec. Règle « pas de composant sans consommateur » : chaque élément ci-dessous a un usage nommé dans copro-ticket ; ce qui n'en a pas est hors périmètre (§3).
- **Besoin en trois phrases** : copro-ticket change de rubrique (Échanges | Informations, puis Demande | Photos | Historique) d'un toucher ou d'un glissement horizontal, avec deux bandes imbriquées ; le kit n'a aucun composant qui glisse entre des panneaux ni de `lc-tabs` pilotable par glissement, donc copro-ticket l'assemble en local (`shortcut`). Le fil doit montrer les changements d'état comme des repères colorés (pastille, mot court, heure, raison), alors que la ligne système du kit n'est qu'un texte gris centré. Enfin, le premier message envoyé dans un fil vide n'est jamais animé, ce que l'utilisateur a remarqué.
- **Décisions prises pendant le cadrage** :
  - 2026-11-22, utilisateur (copro-ticket) : glissement aux deux niveaux, pas de bande unique à quatre panneaux, repères dans le fil, spec écrite dans le kit, droit d'écrire dans ce dépôt.
  - 2026-11-22, cette spec (à valider, §12) : un composant `lc-swipe-panels` plus une option `swipe` de `lc-tabs` (option C du §8) ; repères par extension de `LcThreadMessage` qui réutilise `lc-status-badge` ; premier rendu vide = ouverture.
- **Taille** : Fonctionnalité (un composant nouveau, deux composants étendus, un correctif de comportement).
- **Angles ouverts** :
  - [x] Architecture : nouveau composant dans `navigation`, composition interne par `lc-tabs` (même point d'entrée), contrat avec `lc-segmented-control` (`forms`) sans import croisé ; extension du modèle public du fil.
  - [x] Écran : nouveau comportement visible (glissement, repères) ; la direction est celle choisie par l'utilisateur dans copro-ticket (maquette `3-rendu-final.html`), pas de nouvelle exploration ici.
  - [ ] Sécurité et données : fermé. Aucune donnée nouvelle ; les textes des repères passent par `lcStripUnsafeChars` comme les messages, interpolés (jamais `innerHTML`) ; une icône n'est qu'un nom du registre `lc-icon`.

## 1. Contexte et problème
- **Bande** : copro-ticket veut des rubriques côte à côte qu'on fait glisser au doigt, avec un accrochage natif. Le kit a `lc-tabs` (panneaux `hidden`, créés à la première sélection, trait qui glisse au clic) et `lc-segmented-control` (`radiogroup`, sans panneaux, sans fond qui glisse). Aucun des deux ne sait suivre un défilement horizontal. La maquette de référence (`copro-ticket/docs/design/explorations/2026-11-suivi-conversation/3-rendu-final.html`, fonctions `wireStrips`, `progress`, `applyInert`, `goto`) prouve le comportement en JavaScript brut.
- **Repères** : `lc-message-thread` rend `kind: 'system'` en `<p class="lc-message-thread__system">texte · heure</p>`, gris, sans couleur ni icône. copro-ticket colle aujourd'hui la raison dans le texte (« … · motif : … ») et ne peut ni colorer, ni mettre d'icône, ni donner une phrase complète au lecteur d'écran, ni poser le lien « Revoir votre demande » (CA-22 de copro-ticket).
- **Premier message** : `ArrivalTracker` (`message-thread-motion.ts`) marque comme « vu » tout le premier rendu non vide, **y compris après une liste d'abord vide** (décision de l'`architect`, CA-T4 de `2026-11-fil-de-messages.md`), pour qu'un fil monté vide pendant le chargement n'anime pas tout l'historique. Conséquence : le premier message d'un fil vide n'entre jamais en animation. Dans copro-ticket s'ajoute une seconde cause : `request-messages` n'affiche `lc-message-thread` que si la liste est non vide (`@if (thread().length > 0)`), donc le composant est **créé** avec le premier message, ce qui est une ouverture quoi que fasse le kit.

## 2. Objectifs
- O1 : Changer de panneau par glissement horizontal à accrochage natif, et par clic sur un onglet ou un segment, avec un seul état (index actif) synchronisé dans les deux sens, sans boucle.
- O2 : Imbriquer deux bandes : au bord de la bande intérieure, le geste passe à la bande extérieure si on le demande.
- O3 : L'indicateur (trait des onglets, fond du segmenté) suit le doigt pendant le glissement.
- O4 : Accessibilité et confort : panneaux cachés hors d'atteinte (`inert`), mouvement réduit respecté, marge de bord pour le geste retour d'iOS, aucune perte de focus.
- O5 : Même balisage du téléphone à l'ordinateur : la bande peut se poser en colonnes côte à côte sans recréer les panneaux (brouillon de saisie et position du fil conservés).
- O6 : Une ligne système du fil peut être un repère : pastille (icône, mot court, heure) colorée par un ton, seconde ligne facultative, phrase complète pour le lecteur d'écran, action facultative.
- O7 : Le premier message ajouté à un fil vide entre avec la même animation que les suivants ; l'ouverture d'un fil déjà rempli reste sans animation.

## 3. Hors périmètre (non-objectifs)
- Carrousel d'images (défilement automatique, pagination par points, boucle) : pas de consommateur.
- Glissement vertical entre panneaux, bande à plus d'un panneau visible en mode bande (pas de « peek ») : pas demandé.
- Gestes tactiles simulés (pointeur) ou bibliothèque de gestes : le glissement est le défilement natif du navigateur.
- Option `swipe` sur `lc-segmented-control` : un contrôle de formulaire ne porte pas de panneaux (§8) ; il gagne seulement un indicateur qui suit une progression.
- Entrée `loading` sur `lc-message-thread` : aucun consommateur ne monte le fil avant ses données (copro-ticket le monte après chargement) ; à ajouter le jour où un consommateur le demande (§12, Q5).
- Pastille « Nouveau message ↓ » du fil : reste hors kit (copro-ticket a son bouton « Derniers messages »).
- Septième ton « accent » : copro-ticket le pose par `cssClass` (§5.3), comme sa pastille d'état actuelle (Q3).

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : le développeur d'une application consommatrice (copro-ticket), et à travers lui le copropriétaire débutant sur téléphone (confirmé par l'utilisateur dans la spec de copro-ticket, §4).

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Développeur copro-ticket | Pose `lc-segmented-control` au-dessus d'un `lc-swipe-panels` à deux panneaux | `[(value)]` et `[(activeIndex)]` liés ; un glissement change le segment, un clic fait défiler la bande |
| Développeur copro-ticket | Pose `lc-tabs` avec `swipe` dans le second panneau | Les onglets et la bande intérieure se suivent ; au bord, le geste passe à la bande du dessus |
| Développeur copro-ticket | Passe la zone de page au-delà de 832 px | `layout="columns"` : fil et panneau côte à côte, aucun panneau recréé, aucun `inert` |
| Copropriétaire | Glisse du doigt d'Échanges à Informations | Le fond du segmenté suit le doigt, la rubrique change à l'accrochage |
| Copropriétaire au lecteur d'écran | Parcourt le fil | Chaque repère se lit en phrase complète ; Tab n'atteint rien d'un panneau caché |
| Personne qui réduit les animations | Touche un onglet | La bande saute sans défilement animé |
| Copropriétaire ou gestionnaire | Envoie le premier message d'un fil vide | La bulle entre avec le ressort, comme les suivantes |
| Développeur copro-ticket | Rend un changement d'état | `{ kind: 'system', text: 'En attente', tone: 'warning', icon: 'clock', detail: 'Attente devis', ariaLabel: '…' }` |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
- **`navigation`** (point d'entrée existant) :
  - `swipe-panels/swipe-panels.component.ts` (nouveau) : `LcSwipePanelsComponent` (`lc-swipe-panels`) et `LcSwipePanelDirective` (`[lcSwipePanel]`, posée sur chaque panneau projeté, enfant direct). L'hôte est la bande qui défile.
  - `tabs/tabs.component.ts` : option `swipe` ; en mode glissement, ses `tabpanel` sont rendus dans un `lc-swipe-panels` interne (même point d'entrée, aucun import croisé) et le trait suit `progress`.
- **`forms`** : `segmented-control` gagne l'entrée `indicatorProgress` ; aucun import de `navigation` : le consommateur relie `progress()` de la bande à cette entrée dans son gabarit.
- **Principal** (`packages/angular/src`) : une fonction pure `lcIndicatorRect(rects, progress)` (interpolation de la position et de la largeur entre deux éléments voisins), utilisée par `lc-tabs` et `lc-segmented-control` sans import entre points d'entrée secondaires.
- **`feedback`** : `message-thread` : modèle étendu, gabarit du repère composé avec `lc-status-badge` (même point d'entrée), sortie `systemAction` ; `message-thread-motion.ts` : règle d'ouverture changée.
- **`packages/tokens`** : `swipe-panels.tokens.json` (nouveau) ; `message-thread.tokens.json` : jetons du repère ; `segmented-control` : jetons de l'indicateur.
- Remplacer une brique : copro-ticket remplace son assemblage local `shared/ui/swipe-panels.component.ts` par `lc-swipe-panels` dans ce seul fichier et ses deux usages (spec copro-ticket §5.1).

**Fonctionnement de `lc-swipe-panels` (mode `strip`)**
1. CSS : hôte `display: flex; overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain` (ou `auto` avec `chain`) ; chaque `[lcSwipePanel]` `flex: 0 0 100%; min-inline-size: 0; min-block-size: 0; scroll-snap-align: start; scroll-snap-stop: always; padding-inline: var(--lc-swipe-panels-gutter)`.
2. Premier rendu : `scrollLeft` posé sur `activeIndex` sans animation (aucun événement émis).
3. Glissement : un `IntersectionObserver` (racine = hôte, seuil 0,6) désigne le panneau visible à 60 % ou plus ; s'il diffère, `activeIndex.set(i)` (la sortie `activeIndexChange` n'est donc émise **que** par un glissement, jamais par un changement venu du parent). `scrollsnapchange` (Chrome, Edge) fait de même plus tôt, en complément ; son absence ne change rien.
4. Changement venu du parent (`activeIndex` lié) : si l'index diffère du panneau accroché, `scrollTo({ left, behavior })` avec `behavior: 'instant'` sous mouvement réduit (`lcPrefersReducedMotion()`), `'smooth'` sinon ; la synchro est **en sourdine** jusqu'à `scrollend`, avec un repli de 800 ms (`scrollend` n'est Baseline que depuis décembre 2025, Safari 26.2 : repli écrit et testé, ADR 0009). Pas de boucle bande ↔ parent : le parent qui réécrit l'index reçu ne relance aucun défilement (l'index est déjà celui du panneau accroché).
5. Progression : à chaque `scroll` (écouteur passif, une lecture par image via `requestAnimationFrame`), `progress = |scrollLeft| / clientWidth` (valeur réelle, de 0 à n − 1 ; valeur absolue pour `dir="rtl"`). Exposée en signal public `progress` et en variable `--lc-swipe-panels-progress` sur l'hôte (pour un descendant).
6. `inert` : posé sur chaque panneau d'index différent de `activeIndex`, retiré du panneau actif. Si le focus était dans un panneau qui devient `inert`, il passe au panneau actif (`tabindex="-1"` posé par la directive, `focus({ preventScroll: true })`).
7. Redimensionnement (`ResizeObserver` sur l'hôte : rotation, clavier, passage de colonnes à bande) : `scrollLeft` reposé sur `activeIndex` sans animation, synchro en sourdine pendant ce repositionnement.
8. Panneaux ajoutés ou retirés (`contentChildren`) : `activeIndex` hors bornes ramené dans `[0, n − 1]` (avertissement en développement), sans émission.

**Mode `columns`** : hôte `display: grid; grid-auto-flow: column; grid-template-columns: var(--lc-swipe-panels-columns, repeat(n, minmax(0, 1fr))); grid-template-rows: minmax(0, 1fr); gap: var(--lc-swipe-panels-gap); overflow: visible`, pas d'accrochage, aucun `inert`, observateurs coupés, `progress = activeIndex`. `activeIndex` est gardé tel quel : repasser en `strip` rouvre le même panneau (CA-23 de copro-ticket). Les panneaux ne sont jamais recréés en changeant de mode.

### 5.2 Modèle de données
Extension de `LcThreadMessage` (`feedback/src/message-thread/message-thread.model.ts`). Champs lus seulement si `kind === 'system'` (sinon ignorés, avertissement en développement) :

```ts
/** Ton d'un repère : les rôles de `lc-status-badge`. */
export type LcThreadTone = LcStatusBadgeKind; // 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'highlight'

export interface LcThreadMessage {
  // … champs actuels inchangés ; pour `system`, `text` est le mot court de la pastille (obligatoire, sinon la ligne est ignorée comme aujourd'hui)
  /** system : rôle de couleur de la pastille ; `neutral` par défaut. */
  tone?: LcThreadTone;
  /** system : icône `lc-icon` de la pastille ; l'icône du ton par défaut (`LC_STATUS_ICONS`). */
  icon?: string;
  /** system : seconde ligne, sous la pastille (raison). */
  detail?: string;
  /** system : phrase lue à la place de la pastille, de la seconde ligne et de l'heure (« Camille Martin a pris la demande en charge, 12 nov. 2026 à 09:40 »). */
  ariaLabel?: string;
  /** system : libellé d'un bouton sous le repère ; un clic émet `systemAction`. */
  actionLabel?: string;
}
```
Pas d'objet `system: {…}` : ADR 0010 laisse les données à plat. Pas de nouveau champ `label` : `text` porte déjà le texte de la ligne système. Aucune migration (bibliothèque).

### 5.3 API / interfaces
**`lc-swipe-panels`** (`LcSwipePanelsComponent`, `navigation`)

| Membre | Type | Défaut | Rôle |
|---|---|---|---|
| `activeIndex` | `model<number>` | `0` | Panneau affiché ; `activeIndexChange` émis seulement par un glissement |
| `layout` | `input<'strip' \| 'columns'>` | `'strip'` | Bande glissante, ou colonnes côte à côte (grille) |
| `chain` | `input<boolean>` | `false` | `true` : au bord, le geste passe au conteneur qui défile au-dessus (`overscroll-behavior-x: auto`) ; `false` : `contain` |
| `progress` | `Signal<number>` (lecture) | — | Position réelle (0 à n − 1) ; aussi `--lc-swipe-panels-progress` sur l'hôte |

`[lcSwipePanel]` (`LcSwipePanelDirective`) : sans entrée ; marque un enfant direct comme panneau, porte `inert` et `tabindex="-1"`. Le rôle et le nom du panneau restent au consommateur (`role="region"` et `aria-labelledby` conseillés dans le README).

Jetons (`swipe-panels.tokens.json`) : `gutter` (marge intérieure de chaque panneau, `0` ; README : `{sys.space.4}` quand la bande touche le bord de l'écran, pour laisser le geste retour d'iOS au bord gauche), `gap` (colonnes, `{sys.space.4}`). Surcharge d'application non définie par le kit : `--lc-swipe-panels-columns` (copro-ticket : `minmax(0, 1fr) 21rem`).

Usage visé (copro-ticket, niveau 1) :
```html
<lc-segmented-control [options]="views" [(value)]="view" [indicatorProgress]="strip.progress()" ariaLabel="Rubrique" />
<lc-swipe-panels #strip [(activeIndex)]="viewIndex" [layout]="wide() ? 'columns' : 'strip'" (activeIndexChange)="swiped($event)">
  <section lcSwipePanel aria-labelledby="t-echanges">…</section>
  <section lcSwipePanel aria-labelledby="t-infos">…</section>
</lc-swipe-panels>
```

**`lc-tabs`** (`navigation`)
- `swipe` : `input<boolean | LcTabsSwipeSettings>(false)` (ADR 0010 : `boolean | settings` pour une fonction qui s'active), `LcTabsSwipeSettings = { chain?: boolean }`.
- En mode glissement : l'hôte remplit son conteneur (colonne flex : liste fixe, bande `flex: 1; min-block-size: 0`) ; chaque `tabpanel` est un `[lcSwipePanel]`, défile verticalement (`overflow-y: auto; overscroll-behavior-y: contain`) et porte `inert` au lieu de `hidden` ; **tous** les panneaux sont créés au premier affichage (les voisins se voient pendant le glissement ; la création différée ne vaut qu'hors glissement) ; le trait suit `progress` (position et largeur interpolées par `lcIndicatorRect`, sans transition pendant le glissement, la transition actuelle au clic).
- Nouvelle sortie `selectionChange: output<{ id: string; source: 'tab' | 'swipe' }>()`, émise à chaque changement (clic, clavier ou glissement), pour qu'un consommateur distingue une entrée d'historique (`tab`) d'un remplacement (`swipe`) ; `selected` (`model`) inchangé.

**`lc-segmented-control`** (`forms`)
- `indicatorProgress` : `input<number | null>(null)`. `null` : rendu actuel. Un nombre : un fond `lc-segmented-control__indicator` (`aria-hidden`) se place par `lcIndicatorRect` entre les segments voisins ; le segment choisi perd son propre fond (la coche reste : l'état ne tient pas à la couleur seule). Sans transition quand la valeur change en continu ; transition des jetons de mouvement existants quand `value` change par clic.

**`lc-message-thread`** (`feedback`)
- Nouvelle sortie `systemAction: output<LcThreadMessage>()`.
- Rendu d'une ligne `system` (repère) :
```html
<div class="lc-message-thread__system" [attr.data-key]="id" [class]="cssClass">
  <span class="lc-message-thread__sr">{{ ariaLabel ou « texte. détail. » }}</span>   <!-- masqué à l'écran -->
  <div class="lc-message-thread__rule" aria-hidden="true">
    <lc-status-badge [kind]="tone ?? 'neutral'" [icon]="icon" size="sm">{{ text }} <time [attr.datetime]="iso">{{ heure }}</time></lc-status-badge>
  </div>
  @if (detail) { <p class="lc-message-thread__detail" aria-hidden="true">{{ detail }}</p> }
  @if (actionLabel) { <button type="button" class="lc-message-thread__action" (click)="systemAction.emit(message)">{{ actionLabel }}</button> }
</div>
```
  Sans `ariaLabel`, l'heure reste lisible (le `<time>` est alors hors de la partie `aria-hidden`) ; avec `ariaLabel`, la phrase fournie est tout ce qui est lu (le consommateur y met la date s'il la veut). Traits de part et d'autre de la pastille (`::before`/`::after`). L'entrée (fondu, `--_enter-scale`) s'applique au repère comme aujourd'hui.
- Jetons ajoutés à `message-thread.tokens.json` : `system-rule-color` (`{sys.color.border}`), `system-gap` (`{sys.space.1}`), `system-detail-color` (`{sys.color.on-surface-muted}`, l'actuel `system-color` est renommé, aucun alias). Couleurs de la pastille : jetons de `lc-status-badge`, surchargeables par la classe `cssClass` du message (copro-ticket : « accent » sable de « Prise en charge »). Bouton d'action : style lien, cible de `{sys.control.height.md}` (`--lc-sys-control-height-md`).

**Règle d'arrivée (`ArrivalTracker`)**, nouvelle formulation : « Le **premier rendu** du composant ouvre le fil, vide ou non : tout ce qu'il contient est vu. Ensuite, tout identifiant nouveau est une arrivée, y compris le premier message d'un fil vide. » Changement minimal : `started` passe à `true` dès le premier appel de `next()`, quelle que soit la longueur. Complément nécessaire dans `settle()` : un fil qui **ne défilait pas** avant le rendu (contenu qui tient) est considéré collé en bas ; si l'arrivée le fait déborder, il va en bas (sinon le message arrivé resterait sous le bord). Le reste (lot décalé, FLIP, réduction des animations, affichage progressif sans entrée) est inchangé.

**À changer dans `2026-11-fil-de-messages.md`** (fait par la tâche K1, avec un écart daté en §13 de cette spec-là) :
- §5 « Arrivée » : remplacer « Le premier rendu non vide (y compris une liste d'abord vide puis remplie) marque tous les `id` comme vus » par la règle ci-dessus.
- CA-T4 devient : « Premier rendu (vide ou non), affichage progressif et remplacement de liste sans `id` nouveau : aucune animation dans le fil immédiatement et après deux images. Fil monté vide puis un message : ce message joue l'entrée. Sous `reducedMotion: 'reduce'` […] (inchangé). »
- Docstring de `ArrivalTracker` et test `message-thread-motion.spec.ts` (« liste d'abord vide puis remplie : aucune arrivée ») réécrits ; contrôle CA-T4 de `tools/qa/message-thread-browser.mjs` : l'ouverture se prouve en montant directement six messages, et un nouveau contrôle monte `[]` puis un message.

**Ouverture d'un fil déjà rempli : inchangée** (aucune animation, défilé sur le dernier message s'il défile lui-même).

**Conséquence pour copro-ticket** (hors kit, à faire dans sa tâche T5 ou T11) : `request-messages` doit rendre `lc-message-thread` dès que la demande est chargée, **même avec une liste vide** (retirer `@if (thread().length > 0)`, garder la phrase de fil vide à côté), sinon le premier message crée le composant et reste une ouverture.

### 5.4 Interface utilisateur
- **Direction** : celle choisie par l'utilisateur dans copro-ticket (`docs/design/explorations/2026-11-suivi-conversation/3-rendu-final.html`, captures `final-*.png`) : bande à accrochage, fond du sélecteur et trait des onglets qui suivent le doigt, repères « une ligne, une pastille (icône, mot court, heure), couleur de l'état » (`.flag` de la maquette : phrase masquée lue en entier, règle `aria-hidden`, seconde ligne, bouton lien). Pas de nouvelle exploration dans le kit.
- **Stories** (règles `docs/storybook/CONVENTIONS.md`) : `SwipePanels` (Playground : `layout`, `chain`, nombre de panneaux), `Nested` (bande extérieure à deux panneaux, `lc-tabs` avec `swipe` dans le second : la maquette de copro-ticket en générique), `WithSegmentedControl` ; `lc-tabs` : `Swipe` ; `lc-message-thread` : `Conversation` enrichie de repères des six tons, avec seconde ligne et action ; stories `*.qa.stories.ts` pour les contrôles navigateur.
- **Textes** : aucun libellé du kit ajouté (les noms viennent du consommateur) ; `LC_LABELS` inchangé.
- **États** : un seul panneau (rien ne glisse, pas d'`inert`) ; zéro panneau (hôte vide) ; repère sans `tone` (neutre), sans `detail`, sans action.
- **Accessibilité** : panneaux cachés `inert` ; aucun nom ni rôle imposé à la bande ; trait et fond `aria-hidden` ; repère lu en phrase ; bouton d'action nommé par son libellé, cible ≥ 44 px ; `forced-colors` : indicateurs masqués, état porté par l'élément (règle de `2026-11-mouvement.md`).
- **Test `novice-user`** : sur captures de la story `Nested` à 360 px et de `Conversation` avec repères (CA-17).

## 6. Cas limites et gestion des erreurs
- `activeIndex` négatif, non entier ou ≥ n : ramené dans les bornes (arrondi, borné), avertissement en développement (`isDevMode()`), aucune exception.
- Clic sur un onglet pendant un glissement en cours : le dernier ordre gagne ; la sourdine repart de zéro.
- Glissement très court qui revient au même panneau : aucun événement.
- Navigateur sans `scrollend` (Safari avant 26.2) : fin de sourdine par le minuteur de 800 ms ; sans `scrollsnapchange` (Safari, Firefox) : l'`IntersectionObserver` suffit.
- Défilement animé interrompu par l'utilisateur : `scrollend` ou le minuteur rendent la main ; l'observateur reprend sur le panneau réellement accroché.
- Bande cachée (`display: none`, largeur nulle) : aucun calcul, `progress` inchangé ; reposé au retour par le `ResizeObserver`.
- `dir="rtl"` : `scrollLeft` négatif, valeur absolue ; la progression va de droite à gauche comme les onglets.
- Diagonale sur Android, geste retour d'iOS, chaînage de deux bandes sur iPhone : non jouables en automatique ; essai manuel par copro-ticket (T10, T16). Repli documenté : `chain: false` sur la bande intérieure.
- Focus dans un panneau qui devient `inert` : déplacé au panneau actif (jamais sur `body`).
- Repère sans `text` (vide après nettoyage) : ignoré comme aujourd'hui ; `tone` inconnu : `neutral` et avertissement en développement ; icône inconnue : comportement de `lc-icon`.
- Champs de repère sur un message non `system` : ignorés, avertissement en développement.
- Fil monté vide pendant un chargement par un futur consommateur : l'historique entrerait en lot (300 ms au plus) ; documenté dans le README (« monter le fil avec ses données ») et en §12.

## 7. Sécurité, performance, observabilité
- **Sécurité et données** : angle fermé (§0). `text`, `detail`, `ariaLabel` et `actionLabel` passent par `lcStripUnsafeChars` et l'interpolation Angular ; aucun `innerHTML` ; `systemAction` rend l'objet du message, sans URL.
- **Performance** : aucune dépendance ; défilement natif ; écouteurs passifs ; une lecture de `scrollLeft` par image ; le signal `progress` ne réveille que les gabarits qui le lisent (deux liaisons chez copro-ticket) ; trait et fond déplacés en `transform` seulement. Contrôle : aucun `Long Task` > 50 ms pendant un glissement scripté de la story `Nested` (CA-8).
- **Logs** : avertissements console en développement seulement.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| A. `lc-swipe-panels` seul ; le consommateur relie onglets et segmenté | Un seul composant nouveau | `lc-tabs` possède ses `tabpanel` : il faudrait un mode « onglets sans panneaux » et des `aria-controls` vers l'extérieur, fragiles ; le trait ne peut pas suivre sans API nouvelle | Non |
| B. Option `swipeable` sur `lc-tabs` et sur `lc-segmented-control` | Rien de nouveau à poser | Le segmenté est un contrôle de formulaire (`radiogroup`) : lui faire porter des panneaux mélange deux rôles ; pas de bande réutilisable pour le niveau 1 ni pour un autre contenu | Non |
| **C. `lc-swipe-panels` + option `swipe` de `lc-tabs` (qui le compose) + `indicatorProgress` du segmenté** | ARIA de `lc-tabs` intact (il garde ses panneaux) ; une seule implémentation de la bande ; le segmenté reste un contrôle ; aucun import croisé | Trois composants touchés ; une sortie `selectionChange` en plus sur `lc-tabs` | **Oui** |
| Index déduit du seul défilement, sans `IntersectionObserver` (calcul à `scroll`) | Moins de code | Bascule à mi-chemin, pas de seuil ; la maquette prouve le seuil de 60 % | Non |
| Mode colonnes détecté (débordement mesuré, comme `swipe1` de la maquette) | Bascule par CSS seul (requêtes de conteneur) | Les styles du consommateur devraient réécrire ceux du composant ; copro-ticket a déjà le signal « zone ≥ 832 px » (CA-13) | Non : `layout` explicite |
| Repère dans un composant à part (`lc-thread-mark` projeté) | Modèle du fil inchangé | Le fil ne sait pas projeter des éléments au milieu de ses messages (ordre, regroupement, arrivées) | Non |
| Repère avec champ objet `system: { tone, icon, … }` | Champs regroupés | ADR 0010 : les données restent à plat | Non |
| Arrivée : entrée `loading` sur le fil | Protège un fil monté avant ses données | Aucun consommateur ne le fait ; API en plus | Non (Q5) |
| Arrivée : « un seul message après une liste vide anime, plusieurs = ouverture » | Aucune API | Heuristique surprenante (chargement d'un fil d'un seul message animé) | Non |

## 9. Plan de test
- **Unitaires** (Vitest, `senior-developer`) : `ArrivalTracker` (vide puis un message : une arrivée ; non vide d'abord : aucune) ; `lcIndicatorRect` (bornes, valeurs entières et réelles, rtl) ; `lc-swipe-panels` (bornes de `activeIndex`, `inert`, `layout`, émission seulement au glissement, avec `IntersectionObserver` simulé) ; `lc-tabs` en `swipe` (tous les panneaux créés, `inert` au lieu de `hidden`, `selectionChange` et sa source) ; repère (DOM, phrase masquée, `aria-hidden`, action, tons, nettoyage des textes, avertissements).
- **Acceptation en navigateur** (`qa-engineer`, Chromium par Playwright sur le Storybook statique, nouvelle commande `node tools/qa/storybook-browser.mjs swipe` sur le modèle de `motion` ; contrôles du fil dans `tools/qa/message-thread-browser.mjs`) : contextes normal, `reducedMotion: 'reduce'`, `forcedColors: 'active'`, 360 et 1 280 px ; glissement par `scrollTo({ left })` et `mouse.wheel` horizontal ; mesures par `getAnimations()`, `getBoundingClientRect()` et attributs lus dans le même `evaluate` ; aucun `waitForTimeout`.
- **Manuel** : iPhone (Safari) et Android (Chrome) dans copro-ticket (T10, T16 de sa spec) : glissement, chaînage, geste retour, diagonale.
- **Architecture** : `forms` n'importe pas `navigation` (contrôle existant des imports entre points d'entrée) ; `catalogue:check` vert.

## 10. Critères d'acceptation
Cochés à la livraison, avec le test qui les prouve.
- [x] CA-1 (O1) : Story `SwipePanels` à 360 px, trois panneaux : `scrollTo({ left: 2 × clientWidth })` puis fin du défilement : `activeIndexChange` émis une fois avec `2`, le panneau 2 sans `inert`, les panneaux 0 et 1 avec `inert`. *Preuve : `storybook-browser.mjs swipe` (Playground, 360 px).*
- [x] CA-2 (O1) : Changer `activeIndex` depuis le parent fait défiler la bande jusqu'au panneau (± 1 px) **sans** émettre `activeIndexChange` ; aucun panneau intermédiaire ne devient actif pendant le défilement (sourdine) ; le parent qui réécrit l'index reçu ne relance aucun défilement (un seul `scroll` de fin observé). *Preuve : `swipe` (Playground : 0 → 2, sourdine ; WithSegmentedControl : un seul `scrollend`).*
- [x] CA-3 (O1) : Sans `scrollend` (événement retiré par le test), la sourdine se termine au plus tard 800 ms après le `scrollTo` et un glissement suivant est de nouveau suivi. *Preuve : `swipe` (`scrollend` retiré, glissement suivi à 850 ms).*
- [x] CA-4 (O2) : Story `Nested` : la bande intérieure (`lc-tabs` en `swipe`, `chain: true`) au premier panneau, `mouse.wheel` horizontal vers le début : la bande extérieure revient au panneau 0 ; avec `chain: false`, elle ne bouge pas. `overscroll-behavior-x` calculé vaut `auto` puis `contain`. *Preuve : `swipe` (Nested, molette, `chain` vrai et faux).*
- [x] CA-5 (O3) : Pendant un glissement scripté à mi-chemin entre les panneaux 0 et 1, `progress()` vaut 0,5 (± 0,02), `--lc-swipe-panels-progress` aussi ; le trait de `lc-tabs` et le fond de `lc-segmented-control` (`indicatorProgress` lié) sont à mi-chemin entre les deux éléments en position et en largeur (± 1 px) et n'ont aucune animation en cours. *Preuve : `swipe` (WithSegmentedControl et tabs `Swipe`, mi-chemin).*
- [x] CA-6 (O4) : Avec `reducedMotion: 'reduce'`, un clic d'onglet ou un changement d'index fait défiler avec `behavior: 'instant'` (bande à sa place à l'image suivante, ± 1 px) ; aucune animation sur le trait ni le fond. *Preuve : `swipe` (contexte `reducedMotion`, clic d'onglet et index ; contrôle `smooth` hors réduction).*
- [x] CA-7 (O4) : Tab depuis l'élément qui précède la bande n'atteint aucun élément d'un panneau `inert` ; le focus posé dans le panneau 0 puis un glissement vers le panneau 1 : `document.activeElement` est le panneau 1 (jamais `body`). *Preuve : `swipe` (Tab, focus ramené au panneau 1).*
- [x] CA-8 (O1) : Story `Nested` à 360 px : 20 glissements scriptés successifs, aucune tâche longue > 50 ms (`PerformanceObserver` `longtask`), aucune erreur de console. *Preuve : `swipe` (Nested, 20 glissements, page au repos).*
- [x] CA-9 (O5) : Basculer `layout` de `strip` (panneau 1 actif) à `columns` puis à `strip` : aucun panneau recréé (même nœud DOM, champ saisi conservé), aucun `inert` en colonnes, panneau 1 de nouveau affiché (± 1 px) ; en colonnes, `--lc-swipe-panels-columns: minmax(0, 1fr) 21rem` donne un second panneau de 21 rem (± 1 px). *Preuve : `swipe` (Playground : colonnes, 21 rem, retour en bande ; 1 280 px).*
- [x] CA-10 (O4) : Rotation simulée (360 → 740 px de large) en mode bande : le panneau actif reste aligné (± 1 px), aucun `activeIndexChange` émis. *Preuve : `swipe` (rotation 360 → 708 px de contenu).*
- [x] CA-11 (O1) : `lc-tabs` avec `swipe` : tous les `tabpanel` existent dès le premier affichage, les non sélectionnés portent `inert` et pas `hidden` ; clic sur un onglet : `selectionChange` `{ id, source: 'tab' }` ; glissement : `{ id, source: 'swipe' }` ; flèches du clavier inchangées. Sans `swipe`, `lc-tabs` se comporte exactement comme avant (tests existants verts, inchangés). *Preuve : `swipe` (DOM, clic, flèches) et `tabs.component.spec.ts` (`selectionChange` et sa source).*
- [x] CA-12 (O6) : Repère `{ kind: 'system', text: 'En attente', tone: 'warning', icon: 'clock', detail: 'Attente devis', ariaLabel: 'Marc a mis la demande en attente, 12 nov. 2026 à 09:40', actionLabel: 'Voir' }` : un `lc-status-badge` de ton `warning`, icône `clock`, texte « En attente » et `<time>` ; seconde ligne « Attente devis » ; la phrase est le seul texte non `aria-hidden` hors bouton ; un clic sur « Voir » émet `systemAction` une fois avec ce message ; le bouton mesure au moins 44 px de haut. *Preuve : `message-thread.component.spec.ts` et `message-thread-browser.mjs systemAction` (44 px).*
- [ ] CA-13 (O6) : Repère sans `tone`, `icon` ni `ariaLabel` : ton `neutral`, icône du ton, texte lu = mot court, seconde ligne éventuelle et heure. Les six tons rendus dans les deux thèmes passent le contrôle de contraste existant (pastille et texte ≥ 4,5:1). *Texte lu et ton neutre prouvés (`message-thread.component.spec.ts`) ; contraste : axe sans violation sur `Conversation` dans les deux thèmes, mais le contrôle des six tons n'a pas été exécuté : non prouvé.*
- [x] CA-14 (O6) : Caractères de contrôle et marqueurs bidi retirés de `text`, `detail`, `ariaLabel` et `actionLabel` ; un repère reste hors groupe (CA-T7 inchangé) et entre avec l'animation d'arrivée quand il est nouveau. *Preuve : `message-thread.component.spec.ts` (nettoyage), `message-thread-browser.mjs layout` et `motion` (hors groupe, arrivée).*
- [x] CA-15 (O7) : Fil monté avec `[]`, puis un message : ce message joue l'entrée (`getAnimations()` non vide sur sa bulle) ; sous `reducedMotion: 'reduce'`, le fondu seul. Fil monté directement avec six messages : aucune animation, immédiatement et après deux images ; remplacement sans `id` nouveau : aucune animation (CA-T4 réécrit). *Preuve : `message-thread-browser.mjs motion` (CA-T4 réécrit).*
- [x] CA-16 (O7) : Fil de hauteur limitée dont le contenu tient, puis une arrivée qui le fait déborder : le fil est en bas (`scrollHeight − scrollTop − clientHeight ≤ 1`) et le message arrivé visible. *Preuve : `message-thread-browser.mjs motion` (fil qui déborde).*
- [ ] CA-17 (O4, O6, manuel) : Test `novice-user` sur captures (story `Nested` à 360 px, `Conversation` avec repères, deux thèmes) : aucun blocage pour dire où l'on est, changer de rubrique, et comprendre ce qu'un repère annonce. *À faire par la session principale (test `novice-user` sur captures).*
- [ ] CA-18 (tous) : `npx ng test ui-angular --watch=false`, `npm run build`, `npm run catalogue:check`, `npm test --workspace @lionelcointot/ui-tokens` verts ; README des composants et `CLAUDE.md` (liste des specs) à jour ; copro-ticket adapté dans la même passe (renommage de `system-color`, rendu des repères). *Verts le 2026-11-22 sauf 3 tests Intl (voir écarts) ; README et `CLAUDE.md` à jour ; copro-ticket hors de ce dépôt, non vérifié ici.*

## 11. Découpage en tâches
Une tâche = un appel à `senior-developer`, une branche, puis vérification.
- [x] K1 : Arrivée du premier message : `ArrivalTracker` (premier rendu = ouverture, vide ou non), fil qui tenait considéré collé en bas, tests unitaires et navigateur, CA-T4 et §5 de `2026-11-fil-de-messages.md` réécrits avec un écart daté. (S, CA-15, CA-16) **En premier : c'est le défaut vu par l'utilisateur.** Dans copro-ticket, même passe : `request-messages` monte le fil même vide.
- [x] K2 : Repères : modèle, gabarit avec `lc-status-badge`, phrase masquée, seconde ligne, action et `systemAction`, jetons (`system-detail-color` à la place de `system-color`), story `Conversation`, tests. (M, CA-12 à CA-14)
- [x] K3 : `lc-swipe-panels` et `[lcSwipePanel]` : bande, synchro, sourdine et repli, `inert` et focus, progression, redimensionnement, mode colonnes, jetons, stories `SwipePanels` et `WithSegmentedControl` (sans indicateur), tests unitaires, commande `storybook-browser.mjs swipe`. (M, CA-1 à CA-3, CA-6 à CA-10)
- [x] K4 : `lcIndicatorRect` (principal) et `lc-tabs` en `swipe` : composition de la bande, panneaux tous créés, `inert`, trait qui suit, `selectionChange`, story `Swipe` et `Nested`. (M, CA-4, CA-5 pour le trait, CA-11)
- [x] K5 : `lc-segmented-control` : `indicatorProgress` et fond qui glisse. (S, CA-5 pour le fond) *Peut attendre si Q6 le reporte.*
- [ ] K6 : Catalogue, README, `CLAUDE.md`, contrôles de qualité ; captures et test `novice-user`. (S, CA-17, CA-18)

Ordre : K1 ; K2 et K3 en parallèle ; K4 ; K5 ; K6. Côté copro-ticket : son assemblage local (T4) peut suivre le contrat de §5.3 pour que le remplacement ne touche que l'import. Estimation grossière : 4 à 5 jours.

## 12. Risques et questions ouvertes
- **Hypothèses** (non dites par l'utilisateur) :
  - H1 : le geste retour d'iOS se règle par une marge de bord (`gutter`), pas par du code ; Safari ne laisse pas une page intercepter ce geste.
  - H2 : 800 ms suffisent au repli de `scrollend` (valeur de la maquette ; un défilement `smooth` d'un panneau dure environ 300 à 500 ms).
  - H3 : aucun consommateur ne monte `lc-message-thread` avant ses données (vérifié pour copro-ticket : le fil est dans l'état « prêt » de la page).
  - H4 : copro-ticket passe ses sélecteurs en `aria-checked` (rôle `radio` du segmenté du kit) ; sa spec écrit `aria-pressed` (CA-10 de copro-ticket) : à corriger là-bas.
- **Questions pour l'utilisateur** :
  - Q1 : Le nom `lc-swipe-panels`, dans `navigation`, vous convient-il ? (Autre proposition : `lc-panel-strip`.)
  - Q2 : Option C (§8 : un composant de bande que `lc-tabs` utilise en interne, plus un fond qui suit sur le segmenté) plutôt qu'une option sur les deux contrôles (B) ?
  - Q3 : La couleur sable « Prise en charge » : posée par copro-ticket avec `cssClass` (recommandé, rien de nouveau dans le kit), ou un septième ton `accent` dans le kit ?
  - Q4 : Le bouton « Revoir votre demande » dans le repère (`actionLabel`, rendu par le kit), ou un lien posé par copro-ticket hors du fil ?
  - Q5 : Premier rendu vide = ouverture, sans entrée `loading` (recommandé) ?
  - Q6 : Le fond du segmenté qui suit le doigt : dans ce chantier (K5) ou plus tard (le trait des onglets suit déjà) ?
- **Risques** :
  - Glissement imbriqué et diagonales sur appareils réels : prouvés dans Chromium seulement ; repli `chain: false`.
  - `scroll-snap-stop: always` sur un trackpad rapide peut paraître « collant » sur ordinateur : à observer en K3, sans option tant que personne ne le demande.
  - Tous les panneaux de `lc-tabs` créés d'office en `swipe` : coût si un panneau est lourd (galerie de photos de copro-ticket) ; mesuré en K4 (CA-8).
  - Renommage `system-color` → `system-detail-color` : casse franchement (phase de développement) ; copro-ticket corrigé dans la même passe.
- **Dettes** : aucune prévue.
- **Questions ouvertes** : Q1 à Q6.

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| | `cadreur` | cadrage | À faire | |
| | `architect` | conception | À faire | |
| | `security-reviewer` | conception | N/A | Angle fermé (§0). |
| | `qa-engineer` | plan de test | À faire | |

**Écarts constatés à l'implémentation** (vérification du 2026-11-22, `qa-engineer`) :
- Story `Playground` au lieu de `SwipePanels` (les stories sont `Playground`, `WithSegmentedControl`, `Nested` ; `Swipe` dans `lc-tabs`) ; les commandes navigateur s'appuient sur ces identifiants.
- Le trait des onglets et le fond du segmenté n'ont pas de transition au clic : ils suivent `progress()`, donc le défilement (aucune animation, comme CA-5 et CA-6 le demandent).
- Aucun nouveau jeton pour le fond du segmenté (il reprend ceux du segment).
- CA-13 : le contrôle de contraste des six tons dans les deux thèmes n'a pas été exécuté ; seul axe sur `Conversation` (clair et sombre) passe.
- CA-17 (test `novice-user`) et captures : non faits dans cette passe.
- CA-5 mesuré avec `scroll-snap-type: none` posé par le test pour tenir la position intermédiaire (Chromium ré-accroche un `scrollTo` à mi-chemin).
- CA-10 : le conteneur de la story est élargi à 740 px de viewport, le contenu mesure 708 px (marge du corps de Storybook).
- CA-8 : Chromium produit une tâche longue (50 à 90 ms) pendant le démarrage de Storybook et d'Angular ; la mesure commence une fois la page au repos (aucune tâche longue pendant les 20 glissements, 3 exécutions).
- Environnement : Node 22.23 (le kit demande ≥ 24.15) ; 3 tests Intl en échec sans rapport avec ce chantier (`builders.spec.ts` ×2, `format.service.spec.ts` ×1 : « 250,0k€ » au lieu de « 250k€ »).
- Non prouvés : glissement tactile réel, geste retour d'iOS, diagonales (appareils réels, §9 « Manuel »), `forcedColors`, Firefox et WebKit (absents du poste).
