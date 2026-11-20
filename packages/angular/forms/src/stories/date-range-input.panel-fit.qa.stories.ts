import { Component, signal } from '@angular/core';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { expect, waitFor, within } from 'storybook/test';
import { page, userEvent as real } from 'vitest/browser';
import '../../../../tokens/dist/css/lc-tokens.css';
import '../../../../tokens/dist/css/theme-default.css';
import '../../../../tokens/dist/css/theme-dark.css';
import '../../../../tokens/dist/css/base.css';
import '../../../styles/ui-angular.css';
import type { LcDateInterval } from '../date-input/date-interval';
import { LC_DATE_PICKER } from '../date-input/date-picker-mode';
import { LcDateRangeInputComponent } from '../date-input/date-range-input.component';

// Ajustement du panneau de période : titre du mois sur une ligne (police large), panneau poussé dans la fenêtre plutôt que réduit.

@Component({
  selector: 'lc-range-fit',
  imports: [LcDateRangeInputComponent],
  template: `<div style="block-size:300px"></div>
    <lc-date-range-input ariaLabel="Période" [(value)]="range" />
    <div style="block-size:450px"></div>`,
})
class RangeFitComponent {
  protected readonly range = signal<LcDateInterval>({ from: '2026-09-03', to: null });
}

const meta: Meta = {
  title: 'QA/Date range input/Panel fit',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [RangeFitComponent] }), applicationConfig({ providers: [{ provide: LC_DATE_PICKER, useValue: 'calendar' }] })],
  render: () => ({ template: `<lc-range-fit />` }),
};
export default meta;
type Story = StoryObj;

const panel = () => document.querySelector<HTMLElement>('[role="dialog"]');
const open = async (canvas: HTMLElement) => {
  await waitFor(() => expect(within(canvas).getAllByRole('textbox')).toHaveLength(2));
  await real.click(within(canvas).getByRole('button', { name: /^(Changer la période|Choisir une période)/ }));
  await waitFor(() => expect(panel()).not.toBeNull());
  await waitFor(() => expect(panel()!.contains(document.activeElement)).toBe(true));
  // Laisse la surcouche se positionner.
  await new Promise((resolve) => setTimeout(resolve, 150));
  return panel()!;
};
const layout = (d: HTMLElement) => d.querySelector<HTMLElement>('.lc-calendar__layout')!;

/** Défaut A : « septembre 2026 » (le plus long) tient sur une ligne avec une police plus large, sans déborder de l'en-tête. */
export const TitreDuMoisSurUneLigne: Story = {
  play: async ({ canvasElement }) => {
    await page.viewport(1280, 720);
    const body = document.body.style;
    const saved = [body.fontFamily, body.letterSpacing];
    body.fontFamily = "'DejaVu Sans', Verdana, sans-serif";
    body.letterSpacing = '0.04em';
    try {
      const d = await open(canvasElement);
      const titles = [...d.querySelectorAll<HTMLElement>('button.lc-calendar__title')];
      expect(titles).toHaveLength(2);
      for (const button of titles) {
        const text = button.querySelector<HTMLElement>('span')!;
        const header = button.closest('.lc-calendar__header')!.getBoundingClientRect();
        const box = button.getBoundingClientRect();
        expect(text.getBoundingClientRect().height, `« ${text.textContent} » sur une ligne`).toBeLessThan(1.6 * parseFloat(getComputedStyle(text).fontSize));
        expect(text.scrollWidth, `« ${text.textContent} » non tronqué`).toBeLessThanOrEqual(text.clientWidth);
        expect(box.left).toBeGreaterThanOrEqual(header.left);
        expect(box.right).toBeLessThanOrEqual(header.right);
      }
      expect(titles[0].textContent).toContain('septembre');
    } finally {
      [body.fontFamily, body.letterSpacing] = saved;
    }
  },
};

/** Défaut B, préférence 1 (390 x 700 : ni 300 px au-dessus ni 360 en dessous ne suffisent, 684 oui) : le panneau tient dans la fenêtre : il s'affiche entier (poussé, quitte à recouvrir le champ), sans défilement. */
export const PanneauPousseSiIlTient: Story = {
  play: async ({ canvasElement }) => {
    await page.viewport(390, 700);
    try {
      await waitFor(() => expect(window.innerHeight).toBe(700));
      const d = await open(canvasElement);
      const box = d.getBoundingClientRect();
      const body = layout(d);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(700);
      expect(body.scrollHeight, 'aucun défilement').toBeLessThanOrEqual(body.clientHeight);
      const title = d.querySelector('button.lc-calendar__title')!.getBoundingClientRect();
      expect(title.top).toBeGreaterThanOrEqual(box.top);
      expect(title.bottom).toBeLessThanOrEqual(box.bottom);
    } finally {
      await page.viewport(1280, 720);
    }
  },
};

/** Défaut B, préférence 2 : fenêtre trop basse : tout le corps (raccourcis compris) défile, le pied reste visible. */
export const CorpsEntierDefileSiTropBas: Story = {
  play: async ({ canvasElement }) => {
    await page.viewport(390, 500);
    try {
      await waitFor(() => expect(window.innerHeight).toBe(500));
      const d = await open(canvasElement);
      const box = d.getBoundingClientRect();
      const body = layout(d);
      // Marge de fenêtre de la surcouche (8 px) tenue en haut comme en bas : une dérive entre le CSS et la surcouche se voit ici.
      const pane = d.closest('.cdk-overlay-pane')!.getBoundingClientRect();
      expect(pane.top, 'marge haute').toBeGreaterThanOrEqual(8);
      expect(pane.bottom, 'marge basse').toBeLessThanOrEqual(500 - 8);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.bottom).toBeLessThanOrEqual(500);
      expect(body.scrollHeight, 'le corps défile').toBeGreaterThan(body.clientHeight);
      const presets = d.querySelector<HTMLElement>('.lc-calendar__presets')!;
      body.scrollTop = 0;
      const top = presets.getBoundingClientRect().top;
      body.scrollTop = body.scrollHeight;
      expect(presets.getBoundingClientRect().top, 'les raccourcis défilent avec le reste').toBeLessThan(top);
      const grid = d.querySelector('[role="grid"]')!.getBoundingClientRect();
      expect(grid.bottom, 'dernière semaine atteignable').toBeLessThanOrEqual(body.getBoundingClientRect().bottom);
      const today = [...d.querySelectorAll('button')].find((b) => /Aujourd/.test(b.textContent!))!.getBoundingClientRect();
      expect(today.bottom).toBeLessThanOrEqual(500);
      expect(today.top).toBeGreaterThanOrEqual(body.getBoundingClientRect().bottom);
    } finally {
      await page.viewport(1280, 720);
    }
  },
};
