import { Component, OnDestroy, signal } from '@angular/core';
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

/** Ajoute une ligne toutes les 600 ms : le suivi de la fin s'arrête dès qu'on défile vers le haut. */
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

const meta: Meta<LcLogViewComponent> = {
  title: 'Data/Log view',
  component: LcLogViewComponent,
  decorators: [moduleMetadata({ imports: [LcLogViewComponent, LogViewLiveDemoComponent] })],
  args: { lines: makeLines(40), ariaLabel: 'Sortie du traitement', maxLines: 500, height: '16rem', wrap: true, copyable: true, live: 'off' },
  render: (args) => ({
    props: args,
    template: `<lc-log-view [lines]="lines" [ariaLabel]="ariaLabel" [maxLines]="maxLines" [height]="height" [wrap]="wrap" [copyable]="copyable" [live]="live" />`,
  }),
};
export default meta;
type Story = StoryObj<LcLogViewComponent>;

export const Defaut: Story = {};

export const Vide: Story = { args: { lines: [] } };

/** Au-delà de `maxLines`, les plus anciennes lignes sont retirées du DOM et un avis l'indique. */
export const Plafonne: Story = { args: { lines: makeLines(120), maxLines: 50 } };

export const SansRetourALaLigne: Story = {
  args: { wrap: false, lines: [{ id: 1, text: 'Une ligne très longue : '.repeat(12) }, ...makeLines(5, 2)] },
};

/** Ajout continu : suivi automatique de la fin, bouton « Revenir en bas » après un défilement vers le haut. */
export const AjoutContinu: Story = {
  render: () => ({ template: `<lc-log-view-live-demo />` }),
};
