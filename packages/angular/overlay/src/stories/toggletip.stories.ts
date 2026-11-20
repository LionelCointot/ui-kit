import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcToggletipComponent, LcToggletipDirective } from '@lionelcointot/ui-angular/overlay';

/**
 * Tooltip opened by a click on a native `<button>`: `[lcToggletip]` on the button, `<lc-toggletip>` around the content.
 * Unlike `lcTooltip` it works by touch and may carry essential information. It closes on a second click, Escape (focus returns
 * to the button), a click elsewhere, or when focus leaves both the button and the bubble. Opening one closes the other.
 *
 * Import: `import { LcToggletipComponent, LcToggletipDirective } from '@lionelcointot/ui-angular/overlay';`
 */
const meta: Meta<LcToggletipDirective> = {
  title: 'Overlays/Toggletip',
  component: LcToggletipDirective,
  decorators: [moduleMetadata({ imports: [LcToggletipDirective, LcToggletipComponent] })],
  parameters: { layout: 'fullscreen' },
  args: { lcToggletipPosition: 'below' },
  argTypes: { lcToggletipPosition: { control: 'inline-radio', options: ['below', 'above', 'start', 'end'] } },
};
export default meta;
type Story = StoryObj<LcToggletipDirective>;

/* La pastille est au consommateur : le kit ne style que la bulle. */
const PILL = 'style="min-width:var(--lc-button-hit-size,44px);min-height:var(--lc-button-hit-size,44px);border:var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border);border-radius:var(--lc-sys-radius-full);background:var(--lc-sys-color-surface);color:var(--lc-sys-color-on-surface);font:inherit;cursor:pointer"';

/** Click the round button: the bubble opens below it. The position input is bound. */
export const Playground: Story = {
  parameters: { controlsCheck: { openWith: 'button' } },
  render: (args) => ({
    props: args,
    template: `<div style="display:flex;justify-content:center;padding:120px 16px">
      <button type="button" ${PILL} aria-label="Pourquoi ce changement ?" [lcToggletip]="detail" [lcToggletipPosition]="lcToggletipPosition">?</button>
      <lc-toggletip #detail>Le dossier a été déplacé vers l'équipe voisine.<br />Il reste visible dans votre liste jusqu'à la fin du mois.</lc-toggletip>
    </div>`,
  }),
};

/** A multi-line bubble with a link: Tab from the button reaches the link, and the bubble stays open while focus moves between them. */
export const RichContent: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="display:flex;justify-content:center;padding:120px 16px">
      <button type="button" ${PILL} aria-label="Détail du statut" [lcToggletip]="detail">?</button>
      <lc-toggletip #detail>
        <strong>En attente de réponse</strong><br />
        Nous avons écrit à la personne concernée le 12 novembre.<br />
        Sans nouvelle sous huit jours, la demande sera relancée.<br />
        <a href="#historique">Voir l'historique</a>
      </lc-toggletip>
    </div>`,
  }),
};

/** Near the window edges the bubble moves to the first position that fits (below, above, then the sides), or is pushed inside the window when none does; the arrow keeps pointing at the button. At 360 px it stays whole. */
export const NearEdges: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="box-sizing:border-box;height:100vh;display:grid;grid-template:auto 1fr auto / auto 1fr auto;padding:8px">
      <div style="grid-area:1/1"><button type="button" ${PILL} aria-label="Haut gauche" [lcToggletip]="tl">?</button><lc-toggletip #tl>Ouverte en haut à gauche : elle se place à côté du bouton et reste entière dans la fenêtre.</lc-toggletip></div>
      <div style="grid-area:1/3"><button type="button" ${PILL} aria-label="Haut droite" [lcToggletip]="tr">?</button><lc-toggletip #tr>Ouverte en haut à droite : elle passe à gauche du bouton, la flèche le désigne.</lc-toggletip></div>
      <div style="grid-area:3/3"><button type="button" ${PILL} aria-label="Bas droite" [lcToggletip]="br" lcToggletipPosition="below">?</button><lc-toggletip #br>Demandée en dessous, en bas à droite : elle passe à gauche du bouton.</lc-toggletip></div>
    </div>`,
  }),
};

/** Two bubbles in a table row: opening the second closes the first, and a bubble is not clipped by the table. */
export const InATable: Story = {
  parameters: fixedExample,
  render: () => ({
    template: `<div style="padding:var(--lc-sys-space-6) 16px;overflow:auto">
      <table style="border-collapse:collapse;width:100%;max-width:32rem;color:var(--lc-sys-color-on-surface)">
        <thead><tr><th style="text-align:start">Projet</th><th style="text-align:start">Statut</th><th style="text-align:start">Échéance</th></tr></thead>
        <tbody>
          <tr><td>Toiture</td>
            <td>En cours <button type="button" ${PILL} aria-label="Détail du statut de Toiture" [lcToggletip]="d1">?</button><lc-toggletip #d1>Les travaux ont commencé lundi et durent trois semaines.</lc-toggletip></td>
            <td>12 déc. <button type="button" ${PILL} aria-label="Détail de l'échéance de Toiture" [lcToggletip]="d2">?</button><lc-toggletip #d2>Date fixée avec l'entreprise, sauf mauvais temps.</lc-toggletip></td></tr>
          <tr><td>Cour</td><td>Reporté</td><td>À fixer</td></tr>
        </tbody>
      </table>
    </div>`,
  }),
};
