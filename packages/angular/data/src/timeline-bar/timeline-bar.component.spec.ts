import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcTimelineBarComponent, LcTimelineSegment, lcTimelinePattern } from './timeline-bar.component';

const BASE: readonly LcTimelineSegment[] = [
  { id: 'a', weight: 1, label: 'Phase A', colorSlot: 1 },
  { id: 'b', weight: 3, label: 'Phase B', colorSlot: 2 },
];

async function setup(inputs: Record<string, unknown> = {}) {
  const fixture = TestBed.createComponent(LcTimelineBarComponent);
  const values = { segments: BASE, label: 'Calendrier', description: 'Phase A puis phase B', ...inputs };
  for (const [name, value] of Object.entries(values)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return {
    fixture,
    element,
    segments: () => Array.from(element.querySelectorAll<HTMLElement>('.lc-timeline-bar__segment')),
    legend: () => Array.from(element.querySelectorAll<HTMLElement>('.lc-timeline-bar__entry')),
  };
}

describe('lcTimelinePattern', () => {
  it('CA-6 : impair = plein, pair = rayé, neutral = pointillé', () => {
    expect([1, 3, 5, 7].map((slot) => lcTimelinePattern(slot as 1))).toEqual(['solid', 'solid', 'solid', 'solid']);
    expect([2, 4, 6, 8].map((slot) => lcTimelinePattern(slot as 2))).toEqual(['striped', 'striped', 'striped', 'striped']);
    expect(lcTimelinePattern('neutral')).toBe('dotted');
  });
});

describe('LcTimelineBarComponent', () => {
  it('CA-5 : un segment dessiné par poids > 0, avec flex-grow égal au poids', async () => {
    const { segments } = await setup();
    expect(segments().length).toBe(2);
    expect(segments().map((segment) => segment.style.flexGrow)).toEqual(['1', '3']);
  });

  it('CA-5 : poids nul, négatif, NaN ou infini = segment non dessiné', async () => {
    const { segments } = await setup({
      segments: [
        { id: 'zero', weight: 0, label: 'Zéro', colorSlot: 1 },
        { id: 'neg', weight: -2, label: 'Négatif', colorSlot: 2 },
        { id: 'nan', weight: NaN, label: 'NaN', colorSlot: 3 },
        { id: 'inf', weight: Infinity, label: 'Infini', colorSlot: 4 },
        { id: 'ninf', weight: -Infinity, label: 'Moins infini', colorSlot: 5 },
        { id: 'ok', weight: 5, label: 'Valide', colorSlot: 6 },
      ],
    });
    expect(segments().length).toBe(1);
    expect(segments()[0].style.flexGrow).toBe('5');
  });

  it('CA-5 : un seul segment est dessiné', async () => {
    const { segments } = await setup({ segments: [{ id: 'u', weight: 12, label: 'Seul', colorSlot: 1 }] });
    expect(segments().length).toBe(1);
  });

  it('CA-5 : un même colorSlot peut revenir plusieurs fois', async () => {
    const { segments, legend } = await setup({
      segments: [
        { id: 'a', weight: 1, label: 'A', colorSlot: 3 },
        { id: 'b', weight: 1, label: 'B', colorSlot: 2 },
        { id: 'c', weight: 1, label: 'C', colorSlot: 3 },
      ],
    });
    expect(segments().length).toBe(3);
    expect(segments()[0].classList).toContain('lc-timeline-bar__swatch--slot-3');
    expect(segments()[2].classList).toContain('lc-timeline-bar__swatch--slot-3');
    expect(legend().length).toBe(3);
  });

  it('CA-6 : couleur de rôle (emplacement) et motif de chaque segment', async () => {
    const { segments } = await setup({
      segments: [
        { id: '1', weight: 1, label: 'Un', colorSlot: 1 },
        { id: '2', weight: 1, label: 'Deux', colorSlot: 2 },
        { id: 'n', weight: 1, label: 'Neutre', colorSlot: 'neutral' },
      ],
    });
    const [one, two, neutral] = segments();
    expect(one.classList).toContain('lc-timeline-bar__swatch--slot-1');
    expect(one.classList).toContain('lc-timeline-bar__swatch--solid');
    expect(two.classList).toContain('lc-timeline-bar__swatch--slot-2');
    expect(two.classList).toContain('lc-timeline-bar__swatch--striped');
    expect(neutral.classList).toContain('lc-timeline-bar__swatch--slot-neutral');
    expect(neutral.classList).toContain('lc-timeline-bar__swatch--dotted');
  });

  it('CA-6 : la légende reprend le libellé et le motif de chaque segment, marqueur rond par défaut', async () => {
    const { legend } = await setup();
    expect(legend().map((entry) => entry.textContent!.trim())).toEqual(['Phase A', 'Phase B']);
    const marker = legend()[0].querySelector('.lc-timeline-bar__marker')!;
    expect(marker.classList).toContain('lc-timeline-bar__marker--circle');
    expect(marker.classList).toContain('lc-timeline-bar__swatch--solid');
    expect(marker.getAttribute('aria-hidden')).toBe('true');
    expect(legend()[1].querySelector('.lc-timeline-bar__marker')!.classList).toContain('lc-timeline-bar__swatch--striped');
  });

  it('CA-6 : repère de forme carré ou losange demandé', async () => {
    const { legend } = await setup({
      segments: [
        { id: 'a', weight: 1, label: 'A', colorSlot: 1, marker: 'square' },
        { id: 'b', weight: 1, label: 'B', colorSlot: 2, marker: 'diamond' },
      ],
    });
    expect(legend()[0].querySelector('.lc-timeline-bar__marker')!.classList).toContain('lc-timeline-bar__marker--square');
    expect(legend()[1].querySelector('.lc-timeline-bar__marker')!.classList).toContain('lc-timeline-bar__marker--diamond');
  });

  it('CA-6 : un segment sous minLabelShare est dessiné mais absent de la légende', async () => {
    const { segments, legend } = await setup({
      segments: [
        { id: 'big', weight: 94, label: 'Grand', colorSlot: 1 },
        { id: 'small', weight: 1, label: 'Petit', colorSlot: 2 },
        { id: 'mid', weight: 5, label: 'Moyen', colorSlot: 3 },
      ],
    });
    // parts : 0,94 / 0,01 / 0,05 ; seuil par défaut 0,06
    expect(segments().length).toBe(3);
    expect(legend().map((entry) => entry.textContent!.trim())).toEqual(['Grand']);
  });

  it('CA-6 : minLabelShare est paramétrable (seuil inclusif)', async () => {
    const { legend } = await setup({
      minLabelShare: 0.25,
      segments: [
        { id: 'a', weight: 1, label: 'A', colorSlot: 1 },
        { id: 'b', weight: 3, label: 'B', colorSlot: 2 },
      ],
    });
    expect(legend().map((entry) => entry.textContent!.trim())).toEqual(['A', 'B']);
    const strict = await setup({ minLabelShare: 0.3, segments: BASE });
    expect(strict.legend().map((entry) => entry.textContent!.trim())).toEqual(['Phase B']);
  });

  it('CA-6 : la part tient compte des seuls segments dessinés (poids nuls exclus du total)', async () => {
    const { legend } = await setup({
      minLabelShare: 0.4,
      segments: [
        { id: 'z', weight: 0, label: 'Nul', colorSlot: 1 },
        { id: 'a', weight: 1, label: 'A', colorSlot: 2 },
        { id: 'b', weight: 1, label: 'B', colorSlot: 3 },
      ],
    });
    expect(legend().length).toBe(2);
  });

  it('CA-7 : la barre est role="img" avec description pour nom, dans un groupe nommé par label', async () => {
    const { element } = await setup();
    const track = element.querySelector('[role=img]')!;
    expect(track.getAttribute('aria-label')).toBe('Phase A puis phase B');
    expect(element.getAttribute('role')).toBe('group');
    expect(element.getAttribute('aria-label')).toBe('Calendrier');
    expect(element.hasAttribute('aria-busy')).toBe(false);
  });

  it('CA-7 : startLabel et endLabel s\'affichent aux extrémités', async () => {
    const { element } = await setup({ startLabel: 'Début', endLabel: 'Fin' });
    const bounds = Array.from(element.querySelectorAll('.lc-timeline-bar__bounds span')).map((node) => node.textContent);
    expect(bounds).toEqual(['Début', 'Fin']);
  });

  it('CA-7 : sans bornes, aucune ligne de bornes', async () => {
    const { element } = await setup();
    expect(element.querySelector('.lc-timeline-bar__bounds')).toBeNull();
  });

  it('CA-7 : loading = squelette et aria-busy, sans barre ni légende', async () => {
    const { element } = await setup({ loading: true });
    expect(element.querySelector('lc-skeleton')).not.toBeNull();
    expect(element.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelector('[role=img]')).toBeNull();
    expect(element.querySelector('.lc-timeline-bar__legend')).toBeNull();
  });

  it('CA-7 : aucun segment dessiné = emptyMessage', async () => {
    const { element } = await setup({ segments: [{ id: 'z', weight: 0, label: 'Nul', colorSlot: 1 }], emptyMessage: 'Rien à afficher' });
    expect(element.querySelector('.lc-timeline-bar__empty')!.textContent).toBe('Rien à afficher');
    expect(element.querySelector('[role=img]')).toBeNull();
  });

  it('CA-7 : liste vide sans emptyMessage = libellé par défaut (fr)', async () => {
    const { element } = await setup({ segments: [] });
    expect(element.querySelector('.lc-timeline-bar__empty')!.textContent).toBe('Aucune donnée');
  });

  it('CA-7 : libellé par défaut en anglais', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
    const { element } = await setup({ segments: [] });
    expect(element.querySelector('.lc-timeline-bar__empty')!.textContent).toBe('No data');
  });

  it('stale : classe d\'atténuation posée, retirée sinon', async () => {
    const { fixture, element } = await setup({ stale: true });
    expect(element.classList).toContain('lc-timeline-bar--stale');
    fixture.componentRef.setInput('stale', false);
    await fixture.whenStable();
    expect(element.classList).not.toContain('lc-timeline-bar--stale');
  });

  it('les segments suivent un changement d\'entrée (poids mis à jour)', async () => {
    const { fixture, segments } = await setup();
    fixture.componentRef.setInput('segments', [{ id: 'a', weight: 7, label: 'Phase A', colorSlot: 1 }]);
    await fixture.whenStable();
    expect(segments().map((segment) => segment.style.flexGrow)).toEqual(['7']);
  });
});

