import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcRevealDirective, LcStaggerDirective } from '@lionelcointot/ui-angular';
import { LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';
import { LcTabComponent, LcTabContentDirective, LcTabsComponent } from '@lionelcointot/ui-angular/navigation';

const FILTER_OPTIONS = [{ value: 'all', label: 'Tous' }, { value: 'mine', label: 'Les miens' }];
const ROWS: Record<string, readonly string[]> = {
  all: ['Plan de test', 'Revue de code', 'Compte rendu', 'Livraison'],
  mine: ['Mon brouillon', 'Mes notes', 'Ma relecture', 'Mon envoi'],
};

/** Demo of the `Animation` story: the two-edge underline (d10) and the cascade of a panel on its first opening, plus a list filtered by a segmented control (d45). */
@Component({
  selector: 'lc-tabs-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcTabsComponent, LcTabComponent, LcSegmentedControlComponent, LcButtonComponent, LcRevealDirective, LcStaggerDirective, StoryMotionNoticeComponent],
  styles: `
    .lc-demo__grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: var(--lc-sys-space-6); }
    .lc-demo__list { margin: var(--lc-sys-space-3) 0 0; padding: 0; list-style: none; display: grid; gap: var(--lc-sys-space-2); min-block-size: 9rem; align-content: start; }
    .lc-demo__row { padding: var(--lc-sys-space-2) var(--lc-sys-space-3); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-sunken); }
    h3 { display: flex; align-items: center; gap: var(--lc-sys-space-3); }
  `,
  template: `
    <lc-story-motion-notice />
    <section #underline data-demo="d10">
      <h3>Underline <button lcButton fillMode="outline" size="small" (click)="underlineDemo.replay(underline)">Rejouer</button></h3>
      @for (key of underlineDemo.keys(); track key) {
        <lc-tabs ariaLabel="Résultats" [(selected)]="selected">
          <lc-tab id="synthese" label="Synthèse"><p>Synthèse du projet</p></lc-tab>
          <lc-tab id="donnees" label="Données"><p>Tableau</p></lc-tab>
          <lc-tab id="graphiques" label="Graphiques"><p>Courbes</p></lc-tab>
        </lc-tabs>
      }
    </section>
    <section #cascade data-demo="d45">
      <h3>Cascade <button lcButton fillMode="outline" size="small" (click)="cascadeDemo.replay(cascade)">Rejouer</button></h3>
      @for (key of cascadeDemo.keys(); track key) {
        <div class="lc-demo__grid">
          <lc-tabs ariaLabel="Réglages" [(selected)]="settings">
            <lc-tab id="general" label="Général"><p class="lc-demo__row">Nom du projet</p><p class="lc-demo__row">Langue</p><p class="lc-demo__row">Fuseau horaire</p></lc-tab>
            <lc-tab id="notifications" label="Notifications"><p class="lc-demo__row">Courriel</p><p class="lc-demo__row">Mobile</p><p class="lc-demo__row">Résumé du lundi</p></lc-tab>
            <lc-tab id="avance" label="Avancé"><p class="lc-demo__row">Export</p><p class="lc-demo__row">Archives</p><p class="lc-demo__row">Suppression</p></lc-tab>
          </lc-tabs>
          <div>
            <lc-segmented-control ariaLabel="Filtre" [options]="filters" [value]="filter()" (valueChange)="filterBy($event)" />
            <ul class="lc-demo__list" lcStagger>
              @for (row of rows(); track row) {
                <li class="lc-demo__row" lcReveal>{{ row }}</li>
              }
            </ul>
          </div>
        </div>
      }
    </section>`,
})
class TabsAnimationDemoComponent {
  private readonly destroyRef = inject(DestroyRef);
  private timer: ReturnType<typeof setTimeout> | undefined;
  protected readonly filters = FILTER_OPTIONS;
  protected readonly selected = signal<string | null>('synthese');
  protected readonly settings = signal<string | null>('general');
  protected readonly filter = signal<string | null>('all');
  protected readonly rows = signal<readonly string[]>(ROWS['all']);

  protected readonly underlineDemo = replayable({ destroyRef: this.destroyRef, reset: () => this.selected.set('synthese'), play: () => this.selected.set('graphiques') });
  protected readonly cascadeDemo = replayable({
    destroyRef: this.destroyRef,
    reset: () => {
      clearTimeout(this.timer);
      this.settings.set('general');
      this.filter.set('all');
      this.rows.set(ROWS['all']);
    },
    play: () => {
      this.settings.set('notifications');
      this.filterBy('mine');
    },
  });

  constructor() {
    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
  }

  /** The list empties (its rows leave), then the rows of the chosen filter enter in cascade. */
  protected filterBy(value: string | null): void {
    this.filter.set(value);
    this.rows.set([]);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.rows.set(ROWS[value ?? 'all']), 250);
  }
}

