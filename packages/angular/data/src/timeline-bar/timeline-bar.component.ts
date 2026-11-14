import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  computed,
  inject,
  input,
  signal,
  viewChildren,
} from '@angular/core';
import { LC_LABELS, LcSkeletonComponent } from '@lionelcointot/ui-angular';

export type LcTimelineColorSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 'neutral';
export type LcTimelineMarker = 'circle' | 'square' | 'diamond';
export type LcTimelinePattern = 'solid' | 'striped' | 'dotted';

export interface LcTimelineSegment {
  readonly id: string;
  /** Durée du segment (toute unité commune) : la largeur est proportionnelle. Zéro, négatif ou non fini : segment non dessiné. */
  readonly weight: number;
  readonly label: string;
  /** Emplacement de couleur des graphiques ; le motif en découle. Un même emplacement peut revenir plusieurs fois. */
  readonly colorSlot: LcTimelineColorSlot;
  /** Repère de forme de la légende (défaut : rond). */
  readonly marker?: LcTimelineMarker;
}

export interface LcTimelineTick {
  /** Position sur la piste, dans la même unité que les poids (de 0 au total des poids dessinés). Hors de cet intervalle ou non finie : graduation ignorée. */
  readonly at: number;
  readonly label: string;
}

interface DrawnTick {
  readonly label: string;
  /** Part de la piste (0 à 1) où se trouve la graduation. */
  readonly position: number;
}

interface DrawnSegment {
  readonly segment: LcTimelineSegment;
  readonly share: number;
  readonly swatchClass: string;
}

/** Motif d'un emplacement : impairs pleins, pairs rayés, `neutral` pointillé (le codage non coloré des graphiques). */
export function lcTimelinePattern(slot: LcTimelineColorSlot): LcTimelinePattern {
  if (slot === 'neutral') return 'dotted';
  return slot % 2 === 1 ? 'solid' : 'striped';
}

/**
 * Barre de segments contigus de largeur proportionnelle à une durée (HTML et CSS, sans ECharts).
 * Chaque segment a une couleur de rôle et un motif ; la légende sous la barre porte un repère de forme et le libellé
 * (masquée sous `minLabelShare`). La barre est une image (`role="img"`) dont `description` est le texte équivalent complet.
 * `ticks` (facultatif) dessine sous la piste des graduations courtes avec leur libellé, purement décoratives (`aria-hidden`) :
 * le texte équivalent reste `description`. Un libellé qui chevaucherait le précédent est masqué visuellement (la graduation reste).
 * Ne pas confondre avec `lc-segmented-bar` (graphiques : part d'un tout).
 */
@Component({
  selector: 'lc-timeline-bar',
  imports: [LcSkeletonComponent],
  template: `
    @if (loading()) {
      <lc-skeleton shape="rect" height="var(--lc-sys-space-8)" />
    } @else if (drawn().length === 0) {
      <p class="lc-timeline-bar__empty">{{ emptyMessage() ?? labels.noData }}</p>
    } @else {
      <div class="lc-timeline-bar__track" role="img" [attr.aria-label]="description()">
        @for (item of drawn(); track item.segment.id) {
          <span class="lc-timeline-bar__segment" [class]="'lc-timeline-bar__segment ' + item.swatchClass" [style.flex-grow]="item.segment.weight"></span>
        }
      </div>
      @if (tickMarks().length > 0) {
        <div class="lc-timeline-bar__ticks" aria-hidden="true">
          @for (tick of tickMarks(); track $index) {
            <span
              class="lc-timeline-bar__tick"
              [class.lc-timeline-bar__tick--start]="tick.position === 0"
              [class.lc-timeline-bar__tick--end]="tick.position === 1"
              [style.inset-inline-start.%]="tick.position * 100"
            >
              <span class="lc-timeline-bar__tick-mark"></span>
              <span #tickLabel class="lc-timeline-bar__tick-label" [class.lc-timeline-bar__tick-label--hidden]="hiddenTicks().has($index)">{{ tick.label }}</span>
            </span>
          }
        </div>
      }
      @if (startLabel() || endLabel()) {
        <div class="lc-timeline-bar__bounds">
          <span>{{ startLabel() }}</span>
          <span>{{ endLabel() }}</span>
        </div>
      }
      @if (legend().length > 0) {
        <ul class="lc-timeline-bar__legend">
          @for (item of legend(); track item.segment.id) {
            <li class="lc-timeline-bar__entry">
              <span class="lc-timeline-bar__marker" [class]="'lc-timeline-bar__marker lc-timeline-bar__marker--' + (item.segment.marker ?? 'circle') + ' ' + item.swatchClass" aria-hidden="true"></span>
              {{ item.segment.label }}
            </li>
          }
        </ul>
      }
    }
  `,
  styleUrl: './timeline-bar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'lc-timeline-bar',
    role: 'group',
    '[class.lc-timeline-bar--stale]': 'stale()',
    '[attr.aria-label]': 'label()',
    '[attr.aria-busy]': "loading() ? 'true' : null",
  },
})
export class LcTimelineBarComponent {
  protected readonly labels = inject(LC_LABELS);

