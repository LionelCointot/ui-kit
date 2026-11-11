import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, model, viewChild } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { lcPageCount } from './page-slice';

/** Taille de page par défaut. */
const DEFAULT_PAGE_SIZE = 25;

/**
 * Pagination d'une liste longue : « 26 à 50 sur 120 », boutons Précédent et Suivant, « Page 2 sur 5 »
 * (annoncé en `role="status"`) et, si `pageSizes` n'est pas vide, une liste native de tailles de page.
 * Le composant ne découpe pas les données : utiliser `lcPageSlice(items, page, pageSize)` ou une API paginée.
 */
@Component({
  selector: 'lc-paginator',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <nav class="lc-paginator__nav" [attr.aria-label]="ariaLabel() ?? labels.pagination">
      @if (pageSizes().length > 0) {
        <label class="lc-paginator__size">
          <span>{{ labels.pageSize }}</span>
          <select class="lc-select lc-paginator__select" (change)="changePageSize($event)">
            @for (size of pageSizes(); track size) {
              <option [value]="size" [selected]="size === effectivePageSize()">{{ size }}</option>
            }
          </select>
        </label>
      }
      <p class="lc-paginator__range">{{ labels.pageRange(firstItem(), lastItem(), safeTotal()) }}</p>
      <button #previous lcButton type="button" fillMode="flat" themeColor="neutral" [disabled]="isFirst()" (click)="goTo(currentPage() - 1)">
        <lc-icon name="chevron-left" />
        {{ labels.previousPage }}
      </button>
      <span class="lc-paginator__page" role="status" aria-current="page">{{ labels.pageStatus(currentPage(), pageCount()) }}</span>
      <button #next lcButton type="button" fillMode="flat" themeColor="neutral" [disabled]="isLast()" (click)="goTo(currentPage() + 1)">
        {{ labels.nextPage }}
        <lc-icon name="chevron-right" />
      </button>
    </nav>
  `,
  styleUrl: './paginator.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'lc-paginator' },
})
export class LcPaginatorComponent {
  protected readonly labels = inject(LC_LABELS);

  /** Nombre total d'éléments. */
  readonly total = input.required<number>();
  readonly pageSize = model(DEFAULT_PAGE_SIZE);
  /** Tailles proposées ; vide : pas de liste de choix. */
  readonly pageSizes = input<readonly number[]>([]);
  /** Page courante (1 = première), recadrée si elle sort des bornes. Chaque changement émet `pageChange` (sortie du `model`). */
  readonly page = model(1);
  /** Nom de la navigation ; défaut : `LC_LABELS.pagination`. */
  readonly ariaLabel = input<string>();

  private readonly previousButton = viewChild.required('previous', { read: ElementRef<HTMLButtonElement> });
  private readonly nextButton = viewChild.required('next', { read: ElementRef<HTMLButtonElement> });

  protected readonly effectivePageSize = computed(() => {
    const size = Math.floor(this.pageSize());
    return Number.isFinite(size) && size >= 1 ? size : DEFAULT_PAGE_SIZE;
  });
  protected readonly safeTotal = computed(() => (Number.isFinite(this.total()) ? Math.max(0, Math.floor(this.total())) : 0));
  protected readonly pageCount = computed(() => lcPageCount(this.safeTotal(), this.effectivePageSize()));
  protected readonly currentPage = computed(() => {
    const page = Math.trunc(this.page());
    return Number.isFinite(page) ? Math.min(this.pageCount(), Math.max(1, page)) : 1;
  });
  protected readonly firstItem = computed(() => (this.safeTotal() === 0 ? 0 : (this.currentPage() - 1) * this.effectivePageSize() + 1));
  protected readonly lastItem = computed(() => Math.min(this.safeTotal(), this.currentPage() * this.effectivePageSize()));
  protected readonly isFirst = computed(() => this.currentPage() <= 1);
  protected readonly isLast = computed(() => this.currentPage() >= this.pageCount());

  constructor() {
    // Le modèle de l'application doit refléter la page affichée : recadrage après un changement de `total` ou de taille.
    effect(() => {
      const current = this.currentPage();
      if (this.page() !== current) {
        this.page.set(current);
      }
    });
  }

  protected goTo(page: number): void {
    const target = Math.min(this.pageCount(), Math.max(1, page));
    if (target === this.currentPage()) return;
    // Le bouton cliqué va être désactivé à la borne : le focus passe à l'autre bouton plutôt que d'être perdu.
    if (target === 1) this.nextButton().nativeElement.focus();
    else if (target === this.pageCount()) this.previousButton().nativeElement.focus();
    this.page.set(target);
  }

  protected changePageSize(event: Event): void {
    const size = Number((event.target as HTMLSelectElement).value);
    if (!Number.isInteger(size) || size < 1) return;
    // Garde le premier élément affiché visible après le changement de taille.
    const firstItem = this.firstItem() === 0 ? 1 : this.firstItem();
    this.pageSize.set(size);
    const page = Math.ceil(firstItem / size);
    if (page !== this.currentPage()) {
      this.page.set(page);
    }
  }
}
