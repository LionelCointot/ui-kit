import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcMenuComponent } from '../menu/menu.component';
import { LcMenuItemComponent } from '../menu/menu-item.component';
import { LcMenuTriggerDirective } from '../menu/menu-trigger.directive';

type Args = LcMenuComponent & { itemIcon: string; destructive: boolean; itemDisabled: boolean };

/**
 * Contextual menu opened by any element carrying `[lcMenuTriggerFor]`. It holds `button[lcMenuItem]` entries
 * (with optional icon, `destructive` style and disabled state). Arrows, Home, End and type-ahead move through items; Escape closes and returns focus to the trigger.
 *
 * Import: `import { LcMenuComponent, LcMenuItemComponent, LcMenuTriggerDirective } from '@lionelcointot/ui-angular/navigation';`
 */
const meta: Meta<Args> = {
  title: 'Navigation/Menu',
  component: LcMenuComponent,
  decorators: [moduleMetadata({ imports: [LcMenuComponent, LcMenuItemComponent, LcMenuTriggerDirective] })],
  args: { ariaLabel: 'Actions du dossier', itemIcon: 'pencil', destructive: true, itemDisabled: false },
  argTypes: {
    itemIcon: { control: 'select', options: ['pencil', 'copy', 'download', 'settings'], description: 'Input `icon` of the first `lcMenuItem`.' },
    destructive: { control: 'boolean', description: 'Input `destructive` of the last `lcMenuItem`.' },
    itemDisabled: { control: 'boolean', description: 'Native `disabled` attribute of the middle `lcMenuItem`.' },
    opened: { action: 'opened' },
    closed: { action: 'closed' },
  },
};
export default meta;
type Story = StoryObj<Args>;

/** Every input is bound: open the menu with the button, then change the controls. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `
      <button type="button" [lcMenuTriggerFor]="menu">Actions</button>
      <lc-menu #menu [ariaLabel]="ariaLabel" (opened)="opened($event)" (closed)="closed($event)">
        <button lcMenuItem [icon]="itemIcon">Renommer</button>
        <button lcMenuItem [disabled]="itemDisabled">Verrouiller</button>
        <button lcMenuItem [destructive]="destructive" icon="x">Supprimer</button>
      </lc-menu>`,
  }),
};

/** A menu with icons, a disabled entry (skipped by the keyboard) and a destructive entry. */
export const WithIconsAndStates: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <button type="button" [lcMenuTriggerFor]="menu">Plus d'actions</button>
      <lc-menu #menu ariaLabel="Plus d'actions">
        <button lcMenuItem icon="pencil">Renommer</button>
        <button lcMenuItem icon="copy">Dupliquer</button>
        <button lcMenuItem icon="download">Exporter</button>
        <button lcMenuItem icon="lock" disabled>Verrouillé</button>
        <button lcMenuItem icon="x" destructive>Supprimer</button>
      </lc-menu>`,
  }),
};
