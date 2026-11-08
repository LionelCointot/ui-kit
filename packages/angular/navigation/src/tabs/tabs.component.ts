import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, ElementRef, computed, contentChildren, input, model, signal, viewChildren } from '@angular/core';
import { LcIconComponent, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcTabComponent } from './tab.component';

/**
 * Onglets (`tablist`, `tab`, `tabpanel`). Flèches gauche et droite, Début et Fin ; activation
 * automatique (l'onglet focalisé est sélectionné) ou manuelle (Entrée ou Espace). Le contenu d'un onglet
 * n'est créé qu'à sa première sélection, puis conservé.
 */
@Component({
  selector: 'lc-tabs',
  imports: [NgTemplateOutlet, LcIconComponent],
  template: `
    <div class="lc-tabs__list" role="tablist" [attr.aria-label]="ariaLabel() || null">
      @for (tab of tabs(); track tab.id()) {
        <button #tabButton type="button" role="tab" class="lc-tabs__tab"
          [id]="tabId(tab.id())" [attr.aria-selected]="tab.id() === current()"
          [attr.aria-controls]="panelId(tab.id())" [tabIndex]="tab.id() === focusable() ? 0 : -1"
          [disabled]="tab.disabled()" (click)="select(tab.id())" (keydown)="onKeydown($event, $index)">
          @if (tab.icon()) {
            <lc-icon [name]="tab.icon()!" />
          }
          <span>{{ tab.label() }}</span>
        </button>
      }
    </div>
    @for (tab of tabs(); track tab.id()) {
      <div role="tabpanel" class="lc-tabs__panel" tabindex="0"
        [id]="panelId(tab.id())" [attr.aria-labelledby]="tabId(tab.id())" [hidden]="tab.id() !== current()">
        @if (visited().has(tab.id()) || tab.id() === current()) {
          <ng-container [ngTemplateOutlet]="tab.contentTemplate()" />
        }
      </div>
    }
  `,
  styleUrl: './tabs.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-tabs' },
})
export class LcTabsComponent {
  readonly selected = model<string | null>(null);
  readonly activation = input<'automatic' | 'manual'>('automatic');
  readonly ariaLabel = input<string>();

  protected readonly tabs = contentChildren(LcTabComponent);
  private readonly buttons = viewChildren<ElementRef<HTMLButtonElement>>('tabButton');
  private readonly baseId = lcUniqueId('tabs');
  protected readonly visited = signal<ReadonlySet<string>>(new Set());

  /** Onglet affiché : `selected` s'il existe et n'est pas désactivé, sinon le premier onglet actif. */
  protected readonly current = computed(() => {
    const tabs = this.tabs();
    const wanted = this.selected();
    const found = tabs.find((tab) => tab.id() === wanted && !tab.disabled());
    return (found ?? tabs.find((tab) => !tab.disabled()))?.id() ?? null;
  });
  /** Onglet atteignable par Tab (focus itinérant), suit la sélection tant que le focus n'a pas bougé. */
  private readonly focusedTab = signal<string | null>(null);
  protected readonly focusable = computed(() => this.focusedTab() ?? this.current());

  protected tabId(id: string): string {
    return `${this.baseId}-tab-${id}`;
  }

  protected panelId(id: string): string {
    return `${this.baseId}-panel-${id}`;
  }

  protected select(id: string): void {
    this.selected.set(id);
    this.focusedTab.set(null);
    this.visited.update((set) => new Set(set).add(id));
  }

  protected onKeydown(event: KeyboardEvent, index: number): void {
    const tabs = this.tabs();
    let target = -1;
    switch (event.key) {
      case 'ArrowRight': target = this.step(index, 1); break;
      case 'ArrowLeft': target = this.step(index, -1); break;
      case 'Home': target = this.step(-1, 1); break;
      case 'End': target = this.step(tabs.length, -1); break;
      default: return;
    }
    event.preventDefault();
    if (target < 0) return;
    this.buttons()[target]?.nativeElement.focus();
    this.focusedTab.set(tabs[target].id());
    if (this.activation() === 'automatic') this.select(tabs[target].id());
  }

  /** Prochain onglet actif à partir de `from` dans le sens `direction`, avec retour à l'autre extrémité. */
  private step(from: number, direction: 1 | -1): number {
    const tabs = this.tabs();
    for (let offset = 1; offset <= tabs.length; offset += 1) {
      const index = (((from + direction * offset) % tabs.length) + tabs.length) % tabs.length;
      if (!tabs[index].disabled()) return index;
    }
    return -1;
  }
}
