import { Component, inject } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcTimelineBarComponent } from '@lionelcointot/ui-angular/data';
import { LcFileUploadComponent, LcMessageComposerComponent } from '@lionelcointot/ui-angular/forms';
import { LcProgressBarComponent, LcToastOutletComponent, LcToastService } from '@lionelcointot/ui-angular/feedback';

/**
 * Support des critères CA-12 (barres en `lcFill`, décalage d'entrée), CA-25 (entrée et sortie du toast) et CA-31 (360 px) de la spec
 * 2026-12-mouvement-v2 (tâche T10a). À piloter par une suite navigateur : barres `.lc-fill` à rangs 0, 1, 2, bande indéterminée sans transition,
 * toast `.lc-toast` (clic sur `#qa-toast`, fermeture par `#qa-dismiss`).
 */
@Component({
  selector: 'lc-qa-fill-toast',
  imports: [LcProgressBarComponent, LcTimelineBarComponent, LcFileUploadComponent, LcMessageComposerComponent, LcButtonComponent, LcToastOutletComponent],
  template: `
    <div style="display:grid;gap:var(--lc-sys-space-3)">
      <lc-progress-bar id="qa-bar-0" [value]="80" [rank]="0" label="Barre 0" />
      <lc-progress-bar id="qa-bar-1" [value]="50" [rank]="1" label="Barre 1" />
      <lc-progress-bar id="qa-bar-2" [value]="20" [rank]="2" label="Barre 2" />
      <lc-progress-bar id="qa-bar-indeterminate" [value]="null" label="Indéterminée" />
      <lc-timeline-bar id="qa-timeline" [segments]="segments" description="Deux phases." />
      <lc-file-upload id="qa-upload" [items]="items" ariaLabel="Pièces jointes" />
      <lc-message-composer id="qa-composer" [items]="items" ariaLabel="Votre message" />
      <button lcButton id="qa-toast" type="button" (click)="show()">Toast</button>
      <button lcButton id="qa-dismiss" type="button" (click)="toasts.dismissAll()">Fermer</button>
    </div>
    <lc-toast-outlet />`,
})
class QaFillToastComponent {
  protected readonly toasts = inject(LcToastService);
  protected readonly segments = [
    { id: 'a', weight: 60, label: 'Phase A', colorSlot: 1 },
    { id: 'b', weight: 40, label: 'Phase B', colorSlot: 2 },
  ] as const;
  protected readonly items = [{ id: 'u', name: 'rapport.pdf', size: 2_300_000, status: 'uploading', progress: 60 }] as const;

  protected show(): void {
    this.toasts.show({ kind: 'info', message: 'Notification QA', durationMs: 60_000 });
  }
}

const meta: Meta = {
  title: 'QA/Feedback/Fill and toast',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaFillToastComponent] })],
  render: () => ({ template: '<lc-qa-fill-toast />' }),
};
export default meta;
export const FillAndToast: StoryObj = {};
