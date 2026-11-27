import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcTimelineBarComponent, type LcTimelineSegment } from '@lionelcointot/ui-angular/data';
import { LcFileUploadComponent, LcMessageComposerComponent, type LcFileUploadItem } from '@lionelcointot/ui-angular/forms';
import { LcProgressBarComponent } from '@lionelcointot/ui-angular/feedback';

const PHASES: LcTimelineSegment[] = [
  { id: 'a', weight: 60, label: 'Phase A', colorSlot: 1, marker: 'circle' },
  { id: 'b', weight: 24, label: 'Phase B', colorSlot: 2, marker: 'square' },
  { id: 'c', weight: 36, label: 'Phase C', colorSlot: 1, marker: 'circle' },
];
const upload = (progress: number): LcFileUploadItem => ({ id: 'up', name: 'rapport-mensuel.pdf', size: 2_300_000, status: 'uploading', progress });

/** Demo of the `Animation` story (d09, d21): each bar fills from empty to its value, one after the other. */
@Component({
  selector: 'lc-fill-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcProgressBarComponent, LcTimelineBarComponent, LcFileUploadComponent, LcMessageComposerComponent, LcButtonComponent, StoryMotionNoticeComponent],
  template: `
    <lc-story-motion-notice />
    <div #root style="max-width:36rem">
      <section data-demo="d09" style="margin-bottom:var(--lc-sys-space-6)">
        <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="demo.replay(root)">Rejouer</button>
        @for (key of demo.keys(); track key) {
          <div style="display:grid;gap:var(--lc-sys-space-3)">
            <lc-progress-bar [value]="value()" label="Import des écritures" />
            <lc-progress-bar [value]="value() - 25" label="Rapprochement" />
            <lc-progress-bar [value]="value() - 45" label="Export" />
          </div>
        }
      </section>
      <section data-demo="d21">
        <button lcButton fillMode="outline" size="small" style="margin-bottom:var(--lc-sys-space-4)" (click)="demo.replay(root)">Rejouer</button>
        @for (key of demo.keys(); track key) {
          <div style="display:grid;gap:var(--lc-sys-space-4)">
            <lc-timeline-bar [segments]="phases" label="Phases du projet" description="Trois phases de 60, 24 et 36 mois." />
            <lc-file-upload [items]="[item()]" ariaLabel="Pièces jointes" />
            <lc-message-composer [items]="[item()]" ariaLabel="Votre message" />
          </div>
        }
      </section>
    </div>`,
})
class FillAnimationDemoComponent {
  protected readonly phases = PHASES;
  protected readonly value = signal(80);
  protected readonly item = signal(upload(70));
  protected readonly demo = replayable({
    destroyRef: inject(DestroyRef),
    reset: () => { this.value.set(80); this.item.set(upload(70)); },
    // Après l'entrée : une valeur qui change se joue sans décalage.
    play: (later) => later(1800, () => { this.value.set(95); this.item.set(upload(90)); }),
  });
}

/**
 * Progress bar (`role="progressbar"`): a value from 0 to 100, or `null` for an indeterminate progress.
 * Use it for the advance of a task.
 *
 * Import: `import { LcProgressBarComponent } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<LcProgressBarComponent> = {
  title: 'Feedback/Progress bar',
  component: LcProgressBarComponent,
  decorators: [moduleMetadata({ imports: [LcProgressBarComponent, FillAnimationDemoComponent] })],
  args: { value: 40, label: "Progression de l'import" },
  argTypes: { value: { control: { type: 'range', min: 0, max: 100, step: 1 } } },
};
export default meta;
type Story = StoryObj<LcProgressBarComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<div style="max-width:24rem"><lc-progress-bar [value]="value" [label]="label" /></div>`,
  }),
};

/** From empty to complete; out-of-range values are clamped to 0–100. */
export const Values: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { values: [0, 25, 60, 100, 140] },
    template: `<div style="display:grid;gap:var(--lc-sys-space-3);max-width:24rem">
      @for (value of values; track value) { <lc-progress-bar [value]="value" [label]="'Progression ' + value + ' %'" /> }</div>`,
  }),
};

/** `null` (the default): animated bar for a task of unknown duration, without `aria-valuenow`. */
export const Indeterminate: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:24rem"><lc-progress-bar [value]="null" label="Analyse en cours" /></div>`,
  }),
};

/** Composition: a labeled upload with its percentage. */
export const WithLabelAndPercentage: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:24rem;display:grid;gap:var(--lc-sys-space-1)">
      <div style="display:flex;justify-content:space-between"><span>photos-vacances.zip</span><span>65 %</span></div>
      <lc-progress-bar [value]="65" label="Envoi de photos-vacances.zip" /></div>`,
  }),
};

const ANIMATION_CODE = `import { Component } from '@angular/core';
import { LcProgressBarComponent } from '@lionelcointot/ui-angular/feedback';

@Component({
  selector: 'app-example',
  imports: [LcProgressBarComponent],
  template: \`
    <lc-progress-bar [value]="80" label="Import" />
    <lc-progress-bar [value]="55" label="Rapprochement" />\`,
})
export class ExampleComponent {}`;

/** Progress bars, the timeline bar and the upload bars of the file field and the message composer fill from the left over 950 ms, 40 ms apart; the indeterminate band is unchanged. "Rejouer" reinserts them, then raises the values (no delay on a change). */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-fill-animation-demo />' }),
};
