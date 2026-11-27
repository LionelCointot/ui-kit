import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, ElementRef, Injector, afterNextRender, computed, effect, inject, input, isDevMode, model, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LC_LABELS, LcButtonComponent, LcIconComponent, LcNavRegistry, lcUniqueId } from '@lionelcointot/ui-angular';
import { LcPageTransitionsDirective } from '../page-transitions/page-transitions.directive';
import { LcAppTabbarComponent } from './app-tabbar.component';
import { LC_TABBAR_MAX_TABS, lcPrimaryEntries, lcTabbarTabs } from './tabbar-tabs';

/**
 * Coquille d'application : lien d'évitement, en-tête, navigation et contenu principal.
 * Navigation latérale (réductible aux icônes) ≥ 1024 px, tiroir en dessous (focus piégé, Échap ferme
 * et rend le focus au bouton de menu). Les changements de page de l'application sont animés (`lcPageTransitions`, sans effet sans routeur). Emplacements : `[lcShellHeader]`, `[lcShellNav]`, contenu.
 */
@Component({
  selector: 'lc-app-shell',
  imports: [A11yModule, LcAppTabbarComponent, LcButtonComponent, LcIconComponent, LcPageTransitionsDirective],
  template: `
    <a class="lc-shell__skip" href="#lc-main" (click)="focusMain($event)">{{ labels.skipToContent }}</a>
    <header class="lc-shell__header" [attr.inert]="modalNav() ? '' : null">
      @if (navMode() !== 'none') {
        @if (isDrawer()) {
          <button #menuButton lcButton class="lc-shell__menu" type="button" iconOnly fillMode="flat" themeColor="neutral"
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
    @if (hasTabbar()) {
      <lc-app-tabbar [tabs]="tabs()" [expanded]="navOpen()" [controls]="navId" [attr.inert]="modalNav() ? '' : null" (moreClick)="navOpen.set(true)" />
    }
  `,
  styleUrl: './app-shell.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-app-shell', '[class.lc-app-shell--tabbar]': 'hasTabbar()' },
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

  // Barre d'onglets : rubriques `primary` du registre (au plus 4), sous 768 px seulement (media query CSS) ; sans rubrique `primary`, ni barre ni changement.
  private readonly registry = inject(LcNavRegistry);
  private readonly phone = toSignal(this.breakpoints.observe('(max-width: 767.98px)').pipe(map((state) => state.matches)), { initialValue: false });
  private readonly tabbar = viewChild(LcAppTabbarComponent);
  protected readonly tabs = computed(() => lcTabbarTabs(this.registry.items()));
  protected readonly hasTabbar = computed(() => this.navMode() !== 'none' && this.navMode() !== 'side' && this.tabs().length > 0);

  constructor() {
    effect(() => {
      if (isDevMode() && lcPrimaryEntries(this.registry.items()).length > LC_TABBAR_MAX_TABS) {
        console.warn(`lc-app-shell : la barre d'onglets affiche les ${LC_TABBAR_MAX_TABS} premières rubriques « primary » ; les suivantes ne sont que dans le tiroir.`);
      }
    });
  }

  protected closeDrawer(): void {
    if (!this.navOpen()) return;
    this.navOpen.set(false);
    // Après le rendu : le bouton de menu (ou la barre d'onglets, qui le remplace sur téléphone) est encore inerte tant que le tiroir n'est pas refermé dans le DOM.
    afterNextRender(
      () => {
        if (this.hasTabbar() && this.phone()) this.tabbar()?.focusMore();
        else this.menuButton()?.nativeElement.focus();
      },
      { injector: this.injector },
    );
  }

  protected focusMain(event: Event): void {
    event.preventDefault();
    this.host.nativeElement.querySelector<HTMLElement>('#lc-main')?.focus();
  }
}
