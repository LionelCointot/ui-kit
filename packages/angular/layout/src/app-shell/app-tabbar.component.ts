import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, computed, inject, input, output, signal, untracked, viewChildren } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { LC_LABELS, LcIconComponent, lcPlaceIndicator, type LcNavEntry } from '@lionelcointot/ui-angular';
import { lcActiveTab } from './tabbar-tabs';

/**
 * Barre d'onglets du bas de `lc-app-shell` (interne : seule la coquille la pose, sous 768 px par media query CSS).
 * Les onglets sont les rubriques `primary` ; « Plus » (dernier onglet) ouvre le tiroir de navigation et est actif quand la page n'est dans aucun onglet.
 */
@Component({
  selector: 'lc-app-tabbar',
  imports: [LcIconComponent, RouterLink],
  template: `
    <nav class="lc-tabbar" [attr.aria-label]="labels.primaryNavigation">
      <span #indicator class="lc-tabbar__indicator lc-tabbar__indicator--hidden" aria-hidden="true"
        (transitionrun)="glide(1)" (transitionend)="glide(-1)" (transitioncancel)="glide(-1)"></span>
      @for (tab of tabs(); track tab.url; let index = $index) {
        <a #item class="lc-tabbar__tab" [routerLink]="parse(tab.url)" [attr.aria-current]="index === active() ? 'page' : null">
          @if (tab.icon) {
            <lc-icon [name]="tab.icon" />
          }
          <span class="lc-tabbar__label">{{ tab.label }}</span>
        </a>
      }
      <button #item #more class="lc-tabbar__tab" [class.lc-tabbar__tab--active]="active() === -1" type="button"
        [attr.aria-expanded]="expanded()" [attr.aria-controls]="controls()" (click)="moreClick.emit()">
        <lc-icon name="menu" />
        <span class="lc-tabbar__label">{{ labels.moreNavigation }}</span>
      </button>
    </nav>
  `,
  styleUrl: './app-tabbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-app-tabbar', '[class.lc-app-tabbar--ready]': 'ready()' },
})
export class LcAppTabbarComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Rubriques affichées en onglets (déjà limitées à 4 par la coquille). */
  readonly tabs = input.required<readonly LcNavEntry[]>();
  /** Tiroir ouvert. */
  readonly expanded = input(false);
  /** `id` du tiroir que « Plus » ouvre. */
  readonly controls = input<string>();
  /** Clic sur « Plus ». */
  readonly moreClick = output();

  private readonly url = toSignal(this.router.events.pipe(filter((event) => event instanceof NavigationEnd), map(() => this.router.url)), { initialValue: this.router.url });
  /** Index de l'onglet de la page courante ; -1 : « Plus ». */
  protected readonly active = computed(() => lcActiveTab(this.tabs(), this.url()));

  /** Vrai après la première mesure de la pastille : avant, elle se pose sans transition. */
  protected readonly ready = signal(false);
  private readonly items = viewChildren<ElementRef<HTMLElement>>('item');
  private readonly indicator = viewChildren<ElementRef<HTMLElement>>('indicator');
  private readonly moreButton = viewChildren<ElementRef<HTMLButtonElement>>('more');
  private placed = -2;
  private frame = 0;
  /** Transitions de bord de la pastille en cours (`left`, `right`). */
  private gliding = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.frame));
    afterRenderEffect(() => this.place(false));
    afterRenderEffect((onCleanup) => {
      // Rotation ou changement de largeur : la pastille se remesure sans glisser.
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.place(true));
      observer?.observe(this.host.nativeElement);
      onCleanup(() => observer?.disconnect());
    });
  }

  protected parse(url: string) {
    return this.router.parseUrl(url);
  }

  /** Rend le focus à « Plus » (fermeture du tiroir). */
  focusMore(): void {
    this.moreButton()[0]?.nativeElement.focus();
  }

  /** Pose la pastille sous l'onglet actif ; sans glissement si `instant` (remesure) ou si l'onglet n'a pas changé. */
  private place(instant: boolean): void {
    const index = this.active() === -1 ? this.tabs().length : this.active();
    const items = this.items();
    const indicator = this.indicator()[0]?.nativeElement;
    const item = items[index]?.nativeElement;
    if (!indicator || !item) return;
    // Barre masquée (≥ 768 px) : rien à mesurer ; la pastille sera posée sans glisser à la réapparition (ResizeObserver).
    const visible = item.offsetWidth > 0;
    indicator.classList.toggle('lc-tabbar__indicator--hidden', !visible);
    if (!visible) {
      untracked(() => (this.placed = -2));
      return;
    }
    // shortcut: écriture directe dans le DOM, car l'ordre classe `--instant` / position doit être synchrone dans ce rappel ; à lever si l'on passe aux liaisons de signaux.
    indicator.classList.toggle('lc-tabbar__indicator--instant', instant || this.placed === -2 || this.placed === index);
    const bar = indicator.offsetParent;
    if (!bar) return;
    this.placed = index;
    lcPlaceIndicator(indicator, 'x', item.offsetLeft, item.offsetLeft + item.offsetWidth, bar.clientWidth, 'edges');
    this.ready.set(true);
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.syncLabels(indicator);
  }

  /** Une transition de bord démarre (+1) ou finit (-1) : les libellés suivent la pastille image par image tant qu'il en reste une. */
  protected glide(delta: 1 | -1): void {
    this.gliding = Math.max(0, this.gliding + delta);
    const indicator = this.indicator()[0]?.nativeElement;
    if (indicator && this.gliding && !this.frame) this.syncLabels(indicator);
  }

  /** Le libellé d'un onglet passe « sur la pastille » à l'image où elle recouvre son centre, et en sort de même : image par image tant qu'elle glisse. */
  private syncLabels(indicator: HTMLElement): void {
    const pill = indicator.getBoundingClientRect();
    const tabs = this.items().map((item) => item.nativeElement);
    // Toutes les lectures d'abord, puis les écritures : une seule mise en page par image.
    const under = tabs.map((tab) => {
      const label = tab.querySelector('.lc-tabbar__label')?.getBoundingClientRect();
      const center = label ? label.left + label.width / 2 : -1;
      return pill.width > 0 && center >= pill.left && center <= pill.right;
    });
    tabs.forEach((tab, index) => tab.classList.toggle('lc-tabbar__tab--under', under[index]));
    this.frame = this.gliding ? requestAnimationFrame(() => this.syncLabels(indicator)) : 0;
  }
}
