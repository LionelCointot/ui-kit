import { Directive } from '@angular/core';

/** Contenu affiché avant le contrôle dans `lc-form-field` (ex. une icône). */
@Directive({ selector: '[lcPrefix]', host: { class: 'lc-form-field-prefix' } })
export class LcPrefixDirective {}

/** Contenu affiché après le contrôle dans `lc-form-field` (ex. « € », « mois »). */
@Directive({ selector: '[lcSuffix]', host: { class: 'lc-form-field-suffix' } })
export class LcSuffixDirective {}
