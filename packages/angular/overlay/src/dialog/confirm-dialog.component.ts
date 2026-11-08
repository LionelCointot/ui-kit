import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { LC_LABELS, LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcDialogComponent } from './dialog.component';
import { LC_DIALOG_DATA, LcDialogRef } from './dialog-ref';
import type { LcConfirmOptions } from './dialog.service';

/** Dialogue de confirmation ouvert par `LcDialogService.confirm()` (interne). */
@Component({
  selector: 'lc-confirm-dialog',
  imports: [LcDialogComponent, LcButtonComponent],
  template: `
    <lc-dialog [title]="options.title" hideClose>
      <p class="lc-confirm-dialog__message">{{ options.message }}</p>
      <ng-container ngProjectAs="[lcDialogActions]">
        <button lcButton type="button" fillMode="outline" themeColor="neutral" (click)="ref.close(false)">{{ cancelLabel() }}</button>
        <button lcButton type="button" [themeColor]="options.destructive ? 'error' : 'primary'" (click)="ref.close(true)">{{ confirmLabel() }}</button>
      </ng-container>
    </lc-dialog>
  `,
  styles: '.lc-confirm-dialog__message { margin: 0; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LcConfirmDialogComponent {
  private readonly labels = inject(LC_LABELS);
  protected readonly options = inject(LC_DIALOG_DATA) as LcConfirmOptions;
  protected readonly ref = inject<LcDialogRef<boolean>>(LcDialogRef);

  protected readonly confirmLabel = computed(() => this.options.confirmLabel || this.labels.confirm);
  protected readonly cancelLabel = computed(() => this.options.cancelLabel || this.labels.cancel);
}
