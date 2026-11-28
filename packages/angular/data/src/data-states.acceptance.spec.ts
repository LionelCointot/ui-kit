import type { Type } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LC_LABELS } from '@lionelcointot/ui-angular';
import { LcDescriptionListComponent } from './description-list/description-list.component';
import { LcKpiCardComponent } from './kpi-card/kpi-card.component';
import { LcTableComponent } from './table/table.component';
import { LcTimelineBarComponent } from './timeline-bar/timeline-bar.component';
import { LcTreeTableComponent } from './tree-table/tree-table.component';

// Spec 2026-12-squelette-automatique, CA-2 à CA-5 et CA-7, composants 1 à 5 (§5.3).
type Kind = 'undefined' | 'null' | 'empty' | 'ready';
interface Case {
  name: string;
  cmp: Type<unknown>;
  fixed: Record<string, unknown>;
  bind: (kind: Kind) => Record<string, unknown>;
  dataText: string;
  /** Ce que montre `null` : texte `noData` / `emptyMessage`, ou le tiret « — ». */
  empty: 'text' | 'dash';
  /** Accepte `[]` (entrée de liste) et `emptyMessage`. */
  list: boolean;
  emptyMessage: boolean;
  staleClass: string;
  /** Cellules, termes ou valeurs de donnée (hors squelette). */
  cells?: string;
}

const NOT_SKELETON = ':not(:has(lc-skeleton))';
const value = (kind: Kind, ready: unknown) => ({ undefined: undefined, null: null, empty: [], ready })[kind];
const field = (name: string, ready: unknown) => (kind: Kind) => ({ [name]: value(kind, ready) });
const rows = [{ id: 1, name: 'Alpha' }, { id: 2, name: 'Beta' }];
const tree = [{ id: 'a', name: 'Alpha', kids: [{ id: 'b', name: 'Beta', kids: [] }] }];
const column = (row: { name: string }) => row.name;
const columns = [{ id: 'name', header: 'Nom', value: column }];

const cases: Case[] = [
  {
    name: '1 lc-kpi-card', cmp: LcKpiCardComponent, fixed: { label: 'Mensualité' },
    bind: (kind) => ({ value: kind === 'ready' ? 4200 : undefined, valueText: kind === 'ready' ? '4 200 €' : undefined, ...(kind === 'null' && { value: null, valueText: null }) }),
    dataText: '4 200 €', empty: 'dash', list: false, emptyMessage: false, staleClass: '.lc-kpi-card__value--stale',
  },
  {
    name: '2 lc-timeline-bar', cmp: LcTimelineBarComponent, fixed: { label: 'Phases', description: 'Phases du prêt' },
    bind: (kind) => (kind === 'ready'
      ? { segments: [{ id: 's', weight: 3, label: 'Phase Alpha', colorSlot: 1 }], lanes: [] }
      : { segments: value(kind, 0), lanes: value(kind, 0) }),
    dataText: 'Phase Alpha', empty: 'text', list: true, emptyMessage: true, staleClass: '.lc-timeline-bar--stale',
  },
  {
    name: '3 lc-table', cmp: LcTableComponent, fixed: { caption: 'Lignes', columns, trackBy: (row: { id: number }) => row.id },
    bind: field('data', rows), dataText: 'Alpha', empty: 'text', list: true, emptyMessage: true, staleClass: '.lc-table--stale', cells: `tbody td${NOT_SKELETON}`,
  },
  {
    name: '4 lc-tree-table', cmp: LcTreeTableComponent,
    fixed: { caption: 'Arbre', columns, trackBy: (row: { id: string }) => row.id, children: (row: { kids: unknown[] }) => row.kids },
    bind: field('data', tree), dataText: 'Alpha', empty: 'text', list: true, emptyMessage: true, staleClass: '.lc-tree-table--stale', cells: `tbody td${NOT_SKELETON}`,
  },
  {
    name: '5 lc-description-list', cmp: LcDescriptionListComponent, fixed: {},
    bind: field('items', [{ term: 'Terme A', value: 'Valeur A' }]), dataText: 'Valeur A', empty: 'text', list: true, emptyMessage: true,
    staleClass: '.lc-description-list--stale', cells: `dt${NOT_SKELETON}, dd${NOT_SKELETON}`,
  },
];

async function render(c: Case, kind: Kind, extra: Record<string, unknown> = {}): Promise<{ fixture: ComponentFixture<unknown>; host: HTMLElement }> {
  const fixture = TestBed.createComponent(c.cmp);
  for (const [name, value] of Object.entries({ ...c.fixed, ...c.bind(kind), ...extra })) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
  return { fixture, host: fixture.nativeElement as HTMLElement };
}
const set = async (fixture: ComponentFixture<unknown>, inputs: Record<string, unknown>) => {
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
};
const text = (host: HTMLElement) => host.textContent!.replace(/\s+/g, ' ');

