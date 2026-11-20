import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcBadgeComponent } from '../badge/badge.component';
import { LcMessageComponent } from '../message/message.component';

const LONG = 'Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious';

/**
 * Message bubble of a conversation thread: author, date and body, in a `received`, `sent` or `restricted` variant.
 * A `[lcMessageMention]` slot takes a badge or any short marker.
 *
 * Import: `import { LcMessageComponent } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<LcMessageComponent> = {
  title: 'Feedback/Message',
  component: LcMessageComponent,
  decorators: [moduleMetadata({ imports: [LcMessageComponent, LcBadgeComponent] })],
  argTypes: { variant: { control: 'inline-radio', options: ['received', 'sent', 'restricted'] } },
  args: { variant: 'received', author: 'Alex Martin', date: '12 mars 2026, 14:30', dateTime: '2026-03-12T14:30' },
};
export default meta;
type Story = StoryObj<LcMessageComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="max-width:32rem"><lc-message [variant]="variant" [author]="author" [date]="date" [dateTime]="dateTime">
      Bonjour, voici les détails complémentaires.</lc-message></div>`,
  }),
};

/** The three variants side by side. */
export const Variants: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);max-width:32rem">
      <lc-message variant="received" author="Alex Martin" date="12 mars 2026, 14:30" dateTime="2026-03-12T14:30">Message reçu.</lc-message>
      <lc-message variant="sent" author="Vous" date="12 mars 2026, 14:42" dateTime="2026-03-12T14:42">Message envoyé par la personne connectée.</lc-message>
      <lc-message variant="restricted" author="Sam Durand" date="12 mars 2026, 15:00" dateTime="2026-03-12T15:00">Note à diffusion restreinte.</lc-message>
    </div>`,
  }),
};

/** The `[lcMessageMention]` slot, filled with a badge. */
export const WithMention: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:32rem"><lc-message author="Alex Martin" date="12 mars 2026" dateTime="2026-03-12">
      Message avec mention.<lc-badge lcMessageMention size="small" themeColor="primary">Nouveau</lc-badge></lc-message></div>`,
  }),
};

/** Without author, no empty author block; without author and date, no header (except the restricted note, which keeps its marker). */
export const WithoutAuthor: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);max-width:32rem">
      <lc-message date="12 mars 2026" dateTime="2026-03-12">Reçu, sans auteur.</lc-message>
      <lc-message>Reçu, sans auteur ni date.</lc-message>
      <lc-message variant="restricted">Note restreinte sans auteur ni date.</lc-message>
    </div>`,
  }),
};

/** Very long word and author: text wraps, nothing overflows. */
export const LongContent: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { long: LONG },
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);max-width:20rem">
      <lc-message [author]="long" date="12 mars 2026">{{ long }}</lc-message>
      <lc-message variant="sent" author="Vous">{{ long }} {{ long }}</lc-message>
      <lc-message variant="restricted" author="Sam Durand">{{ long }}</lc-message>
    </div>`,
  }),
};
