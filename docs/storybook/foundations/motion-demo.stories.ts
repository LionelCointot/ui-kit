import { provideLocationMocks } from '@angular/common/testing';
import { ChangeDetectionStrategy, Component, ElementRef, Injectable, Injector, afterNextRender, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterOutlet, type Routes } from '@angular/router';
import { applicationConfig, moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { StoryMotionNoticeComponent, fixedExample, replayable } from '@lc/storybook';
import { LcAvatarComponent, LcButtonComponent, LcIconComponent, LcThemeToggleComponent } from '@lionelcointot/ui-angular';
import { LcBarChartComponent, type LcCartesianData } from '@lionelcointot/ui-angular/charts';
import {
  LcActivityFeedComponent, LcActivityItemComponent, LcCellDirective, LcDataTableComponent, LcDescriptionListComponent, LcKpiCardComponent,
  type LcDataColumn, type LcDescriptionItem,
} from '@lionelcointot/ui-angular/data';
import {
  LcEmptyStateComponent, LcProgressBarComponent, LcStatusBadgeComponent, LcToastOutletComponent, LcToastService, type LcStatusBadgeKind,
} from '@lionelcointot/ui-angular/feedback';
import { LcCheckboxDirective, LcInputDirective, LcFormFieldComponent, LcSegmentedControlComponent, LcSwitchComponent } from '@lionelcointot/ui-angular/forms';
import {
  LcAppShellComponent, LcCardComponent, LcCardHeaderComponent, LcDisclosureComponent, LcGridComponent, LcPageComponent,
} from '@lionelcointot/ui-angular/layout';
import {
  LcMenuComponent, LcMenuItemComponent, LcMenuTriggerDirective, LcNavItemComponent, LcNavListComponent, LcTabComponent, LcTabsComponent,
} from '@lionelcointot/ui-angular/navigation';
import { LcDialogService, LcDrawerComponent, LcDrawerRef, LcDrawerService } from '@lionelcointot/ui-angular/overlay';

/* ---------- Données de démonstration (génériques) ---------- */

type Status = 'progress' | 'done' | 'late';
interface Task { readonly id: number; readonly title: string; readonly domain: string; readonly status: Status; readonly owner: string; readonly due: string }

const STATUS: Record<Status, { label: string; kind: LcStatusBadgeKind }> = {
  progress: { label: 'En cours', kind: 'highlight' },
  done: { label: 'Terminée', kind: 'success' },
  late: { label: 'En retard', kind: 'error' },
};
const DOMAINS = ['Design', 'Qualité', 'Produit', 'Technique'] as const;
const TASKS: readonly Task[] = [
  { id: 1, title: 'Maquette de l\'accueil', domain: 'Design', status: 'progress', owner: 'Camille', due: '4 décembre' },
  { id: 2, title: 'Plan de test', domain: 'Qualité', status: 'done', owner: 'Yanis', due: '27 novembre' },
  { id: 3, title: 'Atelier de lancement', domain: 'Produit', status: 'progress', owner: 'Nadia', due: '9 décembre' },
  { id: 4, title: 'Migration des données', domain: 'Technique', status: 'late', owner: 'Yanis', due: '20 novembre' },
  { id: 5, title: 'Guide de contribution', domain: 'Produit', status: 'done', owner: 'Camille', due: '24 novembre' },
  { id: 6, title: 'Revue de l\'accessibilité', domain: 'Qualité', status: 'progress', owner: 'Nadia', due: '12 décembre' },
];
const PROJECTS = [{ name: 'Refonte du site', value: 72 }, { name: 'Migration des données', value: 45 }, { name: 'Documentation', value: 88 }];
const PEOPLE: readonly { name: string; role: string; kind: LcStatusBadgeKind; state: string }[] = [
  { name: 'Camille', role: 'Design', kind: 'success', state: 'En ligne' },
  { name: 'Yanis', role: 'Technique', kind: 'warning', state: 'Occupé' },
  { name: 'Nadia', role: 'Produit', kind: 'neutral', state: 'Absente' },
];
const WEEKS: LcCartesianData = {
  categories: ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'],
  series: [{ id: 'done', label: 'Tâches terminées', values: [118, 142, 131, 176, 203, 224] }],
};

type StatusFilter = 'all' | Status;
const STATUS_OPTIONS = [{ value: 'all', label: 'Toutes' }, { value: 'progress', label: 'En cours' }, { value: 'done', label: 'Terminées' }, { value: 'late', label: 'En retard' }];

/** État partagé de la démo : liste, filtres. Réinitialisé par « Réinitialiser la liste ». */
@Injectable({ providedIn: 'root' })
class DemoStore {
  readonly tasks = signal<readonly Task[]>(TASKS);
  readonly status = signal<StatusFilter>('all');
  readonly domains = signal<readonly string[]>([]);
  readonly visible = computed(() => {
    const status = this.status();
    const domains = this.domains();
    return this.tasks().filter((task) => (status === 'all' || task.status === status) && (!domains.length || domains.includes(task.domain)));
  });

  remove(task: Task): void {
    this.tasks.update((list) => list.filter((item) => item.id !== task.id));
  }

  toggleDomain(domain: string): void {
    this.domains.update((list) => (list.includes(domain) ? list.filter((item) => item !== domain) : [...list, domain]));
  }

  reset(): void {
    this.tasks.set(TASKS);
    this.status.set('all');
    this.domains.set([]);
  }
}

/* ---------- Rubriques ---------- */

@Component({
  imports: [
    LcPageComponent, LcGridComponent, LcCardComponent, LcCardHeaderComponent, LcKpiCardComponent, LcProgressBarComponent, LcBarChartComponent,
    LcActivityFeedComponent, LcActivityItemComponent, LcAvatarComponent, LcStatusBadgeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lc-page title="Tableau de bord" description="Équipe Atelier, six dernières semaines.">
      <div style="display:grid;gap:var(--lc-sys-space-4)">
        <lc-grid [columns]="{ base: 1, sm: 2, lg: 4 }" gap="4">
          <lc-kpi-card label="Projets actifs" [value]="24" format="integer" [delta]="{ value: 2, format: 'integer', trend: 'up', sentiment: 'positive' }" />
          <lc-kpi-card label="Tâches terminées" [value]="1248" format="integer" />
          <lc-kpi-card label="En retard" [value]="7" format="integer" />
          <lc-kpi-card label="Respect des délais" [value]="92" format="percent" />
        </lc-grid>
        <lc-grid [columns]="{ base: 1, md: 2 }" gap="4">
          <lc-card style="align-self:start">
            <lc-card-header title="Avancement des projets" />
            <div style="display:grid;gap:var(--lc-sys-space-4)">
              @for (project of projects; track project.name) { <lc-progress-bar [value]="project.value" [label]="project.name" /> }
            </div>
          </lc-card>
          <lc-card>
            <lc-card-header title="Tâches terminées" subtitle="Par semaine" />
            <lc-bar-chart title="Tâches terminées par semaine" [titleHidden]="true" [data]="weeks" height="200px" />
          </lc-card>
          <lc-card>
            <lc-card-header title="Activité récente" />
            <ol lcActivityFeed density="compact">
              <li lcActivityItem icon="check" heading="Plan de test terminé" date="Aujourd'hui">Yanis a validé la dernière étape.</li>
              <li lcActivityItem icon="pencil" heading="Maquette de l'accueil modifiée" date="Hier">Camille a ajouté une variante.</li>
              <li lcActivityItem icon="plus" heading="Atelier de lancement créé" date="Il y a 2 jours">Nadia a invité l'équipe.</li>
            </ol>
          </lc-card>
          <lc-card>
            <lc-card-header title="Équipe" />
            <div style="display:grid;gap:var(--lc-sys-space-3)">
              @for (person of people; track person.name) {
                <div style="display:flex;align-items:center;gap:var(--lc-sys-space-3)">
                  <lc-avatar [name]="person.name" />
                  <span style="flex:1">{{ person.name }}<br /><small style="color:var(--lc-sys-color-on-surface-muted)">{{ person.role }}</small></span>
                  <lc-status-badge [kind]="person.kind" size="small">{{ person.state }}</lc-status-badge>
                </div>
              }
            </div>
          </lc-card>
        </lc-grid>
      </div>
    </lc-page>`,
})
class DashboardPageComponent {
  protected readonly projects = PROJECTS;
  protected readonly people = PEOPLE;
  protected readonly weeks = WEEKS;
}

/** Contenu du tiroir « Filtrer » : les domaines cochés s'appliquent aussitôt à la liste. */
@Component({
  imports: [LcDrawerComponent, LcButtonComponent, LcCheckboxDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lc-drawer title="Filtrer par domaine">
      <div style="display:grid;gap:var(--lc-sys-space-3)">
        @for (domain of domains; track domain) {
          <label><input type="checkbox" lcCheckbox [checked]="store.domains().includes(domain)" (change)="store.toggleDomain(domain)" /> {{ domain }}</label>
        }
      </div>
      <ng-container lcDrawerActions>
        <button lcButton type="button" fillMode="outline" themeColor="neutral" (click)="store.domains.set([])">Effacer</button>
        <button lcButton type="button" (click)="ref.close()">Voir les tâches</button>
      </ng-container>
    </lc-drawer>`,
})
class FilterDrawerComponent {
  protected readonly store = inject(DemoStore);
  protected readonly ref = inject<LcDrawerRef>(LcDrawerRef);
  protected readonly domains = DOMAINS;
}

@Component({
  imports: [
    LcPageComponent, LcDataTableComponent, LcCellDirective, LcSegmentedControlComponent, LcStatusBadgeComponent, LcButtonComponent, LcIconComponent,
    LcEmptyStateComponent, LcMenuComponent, LcMenuItemComponent, LcMenuTriggerDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lc-page title="Liste" description="Les tâches de l'équipe. Ouvrez une tâche pour son détail.">
      <div lcPageToolbar style="display:flex;flex-wrap:wrap;align-items:center;gap:var(--lc-sys-space-3)">
        <lc-segmented-control ariaLabel="Filtrer par statut" [options]="statusOptions" [(value)]="store.status" />
        <button lcButton type="button" fillMode="outline" themeColor="neutral" (click)="openFilter()"><lc-icon name="funnel" />Filtrer</button>
      </div>
      @if (store.tasks().length) {
        <lc-data-table caption="Tâches" [captionHidden]="true" [source]="store.visible()" [columns]="columns" [trackBy]="trackBy" emptyMessage="Aucune tâche ne correspond.">
          <ng-template lcCell="title" let-row>
            <button lcButton type="button" fillMode="flat" themeColor="neutral" size="small" [attr.data-task]="row.id" (click)="open(row)">{{ row.title }}</button>
          </ng-template>
          <ng-template lcCell="status" let-row><lc-status-badge [kind]="statuses[row.status].kind" size="small">{{ statuses[row.status].label }}</lc-status-badge></ng-template>
          <ng-template lcCell="actions" let-row>
            <button lcButton type="button" iconOnly fillMode="flat" themeColor="neutral" size="small" [attr.data-menu]="row.id" [lcMenuTriggerFor]="menu" [attr.aria-label]="'Actions : ' + row.title">
              <lc-icon name="ellipsis-vertical" />
            </button>
            <lc-menu #menu ariaLabel="Actions de la tâche">
              <button lcMenuItem icon="pencil" (click)="open(row)">Ouvrir</button>
              <button lcMenuItem icon="trash-2" destructive (click)="confirmRemove(row)">Supprimer</button>
            </lc-menu>
          </ng-template>
        </lc-data-table>
      } @else {
        <lc-empty-state icon="list-checks" title="Plus aucune tâche" description="Toutes les tâches ont été supprimées.">
          <button lcEmptyActions lcButton type="button" (click)="store.reset()"><lc-icon name="rotate-ccw" />Réinitialiser la liste</button>
        </lc-empty-state>
      }
    </lc-page>`,
})
class ListPageComponent {
  protected readonly store = inject(DemoStore);
  private readonly router = inject(Router);
  private readonly dialogs = inject(LcDialogService);
  private readonly drawers = inject(LcDrawerService);
  private readonly injector = inject(Injector);
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly statuses = STATUS;
  protected readonly trackBy = (task: Task) => task.id;
  protected readonly columns: LcDataColumn<Task>[] = [
    { key: 'title', label: 'Tâche', minWidth: '12rem', sortable: true, value: (task) => task.title },
    { key: 'domain', label: 'Domaine', width: '8rem', value: (task) => task.domain },
    { key: 'status', label: 'Statut', width: '8rem', value: (task) => STATUS[task.status].label },
    { key: 'owner', label: 'Responsable', width: '8rem', sortable: true, value: (task) => task.owner },
    { key: 'actions', label: 'Actions', width: '4rem', cardOnly: false },
  ];

  protected open(task: Task): void {
    void this.router.navigate(['/list', task.id]);
  }

  protected openFilter(): void {
    this.drawers.open(FilterDrawerComponent, { size: 'small' });
  }

  /** Le menu de la ligne est détruit à la fermeture : le focus va au bouton de menu (annulation), à la ligne suivante, ou au titre de la page (suppression). */
  protected async confirmRemove(task: Task): Promise<void> {
    const confirmed = await this.dialogs.confirm({ title: 'Supprimer la tâche ?', message: `« ${task.title} » sera retirée de la liste.`, confirmLabel: 'Supprimer', destructive: true });
    if (!confirmed) return document.querySelector<HTMLElement>(`[data-menu="${CSS.escape(String(task.id))}"]`)?.focus();
    const rows = this.store.visible();
    const next = rows[rows.indexOf(task) + 1];
    this.store.remove(task);
    // Le tableau se redessine après le prochain rendu : on réessaie quelques images.
    let tries = 10;
    const focus = () => {
      const target = next && document.querySelector<HTMLElement>(`[data-task="${next.id}"]`) || (tries === 0 ? document.querySelector<HTMLElement>('lc-page h1') : null);
      if (target) target.focus();
      else if (tries-- > 0) requestAnimationFrame(focus);
    };
    afterNextRender(focus, { injector: this.injector });
  }
}

@Component({
  imports: [LcPageComponent, LcCardComponent, LcCardHeaderComponent, LcDescriptionListComponent, LcActivityFeedComponent, LcActivityItemComponent, LcEmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (task(); as task) {
      <lc-page [title]="task.title" description="Détail de la tâche">
        <div style="display:grid;gap:var(--lc-sys-space-4)">
          <lc-card>
            <lc-card-header title="Informations" />
            <lc-description-list [items]="items()" />
          </lc-card>
          <lc-card>
            <lc-card-header title="Historique" />
            <ol lcActivityFeed density="compact">
              <li lcActivityItem icon="plus" heading="Tâche créée" date="Il y a 2 semaines">{{ task.owner }} a créé la tâche.</li>
              <li lcActivityItem icon="pencil" heading="Échéance modifiée" date="Il y a 3 jours">Nouvelle échéance : {{ task.due }}.</li>
            </ol>
          </lc-card>
        </div>
      </lc-page>
    } @else {
      <lc-page title="Tâche introuvable"><lc-empty-state icon="circle-help" title="Cette tâche n'existe plus" description="Elle a été supprimée de la liste." /></lc-page>
    }`,
})
class DetailPageComponent {
  private readonly store = inject(DemoStore);
  private readonly id = Number(inject(ActivatedRoute).snapshot.paramMap.get('id'));
  protected readonly task = computed(() => this.store.tasks().find((task) => task.id === this.id));
  protected readonly items = computed<LcDescriptionItem[]>(() => {
    const task = this.task();
    return task ? [
      { term: 'Domaine', value: task.domain },
      { term: 'Statut', value: STATUS[task.status].label },
      { term: 'Responsable', value: task.owner },
      { term: 'Échéance', value: task.due },
    ] : [];
  });
}

@Component({
  imports: [
    LcPageComponent, LcTabsComponent, LcTabComponent, LcFormFieldComponent, LcInputDirective, LcSwitchComponent, LcSegmentedControlComponent,
    LcDisclosureComponent, LcButtonComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lc-page title="Réglages" description="Préférences de l'équipe Atelier.">
      <lc-tabs ariaLabel="Réglages">
        <lc-tab id="profile" label="Profil">
          <div style="display:grid;gap:var(--lc-sys-space-4);max-inline-size:28rem;padding-block:var(--lc-sys-space-4)">
            <lc-form-field label="Nom de l'équipe"><input lcInput type="text" value="Atelier" /></lc-form-field>
            <lc-form-field label="Adresse de contact" hint="Utilisée pour les notifications."><input lcInput type="email" value="equipe@atelier.example" /></lc-form-field>
          </div>
        </lc-tab>
        <lc-tab id="notifications" label="Notifications">
          <div style="display:grid;gap:var(--lc-sys-space-4);justify-items:start;padding-block:var(--lc-sys-space-4)">
            <button lcSwitch [(checked)]="mentions">Mentions</button>
            <button lcSwitch [(checked)]="digest">Résumé du lundi</button>
          </div>
        </lc-tab>
        <lc-tab id="display" label="Affichage">
          <div style="display:grid;gap:var(--lc-sys-space-4);max-inline-size:28rem;padding-block:var(--lc-sys-space-4)">
            <lc-segmented-control ariaLabel="Densité" [options]="densities" [(value)]="density" />
            <lc-disclosure bordered><span lcDisclosureSummary>Options avancées</span><p>Ces options s'appliquent à tous les membres de l'équipe.</p></lc-disclosure>
          </div>
        </lc-tab>
      </lc-tabs>
      <button lcButton type="button" (click)="save()">Enregistrer</button>
    </lc-page>`,
})
class SettingsPageComponent {
  private readonly toasts = inject(LcToastService);
  protected readonly mentions = signal(true);
  protected readonly digest = signal(false);
  protected readonly density = signal('comfortable');
  protected readonly densities = [{ value: 'comfortable', label: 'Confortable' }, { value: 'compact', label: 'Compact' }];

  protected save(): void {
    this.toasts.show({ kind: 'success', message: 'Réglages enregistrés.' });
  }
}

/* ---------- Application ---------- */

// Le `title` du parent nomme le bouton retour du niveau 2 (« ‹ Liste »).
const ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: DashboardPageComponent, title: 'Tableau de bord' },
  { path: 'list', title: 'Liste', children: [{ path: '', component: ListPageComponent }, { path: ':id', component: DetailPageComponent, title: 'Détail de la tâche' }] },
  { path: 'settings', component: SettingsPageComponent, title: 'Réglages' },
];

/** Aucun attribut de mouvement ici : tout vient des composants du kit et de `lc-app-shell`. « Rejouer » recrée la coquille, donc rejoue l'entrée de la rubrique courante. */
@Component({
  selector: 'lc-motion-demo',
  imports: [
    LcAppShellComponent, LcNavListComponent, LcNavItemComponent, LcButtonComponent, LcIconComponent, LcThemeToggleComponent, LcToastOutletComponent, RouterLink, RouterOutlet, StoryMotionNoticeComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lc-story-motion-notice />
    @for (key of replay.keys(); track key) {
      <lc-app-shell navLabel="Navigation principale">
        <strong lcShellHeader>Atelier</strong>
        <button lcShellHeader lcButton type="button" fillMode="flat" themeColor="neutral" size="small" style="margin-inline-start:auto" (click)="replay.replay(host)">
          <lc-icon name="rotate-ccw" />Rejouer l'entrée
        </button>
        <lc-theme-toggle lcShellHeader />
        <lc-nav-list lcShellNav>
          <a lcNavItem routerLink="/dashboard" icon="layout-dashboard" [primary]="true">Tableau de bord</a>
          <a lcNavItem routerLink="/list" icon="list-checks" [primary]="true">Liste</a>
          <a lcNavItem routerLink="/settings" icon="settings" [primary]="true">Réglages</a>
        </lc-nav-list>
        <router-outlet />
      </lc-app-shell>
    }
    <lc-toast-outlet />`,
})
class MotionDemoComponent {
  private readonly router = inject(Router);
  protected readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  // Le rejeu repart de la liste complète (tâches supprimées, filtres).
  private readonly store = inject(DemoStore);
  protected readonly replay = replayable({ reset: () => this.store.reset() });

  constructor() {
    // Le routeur global de Storybook (preview.ts) déclare `**` en premier et masque toute route ajoutée par la story : on remplace sa configuration.
    this.router.resetConfig(ROUTES);
    void this.router.navigateByUrl('/dashboard');
  }
}

/**
 * A complete application inside `lc-app-shell`, with no motion attribute in its template: what moves comes from the kit alone
 * (dashboard, filterable list with a delete confirmation, drawer, settings, level-2 detail with the back button).
 * Below 768 px the primary sections move to the bottom tab bar. Page changes use the real router.
 *
 * Import: `import { LcAppShellComponent } from '@lionelcointot/ui-angular/layout';`
 */
const meta: Meta = {
  title: 'Foundations/Motion demo',
  tags: ['!autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    moduleMetadata({ imports: [MotionDemoComponent] }),
    applicationConfig({ providers: [provideLocationMocks()] }),
  ],
};
export default meta;

/** The whole application at once: change section, open a task, delete one, open the filter, save the settings. Use "Rejouer l'entrée" to replay the current section. */
export const Demo: StoryObj = {
  parameters: {
    ...fixedExample,
    docs: {
      source: {
        code: `import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { LcAppShellComponent } from '@lionelcointot/ui-angular/layout';
import { LcNavItemComponent, LcNavListComponent } from '@lionelcointot/ui-angular/navigation';

// Pages, cartes, tableaux, jauges et fenêtres s'animent seuls : aucun attribut de mouvement.
@Component({
  selector: 'app-root',
  imports: [LcAppShellComponent, LcNavListComponent, LcNavItemComponent, RouterLink, RouterOutlet],
  template: \`
    <lc-app-shell>
      <strong lcShellHeader>Atelier</strong>
      <lc-nav-list lcShellNav>
        <a lcNavItem routerLink="/dashboard" icon="layout-dashboard" [primary]="true">Tableau de bord</a>
        <a lcNavItem routerLink="/list" icon="list-checks" [primary]="true">Liste</a>
      </lc-nav-list>
      <router-outlet />
    </lc-app-shell>\`,
})
export class AppComponent {}`,
      },
    },
  },
  render: () => ({ template: '<lc-motion-demo />' }),
};
