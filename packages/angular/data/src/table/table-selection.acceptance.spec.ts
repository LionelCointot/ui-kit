import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcTableComponent } from './table.component';
import { LcSort, LcTableColumn, LcTableGrouping } from './table-model';

// Tests d'acceptation K1 et K4 (spec 2026-11-composants-import-progressif), écrits depuis la spec seule.

interface Row { id: string; name: string; group: string; locked?: boolean }

@Component({
  imports: [LcTableComponent],
  template: `<lc-table caption="Lots" [data]="data()" [columns]="columns" [trackBy]="trackBy" [selectable]="options()"
    [(selection)]="selection" [rowClass]="cls" [groupBy]="grouping()" [(sort)]="sort" />`,
})
class HostComponent {
  readonly data = signal<readonly Row[]>([
    { id: 'a', name: 'Alpha', group: 'G1' }, { id: 'b', name: 'Bravo', group: 'G1' },
    { id: 'c', name: 'Charlie', group: 'G2', locked: true }, { id: 'd', name: 'Delta', group: 'G2' },
  ]);
  readonly columns: readonly LcTableColumn<Row>[] = [{ id: 'name', header: 'Nom', value: (r) => r.name, sortable: true }];
  readonly trackBy = (r: Row) => r.id;
  readonly selectable = signal(true);
  readonly selection = signal<ReadonlySet<unknown>>(new Set());
  readonly can = (r: Row) => !r.locked;
  readonly hint = signal<string | undefined>(undefined);
  readonly options = computed(() => (this.selectable() ? { isRowSelectable: this.can, selectAllHint: this.hint() } : false));
  readonly grouping = signal<LcTableGrouping<Row> | undefined>(undefined);
  readonly sort = signal<LcSort | null>(null);
  readonly cls = (r: Row): string | readonly string[] | null => (r.id === 'a' ? 'tone-new' : r.id === 'b' ? ['tone-a', 'tone-b'] : r.id === 'c' ? '' : null);
}

