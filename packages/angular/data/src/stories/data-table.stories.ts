import { ChangeDetectionStrategy, Component, ElementRef, afterNextRender, signal, viewChild } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { Observable, delay, of, throwError } from 'rxjs';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcButtonComponent, LcIconComponent, LcRevealDirective, LcStaggerDirective, lcAnimate, lcPrefersReducedMotion, localDateToIso } from '@lionelcointot/ui-angular';
import { LcStatusBadgeComponent, type LcStatusBadgeKind } from '@lionelcointot/ui-angular/feedback';
import { LcCellDirective, LcDataTableComponent, LcDataColumn, LcDataSource, LcTableQuery, lcLocalSource } from '@lionelcointot/ui-angular/data';

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
    filter: { type: 'dateRange' } },
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
const FOUR = query({ state: ['qualifie', 'encours'], urg: ['Urgente', 'Importante'], recv: { from: localDateToIso(daysAgo(30)), to: localDateToIso(daysAgo(0)) }, mgr: ['Inès Carpentier', 'Marc Delorme'] });
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

/* ---------- Demos of the `Animation` story ---------- */

const BOARD = [
  { title: 'À faire', cards: ['Maquette du tableau de bord', 'Rédiger le rapport hebdo'] },
  { title: 'En cours', cards: ['Intégration du module facturation', 'Tests de régression'] },
  { title: 'Fini', cards: ['Onboarding des nouveaux comptes'] },
];

/** Columns then cards entering in cascade (`lcReveal` under `lcStagger`): the headers take the first ranks, the cards follow column by column. */
@Component({
  selector: 'lc-board-cascade-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcRevealDirective, LcStaggerDirective],
  styles: `
    .lc-demo__board { display: flex; flex-wrap: wrap; gap: var(--lc-sys-space-4); }
    .lc-demo__column { display: grid; gap: var(--lc-sys-space-2); align-content: start; min-inline-size: 12rem; flex: 1; }
    .lc-demo__head { padding: var(--lc-sys-space-2) var(--lc-sys-space-3); font-weight: 600; --lc-reveal-y: var(--lc-sys-motion-offset-lg); --lc-reveal-curve: var(--lc-sys-easing-soft); animation-duration: var(--lc-sys-duration-long); }
    .lc-demo__card { padding: var(--lc-sys-space-3); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-sunken); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); --lc-reveal-y: calc(var(--lc-sys-motion-offset-sm) * 1.5); --lc-reveal-curve: var(--lc-sys-easing-soft); }
  `,
  template: `
    <div class="lc-demo__board" lcStagger>
      @for (column of board; track column.title; let c = $index) {
        <div class="lc-demo__column">
          <header class="lc-demo__head" lcReveal [lcRevealIndex]="c">{{ column.title }} <b>{{ column.cards.length }}</b></header>
          @for (card of column.cards; track card; let r = $index) {
            <div class="lc-demo__card" lcReveal [lcRevealIndex]="rank(c, r)">{{ card }}</div>
          }
        </div>
      }
    </div>`,
})
class BoardCascadeDemoComponent {
  protected readonly board = BOARD;
  /** Rank of a card: after all the headers, then column by column. */
  protected rank(column: number, row: number): number {
    return BOARD.length + BOARD.slice(0, column).reduce((count, previous) => count + previous.cards.length, 0) + row;
  }
}

interface Contract { id: number; label: string; status: string }
const CONTRACTS: readonly Contract[] = [
  { id: 1, label: 'Contrat n° 4821 — Halden & Moor', status: 'actif' },
  { id: 2, label: 'Entretien annuel — bureau 3C', status: 'pause' },
  { id: 3, label: 'Rénovation cuisine — lot 2', status: 'actif' },
  { id: 4, label: 'Garde d\'appartement — décembre', status: 'actif' },
  { id: 5, label: 'Audit énergétique', status: 'pause' },
];
const CONTRACT_COLUMNS: readonly LcDataColumn<Contract>[] = [
  { key: 'label', label: 'Contrat', value: (contract) => contract.label },
  { key: 'status', label: 'Statut', value: (contract) => contract.status, filter: { type: 'multi' } },
];

