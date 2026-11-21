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
- **Taille** : Fonctionnalité
- **Angles ouverts** :
  - [x] Architecture : nouveau composant, templates, projection de `lc-message-composer` (aucun import entre points d'entrée).
  - [x] Écran : nouveau composant visible ; directions maquettées, choix de l'utilisateur, test `novice-user`.
  - [ ] Sécurité et données : à confirmer (affichage de contenus fournis par l'application, sans `innerHTML`).
