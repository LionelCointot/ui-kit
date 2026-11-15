import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcBadgeComponent } from '../badge/badge.component';
import { LcMessageComponent } from '../message/message.component';

const LONG = 'Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious';

const meta: Meta<LcMessageComponent> = {
  title: 'Retours d\'état/Message',
  component: LcMessageComponent,
  decorators: [moduleMetadata({ imports: [LcMessageComponent, LcBadgeComponent] })],
  argTypes: { variant: { control: 'inline-radio', options: ['received', 'sent', 'restricted'] } },
  args: { variant: 'received', author: 'Alex Martin', date: '12 mars 2026, 14:30', dateTime: '2026-03-12T14:30' },
  render: (args) => ({
    props: args,
    template: `<div style="max-width:32rem"><lc-message [variant]="variant" [author]="author" [date]="date" [dateTime]="dateTime">
      Bonjour, voici les informations demandées.</lc-message></div>`,
  }),
};
export default meta;
type Story = StoryObj<LcMessageComponent>;

export const Defaut: Story = {};

export const Variantes: Story = {
  render: () => ({
    template: `<div style="display:grid;gap:12px;max-width:32rem">
      <lc-message variant="received" author="Alex Martin" date="12 mars 2026, 14:30" dateTime="2026-03-12T14:30">Message reçu.</lc-message>
      <lc-message variant="sent" author="Vous" date="12 mars 2026, 14:42" dateTime="2026-03-12T14:42">Message envoyé par la personne connectée.</lc-message>
      <lc-message variant="restricted" author="Sam Durand" date="12 mars 2026, 15:00" dateTime="2026-03-12T15:00">Note à diffusion restreinte.</lc-message>
    </div>`,
  }),
};

/** Emplacement `[lcMessageMention]` : un badge, par exemple. */
export const AvecMention: Story = {
  render: () => ({
    template: `<div style="max-width:32rem"><lc-message author="Alex Martin" date="12 mars 2026" dateTime="2026-03-12">
      Message avec mention.<lc-badge lcMessageMention size="small" themeColor="primary">Nouveau</lc-badge></lc-message></div>`,
  }),
};

/** Sans auteur : pas de bloc d'auteur vide ; sans auteur ni date, pas d'en-tête (sauf la note restreinte, qui garde son repère). */
export const SansAuteur: Story = {
  render: () => ({
    template: `<div style="display:grid;gap:12px;max-width:32rem">
      <lc-message date="12 mars 2026" dateTime="2026-03-12">Reçu, sans auteur.</lc-message>
      <lc-message>Reçu, sans auteur ni date.</lc-message>
      <lc-message variant="restricted">Note restreinte sans auteur ni date.</lc-message>
    </div>`,
  }),
};

/** Mot très long, auteur très long : retour à la ligne, aucun débordement. */
export const ContenuTresLong: Story = {
  render: () => ({
    props: { long: LONG },
    template: `<div style="display:grid;gap:12px;max-width:20rem">
      <lc-message [author]="long" date="12 mars 2026">{{ long }}</lc-message>
      <lc-message variant="sent" author="Vous">{{ long }} {{ long }}</lc-message>
      <lc-message variant="restricted" author="Sam Durand">{{ long }}</lc-message>
    </div>`,
  }),
};
