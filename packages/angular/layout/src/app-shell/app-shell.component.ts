import { DOCUMENT } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, computed, effect, inject, input, isDevMode, model, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LC_LABELS, LcButtonComponent, LcIconComponent, LcNavRegistry, lcUniqueId } from '@lionelcointot/ui-angular';
import { LC_PHONE_QUERY } from '../phone-query';
import { LcPageNav } from '../page-transitions/page-nav.service';
import { LcPageTransitionsDirective } from '../page-transitions/page-transitions.directive';
import { LcAppTabbarComponent } from './app-tabbar.component';
import { LC_TABBAR_MAX_TABS, lcPrimaryEntries, lcTabbarTabs } from './tabbar-tabs';

/** Défilement (px) au-delà duquel le titre de la page apparaît dans l'en-tête mobile (valeur de d59). */
const HEADER_TITLE_SCROLL_PX = 80;

/**
 * Coquille d'application : lien d'évitement, en-tête, navigation et contenu principal.
 * Navigation latérale (réductible aux icônes) ≥ 1024 px, tiroir en dessous (focus piégé, Échap ferme
 * et rend le focus au bouton de menu). Un seul `lc-app-shell` par document (la barre d'onglets pose la classe `lc-has-tabbar` sur `:root`). Les changements de page de l'application sont animés (`lcPageTransitions`, sans effet sans routeur). Emplacements : `[lcShellHeader]`, `[lcShellNav]`, contenu.
 */
@Component({
  selector: 'lc-app-shell',
  imports: [A11yModule, LcAppTabbarComponent, LcButtonComponent, LcIconComponent, LcPageTransitionsDirective],
  template: `
    <a class="lc-shell__skip" href="#lc-main" (click)="focusMain($event)">{{ labels.skipToContent }}</a>
    <header class="lc-shell__header" [class.lc-shell__header--entering]="entering()" (animationend)="endEntering($event)" [attr.inert]="modalNav() ? '' : null">
      @if (nav.level() > 1) {
        <button lcButton type="button" fillMode="flat" themeColor="neutral" class="lc-shell__back" [attr.aria-label]="backLabel()" (click)="nav.back()">
          <lc-icon name="chevron-left" /><span class="lc-shell__back-text">{{ backText() }}</span>
        </button>
      }
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
      <span class="lc-shell__title" aria-hidden="true" [class.lc-shell__title--shown]="scrolled()">{{ nav.title() }}</span>
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
      <main lcPageTransitions class="lc-shell__main" id="lc-main" tabindex="-1" [attr.inert]="modalNav() ? '' : null">
        @if (nav.level() > 1) {
          <div class="lc-shell__edge" data-lc-page-edge></div>
        }
        <ng-content />
      </main>
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
  protected readonly nav = inject(LcPageNav);
  private readonly menuButton = viewChild('menuButton', { read: ElementRef<HTMLButtonElement> });

  /** `auto` : latéral ≥ 1024 px, tiroir en dessous. `none` : ni bouton de menu, ni `<nav>`, ni tiroir (pages sans navigation, comme la connexion). */
  readonly navMode = input<'auto' | 'side' | 'drawer' | 'none'>('auto');
  /** Tiroir ouvert (mode tiroir). */
  readonly navOpen = model(false);
  /** Navigation latérale réduite aux icônes. */
  readonly navCollapsed = model(false);
  /** `aria-label` du `<nav>`. */
  readonly navLabel = input<string>();

  /** En-tête mobile : titre du parent (repli `labels.back`) et nom accessible qui le contient. */
  protected readonly backText = computed(() => this.nav.parent()?.title ?? this.labels.back);
  protected readonly backLabel = computed(() => { const parent = this.nav.parent(); return parent ? this.labels.backTo(parent.title) : this.labels.back; });
  protected readonly scrolled = signal(false);

  protected readonly navId = lcUniqueId('shell-nav');
  private readonly wide = toSignal(this.breakpoints.observe('(min-width: 1024px)').pipe(map((state) => state.matches)), { initialValue: true });
  protected readonly isDrawer = computed(() => this.navMode() === 'drawer' || (this.navMode() === 'auto' && !this.wide()));

  /** Tiroir ouvert : le reste de la page est inerte (il l'est aussi pour le clavier et les lecteurs d'écran). */
  protected readonly modalNav = computed(() => this.isDrawer() && this.navOpen());

  // Barre d'onglets : rubriques `primary` du registre (au plus 4), sous 768 px seulement (media query CSS, `LC_PHONE_QUERY`) ; sans rubrique `primary`, ni barre ni changement.
  private readonly registry = inject(LcNavRegistry);
  private readonly phone = toSignal(this.breakpoints.observe(LC_PHONE_QUERY).pipe(map((state) => state.matches)), { initialValue: false });
  private readonly tabbar = viewChild(LcAppTabbarComponent);
  protected readonly tabs = computed(() => lcTabbarTabs(this.registry.items()));
  protected readonly hasTabbar = computed(() => this.navMode() !== 'none' && this.navMode() !== 'side' && this.tabs().length > 0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const onScroll = () => this.scrolled.set(window.scrollY > HEADER_TITLE_SCROLL_PX);
      window.addEventListener('scroll', onScroll, { passive: true });
      destroyRef.onDestroy(() => window.removeEventListener('scroll', onScroll));
      onScroll();
    });
    // Le toast vit dans une surcouche hors du shell : la classe sur `:root` lui apporte `--lc-shell-tabbar-space` (feuille globale).
    const root = inject(DOCUMENT).documentElement;
    effect(() => root.classList.toggle('lc-has-tabbar', this.hasTabbar()));
    destroyRef.onDestroy(() => root.classList.remove('lc-has-tabbar'));
    effect(() => {
      if (isDevMode() && lcPrimaryEntries(this.registry.items()).length > LC_TABBAR_MAX_TABS) {
        console.warn(`lc-app-shell : la barre d'onglets affiche les ${LC_TABBAR_MAX_TABS} premières rubriques « primary » ; les suivantes ne sont que dans le tiroir.`);
      }
    });
  }

  /** Entrée de l'en-tête : vraie au premier rendu seulement, retirée à la fin de l'animation témoin de l'en-tête (pas celle d'un enfant). */
  protected readonly entering = signal(true);

  protected endEntering(event: AnimationEvent): void {
    if (event.target === event.currentTarget) this.entering.set(false);
  }

  protected closeDrawer(): void {
    if (!this.navOpen()) return;
    this.navOpen.set(false);
    // Après le rendu : le déclencheur est encore inerte tant que le tiroir n'est pas refermé dans le DOM. Le focus lui revient : « Plus » quand la barre remplace le bouton de menu (téléphone), sinon le bouton de menu.
    afterNextRender(() => this.focusDrawerTrigger(), { injector: this.injector });
  }

  /** Seul endroit qui choisit où va le focus à la fermeture du tiroir. */
  private focusDrawerTrigger(): void {
    if (this.hasTabbar() && this.phone()) this.tabbar()?.focusMore();
    else this.menuButton()?.nativeElement.focus();
  }

  protected focusMain(event: Event): void {
    event.preventDefault();
    this.host.nativeElement.querySelector<HTMLElement>('#lc-main')?.focus();
  }
}
