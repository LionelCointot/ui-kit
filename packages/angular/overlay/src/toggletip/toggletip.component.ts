import { ChangeDetectionStrategy, Component, TemplateRef, signal, viewChild } from '@angular/core';
import { lcUniqueId } from '@lionelcointot/ui-angular';
import type { LcOverlayDirection } from '../tooltip/tooltip-positions';

/**
 * Contenu d'une info-bulle ouverte au clic : `<lc-toggletip #detail>…</lc-toggletip>`, reliée à un `button` par `[lcToggletip]="detail"`.
 * L'hôte reste vide dans la page ; la bulle (flèche, bordure, ombre) est affichée dans un panneau CDK par la directive.
 * Le contenu est projeté dans une région `role="status"` qui existe d'abord vide, puis se remplit : c'est ce qui la fait annoncer.
 */
@Component({
  selector: 'lc-toggletip',
  template: `
    <ng-template #panel>
      <div class="lc-toggletip" [attr.data-direction]="direction()" [style.--_arrow-offset]="arrowOffset() + 'px'">
        <span class="lc-toggletip__arrow"></span>
        <div class="lc-toggletip__box" role="status" tabindex="-1" [id]="id">
          @if (filled()) {
            <ng-content />
          }
        </div>
      </div>
    </ng-template>`,
  styleUrl: './toggletip.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LcToggletipComponent {
  readonly id = lcUniqueId('toggletip');
  /** Utilisés par `LcToggletipDirective` seulement. */
  readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  readonly filled = signal(false);
  readonly direction = signal<LcOverlayDirection>('below');
  readonly arrowOffset = signal<number | null>(null);
}
