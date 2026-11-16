# Spec : dépôt de fichiers, liste modifiable et icônes pour un suivi de demandes (K1, K9, K11)

- **Statut** : Validée (demande du projet consommateur copro-ticket, deuxième tranche, 2026-11-16)
- **Date** : 2026-11-16
- **Source** : brief de design de la deuxième tranche de copro-ticket, section « Besoins du ui-kit » (entrées K1, K9 et K11 ; les autres entrées K ne font pas partie de ce lot)
- **Liés** : `2026-11-composants-suivi-de-demandes.md` (premier lot), `2026-11-catalogue-composants.md`, `DESIGN.md`

Tout est **générique** : aucun vocabulaire métier dans les API, les libellés, les tokens ni les stories. Limites, types acceptés et textes propres au consommateur sont des entrées ou des libellés par défaut neutres.

## 1. Contexte et problème
Les écrans de la deuxième tranche de copro-ticket joignent des fichiers à un formulaire et administrent une liste de valeurs (ajout, renommage, ordre, activation). Le kit n'a ni composant de dépôt de fichiers ni liste modifiable, et il lui manque deux icônes. Sans eux, le consommateur écrirait ces composants chez lui, ce que sa règle interdit.

## 2. Objectifs
| Id | Élément | Point d'entrée | Besoin |
|---|---|---|---|
| K1 | `lc-file-upload` | `forms` | Choisir des fichiers (bouton qui ouvre le sélecteur natif, zone de dépôt) et afficher l'état que l'application lui donne : une ligne par fichier avec aperçu, nom, taille, progression, erreur, « Retirer » et « Réessayer ». **Ne dépose rien** : aucun appel réseau dans le kit. |
| K9 | `lc-list-editor` | `forms` | Liste modifiable et réordonnable : ajout, renommage en place, déplacement (monter, descendre), activation et désactivation, lignes verrouillées, minimum d'éléments actifs ; toutes les écritures sortent en événements, l'application garde la liste. Pas de suppression, pas de glisser-déposer. |
| K11 | Icônes | principal | `image-off`, `circle-off` ajoutées au registre par défaut ; les onze autres icônes citées par le brief existent déjà. |

## 3. Hors périmètre (non-objectifs)
- Le dépôt lui-même, la réduction d'image, le contrôle de taille, la création ou la révocation d'adresses d'aperçu : à la charge de l'application.
- La visionneuse et la grille de vignettes, le champ de recherche, les onglets pilotés par l'adresse (autres entrées du brief, lots suivants).
- Le glisser-déposer pour réordonner (K9) ; tout contenu ou libellé propre à copro-ticket.
- Un `FormValueControl` pour `lc-file-upload` : la valeur est la liste `items` de l'application, pas un champ.

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : le développeur d'un projet consommateur, qui compose ses écrans avec le kit.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Développeur | Joindre jusqu'à N fichiers d'un type donné à un formulaire | Un composant à lier : il reçoit les fichiers choisis, déposés par l'application, qui lui rend l'état |
| Développeur | Montrer l'avancement et les échecs d'un dépôt | Barre, message d'erreur, « Réessayer » et « Retirer » sans CSS à écrire |
| Développeur | Administrer une liste de valeurs ordonnée | Un composant, des événements, aucune mutation interne |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
Conventions du kit (`CLAUDE.md`) : composants autonomes, signaux, OnPush, tokens `--lc-<composant>-*` avec repli sur `--lc-sys-*`, libellés par `LC_LABELS` (français et anglais), aucun `innerHTML`, aucune dépendance, aucun import entre points d'entrée secondaires hors exceptions admises. `forms` n'importe donc pas `feedback` : la barre de progression de `lc-file-upload` est un `role="progressbar"` interne au composant (CSS recopié de `lc-progress-bar`). Les deux composants sont de présentation : l'application possède l'état et reçoit des sorties.

### 5.2 Modèle de données
Modèle d'élément de K1 : section « Livré ». Modèle de K9 : section « Livré (V2) » (le texte secondaire que le brief nomme `trace` s'appelle `detail`).

### 5.3 API / interfaces
K1 : section « Livré ». K9 : section « Livré (V2) ».

