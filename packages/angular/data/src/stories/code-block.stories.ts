import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { LcCodeBlockComponent } from '../code-block/code-block.component';

const LOG = Array.from({ length: 60 }, (_, index) =>
  `2026-11-11T08:${String(index).padStart(2, '0')}:00Z INFO service=orders request=${1000 + index} duration=${(index * 13) % 250}ms status=${index % 11 === 0 ? 500 : 200}`,
).join('\n');

const CONFIG = ['server:', '  port: 8080', '  timeout: 30s', 'cache:', '  enabled: true', '  ttl: 600'].join('\n');

const meta: Meta<LcCodeBlockComponent> = {
  title: 'Data/Code block',
  component: LcCodeBlockComponent,
  decorators: [moduleMetadata({ imports: [LcCodeBlockComponent] })],
  args: { code: CONFIG, ariaLabel: 'Configuration du service', wrap: false, lineNumbers: false, copyable: true, maxHeight: '20rem' },
  render: (args) => ({
    props: args,
    template: `<lc-code-block [code]="code" [ariaLabel]="ariaLabel" [wrap]="wrap" [lineNumbers]="lineNumbers" [copyable]="copyable" [maxHeight]="maxHeight" />`,
  }),
};
export default meta;
type Story = StoryObj<LcCodeBlockComponent>;

export const Defaut: Story = {};

/** Journal long : défilement vertical au-delà de la hauteur maximale, horizontal sans retour à la ligne. */
export const Journal: Story = {
  args: { code: LOG, ariaLabel: 'Journal du service', maxHeight: '12rem' },
};

export const NumerosDeLigne: Story = {
  args: { code: LOG, ariaLabel: 'Journal du service', lineNumbers: true, maxHeight: '12rem' },
};

export const RetourALaLigne: Story = {
  args: { code: LOG, ariaLabel: 'Journal du service', wrap: true, lineNumbers: true, maxHeight: '12rem' },
};

export const SansBoutonCopier: Story = {
  args: { copyable: false },
};

/** Contenu non fiable : affiché littéralement, jamais exécuté. */
export const ContenuNonFiable: Story = {
  args: { code: '<img src=x onerror="alert(1)">\n<script>alert(2)</script>\n&amp; {{ 1 + 1 }}', ariaLabel: 'Contenu non fiable' },
};

/** Au-delà de 100 000 caractères : affichage tronqué avec mention, copie du texte intégral. */
export const TexteTresLong: Story = {
  args: { code: 'ligne de journal très répétitive\n'.repeat(4000), ariaLabel: 'Texte très long', maxHeight: '10rem' },
};

export const Vide: Story = {
  args: { code: '', ariaLabel: 'Contenu vide' },
};
