import { Component, signal } from '@angular/core';
import { fixedExample } from '@lc/storybook';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcDescriptionListComponent, type LcDescriptionItem } from '@lionelcointot/ui-angular/data';

const ITEMS: LcDescriptionItem[] = [
  { term: 'Budget', value: 250000, format: 'money' },
  { term: 'Avancement', value: 62.5, format: 'percent', badge: 'estimation' },
  { term: 'Tâches ouvertes', value: 24, format: 'integer' },
];

const WITH_ACTIONS: LcDescriptionItem[] = ITEMS.map((item) => ({ ...item, action: { label: 'Modifier', ariaLabel: `Modifier : ${item.term}` } }));

@Component({
  selector: 'lc-description-list-demo',
  imports: [LcDescriptionListComponent],
  template: `
    <lc-description-list [items]="items" (itemAction)="last.set(items[$event].term)" />
    <p style="margin-block-start:16px">Dernière action : {{ last() ?? 'aucune' }}</p>
  `,
})
class DescriptionListDemoComponent {
  protected readonly items = WITH_ACTIONS;
  protected readonly last = signal<string | null>(null);
}

/**
 * Definition list (`<dl>`): one term and one formatted value per row, with an optional badge, an emphasised row and a per-row action.
 * `inline` puts the term and the value on one line; `stacked` puts the value under the term. `itemAction` emits the index of the row.
 *
 * Import: `import { LcDescriptionListComponent } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<LcDescriptionListComponent> = {
  title: 'Data/Description list',
  component: LcDescriptionListComponent,
  decorators: [moduleMetadata({ imports: [LcDescriptionListComponent, DescriptionListDemoComponent] })],
  args: { layout: 'inline' },
  argTypes: {
    layout: { control: 'inline-radio', options: ['inline', 'stacked'] },
    items: { control: false },
  },
};
export default meta;
type Story = StoryObj<LcDescriptionListComponent>;

/** Every input is bound: change the layout in the Controls panel. The items are fixed demo data. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, items: ITEMS },
    template: `<div style="max-width:28rem"><lc-description-list [items]="items" [layout]="layout" /></div>`,
  }),
};

/** Data states: `undefined` shows 3 skeleton pairs, `null` or `[]` the empty message, `stale` dims the items during a reload. The last list has 3 items, for comparison. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { items: ITEMS },
    template: `<div style="display:grid;gap:var(--lc-sys-space-6);max-width:28rem">
      <section><h3>Chargement</h3><div data-qa-state="loading"><lc-description-list [items]="undefined" /></div></section>
      <section><h3>Vide</h3><div data-qa-state="empty"><lc-description-list [items]="null" /></div></section>
      <section><h3>Rechargement</h3><div data-qa-state="stale"><lc-description-list [items]="items" [stale]="true" /></div></section>
      <section><h3>Trois éléments</h3><div data-qa-state="three"><lc-description-list [items]="items" /></div></section></div>`,
  }),
};

/** One action per row: flat button (at least 44 px); `itemAction` emits the row index. */
export const ActionPerRow: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<div style="max-width:28rem"><lc-description-list-demo /></div>` }),
};

/** Actions with the stacked layout. */
export const StackedActions: Story = {
  parameters: fixedExample,
  render: () => ({ props: { items: WITH_ACTIONS }, template: `<div style="max-width:28rem"><lc-description-list [items]="items" layout="stacked" /></div>` }),
};

/** Only some rows have an action; one row is emphasised. */
export const PartialActions: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { items: [WITH_ACTIONS[0], ITEMS[1], { ...ITEMS[2], emphasis: true, action: { label: 'Modifier' } }] },
    template: `<div style="max-width:28rem"><lc-description-list [items]="items" /></div>`,
  }),
};
