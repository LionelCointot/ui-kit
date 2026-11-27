import { ChangeDetectionStrategy, Component, DestroyRef, ViewEncapsulation, inject, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcIconComponent, LcRevealDirective } from '@lionelcointot/ui-angular';
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
type Args = DrawerData & Required<Pick<LcDrawerConfig<DrawerData>, 'side' | 'size' | 'dismissible'>>;

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
  args: { title: 'Ajouter un élément', hideClose: false, side: 'end', size: 'medium', dismissible: true },
  argTypes: {
    side: { control: 'inline-radio', options: ['start', 'end'], description: 'Service config `side`.' },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'], description: 'Service config `size`.' },
    dismissible: { control: 'boolean', description: 'Service config `dismissible`: Escape, backdrop click and close button.' },
  },
};
export default meta;
type Story = StoryObj<Args>;

/** Click the button to open the drawer: every control (title, close button, side, size, dismissal) is applied. */
export const Playground: Story = {
  // S'ouvre au clic : la vérification des contrôles clique sur le bouton avant de comparer le rendu.
  // dismissible : comportement à la fermeture, sans effet visible sur le rendu.
  parameters: { controlsCheck: { openWith: 'button', stateDependent: ['dismissible'] } },
  render: (args) => ({
    props: {
      config: {
        side: args.side, size: args.size, dismissible: args.dismissible,
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
    props: { config: { size: 'large', dismissible: false, data: { title: 'Action obligatoire' } } satisfies LcDrawerConfig<DrawerData> },
    template: `<lc-drawer-demo [config]="config" />`,
  }),
};

const ANIMATION_CODE = `import { Component, inject } from '@angular/core';
import { LcButtonComponent, LcRevealDirective } from '@lionelcointot/ui-angular';
import { LcDrawerComponent, LcDrawerService } from '@lionelcointot/ui-angular/overlay';

// The drawer sets the cascade: every lcReveal inside it appears in turn.
@Component({
  selector: 'app-drawer-content',
  imports: [LcDrawerComponent, LcRevealDirective],
  template: \`
    <lc-drawer title="Détail">
      @for (line of lines; track line) {
        <p lcReveal>{{ line }}</p>
      }
    </lc-drawer>\`,
})
export class DrawerContentComponent {
  protected readonly lines = ['Première ligne', 'Deuxième ligne', 'Troisième ligne'];
}

@Component({
  selector: 'app-example',
  imports: [LcButtonComponent],
  template: \`<button lcButton type="button" (click)="open()">Ouvrir le tiroir</button>\`,
})
export class ExampleComponent {
  private readonly drawers = inject(LcDrawerService);

  protected open(): void {
    this.drawers.open(DrawerContentComponent, { size: 'small' });
  }
}`;

/** Content of the `Animation` drawer: four lines in `lcReveal`, in cascade under the `lcStagger` that `lc-drawer` sets. */
@Component({
  selector: 'lc-drawer-animation-content',
  imports: [LcDrawerComponent, LcRevealDirective],
  // Demo only: 20 rem wide, like the catalogue demo d25 (the panel lives outside the component, hence the global rule).
  encapsulation: ViewEncapsulation.None,
  styles: '.lc-drawer-panel:has(lc-drawer-animation-content) { inline-size: calc(var(--lc-sys-space-16) * 5); }',
  template: `
    <lc-drawer title="Détail de la tâche">
      @for (line of lines; track line) {
        <p lcReveal>{{ line }}</p>
      }
    </lc-drawer>`,
})
class DrawerAnimationContentComponent {
  protected readonly lines = ['Préparer la réunion', 'Relire le compte rendu', 'Envoyer les invitations', 'Mettre à jour le planning'];
}

/** Demo of the `Animation` story: "Rejouer" closes the drawer if it is open, then opens it again. */
@Component({
  selector: 'lc-drawer-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcButtonComponent, StoryMotionNoticeComponent],
  template: `
    <lc-story-motion-notice />
    <div data-demo="d25" #root style="display:flex;gap:var(--lc-sys-space-3);align-items:center;padding-block:var(--lc-sys-space-8)">
      <button lcButton fillMode="outline" size="small" (click)="replayer.replay(root)">Rejouer</button>
      <button lcButton type="button" (click)="show()">Ouvrir le tiroir</button>
    </div>`,
})
class DrawerAnimationDemoComponent {
  private readonly drawers = inject(LcDrawerService);
  private ref: LcDrawerRef | undefined;
  protected readonly replayer = replayable({
    reset: () => this.ref?.close(),
    play: () => this.show(),
    destroyRef: inject(DestroyRef),
  });

  protected show(): void {
    this.ref = this.drawers.open(DrawerAnimationContentComponent, { size: 'small' });
  }
}

/** The drawer slides in over its whole width in 550 ms and out in 300 ms, the backdrop fades in 300 ms and out in 200 ms, and the lines of its content appear in cascade. Below 768 px it is a bottom sheet. "Rejouer" opens it again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  decorators: [moduleMetadata({ imports: [DrawerAnimationDemoComponent] })],
  render: () => ({ template: `<lc-drawer-animation-demo />` }),
};
