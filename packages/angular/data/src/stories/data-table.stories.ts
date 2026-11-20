import { signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { Observable, delay, of, throwError } from 'rxjs';
import { fixedExample } from '@lc/storybook';
import { LcButtonComponent, LcIconComponent, localDateToIso } from '@lionelcointot/ui-angular';
import { LcStatusBadgeComponent, type LcStatusBadgeKind } from '@lionelcointot/ui-angular/feedback';
import { LcCellDirective } from '../table/cell.directive';
import { LcDataTableComponent } from '../data-table/data-table.component';
import { LcDataColumn, LcDataSource, LcTableQuery, lcLocalSource } from '../data-table/data-table-model';

/* Demo data: a request queue (tickets). Dates are relative to today. */
interface Ticket { id: number; title: string; copro: string; urg: string; state: string; todo: string; mgr: string; recv: number; last: number }

const STATES: Record<string, { label: string; icon: string; kind: LcStatusBadgeKind }> = {
  nouveau: { label: 'Nouvelle', icon: 'circle-dashed', kind: 'info' },
  qualifie: { label: 'Qualifiée', icon: 'user-pen', kind: 'neutral' },
  encours: { label: 'En cours', icon: 'activity', kind: 'highlight' },
  attente: { label: 'En attente', icon: 'clock', kind: 'warning' },
  resolu: { label: 'Résolue', icon: 'circle-check', kind: 'success' },
  clos: { label: 'Close', icon: 'check', kind: 'neutral' },
  rejete: { label: 'Rejetée', icon: 'circle-x', kind: 'error' },
};
const URGENCY: Record<string, LcStatusBadgeKind | null> = { Urgente: 'error', Importante: 'warning', Normale: null };

const t = (id: number, title: string, copro: string, urg: string, state: string, todo: string, mgr: string, recv: number, last: number): Ticket =>
  ({ id, title, copro, urg, state, todo, mgr, recv, last });
const TICKETS: Ticket[] = [
  t(1047, 'Bruit de ventilation dans la cage d\'escalier B', 'Résidence Les Tilleuls', 'Normale', 'nouveau', 'Qualifier', '', 0, 0),
  t(1046, 'Portail du parking bloqué en position ouverte', 'Parc des Cèdres', 'Urgente', 'nouveau', 'Qualifier', '', 2, 2),
  t(1044, 'Dégât des eaux sur le palier du 2e étage', 'Le Clos Saint-Jean', 'Urgente', 'nouveau', 'Qualifier', '', 3, 3),
  t(1042, 'Infiltration d\'eau dans ma cave', 'Résidence Les Tilleuls', 'Urgente', 'encours', 'Suivre la réparation', 'Marc Delorme', 5, 1),
  t(1040, 'L\'interphone de mon appartement ne sonne plus', 'Résidence du Port', 'Normale', 'nouveau', 'Qualifier', '', 6, 6),
  t(1038, 'Ascenseur du bâtiment B en panne', 'Résidence Les Tilleuls', 'Importante', 'attente', 'Relancer l\'ascensoriste', 'Marc Delorme', 8, 3),
  t(1036, 'Lumière du parking en panne au niveau -1', 'Résidence Les Tilleuls', 'Importante', 'encours', 'Répondre à Paul Martin', 'Marc Delorme', 9, 1),
  t(1035, 'Ampoule grillée dans le hall du bâtiment A', 'Résidence Les Tilleuls', 'Normale', 'resolu', 'Confirmation attendue', 'Marc Delorme', 10, 3),
  t(1033, 'Fissure sur la façade côté cour', 'Le Clos Saint-Jean', 'Importante', 'qualifie', 'Demander un devis', 'Inès Carpentier', 11, 8),
  t(1031, 'Odeur de gaz dans le local poubelles', 'Parc des Cèdres', 'Urgente', 'encours', 'Suivre l\'intervention', 'Inès Carpentier', 12, 2),
  t(1029, 'La porte du local vélos ne ferme plus', 'Résidence Les Tilleuls', 'Importante', 'qualifie', 'Commencer le traitement', 'Marc Delorme', 13, 9),
  t(1027, 'Digicode de l\'entrée B hors service', 'Les Jardins de Monplaisir', 'Importante', 'attente', 'Attendre la pièce', 'Paul Girard', 15, 5),
  t(1025, 'Infiltration par la toiture-terrasse', 'Villa Bellecour', 'Urgente', 'encours', 'Valider le devis', 'Claire Dubois', 16, 1),
  t(1024, 'Arbre mort dans le jardin commun', 'Les Terrasses de Fourvière', 'Normale', 'qualifie', 'Commander l\'élagage', 'Paul Girard', 17, 10),
  t(1022, 'Nuisances sonores d\'un chantier voisin', 'Le Saint-Exupéry', 'Normale', 'attente', 'Attendre la mairie', 'Claire Dubois', 19, 12),
  t(1021, 'Boîte aux lettres cassée', 'Résidence Les Tilleuls', 'Normale', 'clos', '', 'Marc Delorme', 20, 12),
  t(1020, 'Moisissures dans la cave commune', 'Résidence Gerland', 'Importante', 'encours', 'Planifier le traitement', 'Inès Carpentier', 21, 4),
  t(1019, 'Badge du parking à reprogrammer', 'Le Carré Croix-Rousse', 'Normale', 'resolu', 'Confirmation attendue', 'Paul Girard', 22, 2),
  t(1018, 'Duplicata de clé du local vélos', 'Résidence Les Tilleuls', 'Normale', 'rejete', '', 'Marc Delorme', 24, 22),
  t(1017, 'Fuite au robinet du local ménage', 'Domaine de la Doua', 'Normale', 'resolu', 'Confirmation attendue', 'Claire Dubois', 25, 5),
  t(1016, 'Gouttière bouchée au-dessus du porche', 'Les Balcons du Parc', 'Normale', 'clos', '', 'Inès Carpentier', 26, 9),
  t(1014, 'Devis pour des travaux privatifs', 'Parc des Cèdres', 'Normale', 'rejete', '', 'Inès Carpentier', 28, 20),
];

const daysAgo = (days: number) => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
};
const ago = (n: number) => (n === 0 ? 'aujourd\'hui' : n === 1 ? 'hier' : n < 7 ? `il y a ${n} jours` : n < 14 ? 'il y a 1 semaine' : `il y a ${Math.floor(n / 7)} semaines`);
const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

