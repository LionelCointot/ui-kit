/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

    it('CA-D5 : aucune position ne porte d\'offsetX ni d\'offsetY (le CDK les applique après la poussée, l\'info-bulle dépasserait la fenêtre)', () => {
      const { strategy } = showTooltip('above');
      expect(strategy.positions).toHaveLength(4);
      for (const position of strategy.positions) {
        expect(position.offsetX ?? 0, directionOf(position)).toBe(0);
        expect(position.offsetY ?? 0, directionOf(position)).toBe(0);
      }
    });

    describe('écart avec l\'élément : remplissage transparent du panneau (tokens lus dans les sources de tokens)', () => {
      const tokens = (file: string) => JSON.parse(readFileSync(resolve(process.cwd(), 'packages/tokens/src', file), 'utf8'));

      /** Feuille du panneau injectée dans le document, sans espaces. */
      function panelStyles(): string {
        const { fixture } = showTooltip('end');
        fixture.detectChanges();
        expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
        const own = Array.from(document.querySelectorAll('style')).map((style) => style.textContent ?? '').find((css) => css.includes('lc-tooltip__box'));
        expect(own).toBeDefined();
        return own!.replace(/\s+/g, '');
      }

      it('CA-D5 : l\'écart vaut 4 px (space-1) : le jeton système renvoie au jeton de référence de 4 px', () => {
        expect(tokens('ref/scale.tokens.json').ref.space['1'].$value).toBe('4px');
        expect(tokens('sys/default.tokens.json').sys.space['1'].$value).toBe('{ref.space.1}');
      });

      it('CA-D5 : l\'hôte du panneau réserve space-1 sur ses quatre côtés (donc dans les quatre directions), sans fond ni bordure', () => {
        // Angular réécrit `:host` en `[_nghost-…]` et `.classe` en `.classe[_ngcontent-…]`.
        const host = /\[_nghost[^\]]*\]\{([^}]*)\}/.exec(panelStyles())?.[1] ?? '';
        expect(host).toMatch(/(^|;)padding:var\(--lc-sys-space-1\)(;|$)/);
        expect(host).not.toMatch(/background|border|box-shadow/);
        expect(host).not.toContain('pointer-events'); // l'écart reçoit le pointeur : la bulle est survolable (WCAG 1.4.13)
      });

      it('CA-D5 : la partie visible est .lc-tooltip__box (fond, texte), l\'écart ne se voit pas', () => {
        const box = /\.lc-tooltip__box\[[^\]]*\]\{([^}]*)\}/.exec(panelStyles())?.[1] ?? '';
        expect(box).toMatch(/background:var\(--lc-tooltip-background,var\(--lc-sys-color-on-surface\)\)/);
        expect(box).toMatch(/color:var\(--lc-tooltip-color,var\(--lc-sys-color-surface\)\)/);
        const tip = document.querySelector('[role="tooltip"]')!;
        expect(tip.querySelector('.lc-tooltip__box')!.textContent).toContain('Infos');
        expect(tip.children).toHaveLength(1);
      });
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
    /** Écart transparent réservé par le panneau sur chaque côté (space-1 = 4 px, vérifié plus haut) : la taille mesurée par le CDK l'inclut. */
    const GAP = 4;

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
          return rect(0, 0, tip.width + 2 * GAP, tip.height + 2 * GAP);
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

    it('CA-D5 : sans place d\'aucun côté, l\'info-bulle est poussée entièrement dans la fenêtre, écart compris (aucun translate ne la ressort)', async () => {
      const tip = { width: 900, height: 30 };
      place(450, 0, { width: 32, height: VIEWPORT.height }, tip);
      await chosen('above');
      const pane = document.querySelector<HTMLElement>('.cdk-overlay-pane')!;
      const translate = (axis: 'X' | 'Y') => parseFloat(new RegExp(`translate${axis}\\((-?[\\d.]+)px\\)`).exec(pane.style.transform)?.[1] ?? '0');
      const left = parseFloat(pane.style.left) + translate('X');
      const top = parseFloat(pane.style.top) + translate('Y');
      expect(left).toBeGreaterThanOrEqual(0);
      expect(left + tip.width + 2 * GAP).toBeLessThanOrEqual(VIEWPORT.width);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top + tip.height + 2 * GAP).toBeLessThanOrEqual(VIEWPORT.height);
    });
  });
});
