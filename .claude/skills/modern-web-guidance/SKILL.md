---
name: modern-web-guidance
description: Fiches de bonnes pratiques du web moderne (Google Chrome, Microsoft Edge, Mozilla Firefox, MDN), recopiées en local. À consulter avant d'écrire ou de relire du HTML, du CSS ou du JavaScript côté navigateur (composant, formulaire, dialogue, popover, info-bulle, tableau, défilement, animation, thème sombre, accessibilité, performance, sécurité côté client, application installable, notifications), pour employer ce que le navigateur sait faire nativement plutôt qu'une façon ancienne. Ne pas l'utiliser pour le serveur, la base de données, l'outillage ou les tests.
---

# Modern Web Guidance (copie locale)

Fiches de [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance) (Apache-2.0), recopiées dans `guides/` à une version figée (voir `VERSION`). Aucune commande n'est lancée : on lit des fichiers. Le `SKILL.md` d'origine, qui passe par `npx`, est gardé pour mémoire dans `UPSTREAM-SKILL.md` et ne s'applique pas ici.

## Quand la consulter
Avant d'implémenter, de modifier ou de relire une fonctionnalité qui touche le navigateur : composant d'interface, formulaire et validation, dialogue, popover, info-bulle, menu, tableau, texte tronqué, défilement, animation et transition, thème et couleurs, accessibilité, performance (LCP, INP, CLS), sécurité côté client, application installable. Pas pour le serveur, la base, l'outillage ni les tests.

## Comment
1. Chercher dans `INDEX.md` (une ligne par fiche : chemin, titre, première phrase), par exemple avec Grep sur 2 à 5 mots anglais décrivant la capacité (« dialog », « tooltip », « truncate text », « install web app »).
2. Lire en entier la ou les fiches retenues, plus la fiche de la discipline si elle s'applique (`guides/html/html.md`, `guides/css/css.md`, `guides/forms/forms.md`, `guides/accessibility/accessibility.md`, `guides/performance/performance.md`, `guides/security/security.md`).
3. Traduire, ne pas recopier : les fiches sont en HTML, CSS et JavaScript bruts ; le projet passe par Angular, les composants `lc-` du ui-kit et ses tokens.
4. Avant de conclure, vérifier le code contre la fiche ; dans le rapport de la tâche, une puce par fiche qui a servi : son chemin, le choix qu'elle a dicté et la courte phrase de la fiche qui le justifie. Aucune fiche citée de mémoire.

## Ce qui prime
- `CLAUDE.md` du dépôt, ses ADR, le skill `ui-kit` et la spec de la tâche priment sur les fiches. Un composant du ui-kit passe avant un élément natif écrit à la main dans un projet consommateur ; un manque se signale au ui-kit.
- Navigateurs visés : la cible écrite dans `CLAUDE.md` du dépôt ; à défaut, celle du ui-kit (Baseline 2024). Les fiches indiquent pour chaque fonctionnalité son statut Baseline : une fonctionnalité postérieure à la cible n'est employée qu'avec le repli que la fiche décrit, ou pas du tout si une règle du dépôt l'interdit (par exemple l'ancrage CSS dans le ui-kit). Le défaut des fiches (« Baseline Widely available ») ne remplace pas la cible du dépôt.
- Ne jamais lancer `npx modern-web-guidance` ni aucun programme téléchargé : la mise à jour passe par `scripts/update-tools.sh`, avec relecture du diff.