const columns: LcDataColumn<Ticket>[] = [
  { key: 'title', label: 'Demande', minWidth: '10rem', value: (row) => `${row.title} #${row.id}`,
    filter: { type: 'text', label: 'Sujet ou numéro', hint: 'Ex. : fuite, 1042. Accents et majuscules ne comptent pas.' } },
  { key: 'copro', label: 'Copropriété', width: '8rem', value: (row) => row.copro, filter: { type: 'multi' } },
  { key: 'urg', label: 'Urgence', width: '7.5rem', value: (row) => row.urg, filter: { type: 'multi', order: ['Urgente', 'Importante', 'Normale'] } },
  { key: 'state', label: 'État', width: '6.75rem', value: (row) => row.state,
    filter: { type: 'multi', order: Object.keys(STATES), format: (value) => STATES[value]?.label ?? value, icon: (value) => STATES[value]?.icon ?? null } },
  { key: 'todo', label: 'À faire', width: '6.5rem', value: (row) => row.todo || 'Rien à faire' },
  { key: 'last', label: 'Dernière nouvelle', width: '7.5rem', sortable: true, value: (row) => localDateToIso(daysAgo(row.last)),
    filter: { type: 'single', options: [
      { value: 'today', label: 'Aujourd\'hui', match: (row) => row.last === 0 },
      { value: 'week', label: 'Ces 7 derniers jours', match: (row) => row.last <= 7 },
      { value: 'stale', label: 'Sans nouvelle depuis plus de 7 jours', match: (row) => row.last > 7 },
    ] } },
  { key: 'mgr', label: 'Assignée à', width: '7.25rem', value: (row) => row.mgr, filter: { type: 'multi', format: (value) => value || 'Non assignée' } },
  { key: 'recv', label: 'Reçue le', chipLabel: 'Reçue', width: '7.75rem', sortable: true, value: (row) => localDateToIso(daysAgo(row.recv)),
    filter: { type: 'dateRange', presets: [7, 30] } },
  { key: 'open', label: 'Voir la demande', cardOnly: true },
];

/** Simulated server source: delay, and the `distinct` call of the "Assignée à" column fails on the first call (the second succeeds). */
function simulatedSource(wait = 900): LcDataSource<Ticket> {
  const local = lcLocalSource(TICKETS, columns);
  let failures = 1;
  return {
    rows: (query) => local.rows(query).pipe(delay(wait)),
    distinct: (column, query) => {
      if (column === 'mgr' && failures-- > 0) return throwError(() => new Error('indisponible')).pipe(delay(wait)) as Observable<never>;
      return local.distinct(column, query).pipe(delay(wait));
    },
  };
}

/** Source whose distinct values never finish loading (frozen loading state). */
const frozenSource: LcDataSource<Ticket> = {
  rows: (query) => lcLocalSource(TICKETS, columns).rows(query),
  distinct: () => new Observable<never>(),
};

const query = (filters: LcTableQuery['filters']): LcTableQuery => ({ filters, sort: null });
const FOUR = query({ state: ['qualifie', 'encours'], urg: ['Urgente', 'Importante'], recv: { preset: 30 }, mgr: ['Inès Carpentier', 'Marc Delorme'] });
const PHONE = query({ state: ['qualifie', 'encours'], urg: ['Urgente'] });
const NONE = query({ state: ['rejete'], urg: ['Urgente'] });

