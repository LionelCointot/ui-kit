import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcCountUpDirective, LcRevealDirective } from '@lionelcointot/ui-angular';
import { LcAppShellComponent, LcCardComponent, LcGridComponent } from '@lionelcointot/ui-angular/layout';
import { LcInputDirective } from '@lionelcointot/ui-angular/forms';
import { LcDescriptionListComponent, LcKpiCardComponent, LcKpiCardLinkDirective, type LcKpiDelta } from '@lionelcointot/ui-angular/data';

/** Demo of the `Animation` story: three cards in an `lc-grid`; "Mettre à jour" changes a value. */
@Component({
  selector: 'lc-kpi-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcKpiCardComponent, LcGridComponent, LcButtonComponent, LcCountUpDirective, LcRevealDirective, StoryMotionNoticeComponent],
  styles: `
    .lc-demo__value { font-size: var(--lc-sys-font-size-xl); font-variant-numeric: tabular-nums; }
    .lc-demo__rows { margin-block-start: var(--lc-sys-space-4); border-block-start: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); }
    .srow { display: flex; justify-content: space-between; gap: var(--lc-sys-space-4); padding-block: var(--lc-sys-space-2); border-block-end: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); font-size: var(--lc-sys-font-size-sm); }
    .srow:last-child { border-block-end: 0; }`,
  template: `
    <lc-story-motion-notice />
    <section #root data-demo="d03">
      <p><button lcButton fillMode="outline" size="small" (click)="replay.replay(root)">Rejouer</button></p>
      @for (key of replay.keys(); track key) {
        <lc-grid [columns]="{ sm: 1, md: 3 }" gap="4">
          <lc-kpi-card label="Commandes" [value]="1248" format="integer" />
          <lc-kpi-card label="Panier moyen" [value]="86.4" format="money" />
          <lc-kpi-card label="Conversion" [value]="3.2" format="percent" />
        </lc-grid>
        <div class="lc-demo__rows">
          <div class="srow" lcReveal [lcRevealIndex]="3"><span>Lun · Session A — Maren</span><span>10 h – 12 h</span></div>
          <div class="srow" lcReveal [lcRevealIndex]="4"><span>Mar · Atelier maquette</span><span>14 h – 16 h 30</span></div>
        </div>
      }
    </section>
    <section #counting data-demo="d14">
      <p><button lcButton fillMode="outline" size="small" (click)="count.replay(counting)">Rejouer</button></p>
      @for (key of count.keys(); track key) {
        <span class="lc-demo__value" data-sample [lcCountUp]="181"></span>
      }
    </section>
    <section #hovered data-demo="d15">
      <p><button lcButton fillMode="outline" size="small" (click)="hover.replay(hovered)">Rejouer</button> Survolez la carte : rien ne bouge.</p>
      @for (key of hover.keys(); track key) {
        <lc-kpi-card label="Taux d'occupation" [value]="72" format="percent" style="max-width:16rem" />
      }
    </section>
    <section #flashing data-demo="d16">
      <p><button lcButton fillMode="outline" size="small" (click)="flash.replay(flashing)">Rejouer</button></p>
      @for (key of flash.keys(); track key) {
        <lc-kpi-card label="Commandes" [value]="orders()" format="integer" style="max-width:16rem" />
      }
    </section>`,
})
class KpiAnimationDemoComponent {
  protected readonly orders = signal(1248);
  protected readonly replay = replayable();
  protected readonly count = replayable();
  protected readonly hover = replayable();
  // La valeur change 250 ms après la réinsertion : le chiffre flashe.
  protected readonly flash = replayable({ play: () => this.orders.update((n) => n + 137) });
}

type KpiArgs = LcKpiCardComponent & { hasDelta: boolean };

const DELTA: LcKpiDelta = { value: 4.2, format: 'percent', trend: 'up', sentiment: 'positive' };