/** Segments de poids 1 + 3 = total 4 (BASE) : les `at` des graduations sont dans cette unité. */
const TICKS_SELECTOR = '.lc-timeline-bar__ticks';
const LABEL_WIDTH = 60;

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(private readonly callback: (entries: { contentRect: { width: number } }[]) => void) {
    FakeResizeObserver.instances.push(this);
  }
  /** Simule un changement de largeur de l'hôte. */
  resize(width: number): void {
    this.callback([{ contentRect: { width } }]);
  }
}

function ticksOf(element: HTMLElement) {
  return Array.from(element.querySelectorAll<HTMLElement>('.lc-timeline-bar__tick'));
}

function tickLabels(element: HTMLElement): string[] {
  return ticksOf(element).map((tick) => tick.querySelector('.lc-timeline-bar__tick-label')!.textContent!.trim());
}

function hiddenLabels(element: HTMLElement): string[] {
  return ticksOf(element)
    .filter((tick) => tick.querySelector('.lc-timeline-bar__tick-label--hidden'))
    .map((tick) => tick.querySelector('.lc-timeline-bar__tick-label')!.textContent!.trim());
}

/** Pourcentage posé sur une graduation (lu sur l'attribut style, jsdom ne connaissant pas toujours inset-inline-start). */
function percentOf(tick: HTMLElement): number {
  const match = /inset-inline-start:\s*([\d.]+)%/.exec(tick.getAttribute('style') ?? '');
  if (!match) throw new Error(`Aucune position en % sur la graduation : ${tick.getAttribute('style')}`);
  return parseFloat(match[1]);
}

