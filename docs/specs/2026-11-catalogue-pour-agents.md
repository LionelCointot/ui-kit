# Spec : Catalogue des composants, généré pour les agents

- **Statut** : Implémentée le 2026-11-17 (validée par délégation de l'utilisateur du 2026-11-17 : « je te laisse mettre ça en place »)
- **Auteur** : session principale
- **Date** : 2026-11-17
- **ADR liés** : aucun

## 0. Fiche de cadrage
- **Demande, dans les mots de l'utilisateur** : « il y a des contrainte comme ui kit qui est le framework visuel qui faut preciser »
- **Besoin en trois phrases** : Les fronts qui consomment le ui-kit doivent se construire avec ses composants. Aujourd'hui un agent ne sait ce que le kit contient qu'en lisant ses sources. Il faut un document généré, livré avec le paquet, qui liste ce qui existe.
- **Décisions prises pendant le cadrage** : 2026-11-17, catalogue généré à partir de l'API publique et publié dans le paquet (proposition acceptée par l'utilisateur).
- **Taille** : Tâche
- **Angles ouverts** :
  - [ ] Architecture : fermé, un script de build sans effet sur l'API publique.
  - [ ] Écran : fermé, aucun écran.
  - [ ] Sécurité et données : fermé, aucune entrée utilisateur ni donnée.

## 1. Contexte et problème
Le paquet `@lionelcointot/ui-angular` livre un README et du code compilé. Le skill `ui-kit` des dépôts consommateurs demande de lire un catalogue qui n'existe pas encore.

## 2. Objectifs
- Un fichier `CATALOGUE.md` liste chaque composant, directive et pipe publics du kit, avec de quoi l'utiliser sans lire les sources.
- Il est généré : il ne peut pas diverger du code.
- Il est livré dans le paquet construit.

## 3. Hors périmètre (non-objectifs)
- Documentation rédigée (quand utiliser tel composant, exemples) : Storybook reste la référence.
- Catalogue des tokens : `ui-tokens` a déjà ses fichiers.
- Aucune dépendance ajoutée, aucun changement de l'API publique.

## 4. Utilisateurs et cas d'usage
**Utilisateur principal** : un agent (`ui-ux-designer`, `senior-developer`, `code-reviewer`) qui travaille dans un dépôt consommateur.

| Acteur | Cas d'usage | Résultat attendu |
|---|---|---|
| Designer | Savoir si un composant existe avant de le dessiner | `grep` dans le catalogue |
| Développeur | Connaître le sélecteur, l'import et les entrées | Une ligne du catalogue |

## 5. Solution proposée
### 5.1 Vue d'ensemble de l'architecture
Un script Node sans dépendance, `tools/generate-catalogue.mjs`, lit les `public-api.ts` des points d'entrée de `packages/angular/`, suit leurs exports jusqu'aux fichiers sources et en extrait les déclarations Angular. Il écrit `packages/angular/CATALOGUE.md` (versionné) ; le build le copie dans `dist/ui-angular/`.

### 5.2 Modèle de données
N/A : un fichier Markdown.

### 5.3 API / interfaces
- `npm run catalogue:build` : régénère `packages/angular/CATALOGUE.md`.
- `npm run catalogue:check` : échoue si le fichier versionné diffère de ce que le script produit.
- `npm run build` lance `catalogue:build` avant `build:lib`.
- Contenu, par point d'entrée (`@lionelcointot/ui-angular`, `…/forms`, `…/data`…) : un tableau trié par sélecteur avec la classe, le genre (composant, directive, pipe), le sélecteur, les entrées (`input()`, `model()`, avec leur alias s'il y en a un et la mention « requis »), les sorties (`output()`). En tête : la date n'est pas écrite (le fichier doit être reproductible), la version du paquet l'est.

### 5.4 Interface utilisateur
Pas d'impact UI : aucun écran.

## 6. Cas limites et gestion des erreurs
- Export nommé (`export { X } from`) et export étoile : tous deux suivis.
- Classe sans sélecteur (classe de base, service, type) : absente du catalogue, mais ses entrées et sorties sont reportées sur les classes qui en héritent (`extends`), même quand la classe de base n'est pas exportée.
- Sélecteur d'attribut (`button[lcButton]`) et sélecteurs multiples : écrits tels quels.
- Fichier exporté introuvable : le script échoue avec le chemin.

## 7. Sécurité, performance, observabilité
- Sécurité et données : N/A (lecture de sources du dépôt, aucune entrée extérieure).
- Performance : quelques centaines de fichiers, moins d'une seconde.
- Logs : une ligne par point d'entrée avec le nombre d'éléments.

