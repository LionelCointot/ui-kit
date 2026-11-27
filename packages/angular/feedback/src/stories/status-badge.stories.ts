import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcButtonComponent } from '@lionelcointot/ui-angular';
import { StoryMotionNoticeComponent, fixedExample, replayable, sizeOptions } from '@lc/storybook';
import { LcBadgeComponent, LcStatusBadgeComponent } from '@lionelcointot/ui-angular/feedback';

/** Demo of the `Animation` story (d17, d44): a status badge never animates, neither when it appears nor when its status changes. */
@Component({
  selector: 'lc-status-badge-animation-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LcStatusBadgeComponent, LcButtonComponent, StoryMotionNoticeComponent],
  template: `
    <lc-story-motion-notice />
    <section #appear data-demo="d17">
      <p><button lcButton fillMode="outline" size="small" (click)="appearing.replay(appear)">Rejouer</button> Aucun mouvement, exprès.</p>
      @for (key of appearing.keys(); track key) {
        <lc-status-badge kind="success">Opérationnel</lc-status-badge>
      }
    </section>
    <section #change data-demo="d44">
      <p><button lcButton fillMode="outline" size="small" (click)="changing.replay(change)">Rejouer</button> Le statut change sans mouvement, exprès.</p>
      <lc-status-badge [kind]="degraded() ? 'warning' : 'success'">{{ degraded() ? 'Dégradé' : 'Opérationnel' }}</lc-status-badge>
    </section>`,
})
class StatusBadgeAnimationDemoComponent {
  protected readonly degraded = signal(false);
  protected readonly appearing = replayable();
  protected readonly changing = replayable({ reset: () => this.degraded.set(false), play: () => this.degraded.set(true) });
}

const KINDS = [
  { kind: 'success', label: 'Opérationnel' },
  { kind: 'error', label: 'En panne' },
  { kind: 'warning', label: 'Dégradé' },
  { kind: 'highlight', label: 'Intermittent' },
  { kind: 'info', label: 'Maintenance prévue' },
  { kind: 'neutral', label: 'Inconnu' },
] as const;

/**
 * Status pill: a colored badge with a role-specific icon, so the state never relies on color alone.
 * Six kinds (`success`, `error`, `warning`, `highlight`, `info`, `neutral`); the icon can be replaced.
 *
 * Import: `import { LcStatusBadgeComponent } from '@lionelcointot/ui-angular/feedback';`
 */
const meta: Meta<LcStatusBadgeComponent> = {
  title: 'Feedback/Status badge',
  component: LcStatusBadgeComponent,
  decorators: [moduleMetadata({ imports: [LcStatusBadgeComponent, LcBadgeComponent, LcButtonComponent, StatusBadgeAnimationDemoComponent] })],
  argTypes: {
    kind: { control: 'select', options: KINDS.map((item) => item.kind) },
    size: { control: 'inline-radio', options: [...sizeOptions] },
    icon: { control: 'text' },
  },
  args: { kind: 'success', size: 'medium', icon: undefined },
};
export default meta;
type Story = StoryObj<LcStatusBadgeComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-status-badge [kind]="kind" [size]="size" [icon]="icon">Statut du service</lc-status-badge>`,
  }),
};

/** One distinct icon per kind: the state stays readable in grayscale and for color-blind users. */
export const ByKind: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { kinds: KINDS },
    template: `<div style="display:flex;gap:var(--lc-sys-space-3);flex-wrap:wrap;align-items:center">
      @for (item of kinds; track item.kind) { <lc-status-badge [kind]="item.kind">{{ item.label }}</lc-status-badge> }</div>`,
  }),
};

/** Every kind in `small`, `medium` and `large`. */
export const Sizes: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { kinds: KINDS },
    template: `<div style="display:grid;gap:var(--lc-sys-space-3)">
      @for (size of ['small', 'medium', 'large']; track size) {
        <div style="display:flex;gap:var(--lc-sys-space-3);flex-wrap:wrap;align-items:center">
          @for (item of kinds; track item.kind) { <lc-status-badge [kind]="item.kind" [size]="size">{{ item.label }}</lc-status-badge> }
        </div>
      }</div>`,
  }),
};

/** The `icon` input replaces the default icon of the kind. */
export const CustomIcon: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;gap:var(--lc-sys-space-3);flex-wrap:wrap">
      <lc-status-badge kind="highlight" icon="refresh-cw">Synchronisation</lc-status-badge>
      <lc-status-badge kind="neutral" icon="git-branch">Branche principale</lc-status-badge></div>`,
  }),
};

/** Long label: truncated with an ellipsis in a narrow container. */
export const LongLabel: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="max-width:12rem"><lc-status-badge kind="warning">Dégradé depuis plus de trois jours</lc-status-badge></div>`,
  }),
};

const ANIMATION_CODE = `<lc-status-badge kind="success">Opérationnel</lc-status-badge>`;

/** A status badge does not move on purpose: it appears at once and a new status replaces the old one without any transition. "Rejouer" shows it again, then changes its status. */
export const Animation: Story = {
  parameters: { ...fixedExample, docs: { source: { code: ANIMATION_CODE } } },
  render: () => ({ template: '<lc-status-badge-animation-demo />' }),
};

/** The `highlight` role is also available on `lc-badge` and `button[lcButton]`. */
export const HighlightRole: Story = {
  parameters: fixedExample,
  render: () => ({
    props: { fills: ['solid', 'flat', 'outline'] },
    template: `<div style="display:grid;gap:var(--lc-sys-space-3)">
      <div style="display:flex;gap:var(--lc-sys-space-3);flex-wrap:wrap;align-items:center">
        @for (fill of fills; track fill) { <lc-badge themeColor="highlight" [fillMode]="fill">Nouveau</lc-badge> }</div>
      <div style="display:flex;gap:var(--lc-sys-space-3);flex-wrap:wrap;align-items:center">
        @for (fill of fills; track fill) { <button lcButton themeColor="highlight" [fillMode]="fill">Action</button> }</div></div>`,
  }),
};
