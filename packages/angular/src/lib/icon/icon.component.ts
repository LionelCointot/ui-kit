import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, effect, inject, input, isDevMode } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LcSize } from '../core/types';
import { LC_ICONS, resolveIcon } from './icons';

/**
 * Icône SVG en ligne (`currentColor`). Décorative par défaut (`aria-hidden`), étiquetée si `label` est fourni.
 * Taille : `inherit` suit `--lc-icon-size` (posée par le bouton, par exemple) ou la taille du texte.
 */
@Component({
  selector: 'lc-icon',
  template: '',
  styleUrl: './icon.component.css',
  // Le SVG est inséré par innerHTML : les styles visent `lc-icon > svg`, sans encapsulation.
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-icon',
    '[class.lc-icon--small]': "size() === 'small'",
    '[class.lc-icon--medium]': "size() === 'medium'",
    '[class.lc-icon--large]': "size() === 'large'",
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
    '[innerHTML]': 'svg()',
  },
})
export class LcIconComponent {
  /** Nom de l'icône (jeu par défaut ou `provideLcIcons`). */
  readonly name = input.required<string>();
  readonly size = input<LcSize | 'inherit'>('inherit');
  /** Nom accessible ; sans libellé, l'icône est décorative. */
  readonly label = input<string>();

  private readonly sets = inject(LC_ICONS, { optional: true }) ?? [];
  private readonly sanitizer = inject(DomSanitizer);
  private readonly markup = computed(() => resolveIcon(this.name(), this.sets));

  // Contenu de confiance : SVG constants enregistrés par le code (ADR-0005), jamais une saisie utilisateur.
  protected readonly svg = computed<SafeHtml | null>(() => {
    const markup = this.markup();
    return markup ? this.sanitizer.bypassSecurityTrustHtml(markup) : null;
  });

  constructor() {
    if (isDevMode()) {
      effect(() => {
        if (!this.markup()) {
          console.warn(`[lc-icon] Icône inconnue : « ${this.name()} ». Enregistrez-la avec provideLcIcons().`);
        }
      });
    }
  }
}