/** d08: a filter change empties the table at once, then the rows enter in cascade after `--lc-table-refill-delay`. "Rejouer" applies a filter (all statuses) then removes it. */
@Component({
  selector: 'lc-refill-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcDataTableComponent],
  template: `<lc-data-table caption="Contrats" [captionHidden]="true" chips="never" [source]="contracts" [columns]="columns" [trackBy]="trackBy" [(query)]="query" />`,
})
class RefillDemoComponent {
  protected readonly contracts = CONTRACTS;
  protected readonly columns = CONTRACT_COLUMNS;
  protected readonly trackBy = (contract: Contract) => contract.id;
  protected readonly query = signal<LcTableQuery>({ filters: {}, sort: null });
  /** Changes the filters without changing the rows (a key that no column uses): the table is rebuilt, the headers stay as they are. */
  replay(): void {
    this.query.update((current) => query(Object.keys(current.filters).length ? {} : { replay: ['1'] }));
  }
}

/* A day from 9 h to 17 h on 560 px: 15 minutes = 17.5 px. */
const DAY = 480;
const WIDTH = 560;
const px = (minutes: number) => (minutes / DAY) * WIDTH;
const clock = (minutes: number) => `${9 + Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
/** Drop spring: the bar squashes then recovers its shape (36 frames over 450 ms, damping 0.42). */
const springFrames = (): Keyframe[] =>
  Array.from({ length: 36 }, (_, i) => {
    const t = i / 35;
    const u = 0.016 + 0.45 * t;
    const wd = 23 * Math.sqrt(1 - 0.42 ** 2);
    const x = 1 - Math.exp(-0.42 * 23 * u) * (Math.cos(wd * u) + ((0.42 * 23) / wd) * Math.sin(wd * u));
    const scaleY = 0.78 + 0.22 * x;
    return { transform: `scaleX(${(1 - 0.113 * (scaleY - 1)).toFixed(4)}) scaleY(${scaleY.toFixed(4)})`, offset: t };
  });
const BAR_STYLES = `
  :host { display: block; }
  .lc-demo__scroll { overflow-x: auto; padding-block: var(--lc-sys-space-4); }
  .lc-demo__timeline { inline-size: 560px; display: grid; gap: var(--lc-sys-space-4); }
  .lc-demo__row { position: relative; block-size: 44px; border-radius: var(--lc-sys-radius-sm); background-image: linear-gradient(to right, var(--lc-sys-color-border) 1px, transparent 1px); background-size: calc(100% / 8) 100%; }
  .lc-demo__bar { position: absolute; inset-block: 4px; display: flex; align-items: center; padding-inline: var(--lc-sys-space-3); box-sizing: border-box; white-space: nowrap; font-variant-numeric: tabular-nums;
    border-radius: var(--lc-sys-radius-sm); background: var(--lc-sys-color-primary-container); color: var(--lc-sys-color-on-primary-container); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-primary); touch-action: none; }
  .lc-demo__bar[data-trigger] { cursor: grab; }
