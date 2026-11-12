import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { LcBadgeComponent } from '../badge/badge.component';
import { LcStatusBadgeComponent } from '../status-badge/status-badge.component';

const KINDS = [
  { kind: 'success', label: 'Opérationnel' },
  { kind: 'error', label: 'En panne' },
  { kind: 'warning', label: 'Dégradé' },
  { kind: 'highlight', label: 'Intermittent' },
  { kind: 'info', label: 'Maintenance prévue' },
  { kind: 'neutral', label: 'Inconnu' },
] as const;

const meta: Meta<LcStatusBadgeComponent> = {
  title: 'Retours d\'état/Indicateur d\'état',
  component: LcStatusBadgeComponent,
  decorators: [moduleMetadata({ imports: [LcStatusBadgeComponent, LcBadgeComponent, LcButtonComponent] })],
  argTypes: {
    kind: { control: 'select', options: ['success', 'error', 'warning', 'highlight', 'info', 'neutral'] },
    size: { control: 'inline-radio', options: ['small', 'medium', 'large'] },
  },
  args: { kind: 'success', size: 'medium' },
  render: (args) => ({
    props: args,
    template: `<lc-status-badge [kind]="kind" [size]="size" [icon]="icon">Statut du service</lc-status-badge>`,
  }),
};
export default meta;
type Story = StoryObj<LcStatusBadgeComponent>;

export const Defaut: Story = {};

/** Une icône distincte par rôle : l'état reste lisible en niveaux de gris et en daltonisme. */
export const ParRole: Story = {
  render: () => ({
    props: { kinds: KINDS },
    template: `<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
      @for (item of kinds; track item.kind) { <lc-status-badge [kind]="item.kind">{{ item.label }}</lc-status-badge> }</div>`,
  }),
};

export const Tailles: Story = {
  render: () => ({
    props: { kinds: KINDS },
    template: `<div style="display:grid;gap:12px">
      @for (size of ['small', 'medium', 'large']; track size) {
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
          @for (item of kinds; track item.kind) { <lc-status-badge [kind]="item.kind" [size]="size">{{ item.label }}</lc-status-badge> }
        </div>
      }</div>`,
  }),
};

export const IconePersonnalisee: Story = {
  render: () => ({
    template: `<div style="display:flex;gap:12px;flex-wrap:wrap">
      <lc-status-badge kind="highlight" icon="refresh-cw">Synchronisation</lc-status-badge>
      <lc-status-badge kind="neutral" icon="git-branch">Branche principale</lc-status-badge></div>`,
  }),
};

/** Libellé long : tronqué avec des points de suspension dans un conteneur étroit. */
export const LibelleLong: Story = {
  render: () => ({
    template: `<div style="max-width:12rem"><lc-status-badge kind="warning">Dégradé depuis plus de trois jours</lc-status-badge></div>`,
  }),
};

/** Le rôle `highlight` est aussi disponible pour `lc-badge` et `button[lcButton]`. */
export const RoleHighlight: Story = {
  render: () => ({
    props: { fills: ['solid', 'flat', 'outline'] },
    template: `<div style="display:grid;gap:12px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        @for (fill of fills; track fill) { <lc-badge themeColor="highlight" [fillMode]="fill">Nouveau</lc-badge> }</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        @for (fill of fills; track fill) { <button lcButton themeColor="highlight" [fillMode]="fill">Action</button> }</div></div>`,
  }),
};
