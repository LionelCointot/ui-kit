import { FocusableOption } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, ElementRef, booleanAttribute, inject, input } from '@angular/core';
import { LcIconComponent } from '@lionelcointot/ui-angular';
import { LcMenuComponent } from './menu.component';

/** Élément de menu : `<button lcMenuItem icon="pencil">Renommer</button>`. Un clic ferme le menu. */
@Component({
  selector: 'button[lcMenuItem]',
  imports: [LcIconComponent],
  template: `
    @if (icon()) {
      <lc-icon class="lc-menu-item__icon" [name]="icon()!" />
    }
    <span class="lc-menu-item__label"><ng-content /></span>
  `,
  styleUrl: './menu-item.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-menu-item',
    type: 'button',
    role: 'menuitem',
    tabindex: '-1',
    '[class.lc-menu-item--destructive]': 'destructive()',
    '(click)': 'onClick()',
    '(mouseenter)': 'menu?.activate(this)',
  },
})
export class LcMenuItemComponent implements FocusableOption {
  protected readonly menu = inject(LcMenuComponent, { optional: true });
  private readonly element = inject<ElementRef<HTMLButtonElement>>(ElementRef);

  readonly icon = input<string>();
  readonly destructive = input(false, { transform: booleanAttribute });

  get disabled(): boolean {
    return this.element.nativeElement.disabled || this.element.nativeElement.getAttribute('aria-disabled') === 'true';
  }

  focus(): void {
    this.element.nativeElement.focus();
  }

  getLabel(): string {
    return this.element.nativeElement.textContent?.trim() ?? '';
  }

  protected onClick(): void {
    if (!this.disabled) this.menu?.closeRequest(true);
  }
}
