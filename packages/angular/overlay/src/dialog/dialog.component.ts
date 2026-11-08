import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_DIALOG_CONTEXT, LcDialogRef } from './dialog-ref';

/**
 * Mise en page d'un dialogue : titre (relié par aria-labelledby), contenu défilant,
 * actions (`[lcDialogActions]`, bouton principal à droite) et bouton de fermeture si le dialogue est fermable.
 */
@Component({
  selector: 'lc-dialog',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <header class="lc-dialog__header">
      <h2 class="lc-dialog__title" [id]="titleId">{{ title() }}</h2>
      @if (closable()) {
        <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" size="small"
          [attr.aria-label]="labels.close" (click)="close()"><lc-icon name="x" /></button>
      }
    </header>
    <div class="lc-dialog__content"><ng-content /></div>
    <footer class="lc-dialog__actions"><ng-content select="[lcDialogActions]" /></footer>
  `,
  styleUrl: './dialog.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-dialog' },
})
export class LcDialogComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly context = inject(LC_DIALOG_CONTEXT, { optional: true });
  private readonly dialogRef = inject(LcDialogRef, { optional: true });

  readonly title = input.required<string>();
  /** Masque le bouton de fermeture de l'en-tête (ex. confirmation : le bouton Annuler suffit). */
  readonly hideClose = input(false, { transform: booleanAttribute });

  protected readonly titleId = this.context?.titleId ?? lcUniqueId('dialog-title');
  protected readonly closable = computed(() => !this.hideClose() && !!this.dialogRef && (this.context?.dismissible ?? true));

  protected close(): void {
    this.dialogRef?.close();
  }
}
