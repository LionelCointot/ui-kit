import { FocusKeyManager } from '@angular/cdk/a11y';
import { ChangeDetectionStrategy, Component, ElementRef, TemplateRef, afterNextRender, contentChildren, inject, input, output, signal, viewChild, Injector } from '@angular/core';
import { LcMenuItemComponent } from './menu-item.component';

/**
 * Menu contextuel ouvert par `[lcMenuTriggerFor]`. Contient des `button[lcMenuItem]` et des `lc-divider`.
 * Navigation : flèches (avec retour), Début, Fin, frappe de lettres ; Échap ferme et rend le focus au déclencheur.
 */
@Component({
  selector: 'lc-menu',
  template: `
    <ng-template #panel>
      <div class="lc-menu-panel" role="menu" [attr.aria-label]="ariaLabel() || null" (keydown)="onKeydown($event)">
        <ng-content />
      </div>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: none' },
})
export class LcMenuComponent {
  private readonly injector = inject(Injector);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Nom accessible du menu (sinon celui du déclencheur via le déclencheur). */
  readonly ariaLabel = input<string>();
  /** Émise à l'ouverture et à la fermeture. */
  readonly opened = output<void>();
  readonly closed = output<void>();

  readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  protected readonly items = contentChildren(LcMenuItemComponent, { descendants: true });
  private keyManager?: FocusKeyManager<LcMenuItemComponent>;
  private readonly isOpen = signal(false);
  /** Fermeture demandée par le menu (touche Tab, Échap, clic sur un élément) ; renseignée par le déclencheur. */
  closeRequest: (restoreFocus: boolean) => void = () => undefined;

  /** Appelé par le déclencheur une fois le panneau attaché. */
  onOpened(focus: 'first' | 'last' | 'none'): void {
    this.isOpen.set(true);
    this.keyManager = new FocusKeyManager<LcMenuItemComponent>(this.items, this.injector).withWrap().withTypeAhead().skipPredicate((item) => item.disabled);
    if (focus === 'none') {
      this.opened.emit();
      return;
    }
    afterNextRender(() => {
      if (focus === 'last') this.keyManager?.setLastItemActive();
      else this.keyManager?.setFirstItemActive();
    }, { injector: this.injector });
    this.opened.emit();
  }

  onClosed(): void {
    this.isOpen.set(false);
    this.keyManager?.destroy();
    this.keyManager = undefined;
    this.closed.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      this.closeRequest(false);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeRequest(true);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      this.keyManager?.setFirstItemActive();
      return;
    }
    if (event.key === 'End') {
      event.preventDefault();
      this.keyManager?.setLastItemActive();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') event.preventDefault();
    this.keyManager?.onKeydown(event);
  }

  /** Active l'élément sur lequel le pointeur ou le focus se trouve (garde le gestionnaire de clavier cohérent). */
  activate(item: LcMenuItemComponent): void {
    this.keyManager?.setActiveItem(item);
  }

  get hostElement(): HTMLElement {
    return this.element.nativeElement;
  }
}
