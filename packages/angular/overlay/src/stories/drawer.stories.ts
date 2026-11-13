import { Component, inject, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcDrawerComponent } from '../drawer/drawer.component';
import { LcDrawerInitialFocusDirective } from '../drawer/drawer-initial-focus.directive';
import { LC_DRAWER_DATA, LcDrawerRef } from '../drawer/drawer-ref';
import { LcDrawerService, type LcDrawerConfig } from '../drawer/drawer.service';

const PARAGRAPHS = Array.from({ length: 14 }, (_, index) => `Paragraphe ${index + 1} : le contenu du corps défile sous l'en-tête et au-dessus du pied d'actions.`);

/** Composant ouvert dans le tiroir : il place `lc-drawer` dans son gabarit et se ferme avec un résultat. */
@Component({
  selector: 'lc-drawer-demo-content',
  imports: [LcDrawerComponent, LcDrawerInitialFocusDirective, LcButtonComponent],
  template: `
    <lc-drawer [title]="data.title">
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
  protected readonly data = inject(LC_DRAWER_DATA) as { title: string };
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
  readonly config = input<LcDrawerConfig<{ title: string }>>({ data: { title: 'Ajouter un élément' } });

  protected open(): void {
    this.drawers.open<DrawerDemoContentComponent, { title: string }, string>(DrawerDemoContentComponent, this.config())
      .afterClosed().subscribe((value) => (this.result = value));
  }
}

const meta: Meta<DrawerDemoComponent> = {
  title: 'Superpositions/Tiroir',
  decorators: [moduleMetadata({ imports: [DrawerDemoComponent, LcDrawerComponent, LcDrawerInitialFocusDirective, LcButtonComponent, LcIconComponent] })],
  render: (args) => ({ props: args, template: `<lc-drawer-demo />` }),
};
export default meta;
type Story = StoryObj<DrawerDemoComponent>;

/** Ouvre le tiroir par le service : focus piégé et restitué, Échap et clic sur le voile ferment. */
export const Defaut: Story = {};

/** Aperçu statique de la mise en page (sans voile) : en-tête, corps défilant, pied d'actions. */
export const ApercuStatique: Story = {
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

export const OuvertureAGauche: Story = {
  render: () => ({
    props: { config: { side: 'start', size: 'small', data: { title: 'Filtres' } } satisfies LcDrawerConfig<{ title: string }> },
    template: `<lc-drawer-demo [config]="config" />`,
  }),
};

/** Sans fermeture : Échap, voile et bouton de fermeture sans effet ; seules les actions ferment. */
export const SansFermeture: Story = {
  render: () => ({
    props: { config: { size: 'large', disableClose: true, data: { title: 'Action obligatoire' } } satisfies LcDrawerConfig<{ title: string }> },
    template: `<lc-drawer-demo [config]="config" />`,
  }),
};
