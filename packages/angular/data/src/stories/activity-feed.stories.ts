import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcActivityFeedComponent } from '../activity-feed/activity-feed.component';
import { LcActivityItemComponent } from '../activity-feed/activity-item.component';

const LONG = 'Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious';

const meta: Meta<LcActivityFeedComponent> = {
  title: 'Données/Fil d\'historique',
  component: LcActivityFeedComponent,
  decorators: [moduleMetadata({ imports: [LcActivityFeedComponent, LcActivityItemComponent] })],
  argTypes: { density: { control: 'inline-radio', options: ['comfortable', 'compact'] } },
  args: { density: 'comfortable' },
  render: (args) => ({
    props: args,
    template: `<ol lcActivityFeed [density]="density" style="max-width:32rem">
      <li lcActivityItem icon="check" heading="Étape validée" date="12 mars 2026" dateTime="2026-03-12">Le contrôle est terminé.</li>
      <li lcActivityItem icon="pencil" heading="Valeur modifiée" date="10 mars 2026" dateTime="2026-03-10">
        <s>Brouillon</s> → <strong>Publié</strong>
      </li>
      <li lcActivityItem icon="history" heading="Élément créé" date="8 mars 2026" dateTime="2026-03-08" />
    </ol>`,
  }),
};
export default meta;
type Story = StoryObj<LcActivityFeedComponent>;

export const Defaut: Story = {};

export const Compact: Story = { args: { density: 'compact' } };

export const Densites: Story = {
  render: () => ({
    template: `<div style="display:grid;gap:32px;max-width:32rem">
      @for (density of ['comfortable', 'compact']; track density) {
        <ol lcActivityFeed [density]="density">
          <li lcActivityItem icon="check" heading="Étape validée" date="12 mars 2026" dateTime="2026-03-12">Le contrôle est terminé.</li>
          <li lcActivityItem icon="history" heading="Élément créé" date="8 mars 2026" dateTime="2026-03-08" />
        </ol>
      }</div>`,
  }),
};

/** Aucun événement : pas de trait. */
export const Vide: Story = {
  render: () => ({ template: `<ol lcActivityFeed style="max-width:32rem"></ol>` }),
};

/** Un seul élément : pas de trait orphelin. */
export const UnSeulElement: Story = {
  render: () => ({
    template: `<ol lcActivityFeed style="max-width:32rem"><li lcActivityItem icon="history" heading="Élément créé" date="8 mars 2026" dateTime="2026-03-08" /></ol>`,
  }),
};

/** Sans icône, sans date, sans contenu, ou avec une date sans valeur machine ; titre et contenu très longs. */
export const CasLimites: Story = {
  render: () => ({
    props: { long: LONG },
    template: `<ol lcActivityFeed style="max-width:24rem">
      <li lcActivityItem heading="Sans icône ni date" />
      <li lcActivityItem icon="clock" heading="Date sans valeur machine" date="hier" />
      <li lcActivityItem icon="pencil" [heading]="long" date="12 mars 2026" dateTime="2026-03-12">{{ long }}</li>
    </ol>`,
  }),
};
