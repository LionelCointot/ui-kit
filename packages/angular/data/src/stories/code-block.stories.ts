import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import { fixedExample } from '@lc/storybook';
import { LcCodeBlockComponent } from '../code-block/code-block.component';

const LOG = Array.from({ length: 60 }, (_, index) =>
  `2026-11-11T08:${String(index).padStart(2, '0')}:00Z INFO service=orders request=${1000 + index} duration=${(index * 13) % 250}ms status=${index % 11 === 0 ? 500 : 200}`,
).join('\n');

const CONFIG = ['server:', '  port: 8080', '  timeout: 30s', 'cache:', '  enabled: true', '  ttl: 600'].join('\n');

/**
 * Read-only block of preformatted text (configuration, log excerpt) with a copy button, optional line numbers and optional wrapping.
 * The content is untrusted text: displayed literally, never interpreted. Beyond 100,000 characters the display is truncated, the copy keeps the full text.
 *
 * Import: `import { LcCodeBlockComponent } from '@lionelcointot/ui-angular/data';`
 */
const meta: Meta<LcCodeBlockComponent> = {
  title: 'Data/Code block',
  component: LcCodeBlockComponent,
  decorators: [moduleMetadata({ imports: [LcCodeBlockComponent] })],
  args: { code: CONFIG, ariaLabel: 'Configuration du service', wrap: false, lineNumbers: false, copyable: true, maxHeight: '20rem' },
  argTypes: { code: { control: 'text' } },
};
export default meta;
type Story = StoryObj<LcCodeBlockComponent>;

/** Every input is bound: change them in the Controls panel. */
export const Playground: Story = {
  render: (args) => ({
    props: args,
    template: `<lc-code-block [code]="code" [ariaLabel]="ariaLabel" [wrap]="wrap" [lineNumbers]="lineNumbers" [copyable]="copyable" [maxHeight]="maxHeight" />`,
  }),
};

const fixed = (inputs: string, props: Record<string, unknown> = {}): Story => ({
  parameters: fixedExample,
  render: () => ({ props: { LOG, ...props }, template: `<lc-code-block ${inputs} />` }),
});

/** Long log: vertical scrolling beyond the maximum height, horizontal scrolling without wrapping. */
export const Log: Story = fixed(`[code]="LOG" ariaLabel="Journal du service" maxHeight="12rem"`);

/** Line numbers on a long log. */
export const LineNumbers: Story = fixed(`[code]="LOG" ariaLabel="Journal du service" [lineNumbers]="true" maxHeight="12rem"`);

/** Wrapped lines with line numbers. */
export const Wrapping: Story = fixed(`[code]="LOG" ariaLabel="Journal du service" [wrap]="true" [lineNumbers]="true" maxHeight="12rem"`);

/** Copy button hidden (`copyable` off). */
export const WithoutCopyButton: Story = fixed(`[code]="CONFIG" ariaLabel="Configuration du service" [copyable]="false"`, { CONFIG });

/** Untrusted content: displayed literally, never executed. */
export const UntrustedContent: Story = fixed(`[code]="UNTRUSTED" ariaLabel="Contenu non fiable"`, {
  UNTRUSTED: '<img src=x onerror="alert(1)">\n<script>alert(2)</script>\n&amp; {{ 1 + 1 }}',
});

/** Beyond 100,000 characters: truncated display with a notice, the copy keeps the full text. */
export const VeryLongText: Story = fixed(`[code]="LONG" ariaLabel="Texte très long" maxHeight="10rem"`, { LONG: 'ligne de journal très répétitive\n'.repeat(4000) });

/** Empty content. */
export const Empty: Story = fixed(`code="" ariaLabel="Contenu vide"`);
