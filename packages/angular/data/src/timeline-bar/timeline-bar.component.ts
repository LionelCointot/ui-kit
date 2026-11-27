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
import { LC_LABELS, LcFillDirective, LcSkeletonComponent } from '@lionelcointot/ui-angular';

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

/** Période d'une voie, dans l'unité de l'axe (de 0 à `axisEnd`). `to` inférieur ou égal à `from`, ou valeur non finie : ignorée. */
export interface LcTimelineSpan {
  readonly from: number;
  readonly to: number;
}

/** Voie d'une frise à plusieurs voies : une ligne sur l'axe commun, avec sa légende (repère de forme, nom, texte). */
export interface LcTimelineLane {
  readonly id: string;
  readonly label: string;
  /** Texte sous le nom (ex. « devant de 0 à 5 ans »), fourni par l'application ; absent : rien. */
  readonly caption?: string;
  /** Emplacement de couleur des graphiques ; le motif en découle (impair plein, pair rayé). */
  readonly colorSlot: LcTimelineColorSlot;
  /** Repère de forme de la légende (défaut : rond). */
  readonly marker?: LcTimelineMarker;
  /** Périodes colorées de la voie ; vide : voie sans partie colorée. */
  readonly spans: readonly LcTimelineSpan[];
}

/** Repère transversal : trait vertical qui traverse toutes les voies à `at`, étiqueté sous la dernière. */
export interface LcTimelineReference {
  readonly at: number;
  readonly label: string;
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

interface DrawnLane {
  readonly lane: LcTimelineLane;
  readonly swatchClass: string;
  /** Position et largeur de chaque période, en part de l'axe (0 à 1). */
  readonly spans: readonly { readonly start: number; readonly size: number }[];
}

interface DrawnReference {
  readonly label: string;
  /** Part de l'axe (0 à 1). */
  readonly position: number;
}

const swatchClassOf = (slot: LcTimelineColorSlot): string =>
  `lc-timeline-bar__swatch lc-timeline-bar__swatch--${lcTimelinePattern(slot)} lc-timeline-bar__swatch--slot-${slot}`;

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
 * `lanes` (frise à plusieurs voies, ex. Louer / Acheter) remplace `segments` : voies alignées sur un même axe, repère transversal (`reference`), légende par voie,
 * formes et motifs (jamais la couleur seule). Ne pas confondre avec `lc-segmented-bar` (graphiques : part d'un tout).
 */
@Component({
  selector: 'lc-timeline-bar',
  imports: [LcFillDirective, LcSkeletonComponent],
  template: `
    @if (loading()) {
      <lc-skeleton shape="rect" height="var(--lc-sys-space-8)" />
    } @else if (lanes().length === 0 && drawn().length === 0) {
      <p class="lc-timeline-bar__empty">{{ emptyMessage() ?? labels.noData }}</p>
    } @else {
      @if (lanes().length > 0) {
        <div class="lc-timeline-bar__lanes" role="img" [attr.aria-label]="description()">
          @for (item of drawnLanes(); track item.lane.id; let lane = $index) {
            <div class="lc-timeline-bar__lane">
              <div class="lc-timeline-bar__lane-head">
                <span class="lc-timeline-bar__marker" [class]="'lc-timeline-bar__marker lc-timeline-bar__marker--' + (item.lane.marker ?? 'circle') + ' ' + item.swatchClass" aria-hidden="true"></span>
                <span class="lc-timeline-bar__lane-name">
                  {{ item.lane.label }}
                  @if (item.lane.caption) {
                    <span class="lc-timeline-bar__lane-caption">{{ item.lane.caption }}</span>
                  }
                </span>
              </div>
              <div class="lc-timeline-bar__lane-track">
                @for (span of item.spans; track $index) {
                  <span class="lc-timeline-bar__span" [class]="'lc-timeline-bar__span ' + item.swatchClass" [style.inset-inline-start.%]="span.start * 100" [style.inline-size.%]="span.size * 100" [lcFill]="1" [lcFillIndex]="lane"></span>
                }
                @if (referenceMark(); as mark) {
                  <span class="lc-timeline-bar__reference-line" [style.inset-inline-start.%]="mark.position * 100"></span>
                }
              </div>
            </div>
          }
          @if (referenceMark(); as mark) {
            <div class="lc-timeline-bar__reference">
              <span class="lc-timeline-bar__reference-anchor" [class.lc-timeline-bar__reference-anchor--start]="mark.position === 0" [class.lc-timeline-bar__reference-anchor--end]="mark.position === 1" [style.inset-inline-start.%]="mark.position * 100">
                <span class="lc-timeline-bar__reference-label">{{ mark.label }}</span>
              </span>
            </div>
          }
        </div>
      } @else {
        <div class="lc-timeline-bar__track" role="img" [attr.aria-label]="description()">
          @for (item of drawn(); track item.segment.id; let rank = $index) {
            <span class="lc-timeline-bar__segment" [class]="'lc-timeline-bar__segment ' + item.swatchClass" [style.flex-grow]="item.segment.weight" [lcFill]="1" [lcFillIndex]="rank"></span>
          }
        </div>
      }
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
      @if (axisLabel()) {
        <p class="lc-timeline-bar__axis-label">{{ axisLabel() }}</p>
      }
      @if (lanes().length === 0 && legend().length > 0) {
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
    '[class.lc-timeline-bar--lanes]': 'lanes().length > 0',
    '[attr.aria-label]': 'label()',
    '[attr.aria-busy]': "loading() ? 'true' : null",
  },
})
export class LcTimelineBarComponent {
  protected readonly labels = inject(LC_LABELS);

  /** Segments contigus d'une seule barre. Ignoré quand `lanes` est renseigné. */
  readonly segments = input<readonly LcTimelineSegment[]>([]);
  /**
   * Voies alignées sur un même axe, de 0 à `axisEnd` : une ligne par voie avec sa légende (repère de forme, nom, `caption`) et ses périodes colorées.
   * Remplace `segments` quand elle n'est pas vide. L'hôte doit être un bloc de pleine largeur : dès 700 px, le nom de la voie est à gauche de sa piste,
   * en dessous il la surmonte. `description` est le texte équivalent de toute la frise (les voies, `reference` et les graduations sont lues à travers lui).
   */
  readonly lanes = input<readonly LcTimelineLane[]>([]);
  /** Fin de l'axe des voies, dans l'unité des périodes (défaut : la plus grande fin de période). */
  readonly axisEnd = input<number>();
  /** Repère transversal des voies (ex. un point d'équilibre) : trait de 2 px sur chaque voie, étiqueté sous la dernière. Hors de l'axe : ignoré. */
  readonly reference = input<LcTimelineReference>();
  /** Légende de l'axe des voies, sous les graduations (ex. « Années depuis l'achat »). */
  readonly axisLabel = input<string>();
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
      swatchClass: swatchClassOf(segment.colorSlot),
    }));
  });

  /** Longueur de l'axe : `axisEnd` ou la plus grande fin de période en mode voies, sinon la somme des poids dessinés. */
  private readonly axisTotal = computed(() => {
    if (this.lanes().length === 0) return this.drawn().reduce((sum, item) => sum + item.segment.weight, 0);
    const end = this.axisEnd();
    if (end !== undefined && Number.isFinite(end)) return Math.max(end, 0);
    const ends = this.lanes().flatMap((lane) => lane.spans.map((span) => span.to)).filter(Number.isFinite);
    return Math.max(0, ...ends);
  });

  protected readonly drawnLanes = computed<readonly DrawnLane[]>(() => {
    const total = this.axisTotal();
    return this.lanes().map((lane) => ({
      lane,
      swatchClass: swatchClassOf(lane.colorSlot),
      spans: lane.spans
        .filter((span) => Number.isFinite(span.from) && Number.isFinite(span.to))
        .map((span) => ({ from: Math.max(span.from, 0), to: Math.min(span.to, total) }))
        .filter((span) => span.to > span.from)
        .map((span) => ({ start: span.from / total, size: (span.to - span.from) / total })),
    }));
  });

  protected readonly referenceMark = computed<DrawnReference | null>(() => {
    const mark = this.reference();
    const total = this.axisTotal();
    if (!mark || !Number.isFinite(mark.at) || mark.at < 0 || mark.at > total || total <= 0) return null;
    return { label: mark.label, position: mark.at / total };
  });

  protected readonly tickMarks = computed<readonly DrawnTick[]>(() => {
    const total = this.axisTotal();
    return this.ticks()
      .filter((tick) => total > 0 && Number.isFinite(tick.at) && tick.at >= 0 && tick.at <= total)
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