describe.each(cases)('états de données : $name', (c) => {
  const noData = () => TestBed.inject(LC_LABELS).noData;

  function expectSkeleton(host: HTMLElement) {
    expect(host.querySelectorAll('lc-skeleton').length).toBeGreaterThan(0);
    expect(text(host)).not.toContain(noData());
    expect(text(host)).not.toContain('—');
    expect(text(host)).not.toContain(c.dataText);
    if (c.cells) expect(host.querySelectorAll(c.cells).length).toBe(0);
    expect(host.getAttribute('aria-busy')).toBe('true');
  }
  function expectEmpty(host: HTMLElement, message = noData()) {
    expect(text(host)).toContain(c.empty === 'dash' ? '—' : message);
    expect(host.querySelector('lc-skeleton')).toBeNull();
    expect(host.hasAttribute('aria-busy')).toBe(false);
    expect(text(host)).not.toContain(c.dataText);
  }

  it('CA-2 : undefined affiche le squelette, ni texte vide, ni donnée, aria-busy', async () => {
    expectSkeleton((await render(c, 'undefined')).host);
  });

  it('CA-3a CA-3d : null affiche l\'état vide, sans squelette ni aria-busy', async () => {
    expectEmpty((await render(c, 'null')).host);
  });

  it.runIf(c.emptyMessage)('CA-3a : emptyMessage remplace noData, une chaîne vide retombe sur noData', async () => {
    const { fixture, host } = await render(c, 'null', { emptyMessage: 'Rien ici' });
    expectEmpty(host, 'Rien ici');
    await set(fixture, { emptyMessage: '' });
    expectEmpty(host);
  });

  it.runIf(c.list)('CA-3b : [] donne le même état vide que null', async () => {
    expectEmpty((await render(c, 'empty')).host);
  });

  it('CA-4 : loading avec une donnée présente affiche le squelette, pas la donnée', async () => {
    const { fixture, host } = await render(c, 'ready');
    expect(text(host)).toContain(c.dataText);
    expect(host.hasAttribute('aria-busy')).toBe(false);
    await set(fixture, { loading: true });
    expectSkeleton(host);
  });

  it('CA-5 : stale garde la donnée, aria-busy et classe de rechargement ; avec undefined, squelette sans classe', async () => {
    const { fixture, host } = await render(c, 'ready');
    expect(host.querySelector(c.staleClass) ?? host.matches(c.staleClass)).toBeFalsy();
    await set(fixture, { stale: true });
    expect(text(host)).toContain(c.dataText);
    expect(host.getAttribute('aria-busy')).toBe('true');
    expect(host.matches(c.staleClass) || host.querySelector(c.staleClass)).toBeTruthy();
    expect(host.querySelector('lc-skeleton')).toBeNull();
    await set(fixture, c.bind('undefined'));
    expectSkeleton(host);
    expect(host.matches(c.staleClass) || host.querySelector(c.staleClass)).toBeFalsy();
    await set(fixture, c.bind('ready'));
    expect(text(host)).toContain(c.dataText);
    expect(host.querySelector('lc-skeleton')).toBeNull();
  });
});

describe('états de données : cas limites', () => {
  it('CA-7 : la carte à 0 et à valueText « » est prête, jamais squelette', async () => {
    for (const inputs of [{ value: 0 }, { value: 0, valueText: '' }]) {
      const fixture = TestBed.createComponent(LcKpiCardComponent);
      for (const [name, value] of Object.entries({ label: 'Reste', ...inputs })) fixture.componentRef.setInput(name, value);
      await fixture.whenStable();
      const host = fixture.nativeElement as HTMLElement;
      expect(host.querySelector('lc-skeleton')).toBeNull();
      expect(host.hasAttribute('aria-busy')).toBe(false);
    }
  });

  it('CA-3c : frise sans segment mais avec des couloirs : prête', async () => {
    const lane = { id: 'l', label: 'Voie Alpha', colorSlot: 1, spans: [{ from: 0, to: 5 }] };
    const fixture = TestBed.createComponent(LcTimelineBarComponent);
    for (const [name, value] of Object.entries({ label: 'Phases', description: 'Phases', segments: [], lanes: [lane] })) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
    const host = fixture.nativeElement as HTMLElement;
    expect(text(host)).toContain('Voie Alpha');
    expect(text(host)).not.toContain(TestBed.inject(LC_LABELS).noData);
    expect(host.querySelector('lc-skeleton')).toBeNull();
    expect(host.hasAttribute('aria-busy')).toBe(false);
  });
});
