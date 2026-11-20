import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcAppShellComponent } from '../app-shell/app-shell.component';

const meta: Meta<LcAppShellComponent> = {
  title: 'Layout/App shell',
  component: LcAppShellComponent,
  decorators: [moduleMetadata({ imports: [LcAppShellComponent, LcButtonComponent, LcIconComponent] })],
  parameters: { layout: 'fullscreen' },
  argTypes: { navMode: { control: 'inline-radio', options: ['auto', 'side', 'drawer', 'none'] } },
  args: { navMode: 'auto', navLabel: 'Navigation principale' },
  render: (args) => ({
    props: args,
    template: `
      <lc-app-shell [navMode]="navMode" [navLabel]="navLabel">
        <strong lcShellHeader>Application</strong>
        <ul lcShellNav style="margin:0;padding:0;list-style:none">
          <li><a href="#">Première page</a></li>
          <li><a href="#">Seconde page</a></li>
        </ul>
        <p style="padding:16px">Contenu principal.</p>
      </lc-app-shell>`,
  }),
};
export default meta;
type Story = StoryObj<LcAppShellComponent>;

export const Defaut: Story = {};

/** `navMode="none"` : ni bouton de menu, ni navigation, ni tiroir ; l'en-tête et le contenu pleine largeur restent. */
export const SansNavigation: Story = {
  args: { navMode: 'none' },
  render: (args) => ({
    props: args,
    template: `
      <lc-app-shell [navMode]="navMode">
        <strong lcShellHeader>Application</strong>
        <button lcShellHeader lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" aria-label="Changer de thème" style="margin-inline-start:auto">
          <lc-icon name="sun" />
        </button>
        <div style="display:grid;place-items:center;min-height:60dvh;padding:16px">
          <p>Contenu centré, sans navigation.</p>
        </div>
      </lc-app-shell>`,
  }),
};