/**
 * Simule la mise en page : jsdom ne mesure rien. Un libellé de graduation fait `LABEL_WIDTH` px de large, sur une barre de largeur `barWidth.value` ;
 * il est centré sur sa graduation, sauf calé à gauche (`--start`) ou à droite (`--end`) de la barre. Calcul indépendant de l'implémentation.
 */
function mockLayout(barWidth: { value: number }) {
  return vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    if (!this.classList.contains('lc-timeline-bar__tick-label')) return new DOMRect(0, 0, 0, 0);
    const tick = this.closest('.lc-timeline-bar__tick') as HTMLElement;
    const x = (percentOf(tick) / 100) * barWidth.value;
    const left = tick.classList.contains('lc-timeline-bar__tick--start') ? x : tick.classList.contains('lc-timeline-bar__tick--end') ? x - LABEL_WIDTH : x - LABEL_WIDTH / 2;
    return new DOMRect(left, 0, LABEL_WIDTH, 20);
  });
}

describe('LcTimelineBarComponent : ticks', () => {
  beforeEach(() => {
    FakeResizeObserver.instances = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe('présence du bloc', () => {
    it('sans ticks (entrée absente) : aucun bloc de graduations', async () => {
      const { element } = await setup();
      expect(element.querySelector(TICKS_SELECTOR)).toBeNull();
    });

    it('ticks vide : aucun bloc de graduations', async () => {
      const { element } = await setup({ ticks: [] });
      expect(element.querySelector(TICKS_SELECTOR)).toBeNull();
    });

    it('seulement des at invalides : aucun bloc de graduations', async () => {
      const { element } = await setup({
        ticks: [
          { at: -1, label: 'a' },
          { at: 5, label: 'b' },
          { at: NaN, label: 'c' },
        ],
      });
      expect(element.querySelector(TICKS_SELECTOR)).toBeNull();
    });

    it('avec au moins une graduation valide : bloc .lc-timeline-bar__ticks[aria-hidden=true], hors du role="img"', async () => {
      const { element } = await setup({ ticks: [{ at: 2, label: 'Milieu' }] });
      const block = element.querySelector(TICKS_SELECTOR)!;
      expect(block).not.toBeNull();
      expect(block.getAttribute('aria-hidden')).toBe('true');
      expect(element.querySelector('[role=img]')!.contains(block)).toBe(false);
      // `description` reste le texte équivalent
      expect(element.querySelector('[role=img]')!.getAttribute('aria-label')).toBe('Phase A puis phase B');
    });

    it('le bloc se place entre la piste et les bornes, puis la légende', async () => {
      const { element } = await setup({ ticks: [{ at: 2, label: 'Milieu' }], startLabel: 'Début', endLabel: 'Fin' });
      const classes = Array.from(element.children).map((child) => child.className);
      expect(classes).toEqual(['lc-timeline-bar__track', 'lc-timeline-bar__ticks', 'lc-timeline-bar__bounds', 'lc-timeline-bar__legend']);
    });

    it('le bloc apparaît et disparaît avec l\'entrée ticks', async () => {
      const { fixture, element } = await setup();
      fixture.componentRef.setInput('ticks', [{ at: 1, label: 'Un' }]);
      await fixture.whenStable();
      expect(element.querySelector(TICKS_SELECTOR)).not.toBeNull();
      fixture.componentRef.setInput('ticks', []);
      await fixture.whenStable();
      expect(element.querySelector(TICKS_SELECTOR)).toBeNull();
    });
  });

  describe('sans ticks, rendu inchangé', () => {
    it('même DOM avec ticks absent, vide ou entièrement invalide ; structure = piste, bornes, légende seulement', async () => {
      const bare = await setup({ startLabel: 'Début', endLabel: 'Fin' });
      const empty = await setup({ startLabel: 'Début', endLabel: 'Fin', ticks: [] });
      const invalid = await setup({ startLabel: 'Début', endLabel: 'Fin', ticks: [{ at: -3, label: 'x' }, { at: Infinity, label: 'y' }] });
      expect(empty.element.innerHTML).toBe(bare.element.innerHTML);
      expect(invalid.element.innerHTML).toBe(bare.element.innerHTML);
      expect(Array.from(bare.element.children).map((child) => child.className)).toEqual([
        'lc-timeline-bar__track',
        'lc-timeline-bar__bounds',
        'lc-timeline-bar__legend',
      ]);
      expect(bare.element.querySelector('.lc-timeline-bar__tick')).toBeNull();
      expect(bare.element.querySelector('.lc-timeline-bar__tick-label')).toBeNull();
    });
  });

  describe('graduations valides', () => {
    it('une graduation par at valide, avec son libellé et son repère', async () => {
      const { element } = await setup({
        ticks: [
          { at: 0, label: 'Début' },
          { at: 1, label: 'Un' },
          { at: 3, label: 'Trois' },
          { at: 4, label: 'Fin' },
        ],
      });
      expect(tickLabels(element)).toEqual(['Début', 'Un', 'Trois', 'Fin']);
      expect(element.querySelectorAll('.lc-timeline-bar__tick-mark').length).toBe(4);
    });

    it('at négatif, supérieur au total, NaN ou infini : ignoré ; 0 et le total (inclus) conservés', async () => {
      const { element } = await setup({
        ticks: [
          { at: -0.5, label: 'négatif' },
          { at: 0, label: 'zéro' },
          { at: 2, label: 'ok' },
          { at: 4, label: 'total' },
          { at: 4.0001, label: 'au-dessus' },
          { at: 100, label: 'loin' },
          { at: NaN, label: 'nan' },
          { at: Infinity, label: 'inf' },
          { at: -Infinity, label: 'moins inf' },
        ],
      });
      expect(tickLabels(element)).toEqual(['zéro', 'ok', 'total']);
    });

    it('le total est celui des segments dessinés (poids nuls, négatifs ou non finis exclus)', async () => {
      const { element } = await setup({
        segments: [
          { id: 'z', weight: 0, label: 'Nul', colorSlot: 1 },
          { id: 'n', weight: -5, label: 'Négatif', colorSlot: 2 },
          { id: 'i', weight: Infinity, label: 'Infini', colorSlot: 3 },
          { id: 'a', weight: 1, label: 'A', colorSlot: 4 },
          { id: 'b', weight: 1, label: 'B', colorSlot: 5 },
        ],
        ticks: [
          { at: 2, label: 'total' },
          { at: 3, label: 'trop loin' },
        ],
      });
      expect(tickLabels(element)).toEqual(['total']);
      expect(ticksOf(element)[0].classList).toContain('lc-timeline-bar__tick--end');
    });

    it('triées par at, quel que soit l\'ordre d\'entrée', async () => {
      const { element } = await setup({
        ticks: [
          { at: 3, label: 'C' },
          { at: 0, label: 'A' },
          { at: 2, label: 'B' },
          { at: 4, label: 'D' },
        ],
      });
      expect(tickLabels(element)).toEqual(['A', 'B', 'C', 'D']);
    });

    it('position = at / total x 100 %', async () => {
      const { element } = await setup({
        ticks: [
          { at: 1, label: 'quart' },
          { at: 2, label: 'moitié' },
          { at: 3, label: 'trois quarts' },
        ],
      });
      expect(ticksOf(element).map(percentOf)).toEqual([25, 50, 75]);
    });

    it('position avec un total qui n\'est pas 4 (1 sur 3 = 33,33 %)', async () => {
      const { element } = await setup({
        segments: [
          { id: 'a', weight: 1, label: 'A', colorSlot: 1 },
          { id: 'b', weight: 2, label: 'B', colorSlot: 2 },
        ],
        ticks: [{ at: 1, label: 'tiers' }],
      });
      expect(percentOf(ticksOf(element)[0])).toBeCloseTo(100 / 3, 3);
    });

    it('classes d\'extrémité : --start à 0, --end au total, aucune entre les deux', async () => {
      const { element } = await setup({
        ticks: [
          { at: 0, label: 'début' },
          { at: 2, label: 'milieu' },
          { at: 4, label: 'fin' },
        ],
      });
      const [start, middle, end] = ticksOf(element);
      expect(start.classList).toContain('lc-timeline-bar__tick--start');
      expect(start.classList).not.toContain('lc-timeline-bar__tick--end');
      expect(middle.classList).not.toContain('lc-timeline-bar__tick--start');
      expect(middle.classList).not.toContain('lc-timeline-bar__tick--end');
      expect(end.classList).toContain('lc-timeline-bar__tick--end');
      expect(end.classList).not.toContain('lc-timeline-bar__tick--start');
      expect(percentOf(start)).toBe(0);
      expect(percentOf(end)).toBe(100);
    });

    it('proche d\'une extrémité sans l\'être (0,01 ou total - 0,01) : libellé centré, pas de classe d\'extrémité', async () => {
      const { element } = await setup({
        ticks: [
          { at: 0.01, label: 'presque début' },
          { at: 3.99, label: 'presque fin' },
        ],
      });
      for (const tick of ticksOf(element)) {
        expect(tick.classList).not.toContain('lc-timeline-bar__tick--start');
        expect(tick.classList).not.toContain('lc-timeline-bar__tick--end');
      }
    });

    it('un seul segment : at = total est en bout de piste', async () => {
      const { element } = await setup({ segments: [{ id: 'u', weight: 12, label: 'Seul', colorSlot: 1 }], ticks: [{ at: 12, label: 'fin' }] });
      expect(ticksOf(element)[0].classList).toContain('lc-timeline-bar__tick--end');
    });

    it('les graduations suivent un changement de segments (total recalculé)', async () => {
      const { fixture, element } = await setup({ ticks: [{ at: 3, label: 'trois' }] });
      expect(percentOf(ticksOf(element)[0])).toBe(75);
      fixture.componentRef.setInput('segments', [{ id: 'a', weight: 6, label: 'A', colorSlot: 1 }]);
      await fixture.whenStable();
      expect(percentOf(ticksOf(element)[0])).toBe(50);
      fixture.componentRef.setInput('segments', [{ id: 'a', weight: 2, label: 'A', colorSlot: 1 }]);
      await fixture.whenStable();
      expect(ticksOf(element).length).toBe(0);
      expect(element.querySelector(TICKS_SELECTOR)).toBeNull();
    });
  });

  describe('aucun effet en loading ni sans segment', () => {
    const TICKS = [
      { at: 0, label: 'Début' },
      { at: 2, label: 'Milieu' },
    ];

    it('loading : squelette, aucune graduation, aucune mesure de libellé', async () => {
      const layout = mockLayout({ value: 400 });
      const { element } = await setup({ loading: true, ticks: TICKS });
      expect(element.querySelector('lc-skeleton')).not.toBeNull();
      expect(element.querySelector(TICKS_SELECTOR)).toBeNull();
      expect(layout).not.toHaveBeenCalled();
    });

    it('aucun segment dessiné : message vide, aucune graduation, aucune mesure', async () => {
      const layout = mockLayout({ value: 400 });
      const { element } = await setup({ segments: [], ticks: TICKS });
      expect(element.querySelector('.lc-timeline-bar__empty')).not.toBeNull();
      expect(element.querySelector(TICKS_SELECTOR)).toBeNull();
      expect(layout).not.toHaveBeenCalled();
    });

    it('segments tous nuls (total 0) : aucune graduation, pas de division par zéro visible', async () => {
      const { element } = await setup({ segments: [{ id: 'z', weight: 0, label: 'Nul', colorSlot: 1 }], ticks: [{ at: 0, label: 'zéro' }] });
      expect(element.querySelector(TICKS_SELECTOR)).toBeNull();
      expect(element.innerHTML).not.toContain('NaN');
    });

    it('passer en loading retire les graduations, en sortir les rétablit', async () => {
      const { fixture, element } = await setup({ ticks: TICKS });
      expect(ticksOf(element).length).toBe(2);
      fixture.componentRef.setInput('loading', true);
      await fixture.whenStable();
      expect(element.querySelector(TICKS_SELECTOR)).toBeNull();
      fixture.componentRef.setInput('loading', false);
      await fixture.whenStable();
      expect(tickLabels(element)).toEqual(['Début', 'Milieu']);
    });
  });

  describe('chevauchement des libellés (mise en page simulée)', () => {
    it('le second libellé qui chevauche le précédent est masqué, sa graduation est conservée', async () => {
      // barre de 200 px, total 4 : at 1 -> x 50 -> [20, 80] ; at 1.2 -> x 60 -> [30, 90] : chevauchement
      mockLayout({ value: 200 });
      const { element } = await setup({
        ticks: [
          { at: 1, label: 'Premier' },
          { at: 1.2, label: 'Second' },
        ],
      });
      expect(ticksOf(element).length).toBe(2);
      expect(element.querySelectorAll('.lc-timeline-bar__tick-mark').length).toBe(2);
      expect(hiddenLabels(element)).toEqual(['Second']);
    });

    it('libellés qui se touchent seulement (bord contre bord) : aucun masqué', async () => {
      // barre de 240 px : x 60 -> [30, 90] et x 120 -> [90, 150] : bord contre bord, pas de chevauchement
      mockLayout({ value: 240 });
      const { element } = await setup({
        ticks: [
          { at: 1, label: 'Un' },
          { at: 2, label: 'Deux' },
        ],
      });
      expect(hiddenLabels(element)).toEqual([]);
    });

    it('libellés éloignés : aucun masqué', async () => {
      mockLayout({ value: 800 });
      const { element } = await setup({
        ticks: [
          { at: 1, label: 'Un' },
          { at: 2, label: 'Deux' },
          { at: 3, label: 'Trois' },
        ],
      });
      expect(hiddenLabels(element)).toEqual([]);
    });

    it('le masquage se décide dans l\'ordre de position, pas dans l\'ordre d\'entrée', async () => {
      mockLayout({ value: 200 });
      const { element } = await setup({
        ticks: [
          { at: 1.2, label: 'Second' },
          { at: 1, label: 'Premier' },
        ],
      });
      expect(tickLabels(element)).toEqual(['Premier', 'Second']);
      expect(hiddenLabels(element)).toEqual(['Second']);
    });

    it('graduation à 0 (libellé calé à gauche) et libellé voisin : le voisin est masqué s\'il chevauche', async () => {
      // at 0 -> [0, 60] ; at 0.4 -> x 20 -> [-10, 50] : chevauche
      mockLayout({ value: 200 });
      const { element } = await setup({
        ticks: [
          { at: 0, label: 'Début' },
          { at: 0.4, label: 'Proche' },
          { at: 4, label: 'Fin' },
        ],
      });
      expect(hiddenLabels(element)).toEqual(['Proche']);
    });

    it('un changement de largeur (ResizeObserver) recalcule les libellés masqués, dans les deux sens', async () => {
      const barWidth = { value: 400 };
      mockLayout(barWidth);
      const { fixture, element } = await setup({
        ticks: [
          { at: 1, label: 'Un' },
          { at: 2, label: 'Deux' },
        ],
      });
      // 400 px : x 100 et x 200 -> [70, 130] et [170, 230] : libres
      expect(hiddenLabels(element)).toEqual([]);
      expect(FakeResizeObserver.instances.length).toBe(1);

      barWidth.value = 100; // x 25 et x 50 -> [-5, 55] et [20, 80] : chevauchement
      FakeResizeObserver.instances[0].resize(100);
      await fixture.whenStable();
      expect(hiddenLabels(element)).toEqual(['Deux']);

      barWidth.value = 400;
      FakeResizeObserver.instances[0].resize(400);
      await fixture.whenStable();
      expect(hiddenLabels(element)).toEqual([]);
    });

    it('l\'observateur de taille observe l\'hôte et se déconnecte à la destruction', async () => {
      const { fixture, element } = await setup({ ticks: [{ at: 1, label: 'Un' }] });
      const observer = FakeResizeObserver.instances[0];
      expect(observer.observe).toHaveBeenCalledWith(fixture.nativeElement);
      fixture.destroy();
      expect(observer.disconnect).toHaveBeenCalled();
    });

    it('un changement de ticks recalcule les libellés masqués', async () => {
      mockLayout({ value: 200 });
      const { fixture, element } = await setup({ ticks: [{ at: 1, label: 'Un' }, { at: 3, label: 'Trois' }] });
      expect(hiddenLabels(element)).toEqual([]);
      fixture.componentRef.setInput('ticks', [{ at: 1, label: 'Un' }, { at: 1.2, label: 'Voisin' }]);
      await fixture.whenStable();
      expect(hiddenLabels(element)).toEqual(['Voisin']);
    });
  });

  describe('cas limites', () => {
    it('deux at égaux : deux graduations à la même position, le second libellé est masqué', async () => {
      mockLayout({ value: 400 });
      const { element } = await setup({
        ticks: [
          { at: 2, label: 'Première' },
          { at: 2, label: 'Seconde' },
        ],
      });
      expect(ticksOf(element).length).toBe(2);
      expect(ticksOf(element).map(percentOf)).toEqual([50, 50]);
      expect(tickLabels(element)).toEqual(['Première', 'Seconde']);
      expect(hiddenLabels(element)).toEqual(['Seconde']);
    });

    it('deux at égaux sans mesure (jsdom) : deux graduations rendues, sans erreur', async () => {
      const { element } = await setup({ ticks: [{ at: 2, label: 'a' }, { at: 2, label: 'b' }] });
      expect(ticksOf(element).length).toBe(2);
    });

    it('ResizeObserver absent : graduations rendues, aucune erreur, chevauchement mesuré au rendu', async () => {
      vi.stubGlobal('ResizeObserver', undefined);
      mockLayout({ value: 200 });
      const { element } = await setup({
        ticks: [
          { at: 1, label: 'Premier' },
          { at: 1.2, label: 'Second' },
          { at: 3, label: 'Loin' },
        ],
      });
      expect(FakeResizeObserver.instances.length).toBe(0);
      expect(tickLabels(element)).toEqual(['Premier', 'Second', 'Loin']);
      expect(hiddenLabels(element)).toEqual(['Second']);
    });

    it('libellés de graduation rendus en texte (pas de HTML interprété)', async () => {
      const { element } = await setup({ ticks: [{ at: 1, label: '<b>gras</b>' }] });
      expect(element.querySelector('.lc-timeline-bar__tick-label b')).toBeNull();
      expect(tickLabels(element)).toEqual(['<b>gras</b>']);
    });
  });
});
