# Spec : Messagerie générique (zone de saisie, puis fil de messages)

- **Statut** : Brouillon (2026-11-21), cadrage
- **Auteur** : session principale
- **Date** : 2026-11-21
- **ADR liés** : 0009 (cible navigateurs, CDK par défaut)

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « J'aimerai poser quelques question sur la messagerie de codra-ticket est-ce que c'est un assemblage ou un composant a part entiere? Car cela pourrai etre un composant chat configurable generique permettant d'afficher ou non la saisie texte etc... les datas avec des template etc... Ainsi dans la parti où on ecrit le texte au lieux d'avoir 3 grosse partie pour importer les ilage et un bouton envoyer en dehors, il faudrait dans la partie textuelle ( donc dans le meme recrangle) avec un séparateur pour mettre une poece jointe a gauchue ou le deag and drop ( et avoir uje animation lorsqu'on drop une image/ficher pour montrer qu'on recupere bien la puece jointe) et a droite la petite fleche qui represente l'envoie tu en pense quoi? »
  - « codra-ticket » désigne copro-ticket.
  - Périmètre (question : « A. seulement la zone de saisie ; B. la zone de saisie et le fil de messages ») : « Les 2 mais tu oeux faire en 2 pr »
  - Touche Entrée, réponse « A » à l'option : « Sur ordinateur, Entrée envoie et Maj+Entrée va à la ligne. Sur téléphone, la touche Entrée du clavier va à la ligne et on envoie avec la flèche. C'est le comportement de Messages, WhatsApp ou Slack, et ce serait le réglage par défaut du composant, modifiable par l'application. »
  - Pièces jointes, réponse « A » : « Vignettes au-dessus du texte, dans le rectangle. Chaque fichier déposé apparaît en petite vignette : l'image pour une photo, l'icône et le nom pour un autre fichier. On y voit l'avancement de l'envoi et une erreur avec « Réessayer ». Un ✕ permet de le retirer tant que le message n'est pas parti. Au dépôt, la vignette apparaît en douceur, avec un léger agrandissement et un fondu. » ; et : « le composant affiche les pièces jointes. C'est l'application qui fait l'envoi réel et lui transmet l'avancement, comme `lc-file-upload` aujourd'hui. »
  - Dépôt, réponse « A » : « Le rectangle seul est la zone de dépôt. Quand on survole avec un fichier, le rectangle s'éclaire […] Au lâcher, l'éclairage s'éteint et la vignette apparaît en douceur. » ; annoncé avec la question : « Un fichier refusé […] est signalé sous le rectangle avec la raison. Le rectangle fait alors une petite secousse, sauf si le système demande de réduire les animations. »
  - Choix interne / visible, réponse « A » : « Au-dessus du rectangle, comme aujourd'hui. Le composant prévoit une zone d'en-tête libre » ; annoncé avec la question : « Le composant offrira quand même les deux zones (en-tête et actions) ».
  - « A et par contre rendre possible la customisation du champs texte du lessage, un peu a la manière de ms message privee avec des pojtillee, il faudrait changer de couleur ( c'est copro ticket qui se chzrge de ca) mais ui kit permet justement de rajouter un classe afin que copro ticket change la couleur du saisie texte si tu vois ce que je veux dire »
- **Besoin en trois phrases** : la réponse à une demande dans copro-ticket est un assemblage local de trois blocs (champ texte, envoi de photos, bouton « Envoyer » séparé), lourd à l'écran et non réutilisable. Le kit doit fournir une zone de saisie de message générique en un seul rectangle (pièce jointe à gauche, texte, flèche d'envoi à droite, glisser-déposer animé), puis un fil de messages générique dont l'affichage se personnalise par template. L'application garde l'envoi réel et la logique métier, et peut changer l'apparence du rectangle (par exemple une note interne en pointillés) par une simple classe.
- **Décisions prises pendant le cadrage** (2026-11-21, utilisateur) :
  1. Deux composants génériques, deux PR : **PR 1** `lc-message-composer` (zone de saisie) ; **PR 2** `lc-message-thread` (fil de messages, données affichées par template, saisie affichable ou non).
  2. Touche Entrée : sur pointeur fin (ordinateur), Entrée envoie, Maj+Entrée va à la ligne ; sur téléphone (pointeur grossier), Entrée va à la ligne et on envoie avec la flèche. Réglable par l'application.
  3. Pièces jointes en vignettes au-dessus du texte, dans le rectangle : aperçu d'image ou icône et nom, avancement, erreur avec « Réessayer », ✕ pour retirer avant envoi ; apparition douce au dépôt. Le composant affiche ; l'application envoie et lui fournit l'état (comme `lc-file-upload`).
  4. Zone de dépôt : le rectangle seul ; il s'éclaire au survol d'un fichier (« Déposez vos fichiers ici ») ; refus signalé sous le rectangle avec sa raison, petite secousse sauf réduction des animations. Le fil de la PR 2 pourra étendre le dépôt à toute la conversation, en option.
  5. Zones libres : un en-tête au-dessus du rectangle (copro-ticket y garde le choix « Note interne / Visible par le demandeur ») et une zone d'actions à côté du trombone.
  6. Apparence personnalisable par l'application : tokens CSS du composant qu'une classe de l'application redéfinit, avec transition ; le kit ne fournit aucune variante métier. Retenu après relecture du `cadreur` (consommateur : la note interne de copro-ticket) : style, couleur et épaisseur de bordure, fond ; d'autres tokens viendront avec un besoin.
  8. Direction **B** (barre d'outils basse, maquette `docs/design/explorations/2026-11-messagerie/`), avec une modification : « Je prefere la B par contre ca serait le l'icone actuelle pour envoyer en bouton sans contour un oeu a la maniere de whatapp » : l'envoi est l'icône `send` (celle de copro-ticket aujourd'hui), bouton sans contour ni fond, en couleur principale ; icône remplaçable par l'application (copro-ticket met `lock` pour une note interne).
  7. Décidé par la session (technique, 2026-11-21) : le composant ne valide pas ; il reçoit de l'application `label` (masqué visuellement si demandé), `hint`, `error`, `sending`, et émet l'envoi ; il réutilise les types et la logique de filtrage de `lc-file-upload` (`accept`, taille, nombre, raisons de refus) sans composer ce composant. Le fil (PR 2) est ca## 1. Contexte et problème
copro-ticket assemble sa réponse à une demande avec `lc-form-field` + `textarea`, `app-photos-field` (qui enveloppe `lc-file-upload`), un état des photos et un bouton « Envoyer » séparé (`reply-form.component.ts`, `staff-reply.component.ts`). Trois blocs empilés pour écrire une phrase et joindre une photo : c'est lourd sur téléphone, et rien n'est réutilisable par un autre projet. Le kit n'a pas de zone de saisie de message.

## 2. Objectifs
- O1 : un composant générique `lc-message-composer` : un seul rectangle (texte pleine largeur, barre d'outils basse avec trombone, actions libres et envoi), décisions 1 à 8.
- O2 : pièces jointes affichées en vignettes dans le rectangle, ajoutées par trombone ou dépôt animé ; l'application fait l'envoi réel.
- O3 : apparence redéfinissable par une classe de l'application (tokens), sans variante métier dans le kit.
- O4 : copro-ticket remplace son assemblage par le composant (demandeur et gestionnaire), dans la même passe.
- O5 (PR 2, spec à compléter après la PR 1) : `lc-message-thread`.

## 3. Hors périmètre (non-objectifs)
- Envoi réseau, compression, conversion d'images, aperçu d'un PDF : l'application.
- Validation du texte (longueur minimale, droits) : l'application, qui fournit `error`.
- Émojis, mentions, mise en forme riche, dictée, enregistrement audio.
- Contrôle de la taille des fichiers : `lc-file-upload` ne le fait pas non plus ; l'application refuse et fournit le message (`error`).
- Zone de dépôt étendue à toute la conversation (PR 2, en option).
- `lc-message-thread` : cadré après la PR 1.

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : hypothèse présentée à l'utilisateur, non corrigée (2026-11-21) : un copropriétaire débutant qui écrit une phrase sur téléphone ; en second, le gestionnaire sur ordinateur qui répond souvent et joint des documents.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Copropriétaire (téléphone) | Écrit, joint une photo par le trombone, touche la flèche | Le message part ; la vignette montre l'avancement |
| Gestionnaire (ordinateur) | Glisse un PDF sur le rectangle, écrit, Entrée | Le rectangle s'éclaire, la vignette apparaît, Entrée envoie |
| Gestionnaire | Bascule « Note interne » au-dessus | Rectangle en pointillés et couleur (classe de l'application), icône d'envoi `lock` |
| Tous | Dépose un type refusé | Message sous le rectangle avec la raison, secousse |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
- `lc-message-composer` dans le point d'entrée `forms` (`packages/angular/forms/src/message-composer/`), à côté de `lc-file-upload` dont il réutilise les types (`LcFileUploadItem`, `LcFileUploadRejection`) et le filtrage par `accept` (`matchesAccept`, extrait dans un utilitaire interne partagé si besoin). Aucun nouvel import entre points d'entrée.
- Contrôle de formulaire : `FormValueControl<string>` (Signal Forms) pour le texte (`value` en `model`).
- Hauteur du texte : agrandissement par script jusqu'à `maxRows` puis défilement (`field-sizing: content` est hors Baseline 2024).
- Dépôt : événements `dragenter/over/leave/drop` sur le rectangle (compteur d'entrées pour éviter le clignotement) ; `<input type="file">` caché, ouvert par le trombone (bouton, clavier).
- Animations : apparition de vignette (agrandissement 0,96 → 1 et fondu, `duration-normal`), éclairage du dépôt (`duration-fast`), secousse de refus (`transform`, `duration-normal`), transition de couleur de bordure et fond (`duration-normal`) ; toutes nulles sous `prefers-reduced-motion`.
- Remplacer une brique : changer la mise en page = le `.css` du composant ; changer la logique de fichiers = l'utilitaire partagé avec `lc-file-upload`.

### 5.2 Modèle de données
Aucune donnée persistée. Pièces jointes : `LcFileUploadItem` existant (id, name, size, status, progress, errorMessage, previewUrl, retryable). Tokens composant (`packages/tokens/src/components/message-composer.tokens.json`, repli `sys`) : `--lc-message-composer-border-style` (`solid`), `-border-width` (`sys.border-width.thin`), `-border-color` (`sys.color.border`), `-background` (`sys.color.surface-raised`) ; couleurs du dépôt et du focus en `sys`.

### 5.3 API / interfaces
```ts
<lc-message-composer
  [(value)]="text"                 // string (FormValueControl)
  label="Votre message"            // nom accessible du champ (obligatoire)
  [labelHidden]="true"             // libellé masqué visuellement
  placeholder="Écrivez votre message…"
  [hint]="…" [error]="…"           // texte sous le rectangle ; error prioritaire, annoncé
  [sending]="false"                // flèche en attente, envoi bloqué, texte lisible
  [disabled]="false"
  [maxLength]="null"               // compteur affiché à l'approche
  [minRows]="1" [maxRows]="7"
  [enterSends]="'auto'"            // 'auto' (pointeur fin) | true | false
  [sendIcon]="'send'"              // icône du bouton d'envoi
  [attachments]="true"             // trombone et dépôt
  [items]="uploads"                // LcFileUploadItem[]
  accept="image/*,.pdf" [maxFiles]="null"
  (send)="…"                       // { text: string } ; jamais si vide sans pièce jointe, ni si sending, ni si un item est 'uploading'
  (filesAdded)="…" (rejected)="…" (remove)="…" (retry)="…">
  <div lcComposerHeader>…</div>    // en-tête libre au-dessus du rectangle
  <button lcComposerAction>…</button> // actions libres après le trombone
</lc-message-composer>
```
Libellés `LC_LABELS` (fr, en) : `composerSend` (« Envoyer »), `composerAttach` (« Joindre un fichier »), `composerDrop` (« Déposez vos fichiers ici »), `composerEnterHint` (« Entrée pour envoyer, Maj+Entrée pour aller à la ligne »), raisons de refus reprises de `lc-file-upload`.

### 5.4 Interface utilisateur
Direction **B** choisie (maquette `docs/design/explorations/2026-11-messagerie/index.html`, capture `capture-1280.png`), flèche remplacée par l'icône `send` en bouton sans contour (décision 8). Brief de `ui-ux-designer` : à compléter (`/impeccable shape`), avec la maquette B corrigée. Test `novice-user` sur captures (CA-C14).

## 6. Cas limites et gestion des erreurs
- Envoi avec texte vide et aucune pièce jointe : rien n'est émis, la flèche reste active (pas de bouton grisé) et le focus reste dans le champ.
- Double appui pendant `sending` : un seul `send`.
- Pièce jointe encore `uploading` : `send` bloqué, l'aide indique « Envoi des pièces jointes en cours ».
- Dépôt d'un dossier ou d'un élément non fichier : ignoré.
- Plusieurs fichiers dont certains refusés : les acceptés sont émis par `filesAdded`, les autres par `rejected`, un message par raison.
- `maxFiles` atteint : le trombone reste actif, l'ajout est refusé avec la raison `count`.
- Composition IME (japonais, etc.) : Entrée ne valide pas pendant la composition (`isComposing`).
- `disabled` : ni saisie, ni dépôt, ni envoi.

## 7. Sécurité, performance, observabilité
- **Sécurité et données** : le composant ne lit pas le contenu des fichiers et n'envoie rien ; il transmet des `File` à l'application. Les noms de fichiers sont affichés en texte (jamais `innerHTML`). Les aperçus viennent de `previewUrl` fourni par l'application (le kit ne crée pas d'URL d'objet). `accept` est une aide, pas un contrôle de sécurité : l'application et le serveur vérifient le type réel. À relire par `security-reviewer`.
- Performance : agrandissement mesuré une fois par saisie ; aucune lecture de fichier.
- Logs : avertissements console en développement seulement (`label` absent).

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Composer `lc-file-upload` dans le composant | Aucune logique en double | Liste verticale et bouton « Choisir » incompatibles avec la vignette dans le rectangle | Non, types et filtrage partagés |
| Un seul « chat » configurable (fil + saisie) | Un seul composant | Beaucoup d'options, usage séparé impossible | Non, deux composants (décision 1) |
| Variantes intégrées (`tone="internal"`) | Clé en main | Vocabulaire métier dans le kit | Non, tokens (décision 6) |

## 9. Plan de test
- Unitaires (`senior-developer`) : émission de `send` (Entrée, Maj+Entrée, `enterSends`, IME, vide, `sending`, upload en cours), filtrage `accept`/`maxFiles`, agrandissement borné, libellés, tokens.
- Acceptation (`qa-engineer`, Chromium) : dépôt réel (`DataTransfer`), éclairage, vignette animée, secousse, réduction des animations, classe d'application qui change bordure et fond, axe, clavier.
- Bout en bout : copro-ticket, réponse du demandeur et note interne du gestionnaire.
- Architecture : aucun import entre points d'entrée ajouté (`tools/qa/entrypoint-imports.test.mjs`) ; aucune valeur en dur (`motion.static.test.mjs`).

## 10. Critères d'acceptation
- [ ] CA-C1 : Un seul rectangle : texte pleine largeur en haut, barre basse avec trombone, actions projetées, puis bouton d'envoi à droite (icône `sendIcon`, sans contour ni fond, couleur principale, nom accessible « Envoyer », cible ≥ 44 px).
- [ ] CA-C2 : Sur pointeur fin, Entrée émet `send` une fois et vide rien d'elle-même ; Maj+Entrée insère un saut de ligne ; sur pointeur grossier, Entrée insère un saut de ligne ; `enterSends` true / false force le comportement ; aucune émission pendant une composition IME.
- [ ] CA-C3 : `send` n'est jamais émis si le texte (espaces retirés) est vide et qu'il n'y a aucune pièce jointe, ni pendant `sending`, ni si un item est `uploading` ; un double clic n'émet qu'une fois.
- [ ] CA-C4 : Le champ s'agrandit de `minRows` à `maxRows` lignes puis défile ; la barre basse reste visible.
- [ ] CA-C5 : Le trombone (bouton, clavier) ouvre le sélecteur de fichiers ; les fichiers acceptés sont émis par `filesAdded`, les refusés par `rejected` avec la raison (`type`, `count`).
- [ ] CA-C6 : Survol d'un fichier : le rectangle s'éclaire et affiche « Déposez vos fichiers ici » en `duration-fast` ; sortie ou lâcher : l'éclairage s'éteint ; passer sur un enfant ne fait pas clignoter.
- [ ] CA-C7 : Chaque item est une vignette au-dessus du texte : aperçu (`previewUrl`) ou icône et nom, avancement (`progress`), erreur avec « Réessayer » (`retry`), ✕ (`remove`) avec nom accessible « Retirer <nom> » ; un nouvel item apparaît en agrandissement 0,96 → 1 et fondu en `duration-normal`.
- [ ] CA-C8 : Refus : message sous le rectangle avec la raison et le nom, annoncé (`role="alert"`), et secousse du rectangle ; aucune secousse ni agrandissement sous réduction des animations.
- [ ] CA-C9 : `sending` : le bouton d'envoi montre une attente et est désactivé pour l'envoi, le texte reste lisible et sélectionnable.
- [ ] CA-C10 : Une classe de l'application redéfinissant `--lc-message-composer-border-style`, `-border-width`, `-border-color` et `-background` change le rendu (bordure pointillée et couleur) sans autre CSS, avec une transition de `duration-normal`.
- [ ] CA-C11 : `lcComposerHeader` s'affiche au-dessus du rectangle, `lcComposerAction` après le trombone, dans l'ordre de tabulation : en-tête, champ, trombone, actions, envoi.
- [ ] CA-C12 : axe sans erreur (vide, avec items, erreur, note interne) à 360 et 1 280 px ; aucun texte en dur (`LC_LABELS` fr et en) ; aucune valeur en dur.
- [ ] CA-C13 : copro-ticket utilise `lc-message-composer` pour la réponse du demandeur et celle du gestionnaire ; ses tests unitaires et ses parcours passent.
- [ ] CA-C14 (manuel) : test `novice-user` sur captures (vide, photo en cours, refus, note interne) à 360 px.

## 11. Découpage en tâches
- [ ] M1 : utilitaire de fichiers partagé avec `lc-file-upload` (sans changement de comportement) et tokens (S ; CA-C5, CA-C10).
- [ ] M2 : `lc-message-composer` : rectangle, texte, Entrée, envoi, projections, libellés (M ; CA-C1 à C4, C9, C11).
- [ ] M3 : pièces jointes, dépôt, refus et animations (M ; CA-C5 à C8).
- [ ] M4 : stories (`Playground`, `Animation`), catalogue, README (S ; CA-C12).
- [ ] M5 : copro-ticket remplace son assemblage (M ; CA-C13).
- [ ] M6 (QA) : acceptation, axe, novice (CA-C12, CA-C14).

## 12. Risques et questions ouvertes
- **Choix par défaut à confirmer** : utilisateur principal (§4) ; `maxRows` 7 ; bouton d'envoi jamais grisé (`frontend-guidelines`).
- **Dettes** : agrandissement par script tant que `field-sizing` n'est pas dans la cible.
- **Questions ouvertes** : aucune pour la PR 1.

deux nouveaux composants, réutilisation de la logique de `lc-file-upload`, points d'entrée à choisir.
  - [x] Écran : nouveau composant visible ; directions maquettées, choix de l'utilisateur, test `novice-user`.
  - [x] Sécurité et données : fichiers déposés par l'utilisateur (types, taille, nom affiché, aperçu d'image local) ; aucun envoi réseau par le kit.

## 1. Contexte et problème
À rédiger après le choix de direction.

## 2. Objectifs
À rédiger.

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| 2026-11-21 | `cadreur` | cadrage | ÉCARTS | Options choisies recopiées mot pour mot ; tokens réduits au besoin du consommateur ; validation laissée à l'application (décision 7) ; accessibilité à cadrer en §5.4 ; fil cadré après la PR 1. |
