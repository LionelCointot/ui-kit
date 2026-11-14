---
name: frontend-guidelines
description: Socle qualité front-end (accessibilité, responsive, états d'écran, performance, sécurité côté client) et aiguillage vers impeccable pour le design visuel. À utiliser pour créer ou revoir des pages, composants, formulaires, layouts, ou quand l'utilisateur parle d'interface, UX, accessibilité, mobile ou performance web.
---

# Frontend Guidelines

Qui fait quoi :
- **Code Angular** (couches, signaux, store, data-access) : skill `angular-best-practices`.
- **Design visuel** (direction artistique, typographie, couleurs, layout, animation, copy UX) : skill `impeccable`.
  - Démarrage d'un projet front : `/impeccable init` (crée `PRODUCT.md`), puis `/impeccable document` pour figer le système visuel dans `DESIGN.md`.
  - Nouvel écran, nouveau parcours ou refonte : exploration de 2 ou 3 directions maquettées, choix de l'utilisateur, puis `/impeccable shape` avant de coder.
  - Revue : `/impeccable critique` (design) et `/impeccable audit` (accessibilité, performance, responsive).
  - Finition : `/impeccable polish`, `/impeccable harden` (états d'erreur, textes longs, cas limites).
  - Le hook d'impeccable vérifie automatiquement chaque fichier UI modifié par Claude.
- **Rôle** : le sous-agent `ui-ux-designer` porte ce travail (triage, exploration, conception, conformité) dans `delivery-workflow` ; le sous-agent `novice-user` vérifie que l'écran se comprend sans connaître le domaine.
- **Ce skill** : le socle non négociable ci-dessous, quel que soit le design.

## Impact UI (critère de triage)
Il y a impact UI dès que la tâche change ce que l'utilisateur voit ou manipule : template, style, token, composant visuel, texte affiché (libellé, message d'erreur, format de nombre ou de date), état d'écran, navigation, focus ou comportement clavier. Un changement purement back, de test, de build ou de doc interne n'en a pas : le designer le déclare explicitement (« pas d'impact UI »).

## Parcours et langage (obligatoire dès qu'un écran s'adresse au grand public)
- **Pour qui** : l'utilisateur principal de `PRODUCT.md`. Sans précision confirmée, un débutant qui ne connaît pas le vocabulaire du domaine.
- **Des questions, pas des rubriques** : l'écran suit l'histoire de la personne et lui demande ce qu'elle sait déjà. Il ne range pas les entrées du calcul par entité métier.
- **Une décision à la fois** sur le chemin principal ; ce qui ne sert pas à cette décision n'est pas à l'écran.
- **Tout ce que la personne ne sait pas est prérempli**, avec une valeur courante dite comme telle et modifiable plus tard. Le chemin principal ne demande que l'indispensable ; les réglages avancés sont à un clic, jamais au même niveau.
- **La réponse d'abord** : une phrase, puis ce qui l'explique, puis le détail à la demande. Pas d'onglets de résultats pour un débutant.
- **Dire ce qui compte** : nommer les deux ou trois valeurs qui changent vraiment le résultat, au lieu de présenter tous les réglages à égalité.
- **Mots de tous les jours** : aucun terme de métier ni sigle non expliqué sur le chemin principal. `PRODUCT.md` tient le tableau « Mots de l'écran » (notion du code → mots affichés) ; le code et la spec gardent les termes du métier.
- **S'adresser à la personne** (« vous payez », « vous possédez »), phrases de moins de 20 mots, un chiffre important par phrase.
- **Vérification** : le test `novice-user` (textes du brief, puis captures de l'écran réel) fait partie des portes de `delivery-workflow`.

## Structure
- Composants petits, à responsabilité unique ; présentation séparée de la logique (store / services).
- Design tokens centralisés (couleurs, espacements, typographie, rayons) en variables CSS ; aucune valeur en dur dispersée. `DESIGN.md` en est la référence.
- Toujours les 4 états : chargement, vide, erreur, succès.

## Qualité UI
- Mobile-first ; vérifier à 360px, 768px et 1280px.
- Hiérarchie visuelle claire ; taille de texte de base ≥ 16px ; contraste suffisant.
- Cibles tactiles ≥ 44px ; retour visuel sur chaque action (chargement, bouton désactivé contre le double clic).
- Réutiliser les composants existants (`shared/ui`) avant d'en créer.
- Nombres et montants : format français (`1 159,92 €`), alignés à droite dans les tableaux, police à chiffres tabulaires.

## Accessibilité (obligatoire, WCAG AA)
- HTML sémantique (`button`, `nav`, `main`, `label`, `table`), jamais de `div` cliquable.
- Navigation clavier complète, focus visible, ordre logique.
- `aria-*` seulement quand le HTML natif ne suffit pas ; `role="status"` / `role="alert"` pour les messages dynamiques.
- Ne jamais transmettre une information par la seule couleur (graphiques compris).
- Formulaires : labels associés, erreurs explicites liées au champ (`aria-describedby`), focus sur la première erreur à la soumission.

## Performance
- Code splitting par route, `@defer` pour les blocs lourds (graphiques), images optimisées (`NgOptimizedImage`).
- Mesurer avant d'optimiser ; surveiller LCP, CLS, INP.

## Sécurité
- Pas de `innerHTML` ni `bypassSecurityTrust*` sans assainissement justifié.
- Aucun secret côté client.
