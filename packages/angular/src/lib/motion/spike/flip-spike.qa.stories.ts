// SPIKE jetable (branche spike/motion-flip) : harnais de mesure pour tools/qa/flip-spike.mjs.
import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcFlipSpikeDirective, type FlipSnapshotMode } from './flip-spike.directive';

interface Item {
  id: number;
  label: string;
}

const make = (count: number): Item[] => Array.from({ length: count }, (_, i) => ({ id: i + 1, label: `Item ${i + 1}` }));

@Component({
  selector: 'lc-flip-spike',
  imports: [LcFlipSpikeDirective],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .spike-row { block-size: 36px; box-sizing: border-box; border: 1px solid #888; background: #fff; color: #000; }
    /* Reveal v2 : keyframes + propriétés individuelles (translate, scale, opacity) : ne touche pas à transform. */
    @keyframes spike-reveal { from { opacity: 0; translate: 0 -24px; scale: 0.9; } }
    [data-reveal='v2'] > .spike-row { animation: spike-reveal 800ms linear backwards; }
    /* Reveal actuel : transition permanente sur opacity et transform + @starting-style. */
    [data-reveal='legacy'] > .spike-row { transition: opacity 800ms linear, transform 800ms linear; }
    @starting-style { [data-reveal='legacy'] > .spike-row { opacity: 0; transform: translateY(-24px); } }
  `,
  template: `
    <button id="reverse" (click)="reverse()">reverse</button>
    <button id="filter" (click)="filterOdd()">filter</button>
    <button id="restore" (click)="restore()">restore</button>
    <button id="prepend" (click)="prepend()">prepend</button>
    <button id="prepend2" (click)="prepend(); prepend()">prepend x2</button>
    <button id="shuffle" (click)="shuffle()">shuffle</button>
    <button id="all" (click)="mutateAll()">mutate+filter+add</button>
    <div id="list" [lcFlip]="items()" [lcFlipMode]="mode()" [lcFlipIgnoreReduced]="ignoreReduced()" [attr.data-reveal]="reveal()" style="width: 300px">
      @for (item of items(); track item.id) {
        <div class="spike-row" [attr.data-k]="item.id">{{ item.label }}</div>
      }
    </div>
  `,
})
class FlipSpikeComponent {
  readonly count = signal(8);
  readonly mode = signal<FlipSnapshotMode>('onchanges');
  readonly reveal = signal<'v2' | 'legacy' | 'none'>('none');
  readonly ignoreReduced = signal(false);
  protected readonly items = signal<Item[]>([]);
  private next = 1000;

  constructor() {
    // Configuration lue dans l'URL (?n=8&mode=effect&reveal=v2&ignoreReduced=1), avant la première liste.
    const query = new URLSearchParams(location.search);
    this.count.set(Number(query.get('n') ?? 8));
    this.mode.set((query.get('mode') ?? 'onchanges') as FlipSnapshotMode);
    this.reveal.set((query.get('reveal') ?? 'none') as 'v2' | 'legacy' | 'none');
    this.ignoreReduced.set(query.get('ignoreReduced') === '1');
    this.items.set(make(this.count()));
  }

  protected reverse(): void {
    this.items.update((items) => [...items].reverse());
  }

  protected filterOdd(): void {
    this.items.update((items) => items.filter((item) => item.id % 2 === 1));
  }

  protected restore(): void {
    this.items.set(make(this.count()));
  }

  protected prepend(): void {
    const id = this.next++;
    this.items.update((items) => [{ id, label: `New ${id}` }, ...items]);
  }

  protected shuffle(): void {
    // Permutation déterministe (pas de hasard : mesures reproductibles).
    this.items.update((items) => items.map((_, i) => items[(i * 7 + 3) % items.length]));
  }

  protected mutateAll(): void {
    const id = this.next++;
    this.items.update((items) => [{ id, label: `New ${id}` }, ...[...items].reverse().filter((item) => item.id % 3 !== 0)]);
  }
}

const meta: Meta = {
  title: 'QA/Motion/Flip spike',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [FlipSpikeComponent] })],
  render: () => ({ template: '<lc-flip-spike />' }),
};
export default meta;

export const Spike: StoryObj = {};
