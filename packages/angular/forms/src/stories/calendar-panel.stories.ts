import { Component, input } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, within } from 'storybook/test';
// Le projet Vitest « storybook » ne charge pas les feuilles globales d'angular.json : on les charge ici pour mesurer le vrai rendu.
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import { LC_LABELS_FR } from '@lionelcointot/ui-angular';
import { LcCalendarPanelComponent } from '../date-input/calendar-panel.component';
import type { LcDateInterval, LcDateIntervalPreset } from '../date-input/date-interval';
import { kitDatePresets } from '../date-input/date-presets';

/**
 * Panneau interne posé dans la page, sans surcouche : sans bornes, puis avec bornes et obligatoire (aujourd'hui figé au
 * 19 novembre 2026). Clair et sombre par le sélecteur de thème de Storybook : le thème se pose sur `html`, comme en production.
 */
@Component({
  selector: 'lc-calendar-panel-demo',
  imports: [LcCalendarPanelComponent],
  template: `
    <div style="display:flex;gap:24px;flex-wrap:wrap;padding:24px;background:var(--lc-sys-color-background)">
      <lc-calendar-panel today="2026-11-19" [selection]="{ from: '2026-11-12', to: null }" />
      <lc-calendar-panel today="2026-11-19" [selection]="{ from: '2026-11-12', to: null }" min="2026-11-05" max="2026-11-20" required />
    </div>
  `,
})
class CalendarPanelDemoComponent {}

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

