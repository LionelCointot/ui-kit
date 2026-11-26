// SPIKE jetable (motion v2) : sortie par directive, réordonnancement de @for, mouvement réduit, interaction avec lc-data-table.
import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcDataTableComponent, lcLocalSource, type LcDataColumn } from '@lionelcointot/ui-angular/data';
import { LcSpikeA, LcSpikeB, LcSpikeC, LcSpikeD, LcSpikeE, LcSpikeF } from './reveal-spike';

const w = window as unknown as { __starts?: string[] };
w.__starts = [];
// Chaque démarrage d'animation CSS est consigné : « nom|data-id ».
document.addEventListener('animationstart', (event) => {
  const el = event.target as HTMLElement;
  (w.__starts ??= []).push(`${event.animationName}|${el.getAttribute('data-id') ?? el.id}`);
}, true);

@Component({
  selector: 'lc-spike-lists',
  encapsulation: ViewEncapsulation.None,
  imports: [LcSpikeA, LcSpikeB, LcSpikeC, LcSpikeD, LcSpikeE, LcSpikeF],
  styles: `
    .lc-spike-reveal, .lc-spike-enter { animation: lc-spike-in 400ms ease-out backwards; animation-delay: calc(var(--lc-spike-i, 0) * 40ms); }
    .lc-spike-leave { animation: lc-spike-out 400ms ease-in forwards; }
    @keyframes lc-spike-in { from { opacity: 0; translate: 0 12px; } }
    @keyframes lc-spike-out { to { opacity: 0; translate: 0 -12px; } }
    .lc-spike-list { display: flex; gap: 4px; margin: 4px 0; padding: 0; list-style: none; }
    .lc-spike-list > li { border: 1px solid; padding: 2px 8px; }
  `,
  template: `
    <button id="reverse" (click)="reverse()">reverse</button>
    <button id="append" (click)="append()">append</button>
    <button id="prepend" (click)="prepend()">prepend</button>
    <button id="remove" (click)="remove()">remove 2</button>
    <button id="toggle" (click)="show.set(!show())">toggle if</button>
    <ul id="list-a" class="lc-spike-list">@for (n of items(); track n) { <li lcSpikeA [attr.data-id]="'a' + n" [style.--lc-spike-i]="$index">{{ n }}</li> }</ul>
    <ul id="list-b" class="lc-spike-list">@for (n of items(); track n) { <li lcSpikeB [attr.data-id]="'b' + n" [style.--lc-spike-i]="$index">{{ n }}</li> }</ul>
    <ul id="list-c" class="lc-spike-list">@for (n of items(); track n) { <li lcSpikeC [attr.data-id]="'c' + n" [style.--lc-spike-i]="$index">{{ n }}</li> }</ul>
    <ul id="list-d" class="lc-spike-list">@for (n of items(); track n) { <li lcSpikeD animate.leave="lc-spike-leave" [attr.data-id]="'d' + n" [style.--lc-spike-i]="$index">{{ n }}</li> }</ul>
    <ul id="list-e" class="lc-spike-list">@for (n of items(); track n) { <li lcSpikeE [attr.data-id]="'e' + n" [style.--lc-spike-i]="$index">{{ n }}</li> }</ul>
    <ul id="list-f" class="lc-spike-list">@for (n of items(); track n) { <li lcSpikeF [attr.data-id]="'f' + n" [style.--lc-spike-i]="$index">{{ n }}</li> }</ul>
    @if (show()) {
      <div lcSpikeE id="if-e">if E</div>
      <div lcSpikeA id="if-a">if A</div>
      <div lcSpikeB id="if-b">if B</div>
      <div lcSpikeC id="if-c">if C</div>
      <div lcSpikeD animate.leave="lc-spike-leave" id="if-d">if D</div>
    }
    <div id="attr-binding" [attr.lcSpikeA]="''">[attr.lcSpikeA] ne doit pas matcher la directive</div>
  `,
})
class SpikeListsComponent {
  protected readonly items = signal([1, 2, 3, 4, 5]);
  protected readonly show = signal(true);
  private next = 6;
  protected reverse(): void { this.items.update((list) => [...list].reverse()); }
  protected append(): void { this.items.update((list) => [...list, this.next++]); }
  protected prepend(): void { this.items.update((list) => [this.next++, ...list]); }
  protected remove(): void { this.items.update((list) => list.filter((n) => n !== 2)); }
}

interface Row { id: number; name: string }
const ROWS: readonly Row[] = Array.from({ length: 14 }, (_, i) => ({ id: i + 1, name: `Demande ${i + 1}` }));
const COLUMNS: readonly LcDataColumn<Row>[] = [{ key: 'name', label: 'Objet', sortable: true, value: (row) => row.name }];

@Component({
  selector: 'lc-spike-table',
  encapsulation: ViewEncapsulation.None,
  imports: [LcDataTableComponent, LcSpikeA],
  styles: `
    .lc-spike-reveal { animation: lc-spike-in 400ms ease-out backwards; }
    .lc-spike-leave { animation: lc-spike-out 400ms ease-in forwards; }
    @keyframes lc-spike-in { from { opacity: 0; translate: 0 12px; } }
    @keyframes lc-spike-out { to { opacity: 0; translate: 0 -12px; } }
  `,
  template: `
    <button id="fewer" (click)="rows.set(8)">8 lignes</button>
    <button id="more" (click)="rows.set(14)">14 lignes</button>
    <button id="toggle" (click)="show.set(!show())">toggle if</button>
    @if (show()) {
      @if (decorated()) {
        <lc-data-table id="tbl" lcSpikeA caption="Demandes" [source]="source()" [columns]="columns" [trackBy]="trackBy" />
      } @else {
        <lc-data-table id="tbl" caption="Demandes" [source]="source()" [columns]="columns" [trackBy]="trackBy" />
      }
    }
  `,
})
class SpikeTableComponent {
  protected readonly decorated = signal(new URLSearchParams(location.search).get('decorated') !== '0');
  protected readonly show = signal(true);
  protected readonly rows = signal(14);
  protected readonly source = computed(() => lcLocalSource(ROWS.slice(0, this.rows()), COLUMNS));
  protected readonly columns = COLUMNS;
  protected readonly trackBy = (row: Row) => row.id;
}

const meta: Meta = {
  title: 'QA/Motion spike',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [SpikeListsComponent, SpikeTableComponent] })],
};
export default meta;

export const Lists: StoryObj = { render: () => ({ template: '<lc-spike-lists />' }) };
export const Table: StoryObj = { render: () => ({ template: '<lc-spike-table />' }) };
