import { InjectionToken, Signal } from '@angular/core';

/** Erreur de validation minimale (compatible avec `ValidationError` de Signal Forms). */
export interface LcValidationMessage {
  readonly message?: string;
}

/**
 * État de validation d'un champ, structurellement compatible avec le `FieldState` de Signal Forms
 * (`[state]="form.amount()"`).
 */
export interface LcFieldStateLike {
  errors(): readonly LcValidationMessage[];
  touched(): boolean;
  invalid(): boolean;
  required?(): boolean;
}

/**
 * Contrat d'un contrôle projeté dans `lc-form-field`. Chaque contrôle du ui-kit se fournit sous
 * `LC_FORM_FIELD_CONTROL` ; un contrôle personnalisé peut faire de même.
 */
export interface LcFormFieldControl {
  /** Identifiant de l'élément focusable (généré), cible du `<label for>`. */
  readonly controlId: Signal<string>;
  /** Élément focusable « étiquetable » (input, select, textarea, button) ; sinon le libellé est relié par aria-labelledby. */
  readonly labelable: boolean;
  /** État transmis par `[formField]` : sert de repli quand `lc-form-field` n'a pas d'entrée `state`. */
  readonly invalid?: Signal<boolean>;
  readonly touched?: Signal<boolean>;
  readonly errors?: Signal<readonly LcValidationMessage[]>;
  focus?(): void;
}

export const LC_FORM_FIELD_CONTROL = new InjectionToken<LcFormFieldControl>('LC_FORM_FIELD_CONTROL');

/** Ce que `lc-form-field` expose aux contrôles projetés (ARIA à porter par l'élément focusable). */
export interface LcFormFieldContext {
  /** Identifiant du libellé (pour aria-labelledby des contrôles non étiquetables). */
  readonly labelId: string;
  /** Identifiants de l'aide et des erreurs affichées (aria-describedby), null si aucun. */
  readonly describedBy: Signal<string | null>;
  /** Erreurs affichées (client touché et invalide, ou serveur) : aria-invalid. */
  readonly showInvalid: Signal<boolean>;
  /** Champ obligatoire : aria-required. */
  readonly isRequired: Signal<boolean>;
}

export const LC_FORM_FIELD = new InjectionToken<LcFormFieldContext>('LC_FORM_FIELD');
