import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcIconComponent } from './icon.component';

const meta: Meta<LcIconComponent> = {
  title: 'Actions/Icône',
  component: LcIconComponent,
  decorators: [moduleMetadata({ imports: [LcIconComponent] })],
};
export default meta;
type Story = StoryObj<LcIconComponent>;

const NOTIFICATIONS_ET_ECHANGES = ['bell', 'bell-off', 'inbox', 'message-square', 'send', 'mail', 'history'];
const NAVIGATION_ET_REGLAGES = [
  'building-2', 'layout-dashboard', 'arrow-right-left', 'sliders-horizontal', 'list', 'list-checks', 'wrench', 'circle-help',
];
const ATTENTE_ET_DOCUMENTS = ['hourglass', 'timer', 'file-text', 'image', 'image-plus'];

function gallery(names: string[]): string {
  const cells = names
    .map((name) => `<li style="display:grid;justify-items:center;gap:8px;width:120px"><lc-icon name="${name}" size="large" /><code>${name}</code></li>`)
    .join('');
  return `<ul style="display:flex;flex-wrap:wrap;gap:16px;margin:0;padding:0;list-style:none">${cells}</ul>`;
}

/** Notifications et échanges : cloche, boîte de réception, messages. */
export const NotificationsEtEchanges: Story = { render: () => ({ template: gallery(NOTIFICATIONS_ET_ECHANGES) }) };

/** Navigation et réglages. */
export const NavigationEtReglages: Story = { render: () => ({ template: gallery(NAVIGATION_ET_REGLAGES) }) };

/** Attente et documents. */
export const AttenteEtDocuments: Story = { render: () => ({ template: gallery(ATTENTE_ET_DOCUMENTS) }) };
