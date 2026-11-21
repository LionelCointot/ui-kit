# Spec : Fil de messages générique (`lc-message-thread`, PR 2 de la messagerie)

- **Statut** : Brouillon (2026-11-21), cadrage
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
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : nouveau composant, templates, projection de `lc-message-composer` (aucun import entre points d'entrée).
  - [x] Écran : nouveau composant visible ; directions maquettées, choix de l'utilisateur, test `novice-user`.
  - [x] Sécurité et données : liens cliquables (décision 9 : seulement `http(s)`, `rel=noopener noreferrer`, sans `innerHTML`), noms et contenus fournis par l'application.
