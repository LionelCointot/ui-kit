import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcTimelineBarComponent, type LcTimelineSegment } from '../timeline-bar/timeline-bar.component';

const PHASES: LcTimelineSegment[] = [
  { id: 'a', weight: 60, label: 'Phase A', colorSlot: 1, marker: 'circle' },
  { id: 'b', weight: 24, label: 'Phase B', colorSlot: 2, marker: 'square' },
  { id: 'c', weight: 36, label: 'Phase C', colorSlot: 1, marker: 'circle' },
];

const meta: Meta<LcTimelineBarComponent> = {
  title: 'Données/Barre de durées',
  component: LcTimelineBarComponent,
  decorators: [moduleMetadata({ imports: [LcTimelineBarComponent] })],
  args: {
    segments: PHASES,
    label: 'Répartition des phases',
    description: 'Phase A pendant 60 mois, puis phase B pendant 24 mois, puis phase C pendant 36 mois.',
    startLabel: 'Début',
    endLabel: 'Fin, 10 ans plus tard',
    minLabelShare: 0.06,
    stale: false,
    loading: false,
  },
  render: (args) => ({
    props: args,
    template: `<div style="max-width:40rem"><lc-timeline-bar [segments]="segments" [label]="label" [description]="description"
      [startLabel]="startLabel" [endLabel]="endLabel" [minLabelShare]="minLabelShare" [emptyMessage]="emptyMessage"
      [stale]="stale" [loading]="loading" /></div>`,
  }),
};
export default meta;
type Story = StoryObj<LcTimelineBarComponent>;

/** Un même emplacement (le 1) revient deux fois ; l'emplacement 2 est rayé. */
export const Defaut: Story = {};

export const TroisMotifs: Story = {
  args: {
    segments: [
      { id: 'a', weight: 40, label: 'Plein', colorSlot: 1, marker: 'circle' },
      { id: 'b', weight: 40, label: 'Rayé', colorSlot: 2, marker: 'square' },
      { id: 'c', weight: 20, label: 'Pointillé', colorSlot: 'neutral', marker: 'diamond' },
    ],
    description: 'Trois segments : plein 40, rayé 40, pointillé 20.',
  },
};

/** Un segment de durée nulle n'est pas dessiné ; un segment sous 6 % reste dans la barre mais pas dans la légende. */
export const SegmentsParticuliers: Story = {
  args: {
    segments: [
      { id: 'a', weight: 70, label: 'Longue phase', colorSlot: 1 },
      { id: 'b', weight: 0, label: 'Durée nulle', colorSlot: 3 },
      { id: 'c', weight: 3, label: 'Très courte', colorSlot: 4 },
      { id: 'd', weight: 27, label: 'Phase finale', colorSlot: 2 },
    ],
    description: 'Une longue phase de 70, une phase très courte de 3, puis une phase finale de 27.',
  },
};

export const UnSeulSegment: Story = {
  args: { segments: [{ id: 'a', weight: 12, label: 'Tout le parcours', colorSlot: 1 }], description: 'Un seul segment de 12 mois.' },
};

export const Perimee: Story = { args: { stale: true } };

export const Chargement: Story = { args: { loading: true } };

export const Vide: Story = { args: { segments: [], emptyMessage: 'Aucune phase à afficher.' } };
