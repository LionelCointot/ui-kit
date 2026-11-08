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
| `…/forms` | `lc-form-field`, `input[lcInput]`, `textarea[lcInput]`, `select[lcSelect]`, `input[type=checkbox][lcCheckbox]`, `lc-radio-group` + `input[type=radio][lcRadio]`, `button[lcSwitch]`, `lc-money-input`, `lc-percent-input`, `lc-number-input`, `lc-date-input`, `lc-segmented-control` |
| `…/feedback` | `lc-alert`, `LcToastService` + `lc-toast-outlet`, `lc-badge`, `lc-progress-bar`, `lc-empty-state`, `lc-error-state` |
| `…/overlay` | `LcDialogService`, `lc-dialog`, `LC_DIALOG_DATA`, `LcDialogRef`, `[lcTooltip]` |
| `…/layout` | `lc-app-shell`, `lc-page`, `lc-stack`, `lc-grid` + `lc-grid-item`, `lc-card` + `lc-card-header`, `lc-divider` |
| `…/navigation` | `lc-tabs` + `lc-tab` (`lcTabContent`), `lc-nav-list`, `a[lcNavItem]`, `lc-menu`, `[lcMenuTriggerFor]`, `button[lcMenuItem]` |
| `…/data` | `lc-table` (+ `lcCell`), `lc-description-list`, `lc-kpi-card` |
| `…/charts` | `lc-line-chart`, `lc-area-chart`, `lc-bar-chart`, `lc-segmented-bar`, `lc-sparkline`, `lc-chart`, `provideLcCharts`, `LcChartThemeService` (ECharts 6, dépendance pair optionnelle `echarts`) |

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

## Menu, tableau, graphiques : usage

```html
<button lcButton [lcMenuTriggerFor]="actions">Actions</button>
<lc-menu #actions ariaLabel="Actions du scénario">
  <button lcMenuItem icon="pencil" (click)="rename()">Renommer</button>
  <lc-divider />
  <button lcMenuItem destructive (click)="remove()">Supprimer</button>
</lc-menu>

<lc-table caption="Échéancier" [data]="rows" [columns]="columns" [trackBy]="byId" [groupBy]="byYear" [footer]="totals" [(sort)]="sort">
  <ng-template lcCell="status" let-row>…</ng-template>
</lc-table>

<lc-area-chart title="Capital restant dû" [data]="series" [yAxis]="{ format: 'money' }" [stale]="recomputing()" />
```

Les graphiques chargent ECharts (~563 Kio minifiés) : à placer dans un `@defer (on viewport)`.

## Développement

```bash
npm run build                                   # tokens puis bibliothèque (dist/ui-angular)
npx ng test ui-angular --watch=false            # tests Vitest
npm run storybook                               # Storybook sur http://localhost:6006
```
