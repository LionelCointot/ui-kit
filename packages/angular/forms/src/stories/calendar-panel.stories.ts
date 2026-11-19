import { Component } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, within } from 'storybook/test';
// Le projet Vitest « storybook » ne charge pas les feuilles globales d'angular.json : on les charge ici pour mesurer le vrai rendu.
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { LcCalendarPanelComponent } from '../date-input/calendar-panel.component';

/** Panneau interne posé dans la page, sans surcouche : clair et sombre, avec et sans bornes (aujourd'hui figé au 19 novembre 2026). */
@Component({
  selector: 'lc-calendar-panel-demo',
  imports: [LcCalendarPanelComponent],
  template: `
    @for (theme of themes; track theme) {
      <div [attr.data-theme]="theme" style="display:flex;gap:24px;flex-wrap:wrap;padding:24px;background:var(--lc-sys-color-background)">
        <lc-calendar-panel today="2026-11-19" [selection]="{ from: '2026-11-12', to: null }" />
        <lc-calendar-panel today="2026-11-19" [selection]="{ from: '2026-11-12', to: null }" min="2026-11-05" max="2026-11-20" required />
      </div>
    }
  `,
})
class CalendarPanelDemoComponent {
  readonly themes = ['default', 'dark'];
}

const meta: Meta = {
  title: 'Formulaires/Panneau de calendrier (interne)',
  decorators: [moduleMetadata({ imports: [CalendarPanelDemoComponent] })],
  render: () => ({ template: '<lc-calendar-panel-demo />' }),
};
export default meta;

export const Jours: StoryObj = {
  play: async ({ canvasElement }) => {
    const panel = canvasElement.querySelector('lc-calendar-panel') as HTMLElement;
    expect(panel.getBoundingClientRect().width).toBe(304);
    expect(within(panel).getByRole('gridcell', { name: 'jeudi 12 novembre 2026' })).toHaveAttribute('aria-selected', 'true');
  },
};
