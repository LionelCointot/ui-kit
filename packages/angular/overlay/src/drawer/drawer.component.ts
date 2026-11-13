import { ChangeDetectionStrategy, Component, booleanAttribute, computed, inject, input, signal } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_DRAWER_CONTEXT, LcDrawerRef } from './drawer-ref';

/**
 * Mise en page d'un tiroir latéral : en-tête collant (titre relié par aria-labelledby et bouton de fermeture),
 * corps défilant (ombre interne sous l'en-tête quand il défile) et pied collant (`[lcDrawerActions]`,
 * action principale à droite). Le composant ouvert par `LcDrawerService` place `<lc-drawer title="…">` dans son gabarit.
 */
@Component({
  selector: 'lc-drawer',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <header class="lc-drawer__header" [class.lc-drawer__header--scrolled]="scrolled()">
      <h2 class="lc-drawer__title" [id]="titleId">{{ title() }}</h2>
      @if (closable()) {
        <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" class="lc-drawer__close"
          [attr.aria-label]="labels.close" (click)="close()"><lc-icon name="x" /></button>
      }
    </header>
    <div class="lc-drawer__content" (scroll)="onScroll($event)"><ng-content /></div>
    <footer class="lc-drawer__actions"><ng-content select="[lcDrawerActions]" /></footer>
  `,
  styleUrl: './drawer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-drawer',
    '[class.lc-drawer--start]': 'side() === "start"',
  },
})
export class LcDrawerComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly context = inject(LC_DRAWER_CONTEXT, { optional: true });
  private readonly drawerRef = inject(LcDrawerRef, { optional: true });

  readonly title = input.required<string>();
  /** Masque le bouton de fermeture de l'en-tête. */
  readonly hideClose = input(false, { transform: booleanAttribute });

  protected readonly titleId = this.context?.titleId ?? lcUniqueId('drawer-title');
  protected readonly side = computed(() => this.context?.side ?? 'end');
  protected readonly closable = computed(() => !this.hideClose() && !!this.drawerRef && (this.context?.dismissible ?? true));
  protected readonly scrolled = signal(false);

  protected close(): void {
    this.drawerRef?.close();
  }

  protected onScroll(event: Event): void {
    this.scrolled.set((event.target as HTMLElement).scrollTop > 0);
  }
}