`;

/** Puts a bar at `start` minutes (position, width, label). */
function place(bar: HTMLElement, start: number, duration = 120): void {
  bar.style.left = `${px(start)}px`;
  bar.style.width = `${px(duration)}px`;
  bar.textContent = `${clock(start)} – ${clock(start + duration)}`;
}

/** d33: dragging the first bar shifts it (drop spring); the bar that depends on it slides to its new place a little later. */
@Component({
  selector: 'lc-follower-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcButtonComponent],
  host: { 'data-demo': 'd33' },
  styles: BAR_STYLES,
  template: `
    <button lcButton fillMode="outline" size="small" (click)="replay()">Rejouer</button>
    <div class="lc-demo__scroll">
      <div class="lc-demo__timeline">
        <div class="lc-demo__row"><div #first class="lc-demo__bar" data-trigger (pointerdown)="grab($event)"></div></div>
        <div class="lc-demo__row"><div #second class="lc-demo__bar"></div></div>
      </div>
    </div>`,
})
class FollowerDemoComponent {
  private readonly first = viewChild.required<ElementRef<HTMLElement>>('first');
  private readonly second = viewChild.required<ElementRef<HTMLElement>>('second');
  private start = 60;

  constructor() {
    afterNextRender(() => this.reset());
  }

  private reset(): void {
    this.start = 60;
    place(this.first().nativeElement, 60);
    place(this.second().nativeElement, 210);
  }

  protected replay(): void {
    this.reset();
    setTimeout(() => this.drop(165), 250);
  }

  /** Pointer drag, in steps of 15 minutes. */
  protected grab(event: PointerEvent): void {
    if (event.button !== 0 || !matchMedia('(pointer: fine)').matches) return;
    event.preventDefault();
    const bar = this.first().nativeElement;
    bar.setPointerCapture(event.pointerId);
    const from = this.start;
    let moved = from;
    let active = false;
    const move = (next: PointerEvent) => {
      const dx = next.clientX - event.clientX;
      active ||= Math.abs(dx) > 2;
      moved = Math.max(0, Math.min(DAY - 120, from + Math.round(dx / px(15)) * 15));
      bar.style.transform = `translateX(${px(moved - from)}px)`;
    };
    const up = () => {
      bar.removeEventListener('pointermove', move);
      bar.removeEventListener('pointerup', up);
      bar.removeEventListener('pointercancel', up);
      bar.style.transform = '';
      if (active && moved !== from) this.drop(moved);
    };
    bar.addEventListener('pointermove', move);
    bar.addEventListener('pointerup', up);
    bar.addEventListener('pointercancel', up);
  }

  private drop(start: number): void {
    const bar = this.first().nativeElement;
    this.start = start;
    place(bar, start);
    if (!lcPrefersReducedMotion()) bar.animate(springFrames(), { duration: 450, easing: 'linear' });
    const follower = this.second().nativeElement;
    const before = follower.getBoundingClientRect().left;
    place(follower, Math.min(DAY - 120, start + 120 + 30));
    lcAnimate(follower, [{ transform: `translateX(${before - follower.getBoundingClientRect().left}px)` }, { transform: 'none' }], { duration: '--lc-list-move-duration', easing: '--lc-list-move-easing', delay: 150 });
  }
}

/** d36: a bar moved with the arrow keys (15 minutes, 60 with Shift) slides from its old place to the new one. */
@Component({
  selector: 'lc-keyboard-bar-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcButtonComponent],
  host: { 'data-demo': 'd36' },
  styles: BAR_STYLES,
  template: `
    <button lcButton fillMode="outline" size="small" (click)="replay()">Rejouer</button>
    <div class="lc-demo__scroll">
      <div class="lc-demo__timeline">
        <div class="lc-demo__row">
          <div #bar class="lc-demo__bar" data-trigger tabindex="0" role="slider" aria-label="Horaire de la session" aria-valuemin="540" aria-valuemax="900" (keydown)="key($event)"></div>
        </div>
      </div>
    </div>`,
})
class KeyboardBarDemoComponent {
  private readonly bar = viewChild.required<ElementRef<HTMLElement>>('bar');
  private start = 75;

  constructor() {
    afterNextRender(() => this.show(this.start));
  }

  private show(start: number): void {
    const bar = this.bar().nativeElement;
    place(bar, start);
    bar.setAttribute('aria-valuenow', String(540 + start));
  }

  protected replay(): void {
    this.start = 75;
    this.show(75);
    this.bar().nativeElement.focus({ preventScroll: true });
    setTimeout(() => this.move(15), 250);
  }

  protected key(event: KeyboardEvent): void {
    const step = event.key === 'ArrowRight' ? 15 : event.key === 'ArrowLeft' ? -15 : 0;
    if (!step) return;
    event.preventDefault();
    this.move(event.shiftKey ? step * 4 : step);
  }

  private move(step: number): void {
    const bar = this.bar().nativeElement;
    const next = Math.max(0, Math.min(DAY - 120, this.start + step));
    if (next === this.start) return;
    const before = bar.getBoundingClientRect().left;
    this.start = next;
    this.show(next);
    lcAnimate(bar, [{ transform: `translateX(${before - bar.getBoundingClientRect().left}px)` }, { transform: 'none' }], { duration: '--lc-list-move-duration', easing: '--lc-list-move-easing' });
  }
}

/** Demo of the `Animation` story: the four motions of a list, each with its "Rejouer". */
@Component({
  selector: 'lc-table-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcButtonComponent, StoryMotionNoticeComponent, BoardCascadeDemoComponent, RefillDemoComponent, FollowerDemoComponent, KeyboardBarDemoComponent],
  styles: `
    section { padding-block-end: var(--lc-sys-space-6); }
    h3 { margin-block: var(--lc-sys-space-4); font-size: var(--lc-sys-font-size-md); }
  `,
  template: `
    <lc-story-motion-notice />
    <section data-demo="d07" #opening>
      <h3>Ouverture : colonnes puis cartes en cascade <button lcButton fillMode="outline" size="small" (click)="board.replay(opening)">Rejouer</button></h3>
      @for (key of board.keys(); track key) { <lc-board-cascade-demo /> }
    </section>
    <section data-demo="d08">
      <h3>Changement de filtre : liste vidée puis cascade <button lcButton fillMode="outline" size="small" (click)="refill.replay()">Rejouer</button></h3>
      <lc-refill-demo #refill />
    </section>
    <section><h3>Suppression : les suivantes glissent</h3><lc-follower-demo /></section>
    <section><h3>Tri au clavier : la ligne glisse</h3><lc-keyboard-bar-demo /></section>`,
})
class TableAnimationDemoComponent {
  protected readonly board = replayable();
}

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
  decorators: [moduleMetadata({ imports: [LcDataTableComponent, LcCellDirective, LcStatusBadgeComponent, LcButtonComponent, LcIconComponent, StoryMotionNoticeComponent, TableAnimationDemoComponent] })],
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
  // Contrôles sans effet dans l'état initial (texte d'état vide, erreur affichée après interaction…) : vérifiés à la main.
  parameters: { controlsCheck: { stateDependent: ['emptyMessage'] } },
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

const ANIMATION_CODE = `import { Component, signal } from '@angular/core';
import { LcDataTableComponent, type LcDataColumn, type LcTableQuery } from '@lionelcointot/ui-angular/data';

