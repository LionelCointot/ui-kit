# Essai 3 — transitions entre pages sans View Transitions

Branche `spike/motion-pages`, commit `d7ca5c7` (non fusionnée). Harnais : petite application Angular 22 dans `tools/spike-motion-pages/` (`src/transitions.ts`, `run.mjs`), routeur à 3 niveaux (`requests` → `requests/:id` → `history`) + rubrique `notifications`, cas pièges `redirectTo`, garde qui redirige, `replaceUrl`. 95 vérifications OK sous Chrome.

| Question | Réponse | Technique et preuve |
|---|---|---|
| Garder l'ancienne page pendant sa sortie | **OUI** | **Copie figée** : `cloneNode(true)` prise au `ResolveEnd`, insérée au `NavigationEnd` en `position: fixed` à son rectangle d'avant, `inert`, `aria-hidden`, sans `id`, retirée à la fin de son animation. Une seule page interactive, un seul `h1` accessible, pas de saut de défilement (page défilée de 400 px conservée), focus sur le `h1` de la nouvelle page, rien ne reste après 4 navigations en rafale. `animate.leave` sur la page écarté : rien ne se passe quand la même route est réutilisée (`/requests/42` → `/43`, page vide 190 ms), `id` en double, réglages manuels |
| Déduire le sens | **OUI** | Lien direct : pas d'animation. Retour/avance navigateur : position dans une copie de la pile d'historique (les `navigationId` du routeur ne sont pas fiables après un popstate : faux « reculer » trouvé). Navigation dans l'app : profondeur (plus profond = avancer). Même profondeur : ordre des rubriques du menu. Redirections : sens calculé sur l'URL finale |
| Libellé du bouton retour | **OUI** | Lu dans les `title` des routes au `ResolveEnd`, y compris titres dynamiques (« Demande n° 42 ») et lien direct profond. Condition : routes imbriquées, parents qui portent le `title` |
| Retour au doigt façon iOS | **OUI** | La copie de la page quittée en avançant est gardée ; pendant le geste, URL inchangée, page courante qui suit le doigt, copie dessous avec parallaxe et voile. Engagé (35 % ou geste rapide) : fin d'animation puis navigation sans rejouer la transition. Annulé : retour en place. Lien direct sans copie : fond neutre avec le titre du parent (dégradation acceptable). Limite : la copie est un instantané |
| Mouvement réduit | **OUI** | 30 ms après : 1 page, 0 animation, 0 copie, focus sur le `h1` |

## API recommandée pour la spec

- Directive `lcPageTransitions` sur le conteneur du `<router-outlet>`, avec l'ordre des rubriques en entrée.
- `lc-app-shell` la pose autour de son `<router-outlet>` et lui passe sa liste de navigation : l'application n'a rien d'autre à faire.
- Service `LcPageNav` : signaux `dir`, `levels`, `parent`, `title`. L'en-tête mobile affiche « < titre du parent » à partir du niveau 2, sur écran étroit.
- Geste : bande de 20 px au bord gauche, `touch-action: none`, active sous 760 px seulement.

## Pièges

- La copie ne reproduit pas l'état des champs de formulaire, des `canvas` ni des vidéos ; retirer les `id` ; coût d'un `cloneNode` sur les très grandes pages.
- **Safari iOS** : le geste de retour natif du navigateur déclenche un popstate ; la directive risque de jouer une seconde animation par-dessus. À vérifier sur un vrai iPhone.
- L'application doit activer `scrollPositionRestoration: 'enabled'` ; le défilement est celui du document (vrai aujourd'hui dans `lc-app-shell`).
- Spike jetable : désabonnements, tokens, tests unitaires et animation de l'en-tête mobile à faire pour de vrai.
