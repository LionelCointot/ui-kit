import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcActivityFeedComponent, LcActivityItemComponent, LcDescriptionListComponent, LcKpiCardComponent } from '@lionelcointot/ui-angular/data';
import { LcProgressBarComponent } from '@lionelcointot/ui-angular/feedback';
import { LcCardComponent, LcCardHeaderComponent, LcGridComponent, LcPageComponent } from '@lionelcointot/ui-angular/layout';

/**
 * Support de CA-40 de la spec 2026-12-mouvement-v2 (tâche T10b) : une page complète sans aucun attribut de mouvement côté application
 * (`lc-page`, `lc-grid`, `lc-kpi-card`, `lc-card`, `lc-activity-feed`, `lc-description-list`) ; piloté par `node tools/qa/storybook-browser.mjs` (titre QA/Motion/Page layers).
 * `#new-page` recrée la page (entrée de page : couches), `#add-event` ajoute un événement après l'entrée (aucun délai de couche), `#add-card` ajoute une carte.
 */
@Component({
  selector: 'lc-qa-page-layers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    LcPageComponent, LcGridComponent, LcKpiCardComponent, LcCardComponent, LcCardHeaderComponent, LcActivityFeedComponent, LcActivityItemComponent,
    LcDescriptionListComponent, LcButtonComponent, StoryMotionNoticeComponent, LcProgressBarComponent,
  ],
  template: `
    <lc-story-motion-notice />
    <p>
      <button id="new-page" lcButton fillMode="outline" size="small" (click)="page.set(page() + 1)">Nouvelle page</button>
      <button id="add-event" lcButton fillMode="outline" size="small" (click)="addEvent()">Ajouter un événement</button>
      <button id="add-card" lcButton fillMode="outline" size="small" (click)="cards.set(cards() + 1)">Ajouter une carte</button>
    </p>
    @for (key of [page()]; track key) {
      <lc-page title="Tableau de bord" description="Une page sans attribut de mouvement.">
        <lc-grid [columns]="{ sm: 1, md: 3 }" gap="4" id="kpis">
          <lc-kpi-card label="Commandes" [value]="1248" format="integer" />
          <lc-kpi-card label="Panier moyen" [value]="86.4" format="money" />
          <lc-kpi-card label="Conversion" [value]="3.2" format="percent" />
        </lc-grid>
        <lc-grid [columns]="{ sm: 1, md: 3 }" gap="4" id="cards">
          @for (n of cardList(); track n) {
            <lc-card><lc-card-header [title]="'Projet ' + n" subtitle="Mis à jour aujourd'hui" /><p>Trois tâches ouvertes.</p></lc-card>
          }
        </lc-grid>
        <lc-grid [columns]="{ sm: 1, md: 2 }" gap="4">
          <lc-card>
            <lc-card-header title="Activité" />
            <ol lcActivityFeed id="feed">
              @for (event of events(); track event) {
                <li lcActivityItem icon="check" [heading]="'Étape ' + event" date="12 mars"></li>
              }
            </ol>
          </lc-card>
          <lc-card>
            <lc-card-header title="Résumé" />
            <lc-description-list id="summary" [items]="summary" />
            <div id="gauges" style="display:grid;gap:var(--lc-sys-space-2)">
              <lc-progress-bar [value]="80" label="Budget" /><lc-progress-bar [value]="60" label="Délai" /><lc-progress-bar [value]="40" label="Qualité" />
            </div>
          </lc-card>
        </lc-grid>
      </lc-page>
    }`,
})
class QaPageLayersComponent {
  protected readonly page = signal(0);
  protected readonly cards = signal(3);
  protected readonly cardList = () => Array.from({ length: this.cards() }, (_, i) => i + 1);
  protected readonly events = signal([1, 2, 3, 4]);
  protected readonly summary = [
    { term: 'Budget', value: 250000, format: 'money' as const },
    { term: 'Avancement', value: 62.5, format: 'percent' as const },
    { term: 'Total engagé', value: 300000, format: 'money' as const, emphasis: true },
  ];

  protected addEvent(): void {
    this.events.update((list) => [...list, list.length + 1]);
  }
}

const meta: Meta = {
  title: 'QA/Motion/Page layers',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaPageLayersComponent] })],
};
export default meta;
type Story = StoryObj;

/** Page complète : KPI, grille de cartes, fil d'activité et liste de définitions. */
export const FullPage: Story = { render: () => ({ template: '<lc-qa-page-layers />' }) };

/** Deux grilles faites à la main (`div` voisines, sans `lc-grid`) : chacune repart du rang 0 (CA-40, cartes). */
export const HandmadeGrids: Story = {
  decorators: [moduleMetadata({ imports: [LcPageComponent, LcCardComponent] })],
  render: () => ({
    template: `<lc-page title="Grilles">
      <div id="g1" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px"><lc-card>A1</lc-card><lc-card>A2</lc-card><lc-card>A3</lc-card></div>
      <div id="g2" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:16px"><lc-card>B1</lc-card><lc-card>B2</lc-card><lc-card>B3</lc-card></div>
    </lc-page>`,
  }),
};