  readonly segments = input.required<readonly LcTimelineSegment[]>();
  /** Nom accessible de la barre. */
  readonly label = input.required<string>();
  /** Texte équivalent complet, lu à la place de la barre. */
  readonly description = input.required<string>();
  /** Borne de début, sous l'extrémité gauche. */
  readonly startLabel = input<string>();
  /** Borne de fin, sous l'extrémité droite. */
  readonly endLabel = input<string>();
  /** Part minimale (0 à 1) d'un segment pour figurer dans la légende visible. */
  readonly minLabelShare = input(0.06);
  /** Message quand aucun segment n'est dessiné (défaut : `LC_LABELS.noData`). */
  readonly emptyMessage = input<string>();
  /** Résultat périmé : barre et repères atténués à 60 % (les textes gardent leur contraste). */
  readonly stale = input(false, { transform: booleanAttribute });
  readonly loading = input(false, { transform: booleanAttribute });
  /** Graduations sous la piste (`at` dans l'unité des poids, de 0 au total) ; décoratives, `description` reste le texte équivalent. */
  readonly ticks = input<readonly LcTimelineTick[]>([]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly tickLabels = viewChildren<ElementRef<HTMLElement>>('tickLabel');
  private readonly hostWidth = signal(0);
  /** Rangs (dans `tickMarks`) des libellés masqués parce qu'ils chevaucheraient un libellé précédent. */
  protected readonly hiddenTicks = signal<ReadonlySet<number>>(new Set());

  protected readonly drawn = computed<readonly DrawnSegment[]>(() => {
    const visible = this.segments().filter((segment) => Number.isFinite(segment.weight) && segment.weight > 0);
    const total = visible.reduce((sum, segment) => sum + segment.weight, 0);
    return visible.map((segment) => ({
      segment,
      share: segment.weight / total,
      swatchClass: `lc-timeline-bar__swatch lc-timeline-bar__swatch--${lcTimelinePattern(segment.colorSlot)} lc-timeline-bar__swatch--slot-${segment.colorSlot}`,
    }));
  });

  protected readonly tickMarks = computed<readonly DrawnTick[]>(() => {
    const total = this.drawn().reduce((sum, item) => sum + item.segment.weight, 0);
    return this.ticks()
      .filter((tick) => Number.isFinite(tick.at) && tick.at >= 0 && tick.at <= total)
      .map((tick) => ({ label: tick.label, position: tick.at / total }))
      .sort((a, b) => a.position - b.position);
  });

  constructor() {
    // Mesure : la largeur de l'hôte change la place disponible, donc les chevauchements possibles.
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver((entries) => this.hostWidth.set(entries[0]?.contentRect.width ?? 0));
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
    afterRenderEffect(() => {
      this.hostWidth();
      this.tickMarks();
      const kept: DOMRect[] = [];
      const hidden = new Set<number>();
      this.tickLabels().forEach((label, index) => {
        const rect = label.nativeElement.getBoundingClientRect();
        if (kept.some((other) => rect.left < other.right && other.left < rect.right)) hidden.add(index);
        else kept.push(rect);
      });
      const current = this.hiddenTicks();
      if (hidden.size !== current.size || [...hidden].some((index) => !current.has(index))) this.hiddenTicks.set(hidden);
    });
  }

  protected readonly legend = computed(() => this.drawn().filter((item) => item.share >= this.minLabelShare()));
}
