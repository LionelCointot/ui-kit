import { fixedExample } from '@lc/storybook';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcTimelineBarComponent, type LcTimelineLane, type LcTimelineSegment, type LcTimelineTick } from '@lionelcointot/ui-angular/data';

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

type TimelineArgs = LcTimelineBarComponent & { hasSegments: boolean };

const DESCRIPTION = 'Phase A pendant 60 mois, puis phase B pendant 24 mois, puis phase C pendant 36 mois.';

/**
 * Proportional timeline: a single bar split into segments (width proportional to `weight`), or several lanes on a shared axis with a cross-cutting reference line.
 * Colour comes from the chart colour slots, and each slot also has a fill pattern and a legend marker, so no meaning relies on colour alone.
 * `label` names the bar and `description` is its text equivalent for assistive technologies.
 *
 * Import: `import { LcTimelineBarComponent } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<TimelineArgs> = {
  title: 'Data/Timeline bar',
  component: LcTimelineBarComponent,
  decorators: [moduleMetadata({ imports: [LcTimelineBarComponent] })],
  args: {
    label: 'Répartition des phases',
    description: DESCRIPTION,
    startLabel: 'Début',
    endLabel: 'Fin, 10 ans plus tard',
    minLabelShare: 0.06,
    emptyMessage: 'Aucune phase à afficher.',
    stale: false,
    loading: false,
    hasSegments: true,
  },
  argTypes: {
    minLabelShare: { control: { type: 'range', min: 0, max: 0.5, step: 0.01 } },
    hasSegments: { control: 'boolean', description: 'Off: no segment, so the empty message shows. Not an input of the component.' },
    segments: { control: false }, lanes: { control: false }, ticks: { control: false }, reference: { control: false },
    axisEnd: { control: false }, axisLabel: { control: false },
  },
};
export default meta;
type Story = StoryObj<TimelineArgs>;

/** Every input is bound: change them in the Controls panel. Segments and ticks are fixed demo data. */
export const Playground: Story = {
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['minLabelShare', 'emptyMessage'] } },
  render: (args) => ({
    props: { ...args, segments: args.hasSegments ? PHASES : [], ticks: GRADUATIONS },
    template: `<div style="max-width:40rem"><lc-timeline-bar [segments]="segments" [label]="label" [description]="description"
      [startLabel]="startLabel" [endLabel]="endLabel" [minLabelShare]="minLabelShare" [emptyMessage]="emptyMessage"
      [stale]="stale" [loading]="loading" [ticks]="ticks" /></div>`,
  }),
};

const bar = (inputs: string, props: Record<string, unknown> = {}, width = '40rem'): Story => ({
  parameters: fixedExample,
  render: () => ({
    props: { PHASES, DESCRIPTION, label: 'Répartition des phases', ...props },
    template: `<div style="width:${width};max-width:100%"><lc-timeline-bar [label]="label" ${inputs} /></div>`,
  }),
});

/** Three patterns: solid, striped and dotted, each with its own legend marker. */
export const ThreePatterns: Story = bar(`[segments]="segments" description="Trois segments : plein 40, rayé 40, pointillé 20."`, {
  segments: [
    { id: 'a', weight: 40, label: 'Plein', colorSlot: 1, marker: 'circle' },
    { id: 'b', weight: 40, label: 'Rayé', colorSlot: 2, marker: 'square' },
    { id: 'c', weight: 20, label: 'Pointillé', colorSlot: 'neutral', marker: 'diamond' },
  ],
});

/** A zero-weight segment is not drawn; a segment under 6% stays in the bar but not in the legend. */
export const SpecialSegments: Story = bar(`[segments]="segments" description="Une longue phase de 70, une phase très courte de 3, puis une phase finale de 27."`, {
  segments: [
    { id: 'a', weight: 70, label: 'Longue phase', colorSlot: 1 },
    { id: 'b', weight: 0, label: 'Durée nulle', colorSlot: 3 },
    { id: 'c', weight: 3, label: 'Très courte', colorSlot: 4 },
    { id: 'd', weight: 27, label: 'Phase finale', colorSlot: 2 },
  ],
});

