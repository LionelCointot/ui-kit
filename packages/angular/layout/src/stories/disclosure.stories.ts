import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcDisclosureComponent, LcDisclosureContentDirective } from '../disclosure/disclosure.component';

const meta: Meta<LcDisclosureComponent> = {
  title: 'Mise en page/Ligne dépliable',
  component: LcDisclosureComponent,
  decorators: [moduleMetadata({ imports: [LcDisclosureComponent, LcDisclosureContentDirective, LcButtonComponent, LcIconComponent] })],
  args: { expanded: false, headingLevel: null, disabled: false, lazy: false, bordered: false },
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
export default meta;
type Story = StoryObj<LcDisclosureComponent>;

export const Defaut: Story = {};

export const Depliee: Story = { args: { expanded: true } };

export const AvecTitre: Story = { args: { headingLevel: 3, bordered: true, expanded: true } };

export const Desactivee: Story = { args: { disabled: true } };

/** Plusieurs lignes ouvertes en même temps (pas d'accordéon) ; le contenu de la dernière n'est créé qu'à l'ouverture. */
export const Liste: Story = {
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
