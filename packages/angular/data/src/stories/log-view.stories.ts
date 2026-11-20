import { Component, OnDestroy, signal } from '@angular/core';
import { fixedExample } from '@lc/storybook';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcLogViewComponent, type LcLogLine } from '../log-view/log-view.component';

const KINDS = ['out', 'out', 'out', 'info', 'err'] as const;
const makeLines = (count: number, from = 1): LcLogLine[] =>
  Array.from({ length: count }, (_, index) => {
    const id = from + index;
    const kind = KINDS[id % KINDS.length];
    return { id, kind, prefix: id % 7 === 0 ? 'étape 2' : undefined, text: kind === 'err' ? `Échec de la vérification ${id}` : `Ligne ${id} : traitement en cours de l'élément ${id * 3}` };
  });

/** Appends a line every 600 ms: following the end stops as soon as the reader scrolls up. */
@Component({
  selector: 'lc-log-view-live-demo',
  imports: [LcLogViewComponent, LcButtonComponent],
  template: `
    <lc-log-view ariaLabel="Sortie du traitement" [lines]="lines()" [(following)]="following" />
    <p style="margin-block-start:16px">Suivi de la fin : {{ following() ? 'actif' : 'en pause' }} · {{ lines().length }} lignes</p>
    <button lcButton type="button" fillMode="outline" themeColor="neutral" (click)="toggle()">{{ running ? 'Arrêter' : 'Reprendre' }}</button>
  `,
})
class LogViewLiveDemoComponent implements OnDestroy {
  protected readonly lines = signal<readonly LcLogLine[]>(makeLines(30));
  protected readonly following = signal(true);
  protected running = true;
  private timer: ReturnType<typeof setInterval> | undefined = setInterval(() => this.append(), 600);

  protected toggle(): void {
    this.running = !this.running;
    clearInterval(this.timer);
    this.timer = this.running ? setInterval(() => this.append(), 600) : undefined;
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  private append(): void {
    this.lines.update((lines) => [...lines, ...makeLines(1, lines.length + 1)]);
  }
}

type LogViewArgs = LcLogViewComponent & { lineCount: number };

/**
 * Scrollable log console: one line per entry (standard output, error or information, with an optional prefix), copy button, wrapping option,
 * and automatic follow of the end that stops as soon as the reader scrolls up (`following`, two-way). Beyond `maxLines`, the oldest lines are dropped from the DOM and a notice says so.
 *
 * Import: `import { LcLogViewComponent, type LcLogLine } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<LogViewArgs> = {
  title: 'Data/Log view',
  component: LcLogViewComponent,
  decorators: [moduleMetadata({ imports: [LcLogViewComponent, LogViewLiveDemoComponent] })],
  args: {
    ariaLabel: 'Sortie du traitement', maxLines: 500, height: '16rem', wrap: true, copyable: true, live: 'off', emptyText: 'Aucune ligne pour le moment.', following: true, lineCount: 40,
  },
  argTypes: {
    live: { control: 'inline-radio', options: ['off', 'polite'] },
    lineCount: { control: { type: 'number', min: 0, max: 200 }, description: 'Number of demo lines (0 shows the empty text). Not an input of the component.' },
    lines: { control: false }, copyLabel: { control: false }, resumeLabel: { control: false }, truncatedLabel: { control: false },
  },
};
export default meta;
type Story = StoryObj<LogViewArgs>;

/** Every input is bound: change them in the Controls panel. Raise `lineCount` above `maxLines` to see the truncation notice. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['maxLines', 'height', 'emptyText'] } },
  render: (args) => ({
    props: { ...args, lines: makeLines(args.lineCount) },
    template: `<lc-log-view [lines]="lines" [ariaLabel]="ariaLabel" [maxLines]="maxLines" [height]="height" [wrap]="wrap" [copyable]="copyable"
      [live]="live" [emptyText]="emptyText" [(following)]="following" />`,
  }),
};

/** No line: the log shows its empty text. */
export const Empty: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-log-view ariaLabel="Sortie du traitement" [lines]="[]" />` }),
};

/** Beyond `maxLines`, the oldest lines are dropped from the DOM and a notice says so. */
export const CappedAtMaxLines: Story = {
  parameters: fixedExample,
  render: () => ({ props: { lines: makeLines(120) }, template: `<lc-log-view ariaLabel="Sortie du traitement" [lines]="lines" [maxLines]="50" />` }),
};

/** No wrapping: a very long line scrolls horizontally. */
export const WithoutWrapping: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { lines: [{ id: 1, text: 'Une ligne très longue : '.repeat(12) }, ...makeLines(5, 2)] },
    template: `<lc-log-view ariaLabel="Sortie du traitement" [lines]="lines" [wrap]="false" />`,
  }),
};

/** Continuous append: the end is followed automatically; a "Revenir en bas" button appears after scrolling up. */
export const ContinuousAppend: Story = {
  parameters: fixedExample,
  render: () => ({ template: `<lc-log-view-live-demo />` }),
};
