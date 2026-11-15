import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  booleanAttribute,
  computed,
  effect,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import { LC_DEFAULTS } from '../core/options';
import { LcFillMode, LcRounded, LcSize, LcThemeColor } from '../core/types';

/**
 * Bouton du ui-kit, posé sur un `<button>` ou un `<a>` natif (sémantique, formulaire et focus conservés).
 * Composant à sélecteur d'attribut : il porte ses styles encapsulés (chargement en CSS, `aria-busy`).
 *
 * @example <button lcButton themeColor="primary" (click)="save()"><lc-icon name="save" /> Enregistrer</button>
 */
@Component({
  selector: 'button[lcButton], a[lcButton]',
  template: '<ng-content />',
  styleUrl: './button.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-button',
    '[class]': 'variantClasses()',
    '[class.lc-button--loading]': 'loading()',
    '[class.lc-button--icon-only]': 'iconOnly()',
    '[class.lc-button--full-width]': 'fullWidth()',
    '[class.lc-button--pressed]': 'pressed() === true',
    '[attr.aria-busy]': "loading() ? 'true' : null",
  },
})
export class LcButtonComponent {
  private readonly defaults = inject(LC_DEFAULTS);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly themeColor = input<LcThemeColor | undefined>(undefined);
  readonly fillMode = input<LcFillMode | undefined>(undefined);
  readonly size = input<LcSize | undefined>(undefined);
  readonly rounded = input<LcRounded | undefined>(undefined);
  /** Indicateur de chargement : clics ignorés, `aria-busy="true"`, largeur conservée. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Bouton carré sans texte : `aria-label` obligatoire. */
  readonly iconOnly = input(false, { transform: booleanAttribute });
  readonly fullWidth = input(false, { transform: booleanAttribute });
  /**
   * Bouton à bascule : `true` ou `false` pose `aria-pressed` et, si `true`, un style enfoncé (anneau et fond teinté) ;
   * non fourni, aucun `aria-pressed` n'est posé. Le consommateur inverse la valeur au clic.
   */
  readonly pressed = input<boolean | undefined>(undefined);

  private ownsPressedAttribute = false;

  protected readonly variantClasses = computed(() => {
    const fillMode = this.fillMode() ?? this.defaults.fillMode;
    const themeColor = this.themeColor() ?? this.defaults.themeColor;
    const size = this.size() ?? this.defaults.size;
    const rounded = this.rounded() ?? this.defaults.rounded;
    return `lc-button--${fillMode} lc-button--${themeColor} lc-button--${size} lc-button--rounded-${rounded}`;
  });

  constructor() {
    // Écoute en phase de capture : le clic est bloqué avant les écouteurs du consommateur (et de RouterLink).
    const blockClick = (event: Event) => {
      if (this.loading() || this.element.getAttribute('aria-disabled') === 'true') {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    this.element.addEventListener('click', blockClick, true);
    inject(DestroyRef).onDestroy(() => this.element.removeEventListener('click', blockClick, true));

    // Attribut posé ici plutôt que par `host` : un `[attr.aria-pressed]` du consommateur sur le même bouton reste intact.
    effect(() => {
      const pressed = this.pressed();
      if (pressed !== undefined) {
        this.element.setAttribute('aria-pressed', String(pressed));
        this.ownsPressedAttribute = true;
      } else if (this.ownsPressedAttribute) {
        this.element.removeAttribute('aria-pressed');
        this.ownsPressedAttribute = false;
      }
    });

    this.secureExternalLink();
    if (isDevMode()) {
      afterNextRender(() => this.warnIfIconOnlyWithoutName());
    }
  }

  /** `target="_blank"` reçoit `rel="noopener noreferrer"` (sécurité). */
  private secureExternalLink(): void {
    if (this.element.tagName !== 'A' || this.element.getAttribute('target') !== '_blank') {
      return;
    }
    const rel = new Set((this.element.getAttribute('rel') ?? '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    this.element.setAttribute('rel', [...rel].join(' '));
  }

  private warnIfIconOnlyWithoutName(): void {
    const named = ['aria-label', 'aria-labelledby', 'title'].some((name) => this.element.hasAttribute(name));
    if (this.iconOnly() && !named) {
      console.warn('[lcButton] Un bouton iconOnly doit avoir un aria-label (nom accessible).', this.element);
    }
  }
}
