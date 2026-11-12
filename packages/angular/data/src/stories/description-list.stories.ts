import { Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcDescriptionListComponent, type LcDescriptionItem } from '../description-list/description-list.component';

const ITEMS: LcDescriptionItem[] = [
  { term: 'Capital', value: 250000, format: 'money' },
  { term: 'Taux', value: 3.5, format: 'percent', badge: 'estimation' },
  { term: 'Durée (mois)', value: 240, format: 'integer' },
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

const meta: Meta<LcDescriptionListComponent> = {
  title: 'Données/Liste de définitions',
  component: LcDescriptionListComponent,
  decorators: [moduleMetadata({ imports: [LcDescriptionListComponent, DescriptionListDemoComponent] })],
  args: { items: ITEMS, layout: 'inline' },
  render: (args) => ({ props: args, template: `<div style="max-width:28rem"><lc-description-list [items]="items" [layout]="layout" /></div>` }),
};
export default meta;
type Story = StoryObj<LcDescriptionListComponent>;

export const Defaut: Story = {};

/** `action` par ligne : bouton plat (≥ 44 px) ; `itemAction` émet l'index de la ligne. */
export const ActionParLigne: Story = {
  render: () => ({ template: `<div style="max-width:28rem"><lc-description-list-demo /></div>` }),
};

export const ActionEmpilee: Story = {
  args: { items: WITH_ACTIONS, layout: 'stacked' },
};

/** Seules certaines lignes ont une action. */
export const ActionPartielle: Story = {
  args: { items: [WITH_ACTIONS[0], ITEMS[1], { ...ITEMS[2], emphasis: true, action: { label: 'Modifier' } }] },
};
