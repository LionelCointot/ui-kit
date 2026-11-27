import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, inject, input, model, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LC_LABELS, LcButtonComponent, LcIconComponent, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcPageTransitionsDirective } from '../page-transitions/page-transitions.directive';

/**
 * Coquille d'application : lien d'évitement, en-tête, navigation et contenu principal.
 * Navigation latérale (réductible aux icônes) ≥ 1024 px, tiroir en dessous (focus piégé, Échap ferme
 * et rend le focus au bouton de menu). Les changements de page de l'application sont animés (`lcPageTransitions`, sans effet sans routeur). Emplacements : `[lcShellHeader]`, `[lcShellNav]`, contenu.
 */
@Component({
  selector: 'lc-app-shell',
  imports: [A11yModule, LcButtonComponent, LcIconComponent, LcPageTransitionsDirective],
  template: `
    <a class="lc-shell__skip" href="#lc-main" (click)="focusMain($event)">{{ labels.skipToContent }}</a>
    <header class="lc-shell__header" [attr.inert]="modalNav() ? '' : null">
      @if (navMode() !== 'none') {
        @if (isDrawer()) {
          <button #menuButton lcButton type="button" iconOnly fillMode="flat" themeColor="neutral"
            [attr.aria-label]="navOpen() ? labels.closeNavigation : labels.openNavigation"
            [attr.aria-expanded]="navOpen()" [attr.aria-controls]="navId" (click)="navOpen.set(!navOpen())">
            <lc-icon name="menu" />
          </button>
        } @else {
          <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral"
            [attr.aria-label]="navCollapsed() ? labels.openNavigation : labels.closeNavigation"
            [attr.aria-expanded]="!navCollapsed()" [attr.aria-controls]="navId" (click)="navCollapsed.set(!navCollapsed())">
            <lc-icon name="menu" />
          </button>
        }
      }
      <div class="lc-shell__header-content"><ng-content select="[lcShellHeader]" /></div>
    </header>
    <div class="lc-shell__body">
      @if (navMode() !== 'none') {
        <nav class="lc-shell__nav" [id]="navId" [attr.aria-label]="navLabel() || null"
          [class.lc-shell__nav--drawer]="isDrawer()" [class.lc-shell__nav--open]="navOpen()"
          [class.lc-shell__nav--collapsed]="!isDrawer() && navCollapsed()"
          [cdkTrapFocus]="modalNav()" [cdkTrapFocusAutoCapture]="modalNav()"
          (keydown.escape)="closeDrawer()">
          <ng-content select="[lcShellNav]" />
        </nav>
        @if (isDrawer() && navOpen()) {
          <div class="lc-shell__backdrop" (click)="closeDrawer()"></div>
        }
      }
      <main lcPageTransitions class="lc-shell__main" id="lc-main" tabindex="-1" [attr.inert]="modalNav() ? '' : null"><ng-content /></main>
    </div>
  `,
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-app-shell' },
})
export class LcAppShellComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly menuButton = viewChild('menuButton', { read: ElementRef<HTMLButtonElement> });

  /** `auto` : latéral ≥ 1024 px, tiroir en dessous. `none` : ni bouton de menu, ni `<nav>`, ni tiroir (pages sans navigation, comme la connexion). */
  readonly navMode = input<'auto' | 'side' | 'drawer' | 'none'>('auto');
  /** Tiroir ouvert (mode tiroir). */
  readonly navOpen = model(false);
  /** Navigation latérale réduite aux icônes. */
  readonly navCollapsed = model(false);
  /** `aria-label` du `<nav>`. */
  readonly navLabel = input<string>();

  protected readonly navId = lcUniqueId('shell-nav');
  private readonly wide = toSignal(this.breakpoints.observe('(min-width: 1024px)').pipe(map((state) => state.matches)), { initialValue: true });
  protected readonly isDrawer = computed(() => this.navMode() === 'drawer' || (this.navMode() === 'auto' && !this.wide()));

  /** Tiroir ouvert : le reste de la page est inerte (il l'est aussi pour le clavier et les lecteurs d'écran). */
  protected readonly modalNav = computed(() => this.isDrawer() && this.navOpen());

  protected closeDrawer(): void {
    if (!this.navOpen()) return;
    this.navOpen.set(false);
    // Après le rendu : le bouton de menu est encore inerte tant que le tiroir n'est pas refermé dans le DOM.
    afterNextRender(() => this.menuButton()?.nativeElement.focus(), { injector: this.injector });
  }

  protected focusMain(event: Event): void {
    event.preventDefault();
    this.host.nativeElement.querySelector<HTMLElement>('#lc-main')?.focus();
  }
}
