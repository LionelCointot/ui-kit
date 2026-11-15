import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LC_LABELS, LcIconComponent } from '@lionelcointot/ui-angular';

/** Reçu, envoyé par la personne connectée, ou note à diffusion restreinte (distinguée par la forme, une icône et un texte). */
export type LcMessageVariant = 'received' | 'sent' | 'restricted';

/**
 * Message d'un échange : auteur, date, contenu projeté et emplacement de mention (`[lcMessageMention]`, par exemple un badge).
 * Le texte de la date est fourni tel quel ; `dateTime` (valeur machine) devient l'attribut `datetime` de `<time>`.
 * La variante est annoncée aux lecteurs d'écran avant l'auteur.
 *
 * @example <lc-message variant="sent" author="Vous" date="12 mars" dateTime="2026-03-12">Bonjour<lc-badge lcMessageMention>Lu</lc-badge></lc-message>
 */
@Component({
  selector: 'lc-message',
  imports: [LcIconComponent],
  template: `
    @if (variant() !== 'restricted') {
      <span class="lc-visually-hidden">{{ variantLabel() }}</span>
    }
    <div class="lc-message__header">
      @if (variant() === 'restricted') {
        <span class="lc-message__tag"><lc-icon name="lock" />{{ variantLabel() }}</span>
      }
      @if (author(); as name) {
        <strong class="lc-message__author">{{ name }}</strong>
      }
      @if (date(); as text) {
        <time class="lc-message__date" [attr.datetime]="dateTime() ?? null">{{ text }}</time>
      }
      <ng-content select="[lcMessageMention]" />
    </div>
    <div class="lc-message__content"><ng-content /></div>
  `,
  styleUrl: './message.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-message', '[class]': "'lc-message--' + variant()" },
})
export class LcMessageComponent {
  protected readonly labels = inject(LC_LABELS);

  readonly variant = input<LcMessageVariant>('received');
  /** Nom de l'auteur ; absent : aucun bloc d'auteur. */
  readonly author = input<string>();
  /** Texte de la date, affiché tel quel. */
  readonly date = input<string>();
  /** Valeur machine de la date (ISO 8601), posée sur `datetime`. */
  readonly dateTime = input<string>();

  protected readonly variantLabel = computed(() => {
    const labels = this.labels;
    return { received: labels.messageReceived, sent: labels.messageSent, restricted: labels.messageRestricted }[this.variant()];
  });
}
