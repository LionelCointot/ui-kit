# Spec : Theme builder (thèmes à l'exécution, éditeur et prévisualisation en direct)

- **Statut** : Implémentée (TB1 à TB4)
- **Date** : 2026-11-09
- **ADR liés** : [0001 Tokens](../adr/0001-design-tokens.md) · [0006 Thèmes à l'exécution](../adr/0006-themes-a-l-execution.md)

## 1. Contexte et problème

Aujourd'hui, un thème produit est un fichier DTCG de surcharges (`*.tokens.json`) compilé **au build** par `lc-tokens build`, avec un contrôle de contraste. Pour créer un style, il faut éditer du JSON à la main, recompiler, puis recharger. Il manque deux choses :
- un **éditeur visuel** avec un rendu en direct, dans l'esprit de Storybook, qui exporte le thème une fois qu'il convient ;
- une **API d'exécution** pour appliquer, prévisualiser et enregistrer des thèmes sans recompilation. Elle sert aux applications consommatrices, par exemple pour proposer des thèmes personnels dans leurs réglages.

Le ui-kit reste **générique** : il ne connaît ni profils, ni stockage serveur, ni domaine métier.

## 2. Objectifs

1. **Cœur de thème indépendant du framework** (`@lionelcointot/ui-tokens/theme`).
   - En TypeScript pur, utilisable dans le navigateur comme sous Node.
   - Il valide, résout, rend le CSS et vérifie le contraste.
   - Il importe et exporte au format DTCG actuel, si bien qu'un thème exporté se compile tel quel avec `lc-tokens build`.
2. **Thèmes à l'exécution dans `LcThemeService`** (API additive) : enregistrer des thèmes personnalisés, en activer un, et prévisualiser des surcharges en direct sur tout le document.
3. **Point d'entrée `@lionelcointot/ui-angular/theme-builder`** :
   - `lc-theme-editor` : paramètres groupés, en mode simple ou avancé ;
   - `lc-theme-contrast-report` ;
   - `lc-theme-preview` : galerie de composants ;
   - `lc-theme-builder` : l'ensemble, plus l'export.
4. **Page Storybook « Outils / Theme builder »** : régler les paramètres, voir tous les composants changer en direct, puis exporter en `.tokens.json` et en `.css`.

## 3. Hors périmètre

- Le stockage des thèmes, leur partage et leur nommage côté utilisateur : c'est le rôle des applications consommatrices.
- La modification des tokens `ref` et des tokens de composants. On ne modifie que les tokens `sys`, comme les thèmes produit actuels.
- La génération automatique d'une palette complète à partir d'une seule couleur, au-delà des dérivations simples du §5.3.
- Les polices web téléchargées. Seules des piles de polices système et la liste fournie sont proposées.

## 4. Utilisateurs et cas d'usage

| Qui | Cas |
|---|---|
| Designer ou développeur du ui-kit | Ouvrir Storybook, régler couleurs, arrondis et police, voir les composants en direct, exporter `mon-theme.tokens.json`, puis le committer comme thème produit |
| Application consommatrice | Enregistrer au démarrage les thèmes de l'utilisateur (`registerThemes`), activer l'un d'eux, ou intégrer `lc-theme-editor` dans ses réglages avec une prévisualisation sur toute l'application (`preview`) |

## 5. Solution proposée

### 5.1 Architecture (dépendances à sens unique)

```
ui-tokens (sans Angular)                  ui-angular                                  consommateur (ex. finance)
─────────────────────────                 ──────────                                  ──────────────────────────
theme/  schema.json (généré au build)     core/LcThemeService (+ API d'exécution) ──► stocke ses thèmes (où il veut)
        validate · resolve · renderCss ─► theme-builder/ editor · report · preview    intègre lc-theme-editor
        contrast · dtcg (import/export)                  builder (+ export)           appelle registerThemes/preview
bin/lc-tokens  ──► réutilise theme/ pour la validation et le contraste
```

### 5.2 Modèle de données

```ts
/** Thème personnalisé : sérialisable en JSON, stockable tel quel par un consommateur. */
export interface LcThemeDefinition {
  readonly name: string;                    // ^[a-z][a-z0-9-]{0,47}$ : valeur de data-theme
  readonly label?: string;                  // libellé affiché (libre, 1 à 60 caractères)
  readonly extends: 'default' | 'dark';     // thème de base, qui fixe aussi color-scheme
  readonly overrides: Readonly<Record<string, string>>; // chemin sys → valeur, ex. { "color.primary": "#0b5f5a" }
}
```

- **Schéma** (`theme/schema.json`, généré au build à partir de `src/sys/default.tokens.json`) : `{ path, cssVar, type: 'color'|'dimension'|'fontFamily'|'number'|'duration'|'shadow', group, label, simple?: boolean }`.
- **Groupes** : Couleurs de marque, États, Surfaces et texte, Graphiques, Typographie, Formes (arrondis), Espacements, Ombres.
- **Mode simple** : `primary`, `secondary`, `neutral`, `surface`, `background`, `radius.md`, `font.family.base`, l'échelle d'espacement (densité). Les dérivations du §5.3 en découlent.
- **Mode avancé** : tous les tokens `sys` éditables. Les tokens `z`, `duration` et `easing` en sont exclus.
- **Correspondance DTCG** : `"color.primary"` ⇄ `{ "sys": { "color": { "primary": { "$value": "#0b5f5a", "$type": "color" } } } }`.

### 5.3 API

**`@lionelcointot/ui-tokens/theme`** (nouvel export `./theme` du `package.json`, ESM, avec ses types) :

| Fonction | Rôle |
|---|---|
| `themeSchema` | Liste typée des tokens éditables (5.2) |
| `baseValues(extends)` | Valeurs résolues du thème de base, issues du build : chemin → valeur concrète |
| `validateTheme(def)` | `{ valid, errors: [{ path, message }] }`. Chemins inconnus avec suggestion « vouliez-vous dire » ; **valeur stricte selon le type**, voir §7 ; `name` et `label` |
| `resolveTheme(def)` | Base + surcharges : `Record<cssVar, value>` |
| `renderThemeCss(def)` | `[data-theme="<name>"] { --lc-sys-…: …; }`. Refuse un thème invalide (lève une exception) |
| `checkContrast(resolved)` | 24 paires de `src/checks/contrast-pairs.json` : `[{ fg, bg, ratio, required, pass }]`. Algorithme de `lib/contrast.mjs`, déplacé ici |
| `toDtcg(def)` · `fromDtcg(json, { name, extends })` | Export et import au format des thèmes produit |
| `deriveOnColor(bg)` | Couleur de texte, noire ou blanche selon la teinte, qui donne le meilleur contraste |
| `deriveContainer(color, scheme)` | Variante « container » éclaircie ou assombrie, avec son « on-container » |

`lc-tokens check|build` réutilise `validateTheme` et `checkContrast` : une seule implémentation pour le CLI et le navigateur.

**`LcThemeService`** (ajouts compatibles ; `choice`, `setChoice` et `localStorage` sont inchangés) :

| Membre | Rôle |
|---|---|
| `registerThemes(defs)` | Remplace l'ensemble des thèmes personnalisés : un seul `<style id="lc-runtime-themes">` généré avec `renderThemeCss`. Les thèmes invalides sont ignorés et signalés en console en mode développement |
| `customTheme: Signal<string \| null>` · `setCustomTheme(name \| null)` | Active un thème enregistré. Il prend le pas sur `choice` pour `data-theme`, et son `extends` fixe `resolvedScheme`. Rien n'est persisté : c'est au consommateur de le faire |
| `preview(def \| null)` | Prévisualisation en direct sur tout le document : `data-theme` = base, surcharges en variables inline sur `<html>` (`style.setProperty`, regroupées par `requestAnimationFrame`). `null` restaure l'état précédent |
| `revision: Signal<number>` | Incrémenté à chaque changement de thème : `LcChartThemeService` le suit (en plus du MutationObserver) |

**Composants `theme-builder`** (standalone, OnPush, signaux, libellés `LC_LABELS`, composants ui-kit seulement) :

| Composant | Entrées / sorties |
|---|---|
| `lc-theme-editor` | `[(theme)]: LcThemeDefinition`, `mode: 'simple' \| 'advanced'`. Groupes en `lc-tabs` ; couleur = `input type=color` + champ hexadécimal ; dimensions = `lc-number-input` en px ou rem ; police = `select[lcSelect]`. Le mode simple applique les dérivations, que l'on peut désactiver token par token (« lier / délier ») |
| `lc-theme-contrast-report` | `resolved` : tableau des paires avec ratio, seuil et badge réussi ou échoué. Annoncé par `role="status"` |
| `lc-theme-preview` | Galerie représentative : boutons (tous les `themeColor`), champs, alertes, badges, cartes, tableau, onglets, graphique. Elle s'affiche sous le thème courant du document |
| `lc-theme-builder` | Éditeur, rapport et aperçu côte à côte (empilés en dessous de 1024 px). Actions « Exporter .tokens.json », « Exporter .css », « Copier » et « Importer » (fichier DTCG). La prévisualisation passe par `LcThemeService.preview` tant que le composant est affiché, et elle est annulée à sa destruction |

**Storybook** :
- story `Outils/Theme builder` en plein écran, qui rend `lc-theme-builder` ;
- la barre d'outils `theme` reste disponible ;
- une story par composant du point d'entrée.

### 5.4 Interface utilisateur

- Deux colonnes : paramètres à gauche (`lc-tabs` par groupe, bascule simple/avancé en `lc-segmented-control`), aperçu à droite.
- Le rapport de contraste figure sous les paramètres.
- Barre d'actions en haut : nom, base (Clair ou Sombre), Exporter, Importer, Réinitialiser.
- États :
  - thème invalide : erreurs par champ dans `lc-form-field` ;
  - contraste insuffisant : avertissement non bloquant ;
  - export impossible si le thème est invalide.
- Accessibilité :
  - chaque contrôle a un libellé ;
  - le champ hexadécimal double le sélecteur de couleur, qui n'est pas accessible partout ;
  - focus visible et navigation au clavier complète.

## 6. Cas limites et erreurs

- **Valeur hexadécimale invalide en cours de saisie** : l'aperçu garde la dernière valeur valide et le champ affiche l'erreur.
- **Import d'un DTCG avec chemins inconnus** : refusé avec la liste des chemins, et les suggestions.
- **Import d'un thème qui ne surcharge rien** : accepté, il est identique à la base.
- **Thème enregistré dont le nom vaut `default` ou `dark`, ou un nom réservé par le consommateur** : `validateTheme` refuse `default` et `dark`.
- **`preview` appelé alors qu'un thème personnalisé est actif** : la prévisualisation l'emporte ; `preview(null)` restaure le thème personnalisé.
- **Graphiques** : rafraîchis par `revision`. Les variables inline sur `<html>` déclenchent aussi le MutationObserver existant.

## 7. Sécurité, performance, observabilité

- **Injection CSS** : les valeurs sont réinjectées dans une feuille de style, donc on ne fait **aucune concaténation de texte libre**. Chaque type a sa liste blanche stricte :
  - couleur : `#rgb|#rrggbb|#rrggbbaa` ou `rgb()/rgba()` numériques ;
  - dimension : `^\d+(\.\d+)?(px|rem|em)$` ;
  - police : liste fournie, ou noms `[A-Za-z0-9 \-]` séparés par des virgules ;
  - ombre : grammaire limitée (nombres, px, couleur) ;
  - `name` : `^[a-z][a-z0-9-]{0,47}$`.
  - Les valeurs `url(`, `;`, `{`, `}`, `<` et `\` sont refusées.
- **Performance** : la prévisualisation passe par des variables inline groupées par frame. Pas de recompilation, et le `<style>` n'est régénéré que dans `registerThemes`.
- **Aucune dépendance ajoutée** : on réutilise le CDK et les composants existants.

## 8. Alternatives

| Option | Raison du rejet |
|---|---|
| Builder en application séparée | Double l'outillage. Storybook héberge déjà la galerie et le rendu des composants |
| Addon Storybook dédié (panneau) | API d'addon plus lourde et propre à Storybook. Le composant Angular est réutilisable par les applications |
| Compiler côté serveur avec Style Dictionary | Impossible dans le navigateur, et la chaîne Node ne sert pas à l'exécution |
| Thème en variables inline seulement, sans `<style>` | Impossible de basculer entre plusieurs thèmes enregistrés sans tout réécrire, et pas de sélecteur `data-theme` cohérent avec le build |

## 9. Plan de test

- **ui-tokens** (tests Node ou Vitest) :
  - validation par type, y compris les tentatives d'injection ;
  - résolution, rendu CSS, contraste (ratios connus) ;
  - aller-retour DTCG ;
  - parité entre le CLI et le module (un même thème donne les mêmes erreurs).
- **ui-angular** (Vitest) :
  - `LcThemeService` : register, setCustomTheme, preview puis restauration, revision ;
  - les composants : édition, rapport, export (contenu du fichier), import invalide.
- **Storybook** : la page se construit (`build-storybook`), avec le contrôle a11y de l'addon.

## 10. Critères d'acceptation

1. Dans Storybook, modifier `primary` change en moins de 100 ms la couleur des boutons, alertes et graphiques de l'aperçu.
2. Le `.tokens.json` exporté se compile sans erreur avec `lc-tokens build --theme`, et le CSS produit est identique à `renderThemeCss` (même ensemble de variables et de valeurs).
3. Une valeur `red;}body{display:none` est refusée par `validateTheme` et n'atteint jamais le DOM.
4. `registerThemes([t])` puis `setCustomTheme(t.name)` donnent `<html data-theme="t.name">` avec le `color-scheme` de sa base. `setCustomTheme(null)` revient à `choice`.
5. `preview(def)` puis `preview(null)` laissent `<html>` sans variable inline.
6. Les APIs existantes ne changent pas : les tests actuels passent sans modification.

## 11. Découpage en tâches

- [x] TB1 ui-tokens : `theme/` (schéma généré, validate, resolve, renderCss, contrast déplacé, dtcg, dérivations), export `./theme`, réutilisation par le CLI, tests
- [x] TB2 ui-angular : API d'exécution de `LcThemeService`, suivi de `revision` par `LcChartThemeService`, tests
- [x] TB3 ui-angular : point d'entrée `theme-builder` (editor, contrast-report, preview, builder avec import et export), tests, stories
- [x] TB4 Storybook : page `Outils/Theme builder`, documentation du catalogue (la publication d'une version mineure reste à faire : release-please, après commit)

## 12. Risques et questions ouvertes

- Les dérivations automatiques peuvent donner des contrastes limites : le rapport les signale, mais rien ne les corrige.
- Le sélecteur `input type=color` ne gère pas l'alpha : il est doublé par le champ texte.
- Un thème personnel très contrasté peut casser des composants tiers, comme les cellules AG Grid de la phase 5. C'est hors périmètre.

## 13. Écarts à l'implémentation

| Sujet | Spec | Réalisé | Raison |
|---|---|---|---|
| Format du module `theme` | TypeScript pur, `theme/schema.json` généré | JavaScript ESM typé par `theme/index.d.ts`, dans `packages/tokens/theme/` (exporté `./theme`) ; données générées dans `theme/data.generated.js` (JS, pas JSON) | le paquet est en `.mjs` sans chaîne TypeScript ; un module JS importable par le CLI sans étape de compilation, et sans attribut d'import JSON |
| Fichier généré | généré au build | **versionné** et régénéré par `npm run build` (`lib/generate-theme-data.mjs`) ; un test vérifie qu'il est à jour | le CLI et les tests importent le module sans build préalable (`dist/` n'est pas versionné) |
| Chemins du schéma | `color.primary` | idem (sans `sys.`) ; ne couvre pas `z`, `duration`, `easing`, `font.weight`, `font.numeric-tabular` | spec § 5.2 ; `font.weight` (`fontWeight`) et `numeric-tabular` n'entrent dans aucun des six types |
| `validateTheme` | `{ valid, errors: [{ path, message }] }` | erreurs `{ path, code, message, suggestion? }`, option `{ identity: false }` | l'interface traduit par `code` (LC_LABELS) ; la prévisualisation ignore le nom |
| Valeurs acceptées | listes blanches § 7 | idem, plus : dimension `0`, couleur `#rrggbbaa`, ombre `none`, noms de police débutant par une lettre, mots-clés CSS globaux refusés | `0` et `none` existent dans les bases |
| `resolveTheme` / `overrideVars` | `resolveTheme` | lèvent une exception si la base ou une surcharge est invalide ; `overrideVars` (surcharges seules) ajoutée | utilisée par `preview` ; une valeur refusée n'atteint jamais le DOM |
| CSS exporté vs CLI | « identique » | même ensemble de variables et mêmes valeurs une fois les `var(--lc-ref-…)` du CLI résolues (test de parité) ; `renderThemeCss` écrit des valeurs concrètes | `renderThemeCss` est autonome (pas de feuille `ref` requise) |
| CLI | réutilise `validateTheme` | `check` et `build` refusent désormais les références DTCG (`{ref…}`) et les jetons hors `sys` ; nom de thème : mêmes règles que le module | cohérence avec la validation stricte ; les thèmes produit existants (valeurs littérales `sys`) passent |
| Contraste | `lib/contrast.mjs` déplacé | `theme/contrast.js` ; `parseColor` accepte `#rrggbbaa` opaque et refuse `rgb()` > 255 | ajouté pour la validation |
| `LcThemeService` | — | `LcThemeDefinition` ré-exporté par le principal ; `@lionelcointot/ui-tokens` devient dépendance pair de `ui-angular` ; `revision` est aussi incrémentée à l'application des variables inline | le service importe `validateTheme`/`renderThemeCss` |
| `registerThemes` | thèmes invalides ignorés | ignore aussi les doublons ; un thème actif retiré de la liste est désactivé ; `setCustomTheme` d'un nom inconnu est ignoré (avertissement en développement) | cas limites |
| `lc-theme-contrast-report` | `resolved` : « tableau des paires » | `resolved` = valeurs résolues (`resolveTheme`), le composant calcule et affiche le tableau des paires | l'entrée reste simple et sans état |
| Dépendances entre points d'entrée | non précisé | `theme-builder` importe `forms`, `navigation`, `feedback`, `data`, `layout`, `charts` (`echarts` requis pour qui l'importe) | exception documentée dans `CLAUDE.md` |
| Composant interne | 4 composants | `lc-theme-token-field` (champ par token), non exporté | factoriser les contrôles par type |
| Mode simple | dérivations | dérivations par `deriveOnColor` / `deriveContainer` pour primary, secondary, neutral (+ `focus-ring`), icône cadenas (`lock` / `lock-open`) pour lier / délier ; densité à trois paliers (0,75 ; 1 ; 1,25) sur l'échelle d'espacement | pas d'icône « link » dans le jeu par défaut |
| Libellés des jetons | LC_LABELS | jetons du mode simple et dérivés traduits ; les autres affichent le libellé technique du schéma | éviter ~100 libellés par langue |
| Copier | non précisé | copie le DTCG (`.tokens.json`) | format relu par « Importer » |
| Storybook | une story par composant | `Outils/Theme builder` (plein écran, base suivant la barre d'outils au chargement) et `Outils/Composants du theme builder` (4 stories) ; alias Vite explicite pour `@lionelcointot/ui-tokens/theme` | — |
| Critère 1 (100 ms) | mesure | vérifié manuellement (Playwright sur le Storybook construit) : couleur des boutons mise à jour à l'image suivante ; pas de mesure automatisée | — |
| Version mineure | publication | non faite (release-please après commit) | hors périmètre de cette tâche |
