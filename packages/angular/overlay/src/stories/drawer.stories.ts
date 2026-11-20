import { Component, inject, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcDrawerComponent, LcDrawerInitialFocusDirective, LC_DRAWER_DATA, LcDrawerRef, LcDrawerService, type LcDrawerConfig } from '@lionelcointot/ui-angular/overlay';

interface DrawerData {
  readonly title: string;
  readonly hideClose?: boolean;
}

const PARAGRAPHS = Array.from({ length: 14 }, (_, index) => `Paragraphe ${index + 1} : le contenu du corps défile sous l'en-tête et au-dessus du pied d'actions.`);

/** Composant ouvert dans le tiroir : il place `lc-drawer` dans son gabarit et se ferme avec un résultat. */
@Component({
  selector: 'lc-drawer-demo-content',
  imports: [LcDrawerComponent, LcDrawerInitialFocusDirective, LcButtonComponent],
  template: `
    <lc-drawer [title]="data.title" [hideClose]="data.hideClose ?? false">
      <label for="demo-name">Nom</label>
      <input id="demo-name" lcDrawerInitialFocus value="Exemple" style="display:block;margin-block:4px 16px;min-block-size:44px;inline-size:100%" />
      @for (line of paragraphs; track line) {
        <p>{{ line }}</p>
      }
      <ng-container lcDrawerActions>
        <button lcButton type="button" fillMode="outline" themeColor="neutral" (click)="ref.close()">Annuler</button>
        <button lcButton type="button" (click)="ref.close('enregistré')">Enregistrer</button>
      </ng-container>
    </lc-drawer>
  `,
})
class DrawerDemoContentComponent {
  protected readonly ref = inject<LcDrawerRef<string>>(LcDrawerRef);
  protected readonly data = inject(LC_DRAWER_DATA) as DrawerData;
  protected readonly paragraphs = PARAGRAPHS;
}

@Component({
  selector: 'lc-drawer-demo',
  imports: [LcButtonComponent],
  template: `
    <button lcButton type="button" (click)="open()">Ouvrir le tiroir</button>
    <p style="margin-block-start:16px">Dernier résultat : {{ result ?? 'aucun' }}</p>
  `,
})
class DrawerDemoComponent {
  private readonly drawers = inject(LcDrawerService);
  protected result: string | undefined;
  readonly config = input<LcDrawerConfig<DrawerData>>({ data: { title: 'Ajouter un élément' } });

  protected open(): void {
    this.drawers.open<DrawerDemoContentComponent, DrawerData, string>(DrawerDemoContentComponent, this.config())
      .afterClosed().subscribe((value) => (this.result = value));
  }
}

/** Entrées de `lc-drawer` montrées dans la démo, plus les options du service passées à `open()`. */
type Args = DrawerData & Required<Pick<LcDrawerConfig<DrawerData>, 'side' | 'size' | 'disableClose' | 'closeOnBackdrop'>>;

/**
 * Side panel opened by `LcDrawerService.open(Component, config)`: focus is trapped then restored, Escape and a click on the backdrop close it.
 * The opened component places `lc-drawer` in its template for the header, scrolling body and `lcDrawerActions` footer.
 *
 * Import: `import { LcDrawerComponent, LcDrawerService } from '@lionelcointot/ui-angular/overlay';`
 */
const meta: Meta<Args> = {
  title: 'Overlays/Drawer',
  component: LcDrawerComponent,
  decorators: [moduleMetadata({ imports: [DrawerDemoComponent, LcDrawerComponent, LcDrawerInitialFocusDirective, LcButtonComponent, LcIconComponent] })],
  args: { title: 'Ajouter un élément', hideClose: false, side: 'end', size: 'medium', disableClose: false, closeOnBackdrop: true },
  argTypes: {
    side: { control: 'inline-radio', options: ['start', 'end'], description: 'Service config `side`.' },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'], description: 'Service config `size`.' },
    disableClose: { control: 'boolean', description: 'Service config `disableClose`: Escape, backdrop and close button do nothing.' },
    closeOnBackdrop: { control: 'boolean', description: 'Service config `closeOnBackdrop`.' },
  },
};
export default meta;
type Story = StoryObj<Args>;

/** Click the button to open the drawer: every control (title, close button, side, size, dismissal) is applied. */
export const Playground: Story = {
  // S'ouvre au clic : la vérification des contrôles clique sur le bouton avant de comparer le rendu.
  // closeOnBackdrop : comportement à la fermeture, sans effet visible sur le rendu.
  parameters: { controlsCheck: { openWith: 'button', stateDependent: ['closeOnBackdrop'] } },
  render: (args) => ({
    props: {
      config: {
        side: args.side, size: args.size, disableClose: args.disableClose, closeOnBackdrop: args.closeOnBackdrop,
        data: { title: args.title, hideClose: args.hideClose },
      } satisfies LcDrawerConfig<DrawerData>,
    },
    template: `<lc-drawer-demo [config]="config" />`,
  }),
};

/** Static preview of the layout (no backdrop): header, scrolling body, action footer. */
export const StaticPreview: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="block-size:28rem;inline-size:32rem;max-inline-size:100%;display:flex">
        <lc-drawer title="Ajouter un élément">
          <p>Contenu du tiroir.</p>
          <p>Le pied porte l'action principale à droite.</p>
          <ng-container lcDrawerActions>
            <button lcButton type="button" fillMode="outline" themeColor="neutral">Annuler</button>
            <button lcButton type="button">Enregistrer</button>
          </ng-container>
        </lc-drawer>
      </div>`,
  }),
};

/** Opens on the start edge, small width. */
export const OpensAtStart: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { config: { side: 'start', size: 'small', data: { title: 'Filtres' } } satisfies LcDrawerConfig<DrawerData> },
    template: `<lc-drawer-demo [config]="config" />`,
  }),
};

/** Not dismissible: Escape, backdrop and close button have no effect; only the actions close it. */
export const NotDismissible: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { config: { size: 'large', disableClose: true, data: { title: 'Action obligatoire' } } satisfies LcDrawerConfig<DrawerData> },
    template: `<lc-drawer-demo [config]="config" />`,
  }),
};
