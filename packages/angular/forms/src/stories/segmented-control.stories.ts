import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, commonArgTypes, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';

const OPTIONS = [{ value: 'simple', label: 'Simple' }, { value: 'detailed', label: 'Détaillé' }];
const COLUMNS = ['À faire', 'En cours', 'En revue', 'Terminé'].map((label, index) => ({ value: `column-${index}`, label }));

/** Demo of the `Animation` story (d62): the pill of a four-option control stretches from the first option to the last one, in both fill modes. */
@Component({
  selector: 'lc-segmented-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcSegmentedControlComponent, LcButtonComponent, StoryMotionNoticeComponent],
  template: `
    <lc-story-motion-notice />
    <div #root data-demo="d62">
      <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="demo.replay(root)">Rejouer</button>
      @for (key of demo.keys(); track key) {
        <div style="display:grid;gap:var(--lc-sys-space-4);justify-items:start">
          <lc-segmented-control ariaLabel="Colonne" fillMode="solid" [options]="columns" [(value)]="solid" />
          <lc-segmented-control ariaLabel="Colonne (variante outline)" [options]="columns" [(value)]="outline" />
        </div>
      }
    </div>`,
})
class SegmentedAnimationDemoComponent {
  protected readonly columns = COLUMNS;
  protected readonly solid = signal<string | null>('column-0');
  protected readonly outline = signal<string | null>('column-0');
  protected readonly demo = replayable({
    destroyRef: inject(DestroyRef),
    reset: () => {
      this.solid.set('column-0');
      this.outline.set('column-0');
    },
    play: () => {
      this.solid.set('column-3');
      this.outline.set('column-3');
    },
  });
}

/** Valeur pilotée : un choix n'est qu'une demande ; `value` ne change qu'après confirmation du parent. */
@Component({
  selector: 'lc-segmented-control-controlled-demo',
  imports: [LcSegmentedControlComponent],
  template: `
    <lc-segmented-control ariaLabel="Niveau de détail" controlled [options]="options" [value]="level()" (valueRequest)="request($event)" />
    <p>Niveau : {{ level() }}</p>
  `,
})
class ControlledDemoComponent {
  protected readonly options = OPTIONS;
  protected readonly level = signal<string | null>('detailed');

  protected request(next: string | null): void {
    if (confirm('Changer le niveau de détail ?')) this.level.set(next);
  }
}

/**
 * Exclusive choice between a few options, shown as a row of segments (`lc-segmented-control`). A pill slides under the active option in both fill modes: tinted, with a ring on the option (`outline`),
 * or light over a sunken track (`fillMode="solid"`), so the state never relies on colour alone; an option without icon shows a check when active. In controlled mode, a click is only a request (`valueRequest`).
 *
 * Import: `import { LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';`
 */
const meta: Meta<LcSegmentedControlComponent<string>> = {
  title: 'Forms/Segmented control',
  component: LcSegmentedControlComponent,
  decorators: [moduleMetadata({ imports: [LcSegmentedControlComponent, ControlledDemoComponent, SegmentedAnimationDemoComponent] })],
  args: { ariaLabel: 'Niveau de détail', size: 'medium', fillMode: 'outline', fullWidth: false, disabled: false },
  argTypes: {
    size: commonArgTypes.size,
    fillMode: { control: 'inline-radio', options: ['outline', 'solid'] },
    options: { control: false },
    value: { control: false },
    valueRequest: { action: 'valueRequest' },
  },
};
export default meta;
type Story = StoryObj<LcSegmentedControlComponent<string>>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...args, options: OPTIONS, selection: signal<string | null>('simple') },
    template: `
      <lc-segmented-control [options]="options" [(value)]="selection" [ariaLabel]="ariaLabel" [size]="size" [fillMode]="fillMode"
        [fullWidth]="fullWidth" [disabled]="disabled" />`,
  }),
};

/** Options with an icon next to the label. */
export const WithIcons: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      options: [{ value: 'table', label: 'Tableau', icon: 'table' }, { value: 'chart', label: 'Courbe', icon: 'chart-line' }],
      selection: signal<string | null>('chart'),
    },
    template: `<lc-segmented-control ariaLabel="Affichage" [options]="options" [(value)]="selection" />`,
  }),
};

/** `fillMode="solid"`: sunken track and a raised pill that slides to the chosen segment; each option keeps its icon. */
export const SolidWithIcons: Story = {
  parameters: fixedExample,
  render: () => ({
    props: {
      options: [{ value: 'messages', label: 'Échanges', icon: 'message-square' }, { value: 'info', label: 'Informations', icon: 'info' }],
      selection: signal<string | null>('messages'),
    },
    template: `<lc-segmented-control ariaLabel="Affichage" fillMode="solid" fullWidth [options]="options" [(value)]="selection" />`,
  }),
};

/** Controlled value: a choice is only a request, `value` changes once the parent confirms. */
export const Controlled: Story = {
  parameters: fixedExample,
  render: () => ({ template: '<lc-segmented-control-controlled-demo />' }),
};

/** Four options in 360 px: the controls fit the screen without scrolling the page. */
export const FourOptions360px: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { options: COLUMNS, selection: signal<string | null>('column-1') },
    template: `<div style="inline-size:360px;max-inline-size:100%;padding:16px;box-sizing:border-box"><lc-segmented-control ariaLabel="Colonne" fullWidth [options]="options" [(value)]="selection" /></div>`,
  }),
};

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcSegmentedControlComponent } from '@lionelcointot/ui-angular/forms';

@Component({
  selector: 'app-example',
  imports: [LcSegmentedControlComponent],
  template: \`<lc-segmented-control ariaLabel="Colonne" fillMode="solid" [options]="columns" [(value)]="column" />\`,
})
export class ExampleComponent {
  protected readonly columns = [
    { value: 'todo', label: 'À faire' },
    { value: 'doing', label: 'En cours' },
    { value: 'review', label: 'En revue' },
    { value: 'done', label: 'Terminé' },
  ];
  protected readonly column = signal<string | null>('todo');
}`;

/** The pill under the chosen option stretches to the next one in both fill modes: the leading edge is fast, the other catches up. "Rejouer" shows the first option again, then selects the last one. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-segmented-animation-demo />' }),
};
