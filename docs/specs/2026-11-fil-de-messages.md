# Spec : Fil de messages générique (`lc-message-thread`, PR 2 de la messagerie)

- **Statut** : Livrée (PR du kit, 2026-11-22) ; F6 (copro-ticket) à venir
- **Auteur** : session principale
- **Date** : 2026-11-21
- **ADR liés** : 0009 (cible navigateurs)
- **Spec parente** : `2026-11-messagerie.md` (décisions 1, 4, 12, 13 ; la zone de saisie `lc-message-composer` est livrée)

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « Car cela pourrai etre un composant chat configurable generique permettant d'afficher ou non la saisie texte etc... les datas avec des template etc... »
  - « Les 2 mais tu oeux faire en 2 pr »
  - « Tu pourra rajouter une animation comme sur imessage qui pop a droite ou gauche avec l'anmiation ressort ios »
  - Après la démo `docs/design/explorations/2026-11-messagerie/bulles.html` : « Je prefere la B il faudra faire attention que des le debut, le message qui apparait pousse bien vers le haut car parfois quand il y a plusieurs message venant du meme cote, et il faut biensur pour eviter tout probleme de droit avec un aspect visuel different ( avec le nom et la date etc..) »
- **Décisions prises pendant le cadrage** (2026-11-21, utilisateur) :
  1. Messages consécutifs du même auteur regroupés : nom et date une seule fois en tête du groupe, bulles suivantes serrées, une date réapparaît après plusieurs minutes d'écart ; séparateur de jour (« Aujourd'hui », « Hier », « 18 nov. ») (réponse « A »).
  2. Avatar (`lc-avatar`) à gauche des messages des autres, une fois par groupe au niveau de la dernière bulle ; aucun pour ses propres messages ; option pour le masquer (réponse « A et donne toutes tes questions d'un coup »).
  Questions 3 à 11 posées d'un coup ; à la demande « Peux tu me donner tes recommandation » puis « Oui vas y » : recommandations A retenues partout.
  3. Note interne : une classe posée par l'application sur le message redéfinit les tokens de bordure et de fond de la bulle (pointillés), comme pour `lc-message-composer`.
  4. Pièces jointes : vignettes dans la bulle (aperçu des photos) ; un clic émet un événement, l'application décide (copro-ticket ouvre la photo dans un nouvel onglet).
  5. État d'un message envoyé : « Envoi… » discret, puis en échec « Non envoyé » avec « Réessayer » ; pas d'accusé de lecture.
  6. Anciens messages : bouton « Messages précédents » en haut ; l'application charge la suite ; la position de lecture ne bouge pas.
  7. Message qui arrive pendant la lecture plus haut : pas de saut, pastille « Nouveau message ↓ » ; à l'ouverture, le fil s'affiche sur le dernier message.
  8. Messages système (« Demande qualifiée par Marc ») : ligne courte, centrée, grise, avec l'heure.
  9. Liens : adresses `http(s)` cliquables (nouvel onglet), retours à la ligne conservés, rien d'autre interprété.
  10. Dépôt de fichiers sur tout le fil : option, désactivée par défaut.
  11. copro-ticket adopte le fil dans une PR séparée après celle du kit (demandeur et gestionnaire, notes internes comprises).
  Fixé par la session : ressort seulement pour un message qui arrive (jamais au premier affichage ni au chargement des anciens) ; messages précédents poussés dès la première image, sans trou ; fondu seul en réduction des animations ; aspect propre au kit, sans la forme des bulles d'Apple ; fil annoncé aux lecteurs d'écran.
  12. Défilement (question du `cadreur` ; réponse : « Ben, ça dépend comment CopoTicket intègre le composant, non? Si il l'intègre dans un div ou dans un flex, il est contenu uniquement dans ce div et dans ce flex, et en fonction du style défini par ces derniers, non? ») : aucune option ; le composant remplit son conteneur (colonne flex, fil puis zone de saisie) ; si le parent limite la hauteur, le fil défile à l'intérieur et la saisie reste en bas ; sinon il s'allonge et la page défile. Le composant détecte s'il défile lui-même : ouverture sur le dernier message et pastille « Nouveau message ↓ » seulement dans ce cas.
  Fixé par la session après le `cadreur` : l'application fournit un identifiant d'auteur par message (clé du regroupement) ; avatar en initiales du nom (`lc-avatar`) ; un changement de visibilité (note interne / public) rompt un groupe ; écart de regroupement 5 minutes ; jours selon la langue (`LC_LABELS`, locale) et le fuseau du navigateur ; ordre du plus ancien au plus récent ; « message qui arrive » = identifiant absent de la liste précédente.
  13. Périmètre selon le consommateur (question du `cadreur`) : « En effet, on ne va pas implémenter s'il n'utilise pas coproticket. Par contre, le message système, j'aime beaucoup et je pense que coproticket pourrait s'en servir afin d'afficher les actions importantes comme mettre en pause, résolu, etc. Au lieu d'avoir une bannière tout au-dessus, ce qui est fait actuellement. Dans coproticket. » : hors PR 2 (prévus plus tard, avec un besoin) : état « Envoi… / Non envoyé » (5), « Messages précédents » (6), dépôt sur tout le fil (10) ; gardé : messages système (8), consommés par copro-ticket pour les actions importantes (mise en pause, résolution…) à la place de la bannière actuelle en haut de la demande ; la pastille « Nouveau message ↓ » et l'ouverture sur le dernier message (7) ne sont livrées que si copro-ticket pose le fil dans un conteneur de hauteur limitée (à trancher au cadrage de son adoption).
  14. Direction visuelle **A** (bulles douces et pleines, maquette `docs/design/explorations/2026-11-fil-de-messages/index.html`) : « Visuellement je prefere la A mais par contre gerer avec le scroll pour afficher plus automatiquement » ; précision « B » à la question suivante :
  15. Affichage progressif (réponse « B ») : l'application fournit tous les messages ; le fil n'affiche d'abord que les plus récents et révèle les plus anciens tout seuls en remontant, sans saut ; pas de pagination serveur pour l'instant.
  16. Animation d'arrivée : après la démo `docs/design/explorations/2026-11-fil-de-messages/demo-arrivee.html` (A existant sans rebond, B ressort) et un point sur les droits (mouvement générique, aspect propre au kit) : « On prend l'animation apple et oui pour les autres » : ressort retenu (B), jeton de composant `--lc-message-thread-enter-easing` ; exception écrite à la décision 27 de `2026-11-mouvement.md`.
  17. (« oui pour les autres ») Pas de gabarit de contenu de bulle pour l'instant : texte, liens, vignettes et `mention` suffisent à copro-ticket ; un gabarit viendra avec un besoin.
  18. (idem) copro-ticket ajoute l'identifiant de l'auteur à son API (`MessageView.authorId`) et régénère son client, dans la PR d'adoption.
  19. (idem) Dans copro-ticket, le bloc d'état garde ses actions (« Oui, c'est réglé / Non », lien, téléphone) ; son texte d'information passe dans le fil en messages système (« Demande mise en pause par Marc · 09:41 », avec « · motif : … » quand il y en a un).
  20. Validation (2026-11-21) : « Oui et faut bien faire en sorte que c'est un composant generique et facilement A implémenter » : usage minimal `<lc-message-thread [messages]="messages" />` sans autre réglage (valeurs par défaut sûres, libellés `LC_LABELS`), aucun vocabulaire métier, README avec un exemple de dix lignes au plus, story `Minimal` (CA-T19).
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : nouveau composant, templates, projection de `lc-message-composer` (aucun import entre points d'entrée).
  - [x] Écran : nouveau composant visible ; directions maquettées, choix de l'utilisateur, test `novice-user`.
  - [x] Sécurité et données : liens cliquables (décision 9 : seulement `http(s)`, `rel=noopener noreferrer`, sans `innerHTML`), noms et contenus fournis par l'application.

## 1. Contexte et problème
copro-ticket affiche ses échanges par une liste locale de `lc-message` (`request-messages.component.ts`) et les actions importantes (mise en pause, résolution…) par une bannière en haut de la demande. Il n'existe pas de fil de messages générique : regroupement par auteur, séparateurs de jour, arrivée animée, messages système. La zone de saisie (`lc-message-composer`, PR 1) est livrée ; le fil est sa moitié manquante.

## 2. Objectifs
- O1 : composant générique `lc-message-thread` : messages regroupés par auteur, avatar, séparateurs de jour, direction A (décisions 1, 2, 14).
- O2 : arrivée d'un message en ressort, messages précédents poussés dès la première image (décisions 12, 13 de la spec parente).
- O3 : note interne par classe d'application (décision 3), vignettes cliquables (4), messages système (8), liens (9).
- O4 : défilement selon le conteneur et affichage progressif en remontant (décisions 12, 15).
- O5 : copro-ticket l'adopte dans une PR séparée (décision 11), messages système à la place de la bannière (13).

## 3. Hors périmètre (non-objectifs)
- État « Envoi… / Non envoyé », bouton « Messages précédents », chargement serveur des anciens messages, dépôt sur tout le fil (décision 13 ; prévus plus tard, avec un besoin).
- Accusé de lecture, réactions, réponses citées, édition ou suppression d'un message, mise en forme riche.
- Pastille « Nouveau message ↓ » et ouverture sur le dernier message : seulement si copro-ticket pose le fil dans un conteneur de hauteur limitée (décision 13) ; sinon hors PR 2.

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** (confirmé pour la messagerie, spec parente §4) : copropriétaire débutant sur téléphone ; en second, gestionnaire sur ordinateur.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Copropriétaire | Lit les échanges d'une demande | Ses messages à droite, ceux du syndic à gauche avec nom, avatar et date ; jours séparés |
| Copropriétaire | Envoie un message | Sa bulle arrive à droite en ressort, les précédentes remontent sans trou |
| Gestionnaire | Lit une longue demande | Les plus anciens messages apparaissent en remontant, sans saut |
| Gestionnaire | Voit une note interne | Bulle en pointillés et fond d'avertissement (classe de l'application) |
| Tous | Voit « Demande mise en pause par Marc · 09:41 » | Ligne système centrée, grise, avec l'heure |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
- `lc-message-thread` dans le point d'entrée `feedback` (`packages/angular/feedback/src/message-thread/`), à côté de `lc-message` ; `lc-avatar` vient du point d'entrée principal : aucun nouvel import entre points d'entrée. La zone de saisie est projetée (`[lcThreadComposer]`) : le fil n'importe pas `forms`.
- Le fil porte sa propre bulle (`.lc-message-thread__bubble`, jetons `--lc-message-thread-*`) : `lc-message` impose un en-tête permanent, une annonce de variante et un tag de restriction incompatibles avec le regroupement. `lc-message` reste inchangé (ses 16 tests CA-D3 passent sans modification) ; son retrait sera examiné après l'adoption par copro-ticket.
- `isSafePreviewUrl` et le nettoyage des caractères de contrôle et bidi (`cleanFileName` renommé `lcStripUnsafeChars`) passent dans `packages/angular/src/lib/core/safe-text.ts`, exportés par le point d'entrée principal ; `forms` et `feedback` les importent de là (pas de nouvel import entre points d'entrée secondaires ; contrat public : deux fonctions ajoutées).
- Regroupement en fonction pure (`message-thread-grouping.ts`), testée seule.
- Structure : colonne flex qui remplit son conteneur (fil puis saisie projetée). Le composant détecte s'il défile lui-même (`scrollHeight > clientHeight` sur sa zone) ; sinon la page défile (décision 12).
- Regroupement calculé par le composant : même `authorId`, même visibilité (classe), moins de 5 minutes d'écart, même jour ; séparateur de jour selon la langue (`LC_LABELS`, `Intl`) et le fuseau du navigateur.
- Arrivée : un message dont l'`id` n'était pas dans la liste précédente joue l'entrée (agrandissement `scale` depuis le coin de la bulle, ressort `linear()` du jeton de composant `--lc-message-thread-enter-easing`, fondu) ; les messages déjà affichés glissent de l'écart (FLIP en `translate`, jetons existants `--lc-list-move-*`) dès la première image, mesurés avant et écrits dans la même image (`afterRenderEffect`) ; propriétés individuelles `translate` et `scale` (pas de conflit) ; plusieurs arrivées décalées de `enter-stagger` (plafond 300 ms). Le premier rendu non vide (y compris une liste d'abord vide puis remplie) marque tous les `id` comme vus. Jamais d'entrée à l'affichage progressif. Réduction des animations : fondu seul, ni ressort ni FLIP (le fondu doit survivre à la règle globale de `base.css`, comme `lc-message-composer`).
- Le ressort est une exception assumée à la décision 27 de `2026-11-mouvement.md` (pas de jeton `sys` de ressort) : il reste un jeton de composant, utilisé seulement ici (note ajoutée au CA-24 de cette spec).
- Affichage progressif (décision 15) : seuls les `pageSize` (30) derniers messages sont rendus ; quand le haut du fil devient visible (`IntersectionObserver` sur une sentinelle), 30 de plus sont rendus (`aria-busy` pendant l'insertion) et la position de lecture est conservée par compensation (`scrollTop` en défilement interne, `window.scrollBy` en défilement de page), avec `overflow-anchor: none` pour un comportement identique dans les trois moteurs. « Défile-t-il lui-même ? » est recalculé par `ResizeObserver` (clavier mobile, rotation).
- Liens : le texte est découpé en morceaux texte / adresse `http(s)` ; les adresses sont rendues en `<a target="_blank" rel="noopener noreferrer">` ; jamais d'`innerHTML`.

### 5.2 Modèle de données
```ts
interface LcThreadMessage {
  id: string;                 // stable ; sert à détecter l'arrivée
  authorId: string;           // clé du regroupement
  authorName: string;         // affiché en tête de groupe ; initiales de l'avatar
  mine: boolean;              // droite / gauche
  sentAt: Date | string;      // ISO ; jours et heures
  text?: string;              // peut être vide si pièces jointes
  attachments?: LcThreadAttachment[];
  kind?: 'message' | 'system';// système : ligne centrée
  cssClass?: string;          // posée par l'application (note interne)
  mention?: string;           // texte court sous l'en-tête (« Note interne »)
}
interface LcThreadAttachment { id: string; name: string; previewUrl?: string; }
```
`sentAt` en chaîne ISO seulement. Tokens (`message-thread.tokens.json`, valeurs en `{sys.*}` sauf mention) : `bubble-background-mine` / `bubble-color-mine` (`primary-container` / `on-primary-container`), `bubble-background-other` / `bubble-color-other` (`secondary-container` / `on-secondary-container`), `bubble-border-width` (0), `-style` (`solid`), `-color` (`transparent`), `bubble-radius` (`radius-lg` × 1,5), `bubble-radius-tight` (`radius-sm`), `bubble-padding-block` / `-inline`, `bubble-gap`, `bubble-max-width` (26 rem), `bubble-max-share` (0,8 : une bulle laisse au moins 20 % de vide du côté opposé, constat du test novice), `group-gap`, `thread-padding`, `avatar-size` (2 rem), `thumb-width` / `thumb-height`, `day-background` / `day-color`, `meta-color`, `system-color` ; mouvement : `enter-easing` (`linear()` du ressort, valeur de composant), `enter-duration` (550 ms, calé sur le ressort), `enter-scale` (0,6), `enter-fade-duration` (`duration-normal`), `enter-stagger` (`motion-stagger`). Surcharges d'application non définies par le kit, lues en premier : `--lc-message-thread-bubble-background`, `--lc-message-thread-bubble-color` (la note interne les pose avec les jetons de bordure, quel que soit le côté).

### 5.3 API / interfaces
```html
<lc-message-thread [messages]="messages" [showAvatars]="true" [pageSize]="30"
  (attachmentOpen)="open($event)" ariaLabel="Échanges">
  <lc-message-composer lcThreadComposer … />                        <!-- facultatif -->
</lc-message-thread>
```
- `attachmentOpen` : `{ message: LcThreadMessage; attachment: LcThreadAttachment }`.
- Libellés `LC_LABELS` (fr, en) : `threadToday`, `threadYesterday`, `threadLabel`, `threadAttachmentOpen(name)`.
- `previewUrl` filtré par `isSafePreviewUrl` du principal (`blob:`, `data:image/`, même origine http(s)) ; l'application fournit la vignette, authentification comprise.
- `authorName` est fourni tel quel par l'application (« Vous » pour ses propres messages) : le kit n'a pas de libellé « moi ».
- Un `id` en double : le premier est rendu, avertissement en développement.

### 5.4 Interface utilisateur
Direction **A** choisie (bulles douces et pleines ; maquette `docs/design/explorations/2026-11-fil-de-messages/index.html`, section « A retenue », captures `capture-a-1280.png`, `capture-a-360.png`). Brief de `ui-ux-designer` (2026-11-21) :
- **Structure** : `role="log"` nommé (`threadLabel`), `tabindex="0"` seulement quand il défile ; sentinelle en haut ; séparateur de jour (pastille centrée, `<time>`) ; groupe en ligne flex (`align-items: flex-end`) : avatar des autres (une fois, au niveau de la dernière bulle, `aria-hidden`), puis en-tête (`<bdi>` nom, `<time>`, `mention` avec cadenas décoratif) et bulles ; heure intermédiaire après ≥ 5 min ; ligne système centrée (texte · heure) hors groupe ; zone de saisie projetée dessous.
- **Rayons** : `bubble-radius` partout ; dans un groupe, coins côté auteur resserrés (`bubble-radius-tight`) entre bulles ; propriétés logiques ; pas de queue ni de forme d'Apple.
- **Contrastes calculés** : texte sur bulle « moi » 9,0:1 ; « autres » 15,2:1 (clair) / 12,2:1 (sombre) ; note interne 8,8:1 / 12,9:1 ; métadonnées 7,7:1 / 9,7:1 ; anneau de focus ≥ 3,3:1. Les liens héritent de la couleur de la bulle, soulignés.
- **Vignettes** : `<button>` 6 × 4,5 rem (≥ 44 px), `radius-md`, `<img width height alt>` en `object-fit: cover`, nom accessible `threadAttachmentOpen(name)`.
- **Animations** : entrée `scale` depuis le coin extérieur (bas droite pour moi, bas gauche pour les autres) + fondu ; FLIP des précédents ; réduction : fondu seul. **forced-colors** : bulle bordée `CanvasText`, vignette `ButtonText`, focus `Highlight`, pointillés de la note conservés.
- **Accessibilité** : `role="log"` (polite implicite) ; ordre chronologique ; insertion des anciens messages sous `aria-busy` ; l'arrivée d'un message ne déplace jamais le focus.
- **Métadonnées** (nom, heure, ligne système) en `font-size-sm` (14 px), choisi pour un débutant sur téléphone ; texte courant en `font-size-md`.
- **360 px** : bulles repliées (`overflow-wrap: anywhere`), vignettes à la ligne, aucun défilement horizontal.
- Test `novice-user` sur captures : CA-T12.

## 6. Cas limites et gestion des erreurs
- Liste vide : rien (l'application affiche son état vide).
- Message sans texte (pièces jointes seules, R12 de copro-ticket) : bulle de vignettes sans zone de texte vide.
- Plusieurs messages arrivent d'un coup : tous jouent l'entrée, un léger décalage entre eux.
- Messages arrivés dans le désordre ou `sentAt` invalide : ordre de la liste conservé, date non affichée et avertissement en développement.
- Remplacement complet de la liste (rechargement) : seuls les identifiants nouveaux jouent l'entrée.
- Adresse suivie d'une ponctuation (`…/1234.`) : la ponctuation finale n'entre pas dans le lien.

## 7. Sécurité, performance, observabilité
- **Sécurité** : aucun `innerHTML` ; liens seulement `http:`/`https:`, `rel="noopener noreferrer"`, nouvel onglet ; noms isolés (`<bdi>`), caractères de contrôle et bidi retirés ; `previewUrl` filtré (`blob:`, `data:image/`, même origine http(s)) ; aucun texte de message dans la console.
- Performance : 30 messages rendus par défaut, 30 de plus en remontant ; mesures FLIP une fois par changement de liste.
- Logs : avertissements en développement seulement.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Bouton « Messages précédents » | Simple | Un clic de plus | Non : affichage automatique (décision 15) |
| Pagination serveur | Listes illimitées | Changement d'API copro-ticket | Plus tard |
| Directions B ou C | Plus sobres | Préférence de l'utilisateur | Non (décision 14) |

## 9. Plan de test
- Unitaires (Vitest) : regroupement (auteur, visibilité, 5 minutes, jour), séparateurs, détection d'arrivée, découpage des liens, affichage progressif, libellés.
- Acceptation (Chromium, `tools/qa/message-thread-browser.mjs`) : ressort et poussée sans trou (y compris plusieurs messages du même côté), réduction, défilement interne ou de page, position conservée en remontant, axe, liens, CSP.
- copro-ticket : PR séparée (décision 11).

## 10. Critères d'acceptation
- [x] CA-T1 : Mes messages à droite, ceux des autres à gauche (bord de bulle à ≤ 2 px du bord du fil moins son remplissage). Groupe = même `authorId`, même visibilité (`cssClass`), écart < 5 min (5 min 00 s ouvre un nouveau groupe), même jour local ; nom et heure une fois en tête ; bulles d'un groupe séparées de `bubble-gap`, groupes de `group-gap` ; séparateur « Aujourd'hui », « Hier » ou date courte (`18 nov.` / `Nov 18`) en fr et en, horloge injectée et `TZ` fixé (23:59 et 00:01 locaux, `Europe/Paris` et `America/Los_Angeles`).
- [x] CA-T2 : Avec `showAvatars` (défaut vrai), l'avatar (initiales, 1 ou 2 lettres) des autres apparaît une fois par groupe, aligné sur le bas de la dernière bulle (± 2 px) ; jamais pour `mine` ni `system` ; sans `showAvatars`, aucun `lc-avatar` et même alignement des bulles.
- [x] CA-T3 : Chromium, conteneur limité collé en bas, 5 messages dont le dernier à moi ; on ajoute 1, puis 3 messages consécutifs du même côté ; animations mises en pause à `currentTime = 0` juste après l'insertion : (a) le bas de chaque bulle déjà affichée est à ± 1 px de sa position d'avant ; (b) aucun trou entre la dernière bulle précédente et le premier nouveau message (écart attendu ± 1 px) ; (c) la nouvelle bulle part de `--lc-message-thread-enter-scale` avec l'accélération du jeton `enter-easing` ; (d) `transform-origin` au coin côté auteur. Après `finished`, aucune animation et positions identiques à un rendu direct.
- [x] CA-T4 : Premier rendu (y compris liste vide puis remplie), affichage progressif et remplacement de liste sans `id` nouveau : aucune animation dans le fil immédiatement et après deux images. Sous `reducedMotion: 'reduce'`, l'arrivée ne joue que l'opacité (aucune animation de `transform`), les messages précédents ne sont pas animés.
- [x] CA-T5 : Une `cssClass` qui pose `--lc-message-thread-bubble-background`, `-bubble-color` et `-bubble-border-*` (pointillés) donne ce rendu à la bulle de ce message, de mon côté comme de l'autre, sans autre CSS ; les autres bulles ne changent pas ; `mention` s'affiche sous l'en-tête et est lue avant le texte.
- [x] CA-T6 : Les pièces jointes sont des vignettes `<button>` dans la bulle ; clic, Entrée ou Espace émet `attachmentOpen` une fois ; nom accessible `threadAttachmentOpen(name)` ; un message sans texte n'a pas de zone de texte ; `previewUrl` absente, `javascript:`, `data:text/html`, `http(s)` d'une autre origine → icône, jamais d'`<img>` avec cette `src` ; `blob:`, `data:image/png`, même origine → `<img>`.
- [x] CA-T7 : Un message `system` est une ligne centrée (± 2 px), couleur `system-color`, heure dans `<time>`, sans avatar ni nom ; il rompt le groupe (même auteur de part et d'autre = deux groupes).
- [x] CA-T8 : Une adresse `http(s)` est un `<a>` (`target="_blank"`, `rel="noopener noreferrer"`) sans ponctuation finale (`. , ; : ! ?`, parenthèse fermante non appariée) ; `javascript:` et le HTML restent du texte ; retours à la ligne conservés.
- [x] CA-T9 : Chromium, 360 × 640 et 1 280 × 800. Parent limité (`height: 400px`, flex en colonne) : le fil défile à l'intérieur, la saisie projetée reste visible, la page ne défile pas. Parent sans hauteur : le fil n'a pas de défilement propre, la page s'allonge. Un changement de hauteur du parent est pris en compte. Sans projection, aucune erreur.
- [x] CA-T10 (prouvé sous Chromium seulement) : 100 messages, `pageSize = 30` : 30 rendus (les derniers) ; en remontant, paliers 60, 90, 100 ; le message témoin garde sa position à ± 2 px après deux images, en défilement interne et de page ; aucune animation ; plus de palier après 100 ; `pageSize` ≤ 0 ou non entier → 30.
- [x] CA-T11 : axe (`wcag2a`, `wcag2aa`, `best-practice`) sans violation sur un fil de 12 messages (avatars, système, pièces jointes, note interne), 360 et 1 280 px, clair et sombre ; `role="log"` nommé ; test statique : aucune couleur, durée ni taille en dur dans le `.css` (hors jetons), aucun libellé en dur ni `innerHTML` dans le `.ts`, libellés fr et en présents.
- [x] CA-T12 (manuel) : test `novice-user` sur captures à 360 px, clair et sombre. Test n°1 HÉSITANT (bulle longue jusqu'au bord opposé → `bubble-max-share` ; captures pauvres → story `Conversation` stabilisée) ; test n°2 HÉSITANT sur les textes d'exemple propres à l'application (« mise en pause », « résolue ») et l'affordance des photos (non changée : usage courant des messageries).
- [x] CA-T13 : Arrivées pendant une animation : un second message ajouté 100 ms après un premier ne relance pas celui-ci et ne crée ni trou ni saut (± 1 px) ; un lot de n joue n entrées décalées d'un pas égal, `min(enter-stagger, 300 ms / (n − 1))`, soit 300 ms au plus au total ; un message retiré pendant son entrée ne laisse ni élément ni animation ; aucune erreur console.
- [x] CA-T14 : Liens déguisés (fonction pure du découpeur) : `javascript:`, `JAVASCRIPT:`, avec espace, tabulation, saut de ligne ou `\u0000` en tête ou dedans, entités HTML, `data:` (toutes casses), `vbscript:`, `file:`, `ftp:`, `//evil.test`, `www.example.com`, `http:/x` restent du texte ; `HTTP://EXAMPLE.COM/a` est un lien dont `href` est la valeur normalisée par `new URL()` ; tout `<a>` rendu a un `href` en `http://` ou `https://` (corpus aléatoire à graine fixe, ≥ 500 chaînes).
- [x] CA-T15 : Ponctuation et longueur : `(https://x.test/a)` → lien sans parenthèses ; `https://en.wikipedia.org/wiki/Foo_(bar)` entier ; `<…>` et guillemets exclus ; deux adresses → deux liens ; `https://` seul → texte ; une adresse de 200 000 caractères est découpée en < 50 ms (motif adverse chronométré) et ne crée aucun défilement horizontal à 360 px ; `<`, `>`, `&`, `"` rendus littéralement.
- [x] CA-T16 : Caractères de contrôle et marqueurs bidi retirés d'`authorName` et du texte des messages (DOM, `aria-label`, `title`) ; nom dans `<bdi>` ; un nom en arabe ne déplace pas l'heure (± 1 px) ; initiales sans couper un point de code, repli si le nom est vide ; texte de 100 000 caractères rendu en < 200 ms ; aucun nom ni texte dans la console.
- [x] CA-T17 : Liste vide : aucune bulle, `role="log"` présent ; groupe d'un message : en-tête et avatar sur cette bulle ; `sentAt` invalide : bulle sans `<time>`, un avertissement en développement sans le texte ; `id` en double : le premier rendu, avertissement en développement ; message sans texte ni pièce jointe : aucune bulle vide ; 12 pièces jointes à 360 px sans débordement ; ordre de la liste conservé.
- [x] CA-T19 : Facilité d'usage : `<lc-message-thread [messages]="messages" />` seul (sans autre entrée ni projection) rend un fil correct, accessible et animé ; la story `Minimal` et l'exemple du README (dix lignes au plus) le montrent ; aucune entrée obligatoire autre que `messages` ; aucun terme métier dans le code, les libellés ni les stories du kit.
- [x] CA-T18 : `lc-message` n'est pas modifié : ses 16 tests CA-D3 passent sans changement.

## 11. Découpage en tâches
- [x] F0 (QA) : tests d'acceptation avant le code (`tools/qa/message-thread-browser.mjs`, story QA, tests statiques).
- [x] F1 : `safe-text.ts` dans le principal (`lcStripUnsafeChars`, `isSafePreviewUrl`), `forms` y passe sans changement de comportement ; jetons ; modèle ; `message-thread-grouping.ts` ; libellés (M ; CA-T1, T2, T7, T16, T17).
- [x] F2 : bulle direction A, note interne, vignettes, liens (découpeur pur) (M ; CA-T5, T6, T8, T14, T15).
- [x] F3a : arrivée en ressort, FLIP, arrivées multiples (M ; CA-T3, T4, T13).
- [x] F3b : défilement selon le conteneur, affichage progressif, compensation (M ; CA-T9, T10).
- [x] F4 : stories (`Minimal`, `Playground`, `Animation`), catalogue, README (S ; CA-T11, T18, T19).
- [x] F5 (QA) : verdict, novice (CA-T11, T12).
- [ ] F6 (PR séparée, copro-ticket ; prérequis : kit fusionné, `deps:refresh`) : adoption, messages système d'historique dans le fil.

## 12. Risques et questions ouvertes
- **Dettes** : jeton de ressort nouveau (le ressort avait été retiré des listes ; il ne sert qu'ici).
- **Risques** : compensation de défilement sans `overflow-anchor` (Safari) ; FLIP et ressort ensemble sur des listes longues.
- **Questions ouvertes** : aucune.
- **Limites** : position conservée prouvée sous Chromium ; WebKit et Firefox via Playwright si disponibles, sinon écart écrit.

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| 2026-11-21 | `cadreur` | cadrage | ÉCARTS | Défilement (décision 12), périmètre (13), identifiant d'auteur, rupture de groupe à la visibilité, 5 min, fuseau et langue, sécurité ouverte. |
| 2026-11-21 | `architect` | conception | RÉSERVES | Bulle propre au fil, `lc-message` intact ; `safe-text.ts` dans le principal ; ressort en jeton de composant (exception écrite à la décision 27) ; FLIP sur `list-move-*` ; premier rendu non vide = tout vu ; `overflow-anchor: none` et compensation partout ; `ResizeObserver` ; F1 et F3 redécoupés ; copro-ticket : `authorId` absent de l'API, bloc d'état à actions (questions). |
| 2026-11-21 | `qa-engineer` | plan de test | À PRÉCISER | CA-T1 à T12 réécrits (mesures, méthode à `currentTime = 0`) ; CA-T13 à T18 ajoutés (arrivées multiples, liens déguisés, ponctuation et longueur, noms bidi, cas limites du modèle, `lc-message` intact). Tranché par la session : bidi et contrôle retirés des noms et du texte ; `id` en double : le premier ; décalage 50 ms, plafond 300 ms. |
| 2026-11-21 | `ui-ux-designer` | brief | FAIT | Brief en §5.4, jetons en §5.2 ; surcharges non préfixées pour la note interne ; « Vous » fourni par l'application ; métadonnées en `font-size-sm`. |
| 2026-11-22 | `qa-engineer` | vérification | GO | Vitest 2327/2327, `message-thread-browser.mjs all` 106 OK deux fois, axe, contrôles 66/66, extraits 369/369, non-régression composer, motion, ios-motion. |
| 2026-11-22 | `code-reviewer` | livraison | APPROUVÉ | Révélation quand tout tient dans le cadre, formateurs, message système vide, nits : corrigés. |
| 2026-11-22 | `security-reviewer` | livraison | ACCEPTABLE | `cssClass` et `mention` documentés comme venant de l'application. |
| 2026-11-22 | `novice-user` | captures | HÉSITANT ×2 | Voir CA-T12. |
| 2026-11-22 | `cadreur` | livraison | ÉCARTS non bloquants | Écrits ci-dessous. |

**Écarts constatés à l'implémentation**
1. CA-T10 et la position conservée en remontant sont prouvés sous Chromium seulement ; WebKit et Firefox sont absents du poste de test.
2. Pastille « Nouveau message ↓ » non livrée (décisions 7 et 13) ; à trancher au cadrage de l'adoption par copro-ticket. L'ouverture sur le dernier message et le maintien en bas à l'arrivée sont livrés.
3. `cleanFileName` (`forms`) reste une enveloppe de `lcStripUnsafeChars` qui retire en plus `\n` et `\t` (noms de fichiers) ; `isSafePreviewUrl(url, base = document.baseURI)` ; contrat public du principal : deux fonctions ajoutées.
4. Affichage progressif : les paliers s'enchaînent seuls tant qu'un parent de hauteur limitée n'est pas rempli ; en défilement de page, rien ne se révèle avant de remonter (README).
5. `bubble-max-share` (0,8) ajouté après le test novice n°1 ; lot d'arrivées à pas égal `min(enter-stagger, 300 ms / (n − 1))` ; séparateur de jour en `<time datetime>` ; `width`/`height` des vignettes fixent seulement le ratio.
6. Stories ajoutées hors liste : `Conversation` (dates fixes, photos, lignes système), `InternalNote`, `WithComposer`.
7. `docs/specs/2026-11-messagerie.md` (tâche M6) précisée dans cette branche : l'état des photos de copro-ticket, livré par copro-ticket #3.
8. Captures d'exploration et de test novice versionnées sous `docs/design/explorations/2026-11-fil-de-messages/`, comme pour les chantiers précédents.