const template = (bindings: string) => `
  <lc-data-table ${bindings} [source]="source" [columns]="columns" [trackBy]="trackBy" [(query)]="query">
    <ng-template lcCell="title" let-row>
      <a class="story-link" href="#" (click)="$event.preventDefault()">{{ row.title }}</a>
      <div class="story-muted">#{{ row.id }}</div>
    </ng-template>
    <ng-template lcCell="urg" let-row>
      @if (urgency[row.urg]; as kind) { <lc-status-badge [kind]="kind" size="small">{{ row.urg }}</lc-status-badge> }
      @else { <span class="story-muted">{{ row.urg }}</span> }
    </ng-template>
    <ng-template lcCell="state" let-row>
      <lc-status-badge [kind]="states[row.state].kind" [icon]="states[row.state].icon" size="small">{{ states[row.state].label }}</lc-status-badge>
    </ng-template>
    <ng-template lcCell="last" let-row><span class="story-muted">{{ ago(row.last) }}</span></ng-template>
    <ng-template lcCell="mgr" let-row>@if (row.mgr) { {{ row.mgr }} } @else { <span class="story-muted">Non assignée</span> }</ng-template>
    <ng-template lcCell="recv" let-row>{{ day(row.recv) }}</ng-template>
    <ng-template lcCell="open" let-row>
      <a lcButton fillMode="flat" themeColor="neutral" size="small" href="#" (click)="$event.preventDefault()">Voir la demande<lc-icon name="arrow-right" /></a>
    </ng-template>
  </lc-data-table>
  <style>
    .story-link { color: var(--lc-sys-color-on-surface); font-size: var(--lc-sys-font-size-md); text-decoration: none; }
    .story-link:hover { text-decoration: underline; }
    .story-muted { color: var(--lc-sys-color-on-surface-muted); font-size: var(--lc-sys-font-size-xs); }
  </style>`;

/** Bindings of the fixed examples: hidden caption and the given `chips` mode. */
const fixedBindings = (chips = 'auto') => `caption="File des demandes" [captionHidden]="true" chips="${chips}"`;

const props = (source: LcDataSource<Ticket> | readonly Ticket[], initial: LcTableQuery = query({})) => ({
  source, columns, trackBy: (row: Ticket) => row.id, query: signal(initial),
  urgency: URGENCY, states: STATES, ago, day: (days: number) => shortDate.format(daysAgo(days)),
});

/**
 * Filterable data table for a request queue: a funnel button per column opens a filter menu (multi-choice, free text, single choice or date range),
 * active filters show as a summary line or chips, and below 768 px the rows become cards with a filter panel.
 * The data comes from an array (filtered locally) or from a `LcDataSource` (server): rows and the distinct values of a column.
 * `query` (filters and sort) is two-way. Cells are customised with `lcCell` templates.
 *
 * Import: `import { LcDataTableComponent, lcLocalSource } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<LcDataTableComponent<Ticket>> = {
  title: 'Data/Data table',
  component: LcDataTableComponent,
  decorators: [moduleMetadata({ imports: [LcDataTableComponent, LcCellDirective, LcStatusBadgeComponent, LcButtonComponent, LcIconComponent] })],
  args: { caption: 'File des demandes', captionHidden: true, chips: 'auto', emptyMessage: 'Aucune demande ne correspond aux filtres.' },
  argTypes: {
    chips: { control: 'inline-radio', options: ['auto', 'always', 'never'] },
    source: { control: false }, columns: { control: false }, trackBy: { control: false }, query: { control: false },
  },
};
export default meta;
type Story = StoryObj<LcDataTableComponent<Ticket>>;

/** Every input is bound: change them in the Controls panel. Open a funnel to filter; filter down to nothing to see `emptyMessage`. Under 768 px: cards and a filter panel. */
export const Playground: Story = {
  render: (args) => ({
    props: { ...props(TICKETS), ...args },
    template: template('[caption]="caption" [captionHidden]="captionHidden" [chips]="chips" [emptyMessage]="emptyMessage"'),
  }),
};

/** Four active filters: filled funnels and an "N of total" line (chips under 768 px). */
export const ActiveFilters: Story = {
  parameters: fixedExample,
  render: () => ({ props: props(TICKETS, FOUR), template: template(fixedBindings()) }),
};

/** To view under 768 px: two filters, chips, a "Filtres (2)" button and the panel. */
export const Phone: Story = {
  parameters: fixedExample,
  render: () => ({ props: props(TICKETS, PHONE), template: template(fixedBindings()) }),
};

/** No result for the active filters; the "Assignée à" menu then has no value to offer. */
export const NoResult: Story = {
  parameters: fixedExample,
  render: () => ({ props: props(TICKETS, NONE), template: template(fixedBindings()) }),
};

/** Simulated server source (0.9 s delay): "Assignée à" fails on the first load, "Réessayer" succeeds. */
export const ServerSource: Story = {
  parameters: fixedExample,
  render: () => ({ props: props(simulatedSource(), query({ urg: ['Urgente', 'Importante'], mgr: ['Marc Delorme'] })), template: template(fixedBindings()) }),
};

/** Frozen loading state: the distinct values never finish loading. */
export const LoadingValues: Story = {
  parameters: fixedExample,
  render: () => ({ props: props(frozenSource), template: template(fixedBindings()) }),
};

/** Chips on desktop too (`chips="always"`), in place of the summary line. */
export const AlwaysChips: Story = {
  parameters: fixedExample,
  render: () => ({ props: props(TICKETS, PHONE), template: template(fixedBindings('always')) }),
};
