# Spec : Vitrine Storybook publiée sur GitHub Pages

- **Statut** : Implémentée (en vérification)
- **Auteur** : session principale
- **Date** : 2026-11-20
- **ADR liés** : à créer si la décision « Compodoc » ou « page d'accueil séparée » est retenue (§ 12)

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** : « J'aimerai rendre ce repo plus professionnel : Tout d'abord le storybook fait un peu fouilli et certains composant ne réagissent pas quand ont les modifies ses parametre depuis sotrybook. Ainsi j'aimerai que tu fasse un beau plan professionnel pour montrer les possibilite, comme fait kendo ui afin d'utiliser la page statique ee storybook oour le mettre sur la oage guthub du projet »
- **Besoin en trois phrases** : Le Storybook doit devenir une vitrine lisible du kit, organisée comme une documentation de bibliothèque commerciale (Kendo UI) : accueil, fondations, puis une page par composant avec démo réglable, exemples et API. Chaque démo « Aire de jeu » doit réagir à ses contrôles. Le Storybook statique est publié automatiquement sur GitHub Pages.
- **Décisions prises pendant le cadrage** (2026-11-20, l'utilisateur a validé le plan par « Vasy », les recommandations du § 12 sont donc retenues) :
  1. Langue : navigation, pages de documentation et descriptions en anglais ; contenu des démos en français (langue par défaut de `LC_LABELS`).
  2. Storybook seul, accueil en MDX (pas de site séparé).
  3. Compodoc : inutile. `@storybook/angular-vite` 10.6 extrait lui-même les métadonnées Angular (T0 tranché sans dépendance).
  4. Dépôt privé : le workflow GitHub Pages est livré ; l'activation (Settings → Pages → GitHub Actions, avec GitHub Pro ou un dépôt public) reste à faire par l'utilisateur.
- **Taille** : Fonctionnalité (plusieurs tâches, aucune modification du code des composants publiés hors correctifs révélés).
- **Angles ouverts** :
  - [x] Architecture : séparation stories publiques / stories de QA, pipeline CI de publication, éventuelle dépendance Compodoc.
  - [x] Écran : refonte de l'expérience de la documentation (accueil, navigation, gabarit de page).
  - [ ] Sécurité et données : fermé, site statique sans donnée ni secret ; seul point : les stories `geo` appellent les API publiques de l'État depuis le navigateur du visiteur (déjà documenté dans `geo/README.md`), à rappeler sur leur page.

## 1. Contexte et problème
Constat mesuré sur la branche le 2026-11-20 :

| Problème | Mesure | Cause |
|---|---|---|
| Barre latérale « fouillis » | 365 stories dont **102 stories de QA** (acceptation, captures, second passage, ajustement) mêlées aux démos ; 11 entrées « Acceptation… » sous *Formulaires/Champ de date* et *Superpositions* | Les stories de test sont dans le même glob que les démos ; seul `!autodocs` les distingue |
| Pas de point d'entrée | Aucune page MDX ; on arrive directement sur un composant | Pas d'introduction, ni de guide d'installation, ni de page de tokens |
| Rangement incohérent | `Avatar` sous *Données* alors qu'il est dans le point d'entrée principal ; `Panneau de calendrier (interne)` visible ; catégories non ordonnées | Titres libres, pas de `storySort` |
| Contrôles sans effet | Sur ~250 stories publiques, la majorité utilise `render: () => ({ template })` : le gabarit est en dur et ignore `args`, mais le panneau *Controls* affiche quand même les arguments hérités de `meta` (ex. *Actions/Bouton › Variantes*, *Tailles*, *Enfoncé*). Beaucoup de `meta` n'ont **ni `args` ni `argTypes`** (Tableau, Tableau filtrable, Tableau hiérarchique, Champ de date, Champ de période, Graphiques…) : rien à régler | Pas de convention « une story réglable par composant » ; pas d'inférence des entrées (pas de Compodoc) |
| Composants absents | **17 composants publics sans aucune démo** : `lc-alert`, `lc-toast`, `lc-progress-bar`, `lc-empty-state`, `lc-error-state`, `lc-spinner`, `lc-skeleton`, `lc-button-group`, `lc-menu` / `lcMenuTrigger`, `lc-card`, `lc-page`, `lc-stack`, `lc-grid`, `lc-divider`, `input[lcCheckbox]`, `lc-confirm-dialog` | Démos jamais écrites |
| Pas de publication | Aucun workflow CI (`.github/` ne contient que le modèle de PR) | Cible notée dans `CLAUDE.md`, pas réalisée |

## 2. Objectifs
- Une vitrine qu'un développeur découvrant le kit parcourt sans aide : accueil → installation → fondations → composants.
- **Chaque composant public** a une page de documentation au même gabarit (§ 5.4), avec une story *Aire de jeu* dont **tous** les contrôles affichés ont un effet visible.
- Aucune story de QA dans le Storybook publié ; elles restent exécutées par `@storybook/addon-vitest` en local et en CI.
- Publication automatique sur GitHub Pages à chaque fusion sur `main`.

## 3. Hors périmètre
- Modifier l'API publique d'un composant (un défaut révélé par une démo devient un correctif séparé).
- Site marketing distinct, domaine personnalisé, traduction complète en deux langues (voir § 12, question 1).
- Tests visuels Playwright (prévus ailleurs dans `CLAUDE.md`).
- Publication des paquets npm (release-please).

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : développeur Angular d'un projet consommateur (ou recruteur / pair qui évalue le kit) ; connaît Angular, ne connaît pas le kit. *À confirmer par l'utilisateur.*

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Développeur | Choisir un composant pour un besoin | Trouve la catégorie en un clic, voit la démo, copie l'extrait de code |
| Développeur | Régler un composant | Change `themeColor`, `size`, `fillMode`… dans *Controls*, le rendu change immédiatement |
| Développeur | Intégrer le kit | Page *Démarrer* : installation (GitHub Packages, `.npmrc`), feuille globale, `provideLc…`, thème |
| Designer | Vérifier les fondations | Pages couleurs, typographie, espacements, rayons, ombres, thèmes clair / sombre, générées depuis les tokens |
| Mainteneur | Lancer la QA | Les stories de QA restent visibles en local (`npm run storybook`) et testées en CI |

## 5. Solution proposée

### 5.1 Architecture

```
.storybook/
  main.ts            stories = docs MDX + *.stories.ts, sauf *.qa.stories.ts si STORYBOOK_PUBLIC=1
  preview.ts         storySort, thème Storybook, décorateur de thème, docs.toc
  manager.ts         (nouveau) marque du kit : logo, nom, couleurs du manager
  theme.ts           (nouveau) thème Storybook construit sur les tokens --lc-sys-*
docs/storybook/      (nouveau) pages MDX : Accueil, Démarrer, Fondations/*, Guides/*
.github/workflows/
  storybook-pages.yml (nouveau) build + tests + déploiement Pages
```

- **Séparer QA et vitrine** : renommer les 11 fichiers `*.acceptance|captures|second-pass|panel-fit.stories.ts` en `*.qa.stories.ts` (script relu, `git mv`), titre préfixé `QA/…`. `main.ts` exclut ce motif quand `STORYBOOK_PUBLIC=1`. En local, ils apparaissent tout en bas sous *QA*. Les tests Vitest les gardent (la config `addon-vitest` ne lit pas la variable).
- **Ordre et rangement** : `parameters.options.storySort` fige l'ordre : *Accueil, Démarrer, Fondations, Actions, Formulaires, Données, Graphiques, Retours d'information, Navigation, Superpositions, Mise en page, Géographie, Outils, QA*. Le rangement suit l'usage, pas le point d'entrée (`Avatar` reste sous *Données*, mais sa page indique son point d'entrée) ; `Panneau de calendrier (interne)` passe sous *QA*.
- **Convention des stories** (écrite dans `docs/storybook/CONTRIBUER.md` et appliquée à tous les fichiers) :
  1. `meta` déclare `args` **et** `argTypes` pour chaque entrée publique (catégorie *Apparence*, *État*, *Contenu*, *Comportement* via `table.category`), sorties en `action`.
  2. Première story `AireDeJeu` : `render: (args) => ({ props: args, template })` qui lie **toutes** les entrées déclarées.
  3. Les autres stories (exemples figés, galeries) posent `parameters: { controls: { disable: true } }` : plus de panneau trompeur.
  4. Chaque story a une phrase de description (JSDoc), affichée dans la page *Docs*.
  5. Extrait de code : `parameters.docs.source` montre le gabarit Angular, sans les `style=` de mise en page de la démo.
- **Inférence des entrées** : option A (recommandée après preuve) : Compodoc génère `documentation.json`, Storybook en tire les `argTypes` et la table d'API ; option B : `argTypes` écrits à la main, vérifiés par un test qui compare aux `input()` du composant. Un *spike* de 1 h tranche (compatibilité Compodoc avec `@storybook/angular-vite` et les entrées par signaux).
- **Publication** : workflow GitHub Actions `storybook-pages.yml` sur `push` vers `main` : `npm ci` → `npm run tokens:build` → `STORYBOOK_PUBLIC=1 npm run build-storybook` → `actions/upload-pages-artifact` → `actions/deploy-pages`. Sur les PR : build seul (sans déploiement) pour détecter une casse.

### 5.2 Modèle de données
Aucun.

### 5.3 Interfaces
- Nouveaux scripts : `storybook:public` (aperçu local de la version publiée), `build-storybook:public`.
- Aucune entrée, sortie ni sélecteur de composant modifié.

### 5.4 Interface (gabarit inspiré de Kendo UI)
Organisation de Kendo reprise : *Get Started* → catégories → par composant *Overview* (démo riche), exemples par thème (apparence, états, données, accessibilité), *API*. Transposé dans Storybook :

**Accueil** (MDX) : titre et promesse en une phrase, trois chiffres (composants, points d'entrée, thèmes), grille de cartes par catégorie avec vignette et lien, bloc « Installer en 3 étapes », liens GitHub / npm / changelog.

**Démarrer** : installation (registre GitHub Packages), import de `styles/ui-angular.css`, configuration zoneless, `LC_LABELS`, changement de thème, points d'entrée secondaires et dépendances optionnelles (ECharts, API géo).

**Fondations** (générées depuis `packages/tokens`, jamais recopiées) : Couleurs (rôles `sys` avec contraste), Typographie, Espacements, Rayons, Ombres, Mouvement, Thèmes (clair / sombre / constructeur de thème), Icônes (galerie cherchable).

**Page d'un composant** (gabarit unique, page *Docs* automatique + bloc MDX d'en-tête) :
1. Titre, phrase « à quoi ça sert », point d'entrée (`@lionelcointot/ui-angular/forms`) et sélecteur.
2. *Aire de jeu* réglable avec son code.
3. Exemples : Apparence (couleurs × remplissages), Tailles, États (désactivé, chargement, erreur), Cas d'usage réels, Avec d'autres composants.
4. Accessibilité : clavier, ARIA, résultat de l'addon a11y.
5. Personnalisation : variables `--lc-<composant>-*` exposées.
6. API : entrées, sorties, `model()`, types.

**Habillage** : thème Storybook (manager et docs) aux couleurs et à la typographie du kit, logo, bascule clair / sombre synchronisée entre manager et aperçu. Direction visuelle : 2 ou 3 maquettes de l'accueil par `ui-ux-designer` (`/impeccable shape`), **choix de l'utilisateur**, puis test `novice-user` sur l'accueil et une page composant.

## 6. Cas limites
- Stories `geo` : appellent les API publiques au chargement de la page publiée ; garder `tags: ['!test']` et un bandeau « données réelles, requêtes vers api.gouv.fr ».
- Base d'URL GitHub Pages (`/<dépôt>/`) : Storybook statique utilise des chemins relatifs ; à vérifier sur le déploiement réel (CA-7).
- Dépôt privé : GitHub Pages sur dépôt privé exige un plan payant ; sinon publier depuis un dépôt public ou rendre le dépôt public (§ 12).
- Taille du build : `charts` (~563 Kio) chargé seulement sur ses pages (découpage Vite par story).

## 7. Sécurité, performance, observabilité
- Aucune donnée personnelle ni secret ; le workflow n'utilise que `GITHUB_TOKEN` avec `pages: write`, `id-token: write`.
- Performance : accueil interactif en moins de 3 s sur une connexion 4G simulée (mesure Lighthouse dans la CI, non bloquante au début).

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Storybook seul, accueil en MDX | Un seul outil, déjà en place | Moins libre qu'un site sur mesure | **Oui (recommandé)** |
| Site vitrine sur mesure (Angular) + Storybook en sous-dossier | Comme Kendo (site + démos) ; vitrine qui utilise le kit lui-même | Deuxième application à maintenir | Plus tard, si besoin |
| Exclure la QA par tag (`tags: ['qa']` + filtre du manager) | Pas de renommage | Les stories restent dans le build publié (poids, liens directs) | Non |
| Supprimer les stories de QA | Plus simple | Perte des preuves d'acceptation des specs date | Non |

## 9. Plan de test
- Unitaires : test Node qui charge chaque `meta` et vérifie la convention (story `AireDeJeu` présente, `argTypes` ⊇ entrées publiques si option B, `controls.disable` sur les autres stories).
- Acceptation (`qa-engineer`) : Playwright sur le build public : pour chaque *Aire de jeu*, modifier chaque contrôle et vérifier que le DOM de l'aperçu change.
- Bout en bout : parcours « accueil → catégorie → composant → copier le code ».
- Architecture : `build-storybook:public` ne contient aucun titre `QA/`.

## 10. Critères d'acceptation
- [ ] CA-1 : Le build public ne contient aucune story de QA ; `npm run storybook` en local les montre sous *QA*, en dernier.
- [ ] CA-2 : La barre latérale suit l'ordre fixé au § 5.1 ; l'arrivée sur le site ouvre la page *Accueil*.
- [ ] CA-3 : Chaque composant public (liste issue de `CATALOGUE.md`) a une page de documentation ; les 17 composants sans démo en ont une.
- [ ] CA-4 : Chaque page composant a une story *Aire de jeu* ; chaque contrôle qu'elle affiche modifie le rendu (test Playwright).
- [ ] CA-5 : Aucune autre story n'affiche de contrôle sans effet (`controls.disable` ou contrôles liés).
- [ ] CA-6 : Pages *Démarrer* et *Fondations* présentes ; les valeurs de tokens sont lues depuis `packages/tokens`, pas recopiées.
- [ ] CA-7 : Une fusion sur `main` publie le site sur GitHub Pages ; l'URL est dans le `README.md` (badge) ; une PR lance le build sans déployer.
- [ ] CA-8 : Thème Storybook aux couleurs du kit, bascule clair / sombre appliquée au manager et à l'aperçu.
- [ ] CA-9 : Addon a11y : aucune violation sérieuse ou critique sur les stories publiques (`a11y.test: 'error'` pour le build public).
- [ ] CA-10 : `npx ng test ui-angular --watch=false` et les tests de stories passent, stories de QA comprises.

## 11. Découpage en tâches
Ordre pensé pour livrer de la valeur visible tôt ; une branche par tâche.

| # | Tâche | Taille | Couvre |
|---|---|---|---|
| T0 | Spike Compodoc avec `angular-vite` et `input()` signaux → décision A/B (ADR si A) | S | — |
| T1 | `chore/storybook-qa-split` : renommage `*.qa.stories.ts`, titres `QA/…`, `STORYBOOK_PUBLIC`, `storySort` | S | CA-1, CA-2 |
| T2 | `chore/storybook-pages` : workflow CI build + déploiement, badge README | S | CA-7 |
| T3 | Maquettes de l'accueil (2–3 directions), choix utilisateur, thème Storybook + `manager.ts` | M | CA-8 |
| T4 | Pages MDX *Accueil*, *Démarrer*, *Fondations* (blocs générés depuis les tokens) | M | CA-2, CA-6 |
| T5 | Convention des stories + test de convention ; appliquée à *Actions* et *Formulaires* | M | CA-4, CA-5 |
| T6 | Convention appliquée à *Données*, *Graphiques* | M | CA-4, CA-5 |
| T7 | Convention appliquée à *Retours*, *Navigation*, *Superpositions*, *Mise en page*, *Géographie*, *Outils* | M | CA-4, CA-5 |
| T8 | Démos des 17 composants manquants | L | CA-3 |
| T9 | Test Playwright des contrôles + a11y en mode erreur sur le build public | M | CA-4, CA-9 |
| T10 | Vérification finale (`qa-engineer`, `code-reviewer`, `novice-user`), écarts notés ici | S | tous |

Jalon 1 (T1–T2) : site en ligne, propre, sans QA — quelques heures. Jalon 2 (T3–T5) : la vitrine a sa tête. Jalon 3 (T6–T10) : complète.

## 12. Risques et questions ouvertes
- **Questions à trancher par l'utilisateur** :
  1. Langue de la vitrine : français (cohérent avec le kit, libellés par défaut) ou anglais (audience GitHub plus large) ? *Recommandation : anglais pour les pages Accueil / Démarrer / Fondations et les titres de navigation, démos avec libellés français (montre `LC_LABELS`).* À trancher : ce choix change tous les titres.
  2. Visibilité du dépôt : `LionelCointot/ui-kit` est **privé** (constaté le 2026-11-20). GitHub Pages sur un dépôt privé exige GitHub Pro (le site publié reste alors public). Options : passer à Pro, rendre le dépôt public, ou pousser le build vers un dépôt public dédié (ex. `ui-kit-docs`).
  3. Storybook seul (recommandé) ou site vitrine sur mesure devant le Storybook ?
  4. Compodoc acceptable comme dépendance de dev (après T0) ?
- **Dettes** : les données d'exemple de certaines stories utilisent un vocabulaire de prêt (« Échéancier », « Capital restant dû ») contraire à la règle « aucun vocabulaire métier » : à neutraliser pendant T5–T7.
- **Risque** : 250 stories à reprendre ; mitigé par le test de convention (T5) qui liste les écarts restants.
