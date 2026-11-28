import { Directive, signal } from '@angular/core';

/**
 * Ancre qui rend toute la carte `lc-kpi-card` cliquable (avec `routerLink` ou `href`, le kit ne dépend pas du routeur).
 * Projetée dans la carte, qui lui pose son nom accessible ; la zone cliquable est un pseudo-élément (feuille globale `ui-angular.css`).
 */
@Directive({
  selector: 'a[lcKpiCardLink]',
  host: { class: 'lc-kpi-card-link', '[attr.aria-label]': 'name()' },
})
export class LcKpiCardLinkDirective {
  /** Nom accessible, écrit par `lc-kpi-card`. */
  readonly name = signal<string | null>(null);
}
