---
name: frontend-guidelines
description: Socle qualité front-end (accessibilité, responsive, états d'écran, performance, sécurité côté client) et aiguillage vers impeccable pour le design visuel. À utiliser pour créer ou revoir des pages, composants, formulaires, layouts, ou quand l'utilisateur parle d'interface, UX, accessibilité, mobile ou performance web.
---

# Frontend Guidelines

Qui fait quoi :
- **Code Angular** (couches, signaux, store, data-access) : skill `angular-best-practices`.
- **Design visuel** (direction artistique, typographie, couleurs, layout, animation, copy UX) : skill `impeccable`.
  - Démarrage d'un projet front : `/impeccable init` (crée `PRODUCT.md`), puis `/impeccable document` pour figer le système visuel dans `DESIGN.md`.
  - Nouvel écran : `/impeccable shape` avant de coder.
  - Revue : `/impeccable critique` (design) et `/impeccable audit` (accessibilité, performance, responsive).
  - Finition : `/impeccable polish`, `/impeccable harden` (états d'erreur, textes longs, cas limites).
  - Le hook d'impeccable vérifie automatiquement chaque fichier UI modifié par Claude.
- **Ce skill** : le socle non négociable ci-dessous, quel que soit le design.

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