const climb = async (canvasElement: HTMLElement, times: number) => {
  for (let step = 0; step < times; step++) {
    for (const title of canvasElement.querySelectorAll<HTMLButtonElement>('button.lc-calendar__title')) title.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
};

/** Niveau mois : un clic sur le titre des jours. Un mois choisi ou d'aujourd'hui garde ses repères (pilule, point). */
export const Mois: StoryObj = {
  play: async ({ canvasElement }) => {
    await climb(canvasElement, 1);
    const panel = canvasElement.querySelector('lc-calendar-panel') as HTMLElement;
    expect(within(panel).getByRole('gridcell', { name: 'novembre 2026' })).toHaveAttribute('aria-selected', 'true');
    expect(panel.getBoundingClientRect().width).toBe(304);
  },
};

/** Niveau années : 2019 à 2030, titre en texte simple. */
export const Annees: StoryObj = {
  play: async ({ canvasElement }) => {
    await climb(canvasElement, 2);
    const panel = canvasElement.querySelector('lc-calendar-panel') as HTMLElement;
    expect(panel.querySelector('.lc-calendar__title')!.textContent).toBe('2019 à 2030');
    expect(within(panel).getByRole('gridcell', { name: '2026' })).toHaveAttribute('aria-selected', 'true');
  },
};

/** Panneau en mode période : aujourd'hui figé au 19 novembre 2026. */
@Component({
  selector: 'lc-calendar-panel-range-demo',
  imports: [LcCalendarPanelComponent],
  template: `
    <div style="display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;padding:24px;background:var(--lc-sys-color-background)">
      <lc-calendar-panel
        mode="range"
        [months]="months()"
        today="2026-11-19"
        [selection]="selection()"
        [presets]="presets()"
        [presetsLayout]="layout()"
        [min]="min()"
        [max]="max()"
      />
    </div>
  `,
})
class CalendarPanelRangeDemoComponent {
  readonly months = input<1 | 2>(2);
  readonly selection = input<LcDateInterval>({ from: null, to: null });
  readonly presets = input<readonly LcDateIntervalPreset[]>([]);
  readonly layout = input<'column' | 'grid'>('grid');
  readonly min = input<string | null>(null);
  readonly max = input<string | null>(null);
}

const rangeMeta = (args: Record<string, unknown>): Pick<StoryObj, 'render'> => ({
  render: () => ({ props: args, template: '<lc-calendar-panel-range-demo [months]="months" [selection]="selection" [presets]="presets" [layout]="layout" [min]="min" [max]="max" />' }),
});
const labels = LC_LABELS_FR;
const kitPresets = kitDatePresets(labels);
const settle = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const rangePanel = (canvasElement: HTMLElement) => canvasElement.querySelector('lc-calendar-panel') as HTMLElement;

export const PeriodeDebutSeul: StoryObj = {
  ...rangeMeta({ months: 2, selection: { from: null, to: null }, presets: [], layout: 'grid', min: null, max: null }),
  decorators: [moduleMetadata({ imports: [CalendarPanelRangeDemoComponent] })],
  play: async ({ canvasElement }) => {
    const panel = rangePanel(canvasElement);
    expect(panel.querySelector('[role=status]')!.textContent).toContain('Choisissez la date de début.');
    (panel.querySelector('td[data-date="2026-11-12"]') as HTMLElement).click();
    await settle();
    expect(panel.querySelector('[role=status]')!.textContent).toContain('Début : 12 novembre 2026.');
    expect(within(panel).getByRole('button', { name: 'Sans date de fin' })).toBeTruthy();
    expect(panel.getBoundingClientRect().width).toBe(608);
  },
};

export const PeriodeApercu: StoryObj = {
  ...rangeMeta({ months: 2, selection: { from: null, to: null }, presets: [], layout: 'grid', min: null, max: null }),
  decorators: [moduleMetadata({ imports: [CalendarPanelRangeDemoComponent] })],
  play: async ({ canvasElement }) => {
    const panel = rangePanel(canvasElement);
    (panel.querySelector('td[data-date="2026-11-12"]') as HTMLElement).click();
    await settle();
    panel.querySelector('td[data-date="2026-11-25"]')!.dispatchEvent(new MouseEvent('mouseenter'));
    await settle();
    expect(panel.querySelector('td[data-date="2026-11-25"]')!.getAttribute('data-range')).toContain('hollow');
  },
};

export const PeriodeSurDeuxMois: StoryObj = {
  ...rangeMeta({ months: 2, selection: { from: '2026-11-24', to: '2026-12-09' }, presets: [], layout: 'grid', min: null, max: null }),
  decorators: [moduleMetadata({ imports: [CalendarPanelRangeDemoComponent] })],
  play: async ({ canvasElement }) => {
    const panel = rangePanel(canvasElement);
    expect(panel.querySelectorAll('td[aria-selected="true"]')).toHaveLength(16);
  },
};

export const PeriodeRaccourcisEnColonne: StoryObj = {
  ...rangeMeta({ months: 2, selection: { from: '2026-11-13', to: '2026-11-19' }, presets: kitPresets, layout: 'column', min: null, max: null }),
  decorators: [moduleMetadata({ imports: [CalendarPanelRangeDemoComponent] })],
  play: async ({ canvasElement }) => {
    const panel = rangePanel(canvasElement);
    expect(panel.querySelectorAll('.lc-calendar__preset')).toHaveLength(4);
  },
};

export const PeriodeRaccourcisEnGrille: StoryObj = {
  ...rangeMeta({ months: 2, selection: { from: '2026-11-13', to: '2026-11-19' }, presets: kitPresets, layout: 'grid', min: null, max: null }),
  decorators: [moduleMetadata({ imports: [CalendarPanelRangeDemoComponent] })],
  play: async ({ canvasElement }) => {
    expect(rangePanel(canvasElement).getBoundingClientRect().width).toBe(608);
  },
};

export const PeriodeAvecBornes: StoryObj = {
  ...rangeMeta({ months: 2, selection: { from: '2026-11-17', to: '2026-11-19' }, presets: kitPresets, layout: 'column', min: '2026-11-15', max: '2026-11-30' }),
  decorators: [moduleMetadata({ imports: [CalendarPanelRangeDemoComponent] })],
  play: async ({ canvasElement }) => {
    const disabled = rangePanel(canvasElement).querySelectorAll<HTMLButtonElement>('.lc-calendar__preset:disabled');
    expect(disabled).toHaveLength(1);
    expect(disabled[0].textContent).toContain('Aucune date autorisée sur cette période.');
  },
};

export const PeriodeUnSeulMois: StoryObj = {
  ...rangeMeta({ months: 1, selection: { from: '2026-11-13', to: '2026-11-19' }, presets: kitPresets, layout: 'grid', min: null, max: null }),
  decorators: [moduleMetadata({ imports: [CalendarPanelRangeDemoComponent] })],
  play: async ({ canvasElement }) => {
    expect(rangePanel(canvasElement).querySelectorAll('.lc-calendar__month')).toHaveLength(1);
  },
};

/** Niveau mois avec deux mois : une seule grille pleine largeur. */
export const PeriodeNiveauMois: StoryObj = {
  ...rangeMeta({ months: 2, selection: { from: '2026-11-13', to: '2026-11-19' }, presets: [], layout: 'grid', min: null, max: null }),
  decorators: [moduleMetadata({ imports: [CalendarPanelRangeDemoComponent] })],
  play: async ({ canvasElement }) => {
    (rangePanel(canvasElement).querySelector('button.lc-calendar__title') as HTMLElement).click();
    await settle();
    expect(rangePanel(canvasElement).querySelectorAll('.lc-calendar__month')).toHaveLength(1);
    expect(rangePanel(canvasElement).getBoundingClientRect().width).toBe(608);
  },
};
