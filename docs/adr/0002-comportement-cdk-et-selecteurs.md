# ADR-0002 : Comportement délégué au CDK, sélecteurs d'attribut et contrôles de formulaire

- **Statut** : Acceptée
- **Date** : 2026-11-08

## Contexte

Le ui-kit vise une API unifiée à la Kendo (`themeColor`, `fillMode`, `size`, `rounded`) et un style entièrement piloté par tokens. Les parties les plus coûteuses et les plus risquées d'une bibliothèque de composants ne sont pas visuelles :
- la navigation au clavier, la gestion du focus et le positionnement des surcouches ;
- les rôles ARIA ;
- l'intégration aux formulaires.

Angular 22 fournit le **CDK** (stable) et **Angular Aria** (`@angular/aria`), des primitives sans style : tabs, listbox, combobox, menu, grid, tree, toolbar, accordion. Le statut de stabilité d'Angular Aria en version 22 est à vérifier ; il était en *developer preview* en version 21.

## Options considérées

1. **Envelopper une bibliothèque complète** (Angular Material, PrimeNG, Kendo) : comportement fourni, mais le style et l'API sont imposés. Habiller par-dessus demande de lutter contre leurs styles, et la licence de Kendo est commerciale.
2. **Tout écrire soi-même** : contrôle total, mais l'accessibilité et le clavier sont longs à fiabiliser. C'est la partie que Kendo a mis des années à construire.
3. **Posséder les tokens, l'API et le style ; déléguer le comportement** au CDK (`overlay`, `a11y`, `dialog`, `menu`, `listbox`, `table`), et à Angular Aria pour les composants qu'il couvre, une fois stable.

**Élément hôte ou attribut** pour les éléments natifs :
- `<lc-button>` comme élément hôte casse la sémantique native (`type="submit"`, participation au formulaire, `disabled`, focus, lecteurs d'écran) ;
- un sélecteur d'attribut (`<button lcButton>`) la conserve.

**Formulaires** :
- Signal Forms est le choix du projet à partir d'Angular 22 ;
- les formulaires réactifs restent présents dans l'écosystème.

## Décision

- **Option 3.** Le CDK par défaut. Angular Aria pour tabs, listbox, combobox et menu **si** son statut est stable dans la version utilisée (vérifié en T1), sinon le CDK. La bascule ultérieure de l'un à l'autre est interne et ne change pas l'API publique.
- **Sélecteurs d'attribut** pour tout ce qui a un équivalent natif : `button[lcButton]`, `a[lcButton]`, `input[lcInput]`, `textarea[lcInput]`, `select[lcSelect]`, `input[type=checkbox][lcCheckbox]`, `input[type=radio][lcRadio]`, `button[lcSwitch]`. Éléments hôtes (`lc-…`) pour les composants composites sans équivalent natif.
- **Contrôles de formulaire** composites (`lc-money-input`, `lc-dropdown-list`…) :
  - ils implémentent l'interface Signal Forms (`FormValueControl<T>`, valeur exposée par `model()`) ;
  - ils implémentent aussi `ControlValueAccessor`, pour les formulaires réactifs, si l'interopérabilité native de la version 22 ne le couvre pas (à vérifier en T1).
- **API commune** : `themeColor` (`primary`, `secondary`, `success`, `warning`, `error`, `neutral`), `fillMode` (`solid`, `outline`, `flat`), `size` (`small`, `medium`, `large`), `rounded` (`none`, `small`, `medium`, `large`, `full`), toutes en `input()` signal avec des valeurs par défaut globales configurables.

## Conséquences

- **Positives** : accessibilité et clavier fiables dès le départ ; sémantique native préservée ; API et style entièrement maîtrisés ; une seule dépendance comportementale officielle.
- **Négatives / dette** : deux contrats de formulaire à maintenir tant que l'interopérabilité n'est pas native ; suivre l'évolution d'Angular Aria.
- **À surveiller** : la stabilité d'Angular Aria à chaque version majeure d'Angular.
