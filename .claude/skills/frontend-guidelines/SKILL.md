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
- **Règles d'interface détaillées** (icônes, cibles tactiles, responsive, mode sombre, formulaires) : skill `ui-ux-pro-max` s'il est présent dans le projet, pour ses règles seulement ; ses palettes et ses polices ne s'appliquent pas, `DESIGN.md` fait foi.
- **Rôle** : le sous-agent `ui-ux-designer` porte ce travail (triage, exploration, conception, conformité) dans `delivery-workflow` ; l'utilisateur juge que l'écran se comprend.
- **Cadre visuel** (composants et tokens disponibles, quoi faire quand il en manque) : skill `ui-kit`, s'il est présent dans le projet.
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
- **Vérification** : l'utilisateur juge la compréhension de l'écran sur les maquettes, Storybook ou captures que la session principale lui montre (porte de `delivery-workflow`).

## Structure
- Composants petits, à responsabilité unique ; présentation séparée de la logique (store / services).
- Design tokens centralisés (couleurs, espacements, typographie, rayons) en variables CSS ; aucune valeur en dur dispersée. `DESIGN.md` en est la référence.
- Toujours les 4 états : chargement, vide, erreur, succès.

## Qualité UI
- Mobile-first ; vérifier à 360px, 768px et 1280px.
- Hiérarchie visuelle claire ; taille de texte de base ≥ 16px ; contraste suffisant.
- Cibles tactiles ≥ 44px ; retour visuel sur chaque action (chargement, bouton désactivé contre le double clic).
- Réutiliser les composants existants (`shared/ui`) avant d'en créer.
- Actions utilitaires d'en-tête (thème, compte, notifications, aide) : bouton icône avec nom accessible et info-bulle, pas de libellé. Une action principale garde son libellé. Sur écran tactile une info-bulle n'existe pas : une action qui doit se comprendre sans survol garde un texte visible.
- Nombres et montants : format français (`1 159,92 €`), alignés à droite dans les tableaux, police à chiffres tabulaires.

## Accessibilité (obligatoire, WCAG AA)
- HTML sémantique (`button`, `nav`, `main`, `label`, `table`), jamais de `div` cliquable.
- Navigation clavier complète, focus visible, ordre logique.
- `aria-*` seulement quand le HTML natif ne suffit pas ; `role="status"` / `role="alert"` pour les messages dynamiques.
- Ne jamais transmettre une information par la seule couleur (graphiques compris).
- Formulaires : labels associés, erreurs explicites liées au champ (`aria-describedby`), focus sur la première erreur à la soumission.

## Ergonomie détaillée (liste de contrôle du designer et du relecteur)
Une règle par ligne, vérifiable sur l'écran rendu ou dans le fichier.

**Formulaires**
- Chaque champ a le bon `type`, `inputmode` et `autocomplete` (e-mail, téléphone, code postal, mot de passe) : le clavier du téléphone et le remplissage automatique en dépendent.
- Ne jamais bloquer le collage dans un champ. Ne pas effacer une saisie refusée : la garder et dire ce qui ne va pas.
- Le bouton d'envoi reste actif jusqu'à l'envoi, puis montre l'attente et refuse le double envoi ; « Entrée » envoie le formulaire.
- Erreur affichée près du champ, en mots (pas un code), avec le moyen de la corriger ; à l'envoi, focus sur la première erreur.
- Quitter une page avec une saisie non enregistrée : prévenir, ou conserver le brouillon.
- Action destructrice : confirmation qui nomme ce qui sera perdu, ou annulation possible. Jamais sur un simple clic.

**Navigation et état**
- L'adresse reflète l'état : filtres, onglet, page, élément ouvert. Un lien copié rouvre le même écran ; « Précédent » revient à l'état précédent.
- Un lien est un lien (`<a>`, ouvrable dans un nouvel onglet), une action est un bouton.
- Après un chargement de plus ou un changement de filtre, le focus et la position de lecture ne sont pas perdus.

**Contenu**
- Tout texte venu de l'utilisateur peut être long, vide ou sans espace : césure ou coupe prévue (`overflow-wrap`, coupe à n lignes avec le texte complet accessible), jamais de débordement.
- Les quatre états existent pour chaque liste ou bloc de données : chargement (squelette à la forme du contenu), vide (avec l'action suivante), erreur (avec « Réessayer »), nominal.
- Liste qui peut dépasser une cinquantaine d'éléments : pagination, chargement à la demande ou liste virtuelle.
- Dates, nombres et montants par les outils de la plateforme (`Intl`, pipes Angular) dans la langue de l'écran ; espace insécable avant l'unité et dans les grands nombres.

**Tactile et petits écrans**
- Aucune action accessible seulement au survol. Une info-bulle ne porte jamais une information indispensable.
- Zones sûres des téléphones respectées pour ce qui est collé à un bord (`env(safe-area-inset-*)`).
- Aucun défilement horizontal de la page à 360 px ; un tableau large défile dans son propre conteneur ou devient une liste de cartes.
- Le zoom du navigateur n'est jamais désactivé ; la mise en page tient à 200 %.

**Focus et mouvement**
- Focus toujours visible (`:focus-visible`), jamais `outline: none` sans remplacement. Une boîte de dialogue retient le focus et le rend à son déclencheur en se fermant.
- `prefers-reduced-motion` respecté : une animation non essentielle s'arrête ou se réduit à un fondu.
- Animer seulement `transform` et `opacity` ; une animation ne retarde jamais une action.

**Images et stabilité**
- Largeur et hauteur déclarées pour chaque image et chaque bloc chargé plus tard : la page ne saute pas.

Source d'inspiration de cette liste : les *Web Interface Guidelines* de Vercel, relues et adaptées (règles propres à React retirées).

## Contrôles automatiques
Ce qui peut se vérifier par une commande ne repose pas sur un regard :
- Les parcours de bout en bout se jouent aussi à 360 px pour les écrans du grand public, et vérifient l'absence de défilement horizontal (`document.documentElement.scrollWidth <= clientWidth`).
- Si le projet a un contrôle d'accessibilité automatique (axe dans Playwright ou dans Storybook), il fait partie du contrôle complet (`scripts/check.sh`). Il ne remplace pas la navigation au clavier.
- Couleurs et tailles en dur : test d'architecture du front, quand le projet en a un.

## Performance
- Code splitting par route, `@defer` pour les blocs lourds (graphiques), images optimisées (`NgOptimizedImage`).
- Mesurer avant d'optimiser ; surveiller LCP, CLS, INP.

## Sécurité
- Pas de `innerHTML` ni `bypassSecurityTrust*` sans assainissement justifié.
- Aucun secret côté client.
