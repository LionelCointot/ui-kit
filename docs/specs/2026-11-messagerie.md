# Spec : Messagerie générique (zone de saisie, puis fil de messages)

- **Statut** : PR 1 livrée (2026-11-21) ; M6 (copro-ticket) et PR 2 à venir
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
  7. Décidé par la session (technique, 2026-11-21, révisé après relectures) : le composant ne valide pas ; libellé, aide et erreurs viennent de `lc-form-field` ; il réutilise les types et le filtrage de `lc-file-upload` (`accept`, nombre, raisons de refus) par un utilitaire partagé, sans composer ce composant. Le fil (PR 2) est cadré après la PR 1.
  8. Direction **B** (barre d'outils basse, maquette `docs/design/explorations/2026-11-messagerie/`), avec une modification : « Je prefere la B par contre ca serait le l'icone actuelle pour envoyer en bouton sans contour un oeu a la maniere de whatapp » : l'envoi est l'icône `send` (celle de copro-ticket aujourd'hui), bouton sans contour ni fond, en couleur principale ; icône remplaçable par l'application. Révisé le 2026-11-21 : « Pourquoi c'est un cadena quand on est en note interne? Ca reste le bouton encoye et les icones oont la oculeur primary? » ; à la proposition de garder `send` en couleur principale en note interne : « Oui » : seuls la bordure et le fond changent ; copro-ticket retire le cadenas de son bouton d'envoi (il reste dans le sélecteur).
  9. Fichier lâché hors du rectangle (2026-11-21, recommandation A, réponse « Oui ») : tant que le composant est affiché, un fichier lâché ailleurs dans la page est ignoré (le navigateur ne l'ouvre pas, la saisie n'est pas perdue) ; il n'est pas ajouté. Écouteurs `dragover`/`drop` sur le document, posés à l'affichage et retirés à la destruction, `preventDefault` seulement pour un glisser contenant des fichiers.
  10. Collage d'image (2026-11-21, recommandation A, réponse « Oui ») : un fichier collé dans le champ (Ctrl+V, « Coller ») devient une pièce jointe, filtrée comme un dépôt (`accept`, `maxFiles`, raisons de refus) ; un collage de texte reste du texte brut (le champ est un `textarea`).
  11. Message de refus de type (test novice, 2026-11-21) : « On peut rajouter ce paramètre mais il ya une propriete typefileAllow ou un truc du genre? Car du coup on peutetree un message par defaut non? » : le message dit quels fichiers sont acceptés, déduit par défaut de `accept` sous forme d'extensions, à la demande de l'utilisateur : « J'aimerai qu'on affiche l'extension .gif .pdf c'edt le standard et ce que tout le monde comprend » (extension de `accept` en minuscules ; type MIME précis → son extension, `application/pdf` → `.pdf` ; `image/*` → `.jpg, .png, .gif, .webp, .heic` ; `video/*` → `.mp4, .mov, .webm` ; `audio/*` → `.mp3, .m4a, .wav`) ; entrée optionnelle `acceptLabel` qui remplace la liste.
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : deux nouveaux composants, réutilisation de la logique de `lc-file-upload`, points d'entrée à choisir.
  - [x] Écran : nouveau composant visible ; directions maquettées, choix de l'utilisateur, test `novice-user`.
  - [x] Sécurité et données : fichiers déposés par l'utilisateur (types, taille, nom affiché, aperçu d'image local) ; aucun envoi réseau par le kit.

## 1. Contexte et problème
copro-ticket assemble sa réponse à une demande avec `lc-form-field` + `textarea`, `app-photos-field` (qui enveloppe `lc-file-upload`), un état des photos et un bouton « Envoyer » séparé (`reply-form.component.ts`, `staff-reply.component.ts`). Trois blocs empilés pour écrire une phrase et joindre une photo : c'est lourd sur téléphone, et rien n'est réutilisable par un autre projet. Le kit n'a pas de zone de saisie de message.

## 2. Objectifs
- O1 : un composant générique `lc-message-composer` : un seul rectangle (texte pleine largeur, barre d'outils basse avec trombone, actions libres et envoi), décisions 1 à 8.
- O2 : pièces jointes affichées en vignettes dans le rectangle, ajoutées par trombone ou dépôt animé ; l'application fait l'envoi réel.
- O3 : apparence redéfinissable par une classe de l'application (tokens), sans variante métier dans le kit.
- O4 : copro-ticket remplace son assemblage de réponse (demandeur et gestionnaire) par le composant, dans une PR de copro-ticket qui suit celle du kit.
- O5 (PR 2, spec à compléter après la PR 1) : `lc-message-thread`, qui reçoit le composer par projection (aucun import entre points d'entrée).

## 3. Hors périmètre (non-objectifs)
- Envoi réseau, compression, conversion d'images, aperçu d'un PDF, contrôle de la taille des fichiers et du type réel : l'application et le serveur.
- Validation du texte (longueur minimale, droits) : l'application, par `lc-form-field` (erreurs du champ).
- Émojis, mentions, mise en forme riche, dictée, enregistrement audio.
- Zone de dépôt étendue à toute la conversation (PR 2, en option).
- La nouvelle demande de copro-ticket (`new-request-form`) garde `photos-field` tel quel.
- `lc-message-thread` : cadré après la PR 1.

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** (confirmé par l'utilisateur le 2026-11-21, « oui ») : un copropriétaire débutant qui écrit une phrase sur téléphone ; en second, le gestionnaire sur ordinateur qui répond souvent et joint des documents.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Copropriétaire (téléphone) | Écrit, joint une photo par le trombone, touche l'icône d'envoi | Le message part ; la vignette montre l'avancement |
| Gestionnaire (ordinateur) | Glisse un PDF sur le rectangle, écrit, Entrée | Le rectangle s'éclaire, la vignette apparaît, Entrée envoie |
| Gestionnaire | Bascule « Note interne » au-dessus | Rectangle en pointillés et fond coloré (classe de l'application) ; envoi inchangé (`send`, couleur principale), nom « Ajouter la note » |
| Tous | Dépose un type refusé | Message sous le rectangle avec la raison, secousse |
| Tous | Appuie sur Envoyer pendant qu'une photo part | Rien n'est émis ; l'application reçoit `sendBlocked` et affiche son message |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
- `lc-message-composer` dans le point d'entrée `forms` (`packages/angular/forms/src/message-composer/`). Il importe `LcButton`, `LcIcon`, `LC_LABELS` du principal et les types de `lc-file-upload` du même point d'entrée : aucun nouvel import entre points d'entrée.
- **Contrôle de formulaire** : `FormValueControl<string>` (`value` en `model`, `disabled`, `readonly`, `invalid`, `touched`, `maxLength`) et fournisseur `LC_FORM_FIELD_CONTROL`, sur le modèle de `password-input.component.ts` : libellé, aide et erreurs viennent de `lc-form-field` ; hors champ, `ariaLabel` est obligatoire (avertissement en développement). Si `lc-form-field` ne sait pas masquer visuellement son libellé, on le lui ajoute (manque générique ; copro-ticket le fait aujourd'hui par `::ng-deep`).
- **Fichiers partagés avec `lc-file-upload`** : extraction de `forms/src/shared/file-filter.ts` : `matchesAccept` et `filterFiles(list, { accept, room, multiple }) → { accepted, refused }` (raisons `type`, `count`), plus le test « le glisser contient des fichiers » et la sortie de zone par `contains(relatedTarget)` (pas de compteur d'entrées). `lc-file-upload` l'appelle sans changement de comportement : son spec existant, inchangé, est le filet. Le composer est toujours multiple ; `room = maxFiles − items.length`.
- **Dépôt** : `dragenter/over/leave/drop` sur le rectangle, `preventDefault` seulement si le glisser contient des fichiers ; les dossiers, éléments non fichiers et fichiers de taille 0 sont ignorés. `<input type="file" multiple>` caché, ouvert par le trombone, remis à vide après chaque choix.
- **Hauteur du texte** : script (`afterRenderEffect` : hauteur remise à `auto`, puis `scrollHeight`, bornée entre `minRows` et `maxRows` lignes calculées depuis la hauteur de ligne des tokens), recalculée aussi par un `ResizeObserver` sur la largeur ; jamais d'attribut `style` en chaîne (propriété CSS posée par `Renderer2`). `field-sizing: content` est hors Baseline 2024.
- **Entrée** : `enterSends` `'auto'` lit `matchMedia('(pointer: coarse)')` à chaque `keydown` (aucune valeur figée).
- **Tokens** : lus sur un élément interne par `var(--lc-message-composer-x, repli)` et jamais déclarés sur `:host`, pour qu'une classe de l'application posée sur l'hôte l'emporte toujours ; valeurs par défaut dans `message-composer.tokens.json`.
- **Le fil (PR 2)** reçoit le composer par projection.
- Remplacer une brique : mise en page = `.css` et tokens du composant ; filtrage des fichiers = `file-filter.ts` (partagé) ; ajouter une raison de refus (`size`) = `LcFileRejectionReason`, `file-filter.ts`, `LC_LABELS`.

### 5.2 Modèle de données
Aucune donnée persistée. Pièces jointes : `LcFileUploadItem` existant (`id`, `name`, `size`, `status`, `progress`, `errorMessage`, `previewUrl`, `retryable`). Tokens du composant (`packages/tokens/src/components/message-composer.tokens.json`, valeurs en `{sys.*}`) :

| Token | Défaut |
|---|---|
| `--lc-message-composer-border-style` | `solid` |
| `--lc-message-composer-border-width` | `sys.border-width.thin` |
| `--lc-message-composer-border-color` | `sys.color.border-strong` (comme `lcInput`) |
| `--lc-message-composer-thumb-width` / `-thumb-preview-height` / `-remove-size` | 7 rem / 4,5 rem / 1,75 rem (aucune valeur `sys` ne convient) |
| `--lc-message-composer-enter-scale` | `dialog.enter-scale` (0,96) |
| `--lc-message-composer-background` | `sys.color.surface-raised` |
| `--lc-message-composer-shake-distance` | `sys.space.1` |
| `--lc-message-composer-shake-duration` | `sys.duration.normal` |

Transitions du rectangle sur `border-color`, `border-width` et `background` (`border-style` ne s'anime pas : le passage aux pointillés est immédiat).

### 5.3 API / interfaces
```ts
<lc-form-field label="Votre message">         // libellé, aide, erreurs : lc-form-field
  <lc-message-composer
    [(value)]="text"                           // string (FormValueControl)
    placeholder="Écrivez votre message…"
    [sending]="false"                          // attente sur l'envoi, texte en readonly
    [maxLength]="undefined"
    [minRows]="1" [maxRows]="7"
    enterSends="auto"                          // 'auto' | true | false
    sendIcon="send" [sendLabel]="undefined"     // nom accessible ; défaut composerSend
    attachIcon="paperclip" [attachments]="true"
    [items]="uploads"                          // LcFileUploadItem[]
    accept="image/*,.pdf" [maxFiles]="10"      // 10 par défaut ; null : sans limite
    [showSize]="true"
    (send)="…"                                 // { text: string } ; text = value().trim()
    (sendBlocked)="…"                          // 'empty' | 'sending' | 'uploading'
    (filesAdded)="…" (rejected)="…" (remove)="…" (retry)="…">
    <div lcComposerHeader>…</div>              // en-tête libre au-dessus du rectangle
    <button lcComposerAction>…</button>        // actions libres après le trombone
  </lc-message-composer>
</lc-form-field>
```
- Méthode publique `focus()` (via `LcFormFieldControl`).
- `send` n'est jamais émis si le texte rogné est vide et qu'aucun item n'est présent (`sendBlocked('empty')`), ni pendant `sending` (`'sending'`), ni si un item est `uploading` (`'uploading'`) ; les items `error` ne bloquent pas. Après un `send`, le composant refuse un nouvel envoi jusqu'à ce que `sending` ait été vrai puis faux, ou que `value` ait changé. Le composant ne modifie jamais `value` : l'application le vide.
- Le verrou d'envoi se lève aussi quand l'ensemble des `id` de `items` change (envoi de pièces jointes seules : l'application vide `items` sans toucher `value` ni `sending`). Un simple changement d'état d'un item (mêmes `id`) ne le lève pas.
- Collage : si le presse-papiers contient `text/plain`, le collage natif du texte a lieu et aucun fichier n'est joint (cellules Excel ou Word, qui portent aussi une image) ; une image seule (capture d'écran) est une pièce jointe.
- Refus : le composant affiche lui-même le message sous le rectangle (nom et raison) et fait la secousse ; il émet aussi `rejected` (l'application n'affiche pas le même message). Le message disparaît au prochain ajout, retrait ou à la prochaine saisie.
- `previewUrl` n'est rendu que par `<img>` et seulement s'il commence par `blob:`, `data:image/` ou s'il est de même origine ; sinon l'icône de repli.
- Libellés `LC_LABELS` (fr, en) : nouveaux `composerCount`, `composerLimitNear`, `composerLimitReached` (compteur), `composerRejectedType` (décision 11), `composerSend` (« Envoyer »), `composerAttach` (« Joindre un fichier »), `composerDrop` (« Déposez vos fichiers ici »), `composerAttachments` (« Pièces jointes »), `composerSending` (« Envoi en cours… »), `composerRejected(name, reason)` ; repris de `lc-file-upload` pour que la même surcharge d'application s'applique : `fileUploadRemove`, `fileUploadRetry`, `fileUploadUploading`, `fileUploadFailed`, `fileUploadProgress`, `fileUploadLimitReached`.
- Icône `paperclip` ajoutée aux icônes par défaut du kit (même famille que `send`).

### 5.4 Interface utilisateur
Direction **B** choisie, envoi par l'icône `send` en bouton sans contour (décision 8). Maquette `docs/design/explorations/2026-11-messagerie/index.html` (section « B retenue »), captures `capture-b-1280.png` et `capture-b-360.png`. Brief de `ui-ux-designer` (2026-11-21) :
- **Structure** : `lcComposerHeader` au-dessus ; dans le rectangle, de haut en bas : vignettes (`role="list"`, « Pièces jointes »), champ pleine largeur, barre basse (trombone, filet vertical puis actions s'il y en a, envoi à droite) ; sous le rectangle : message de refus. Calque de dépôt sur le rectangle (`inset: 0`, `pointer-events: none`).
- **Dimensions** : rayon `radius-lg` ; champ ≥ 16 px de police, `space-3` de marge ; trombone et envoi 44 × 44 px (`control-height-md`), icônes `icon-size-md` ; vignette de 7 rem, aperçu 4,5 rem, nom coupé par points de suspension (nom complet en `title`) ; ✕ visible 28 px, zone de clic 44 px ; « Réessayer » avec 44 px de zone de clic.
- **Envoi** : icône `primary`, sans fond ni bordure, jamais grisé hors `disabled` ; survol et appui en teinte `state-hover/pressed-opacity`, appui `--lc-button-press-scale` ; focus `focus-ring` 2 px ; `sending` : anneau de chargement de même taille, `aria-busy`, `aria-disabled`, zone `role="status"` « Envoi en cours… ». Contraste mesuré 6,6:1 (clair), 6,3:1 (sombre), 5,9:1 (sur le fond de la note interne).
- **États** : vignette en cours (« Envoi… 62 % », barre de 3 px `role="progressbar"`), en erreur (bordure `error`, icône et mot « Échec », « Réessayer ») ; survol de dépôt : calque `primary-container`, contour `primary` 2 px, « Déposez vos fichiers ici » ; refus : icône `circle-alert` et texte `error` ; désactivé : `state-disabled-opacity`, seul cas où l'envoi est grisé.
- **Animations** : vignette : fondu, 0,96 → 1 et décalage `motion-offset` en `duration-normal` ; calque de dépôt : opacité en `duration-fast` ; rectangle (couleurs, fond, épaisseur) en `duration-normal` ; secousse : `transform`, tokens `shake-*` ; aucune animation de hauteur du champ. Réduction : secousse supprimée, vignette en fondu seul, calque immédiat, anneau fixe, transitions supprimées.
- **forced-colors** : bordure `CanvasText`, envoi `ButtonText` avec contour `Highlight` au survol et au focus, calque `Canvas` contour `Highlight`, avancement `Highlight`.
- **Accessibilité** : ordre de tabulation : en-tête, vignettes (✕, Réessayer), champ, trombone, actions, envoi ; refus en `role="alert"` ; noms de fichiers isolés (`<bdi>`) ; focus visible partout, anneau `focus-within` sur le rectangle.
- **À 360 px** : pleine largeur, aucun défilement horizontal, vignettes à la ligne, `env(safe-area-inset-bottom)` respecté, tenue à 200 % de zoom.
- Test `novice-user` sur captures : CA-C14.

## 6. Cas limites et gestion des erreurs
- Texte vide et aucune pièce jointe : rien n'est émis (`sendBlocked('empty')`), le focus reste dans le champ.
- Double appui ou double Entrée : un seul `send` (verrou décrit en 5.3).
- Fichier lâché sur un autre `input[type=file]` de la page : les écouteurs `dragover` et `drop` du document n'annulent pas l'événement (le champ natif le traite).
- Pièce jointe `uploading` : `sendBlocked('uploading')` ; elle passe à `done` ou `error` : l'envoi se débloque sans autre action.
- Dossier, élément non fichier, fichier de 0 octet : ignorés, sans erreur ni éclairage coincé.
- Lot en partie refusé : acceptés par `filesAdded`, refusés par `rejected`, un message par raison.
- `maxFiles` atteint : le trombone reste actif ; l'ajout est refusé avec la raison `count`.
- Composition IME : Entrée ne valide pas pendant la composition (`isComposing`).
- `disabled` : ni saisie, ni dépôt (le navigateur n'ouvre pas le fichier), ni trombone, ni envoi, ni retrait, ni réessai.
- Retrait d'une vignette : le focus va à la vignette suivante, sinon au champ.
- Aperçu qui ne charge pas : icône de repli ; le composant ne crée jamais d'URL d'objet.

## 7. Sécurité, performance, observabilité
- **Sécurité et données** (relu par `security-reviewer`) : le composant ne lit pas le contenu des fichiers et n'envoie rien ; il transmet des `File`. `accept` est une aide, pas un contrôle (type déclaré falsifiable) : README. Noms de fichiers affichés en texte, isolés (`<bdi>`), caractères de contrôle et marqueurs bidi retirés de l'affichage et du nom accessible, nom accessible et annonce plafonnés à 80 caractères ; `File.name` émis inchangé. `previewUrl` : `<img>` seulement, schémas admis `blob:`, `data:image/`, même origine (pas de requête vers un tiers). Pas de `innerHTML`, pas de style en ligne généré, fonctionne sous CSP stricte (`img-src 'self' blob: data:`, sans `unsafe-inline`). Aucun nom de fichier ni texte saisi dans la console en production.
- Performance : `maxFiles` 10 par défaut (borne des vignettes) ; hauteur mesurée une fois par saisie et par changement de largeur.
- Logs : avertissements en développement seulement (`ariaLabel` absent hors `lc-form-field`).

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Composer `lc-file-upload` dans le composant | Aucune logique en double | Liste verticale et bouton « Choisir » incompatibles avec la vignette dans le rectangle | Non : `file-filter.ts` partagé |
| Libellé, aide, erreur propres au composant | Autonome | Double `lc-form-field` | Non : `LC_FORM_FIELD_CONTROL` |
| Un seul « chat » configurable (fil + saisie) | Un seul composant | Beaucoup d'options, usage séparé impossible | Non (décision 1) |
| Variantes intégrées (`tone="internal"`) | Clé en main | Vocabulaire métier dans le kit | Non : tokens (décision 6) |
| Texte d'aide fixe « Envoi des pièces jointes en cours » | Simple | copro-ticket publie des messages plus fins | Non : `sendBlocked` |

## 9. Plan de test
- Unitaires (`senior-developer`, Vitest) : `file-filter.ts` ; `send` et `sendBlocked` (Entrée, Maj+Entrée, `enterSends` avec `matchMedia` simulé, IME, vide, verrou, `sending`, `uploading`) ; filtrage ; libellés ; `previewUrl` ; noms de fichiers ; Signal Forms ; spec de `lc-file-upload` relancé inchangé.
- Acceptation (`qa-engineer`) : `tools/qa/message-composer-browser.mjs` et une story `QA/Forms/Message composer`, sur le modèle de `ios-motion-browser.mjs` : dépôt réel (`DataTransfer`), éclairage, vignette animée, secousse, réduction, classe d'application, hauteur, Tab, axe (clair et sombre), CSP.
- Bout en bout : copro-ticket (`photos.spec.ts`, `parcours-demande.spec.ts`, `file.spec.ts`, plus un parcours « note interne ») dans la PR de copro-ticket ; les sélecteurs changent, la QA les réécrit sans les affaiblir.
- Architecture : `tools/qa/entrypoint-imports.test.mjs`, `motion.static.test.mjs`, contrôle statique « aucun `--lc-message-composer-*` déclaré sur `:host` ».

## 10. Critères d'acceptation
- [x] CA-C1 : Ordre DOM : vignettes, champ pleine largeur, puis barre basse avec le trombone (si `attachments`), les `lcComposerAction` et l'envoi tout à droite. L'envoi affiche `sendIcon`, n'a ni bordure ni fond, est en `--lc-sys-color-primary`, a le nom `sendLabel` (défaut « Envoyer ») et une cible ≥ 44 × 44 px mesurée à 360 px.
- [x] CA-C2 : « Entrée envoie » est actif si `enterSends` vaut `true`, ou `'auto'` et `matchMedia('(pointer: coarse)')` est faux au moment de l'appui. Actif : Entrée sans Maj émet `send` une fois ; Maj+Entrée insère un saut de ligne. Inactif : Entrée insère un saut de ligne. Aucune émission si `isComposing`. Le composant ne modifie jamais `value`.
- [x] CA-C3 : `send` (`{ text: value().trim() }`) n'est pas émis si le texte rogné est vide sans item (`sendBlocked('empty')`), pendant `sending` (`'sending'`), ni si un item est `uploading` (`'uploading'`) ; un item `error` ne bloque pas ; après un `send`, deux clics ou deux Entrées du même cycle n'en émettent qu'un ; un envoi refusé laisse le focus dans le champ.
- [x] CA-C4 : Le champ a `minRows` lignes vide, grandit jusqu'à `maxRows` puis défile ; la barre basse reste entièrement visible ; un changement de largeur recalcule la hauteur. Vérifié en Chromium.
- [x] CA-C5 : Le trombone (clic, Entrée, Espace) ouvre le sélecteur multiple ; acceptés par `filesAdded`, refusés par `rejected` (`type`, `count`) ; le même fichier rechoisi est repris ; `lc-file-upload` garde son comportement (son spec inchangé passe).
- [x] CA-C6 : Un glisser contenant au moins un fichier sur le rectangle (y compris sur un enfant) affiche le calque « Déposez vos fichiers ici » en `duration-fast` sans clignoter ; il s'éteint à la sortie et au lâcher. Un glisser sans fichier n'éclaire rien et n'est pas annulé. `disabled` ou `attachments` faux : rien n'est éclairé, le fichier n'est pas ouvert par le navigateur, rien n'est émis.
- [x] CA-C7 : Chaque item est une vignette : aperçu ou icône et nom, avancement (`progressbar`), erreur (« Échec », « Réessayer » → `retry`), ✕ (`remove`, nom « Retirer <nom> ») ; un nouvel item apparaît en fondu, 0,96 → 1, en `duration-normal` ; après un retrait, le focus va à la vignette suivante ou au champ.
- [x] CA-C8 : Refus : un message par raison sous le rectangle (nom et raison) en `role="alert"`, secousse en `transform` aux tokens `shake-*` ; le message disparaît au prochain ajout, retrait ou à la saisie ; sous réduction des animations, durée nulle (`getAnimations`) et message affiché.
- [x] CA-C9 : `sending` : anneau d'attente, envoi `aria-disabled="true"` sans perte du focus, champ en `readonly` (pas `disabled`) : texte sélectionnable, contraste inchangé, « Envoi en cours… » en `role="status"`.
- [x] CA-C10 : Une classe de l'application sur l'hôte redéfinissant les quatre tokens de bordure et de fond change le rendu sans autre CSS, et ne change ni l'icône ni la couleur du trombone et de l'envoi (couleur principale) ; couleur, épaisseur et fond passent en `duration-normal` ; aucun `--lc-message-composer-*` n'est déclaré sur `:host`.
- [x] CA-C11 : `lcComposerHeader` est au-dessus du rectangle, `lcComposerAction` après le trombone ; Tab suit : en-tête, vignettes, champ, trombone, actions, envoi.
- [x] CA-C12 : axe sans violation (WCAG 2 A/AA) sur 4 états (vide ; items dont un en erreur ; refus affiché ; en-tête et classe « note interne ») à 360 et 1 280 px, thèmes clair et sombre ; test statique : aucun libellé ni valeur en dur, clés fr et en présentes.
- [x] CA-C13 : Dans `lc-form-field`, libellé, aide et erreurs du champ s'appliquent (`aria-describedby`, `aria-invalid`, `touched` à la sortie) ; hors champ sans `ariaLabel`, avertissement en développement seulement ; `[(value)]` et Signal Forms mettent à jour le champ ; `focus()` place le focus dans le champ.
- [x] CA-C14 (manuel) : test `novice-user` sur captures à 360 px (vide, photo en cours, refus, note interne). Résultat (2026-11-21) : HÉSITANT ; icônes sans texte devinées (choix de l'utilisateur, noms accessibles présents) ; textes de la page QA non jugés ; refus sans indication des fichiers acceptés → décision 11, CA-C19.
- [ ] CA-C19 : Un fichier refusé pour son type affiche « {nom} n'est pas accepté. Fichiers acceptés : {liste}. », la liste étant déduite de `accept` sous forme d'extensions (`image/*,.pdf` → « .jpg, .png, .gif, .webp, .heic, .pdf ») ou remplacée par `acceptLabel` ; fr et en ; `accept` vide : aucun refus de type.
- [x] CA-C17 : Un fichier lâché hors du rectangle, composant affiché, n'est ni ouvert par le navigateur ni ajouté ; un texte ou un lien glissé ailleurs n'est pas bloqué ; composant détruit, les écouteurs du document sont retirés.
- [x] CA-C18 : Un fichier collé dans le champ suit le filtrage du dépôt (`filesAdded` ou `rejected`, message et secousse) et n'insère pas de texte ; un collage de texte ou d'HTML n'insère que du texte brut et n'ajoute aucune pièce jointe ; `attachments` faux ou `disabled` : aucun fichier n'est ajouté.
- [x] CA-C15 : Dossier, élément non fichier ou fichier de 0 octet : ignorés, sans exception ni éclairage coincé ; `maxFiles` atteint : refus `count`.
- [x] CA-C16 : `maxLength` : compteur affiché à partir de 90 %, saisie limitée, annonce sans répétition à chaque touche.
- [x] CA-S1 : Un nom contenant `<img src=x onerror=alert(1)>` ou `<script>` est affiché littéralement ; aucun nœud HTML créé dans la vignette, le nom accessible, le message de refus ni `title`.
- [x] CA-S2 : Un nom de plus de 255 caractères est coupé sur une ligne sans casser la mise en page à 360 px ; nom accessible et annonce plafonnés à 80 caractères ; `File.name` émis inchangé.
- [x] CA-S3 : Caractères de contrôle et marqueurs bidi retirés de l'affichage et du nom accessible, nom isolé : `facture‮fdp.exe` ne s'affiche pas comme `facture` suivi de `exe.pdf`.
- [x] CA-S4 : `previewUrl` `javascript:…`, `data:text/html…`, ou `http(s)` d'une autre origine : non chargé, icône de repli, aucun script exécuté ; `blob:`, `data:image/` et même origine affichés par `<img>`.
- [x] CA-S5 : Sous la CSP `default-src 'self'; img-src 'self' blob: data:; style-src 'self'; script-src 'self'`, aucune violation en Chromium pour dépôt, vignette, secousse et agrandissement.
- [x] CA-S6 : Un exécutable renommé `facture.pdf` (type déclaré vide ou `application/x-msdownload`) avec `accept=".pdf"` est accepté, puisque le filtrage lit le nom et le type déclarés, jamais le contenu (test de documentation ; le filtrage partagé avec `lc-file-upload` n'est pas élargi) ; le README dit qu'`accept` n'est pas un contrôle de sécurité ; aucun nom de fichier ni texte saisi dans la console en production.

## 11. Découpage en tâches
- [x] M0 (QA) : tests d'acceptation (`message-composer-browser.mjs`, story QA, tests statiques) avant le code (tous les CA sauf C14).
- [x] M1 : `file-filter.ts` partagé, `lc-file-upload` l'utilise sans changement ; icône `paperclip` ; tokens ; libellé masqué de `lc-form-field` si absent (S ; CA-C5, C10, C15).
- [x] M2 : `lc-message-composer` : rectangle, champ, `FormValueControl`, Entrée, envoi, verrou, `sendBlocked`, projections, libellés (M ; CA-C1 à C4, C9, C11, C13, C16).
- [x] M3 : pièces jointes, dépôt, refus, animations, sécurité des noms et aperçus (M ; CA-C5 à C8, C15, C17, C18, CA-S1 à S6).
- [x] M4 : stories (`Playground`, `Animation`), catalogue, README (S ; CA-C12).
- [x] M5 (QA) : verdict GO / NO-GO, axe, test novice (CA-C12, C14).
- [ ] M6 (PR séparée, copro-ticket) : la réponse du demandeur et celle du gestionnaire utilisent le composant ; `reply-form` s'amincit (alertes et compteur restent) ; `photos-status` remplacé par `sendBlocked` ; bouton d'envoi en `send` en note interne aussi (le cadenas reste dans le sélecteur) ; parcours e2e réécrits par la QA, dont la note interne.

## 12. Risques et questions ouvertes
- **Dettes** : agrandissement par script tant que `field-sizing` n'est pas dans la cible ; iPad avec clavier : `'auto'` le traite en tactile (Entrée va à la ligne).
- **Limites** : glisser-déposer absent sur iOS (le trombone sert) ; geste tactile non essayé sur vrai téléphone.

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| 2026-11-21 | `cadreur` | cadrage | ÉCARTS | Options choisies recopiées mot pour mot ; tokens réduits au besoin du consommateur ; validation laissée à l'application (décision 7) ; accessibilité à cadrer en §5.4 ; fil cadré après la PR 1. |
| 2026-11-21 | `security-reviewer` | conception | RISQUES (2 hautes) | Retenu : dossiers et fichiers vides, `previewUrl` limité (`blob:`, `data:image/`, même origine), noms isolés et plafonnés, CSP, `accept` documenté, borne `maxFiles` 10 ; CA-S1 à S6. Questions dépôt hors zone et collage posées à l'utilisateur. |
| 2026-11-21 | `qa-engineer` | plan de test | À PRÉCISER | Retenu : CA réécrits (C1 à C4, C6, C8, C9, C12), cas limites (C15, C16 et 6), outil `message-composer-browser.mjs`, M0 avant le code, tests copro à risque. |
| 2026-11-21 | `architect` | conception | RÉSERVES | Retenu : `lc-form-field` (`LC_FORM_FIELD_CONTROL`), `file-filter.ts` partagé, `contains(relatedTarget)`, multiple, tokens lus sans déclaration sur `:host`, défaut `border-strong`, `border-style` non animé, tokens de secousse, `ResizeObserver`, `sendLabel`, `focus()`, `attachIcon`, `showSize`, `sendBlocked`, clés `fileUpload*` réutilisées, PR copro-ticket séparée, fil par projection. |
| 2026-11-21 | `ui-ux-designer` | brief | FAIT | Brief en §5.4, maquette B retenue ; `paperclip` ajoutée au kit ; vignette en `duration-normal`, calque de dépôt en `duration-fast` ; jeton `send-color` non retenu (aucun besoin). |
| 2026-11-21 | `code-reviewer` | livraison | CHANGEMENTS REQUIS | 1 bloquant (verrou après envoi de pièces jointes seules) et recommandations corrigés. |
| 2026-11-21 | `security-reviewer` | livraison | ACCEPTABLE | 3 points bas corrigés (base opaque, caractères invisibles, README). |
| 2026-11-21 | `qa-engineer` | vérification | GO | Vitest 2154/2154, `message-composer-browser.mjs all` 130 OK deux fois, axe 16/16, CSP, contrôles 65/65, extraits 363/363, non-régression `motion` 544 et `ios-motion` 105. |
| 2026-11-21 | `novice-user` | captures | HÉSITANT | Refus sans fichiers acceptés → décision 11. |
| 2026-11-21 | `cadreur` | livraison | ÉCARTS non bloquants | Écrits ci-dessous. |
| 2026-11-21 | `code-reviewer` | simplification | 7 propositions | Retenu : tests en double, export inutile, type dupliqué, test du compteur ; gardé : barre de progression recopiée (deux appelants). |

**Écarts constatés à l'implémentation**
- Libellés ajoutés : `composerCount`, `composerLimitNear`, `composerLimitReached` (CA-C16) ; `fileUploadAnnounceDone` réutilisé ; `composerRejectedType` (décision 11).
- `file-filter.ts` : option `skipEmpty` et `droppedFiles` (dossiers et fichiers vides, CA-C15) ; `file-display.ts` : `fileSizeText` extrait de `lc-file-upload` (même rendu), `cleanFileName`, `announcedName`, `isSafePreviewUrl` (CA-S1 à S4), déduction du libellé des fichiers acceptés.
- Contrat de contrôle de formulaire complété : sortie `touch`, entrées `required`, `errors`, `inputId` ; `touch` à la sortie du composant entier.
- Annonces polies : début, fin et échec d'envoi d'une pièce jointe ; limite atteinte.
- `lc-form-field` : entrée `labelHidden` ; consommateur : copro-ticket (M6).
- Barre d'avancement en `[style.width.%]` (CSSOM, sans `style` en chaîne ; CSP respectée).
- Tailles de vignettes en tokens de composant en `rem` (aucune valeur `sys` ne convient) ; jeton `enter-scale` = `dialog.enter-scale`.
- Verrou levé aussi par un changement des identifiants des pièces jointes ; collage mixte : le texte prime ; dépôt sur un autre `input[type=file]` non bloqué ; aperçus « même origine » seulement en `http(s)`.
- Trombone au clavier prouvé par le clic reçu (Chromium sans écran ne signale pas toujours le sélecteur de fichiers) ; CSP testée avec `script-src` élargi pour Storybook seul.
- Non réalisé ici : M6 (copro-ticket), PR 2 (`lc-message-thread`).