/**
 * Tab list with automatic or manual activation. Panels are declared with `lc-tab`; heavy content goes in an
 * `ng-template[lcTabContent]` so it renders only when its tab is first selected.
 *
 * Import: `import { LcTabsComponent, LcTabComponent, LcTabContentDirective } from '@lionelcointot/ui-angular/navigation';`
 */
const meta: Meta<LcTabsComponent> = {
  title: 'Navigation/Tabs',
  component: LcTabsComponent,
  decorators: [moduleMetadata({ imports: [LcTabsComponent, LcTabComponent, LcTabContentDirective, LcButtonComponent, StoryMotionNoticeComponent, TabsAnimationDemoComponent] })],
  argTypes: { activation: { control: 'inline-radio', options: ['automatic', 'manual'] }, selected: { control: 'select', options: [null, 'synthese', 'donnees', 'graphiques'] } },
  args: { ariaLabel: 'Résultats', activation: 'automatic', selected: null },
};
export default meta;
type Story = StoryObj<LcTabsComponent>;

/** Every input is bound: `selected` picks the active tab, `activation` changes how arrow keys behave. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['activation'] } },
  render: (args) => ({
    props: args,
    template: `
      <lc-tabs [ariaLabel]="ariaLabel" [activation]="activation" [selected]="selected">
        <lc-tab id="synthese" label="Synthèse"><p>Synthèse du projet</p></lc-tab>
        <lc-tab id="donnees" label="Données" icon="table"><ng-template lcTabContent><p>Tableau</p></ng-template></lc-tab>
        <lc-tab id="bloque" label="Bloqué" [disabled]="true"><p>Inaccessible</p></lc-tab>
        <lc-tab id="graphiques" label="Graphiques"><ng-template lcTabContent><p>Courbes</p></ng-template></lc-tab>
      </lc-tabs>`,
  }),
};

const MANY = `
  <lc-tab id="apercu" label="Aperçu"><p>Aperçu</p></lc-tab>
  <lc-tab id="runs" label="Exécutions récentes"><p>Exécutions</p></lc-tab>
  <lc-tab id="couverture" label="Couverture"><p>Couverture</p></lc-tab>
  <lc-tab id="anomalies" label="Anomalies ouvertes"><p>Anomalies</p></lc-tab>
  <lc-tab id="historique" label="Historique"><p>Historique</p></lc-tab>
  <lc-tab id="parametres" label="Paramètres"><p>Paramètres</p></lc-tab>`;

/** Many tabs in 360 px: the row scrolls horizontally, labels are not cut, an edge fade hints at hidden tabs and vanishes at the end. */
export const ManyTabs360px: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ariaLabel: 'Résultats', activation: 'automatic' },
    template: `<div style="inline-size:360px;max-inline-size:100%"><lc-tabs [ariaLabel]="ariaLabel" [activation]="activation">${MANY}</lc-tabs></div>`,
  }),
};

/** Active tab initially out of view: the row scrolls it back on screen (also by keyboard, arrows and End). */
export const ManyTabsActiveAtEnd360px: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { ariaLabel: 'Résultats', activation: 'automatic' },
    template: `<div style="inline-size:360px;max-inline-size:100%"><lc-tabs [ariaLabel]="ariaLabel" [activation]="activation" selected="parametres">${MANY}</lc-tabs></div>`,
  }),
};

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { LcTabComponent, LcTabsComponent } from '@lionelcointot/ui-angular/navigation';

@Component({
  selector: 'app-example',
  imports: [LcTabsComponent, LcTabComponent],
  template: \`
    <lc-tabs ariaLabel="Résultats" [(selected)]="selected">
      <lc-tab id="synthese" label="Synthèse"><p>Synthèse du projet</p></lc-tab>
      <lc-tab id="donnees" label="Données"><p>Tableau</p></lc-tab>
      <lc-tab id="graphiques" label="Graphiques"><p>Courbes</p></lc-tab>
    </lc-tabs>\`,
})
export class ExampleComponent {
  selected: string | null = 'synthese';
}`;

/**
 * The underline stretches to the newly selected tab (two edges: the leading one is fast, the other catches up), and the content of a tab enters in cascade the first time it opens.
 * "Rejouer" shows the first tab again without transition, then selects another one; the second demo also filters a list with a segmented control.
 */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-tabs-animation-demo />' }),
};

/** With `swipe`, the panels slide: a swipe changes tab, the indicator follows the finger, and only the panels of the strip exist (hidden ones are `inert`). `selectionChange` tells a click (`tab`) from a swipe (`swipe`). */
export const Swipe: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `
      <div style="inline-size:360px;max-inline-size:100%;block-size:14rem;display:flex">
        <lc-tabs ariaLabel="Rubriques" swipe style="flex:1">
          <lc-tab id="a" label="Messages"><p>Messages panel</p></lc-tab>
          <lc-tab id="b" label="Details"><p>Details panel</p></lc-tab>
          <lc-tab id="c" label="History"><p>History panel</p></lc-tab>
        </lc-tabs>
      </div>`,
  }),
};