### 5.4 Interface utilisateur
Référence : les écrans du brief (bloc de dépôt de photos ; réglages d'une liste). Le rendu suit `DESIGN.md` : tokens seulement, deux thèmes, cibles de 44 px, focus visible, utilisable à 360 et 320 px sans défilement horizontal. Chaque composant a ses stories (vide, états, cas limites, dans `lc-form-field`).

## 6. Cas limites et gestion des erreurs
- Nom de fichier très long ou sans espace : le radical est coupé, l'extension reste visible, pas de défilement horizontal.
- Aperçu qui ne se charge pas : la ligne passe à l'icône « image indisponible ».
- Limite atteinte : le choix est inactif et le dit ; un dépôt à la souris est refusé (`rejected`, raison `count`).
- Fichiers refusés (type, nombre) : le composant ne dit rien de plus que ses sorties ; l'application choisit son message.
- Composant désactivé : choix, dépôt, « Retirer » et « Réessayer » inertes.
- Usage incorrect non bloquant (pas de nom accessible hors de `lc-form-field`) : avertissement console en développement seulement.

## 7. Sécurité, performance, observabilité
- Sécurité : aucun `innerHTML` ; aucun appel réseau ; le composant ne crée ni ne révoque d'adresse d'objet (les aperçus viennent de l'application) ; la vérification du type par `accept` est un confort, la vérité est côté serveur.
- Performance : aucune dépendance ajoutée.
- Logs / métriques : N/A.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Écrire ces composants dans copro-ticket | Plus rapide | Contraire à la règle du consommateur ; non réutilisable | Non |
| Faire déposer les fichiers par le composant (service HTTP injectable) | Moins de code chez le consommateur | Réseau, authentification et réduction d'image dans une bibliothèque de présentation | Non |
| Importer `lc-progress-bar` depuis `feedback` | Pas de doublon de CSS | Nouvelle exception à la règle d'import entre points d'entrée | Non |
| `FormValueControl<File[]>` pour K1 | Branchement direct à Signal Forms | La liste affichée (états, progression) n'est pas la valeur du champ | Non |

## 9. Plan de test
- Unitaires et de composant (Vitest) : filtrage par `accept`, limite et `multiple`, sorties, états de ligne, annonces, focus après retrait, intégration `lc-form-field`.
- Storybook : une story par état, contrôle d'accessibilité.
- Visuel : captures des stories dans les deux thèmes, à 360 et 320 px.

## 10. Critères d'acceptation
- [ ] CA-L2-1 : `image-off` et `circle-off` sont dans le registre par défaut, s'affichent par `lc-icon`, et viennent de la même source et de la même version que les autres (Lucide, `lucide-static`).
- [ ] CA-L2-2 : `lc-file-upload` n'effectue aucun appel réseau et ne crée ni ne révoque d'adresse d'objet ; il n'importe aucun autre point d'entrée.
- [ ] CA-L2-3 : le bouton ouvre le sélecteur natif (`accept` et `multiple` transmis) ; un dépôt à la souris donne le même résultat ; `filesAdded` n'émet que des fichiers de type accepté et dans la limite de `maxFiles` (un seul fichier par choix sans `multiple`).
- [ ] CA-L2-4 : `rejected` émet chaque fichier refusé avec la raison `type` ou `count` ; rien n'est émis quand tout est accepté.
- [ ] CA-L2-5 : au maximum atteint, le bouton porte `aria-disabled="true"` (il reste atteignable au clavier), un texte visible le dit, il est relié au bouton par `aria-describedby` et annoncé ; ni le sélecteur ni un dépôt n'ajoutent de fichier.
- [ ] CA-L2-6 : chaque ligne montre un aperçu (ou une icône), le nom (radical coupé, extension visible), la taille lisible dans la langue des libellés, et selon l'état : en attente, barre de progression avec `aria-valuenow` (indéterminée sans valeur), terminé, ou message d'erreur.
- [ ] CA-L2-7 : « Retirer » (nom accessible « Retirer {nom} ») et, en erreur, « Réessayer » émettent `remove` et `retry` avec l'identifiant de la ligne ; le composant ne modifie jamais `items`.
- [ ] CA-L2-8 : tout se fait au clavier ; la progression est annoncée au début et à la fin, jamais à chaque pourcentage ; une erreur est annoncée (`role="alert"`) ; après un retrait, le focus va à la ligne suivante, sinon à la précédente, sinon au bouton de choix.
- [ ] CA-L2-9 : dans `lc-form-field`, le libellé nomme le groupe, l'aide et l'erreur sont reliées par `aria-describedby`, un clic sur le libellé met le focus sur le bouton de choix ; hors du champ, `ariaLabel` nomme le groupe.
- [ ] CA-L2-10 : tokens `--lc-file-upload-*` avec repli sur `--lc-sys-*`, aucune valeur en dur, deux thèmes ; libellés par `LC_LABELS` (français et anglais) ; aucune dépendance ajoutée.
- [ ] CA-L2-11 : à 360 px et à 320 px, aucun défilement horizontal, cibles de 44 px.
- [ ] CA-L2-12 : `lc-list-editor` (V2) : ajout, renommage (Entrée valide, Échap annule et rend le focus à « Renommer »), déplacement par boutons (inertes aux extrémités) et par Alt + flèche haut ou bas, activation ; ligne protégée ni renommable ni désactivable mais réordonnable, avec sa raison ; interrupteur inerte sur le dernier élément actif (`minActive`, les protégés comptent) avec sa raison ; erreurs détectées (vide, trop long, doublon) sans émission, erreurs de l'application par ligne et sous le champ d'ajout ; `modified` ; états occupé, désactivé et vide ; tout sort en événements, le composant ne modifie jamais `items`.
- [ ] CA-L2-14 : `lc-list-editor` : chaque commande est nommée avec le libellé de sa ligne ; après un déplacement, le focus suit la commande dans la nouvelle ligne et la position est annoncée ; après un ajout, le focus reste au champ d'ajout, qui est vidé quand l'élément apparaît, et l'ajout est annoncé ; dans `lc-form-field`, le libellé nomme le groupe ; utilisable à 360 et 320 px sans défilement horizontal, cibles de 44 px.
- [ ] CA-L2-15 : retouches de `lc-file-upload` (V2) : 999 999 octets s'affichent « 1 Mo » (passage à l'unité supérieure quand l'arrondi atteint 1 000), jamais de décimale nulle (« 2 Mo ») ; un nom coupé affiche « … » contre l'extension, sans espace.
- [ ] CA-L2-13 : chaque composant a ses stories ; `npx ng test ui-angular --watch=false`, `npm run build` et `npm run build-storybook` réussissent ; aucun vocabulaire métier.

## 11. Découpage en tâches
- [x] V1 : icônes (K11) et dépôt de fichiers (K1), stories, documentation (M, couvre CA-L2-1 à CA-L2-11, CA-L2-13 pour V1 ; tests écrits ensuite par la QA)
- [x] V2 : liste modifiable (K9), deux retouches de `lc-file-upload`, stories, documentation (M, couvre CA-L2-12, CA-L2-14, CA-L2-15 et CA-L2-13 pour V2 ; tests écrits ensuite par la QA)

## 12. Risques et questions ouvertes
- Un nom qui se termine par un point ou une longue « extension » n'est pas séparé : le nom entier est coupé alors.
- Le retrait annoncé et le focus après retrait supposent que l'application retire la ligne de `items` en réponse à `remove` ; si elle demande d'abord une confirmation, rien n'est annoncé ni déplacé tant que la ligne reste.
- Les tailles utilisent des unités décimales (1 Ko = 1 000 octets), comme l'affichage courant en français.
- K9 : le brief du consommateur voulait une ligne protégée sans commande et toujours en dernier ; ici elle reste réordonnable. Pour une ligne fixe en dernière position, l'application la rend elle-même après le composant.
- K9 : si l'application refuse une action (aucun changement de `items`), le focus et le champ d'ajout restent tels quels et rien n'est annoncé ; seule une nouvelle action remplace l'attente.

## Livré (V1)

| Id | Élément | Point d'entrée | API |
|---|---|---|---|
| K11 | icônes | principal | Ajoutées : `image-off`, `circle-off`. Déjà présentes : `log-in`, `pencil`, `save`, `arrow-up`, `arrow-down`, `search`, `chevron-left`, `chevron-right`, `rotate-ccw`, `x`, `check`. Générées par `tools/generate-icons.mjs` (Lucide, `lucide-static` 1.70.0) |
| K1 | `lc-file-upload` (`LcFileUploadComponent`) | `forms` | Voir ci-dessous |

**Entrées** : `items: readonly LcFileUploadItem[]` (défaut vide) ; `accept: string` (format de l'attribut natif : types MIME, `type/*`, extensions ; vide = tous) ; `multiple: boolean` (défaut `false`, comme le natif : sans lui, un seul fichier est pris par choix ; il ne limite pas le total, c'est `maxFiles`) ; `maxFiles: number | null` (défaut `null`, sans limite ; compté sur `items`) ; `disabled: boolean` ; `ariaLabel: string` (nom du groupe hors de `lc-form-field`) ; `id: string` (généré).

**Sorties** : `filesAdded: File[]` (fichiers acceptés) ; `rejected: LcFileUploadRejection[]` (`{ file, reason: 'type' | 'count' }`, un événement par choix ou dépôt, seulement s'il y a des refus ; un événement et non un par fichier, pour qu'une application annonce un seul message) ; `remove: string` et `retry: string` (identifiant de la ligne).

**Modèle d'élément** `LcFileUploadItem` : `id`, `name`, `size` (octets), `status: 'pending' | 'uploading' | 'done' | 'error'`, `progress?: number | null` (0 à 100 ; absent ou `null` : barre indéterminée), `errorMessage?` (texte par défaut « Échec de l'envoi »), `previewUrl?` (adresse d'une image, fournie par l'application), `statusLabel?` (remplace le texte d'état hors erreur, par exemple une étape de préparation que l'application connaît).

**Rendu** : zone de dépôt entourant le bouton (cadre en tirets et phrase d'invite à partir de 768 px ; en dessous, bouton pleine largeur, le dépôt reste possible) ; liste `<ul>` de lignes (aperçu de 56 px ou icône `file-text`, `image-off` si l'aperçu échoue ; nom dont le radical est coupé ; taille et état ; barre ; message d'erreur en `role="alert"` ; « Réessayer » ; « Retirer » en bouton icône). Cible de 44 px (`lcButton`). Annonces par une zone `role="status"` masquée : début d'envoi, fin d'envoi, retrait, limite atteinte.

**`lc-form-field`** : intégré. `lc-file-upload` se fournit sous `LC_FORM_FIELD_CONTROL` avec `labelable = false` : le groupe (`role="group"`) est nommé par `aria-labelledby` vers le libellé du champ, relié à l'aide et aux erreurs par `aria-describedby`, un clic sur le libellé met le focus sur le bouton de choix ; l'état invalide (`errors`) colore la zone. Le composant n'est pas un `FormValueControl` (pas de valeur de champ).

**Tokens** (repli `--lc-sys-*`) : `--lc-file-upload-zone-background`, `-zone-border-color`, `-zone-active-background`, `-zone-active-border-color`, `-zone-radius`, `-row-background`, `-row-border-color`, `-row-radius`, `-preview-size`, `-preview-background`, `-bar-color`, `-error-color`.

**Libellés `LC_LABELS`** (FR et EN) : `fileUploadChoose`, `fileUploadChooseMany`, `fileUploadDropHint`, `fileUploadList`, `fileUploadLimitReached(max)`, `fileUploadRemove(nom)`, `fileUploadRetry(nom)`, `fileUploadPending`, `fileUploadUploading(progression)`, `fileUploadDone`, `fileUploadFailed`, `fileUploadProgress(nom)`, `fileUploadAnnounceDone(nom)`, `fileUploadAnnounceRemoved(nom)`, `fileSizeUnits` ; le texte visible de « Réessayer » est le libellé existant `retry`.

Stories : `Formulaires/Dépôt de fichiers` (`Vide`, `UnFichierEnCours`, `EtatsMeles`, `ErreurAvecReessayer`, `MaximumAtteint`, `Desactive`, `NomsTresLongs`, `DansUnChamp`, `Interactif` avec un dépôt simulé par minuterie, sans réseau).

**Compléments** (usage réel : joindre des photos à une demande ; valeurs par défaut sans effet sur les usages existants). `lc-file-upload` : `showSize` (`true` ; faux : ni poids affiché, ni poids dans la ligne, qui garde l'état), `chooseIcon` (`'upload'`), `errorPlaceholderIcon` (`'file-text'`, icône d'une ligne en erreur sans vignette), `fullWidthMobile` (`false` ; vrai : bouton de choix pleine largeur sous 480 px de largeur disponible), `removeLabelVisible` (`false` ; vrai : bouton « Retirer » avec son mot, libellé `fileUploadRemoveShort` FR et EN, nom accessible inchangé). `LcFileUploadItem.retryable?: boolean` (défaut réessayable ; faux : pas de « Réessayer »). « Réessayer » et le bouton « Retirer » avec mot font 44 px de haut. Correction : le composant, sa zone et sa liste occupent 100 % de la largeur disponible (il est aussi conteneur de requêtes) ; sous 480 px, le message d'erreur et « Réessayer » passent en pleine largeur sous la vignette. `lc-form-field` : `hintPlacement: 'below' | 'above'` (`'below'`), `'above'` place l'aide entre le libellé et le contrôle, `aria-describedby` inchangé. Stories : `SansPoids`, `ErreurNonReessayable`, `IconesPersonnalisees`, `RetraitAvecMot`, `BoutonPleineLargeur`, `PhotosSansPoidsErreursNonReessayables360`, et `Formulaires/Champs` : `AideAuDessus`.

## Livré (V2)

| Id | Élément | Point d'entrée | API |
|---|---|---|---|
| K9 | `lc-list-editor` (`LcListEditorComponent`) | `forms` | Voir ci-dessous |
| V1 | `lc-file-upload`, deux retouches | `forms` | Taille : passage à l'unité supérieure quand l'arrondi atteint 1 000 (999 999 o : « 1 Mo »), décimale nulle omise (« 2 Mo »). Nom coupé : le radical est coupé net (plus de `text-overflow: ellipsis`, qui laissait un vide avant l'extension) ; le composant mesure les radicaux qui débordent (`ResizeObserver`, absent en test : alors aucune coupe) et pose « … » contre l'extension (classe `lc-file-upload__name--cut`) |

**Entrées** : `items: readonly LcListEditorItem[]` ; `savedItems: readonly LcListEditorItem[] | null` (état de référence, défaut `null`) ; `minActive: number` (défaut 0, aucune règle ; les protégés comptent comme actifs) ; `maxLength: number | null` (défaut `null`) ; `isDuplicate: (existant, proposé) => boolean` (défaut : égalité insensible à la casse et aux espaces de bord) ; `addLabel`, `addButtonLabel`, `emptyText`, `listLabel` (remplacent les libellés par défaut) ; `addError: string | null` (erreur du champ d'ajout fournie par l'application) ; `disabled` (tout est désactivé nativement) ; `busy` (opération en cours : commandes inertes par `aria-disabled`, elles gardent le focus) ; `ariaLabel` (nom du groupe hors de `lc-form-field`) ; `id`.

**Sorties** : `add: string` (libellé valide, sans espaces de bord) ; `rename: { id, label }` ; `move: { id, direction: 'up' | 'down' }` ; `toggle: { id, active }`. Le composant ne modifie jamais `items` et ne supprime rien : l'application applique, ou refuse.

**État exposé** : `modified: Signal<boolean>`, vrai quand `items` diffère de `savedItems` par l'ordre, les libellés ou les activations (toujours faux sans `savedItems`) ; lu par une référence de gabarit : `@if (editor.modified()) { … }`.

**Modèle d'élément** `LcListEditorItem` : `id`, `label`, `active`, `locked?` (ni renommable ni désactivable, compte comme actif, reste réordonnable), `lockedReason?` (texte de l'application sous le libellé), `lockedLabel?` (texte du badge, défaut `listEditorLocked` « Protégé »), `detail?` (texte secondaire), `busy?` (commandes de la ligne inertes), `error?` (erreur de la ligne, par exemple celle du serveur, affichée sous elle en `role="alert"`).

**Règles** : vérifiées à l'ajout et à l'enregistrement d'un renommage, avec message sous le champ et sans émission : libellé vide (obligatoire), plus long que `maxLength`, doublon (`isDuplicate`, hors la ligne elle-même). Un libellé identique à l'actuel annule le renommage sans émettre. L'interrupteur du dernier élément actif (selon `minActive`) est inerte (`aria-disabled`, atteignable au clavier), la raison est affichée et reliée par `aria-describedby`, par la nouvelle entrée `extraDescribedBy` de `button[lcSwitch]` (ajoutée à l'interrupteur, comme celle de `lc-segmented-control` ; elle s'ajoute à la description du `lc-form-field` et ne change rien sans valeur).

**Réordonnancement** : boutons « Monter » et « Descendre » sur chaque ligne (`aria-disabled` aux extrémités : le focus n'est pas perdu quand l'élément atteint un bout) ; raccourci Alt + flèche haut ou bas depuis n'importe quel contrôle de la ligne (hors édition du nom). Après le déplacement, le focus suit la **même commande** dans la nouvelle ligne et « {libellé}, position 2 sur 5 » est annoncé. Souris et doigt : les mêmes boutons (cibles de 44 px). **Pas de glisser-déposer** : le brief du consommateur l'exclut, aucun composant du kit n'utilise le CDK `drag-drop` (le geste à la souris et au doigt est couvert par les boutons), et un aperçu de déplacement du CDK demanderait des styles globaux ; il pourra s'ajouter sans nouvelle dépendance (le CDK est déjà installé).

**Focus** : après un ajout valide, le focus reste (ou revient) au champ d'ajout, qui est vidé quand l'élément apparaît dans `items` (un refus de l'application garde la saisie) ; l'ajout est annoncé (« {libellé} ajouté en position 8. »). Après un renommage (Entrée ou Échap), le focus revient à « Renommer » ; à l'ouverture de l'édition, il va au champ, texte sélectionné.

**Annonces** (zone polie masquée, une fois l'effet visible dans `items`) : position après un déplacement, « est actif » ou « est désactivé » après une activation, ajout. L'interrupteur est remis d'accord avec `items` si l'application ne suit pas ; cette remise d'accord n'émet jamais `toggle`.

**Rendu** : liste `ul` de lignes `li` ; par ligne : libellé (retour à la ligne), badge « Désactivé » (icône `circle-off`) ou « Protégé » (icône `lock`), texte secondaire, raisons, erreur ; commandes : Monter, Descendre, Renommer, interrupteur « Actif » (quatre arrêts de tabulation, deux pour une ligne protégée), sous le libellé sous 768 px, à côté au-delà. Édition en place : champ « Nouveau nom de {libellé} », « Enregistrer », « Annuler ». Champ d'ajout (étiquette, champ, bouton) après la liste ; texte de liste vide.

**`lc-form-field`** : intégré comme `lc-file-upload` (`LC_FORM_FIELD_CONTROL`, `labelable = false`, `role="group"` nommé par le libellé du champ, `aria-describedby` vers l'aide et les erreurs ; un clic sur le libellé met le focus sur le champ d'ajout). Les interrupteurs internes ne reprennent pas l'aide du champ (`viewProviders`).

**Tokens** (repli `--lc-sys-*`) : `--lc-list-editor-row-background`, `-row-border-color`, `-row-radius`, `-badge-background`, `-badge-color`, `-error-color`.

**Libellés `LC_LABELS`** (FR et EN) : `listEditorList`, `listEditorAddLabel`, `listEditorAdd`, `listEditorEmpty`, `listEditorMoveUp(libellé)`, `listEditorMoveDown(libellé)`, `listEditorRename(libellé)`, `listEditorRenameField(libellé)`, `listEditorSave`, `listEditorToggle(libellé)`, `listEditorActive`, `listEditorInactive`, `listEditorLocked`, `listEditorMinActive(min)`, `listEditorRequired`, `listEditorTooLong(max)`, `listEditorDuplicate`, `listEditorPosition(libellé, position, total)`, `listEditorAnnounceAdded(libellé, position)`, `listEditorAnnounceActive(libellé)`, `listEditorAnnounceInactive(libellé)` ; « Annuler » est le libellé existant `cancel`.

Stories : `Formulaires/Liste modifiable` (`Courte`, `LigneProtegee`, `ErreursDeLApplication`, `DernierElementActif`, `ListeLongue`, `Occupee`, `Desactivee`, `Vide`, `A360Pixels`, `DansUnChamp`, `Interactif` : l'état est tenu par la démo ; essayer un champ vide, un doublon, plus de 20 caractères et un libellé contenant « refus »).
