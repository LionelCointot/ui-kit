# Spec : Fil de messages générique (`lc-message-thread`, PR 2 de la messagerie)

- **Statut** : En revue (2026-11-21)
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
- Le fil réutilise `lc-message` pour la bulle s'il permet la direction A (variantes, nom et date masqués hors tête de groupe) ; sinon il porte sa propre bulle et `lc-message` reste tel quel (à trancher par l'`architect`).
- Structure : colonne flex qui remplit son conteneur (fil puis saisie projetée). Le composant détecte s'il défile lui-même (`scrollHeight > clientHeight` sur sa zone) ; sinon la page défile (décision 12).
- Regroupement calculé par le composant : même `authorId`, même visibilité (classe), moins de 5 minutes d'écart, même jour ; séparateur de jour selon la langue (`LC_LABELS`, `Intl`) et le fuseau du navigateur.
- Arrivée : un message dont l'`id` n'était pas dans la liste précédente joue l'entrée (agrandissement depuis le coin de la bulle, ressort `linear()` en jeton, fondu) ; les messages déjà affichés glissent de l'écart (FLIP, `list-move`) dès la première image ; jamais au premier rendu ni à l'affichage progressif ; fondu seul sous réduction des animations.
- Affichage progressif (décision 15) : seuls les `pageSize` (30) derniers messages sont rendus ; quand le haut du fil devient visible (`IntersectionObserver` sur une sentinelle), 30 de plus sont rendus et la position de lecture est conservée par compensation de défilement (pas de `overflow-anchor`, absent de Safari).
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
Tokens (`message-thread.tokens.json`, repli `sys`) : `bubble-background-mine`, `bubble-background-other`, `bubble-color`, `bubble-border-color`, `bubble-border-width`, `bubble-border-style`, `bubble-radius`, `bubble-radius-tight` ; mouvement : `enter-easing` (ressort `linear()`), `enter-duration`, `enter-scale`.

### 5.3 API / interfaces
```html
<lc-message-thread [messages]="messages" [showAvatars]="true" [pageSize]="30"
  (attachmentOpen)="open($event)" ariaLabel="Échanges">
  <ng-template lcThreadMessageContent let-message>…</ng-template>  <!-- facultatif : contenu de bulle -->
  <lc-message-composer lcThreadComposer … />                        <!-- facultatif -->
</lc-message-thread>
```
- `attachmentOpen` : `{ message: LcThreadMessage; attachment: LcThreadAttachment }`.
- Libellés `LC_LABELS` (fr, en) : `threadToday`, `threadYesterday`, `threadLabel`, `threadAttachmentOpen(name)`.
- `previewUrl` filtré comme dans la zone de saisie (`isSafePreviewUrl`, partagé ou recopié selon l'`architect`).

### 5.4 Interface utilisateur
Direction **A** choisie (bulles douces et pleines ; maquette `docs/design/explorations/2026-11-fil-de-messages/index.html`, capture `capture-1280.png`). Brief de `ui-ux-designer` : à compléter. Test `novice-user` sur captures (CA-T12).

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
- [ ] CA-T1 : Mes messages à droite, ceux des autres à gauche ; un groupe (même auteur, même visibilité, écart < 5 min, même jour) affiche nom et heure une fois en tête et ses bulles serrées ; un écart ≥ 5 min réaffiche l'heure ; un séparateur « Aujourd'hui », « Hier » ou la date courte sépare les jours (fr et en).
- [ ] CA-T2 : Avec `showAvatars`, l'avatar (initiales) des autres apparaît une fois par groupe, au niveau de la dernière bulle ; jamais pour mes messages.
- [ ] CA-T3 : Un message dont l'`id` est nouveau apparaît du côté de son auteur en ressort (agrandissement depuis le coin, jeton `enter-easing`), et dès la première image les messages précédents sont décalés de façon à ne laisser ni trou ni saut, y compris pour 3 messages consécutifs du même côté (position mesurée à t = 0 égale à la position d'avant, ± 1 px).
- [ ] CA-T4 : Aucune animation au premier rendu, à l'affichage progressif ni au remplacement d'une liste sans identifiant nouveau ; sous réduction des animations, fondu seul.
- [ ] CA-T5 : Une `cssClass` d'application redéfinissant les jetons de bordure et de fond change la bulle (pointillés, couleur) sans autre CSS ; `mention` s'affiche sous l'en-tête.
- [ ] CA-T6 : Les pièces jointes s'affichent en vignettes dans la bulle ; un clic ou Entrée émet `attachmentOpen` ; un message sans texte n'a pas de zone de texte vide ; `previewUrl` non admise → icône.
- [ ] CA-T7 : Un message `system` s'affiche en ligne centrée, grise, avec l'heure, hors groupe.
- [ ] CA-T8 : Une adresse `http(s)` du texte est un lien (nouvel onglet, `rel="noopener noreferrer"`), sans la ponctuation finale ; `javascript:` et le HTML restent du texte ; retours à la ligne conservés.
- [ ] CA-T9 : Dans un conteneur de hauteur limitée, le fil défile à l'intérieur et la saisie projetée reste visible ; sans limite, le fil s'allonge et la page défile.
- [ ] CA-T10 : Seuls les `pageSize` derniers messages sont rendus ; en remontant jusqu'en haut, les suivants apparaissent sans que le message lu ne bouge (± 2 px), en défilement interne comme de page.
- [ ] CA-T11 : axe sans violation (360 et 1 280 px, clair et sombre) ; le fil a `role="log"` et un nom ; aucun texte ni valeur en dur.
- [ ] CA-T12 (manuel) : test `novice-user` sur captures à 360 px.

## 11. Découpage en tâches
- [ ] F0 (QA) : tests d'acceptation avant le code.
- [ ] F1 : jetons (bulle, ressort), modèle, regroupement et séparateurs, libellés (M ; CA-T1, T2, T7).
- [ ] F2 : bulle direction A, note interne, vignettes, liens (M ; CA-T5, T6, T8).
- [ ] F3 : arrivée en ressort et poussée, défilement, affichage progressif (M ; CA-T3, T4, T9, T10).
- [ ] F4 : stories, catalogue, README (S ; CA-T11).
- [ ] F5 (QA) : verdict, novice (CA-T11, T12).
- [ ] F6 (PR séparée, copro-ticket) : adoption, messages système à la place de la bannière.

## 12. Risques et questions ouvertes
- **Dettes** : jeton de ressort nouveau (le ressort avait été retiré des listes ; il ne sert qu'ici).
- **Risques** : compensation de défilement sans `overflow-anchor` (Safari) ; FLIP et ressort ensemble sur des listes longues.
- **Questions ouvertes** : réutilisation de `lc-message` pour la bulle (à trancher par l'`architect`).

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| 2026-11-21 | `cadreur` | cadrage | ÉCARTS | Défilement (décision 12), périmètre (13), identifiant d'auteur, rupture de groupe à la visibilité, 5 min, fuseau et langue, sécurité ouverte. |
