import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterRenderEffect, booleanAttribute, computed, inject,
  input, model, output, signal, viewChild,
} from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';

export type LcLogLineKind = 'out' | 'err' | 'info';

export interface LcLogLine {
  /** Identifiant unique et croissant (le dédoublonnage reste à la charge de l'appelant). */
  readonly id: number | string;
  readonly text: string;
  /** Repère placé avant le texte (ex. nom de l'étape qui a produit la ligne). */
  readonly prefix?: string;
  /** Niveau : `err` et `info` portent un repère textuel en plus de la couleur ; `out` par défaut. */
  readonly kind?: LcLogLineKind;
}

const COPY_FEEDBACK_MS = 2000;
/** Tolérance (px) pour considérer la zone comme défilée jusqu'en bas (défilement fractionnaire). */
const BOTTOM_TOLERANCE = 2;
const DEFAULT_MAX_LINES = 500;

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Journal à ajout continu (sortie d'un processus) : lignes en police à chasse fixe, suivi automatique de la fin
 * tant que l'utilisateur n'a pas défilé vers le haut, bouton de reprise, plafond de lignes affichées, copie.
 * Le texte est inséré comme texte (jamais interprété) ; les séquences ANSI sont à retirer par l'appelant.
 */
@Component({
  selector: 'lc-log-view',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    @if (copyable()) {
      <div class="lc-log-view__bar">
        <button lcButton type="button" fillMode="flat" themeColor="neutral" (click)="copy()">
          <lc-icon [name]="copyState() === 'copied' ? 'check' : 'copy'" />{{ copyLabel() ?? labels.logCopy }}
        </button>
        <span class="lc-log-view__status" role="status">{{ statusText() }}</span>
      </div>
    }
    <div #scroller class="lc-log-view__scroller" role="log" tabindex="0" [style.block-size]="height()"
      [attr.aria-label]="ariaLabel()" [attr.aria-live]="live()" (scroll)="onScroll()">
      @if (hiddenCount() > 0) {
        <p class="lc-log-view__notice">{{ (truncatedLabel() ?? labels.logTruncated)(hiddenCount()) }}</p>
      }
      @for (line of visibleLines(); track line.id) {
        <div class="lc-log-view__line" [class.lc-log-view__line--err]="line.kind === 'err'" [class.lc-log-view__line--info]="line.kind === 'info'">
          @if (levelLabel(line.kind); as level) {
            <span class="lc-log-view__level">{{ level }}</span>
          }
          @if (line.prefix) {
            <span class="lc-log-view__prefix">{{ line.prefix }}</span>
          }
          <span class="lc-log-view__text">{{ line.text }}</span>
        </div>
      } @empty {
        <p class="lc-log-view__empty">{{ emptyText() ?? labels.logEmpty }}</p>
      }
    </div>
    @if (!following()) {
      <button lcButton type="button" fillMode="outline" themeColor="neutral" class="lc-log-view__resume" (click)="resume()">
        <lc-icon name="arrow-down" />{{ resumeLabel() ?? labels.logResume }}
      </button>
    }
  `,
  styleUrl: './log-view.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-log-view',
    '[class.lc-log-view--wrap]': 'wrap()',
  },
})
export class LcLogViewComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scroller = viewChild.required<ElementRef<HTMLElement>>('scroller');
  private resetTimer: ReturnType<typeof setTimeout> | undefined;
  private lastScrollTop = 0;

  readonly lines = input<readonly LcLogLine[]>([]);
  /** Nom de la zone (obligatoire : zone défilable et focalisable). */
  readonly ariaLabel = input.required<string>();
  /** Nombre maximal de lignes dans le DOM ; les plus anciennes sont retirées. */
  readonly maxLines = input(DEFAULT_MAX_LINES);
  /** Hauteur CSS de la zone de lignes. */
  readonly height = input('16rem');
  /** Retour à la ligne ; sinon défilement horizontal. */
  readonly wrap = input(true, { transform: booleanAttribute });
  readonly copyable = input(true, { transform: booleanAttribute });
  /** Annonce des nouvelles lignes par les lecteurs d'écran : `off` (défaut, aucune annonce) ou `polite`. */
  readonly live = input<'off' | 'polite'>('off');
  readonly emptyText = input<string>();
  readonly copyLabel = input<string>();
  readonly resumeLabel = input<string>();
  readonly truncatedLabel = input<(count: number) => string>();
  /** Suivi automatique de la fin ; passe à faux quand l'utilisateur défile vers le haut. */
  readonly following = model(true);
  /** Texte copié (les lignes présentes, avec repère de niveau et préfixe). */
  readonly copied = output<string>();

  protected readonly copyState = signal<CopyState>('idle');
  private readonly limit = computed(() => Math.max(1, Math.floor(this.maxLines()) || DEFAULT_MAX_LINES));
  protected readonly visibleLines = computed(() => this.lines().slice(-this.limit()));
  protected readonly hiddenCount = computed(() => this.lines().length - this.visibleLines().length);
  protected readonly statusText = computed(() => {
    switch (this.copyState()) {
      case 'copied': return this.labels.copied;
      case 'failed': return this.labels.copyFailed;
      default: return '';
    }
  });

  constructor() {
    afterRenderEffect(() => {
      this.visibleLines();
      if (this.following()) this.scrollToEnd();
    });
    this.destroyRef.onDestroy(() => clearTimeout(this.resetTimer));
  }

  protected levelLabel(kind: LcLogLineKind | undefined): string {
    if (kind === 'err') return this.labels.logLevelError;
    return kind === 'info' ? this.labels.logLevelInfo : '';
  }

  protected resume(): void {
    this.following.set(true);
    this.scroller().nativeElement.focus({ preventScroll: true });
  }

  protected onScroll(): void {
    const element = this.scroller().nativeElement;
    const atEnd = element.scrollHeight - element.scrollTop - element.clientHeight <= BOTTOM_TOLERANCE;
    if (atEnd) {
      this.following.set(true);
    } else if (element.scrollTop < this.lastScrollTop) {
      this.following.set(false);
    }
    this.lastScrollTop = element.scrollTop;
  }

  protected async copy(): Promise<void> {
    const text = this.visibleLines()
      .map((line) => [this.levelLabel(line.kind), line.prefix, line.text].filter(Boolean).join(' '))
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      this.copyState.set('copied');
      this.copied.emit(text);
    } catch {
      // Presse-papiers indisponible ou refusé : l'échec est annoncé (rien n'a été copié).
      this.copyState.set('failed');
    }
    clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => this.copyState.set('idle'), COPY_FEEDBACK_MS);
  }

  private scrollToEnd(): void {
    const element = this.scroller().nativeElement;
    element.scrollTop = element.scrollHeight;
    this.lastScrollTop = element.scrollTop;
  }
}
