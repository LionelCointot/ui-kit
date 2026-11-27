import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcBarChartComponent, LcSparklineComponent } from '@lionelcointot/ui-angular/charts';

// Fixture de QA du mouvement des graphiques (T11) : un graphique de chaque famille, sans bouton ; durée et décalage viennent des tokens `--lc-chart-*`.
const meta: Meta = {
  title: 'QA/Charts motion',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [LcSparklineComponent, LcBarChartComponent] })],
};
export default meta;

export const Tokens: StoryObj = {
  render: () => ({
    props: { values: [3, 5, 4, 7, 6], data: { categories: ['a', 'b', 'c', 'd'], series: [{ id: 's', label: 'S', values: [4, 6, 5, 7] }] } },
    template: `
      <div data-qa="sparkline" style="width:200px"><lc-sparkline ariaLabel="Tendance" [values]="values" /></div>
      <div data-qa="bars"><lc-bar-chart title="Barres" [data]="data" /></div>`,
  }),
};