/**
 * Indicator card: label, main value (proportional digits), variation (trend icon, sign and text: never colour alone) and a hint.
 * The value is formatted by `format`, or replaced by free text (`valueText`) for results that are not a number.
 * Loading shows a skeleton; `stale` dims the value during a recalculation. The `[lcKpiVisual]` slot accepts a small visual such as a sparkline.
 *
 * Import: `import { LcKpiCardComponent } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<KpiArgs> = {
  title: 'Data/KPI card',
  component: LcKpiCardComponent,
  decorators: [moduleMetadata({ imports: [LcKpiCardComponent, LcDescriptionListComponent] })],
  args: { label: 'Commandes du jour', value: 1248, format: 'number', valueText: null, hint: 'Depuis minuit', loading: false, stale: false, hasDelta: true },
  argTypes: {
    format: { control: 'select', options: ['number', 'integer', 'money', 'percent', 'date', 'month', 'text'] },
    value: { control: 'number' },
    valueText: { control: 'text', description: 'Free text shown in place of the formatted value (empty: the value is formatted).' },
    hasDelta: { control: 'boolean', description: 'Shows a sample variation. Not an input of the component: `delta` is an object.' },
    delta: { control: false },
  },
};
export default meta;
type Story = StoryObj<KpiArgs>;

/** Every input is bound: change them in the Controls panel. The variation is a fixed sample. */
export const Playground: Story = {
  render: ({ hasDelta, ...args }) => ({
    props: { ...args, delta: hasDelta ? DELTA : undefined },
    template: `<div style="max-width:20rem"><lc-kpi-card [label]="label" [value]="value" [format]="format" [valueText]="valueText || null"
      [hint]="hint" [loading]="loading" [stale]="stale" [delta]="delta" /></div>`,
  }),
};

/** The same value with the numeric formats. */
export const Formats: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);grid-template-columns:repeat(auto-fit,minmax(11rem,1fr));max-width:48rem">
      <lc-kpi-card label="Nombre" [value]="1248.5" format="number" />
      <lc-kpi-card label="Entier" [value]="1248" format="integer" />
      <lc-kpi-card label="Montant" [value]="1248.5" format="money" />
      <lc-kpi-card label="Pourcentage" [value]="62.5" format="percent" /></div>`,
  }),
};

/** Variation: trend (`up`, `down`, `flat`) and sentiment (`positive`, `negative`, `neutral`) are independent; the icon and the sign carry the meaning. */
export const Deltas: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));max-width:48rem">
      <lc-kpi-card label="Commandes" [value]="1248" [delta]="{ value: 4.2, format: 'percent', trend: 'up', sentiment: 'positive' }" />
      <lc-kpi-card label="Temps de réponse (ms)" [value]="182" [delta]="{ value: -2.5, format: 'percent', trend: 'down', sentiment: 'positive' }" />
      <lc-kpi-card label="Retours" [value]="37" [delta]="{ value: 12, format: 'integer', trend: 'up', sentiment: 'negative' }" />
      <lc-kpi-card label="Stock" [value]="560" [delta]="{ value: 0, format: 'integer', trend: 'flat', sentiment: 'neutral' }" /></div>`,
  }),
};

/** Free text in place of the number (`valueText`); it also names the card for assistive technologies. */
export const FreeText: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);max-width:24rem">
      <lc-kpi-card label="Prochaine échéance de livraison" valueText="7 jours et 4 heures" hint="Dès la validation de la commande" />
      <lc-kpi-card label="Incidents ouverts" valueText="Aucun" /></div>`,
  }),
};

/** Loading (skeleton) and stale (dimmed value during a recalculation). */
export const LoadingAndStale: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));max-width:40rem">
      <lc-kpi-card label="Chargement" [loading]="true" />
      <lc-kpi-card label="Recalcul en cours" [value]="1248" [stale]="true" /></div>`,
  }),
};

/** Cards and a description list side by side, as in a summary panel. */
export const WithDescriptionList: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);max-width:30rem">
      <lc-kpi-card label="Temps de réponse moyen" [value]="182" format="integer" hint="Indicatif"
        [delta]="{ value: -2.5, format: 'percent', trend: 'down', sentiment: 'positive' }" />
      <lc-kpi-card label="Prochaine sauvegarde" valueText="Dans 3 heures" hint="Planifiée chaque nuit" />
      <lc-description-list [items]="[
        { term: 'Budget', value: 250000, format: 'money' },
        { term: 'Avancement', value: 62.5, format: 'percent', badge: 'estimation' },
        { term: 'Total engagé', value: 300000, format: 'money', emphasis: true }]" /></div>`,
  }),
};

const FILLED_DELTA: LcKpiDelta = { value: 4.2, format: 'percent', trend: 'up', sentiment: 'positive' };

