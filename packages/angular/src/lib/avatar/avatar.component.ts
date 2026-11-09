import { ChangeDetectionStrategy, Component, computed, input, linkedSignal } from '@angular/core';
import { LcIconComponent } from '../icon/icon.component';
import { LcSize } from '../core/types';
import { lcAvatarTone, lcInitials } from './avatar-helpers';

/**
 * Avatar d'une personne : photo (`src`) ou, à défaut ou en cas d'échec de chargement, initiales sur une teinte
 * déterministe de la palette catégorielle des tokens (`--lc-sys-chart-categorical-*`). Sans initiales exploitables,
 * l'icône `user` est affichée. Décoratif par défaut (`aria-hidden`), étiqueté (`role="img"`) si `label` est fourni.
 *
 * @example <lc-avatar name="Élodie Martin" size="large" label="Élodie Martin, connectée" />
 */
@Component({
  selector: 'lc-avatar',
  imports: [LcIconComponent],
  template: `
    @if (showImage()) {
      <img class="lc-avatar__image" [src]="src()" alt="" (error)="imageFailed.set(true)" />
    } @else if (initials()) {
      <span class="lc-avatar__initials">{{ initials() }}</span>
    } @else {
      <lc-icon name="user" />
    }
  `,
  styleUrl: './avatar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-avatar',
    '[class]': 'variantClasses()',
    '[attr.role]': "label() ? 'img' : null",
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-hidden]': "label() ? null : 'true'",
  },
})
export class LcAvatarComponent {
  /** Nom de la personne : source des initiales (deux au plus) et graine de couleur par défaut. */
  readonly name = input.required<string>();
  /** URL de la photo ; les initiales prennent le relais si elle est absente ou ne se charge pas. */
  readonly src = input<string>();
  readonly size = input<LcSize>('medium');
  /** Graine de la couleur (défaut : `name`) : une même graine donne toujours la même teinte. */
  readonly colorSeed = input<string>();
  /** Nom accessible ; sans libellé, l'avatar est décoratif (le nom doit alors figurer à côté). */
  readonly label = input<string>();

  protected readonly initials = computed(() => lcInitials(this.name()));
  /** Repasse à `false` quand `src` change : une nouvelle URL est essayée. */
  protected readonly imageFailed = linkedSignal<string | undefined, boolean>({ source: this.src, computation: () => false });
  protected readonly showImage = computed(() => !!this.src() && !this.imageFailed());
  protected readonly variantClasses = computed(() => {
    const tone = lcAvatarTone(this.colorSeed() || this.name());
    return `lc-avatar--${this.size()} lc-avatar--tone-${tone}`;
  });
}
