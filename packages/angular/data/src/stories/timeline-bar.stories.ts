import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcTimelineBarComponent, type LcTimelineLane, type LcTimelineSegment, type LcTimelineTick } from '../timeline-bar/timeline-bar.component';

const PHASES: LcTimelineSegment[] = [
  { id: 'a', weight: 60, label: 'Phase A', colorSlot: 1, marker: 'circle' },
  { id: 'b', weight: 24, label: 'Phase B', colorSlot: 2, marker: 'square' },
  { id: 'c', weight: 36, label: 'Phase C', colorSlot: 1, marker: 'circle' },
];

const GRADUATIONS: LcTimelineTick[] = [
  { at: 0, label: '0' },
  { at: 24, label: '2 ans' },
  { at: 60, label: '5 ans' },
  { at: 96, label: '8 ans' },
  { at: 120, label: '10 ans' },
];

/** Deux voies sur un même axe de 20 ans (en mois) : la première est devant jusqu'au mois 130, la seconde ensuite ; repère transversal au mois 130. */
const LANES: LcTimelineLane[] = [
  { id: 'a', label: 'Voie A', caption: 'devant de 0 à 10 ans et 10 mois', colorSlot: 2, marker: 'square', spans: [{ from: 0, to: 130 }] },
  { id: 'b', label: 'Voie B', caption: 'devant de 10 ans et 10 mois à 20 ans', colorSlot: 1, marker: 'circle', spans: [{ from: 130, to: 240 }] },
];

const LANES_TICKS: LcTimelineTick[] = [0, 60, 120, 180, 240].map((at) => ({ at, label: at === 0 ? '0' : `${at / 12} ans` }));

const meta: Meta<LcTimelineBarComponent> = {
  title: 'Data/Timeline bar',
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
    ticks: [],
  },
  render: (args) => ({
    props: args,
    template: `<div style="max-width:40rem"><lc-timeline-bar [segments]="segments" [label]="label" [description]="description"
      [startLabel]="startLabel" [endLabel]="endLabel" [minLabelShare]="minLabelShare" [emptyMessage]="emptyMessage"
      [stale]="stale" [loading]="loading" [ticks]="ticks" /></div>`,
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

const lanesStory = (width: string): Story => ({
  args: {
    segments: [],
    lanes: LANES,
    axisEnd: 240,
    reference: { at: 130, label: '10 ans et 10 mois' },
    ticks: LANES_TICKS,
    axisLabel: 'Années depuis le début',
    label: 'Qui est devant, et quand',
    description: 'La voie A est devant de 0 à 10 ans et 10 mois, puis la voie B de 10 ans et 10 mois à 20 ans.',
  },
  render: (args) => ({
    props: args,
    template: `<div style="width:${width};max-width:100%"><lc-timeline-bar [lanes]="lanes" [axisEnd]="axisEnd" [reference]="reference" [ticks]="ticks"
      [axisLabel]="axisLabel" [label]="label" [description]="description" [stale]="stale" [loading]="loading" /></div>`,
  }),
});

/**
 * Deux voies alignées sur un même axe (carré rayé / rond plein), « devant de … à … » sous le nom, repère transversal étiqueté. Dès 700 px, le nom est à gauche de la piste.
 * Le liseré de la voie rayée fait 2 px, d'une teinte plus sombre en clair et plus claire en sombre (≥ 3:1 contre la piste) ;
 * réglable par `--lc-timeline-bar-striped-edge` (couleur) et `--lc-timeline-bar-striped-edge-width`.
 */
export const DeuxVoies: Story = lanesStory('60rem');

/** 360 px : le nom et le texte de chaque voie surmontent sa piste ; graduations et repère restent alignés sur les pistes. */
export const DeuxVoies360: Story = lanesStory('360px');

/** Une voie sans partie colorée (« jamais devant ») et pas de repère. */
export const VoieJamaisDevant: Story = {
  ...lanesStory('60rem'),
  args: {
    ...lanesStory('60rem').args,
    lanes: [
      { ...LANES[0], caption: 'devant de 0 à 20 ans', spans: [{ from: 0, to: 240 }] },
      { ...LANES[1], caption: 'jamais devant', spans: [] },
    ],
    reference: undefined,
    description: 'La voie A est devant pendant toute la durée ; la voie B n\'est jamais devant.',
  },
};

export const Perimee: Story = { args: { stale: true } };

export const Chargement: Story = { args: { loading: true } };

export const Vide: Story = { args: { segments: [], emptyMessage: 'Aucune phase à afficher.' } };

/** Graduations décoratives sous la piste (`at` dans l'unité des poids) ; `description` reste le texte équivalent. */
export const AvecGraduations: Story = { args: { ticks: GRADUATIONS } };

/** Deux libellés qui se chevaucheraient : le second est masqué visuellement, sa graduation reste. Réduire la largeur pour voir le masquage évoluer. */
export const GraduationsSerrees: Story = {
  args: {
    ticks: [
      { at: 0, label: 'Début' },
      { at: 58, label: 'Cinq ans' },
      { at: 62, label: 'Cinq ans et demi' },
      { at: 120, label: 'Fin' },
    ],
  },
};
