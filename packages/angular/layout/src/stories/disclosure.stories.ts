import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import {
  LcDisclosureComponent, LcDisclosureContentDirective, LcDisclosureGroupDirective,
} from '../disclosure/disclosure.component';

/**
 * Expandable row: a summary line that shows or hides its content. Optional actions, heading semantics,
 * lazy content and an exclusive accordion (`lcDisclosureGroup`).
 *
 * Import: `import { LcDisclosureComponent } from '@lionelcointot/ui-angular/layout';`
 */
const meta: Meta<LcDisclosureComponent> = {
  title: 'Layout/Disclosure',
  component: LcDisclosureComponent,
  decorators: [moduleMetadata({
    imports: [LcDisclosureComponent, LcDisclosureContentDirective, LcDisclosureGroupDirective, LcButtonComponent, LcIconComponent],
  })],
  args: { expanded: false, headingLevel: null, disabled: false, lazy: false, bordered: false },
  argTypes: { headingLevel: { control: 'select', options: [null, 2, 3, 4, 5, 6] } },
};
export default meta;
type Story = StoryObj<LcDisclosureComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `
      <lc-disclosure [(expanded)]="expanded" [headingLevel]="headingLevel" [disabled]="disabled" [lazy]="lazy" [bordered]="bordered">
        <span lcDisclosureSummary><strong>Détails de l'élément</strong> <span style="color:var(--lc-sys-color-on-surface-muted)">· mis à jour il y a 2 min</span></span>
        <button lcDisclosureActions lcButton type="button" fillMode="outline" themeColor="neutral">Relancer</button>
        <p>Contenu de la ligne dépliée.</p>
      </lc-disclosure>`,
  }),
};

/** Starts open. */
export const Expanded: Story = { ...Playground, parameters: fixedExample, args: { expanded: true } };

/** A heading level gives the summary heading semantics for the page outline. */
export const WithHeading: Story = { ...Playground, parameters: fixedExample, args: { headingLevel: 3, bordered: true, expanded: true } };

/** A disabled row cannot be toggled. */
export const Disabled: Story = { ...Playground, parameters: fixedExample, args: { disabled: true } };

/** Several rows open at once (no exclusive group); the last row's content is only created on first open. */
export const List: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <lc-disclosure bordered [expanded]="true"><span lcDisclosureSummary>Première ligne</span><p>Contenu A</p></lc-disclosure>
      <lc-disclosure bordered><span lcDisclosureSummary>Deuxième ligne</span><p>Contenu B</p></lc-disclosure>
      <lc-disclosure bordered lazy>
        <span lcDisclosureSummary>Troisième ligne (contenu créé à l'ouverture)</span>
        <ng-template lcDisclosureContent><p>Contenu C</p></ng-template>
      </lc-disclosure>`,
  }),
};

/** Accordion: in an `exclusive` `lcDisclosureGroup`, opening a row closes the others (the parent drives `exclusive`, for instance by width). */
export const Accordion: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div lcDisclosureGroup exclusive>
        <lc-disclosure bordered headingLevel="3" [expanded]="true"><span lcDisclosureSummary>Première section</span><p>Contenu A</p></lc-disclosure>
        <lc-disclosure bordered headingLevel="3"><span lcDisclosureSummary>Deuxième section</span><p>Contenu B</p></lc-disclosure>
        <lc-disclosure bordered headingLevel="3"><span lcDisclosureSummary>Troisième section</span><p>Contenu C</p></lc-disclosure>
      </div>`,
  }),
};
