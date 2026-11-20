import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { fixedExample } from '@lc/storybook';
import { LcAppShellComponent } from '@lionelcointot/ui-angular/layout';

/**
 * Application frame: header, side navigation (a drawer on narrow screens) and main content.
 * `navMode` forces the navigation layout; `auto` switches between side and drawer according to the width.
 *
 * Import: `import { LcAppShellComponent } from '@lionelcointot/ui-angular/layout';`
 */
const meta: Meta<LcAppShellComponent> = {
  title: 'Layout/App shell',
  component: LcAppShellComponent,
  decorators: [moduleMetadata({ imports: [LcAppShellComponent, LcButtonComponent, LcIconComponent] })],
  parameters: { layout: 'fullscreen' },
  argTypes: { navMode: { control: 'inline-radio', options: ['auto', 'side', 'drawer', 'none'] } },
  args: { navMode: 'auto', navLabel: 'Navigation principale' },
};
export default meta;
type Story = StoryObj<LcAppShellComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['navMode'] } },
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

/** `navMode="none"`: no menu button, navigation or drawer; the header and the full-width content remain. */
export const WithoutNavigation: Story = {
  parameters: fixedExample,
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