async function mount(locale?: typeof LC_LABELS_EN) {
  TestBed.configureTestingModule({ providers: locale ? [{ provide: LC_LABELS, useValue: locale }] : [] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  const el: HTMLElement = fixture.nativeElement;
  const flush = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const boxes = () => Array.from(el.querySelectorAll<HTMLInputElement>('tbody input[type=checkbox]'));
  const head = () => el.querySelector<HTMLInputElement>('thead input[type=checkbox]')!;
  const live = () => el.querySelector('[aria-live=polite]')?.textContent?.trim() ?? null;
  return { fixture, host: fixture.componentInstance, el, flush, boxes, head, live };
}

describe('lc-table K1/K4 acceptation', () => {
  it('CA-K1-1 : sans selectable, ni case ni région polie', async () => {
    const t = await mount();
    t.host.selectable.set(false);
    await t.flush();
    expect(t.el.querySelectorAll('input[type=checkbox]').length).toBe(0);
    expect(t.el.querySelector('[aria-live]')).toBeNull();
  });

  it('CA-K1-2 : en-tête coche le cochable, partiel, refusé désactivé, décoche', async () => {
    const t = await mount();
    expect(t.boxes().map((b) => b.disabled)).toEqual([false, false, true, false]);
    t.head().click(); await t.flush();
    expect([...t.host.selection()].sort()).toEqual(['a', 'b', 'd']);
    expect(t.head().checked).toBe(true);
    t.boxes()[0].click(); await t.flush();
    expect(t.head().indeterminate).toBe(true);
    t.head().click(); await t.flush();
    expect([...t.host.selection()].sort()).toEqual(['a', 'b', 'd']);
    t.head().click(); await t.flush();
    expect(t.host.selection().size).toBe(0);
    t.host.data.set([{ id: 'c', name: 'C', group: 'G', locked: true }]);
    await t.flush();
    expect(t.head().disabled).toBe(true);
  });

  it('CA-K1-2 : groupes repliés comptés par l\'en-tête', async () => {
    const t = await mount();
    t.host.grouping.set({ key: (r: Row) => r.group, label: (k: string) => k, initiallyExpanded: false });
    await t.flush();
    t.head().click(); await t.flush();
    expect([...t.host.selection()].sort()).toEqual(['a', 'b', 'd']);
  });

  it('CA-K1-3 : nouveau Set émis, selection.set coche, le tri garde les mêmes lignes', async () => {
    const t = await mount();
    const before = t.host.selection();
    t.boxes()[1].click(); await t.flush();
    expect(t.host.selection()).not.toBe(before);
    expect(before.size).toBe(0);
    expect([...t.host.selection()]).toEqual(['b']);
    t.host.selection.set(new Set(['d'])); await t.flush();
    expect(t.boxes().map((b) => b.checked)).toEqual([false, false, false, true]);
    t.host.sort.set({ columnId: 'name', direction: 'desc' }); await t.flush();
    const names = Array.from(t.el.querySelectorAll('tbody tr')).map((tr) => ({ n: tr.textContent?.trim(), c: tr.querySelector<HTMLInputElement>('input')!.checked }));
    expect(names.find((x) => x.n?.includes('Delta'))!.c).toBe(true);
    expect(names.filter((x) => x.c).length).toBe(1);
  });

  it('CA-K1-4 : noms accessibles, annonce après clic seulement (fr), aide reliée', async () => {
    const t = await mount();
    t.host.hint.set('Agit sur toute la copropriété'); await t.flush();
    expect(t.live()).toBe('');
    for (const b of [t.head(), ...t.boxes()]) expect(b.getAttribute('aria-label')?.length).toBeGreaterThan(0);
    const hint = t.el.querySelector(`#${t.head().getAttribute('aria-describedby')}`);
    expect(hint?.textContent).toContain('toute la copropriété');
    t.host.selection.set(new Set(['a'])); await t.flush();
    expect(t.live()).toBe('');
    t.boxes()[0].click(); await t.flush();
    expect(t.live()).toBe('0 sélectionnées sur 3');
  });

  it('CA-K1-4 : annonce en anglais', async () => {
    const t = await mount(LC_LABELS_EN);
    t.boxes()[0].click(); await t.flush();
    expect(t.live()).toBe('1 selected of 3');
  });

  it('CA-K1-5 : données perdues, compte et en-tête recalculés, clés conservées', async () => {
    const t = await mount();
    t.head().click(); await t.flush();
    t.host.data.update((d) => d.filter((r) => r.id === 'a' || r.id === 'c'));
    await t.flush();
    expect(t.head().checked).toBe(true);
    t.boxes()[0].click(); await t.flush();
    expect(t.live()).toBe('0 sélectionnées sur 1');
    expect(t.host.selection().has('b')).toBe(true);
    expect(t.host.selection().has('d')).toBe(true);
  });

  it('K1 limite : ligne non cochable déjà sélectionnée, cochée et désactivée, hors compte', async () => {
    const t = await mount();
    t.host.selection.set(new Set(['c'])); await t.flush();
    expect(t.boxes()[2].checked).toBe(true);
    expect(t.boxes()[2].disabled).toBe(true);
    expect(t.head().checked).toBe(false);
    expect(t.head().indeterminate).toBe(false);
  });

  it('CA-K4-1 : rowClass sur lignes de données seulement (chaîne, tableau, vide, null)', async () => {
    const t = await mount();
    const rows = Array.from(t.el.querySelectorAll<HTMLElement>('tbody tr'));
    expect(rows[0].classList.contains('tone-new')).toBe(true);
    expect(rows[1].classList.contains('tone-a') && rows[1].classList.contains('tone-b')).toBe(true);
    for (const r of [rows[2], rows[3]]) expect(Array.from(r.classList).some((c) => c.startsWith('tone'))).toBe(false);
    expect(t.el.querySelector('thead tr')!.className).not.toContain('tone');
  });
});
