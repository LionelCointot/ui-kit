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