/** Cards in relief (hairline plus soft shadow, 16 px corners) on the content background of the app shell; `elevation="0"` stays flat with a border. */
export const Relief: Story = {
  parameters: { ...fixedExample, layout: 'fullscreen' },
  decorators: [moduleMetadata({ imports: [LcAppShellComponent, LcCardComponent, LcButtonComponent, LcInputDirective] })],
  render: () => ({
    template: `<lc-app-shell navMode="none">
      <strong lcShellHeader>Application</strong>
      <div style="display:grid;gap:var(--lc-sys-space-4);padding:var(--lc-sys-space-4);max-width:40rem">
        <lc-card><p>Carte en relief (élévation 1).</p></lc-card>
        <lc-card [elevation]="0"><p>Carte à plat (élévation 0).</p></lc-card>
        <lc-kpi-card label="Commandes du jour" [value]="1248" format="integer" hint="Depuis minuit" />
        <div style="display:flex;gap:var(--lc-sys-space-3)"><button lcButton type="button">Enregistrer</button><input lcInput aria-label="Nom" value="Exemple" /></div>
      </div></lc-app-shell>`,
  }),
};

/** The solid tile for each `themeColor`: every text and icon takes the matching `on-<color>`. */
export const Filled: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { delta: FILLED_DELTA, colors: ['primary', 'secondary', 'success', 'warning', 'error', 'highlight', 'neutral'] as const },
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);grid-template-columns:repeat(auto-fit,minmax(12rem,1fr));max-width:56rem">
      @for (color of colors; track color) {
        <lc-kpi-card [attr.data-color]="color" [themeColor]="color" fillMode="solid" [label]="color" [value]="1248" format="integer" [delta]="delta" hint="Depuis minuit" />
      }</div>`,
  }),
};

/** The whole card is the link (click, Tab, focus ring on the card). The anchor stays empty: its text comes from the `aria-label` the card sets. */
export const Link: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [LcKpiCardLinkDirective, LcButtonComponent] })],
  render: () => ({
    props: { delta: FILLED_DELTA },
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);max-width:20rem;justify-items:start">
      <button lcButton id="before" type="button">Avant</button>
      <lc-kpi-card style="justify-self:stretch" label="Commandes du jour" [value]="1248" format="integer" [delta]="delta" hint="Depuis minuit"><a lcKpiCardLink href="#opened"></a></lc-kpi-card>
      <button lcButton id="after" type="button">Après</button></div>`,
  }),
};

/** `layout="horizontal"`: label and footer on the left, the figure on the right. */
export const Horizontal: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { delta: FILLED_DELTA },
    template: `<div style="max-width:28rem"><lc-kpi-card layout="horizontal" label="Commandes du jour" [value]="1248" format="integer" [delta]="delta" hint="Depuis minuit" /></div>`,
  }),
};

/** Tiles of different content heights in one row: the footers line up on the bottom edge. */
export const Row: Story = {
  parameters: fixedExample,
  decorators: [moduleMetadata({ imports: [LcKpiCardLinkDirective] })],
  render: () => ({
    props: { delta: FILLED_DELTA },
    template: `<div style="display:grid;gap:var(--lc-sys-space-4);grid-template-columns:repeat(4,minmax(0,1fr));align-items:stretch;max-width:64rem">
      <lc-kpi-card label="Commandes" [value]="1248" format="integer" hint="Aujourd'hui" />
      <lc-kpi-card label="Panier moyen" [value]="86.4" format="money" [delta]="delta"><a lcKpiCardLink href="#opened"></a></lc-kpi-card>
      <lc-kpi-card label="Taux de conversion sur les sept derniers jours" [value]="3.2" format="percent" [delta]="delta" hint="Depuis minuit, hors retours" />
      <lc-kpi-card themeColor="primary" fillMode="solid" label="Retours" [value]="37" format="integer" hint="Ce mois" /></div>`,
  }),
};

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { LcGridComponent } from '@lionelcointot/ui-angular/layout';
import { LcKpiCardComponent } from '@lionelcointot/ui-angular/data';

@Component({
  selector: 'app-example',
  imports: [LcGridComponent, LcKpiCardComponent],
  template: \`
    <lc-grid [columns]="3">
      <lc-kpi-card label="Commandes" [value]="1248" />
      <lc-kpi-card label="Panier moyen" [value]="86.4" format="money" />
      <lc-kpi-card label="Conversion" [value]="3.2" format="percent" />
    </lc-grid>\`,
})
export class ExampleComponent {}`;

/** The cards tilt in from 40 px (850 ms) one after the other and each figure counts up to its value in 1.2 s; a new value counts on from the old one and flashes. "Rejouer" shows them again. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  decorators: [moduleMetadata({ imports: [KpiAnimationDemoComponent] })],
  render: () => ({ template: '<lc-kpi-animation-demo />' }),
};