/** A single segment fills the whole bar. */
export const SingleSegment: Story = bar(`[segments]="segments" description="Un seul segment de 12 mois."`, {
  segments: [{ id: 'a', weight: 12, label: 'Tout le parcours', colorSlot: 1 }],
});

const lanesBar = (width: string, lanes: LcTimelineLane[] = LANES, description = 'La voie A est devant de 0 à 10 ans et 10 mois, puis la voie B de 10 ans et 10 mois à 20 ans.', withReference = true): Story =>
  bar(`[lanes]="lanes" [axisEnd]="240" [reference]="reference" [ticks]="ticks" axisLabel="Années depuis le début" [description]="description"`,
    { lanes, ticks: LANES_TICKS, description, label: 'Qui est devant, et quand', reference: withReference ? { at: 130, label: '10 ans et 10 mois' } : undefined }, width);

/**
 * Two lanes aligned on one axis (striped square / solid circle), "devant de … à …" under the name, labelled cross-cutting reference line. From 700 px, the name sits left of the track.
 * The striped lane has a 2 px edge, darker in light mode and lighter in dark mode (at least 3:1 against the track);
 * tunable with `--lc-timeline-bar-striped-edge` (colour) and `--lc-timeline-bar-striped-edge-width`.
 */
export const TwoLanes: Story = lanesBar('60rem');

/** 360 px: the name and text of each lane sit above its track; ticks and reference stay aligned with the tracks. */
export const TwoLanesNarrow: Story = lanesBar('360px');

/** A lane with no coloured part ("jamais devant") and no reference line. */
export const LaneNeverAhead: Story = lanesBar(
  '60rem',
  [
    { ...LANES[0], caption: 'devant de 0 à 20 ans', spans: [{ from: 0, to: 240 }] },
    { ...LANES[1], caption: 'jamais devant', spans: [] },
  ],
  'La voie A est devant pendant toute la durée ; la voie B n\'est jamais devant.',
  false,
);

/** Forced loading: `[loading]="true"` shows the skeleton over existing data. */
export const Loading: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { PHASES, DESCRIPTION },
    template: `<lc-timeline-bar style="display:block;width:40rem;max-width:100%" label="Répartition des phases, rechargée" [segments]="PHASES" [description]="DESCRIPTION" [loading]="true" />`,
  }),
};

/** Data states: `undefined` shows the skeleton, `null` or `[]` the empty message, `stale` dims the bar during a reload. The last bar has its segments, for comparison. */
export const States: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { PHASES, DESCRIPTION },
    template: `<div style="display:grid;gap:var(--lc-sys-space-6);width:40rem;max-width:100%">
      <section><h3>Chargement</h3><lc-timeline-bar label="Répartition des phases" [segments]="undefined" /></section>
      <section><h3>Vide</h3><lc-timeline-bar label="Répartition des phases" [segments]="null" emptyMessage="Aucune phase à afficher." /></section>
      <section><h3>Rechargement</h3><lc-timeline-bar label="Répartition des phases" [segments]="PHASES" [description]="DESCRIPTION" [stale]="true" /></section>
      <section><h3>Trois segments</h3><lc-timeline-bar label="Répartition des phases" [segments]="PHASES" [description]="DESCRIPTION" /></section></div>`,
  }),
};

/** Decorative ticks under the track (`at` in the weight unit); `description` remains the text equivalent. */
export const WithTicks: Story = bar(`[segments]="PHASES" [description]="DESCRIPTION" [ticks]="ticks"`, { ticks: GRADUATIONS });

/** Two labels that would overlap: the second is visually hidden, its tick stays. Narrow the width to watch the hiding change. */
export const CrowdedTicks: Story = bar(`[segments]="PHASES" [description]="DESCRIPTION" [ticks]="ticks"`, {
  ticks: [
    { at: 0, label: 'Début' },
    { at: 58, label: 'Cinq ans' },
    { at: 62, label: 'Cinq ans et demi' },
    { at: 120, label: 'Fin' },
  ],
});
