# @lionelcointot/ui-angular

Composants Angular 22 du ui-kit (préfixe `lc`), pilotés par les design tokens de `@lionelcointot/ui-tokens`.
Standalone, `OnPush`, zoneless, signaux. Aucune logique ni vocabulaire métier.

## Installation

```bash
npm i @lionelcointot/ui-tokens @lionelcointot/ui-angular @angular/cdk
npm i echarts   # seulement si vous importez @lionelcointot/ui-angular/charts
```

Node.js ≥ 24.15 est requis par Angular CLI 22.

### Styles (ordre d'import)

Dans `angular.json` (`styles`) ou dans la feuille globale de l'application :

```css
@import '@lionelcointot/ui-tokens/css/lc-tokens.css';     /* référence + tokens de composant */
@import '@lionelcointot/ui-tokens/css/theme-default.css'; /* thème clair (:root, [data-theme="default"]) */
@import '@lionelcointot/ui-tokens/css/theme-dark.css';    /* thème sombre ([data-theme="dark"]) */
@import '@lionelcointot/ui-tokens/css/base.css';          /* base : box-sizing, corps, focus, .lc-visually-hidden */
@import '@lionelcointot/ui-angular/styles/ui-angular.css'; /* directives sur éléments natifs (lcInput, lcSelect, lcCheckbox, lcRadio) */
```

Les composants à gabarit portent leurs styles encapsulés ; la feuille `ui-angular.css` ne stylise que les
directives posées sur des éléments natifs sans gabarit (`input[lcInput]`, `textarea[lcInput]`, `select[lcSelect]`,
`input[type=checkbox][lcCheckbox]`, `input[type=radio][lcRadio]`). Tous les styles n'utilisent que des variables CSS
(`--lc-<composant>-*` avec repli sur `--lc-sys-*`).

### Configuration

```ts
bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideLcUiKit({ locale: 'fr-FR', currency: 'EUR' }), // facultatif : valeurs par défaut
    provideLcIcons({ 'mon-icone': '<svg …>…</svg>' }),     // facultatif : icônes supplémentaires
  ],
});
```

## Points d'entrée

| Point d'entrée | Contenu |
|---|---|
| `@lionelcointot/ui-angular` | types communs, `provideLcUiKit`, `LC_LABELS`, `LcFormatService`, pipes, `LcThemeService`, `button[lcButton]`, `a[lcButton]`, `lc-button-group`, `lc-icon`, `provideLcIcons`, `lc-spinner`, `lc-skeleton` |
| `…/forms` | `lc-form-field`, `input[lcInput]`, `textarea[lcInput]`, `select[lcSelect]`, `input[type=checkbox][lcCheckbox]`, `button[lcSwitch]`, `lc-money-input`, `lc-percent-input`, `lc-number-input`, `lc-date-input`, `lc-segmented-control` |
| `…/feedback` | `lc-alert`, `LcToastService` + `lc-toast-outlet`, `lc-badge`, `lc-empty-state`, `lc-error-state` |
| `…/overlay` | `LcDialogService`, `lc-dialog`, `LC_DIALOG_DATA`, `LcDialogRef` |
| `…/layout` | `lc-app-shell`, `lc-page`, `lc-stack`, `lc-grid`, `lc-card`, `lc-divider` |
| `…/navigation` | `lc-tabs`, `lc-nav-list`, `a[lcNavItem]`, `lc-menu`, `[lcMenuTriggerFor]`, `button[lcMenuItem]` |
| `…/data` | `lc-table`, `lc-description-list`, `lc-kpi-card` |
| `…/charts` | graphiques ECharts 6 (dépendance pair optionnelle `echarts`) |

L'API détaillée est dans `docs/specs/2026-11-catalogue-composants.md` et `docs/specs/2026-11-graphiques.md`.

## Formulaires (Signal Forms)

Les contrôles composites implémentent `FormValueControl<T>` (ou `FormCheckboxControl` pour `button[lcSwitch]`) de
`@angular/forms/signals` : ils fonctionnent avec `[formField]` et avec `[(value)]`. `ControlValueAccessor` n'est pas
fourni pour l'instant (formulaires réactifs non pris en charge par les contrôles composites).

```html
<lc-form-field label="Montant" hint="Hors frais" [state]="form.amount()" [errors]="serverErrors.amount">
  <lc-money-input [formField]="form.amount" />
</lc-form-field>
```

## Développement

```bash
npm run build                                   # tokens puis bibliothèque (dist/ui-angular)
npx ng test ui-angular --watch=false            # tests Vitest
npm run storybook                               # Storybook sur http://localhost:6006
```
