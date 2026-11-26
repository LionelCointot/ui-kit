// SPIKE jetable (branche spike/motion-flip) : ne fait pas partie du contrat public.
import { afterRenderEffect, Directive, effect, ElementRef, inject, input, type OnChanges, untracked } from '@angular/core';
import { lcPrefersReducedMotion } from '../../core/reduced-motion';

/** Où l'instantané « avant » est pris : `effect` (effect lisant l'entrée), `onchanges` (ngOnChanges), `transform` (transform de l'entrée), `off` (rien). */
export type FlipSnapshotMode = 'effect' | 'onchanges' | 'transform' | 'off';

interface Point {
  x: number;
  y: number;
}

declare global {
  interface Window {
    __flip?: { log: Record<string, unknown>[] };
  }
}

@Directive({ selector: '[lcFlip]' })
export class LcFlipSpikeDirective implements OnChanges {
  readonly items = input.required<readonly unknown[]>({ alias: 'lcFlip', transform: (items: readonly unknown[]) => { this.snapshotFrom('transform'); return items; } });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly mode = input<FlipSnapshotMode>('onchanges', { alias: 'lcFlipMode' });
  readonly ignoreReduced = input(false, { alias: 'lcFlipIgnoreReduced' });
  private before: Map<Element, Point> | undefined;
  private running: Animation[] = [];

  constructor() {
    effect(() => {
      this.items();
      untracked(() => this.snapshotFrom('effect'));
    });
    // Après le rendu : annule le FLIP en cours, lit toutes les nouvelles positions d'un trait, puis écrit toutes les animations.
    afterRenderEffect(() => {
      this.items();
      const before = this.before;
      this.before = undefined;
      if (!before) return;
      const t0 = performance.now();
      const move = this.timing();
      this.running.forEach((animation) => animation.cancel());
      this.running = [];
      const after = this.positions();
      const t1 = performance.now();
      if (move) {
        const moves: [Element, Point][] = [];
        for (const [element, to] of after) {
          const from = before.get(element);
          if (from && (Math.abs(from.x - to.x) >= 0.5 || Math.abs(from.y - to.y) >= 0.5)) moves.push([element, { x: from.x - to.x, y: from.y - to.y }]);
        }
        for (const [element, delta] of moves) this.running.push(element.animate({ transform: [`translate(${delta.x}px, ${delta.y}px)`, 'none'] }, move));
        this.log('play', { readMs: t1 - t0, writeMs: performance.now() - t1, moved: moves.length, total: after.size });
      } else this.log('play', { readMs: t1 - t0, moved: 0, total: after.size, skipped: 'reduced-motion' });
    });
  }

  ngOnChanges(): void {
    this.snapshotFrom('onchanges');
  }

  private snapshotFrom(source: FlipSnapshotMode): void {
    if (source !== this.mode() || this.before) return;
    const t0 = performance.now();
    this.before = this.positions();
    this.log('snapshot', { source, ms: performance.now() - t0, keys: this.keys(), tops: [...this.before.values()].map((p) => p.y) });
  }

  /** Positions visuelles (animations en cours comprises) de tous les enfants directs, lues sans aucune écriture intercalée. */
  private positions(): Map<Element, Point> {
    return new Map([...this.host.children].filter((child) => !child.hasAttribute('data-leaving')).map((child) => {
      const { left, top } = child.getBoundingClientRect();
      return [child, { x: left, y: top }];
    }));
  }

  private keys(): string[] {
    return [...this.host.children].map((child) => (child as HTMLElement).dataset['k'] ?? '');
  }

  private timing(): KeyframeAnimationOptions | null {
    if (typeof this.host.animate !== 'function' || (!this.ignoreReduced() && lcPrefersReducedMotion())) return null;
    const style = getComputedStyle(this.host);
    const raw = style.getPropertyValue('--lc-list-move-duration').trim();
    const ms = parseFloat(raw) * (raw.endsWith('ms') ? 1 : 1000);
    return ms > 0 ? { duration: ms, easing: style.getPropertyValue('--lc-list-move-easing').trim() || undefined } : null;
  }

  private log(phase: string, data: Record<string, unknown>): void {
    (window.__flip ??= { log: [] }).log.push({ phase, mode: this.mode(), t: performance.now(), keysNow: this.keys().join(','), ...data });
  }
}