## 8. Alternatives envisagées
| Option | Avantages | Inconvénients | Retenue ? |
|---|---|---|---|
| Script maison par expressions régulières sur les sources | Aucune dépendance, rapide | Dépend des conventions du kit (`input()`, `output()`, `model()`, sélecteur en chaîne littérale) | Oui : ces conventions sont imposées par `CLAUDE.md` |
| Compodoc ou API du compilateur TypeScript | Exact dans tous les cas | Dépendance ou code plus lourd | Non |
| Catalogue écrit à la main | Peut expliquer l'usage | Dérive garantie | Non |

## 9. Plan de test
- Unitaires (écrits par `senior-developer`) : extraction sur des sources d'exemple (composant à sélecteur d'élément, directive à sélecteur d'attribut, pipe, entrée requise, alias, classe sans sélecteur, export nommé).
- Acceptation (écrits par `qa-engineer`) : CA-1 à CA-5 sur le dépôt réel.

## 10. Critères d'acceptation
- [x] CA-1 : `npm run catalogue:build` écrit `packages/angular/CATALOGUE.md` ; deux lancements de suite produisent un fichier identique.
- [x] CA-2 : chaque classe exportée par un `public-api.ts` et décorée `@Component`, `@Directive` ou `@Pipe` figure au catalogue, sous son point d'entrée, avec son sélecteur exact ; aucune classe non exportée n'y figure.
- [x] CA-3 : pour `lc-data-table` et `button[lcButton]`, les entrées et sorties listées sont celles de la source.
- [x] CA-4 : `npm run catalogue:check` réussit sur le dépôt à jour et échoue après la modification d'un sélecteur sans régénération.
- [x] CA-5 : après `npm run build`, `dist/ui-angular/CATALOGUE.md` existe et est identique au fichier versionné.
- [x] CA-6 : pour un composant qui hérite d'une classe de base du kit, les entrées et les sorties héritées figurent au catalogue comme celles qu'il déclare lui-même, sur toute la chaîne d'héritage. Vérifié sur `lc-money-input` (`value`, `disabled`, `min`, `max` venus de `LcNumericInputBase`), `lc-region-select` (au moins `selectionChange` en sortie) et `lc-line-chart`.
- [x] CA-7 : pour chaque classe du catalogue, le nombre d'entrées et de sorties listées est égal au nombre de `input(`, `input.required(`, `model(`, `model.required(` et `output(` déclarés dans sa source et dans celles de ses classes de base (contrôle d'exhaustivité : un membre que le script ne sait pas lire fait échouer le test au lieu de disparaître en silence).

## 11. Découpage en tâches
- [x] T1 : script, commandes npm, copie dans le paquet, tests unitaires du script, fichier généré versionné, ligne dans `CLAUDE.md` (M, couvre CA-1 à CA-5)

## 12. Risques et questions ouvertes
- **Dettes** : les entrées exposées par `hostDirectives` ne sont pas listées (un cas : `a[lcNavItem]`) ; pas de description d'usage par composant ; un composant qui s'écarterait des conventions (sélecteur calculé, `@Input()` décoré) serait mal décrit, les tests de CA-2 le détecteraient pour le sélecteur.
- **Questions ouvertes** : aucune.

## 13. Relectures et écarts
| Date | Relecteur | Phase | Statut | Retenu / écarté |
|---|---|---|---|---|
| 2026-11-17 | aucun | conception | non relue | Tâche d'outillage, angles fermés |
| 2026-11-17 | `qa-engineer` | vérification | GO sur CA-1 à CA-5 | 5 tests d'acceptation écrits |
| 2026-11-17 | `code-reviewer` | vérification | CHANGEMENTS REQUIS | Bloquant retenu : entrées et sorties héritées absentes pour 13 composants. La spec ne le prévoyait pas : CA-6 et CA-7 ajoutés. Recommandé retenu : contrôle d'exhaustivité (CA-7). |
| 2026-11-17 | `qa-engineer` | vérification, second passage | NO-GO | Tests CA-6 et CA-7 écrits ; CA-7 rouge : membres déclarés avec `override` ignorés (`value` des quatre champs `geo`) |
| 2026-11-17 | `code-reviewer` | vérification, second passage | CHANGEMENTS REQUIS | Héritage confirmé sur sept composants ; même défaut `override` trouvé indépendamment |
| 2026-11-17 | session principale | vérification finale | 14 tests verts, dont CA-1 à CA-7 ; build ; catalogue du paquet identique | Preuves : `npm run catalogue:test`, `catalogue:check`, `npm run build`, `cmp` ; CA-5 vérifié par commande, pas par un test |

**Écarts constatés à l'implémentation** : la première livraison ne lisait que le corps de la classe décorée ; la spec ne disait rien de l'héritage et CA-3 ne portait que sur deux composants sans classe de base. Corrigé par CA-6 et CA-7. Le premier correctif ignorait encore les membres déclarés avec `override` : trouvé par le test d'exhaustivité CA-7 et par la seconde relecture, corrigé au second aller-retour.
