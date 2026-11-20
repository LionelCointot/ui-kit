# Écrire une story de la vitrine

Règles appliquées à chaque fichier `*.stories.ts` publié sur la vitrine (spec `docs/specs/2026-11-vitrine-storybook.md`).
Modèle de référence : `packages/angular/src/lib/button/button.stories.ts`.

## Langue
- Navigation, noms de stories et descriptions (JSDoc) : **anglais**.
- Contenu des démos (libellés affichés, données d'exemple) : **français**, la langue par défaut de `LC_LABELS`.
- Aucun vocabulaire métier (prêt, crédit, capital, intérêts, échéance, loyer…) : données neutres (projets, tâches, villes, fichiers, équipes, commandes génériques).

## Rangement
- `title` : `<Famille>/<Composant>` avec les familles `Buttons`, `Forms`, `Data`, `Charts`, `Feedback`, `Navigation`, `Overlays`, `Layout`, `Geography`, `Tools`, `Foundations`.
- Stories de QA (acceptation, captures, réglages fins) : fichier `*.qa.stories.ts`, titre `QA/…`, `tags: ['!autodocs']`. Elles ne sont pas publiées.

## Page d'un composant
1. **JSDoc sur `meta`** (anglais) : à quoi sert le composant en une ou deux phrases, puis la ligne
   ``Import: `import { LcXxxComponent } from '@lionelcointot/ui-angular/<point d'entrée>';` ``.
   Elle devient l'en-tête de la page *Overview*.
2. `component` renseigné : la table d'API (entrées, sorties) est extraite automatiquement.
3. `args` : une valeur de départ pour **chaque entrée simple** (texte, booléen, nombre, union de chaînes).
   `argTypes` : options des unions (`...commonArgTypes` de `@lc/storybook` pour `themeColor`, `fillMode`, `size`, `rounded`, en ne gardant que celles qu'expose le composant ; `{ control: 'select', options: [...] }` pour les autres).
   Les entrées complexes (tableaux, fonctions, gabarits) restent dans `props`, avec `control: false` si elles apparaissent.
4. **Première story : `Playground`**, `render: (args) => ({ props: { ...args, ...donnéesFixes }, template })`.
   Le gabarit lie **toutes** les entrées déclarées dans `args` : chaque contrôle doit changer le rendu.
   Les sorties sont branchées sur des actions (`argTypes: { valueChange: { action: 'valueChange' } }`) quand c'est utile.
5. **Autres stories : exemples figés**, nommés en anglais (`Variants`, `Sizes`, `States`, `WithIcon`, `Empty`, `Loading`, `Error`, `InAForm`…),
   avec `parameters: fixedExample` (masque le panneau Controls, car le gabarit ignore `args`)
   et une phrase JSDoc qui dit ce que montre l'exemple.
6. Pas de story en double avec `Playground` (supprimer un ancien `Default` identique).
7. Styles de mise en page des démos (`display:flex; gap`) : autorisés dans le gabarit, en `var(--lc-sys-space-*)` plutôt qu'en pixels.

## Code affiché (onglet Code, « Show code »)
Le code est généré pour chaque story : un composant Angular complet (`import`, `@Component`, classe) à coller dans une application.
Générateur : `.storybook/code-snippet.ts` (fonctions pures), adaptation Storybook : `.storybook/code-snippet-docs.ts`, données (sélecteurs du kit, imports et démos locales des fichiers de story) : `.storybook/snippet-data.mjs`.
- Les champs de la classe viennent des valeurs liées par le gabarit : valeurs des contrôles pour les `args` (le code suit le panneau Controls), source écrit dans le `render` pour le reste (une valeur de `props` qui est une fonction, une constante locale…). Tout nom que le gabarit lit doit donc exister dans `props` ou dans `args`.
- Les composants de démonstration définis dans le fichier de story (`@Component` local), leurs interfaces et constantes sont recopiés tels quels dans l'extrait.
- Le gabarit doit compiler en mode strict : pas de chaîne là où l'entrée attend une union (`[headingLevel]="3"` et non `headingLevel="3"` pour un nombre), pas de tableau littéral dans `@for (… of ['a', 'b'])` hors `as const` (le générateur le remonte en champ).
- Cas que le générateur ne sait pas recopier (valeur calculée dans le corps du `render`, thème de départ lu dans la barre d'outils…) : écrire l'extrait à la main avec `parameters.docs.source.code` (chaîne, sans `${}`).
- Contrôle : `npm run build-storybook:public && npm run snippets:check` compile chaque extrait avec `ngc` (CA-12 et CA-13) ; tests du générateur : `npm run snippets:test`.

## Vérifier
- `STORYBOOK_PUBLIC=1 npm run build-storybook` réussit.
- `npx vitest run --project storybook <fichiers>` passe (les stories sont aussi des tests de rendu).
- Dans la vitrine : la page *Overview* a son en-tête, la table d'API et un `Playground` dont chaque contrôle agit.
