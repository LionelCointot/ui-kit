import { FlexibleConnectedPositionStrategy, Overlay } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcTooltipDirective } from './tooltip.directive';

type Position = 'above' | 'below' | 'start' | 'end';

@Component({
  imports: [LcTooltipDirective],
  template: '<button id="b" lcTooltip="Infos" [lcTooltipPosition]="position()">Cible</button>',
})
class PositionHostComponent {
  readonly position = signal<Position>('above');
}

/** Direction d'une position CDK, lue depuis ses points d'ancrage (indépendant du nom interne). */
function directionOf(p: { originX: string; originY: string }): Position {
  if (p.originY === 'top') return 'above';
  if (p.originY === 'bottom') return 'below';
  return p.originX === 'start' ? 'start' : 'end';
}

// Valeurs attendues : spec « Livré » D5 (ordre de repli et écart de 4 px), pas lues dans le code.
const FALLBACK: Record<Position, Position[]> = {
  above: ['above', 'below', 'end', 'start'],
  below: ['below', 'above', 'end', 'start'],
  start: ['start', 'end', 'above', 'below'],
  end: ['end', 'start', 'above', 'below'],
};

describe('LcTooltipDirective : positions de repli (D5)', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  /** Affiche l'info-bulle et rend la stratégie de position passée au CDK. */
  function showTooltip(position: Position) {
    vi.useFakeTimers();
    const create = vi.spyOn(TestBed.inject(Overlay), 'create');
    const fixture = TestBed.createComponent(PositionHostComponent);
    fixture.componentInstance.position.set(position);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#b')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(500);
    const strategy = create.mock.calls[0][0]!.positionStrategy as FlexibleConnectedPositionStrategy;
    return { fixture, button, strategy };
  }

  describe('configuration passée au CDK (la géométrie réelle n\'existe pas dans jsdom)', () => {
    it.each(Object.keys(FALLBACK) as Position[])('CA-D5 : « %s » essaie la position demandée, son opposée, puis les deux autres', (requested) => {
      const { strategy } = showTooltip(requested);
      expect(strategy.positions.map(directionOf)).toEqual(FALLBACK[requested]);
    });

    it('CA-D5 : chaque position porte un écart de 4 px dans la direction qui éloigne l\'info-bulle de son élément', () => {
      const { strategy } = showTooltip('above');
      const offsets = Object.fromEntries(strategy.positions.map((p) => [directionOf(p), [p.offsetX ?? 0, p.offsetY ?? 0]]));
      expect(offsets).toEqual({ above: [0, -4], below: [0, 4], start: [-4, 0], end: [4, 0] });
    });

    it('CA-D5 : la première position est exactement celle d\'avant (ancrages et recouvrement inchangés)', () => {
      const anchors = {
        above: ['center', 'top', 'center', 'bottom'],
        below: ['center', 'bottom', 'center', 'top'],
        start: ['start', 'center', 'end', 'center'],
        end: ['end', 'center', 'start', 'center'],
      } as const;
      for (const requested of Object.keys(anchors) as Position[]) {
        const { strategy } = showTooltip(requested);
        const [first] = strategy.positions;
        expect([first.originX, first.originY, first.overlayX, first.overlayY]).toEqual(anchors[requested]);
        TestBed.resetTestingModule();
        document.querySelector('.cdk-overlay-container')?.replaceChildren();
      }
    });
  });

  describe('placement réel (jsdom : rectangles et fenêtre simulés)', () => {
    const VIEWPORT = { width: 1000, height: 800 };
    const TIP = { width: 100, height: 30 };

    function rect(left: number, top: number, width: number, height: number): DOMRect {
      return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) } as DOMRect;
    }

    /** Pose le bouton en (left, top), 32 x 32 ; l'info-bulle (panneau CDK) mesure TIP ; la fenêtre mesure VIEWPORT. */
    function place(left: number, top: number, size = { width: 32, height: 32 }, tip = TIP) {
      vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(VIEWPORT.width);
      vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(VIEWPORT.height);
      vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(VIEWPORT.width);
      vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(VIEWPORT.height);
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
        if (this.id === 'b') return rect(left, top, size.width, size.height);
        if (this.classList.contains('cdk-overlay-pane') || this.classList.contains('cdk-overlay-connected-position-bounding-box')) {
          return rect(0, 0, tip.width, tip.height);
        }
        return rect(0, 0, 0, 0);
      });
    }

    /** Affiche et rend la direction retenue par le CDK. */
    async function chosen(position: Position) {
      const { fixture, strategy } = showTooltip(position);
      const changes: Position[] = [];
      strategy.positionChanges.subscribe((change) => changes.push(directionOf(change.connectionPair)));
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(50);
      fixture.detectChanges();
      return changes.at(-1);
    }

    it('CA-D5 : quand la place suffit, la position demandée est retenue (comportement d\'avant)', async () => {
      for (const position of Object.keys(FALLBACK) as Position[]) {
        place(450, 400);
        expect(await chosen(position)).toBe(position);
        TestBed.resetTestingModule();
        vi.restoreAllMocks();
        document.querySelector('.cdk-overlay-container')?.replaceChildren();
      }
    });

    it('CA-D5 : élément collé en haut de la fenêtre, position « above » : l\'info-bulle passe en dessous', async () => {
      place(450, 0);
      expect(await chosen('above')).toBe('below');
    });

    it('CA-D5 : élément collé en bas de la fenêtre, position « below » : l\'info-bulle passe au-dessus', async () => {
      place(450, VIEWPORT.height - 32);
      expect(await chosen('below')).toBe('above');
    });

    it('CA-D5 : élément collé à gauche, position « start » : l\'info-bulle passe à droite', async () => {
      place(0, 400);
      expect(await chosen('start')).toBe('end');
    });

    it('CA-D5 : élément collé à droite, position « end » : l\'info-bulle passe à gauche', async () => {
      place(VIEWPORT.width - 32, 400);
      expect(await chosen('end')).toBe('start');
    });

    it('CA-D5 : ni dessus ni dessous ne tiennent (élément haut comme la fenêtre) : repli sur un côté', async () => {
      place(450, 0, { width: 32, height: VIEWPORT.height });
      expect(await chosen('above')).toBe('end');
    });

    it('CA-D5 : sans place d\'aucun côté, l\'info-bulle est poussée dans la fenêtre', async () => {
      const tip = { width: 900, height: 30 };
      place(450, 0, { width: 32, height: VIEWPORT.height }, tip);
      await chosen('above');
      const pane = document.querySelector<HTMLElement>('.cdk-overlay-pane')!;
      const left = parseFloat(pane.style.left);
      const top = parseFloat(pane.style.top);
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + tip.width).toBeLessThanOrEqual(VIEWPORT.width);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top + tip.height).toBeLessThanOrEqual(VIEWPORT.height);
    });
  });
});
