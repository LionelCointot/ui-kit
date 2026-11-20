import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcActivityFeedComponent } from '../activity-feed/activity-feed.component';
import { LcActivityItemComponent } from '../activity-feed/activity-item.component';

const LONG = 'Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious_Supercalifragilisticexpialidocious';

/**
 * Vertical history feed (ordered list): each item has an icon, a heading, a date and optional content, linked by a line.
 * Applied to a native `<ol>` (`ol[lcActivityFeed]`) holding `<li lcActivityItem>` elements. `density` tightens the spacing.
 *
 * Import: `import { LcActivityFeedComponent, LcActivityItemComponent } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<LcActivityFeedComponent> = {
  title: 'Data/Activity feed',
  component: LcActivityFeedComponent,
  decorators: [moduleMetadata({ imports: [LcActivityFeedComponent, LcActivityItemComponent] })],
  args: { density: 'comfortable' },
  argTypes: { density: { control: 'inline-radio', options: ['comfortable', 'compact'] } },
};
export default meta;
type Story = StoryObj<LcActivityFeedComponent>;

/** Every input is bound: change the density in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<ol lcActivityFeed [density]="density" style="max-width:32rem">
      <li lcActivityItem icon="check" heading="Étape validée" date="12 mars 2026" dateTime="2026-03-12">Le contrôle est terminé.</li>
      <li lcActivityItem icon="pencil" heading="Valeur modifiée" date="10 mars 2026" dateTime="2026-03-10">
        <s>Brouillon</s> → <strong>Publié</strong>
      </li>
      <li lcActivityItem icon="history" heading="Élément créé" date="8 mars 2026" dateTime="2026-03-08"></li>
    </ol>`,
  }),
};

/** Both densities side by side. */
export const Densities: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-6);max-width:32rem">
      @for (density of ['comfortable', 'compact']; track density) {
        <ol lcActivityFeed [density]="density">
          <li lcActivityItem icon="check" heading="Étape validée" date="12 mars 2026" dateTime="2026-03-12">Le contrôle est terminé.</li>
          <li lcActivityItem icon="history" heading="Élément créé" date="8 mars 2026" dateTime="2026-03-08"></li>
        </ol>
      }</div>`,
  }),
};

/** No event: no line is drawn. */
export const Empty: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<ol lcActivityFeed style="max-width:32rem"></ol>` }),
};

/** A single item: no orphan line. */
export const SingleItem: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<ol lcActivityFeed style="max-width:32rem"><li lcActivityItem icon="history" heading="Élément créé" date="8 mars 2026" dateTime="2026-03-08"></li></ol>`,
  }),
};

/** Without icon, date or content, or with a date that has no machine value; very long heading and content. */
export const EdgeCases: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { long: LONG },
    template: `<ol lcActivityFeed style="max-width:24rem">
      <li lcActivityItem heading="Sans icône ni date"></li>
      <li lcActivityItem icon="clock" heading="Date sans valeur machine" date="hier"></li>
      <li lcActivityItem icon="pencil" [heading]="long" date="12 mars 2026" dateTime="2026-03-12">{{ long }}</li>
    </ol>`,
  }),
};
