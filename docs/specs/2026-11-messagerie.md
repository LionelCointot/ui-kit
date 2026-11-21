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
  7. Décidé par la session (technique, 2026-11-21) : le composant ne valide pas ; il reçoit de l'application `label` (masqué visuellement si demandé), `hint`, `error`, `sending`, et émet l'envoi ; il réutilise les types et la logique de filtrage de `lc-file-upload` (`accept`, taille, nombre, raisons de refus) sans composer ce composant. Le fil (PR 2) est cadré après la PR 1.
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : deux nouveaux composants, réutilisation de la logique de `lc-file-upload`, points d'entrée à choisir.
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
