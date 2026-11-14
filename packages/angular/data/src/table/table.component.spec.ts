import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcCellDirective } from './cell.directive';
import { LcTableComponent } from './table.component';
import { LcSort, LcTableColumn, LcTableGrouping } from './table-model';

interface Payment { id: number; year: number; month: string; amount: number; status: string }

const data: readonly Payment[] = [
  { id: 1, year: 2026, month: 'Janvier', amount: 1200.5, status: 'payé' },
  { id: 2, year: 2026, month: 'Février', amount: 1200.5, status: 'payé' },
  { id: 3, year: 2027, month: 'Janvier', amount: 900, status: 'à venir' },
];

@Component({
  imports: [LcTableComponent, LcCellDirective],
  template: `
    <lc-table caption="Échéances" [data]="data" [columns]="columns" [trackBy]="trackBy" [groupBy]="grouping()"
      [footer]="{ amount: 3301 }" [(sort)]="sort" (groupToggled)="toggled.set($event.key)">
      <ng-template lcCell="status" let-row><strong class="status">{{ row.status }}</strong></ng-template>
    </lc-table>
  `,
})
class TableHostComponent {
  readonly data = data;
  readonly columns: readonly LcTableColumn<Payment>[] = [
    { id: 'month', header: 'Mois', value: (row) => row.month, sortable: true },
    { id: 'amount', header: 'Montant', value: (row) => row.amount, format: 'money', sortable: true },
    { id: 'status', header: 'Statut', value: (row) => row.status },
  ];
  readonly trackBy = (row: Payment) => row.id;
  readonly sort = signal<LcSort | null>(null);
  readonly toggled = signal('');
  readonly grouping = signal<LcTableGrouping<Payment> | undefined>(undefined);
}

describe('LcTableComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(TableHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const bodyRows = () => Array.from(element.querySelectorAll('tbody tr'));
    return { fixture, element, bodyRows };
  }

  it('rend un tableau natif avec légende, en-têtes de colonne et formats', async () => {
    const { element, bodyRows } = await setup();
    expect(element.querySelector('caption')!.textContent).toBe('Échéances');
    expect(Array.from(element.querySelectorAll('th')).map((th) => th.getAttribute('scope'))).toEqual(['col', 'col', 'col']);
    expect(bodyRows().length).toBe(3);
    const cells = bodyRows()[0].querySelectorAll('td');
    expect(cells[1].textContent!.replace(/\s/g, ' ')).toContain('1 200,50');
    expect(cells[1].classList).toContain('lc-table__cell--end');
    expect(cells[2].querySelector('.status')!.textContent).toBe('payé');
    expect(element.querySelector('tfoot td')!.textContent).toContain('Total');
    expect(element.querySelector('tfoot')!.textContent).toContain('3');
  });

  it('trie par clic sur l\'en-tête et expose aria-sort', async () => {
    const { fixture, element, bodyRows } = await setup();
    const headers = element.querySelectorAll('th');
    expect(headers[0].getAttribute('aria-sort')).toBeNull();
    headers[1].querySelector('button')!.click();
    await fixture.whenStable();
    expect(headers[1].getAttribute('aria-sort')).toBe('ascending');
    expect(bodyRows()[0].querySelectorAll('td')[1].textContent).toContain('900');
    headers[1].querySelector('button')!.click();
    await fixture.whenStable();
    expect(headers[1].getAttribute('aria-sort')).toBe('descending');
    headers[1].querySelector('button')!.click();
    await fixture.whenStable();
    expect(headers[1].getAttribute('aria-sort')).toBeNull();
    expect(fixture.componentInstance.sort()).toBeNull();
  });

  it('groupes repliables avec sous-total et bouton aria-expanded', async () => {
    const { fixture, element, bodyRows } = await setup();
    fixture.componentInstance.grouping.set({
      key: (row) => String(row.year),
      label: (key) => `Année ${key}`,
      summary: (rows) => ({ amount: rows.reduce((sum, row) => sum + row.amount, 0) }),
    });
    await fixture.whenStable();
    expect(bodyRows().length).toBe(2);
    expect(bodyRows()[0].textContent).toContain('Année 2026');
    expect(bodyRows()[0].textContent!.replace(/\s/g, ' ')).toContain('2 401');
    const toggle = bodyRows()[0].querySelector<HTMLButtonElement>('.lc-table__toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click();
    await fixture.whenStable();
    expect(bodyRows().length).toBe(4);
    expect(element.querySelector('.lc-table__toggle')!.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.componentInstance.toggled()).toBe('2026');
  });

  // jsdom ne résout pas `var()` : on lit la feuille de style que le composant injecte (variable lue, défauts, bloc compact).
  describe('espacement horizontal des cellules (--lc-table-cell-padding-inline)', () => {
    async function rules() {
      const { fixture } = await setup();
      await fixture.whenStable();
      const text = Array.from(document.querySelectorAll('style')).map((style) => style.textContent ?? '').join('\n').replace(/\s+/g, '');
      const blocks = text.split('}').filter((block) => block.includes('--_cell-padding'));
      return {
        normal: blocks.find((block) => !block.includes('compact')) ?? '',
        compact: blocks.find((block) => block.includes('compact')) ?? '',
      };
    }

    it('le padding horizontal vient de la variable posée sur l\'hôte, avec repli sur space-4', async () => {
      const { normal } = await rules();
      expect(normal).toContain('--_cell-padding-inline:var(--lc-table-cell-padding-inline,var(--lc-sys-space-4))');
      expect(normal).toContain('padding:var(--_cell-padding-block)var(--_cell-padding-inline)');
      expect(normal).toContain('--_cell-padding-block:var(--lc-sys-space-3)');
    });

    it('en compact, la même variable pilote le padding horizontal ; défauts space-3 et space-1 inchangés', async () => {
      const { compact } = await rules();
      expect(compact).toContain('--_cell-padding-inline:var(--lc-table-cell-padding-inline,var(--lc-sys-space-3))');
      expect(compact).toContain('--_cell-padding-block:var(--lc-sys-space-1)');
    });
  });
});
