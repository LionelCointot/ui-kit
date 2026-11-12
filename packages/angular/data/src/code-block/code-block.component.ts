import { ChangeDetectionStrategy, Component, DestroyRef, booleanAttribute, computed, inject, input, signal } from '@angular/core';
import { LC_LABELS, LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';

/** Longueur maximale affichée (en caractères) ; le texte intégral reste copiable. */
export const LC_CODE_BLOCK_MAX_CHARS = 100_000;
const COPY_FEEDBACK_MS = 2000;
const HIGH_SURROGATE_START = 0xd800;
const HIGH_SURROGATE_END = 0xdbff;

type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Texte brut multiligne (journal, trace, configuration), jamais interprété comme du HTML : le texte est inséré
 * comme texte. Région défilable au clavier (`role="region"`, `tabindex="0"`), numéros de ligne non sélectionnables,
 * bouton de copie (le texte intégral est copié, même tronqué à l'affichage). Pas de coloration syntaxique.
 */
@Component({
  selector: 'lc-code-block',
  imports: [LcButtonComponent, LcIconComponent],
  template: `
    <div class="lc-code-block__scroll" role="region" tabindex="0" [attr.aria-label]="ariaLabel()"
      [style.max-block-size]="maxHeight()">
      @if (lineNumbers()) {
        <pre class="lc-code-block__pre"><code>@for (line of lines(); track $index) {<span class="lc-code-block__line">{{ line }}</span>}</code></pre>
      } @else {
        <pre class="lc-code-block__pre"><code>{{ shownText() }}</code></pre>
      }
      @if (isTruncated()) {
        <p class="lc-code-block__notice">{{ labels.codeTruncated(maxChars) }}</p>
      }
    </div>
    @if (copyable()) {
      <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" class="lc-code-block__copy"
        [attr.aria-label]="labels.copy" (click)="copy()">
        <lc-icon [name]="copyState() === 'copied' ? 'check' : 'copy'" />
      </button>
    }
    <span class="lc-code-block__status" role="status">{{ statusText() }}</span>
  `,
  styleUrl: './code-block.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-code-block',
    '[class.lc-code-block--wrap]': 'wrap()',
    '[class.lc-code-block--line-numbers]': 'lineNumbers()',
    '[class.lc-code-block--copyable]': 'copyable()',
  },
})
export class LcCodeBlockComponent {
  protected readonly labels = inject(LC_LABELS);
  private readonly destroyRef = inject(DestroyRef);
  private resetTimer: ReturnType<typeof setTimeout> | undefined;

  /** Texte affiché, toujours inséré comme texte. */
  readonly code = input.required<string>();
  /** Nom de la région (obligatoire : région défilable). */
  readonly ariaLabel = input.required<string>();
  /** Retour à la ligne ; sinon défilement horizontal. */
  readonly wrap = input(false, { transform: booleanAttribute });
  /** Hauteur maximale CSS, au-delà : défilement vertical. */
  readonly maxHeight = input('20rem');
  readonly lineNumbers = input(false, { transform: booleanAttribute });
  readonly copyable = input(true, { transform: booleanAttribute });

  protected readonly maxChars = LC_CODE_BLOCK_MAX_CHARS;
  protected readonly copyState = signal<CopyState>('idle');
  protected readonly isTruncated = computed(() => this.code().length > LC_CODE_BLOCK_MAX_CHARS);
  protected readonly shownText = computed(() => truncate(this.code()));
  protected readonly lines = computed(() => this.shownText().split(/\r\n|\r|\n/));
  protected readonly statusText = computed(() => {
    switch (this.copyState()) {
      case 'copied': return this.labels.copied;
      case 'failed': return this.labels.copyFailed;
      default: return '';
    }
  });

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.resetTimer));
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.code());
      this.copyState.set('copied');
    } catch {
      // Presse-papiers indisponible ou refusé : l'échec est annoncé (rien n'a été copié).
      this.copyState.set('failed');
    }
    clearTimeout(this.resetTimer);
    this.resetTimer = setTimeout(() => this.copyState.set('idle'), COPY_FEEDBACK_MS);
  }
}

/** Coupe à la limite sans scinder une paire de substitution. */
function truncate(text: string): string {
  if (text.length <= LC_CODE_BLOCK_MAX_CHARS) return text;
  const lastCode = text.charCodeAt(LC_CODE_BLOCK_MAX_CHARS - 1);
  const end = lastCode >= HIGH_SURROGATE_START && lastCode <= HIGH_SURROGATE_END ? LC_CODE_BLOCK_MAX_CHARS - 1 : LC_CODE_BLOCK_MAX_CHARS;
  return text.slice(0, end);
}
