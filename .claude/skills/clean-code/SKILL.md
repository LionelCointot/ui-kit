---
name: clean-code
description: Règles de lisibilité et de maintenabilité du code, tous langages (TypeScript, C#...). À utiliser dès qu'on écrit, modifie, refactore ou relit du code (fonction, classe, composant, service, endpoint), quand l'utilisateur parle de code propre, lisible, maintenable, refactoring, dette technique, code smell, nommage, duplication, ou quand une fonction ou un fichier devient trop long. Complète les skills de stack (angular-best-practices, dotnet-best-practices).
---

# Clean Code

Ordre des priorités : **correct > lisible > simple > performant**. On optimise après mesure, jamais avant.
Exemples avant/après (TypeScript et C#) : [examples.md](examples.md).

## Nommage
- Le nom dit l'intention et le domaine : `remainingBalance`, pas `rb`, `data`, `tmp`, `obj`, `info`, `manager`.
- Vocabulaire métier unique : un concept = un mot dans tout le code (pas `customer` ici et `client` là pour la même chose). Code et identifiants en anglais, libellés affichés en français.
- Booléens en question : `isValid`, `hasDiscount`, `canSubmit`. Pas de négation dans le nom (`isNotEmpty`).
- Fonctions = verbe + complément : `buildInvoice()`, `computeShippingCost()`. Une fonction qui renvoie un booléen se lit comme une question : `isEligible()`.
- Unités dans le nom quand le type ne les porte pas : `durationMonths`, `ratePercent`, `timeoutMs`.
- Pas de nombres ni de chaînes magiques : constantes nommées (`MAX_ITEMS_PER_ORDER = 10`) ou configuration.

## Fonctions
- Une fonction fait une chose, à un seul niveau d'abstraction. Repère : ~20-30 lignes ; au-delà, extraire.
- **Garde en tête** (early return) plutôt que des `if` imbriqués : profondeur d'indentation ≤ 3.
- ≤ 3 paramètres ; au-delà, un objet/record nommé. Pas de paramètre booléen qui change le comportement (`save(true)`) : deux fonctions ou un enum.
- Séparation commande / requête : une fonction qui renvoie une valeur ne modifie pas d'état caché.
- Fonctions pures par défaut pour la logique métier (mêmes entrées → même sortie, pas d'I/O, pas d'horloge implicite) : faciles à tester.
- Le temps, l'aléatoire et l'I/O sont injectés (`TimeProvider`, `Clock`, repository), jamais appelés en dur au milieu du métier.

## Classes, modules, fichiers
- Responsabilité unique : une classe a une seule raison de changer. Un nom en `Manager`, `Helper`, `Utils` signale souvent un fourre-tout.
- Organisation **par feature** (tout ce qui concerne `orders` ensemble), pas par type technique global.
- Dépendances à sens unique : le métier ne dépend ni de l'UI, ni du framework web, ni de la base. Les détails (HTTP, stockage) dépendent du métier, pas l'inverse.
- Composition plutôt qu'héritage. Interfaces aux frontières (stockage, services externes), pas pour chaque classe.
- Un type public par fichier. Repère : un fichier > 300 lignes mérite d'être découpé.
- Visibilité minimale : `private`/`internal`/non exporté par défaut ; on n'expose que le contrat.

## Données et état
- Immutabilité par défaut : `readonly`, `const`, `record`, `ReadonlyArray`, copies plutôt que mutations.
- Types précis plutôt que primitives ambiguës : `DateOnly` plutôt que `string`, `decimal` pour l'argent (jamais `double`/`float`), unions/enums plutôt que chaînes libres.
- Rendre les états impossibles irreprésentables : pas de couple `isLoading` + `error` + `data` incohérent ; un statut unique ou une union discriminée.
- `null` explicite et rare : types nullables déclarés (`string?`, `T | undefined`), jamais de `!` pour faire taire le compilateur sans raison.
- TypeScript : `strict` activé, pas de `any` (utiliser `unknown` puis affiner). C# : `<Nullable>enable</Nullable>`, avertissements traités en erreurs.

## Erreurs
- Échouer tôt et clairement : valider aux frontières (entrée d'API, formulaire), puis faire confiance aux données à l'intérieur.
- Ne jamais avaler une erreur (`catch {}` vide, `catch` qui log et continue comme si de rien n'était).
- Erreurs attendues (validation, règle métier) ≠ erreurs inattendues (bug, panne) : les premières ont un type/code et un message utilisateur, les secondes remontent à un gestionnaire central.
- Messages d'erreur actionnables : ce qui ne va pas + quoi faire.

## Commentaires et documentation
- Le code dit **quoi** ; le commentaire dit **pourquoi** (règle métier, contrainte, source : « arrondi par ligne, exigence de la facturation »).
- Pas de code commenté : git s'en souvient. Pas de commentaire qui paraphrase le code.
- Documenter les API publiques (contrats, unités, cas d'erreur) et les formules métier avec leur source.
- `TODO` uniquement avec un contexte (`TODO(#42): ...`), jamais en vrac.

## Duplication et abstraction
- DRY sur la **connaissance** (une règle métier écrite une seule fois), pas sur la ressemblance textuelle.
- Règle de trois : on factorise à la troisième occurrence, quand la bonne abstraction est visible. Une mauvaise abstraction coûte plus cher qu'une duplication.
- YAGNI : pas de paramètre, d'option ou de couche « pour plus tard ». KISS : la solution la plus simple qui passe les tests.

## Refactoring (procédure)
1. Les tests passent avant de commencer ; sinon, écrire d'abord des tests de caractérisation.
2. Petits pas, un seul type de changement à la fois (renommer, extraire, déplacer), tests entre chaque pas.
3. Refactoring et changement de comportement dans des commits séparés (`refactor:` vs `feat:`/`fix:`).
4. Améliorer le code **touché par la tâche** ; pour le reste, proposer un ticket plutôt que d'élargir le périmètre.

## Checklist avant de rendre du code
- [ ] Les noms se comprennent sans lire l'implémentation.
- [ ] Aucune fonction ne fait plus d'une chose ; pas d'imbrication > 3 niveaux.
- [ ] Pas de valeur magique, de code mort, de code commenté, de `any`/`!` injustifié.
- [ ] Erreurs gérées explicitement, aucune avalée.
- [ ] La logique métier est isolée, pure et testée.
- [ ] Le diff ne contient que ce que la tâche demande.
- [ ] Lint, format et tests passent (commandes dans `CLAUDE.md`).
