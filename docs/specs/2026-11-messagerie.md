# Spec : Messagerie générique (zone de saisie, puis fil de messages)

- **Statut** : Brouillon (2026-11-21), cadrage
- **Auteur** : session principale
- **Date** : 2026-11-21
- **ADR liés** : 0009 (cible navigateurs, CDK par défaut)

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** :
  - « J'aimerai poser quelques question sur la messagerie de codra-ticket est-ce que c'est un assemblage ou un composant a part entiere? Car cela pourrai etre un composant chat configurable generique permettant d'afficher ou non la saisie texte etc... les datas avec des template etc... Ainsi dans la parti où on ecrit le texte au lieux d'avoir 3 grosse partie pour importer les ilage et un bouton envoyer en dehors, il faudrait dans la partie textuelle ( donc dans le meme recrangle) avec un séparateur pour mettre une poece jointe a gauchue ou le deag and drop ( et avoir uje animation lorsqu'on drop une image/ficher pour montrer qu'on recupere bien la puece jointe) et a droite la petite fleche qui represente l'envoie tu en pense quoi? »
  - Périmètre : « Les 2 mais tu oeux faire en 2 pr »
  - Touche Entrée : « A » ; pièces jointes : « A » ; dépôt : « A »
  - « A et par contre rendre possible la customisation du champs texte du lessage, un peu a la manière de ms message privee avec des pojtillee, il faudrait changer de couleur ( c'est copro ticket qui se chzrge de ca) mais ui kit permet justement de rajouter un classe afin que copro ticket change la couleur du saisie texte si tu vois ce que je veux dire »
- **Besoin en trois phrases** : la réponse à une demande dans copro-ticket est un assemblage local de trois blocs (champ texte, envoi de photos, bouton « Envoyer » séparé), lourd à l'écran et non réutilisable. Le kit doit fournir une zone de saisie de message générique en un seul rectangle (pièce jointe à gauche, texte, flèche d'envoi à droite, glisser-déposer animé), puis un fil de messages générique dont l'affichage se personnalise par template. L'application garde l'envoi réel et la logique métier, et peut changer l'apparence du rectangle (par exemple une note interne en pointillés) par une simple classe.
- **Décisions prises pendant le cadrage** (2026-11-21, utilisateur) :
  1. Deux composants génériques, deux PR : **PR 1** `lc-message-composer` (zone de saisie) ; **PR 2** `lc-message-thread` (fil de messages, données affichées par template, saisie affichable ou non).
  2. Touche Entrée : sur pointeur fin (ordinateur), Entrée envoie, Maj+Entrée va à la ligne ; sur téléphone (pointeur grossier), Entrée va à la ligne et on envoie avec la flèche. Réglable par l'application.
  3. Pièces jointes en vignettes au-dessus du texte, dans le rectangle : aperçu d'image ou icône et nom, avancement, erreur avec « Réessayer », ✕ pour retirer avant envoi ; apparition douce au dépôt. Le composant affiche ; l'application envoie et lui fournit l'état (comme `lc-file-upload`).
  4. Zone de dépôt : le rectangle seul ; il s'éclaire au survol d'un fichier (« Déposez vos fichiers ici ») ; refus signalé sous le rectangle avec sa raison, petite secousse sauf réduction des animations. Le fil de la PR 2 pourra étendre le dépôt à toute la conversation, en option.
  5. Zones libres : un en-tête au-dessus du rectangle (copro-ticket y garde le choix « Note interne / Visible par le demandeur ») et une zone d'actions à côté du trombone.
  6. Apparence personnalisable par l'application : tokens CSS du composant (bordure style, couleur, épaisseur ; fond ; texte ; texte d'aide ; séparateur ; flèche) qu'une classe de l'application redéfinit, avec transition ; le kit ne fournit aucune variante métier.
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
