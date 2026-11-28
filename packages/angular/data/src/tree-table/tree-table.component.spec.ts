import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcCellDirective } from '../table/cell.directive';
import { LcSort, LcTableColumn } from '../table/table-model';
import { LcTreeTableComponent } from './tree-table.component';

interface Node {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly children?: readonly Node[];
}

const node = (id: string, size: number, children?: readonly Node[]): Node => ({ id, name: `Nœud ${id}`, size, children });

/**
 * A (3)            niveau 1
 *   A1 (30)        niveau 2
 *     A1a (5)      niveau 3
 *     A1b (1)
 *   A2 (20)
 * B (2)
 *   B1 (7)
 * C (1)            racine sans enfant
 */
const tree = (): readonly Node[] => [
  node('A', 3, [node('A1', 30, [node('A1a', 5), node('A1b', 1)]), node('A2', 20)]),
  node('B', 2, [node('B1', 7)]),
  node('C', 1),
];

const KEY_CODES: Record<string, number> = { ArrowDown: 40, ArrowUp: 38, ArrowRight: 39, ArrowLeft: 37, Home: 36, End: 35, Enter: 13, ' ': 32, '*': 106 };

function press(target: Element, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, keyCode: KEY_CODES[key], bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

@Component({
  imports: [LcTreeTableComponent, LcCellDirective],
  template: `
    <lc-tree-table caption="Arborescence" [data]="data()" [children]="children" [columns]="columns" [trackBy]="trackBy"
      [(sort)]="sort" [(expanded)]="expanded" [expandAllInitially]="expandAll()" [filter]="filter()" [emptyMessage]="emptyMessage()"
      [captionHidden]="captionHidden()" (rowToggled)="toggled.push($event.node.id + ':' + $event.expanded)">
      @if (customCells()) {
        <ng-template lcCell="name" let-node let-level="level"><span class="cell-name" [attr.data-level]="level">{{ node.name }}</span></ng-template>
        <ng-template lcCell="size" let-node let-level="level"><span class="cell-size" [attr.data-level]="level">{{ node.size }}</span></ng-template>
      }
    </lc-tree-table>
  `,
})
class TreeHostComponent {
  readonly data = signal<readonly Node[]>(tree());
  readonly children = (item: Node) => item.children;
  readonly trackBy = (item: Node) => item.id;
  readonly columns: readonly LcTableColumn<Node>[] = [
    { id: 'name', header: 'Nom', value: (item) => item.name, sortable: true },
    { id: 'size', header: 'Taille', value: (item) => item.size, format: 'integer', sortable: true },
    { id: 'kind', header: 'Type', value: (item) => (item.children ? 'dossier' : 'fichier') },
  ];
  readonly sort = signal<LcSort | null>(null);
  readonly expanded = signal<ReadonlySet<unknown>>(new Set());
  readonly expandAll = signal(false);
  readonly filter = signal<((item: Node) => boolean) | undefined>(undefined);
  readonly emptyMessage = signal<string | undefined>(undefined);
  readonly captionHidden = signal(false);
  readonly customCells = signal(false);
  readonly toggled: string[] = [];
}

describe('LcTreeTableComponent', () => {
  async function setup(configure: (host: TreeHostComponent) => void = () => undefined) {
    const fixture = TestBed.createComponent(TreeHostComponent);
    configure(fixture.componentInstance);
    await fixture.whenStable();
    return helpers(fixture);
  }

  function helpers(fixture: ComponentFixture<TreeHostComponent>) {
    const element = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const rows = () => [...element.querySelectorAll<HTMLElement>('tbody tr[aria-level]')];
    const names = () => rows().map((row) => row.querySelector('td .lc-tree-table__content')!.textContent!.trim().replace('Nœud ', ''));
    const row = (id: string) => rows().find((candidate) => candidate.querySelector('td .lc-tree-table__content')!.textContent!.trim() === `Nœud ${id}`)!;
    const update = async (change: (current: TreeHostComponent) => void) => {
      change(host);
      await fixture.whenStable();
    };
    const key = async (target: Element, name: string, init: KeyboardEventInit = {}) => {
      const event = press(target, name, init);
      await fixture.whenStable();
      return event;
    };
    return { fixture, element, host, rows, names, row, update, key };
  }

  // CA-K3.1
  describe('ARIA treegrid (CA-K3.1)', () => {
    it('CA-K3.1 : table role="treegrid" nommée par sa légende, lignes role="row", en-têtes de colonne', async () => {
      const { element } = await setup();
      const table = element.querySelector('table')!;
      expect(table.getAttribute('role')).toBe('treegrid');
      const caption = table.querySelector('caption')!;
      expect(table.getAttribute('aria-labelledby')).toBe(caption.id);
      expect(caption.textContent).toBe('Arborescence');
      expect([...table.querySelectorAll('thead th')].map((th) => th.getAttribute('scope'))).toEqual(['col', 'col', 'col']);
      expect([...table.querySelectorAll('tbody tr')].every((tr) => tr.getAttribute('role') === 'row')).toBe(true);
    });

    it('CA-K3.1 : arbre à 3 niveaux entièrement déplié — aria-level 1 à 3, posinset et setsize', async () => {
      const { rows, names } = await setup((host) => host.expandAll.set(true));
      expect(names()).toEqual(['A', 'A1', 'A1a', 'A1b', 'A2', 'B', 'B1', 'C']);
      const attributes = rows().map((row) => ({
        level: row.getAttribute('aria-level'),
        pos: row.getAttribute('aria-posinset'),
        size: row.getAttribute('aria-setsize'),
      }));
      expect(attributes).toEqual([
        { level: '1', pos: '1', size: '3' }, // A
        { level: '2', pos: '1', size: '2' }, // A1
        { level: '3', pos: '1', size: '2' }, // A1a
        { level: '3', pos: '2', size: '2' }, // A1b
        { level: '2', pos: '2', size: '2' }, // A2
        { level: '1', pos: '2', size: '3' }, // B
        { level: '2', pos: '1', size: '1' }, // B1
        { level: '1', pos: '3', size: '3' }, // C
      ]);
    });

    it('CA-K3.1 : aria-expanded sur les nœuds parents seulement (true déplié, false replié), jamais sur une feuille', async () => {
      const { row, update, rows } = await setup((host) => host.expandAll.set(true));
      expect(['A', 'A1', 'B'].map((id) => row(id).getAttribute('aria-expanded'))).toEqual(['true', 'true', 'true']);
      for (const id of ['A1a', 'A1b', 'A2', 'B1', 'C']) expect(row(id).hasAttribute('aria-expanded'), id).toBe(false);
      await update((host) => { host.expandAll.set(false); host.expanded.set(new Set(['A'])); });
      // A (déplié), A1 (parent replié), A2 (feuille), B (parent replié), C (feuille)
      expect(rows().map((candidate) => candidate.getAttribute('aria-expanded'))).toEqual(['true', 'false', null, 'false', null]);
    });

    it('par défaut tout est replié : seules les racines sont visibles, parents aria-expanded="false"', async () => {
      const { rows, names, row } = await setup();
      expect(names()).toEqual(['A', 'B', 'C']);
      expect(rows().map((candidate) => candidate.getAttribute('aria-level'))).toEqual(['1', '1', '1']);
      expect(row('A').getAttribute('aria-expanded')).toBe('false');
      expect(row('C').hasAttribute('aria-expanded')).toBe(false);
    });

    it('le niveau est aussi lisible hors marge : --_level suit le niveau - 1 (indentation par niveau)', async () => {
      const { rows } = await setup((host) => host.expandAll.set(true));
      expect(rows().map((row) => row.style.getPropertyValue('--_level'))).toEqual(['0', '1', '2', '2', '1', '0', '1', '0']);
    });

    it('le bouton de dépliage est masqué aux technologies d\'assistance et hors tabulation (la ligne porte aria-expanded)', async () => {
      const { element } = await setup((host) => host.expandAll.set(true));
      const toggles = [...element.querySelectorAll<HTMLButtonElement>('.lc-tree-table__toggle')];
      expect(toggles.length).toBe(3);
      for (const toggle of toggles) {
        expect(toggle.getAttribute('aria-hidden')).toBe('true');
        expect(toggle.getAttribute('tabindex')).toBe('-1');
      }
    });

    it('légende masquée visuellement : classe dédiée, légende conservée pour le nom accessible', async () => {
      const { element, update } = await setup();
      await update((host) => host.captionHidden.set(true));
      expect(element.querySelector('caption')!.classList).toContain('lc-table__caption--hidden');
      expect(element.querySelector('caption')!.textContent).toBe('Arborescence');
    });
  });

  // CA-K3.2
  describe('clavier (CA-K3.2)', () => {
    it('CA-K3.2 : un seul arrêt de tabulation dans le tableau (une ligne tabindex=0, les autres -1, aucun autre élément tabulable)', async () => {
      const { element, rows } = await setup((host) => host.expandAll.set(true));
      expect(rows().filter((row) => row.getAttribute('tabindex') === '0').length).toBe(1);
      expect(rows()[0].getAttribute('tabindex')).toBe('0');
      expect(rows().slice(1).every((row) => row.getAttribute('tabindex') === '-1')).toBe(true);
      const tabbable = [...element.querySelectorAll<HTMLElement>('tbody button, tbody a, tbody input, tbody [tabindex]')].filter((target) => target.tabIndex >= 0);
      expect(tabbable).toEqual([rows()[0]]);
    });

    it('le seul arrêt de tabulation suit le focus (ligne active)', async () => {
      const { rows, row, key } = await setup((host) => host.expandAll.set(true));
      await key(rows()[0], 'ArrowDown');
      expect(document.activeElement).toBe(row('A1'));
      expect(rows().filter((candidate) => candidate.getAttribute('tabindex') === '0')).toEqual([row('A1')]);
    });

    it('↓ et ↑ parcourent les lignes visibles sans piège aux extrémités (pas de bouclage)', async () => {
      const { rows, key } = await setup((host) => host.expandAll.set(true));
      const all = rows();
      await key(all[0], 'ArrowDown');
      await key(document.activeElement!, 'ArrowDown');
      expect(document.activeElement).toBe(all[2]);
      await key(document.activeElement!, 'ArrowUp');
      expect(document.activeElement).toBe(all[1]);
      all[7].focus();
      await key(all[7], 'ArrowDown');
      expect(document.activeElement).toBe(all[7]);
      all[0].focus();
      await key(all[0], 'ArrowUp');
      expect(document.activeElement).toBe(all[0]);
    });

    it('Début et Fin vont à la première et à la dernière ligne visibles', async () => {
      const { rows, key } = await setup((host) => host.expandAll.set(true));
      await key(rows()[3], 'End');
      expect(document.activeElement).toBe(rows()[7]);
      await key(document.activeElement!, 'Home');
      expect(document.activeElement).toBe(rows()[0]);
    });

    it('→ sur un parent replié le déplie sans déplacer le focus', async () => {
      const { host, row, names, key } = await setup();
      row('A').focus();
      const event = await key(row('A'), 'ArrowRight');
      expect(names()).toEqual(['A', 'A1', 'A2', 'B', 'C']);
      expect(row('A').getAttribute('aria-expanded')).toBe('true');
      expect(document.activeElement).toBe(row('A'));
      expect(event.defaultPrevented).toBe(true);
      expect(host.expanded().has('A')).toBe(true);
    });

    it('→ sur un parent déplié descend au premier enfant ; → sur une feuille ne fait rien', async () => {
      const { row, key } = await setup((host) => host.expandAll.set(true));
      await key(row('A'), 'ArrowRight');
      expect(document.activeElement).toBe(row('A1'));
      await key(row('A1a'), 'ArrowRight');
      expect(document.activeElement).toBe(row('A1'));
      expect(row('A1a').hasAttribute('aria-expanded')).toBe(false);
    });

    it('← sur un parent déplié le replie ; ← sur un enfant ou une feuille remonte au parent ; ← sur une racine sans enfant est sans effet', async () => {
      const { row, names, key } = await setup((host) => host.expandAll.set(true));
      await key(row('A1'), 'ArrowLeft');
      expect(names()).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'C']);
      expect(row('A1').getAttribute('aria-expanded')).toBe('false');
      await key(row('A1'), 'ArrowLeft');
      expect(document.activeElement).toBe(row('A'));
      await key(row('B1'), 'ArrowLeft');
      expect(document.activeElement).toBe(row('B'));
      row('C').focus();
      const event = await key(row('C'), 'ArrowLeft');
      expect(document.activeElement).toBe(row('C'));
      expect(names().length).toBe(6);
      expect(event.defaultPrevented).toBe(true);
    });

    it.each([['Enter'], [' ']])('« %s » bascule un parent (replie puis déplie) et empêche le défilement par défaut', async (name) => {
      const { row, names, key } = await setup((host) => host.expandAll.set(true));
      const first = await key(row('B'), name);
      expect(first.defaultPrevented).toBe(true);
      expect(names()).toEqual(['A', 'A1', 'A1a', 'A1b', 'A2', 'B', 'C']);
      await key(row('B'), name);
      expect(names()).toEqual(['A', 'A1', 'A1a', 'A1b', 'A2', 'B', 'B1', 'C']);
    });

    it('Entrée sur une feuille est sans effet', async () => {
      const { row, names, host, key } = await setup((current) => current.expandAll.set(true));
      await key(row('C'), 'Enter');
      expect(names().length).toBe(8);
      expect(host.toggled).toEqual([]);
    });

    it('* déplie tous les frères repliés du niveau courant, pas les autres niveaux', async () => {
      const { row, names, host, key } = await setup();
      await key(row('A'), '*');
      expect(names()).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'C']);
      expect(row('A1').getAttribute('aria-expanded')).toBe('false');
      expect([...host.expanded()].sort()).toEqual(['A', 'B']);
      expect(host.toggled.sort()).toEqual(['A:true', 'B:true']);
    });

    it('* ne touche pas les nœuds d\'un autre parent', async () => {
      const { row, names, key } = await setup((host) => host.expanded.set(new Set(['A', 'B'])));
      expect(names()).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'C']);
      await key(row('A1'), '*');
      expect(names()).toEqual(['A', 'A1', 'A1a', 'A1b', 'A2', 'B', 'B1', 'C']);
    });

    it('les touches saisies dans le contenu d\'une cellule (cible ≠ ligne) ne sont pas détournées', async () => {
      const { row, key } = await setup();
      const inner = row('A').querySelector('.lc-tree-table__content')!;
      const event = await key(inner, 'ArrowRight');
      expect(event.defaultPrevented).toBe(false);
      expect(row('A').getAttribute('aria-expanded')).toBe('false');
    });

    it('les combinaisons avec Ctrl, Alt ou Méta ne sont pas interprétées (raccourcis du navigateur)', async () => {
      const { row, key } = await setup();
      for (const init of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }]) {
        const event = await key(row('A'), 'ArrowRight', init);
        expect(event.defaultPrevented).toBe(false);
      }
      expect(row('A').getAttribute('aria-expanded')).toBe('false');
    });

    it('un clic sur le bouton de dépliage (souris) bascule la ligne', async () => {
      const { row, names, fixture, host } = await setup();
      row('A').querySelector<HTMLButtonElement>('.lc-tree-table__toggle')!.click();
      await fixture.whenStable();
      expect(names()).toEqual(['A', 'A1', 'A2', 'B', 'C']);
      expect(host.toggled).toEqual(['A:true']);
    });

    it('le focus reste sur la même ligne (même élément DOM) après repli puis dépliage', async () => {
      const { row, key } = await setup((host) => host.expandAll.set(true));
      const element = row('A');
      element.focus();
      await key(element, 'ArrowLeft');
      expect(document.activeElement).toBe(element);
      expect(element.getAttribute('aria-expanded')).toBe('false');
      await key(element, 'ArrowRight');
      expect(document.activeElement).toBe(element);
      await key(element, 'Enter');
      await key(element, ' ');
      expect(document.activeElement).toBe(element);
      expect(element.getAttribute('tabindex')).toBe('0');
    });

    it('le focus d\'un enfant reste cohérent quand son ancêtre est replié par l\'hôte (la ligne active retombe sur une ligne visible, un seul arrêt)', async () => {
      const { row, rows, key, update } = await setup((host) => host.expandAll.set(true));
      row('A1a').focus();
      await key(row('A1a'), 'ArrowDown');
      await update((host) => { host.expandAll.set(false); host.expanded.set(new Set()); });
      expect(rows().filter((candidate) => candidate.getAttribute('tabindex') === '0').length).toBe(1);
    });

    it('après un clic souris sur le bouton de dépliage, les flèches continuent de déplacer le focus de ligne (le focus ne reste pas sur un bouton aria-hidden)', async () => {
      const { row, fixture } = await setup();
      const toggle = row('A').querySelector<HTMLButtonElement>('.lc-tree-table__toggle')!;
      toggle.focus(); // un clic souris donne le focus au bouton (tabindex=-1) dans les navigateurs
      toggle.click();
      await fixture.whenStable();
      press(document.activeElement!, 'ArrowDown');
      await fixture.whenStable();
      expect(document.activeElement!.tagName, 'le focus doit être sur une ligne').toBe('TR');
    });

    it('un contrôle focalisable dans un gabarit de cellule reste un arrêt de tabulation (limite documentée)', async () => {
      const fixture = TestBed.createComponent(ButtonCellHostComponent);
      await fixture.whenStable();
      const tabbable = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('tbody button')].filter((button) => button.tabIndex >= 0);
      expect(tabbable.map((button) => button.className)).toEqual(['inside', 'inside']);
    });
  });

  // CA-K3.3
  describe('tri (CA-K3.3)', () => {
    it('CA-K3.3 : tri par taille croissante — les frères de chaque niveau sont réordonnés, la hiérarchie est conservée', async () => {
      const { names, rows } = await setup((host) => { host.expandAll.set(true); host.sort.set({ columnId: 'size', direction: 'asc' }); });
      // racines : C(1) B(2) A(3) ; sous A : A2(20) A1(30) ; sous A1 : A1b(1) A1a(5)
      expect(names()).toEqual(['C', 'B', 'B1', 'A', 'A2', 'A1', 'A1b', 'A1a']);
      expect(rows().map((row) => row.getAttribute('aria-level'))).toEqual(['1', '1', '2', '1', '2', '2', '3', '3']);
      expect(rows().map((row) => row.getAttribute('aria-posinset'))).toEqual(['1', '2', '1', '3', '1', '2', '1', '2']);
    });

    it('CA-K3.3 : tri décroissant par nom', async () => {
      const { names } = await setup((host) => { host.expandAll.set(true); host.sort.set({ columnId: 'name', direction: 'desc' }); });
      expect(names()).toEqual(['C', 'B', 'B1', 'A', 'A2', 'A1', 'A1b', 'A1a']);
    });

    it('CA-K3.3 : aria-sort sur la seule colonne triée (ascending / descending), absent ailleurs', async () => {
      const { element, update } = await setup();
      const sorts = () => [...element.querySelectorAll('thead th')].map((th) => th.getAttribute('aria-sort'));
      expect(sorts()).toEqual([null, null, null]);
      await update((host) => host.sort.set({ columnId: 'size', direction: 'asc' }));
      expect(sorts()).toEqual([null, 'ascending', null]);
      await update((host) => host.sort.set({ columnId: 'size', direction: 'desc' }));
      expect(sorts()).toEqual([null, 'descending', null]);
    });

    it('CA-K3.3 : un clic sur l\'en-tête trie, puis inverse, puis retire le tri ; le modèle [(sort)] suit', async () => {
      const { element, host, fixture, names, update } = await setup((current) => current.expandAll.set(true));
      const button = () => element.querySelectorAll<HTMLButtonElement>('thead th button.lc-table__sort')[1];
      button().click();
      await fixture.whenStable();
      expect(host.sort()).toEqual({ columnId: 'size', direction: 'asc' });
      expect(element.querySelectorAll('thead th')[1].getAttribute('aria-sort')).toBe('ascending');
      expect(names()[0]).toBe('C');
      button().click();
      await fixture.whenStable();
      expect(host.sort()).toEqual({ columnId: 'size', direction: 'desc' });
      button().click();
      await fixture.whenStable();
      expect(host.sort()).toBeNull();
      expect(names()).toEqual(['A', 'A1', 'A1a', 'A1b', 'A2', 'B', 'B1', 'C']);
      await update(() => undefined);
    });

    it('une colonne non triable n\'a pas de bouton de tri', async () => {
      const { element } = await setup();
      expect(element.querySelectorAll('thead th button.lc-table__sort').length).toBe(2);
      expect(element.querySelectorAll('thead th')[2].querySelector('button')).toBeNull();
    });

    it('tri par un identifiant de colonne inconnu : ordre d\'origine conservé', async () => {
      const { names } = await setup((host) => { host.expandAll.set(true); host.sort.set({ columnId: 'absente', direction: 'asc' }); });
      expect(names()).toEqual(['A', 'A1', 'A1a', 'A1b', 'A2', 'B', 'B1', 'C']);
    });
  });

  // CA-K3.4
  describe('filtre (CA-K3.4)', () => {
    it('CA-K3.4 : les ancêtres d\'un résultat sont conservés et dépliés ; le reste est masqué', async () => {
      const { names, row, rows } = await setup((host) => host.filter.set((item) => item.id === 'A1b'));
      expect(names()).toEqual(['A', 'A1', 'A1b']);
      expect(['A', 'A1'].map((id) => row(id).getAttribute('aria-expanded'))).toEqual(['true', 'true']);
      expect(row('A1b').hasAttribute('aria-expanded')).toBe(false);
      expect(rows().map((candidate) => candidate.getAttribute('aria-level'))).toEqual(['1', '2', '3']);
    });

    it('les compteurs posinset / setsize reflètent les frères affichés après filtre', async () => {
      const { row } = await setup((host) => host.filter.set((item) => ['A1a', 'A2', 'B1'].includes(item.id)));
      expect([row('A').getAttribute('aria-posinset'), row('A').getAttribute('aria-setsize')]).toEqual(['1', '2']);
      expect([row('B').getAttribute('aria-posinset'), row('B').getAttribute('aria-setsize')]).toEqual(['2', '2']);
      expect([row('A1').getAttribute('aria-posinset'), row('A1').getAttribute('aria-setsize')]).toEqual(['1', '2']);
      expect([row('A1a').getAttribute('aria-posinset'), row('A1a').getAttribute('aria-setsize')]).toEqual(['1', '1']);
    });

    it('un nœud qui passe le filtre est affiché avec ses ancêtres, sans ses descendants non retenus', async () => {
      const { names } = await setup((host) => host.filter.set((item) => item.id === 'A1'));
      expect(names()).toEqual(['A', 'A1']);
    });

    it('CA-K3.4 : sans résultat, emptyMessage (ou « Aucune donnée » par défaut), sans ligne de données', async () => {
      const { element, rows, update } = await setup((host) => host.filter.set(() => false));
      expect(rows().length).toBe(0);
      expect(element.querySelector('tbody tr.lc-table__empty td')!.textContent).toBe('Aucune donnée');
      expect(element.querySelector('tbody tr.lc-table__empty td')!.getAttribute('colspan')).toBe('3');
      await update((host) => host.emptyMessage.set('Aucun résultat pour ce filtre'));
      expect(element.querySelector('tbody tr.lc-table__empty td')!.textContent).toBe('Aucun résultat pour ce filtre');
    });

    it('retirer le filtre rétablit l\'arbre complet', async () => {
      const { names, update } = await setup((host) => host.filter.set((item) => item.id === 'A1b'));
      await update((host) => host.filter.set(undefined));
      expect(names()).toEqual(['A', 'B', 'C']);
    });

    it('une bascule de l\'utilisateur sous filtre rend `expanded` prioritaire ; un nouveau filtre repart du dépliage automatique', async () => {
      const { names, row, key, update } = await setup((host) => host.filter.set((item) => item.id === 'A1b'));
      await key(row('A'), 'ArrowLeft');
      expect(names()).toEqual(['A']);
      await update((host) => host.filter.set((item) => item.id === 'B1'));
      expect(names()).toEqual(['B', 'B1']);
    });

    it('un filtre combiné au tri conserve ancêtres et ordre trié des frères', async () => {
      const { names } = await setup((host) => {
        host.sort.set({ columnId: 'size', direction: 'asc' });
        host.filter.set((item) => ['A1a', 'A1b'].includes(item.id));
      });
      expect(names()).toEqual(['A', 'A1', 'A1b', 'A1a']);
    });
  });

  // expandAllInitially, rowToggled, [(expanded)]
  describe('dépliage', () => {
    it('expandAllInitially déplie tout au départ ; la première bascule rend `expanded` autoritaire', async () => {
      const { names, row, host, key } = await setup((current) => current.expandAll.set(true));
      expect(names().length).toBe(8);
      await key(row('A1'), 'ArrowLeft');
      expect(names()).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'C']);
      expect([...host.expanded()].sort()).toEqual(['A', 'B']);
    });

    it('rowToggled émet le nœud et le nouvel état à chaque bascule (clavier)', async () => {
      const { host, row, key } = await setup();
      await key(row('A'), 'ArrowRight');
      await key(row('A'), 'Enter');
      await key(row('A'), ' ');
      expect(host.toggled).toEqual(['A:true', 'A:false', 'A:true']);
    });

    it('rowToggled n\'émet rien quand rien ne change (feuille, parent déjà dans l\'état demandé)', async () => {
      const { host, row, key } = await setup((current) => current.expandAll.set(true));
      await key(row('C'), 'Enter');
      await key(row('A'), 'ArrowRight'); // déjà déplié : descend seulement
      expect(host.toggled).toEqual([]);
    });

    it('[(expanded)] : le modèle de l\'hôte reçoit les identités dépliées', async () => {
      const { host, row, key } = await setup();
      await key(row('A'), 'ArrowRight');
      await key(row('B'), 'ArrowRight');
      expect(host.expanded()).toEqual(new Set(['A', 'B']));
    });

    it('[(expanded)] : une valeur fournie par l\'hôte déplie les nœuds correspondants', async () => {
      const { names, update } = await setup();
      await update((host) => host.expanded.set(new Set(['A', 'A1'])));
      expect(names()).toEqual(['A', 'A1', 'A1a', 'A1b', 'A2', 'B', 'C']);
    });

    it('une identité inconnue ou une feuille dans `expanded` est ignorée sans erreur', async () => {
      const { names, row } = await setup((host) => host.expanded.set(new Set(['absente', 'C'])));
      expect(names()).toEqual(['A', 'B', 'C']);
      expect(row('C').hasAttribute('aria-expanded')).toBe(false);
    });

    it('les données qui changent conservent l\'état déplié par identité', async () => {
      const { names, update } = await setup((host) => host.expanded.set(new Set(['A'])));
      await update((host) => host.data.set(tree()));
      expect(names()).toEqual(['A', 'A1', 'A2', 'B', 'C']);
    });
  });

  // gabarit lcCell
  describe('gabarit lcCell', () => {
    it('le gabarit reçoit le nœud et `level` (1 à 3) ; la première colonne garde le bouton de dépliage et l\'indentation', async () => {
      const { element } = await setup((host) => { host.expandAll.set(true); host.customCells.set(true); });
      const names = [...element.querySelectorAll<HTMLElement>('.cell-name')];
      expect(names.map((cell) => cell.textContent)).toEqual(['Nœud A', 'Nœud A1', 'Nœud A1a', 'Nœud A1b', 'Nœud A2', 'Nœud B', 'Nœud B1', 'Nœud C']);
      expect(names.map((cell) => cell.dataset['level'])).toEqual(['1', '2', '3', '3', '2', '1', '2', '1']);
      expect(names[0].closest('.lc-tree-table__first')!.querySelector('.lc-tree-table__toggle')).not.toBeNull();
    });

    it('`level` est aussi fourni aux colonnes suivantes', async () => {
      const { element } = await setup((host) => { host.expandAll.set(true); host.customCells.set(true); });
      expect([...element.querySelectorAll<HTMLElement>('.cell-size')].map((cell) => cell.dataset['level'])).toEqual(['1', '2', '3', '3', '2', '1', '2', '1']);
    });

    it('sans gabarit, les cellules sont formatées par la colonne (integer aligné à droite)', async () => {
      const { row } = await setup();
      const cells = row('A').querySelectorAll('td');
      expect(cells[1].textContent!.trim()).toBe('3');
      expect(cells[1].classList).toContain('lc-table__cell--end');
      expect(cells[2].textContent!.trim()).toBe('dossier');
    });
  });

  // CA-K3.5
  describe('volume (CA-K3.5)', () => {
    /** jsdom met plusieurs secondes à rendre 2 000 lignes : délai large, la mesure de temps se fait dans Chromium. */
    const VOLUME_TIMEOUT = 60_000;
    const flat = (count: number): readonly Node[] => Array.from({ length: count }, (_, index) => node(`n${index}`, index));

    // Le critère « moins de 500 ms » se mesure dans un vrai navigateur (jsdom rend ~8 fois plus lentement) :
    // voir la vérification Chromium du rapport de QA ; ici, exactitude du rendu à la limite.
    it('CA-K3.5 : 2 000 nœuds visibles rendus sans troncature ni mention', async () => {
      const { rows, element } = await setup((host) => host.data.set(flat(2000)));
      expect(rows().length).toBe(2000);
      expect(element.querySelector('.lc-table__notice')).toBeNull();
    }, VOLUME_TIMEOUT);

    it('CA-K3.5 : 2 001 nœuds visibles → 2 000 lignes, troncature signalée (role="status") et avertissement en développement', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const { rows, element } = await setup((host) => host.data.set(flat(2001)));
      expect(rows().length).toBe(2000);
      expect(element.querySelector('.lc-table__notice')!.getAttribute('role')).toBe('status');
      expect(element.querySelector('.lc-table__notice')!.textContent).toBe('2000 premières lignes affichées');
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain('lc-tree-table');
      warn.mockRestore();
    }, VOLUME_TIMEOUT);

    it('la limite porte sur les lignes visibles : un grand arbre replié n\'est pas tronqué', async () => {
      const big = Array.from({ length: 100 }, (_, index) => node(`p${index}`, index, Array.from({ length: 50 }, (__, child) => node(`p${index}-${child}`, child))));
      const { rows, element } = await setup((host) => host.data.set(big));
      expect(rows().length).toBe(100);
      expect(element.querySelector('.lc-table__notice')).toBeNull();
    });

    it('un arbre profond déplié est tronqué à 2 000 lignes visibles, signalé', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const big = Array.from({ length: 100 }, (_, index) => node(`p${index}`, index, Array.from({ length: 50 }, (__, child) => node(`p${index}-${child}`, child))));
      const { rows, element } = await setup((host) => { host.data.set(big); host.expandAll.set(true); });
      expect(rows().length).toBe(2000);
      expect(element.querySelector('.lc-table__notice')).not.toBeNull();
      warn.mockRestore();
    }, VOLUME_TIMEOUT);
  });

  // Données incorrectes
  describe('données incohérentes', () => {
    it('un cycle (un nœud est son propre descendant) ne boucle pas : le nœud répété n\'est pas affiché sous lui-même', async () => {
      const a: { id: string; name: string; size: number; children?: Node[] } = { id: 'a', name: 'Nœud a', size: 1, children: [] };
      const b: { id: string; name: string; size: number; children?: Node[] } = { id: 'b', name: 'Nœud b', size: 2, children: [a] };
      a.children!.push(b);
      const { names } = await setup((host) => { host.data.set([a]); host.expandAll.set(true); });
      expect(names()).toEqual(['a', 'b']);
    });

    it('un nœud qui se contient lui-même : une seule ligne, sans boucle', async () => {
      const self: { id: string; name: string; size: number; children?: Node[] } = { id: 's', name: 'Nœud s', size: 1, children: [] };
      self.children!.push(self);
      const { names, row } = await setup((host) => { host.data.set([self]); host.expandAll.set(true); });
      expect(names()).toEqual(['s']);
      expect(row('s').hasAttribute('aria-expanded')).toBe(true);
    });

    it('un cycle avec filtre ne boucle pas', async () => {
      const a: { id: string; name: string; size: number; children?: Node[] } = { id: 'a', name: 'Nœud a', size: 1, children: [] };
      const b: { id: string; name: string; size: number; children?: Node[] } = { id: 'b', name: 'Nœud b', size: 2, children: [a] };
      a.children!.push(b);
      const { names } = await setup((host) => { host.data.set([a]); host.filter.set((item) => item.id === 'b'); });
      expect(names()).toEqual(['a', 'b']);
    });

    it('`children` renvoyant null ou undefined est traité comme une feuille', async () => {
      const { names, row } = await setup((host) => host.data.set([{ id: 'x', name: 'Nœud x', size: 1, children: undefined }, { id: 'y', name: 'Nœud y', size: 2, children: null as unknown as undefined }]));
      expect(names()).toEqual(['x', 'y']);
      expect(row('x').hasAttribute('aria-expanded')).toBe(false);
    });

    it('données vides : message « Aucune donnée »', async () => {
      const { element } = await setup((host) => host.data.set([]));
      expect(element.querySelector('tbody tr.lc-table__empty td')!.textContent).toBe('Aucune donnée');
    });

    it('identités dupliquées entre frères : rendu sans exception, une ligne par nœud', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const duplicated = [node('dup', 1), node('dup', 2), node('uniq', 3)];
      const { rows } = await setup((host) => host.data.set(duplicated));
      expect(rows().length).toBe(3);
      warn.mockRestore();
      error.mockRestore();
    });

    it('identités dupliquées : avertissement en développement, navigation ↓ ↑ correcte sur chaque ligne', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { rows, key } = await setup((host) => host.data.set([node('dup', 1), node('dup', 2), node('uniq', 3)]));
      expect(warn.mock.calls.some((call) => String(call[0]).includes('trackBy'))).toBe(true);
      const all = rows();
      all[0].focus();
      await key(all[0], 'ArrowDown');
      expect(document.activeElement).toBe(rows()[1]);
      expect(rows().filter((row) => row.getAttribute('tabindex') === '0')).toEqual([rows()[1]]);
      await key(rows()[1], 'ArrowDown');
      expect(document.activeElement).toBe(rows()[2]);
      await key(rows()[2], 'ArrowUp');
      await key(document.activeElement!, 'ArrowUp');
      expect(document.activeElement).toBe(rows()[0]);
      warn.mockRestore();
      error.mockRestore();
    });

    it('identités dupliquées avec enfants : un seul tabindex=0 après dépliage au clavier', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { rows, key } = await setup((host) => host.data.set([node('dup', 1, [node('c1', 1)]), node('dup', 2, [node('c2', 2)])]));
      rows()[1].focus();
      await key(rows()[1], 'ArrowRight');
      expect(rows().filter((row) => row.getAttribute('tabindex') === '0').length).toBe(1);
      warn.mockRestore();
      error.mockRestore();
    });

    it('identités dupliquées : l\'arrêt de tabulation reste unique (CA-K3.2) ou, à défaut, un avertissement en développement signale le défaut de trackBy', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { rows } = await setup((host) => host.data.set([node('dup', 1), node('dup', 2), node('uniq', 3)]));
      const tabStops = rows().filter((row) => row.getAttribute('tabindex') === '0').length;
      const warned = warn.mock.calls.length + error.mock.calls.length > 0;
      warn.mockRestore();
      error.mockRestore();
      expect(tabStops === 1 || warned, `${tabStops} arrêts de tabulation, aucun avertissement`).toBe(true);
    });

    it('identités dupliquées entre parents différents : chaque ligne reste distincte et les attributs ARIA restent corrects', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const shared = [
        node('p1', 1, [node('conf', 1), node('lisez', 2)]),
        node('p2', 2, [node('conf', 3)]),
      ];
      const { rows, names } = await setup((host) => { host.data.set(shared); host.expandAll.set(true); });
      expect(names()).toEqual(['p1', 'conf', 'lisez', 'p2', 'conf']);
      expect(rows().map((row) => row.getAttribute('aria-level'))).toEqual(['1', '2', '2', '1', '2']);
      warn.mockRestore();
      error.mockRestore();
    });
  });

  describe('entrée en cascade', () => {
    const revealed = (rows: HTMLElement[]) => rows.filter((row) => row.classList.contains('lc-reveal')).length;
    // jsdom n'a pas AnimationEvent : un évènement simple porte le nom d'animation.
    const animation = (target: Element, type: 'animationend' | 'animationcancel', name = 'lc-reveal-in') =>
      target.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { animationName: name }));

    it('la cascade se termine à la fin de la dernière ligne, et les lignes dépliées ensuite ne la rejouent pas', async () => {
      const { rows, row, update, fixture } = await setup();
      expect(rows()).toHaveLength(3);
      expect(revealed(rows())).toBe(3);
      animation(rows()[1], 'animationend');
      await fixture.whenStable();
      expect(revealed(rows())).toBe(3); // pas la dernière : la cascade continue
      animation(rows()[2], 'animationend');
      await fixture.whenStable();
      expect(revealed(rows())).toBe(0);
      await update((host) => host.expanded.set(new Set(['A'])));
      expect(rows()).toHaveLength(5);
      expect(revealed(rows())).toBe(0);
      expect(row('A1')).toBeDefined();
    });

    it('ignore ce qui ne vient pas d\'une ligne ou n\'est pas l\'animation d\'entrée', async () => {
      const { rows, fixture } = await setup();
      animation(rows()[2].querySelector('td')!, 'animationend');
      animation(rows()[2], 'animationend', 'autre');
      await fixture.whenStable();
      expect(revealed(rows())).toBe(3);
    });

    it('une animation annulée sur la dernière ligne clôt aussi l\'entrée', async () => {
      const { rows, fixture } = await setup();
      animation(rows()[2], 'animationcancel');
      await fixture.whenStable();
      expect(revealed(rows())).toBe(0);
    });

    it('seules les 30 premières lignes entrent ; la 30e clôt la cascade', async () => {
      const many = Array.from({ length: 40 }, (_, index) => node(`N${index}`, index));
      const { rows, fixture } = await setup((host) => host.data.set(many));
      expect(rows()).toHaveLength(40);
      expect(revealed(rows())).toBe(30);
      expect(rows()[30].classList.contains('lc-reveal')).toBe(false);
      animation(rows()[29], 'animationend');
      await fixture.whenStable();
      expect(revealed(rows())).toBe(0);
    });
  });
});

@Component({
  imports: [LcTreeTableComponent, LcCellDirective],
  template: `
    <lc-tree-table caption="Avec contrôles" [data]="data" [children]="children" [columns]="columns" [trackBy]="trackBy" expandAllInitially>
      <ng-template lcCell="name" let-node><button class="inside" type="button">{{ node.name }}</button></ng-template>
    </lc-tree-table>
  `,
})
class ButtonCellHostComponent {
  readonly data = [node('A', 1, [node('A1', 2)])];
  readonly children = (item: Node) => item.children;
  readonly trackBy = (item: Node) => item.id;
  readonly columns: readonly LcTableColumn<Node>[] = [{ id: 'name', header: 'Nom', value: (item) => item.name }];
}