interface Task { id: number; title: string; state: string }

@Component({
  selector: 'app-example',
  imports: [LcDataTableComponent],
  template: \`
    <lc-data-table caption="Tâches" [source]="tasks" [columns]="columns" [trackBy]="trackBy" [(query)]="query" />\`,
})
export class ExampleComponent {
  readonly tasks: Task[] = [
    { id: 1, title: 'Rédiger le compte rendu', state: 'En cours' },
    { id: 2, title: 'Relire le contrat', state: 'Terminée' },
    { id: 3, title: 'Préparer la réunion', state: 'En cours' },
  ];
  readonly columns: LcDataColumn<Task>[] = [
    { key: 'title', label: 'Tâche', value: (task) => task.title },
    { key: 'state', label: 'État', value: (task) => task.state, filter: { type: 'multi' } },
  ];
  readonly trackBy = (task: Task) => task.id;
  readonly query = signal<LcTableQuery>({ filters: {}, sort: null });
}`;

/**
 * Four motions of a list: columns and cards entering in cascade, a table rebuilt by a filter change, a follower sliding after a drop, a bar moved with the keyboard.
 * Rows enter in cascade (`lcReveal` under `lcStagger`); a filter change empties the table at once and the new rows enter after `--lc-table-refill-delay`;
 * a sort or a deletion slides the rows that stay (`lcFlip`, `--lc-list-move-*`). "Rejouer" plays each demo again.
 */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-table-animation-demo />' }),
};
