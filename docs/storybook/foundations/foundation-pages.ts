import { ChangeDetectionStrategy, Component } from '@angular/core';
import { baseValues, contrastRatio, cssVarOf } from '@lionelcointot/ui-tokens/theme';

/*
 * Pages « Foundations » de la vitrine : tout est lu depuis les tokens résolus (`baseValues`) et affiché avec les
 * variables CSS réelles. Aucune valeur recopiée : un changement de token se voit ici sans retoucher ce fichier.
 */

const light = baseValues('default');
const dark = baseValues('dark');
const keysOf = (prefix: string) => Object.keys(light).filter((key) => key.startsWith(prefix));
const lastSegment = (key: string) => key.slice(key.lastIndexOf('.') + 1);

const ROLE_FAMILIES = ['primary', 'secondary', 'success', 'warning', 'error', 'info', 'highlight'] as const;

interface ColorRow { key: string; cssVar: string; light: string; dark: string }
const colorRow = (key: string): ColorRow => ({ key, cssVar: cssVarOf(key), light: light[key], dark: dark[key] });

const ratio = (fg: string, bg: string) => {
  const value = contrastRatio(fg, bg);
  return value === null ? '—' : `${value.toFixed(1)}:1`;
};

export const PAGE_STYLES = `
  :host { display: block; color: var(--lc-sys-color-on-surface); font-family: var(--lc-sys-font-family-base); max-width: 1100px; }
  h2 { font-size: var(--lc-sys-font-size-xl); font-weight: var(--lc-sys-font-weight-semibold); margin: var(--lc-sys-space-8) 0 var(--lc-sys-space-2); }
  h2:first-child { margin-top: 0; }
  p.lead { color: var(--lc-sys-color-on-surface-muted); margin: 0 0 var(--lc-sys-space-4); max-width: 70ch; line-height: var(--lc-sys-font-line-height-relaxed); }
  code { font-family: var(--lc-sys-font-family-mono); font-size: var(--lc-sys-font-size-xs); }
  .muted { color: var(--lc-sys-color-on-surface-muted); }
  table { width: 100%; border-collapse: collapse; font-size: var(--lc-sys-font-size-sm); }
  th { text-align: left; font-weight: var(--lc-sys-font-weight-medium); color: var(--lc-sys-color-on-surface-muted); padding: var(--lc-sys-space-2); border-bottom: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border-strong); }
  td { padding: var(--lc-sys-space-2); border-bottom: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); vertical-align: middle; }
`;

/** Rôles de couleur : paires fond / texte avec leur contraste, puis surfaces, textes et bordures. */
@Component({
  selector: 'lc-doc-colors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Role colors</h2>
    <p class="lead">Each role comes as a pair (fill and the text that sits on it) plus a softer container pair.
      Components only use these <code>--lc-sys-color-*</code> roles; palettes (<code>--lc-ref-*</code>) stay inside themes.
      Contrast ratios are computed from the light and dark themes.</p>
    <div class="roles">
      @for (family of families; track family.name) {
        <article class="role">
          <div class="fill" [style.background]="'var(' + family.fill.cssVar + ')'" [style.color]="'var(' + family.on.cssVar + ')'">
            <strong>{{ family.name }}</strong><span>Aa · {{ family.fillRatio }}</span>
          </div>
          <div class="fill small" [style.background]="'var(' + family.container.cssVar + ')'" [style.color]="'var(' + family.onContainer.cssVar + ')'">
            <span>container</span><span>Aa · {{ family.containerRatio }}</span>
          </div>
          <dl>
            <dt><code>{{ family.fill.cssVar }}</code></dt><dd class="muted">{{ family.fill.light }} · {{ family.fill.dark }}</dd>
            <dt><code>{{ family.container.cssVar }}</code></dt><dd class="muted">{{ family.container.light }} · {{ family.container.dark }}</dd>
          </dl>
        </article>
      }
    </div>

    <h2>Surfaces, text and borders</h2>
    <p class="lead">Neutral roles for backgrounds, text emphasis and separators. Values: light theme · dark theme.</p>
    <table>
      <thead><tr><th>Preview</th><th>Token</th><th>Light</th><th>Dark</th></tr></thead>
      <tbody>
        @for (row of neutrals; track row.key) {
          <tr>
            <td><span class="swatch" [style.background]="'var(' + row.cssVar + ')'"></span></td>
            <td><code>{{ row.cssVar }}</code></td>
            <td class="muted">{{ row.light }}</td>
            <td class="muted">{{ row.dark }}</td>
          </tr>
        }
      </tbody>
    </table>

    <h2>Chart palette</h2>
    <p class="lead">Categorical colors for data visualisation, validated for contrast against the chart surface.</p>
    <div class="chart-palette">
      @for (row of chart; track row.key) {
        <div><span class="swatch wide" [style.background]="'var(' + row.cssVar + ')'"></span><code>{{ row.cssVar }}</code></div>
      }
    </div>
  `,
  styles: [
    PAGE_STYLES,
    `
    .roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: var(--lc-sys-space-4); }
    .role { border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); border-radius: var(--lc-sys-radius-lg); overflow: hidden; background: var(--lc-sys-color-surface-raised); }
    .fill { display: flex; justify-content: space-between; align-items: flex-end; padding: var(--lc-sys-space-4); min-height: 72px; text-transform: capitalize; font-size: var(--lc-sys-font-size-sm); }
    .fill.small { min-height: 0; padding-block: var(--lc-sys-space-2); }
    dl { margin: 0; padding: var(--lc-sys-space-3) var(--lc-sys-space-4); display: grid; gap: var(--lc-sys-space-1); font-size: var(--lc-sys-font-size-xs); }
    dd { margin: 0 0 var(--lc-sys-space-1); }
    .swatch { display: inline-block; width: 40px; height: 24px; border-radius: var(--lc-sys-radius-sm); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); vertical-align: middle; }
    .swatch.wide { width: 100%; height: 40px; display: block; margin-bottom: var(--lc-sys-space-1); }
    .chart-palette { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--lc-sys-space-3); }
    `,
  ],
})
export class DocColorsComponent {
  protected readonly families = ROLE_FAMILIES.map((name) => {
    const fill = colorRow(`color.${name}`);
    const on = colorRow(`color.on-${name}`);
    const container = colorRow(`color.${name}-container`);
    const onContainer = colorRow(`color.on-${name}-container`);
    return {
      name, fill, on, container, onContainer,
      fillRatio: `${ratio(on.light, fill.light)} / ${ratio(on.dark, fill.dark)}`,
      containerRatio: `${ratio(onContainer.light, container.light)} / ${ratio(onContainer.dark, container.dark)}`,
    };
  });
  protected readonly neutrals = keysOf('color.')
    .filter((key) => !ROLE_FAMILIES.some((family) => key.includes(family)))
    .map(colorRow);
  protected readonly chart = keysOf('chart.categorical.').map(colorRow);
}

/** Échelle typographique, graisses et familles. */
@Component({
  selector: 'lc-doc-typography',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Type scale</h2>
    <p class="lead">One family for the interface (system fonts, no web font to download) and one monospaced family for code and figures.
      Numbers in tables use tabular figures.</p>
    <table>
      <thead><tr><th>Token</th><th>Size</th><th>Sample</th></tr></thead>
      <tbody>
        @for (row of sizes; track row.key) {
          <tr>
            <td><code>{{ row.cssVar }}</code></td>
            <td class="muted">{{ row.value }}</td>
            <td [style.font-size]="'var(' + row.cssVar + ')'">Interfaces claires et lisibles</td>
          </tr>
        }
      </tbody>
    </table>

    <h2>Weights and line heights</h2>
    <table>
      <tbody>
        @for (row of weights; track row.key) {
          <tr><td><code>{{ row.cssVar }}</code></td><td class="muted">{{ row.value }}</td>
            <td [style.font-weight]="'var(' + row.cssVar + ')'">Interfaces claires et lisibles</td></tr>
        }
        @for (row of lineHeights; track row.key) {
          <tr><td><code>{{ row.cssVar }}</code></td><td class="muted">{{ row.value }}</td><td></td></tr>
        }
      </tbody>
    </table>

    <h2>Families</h2>
    <table>
      <tbody>
        @for (row of families; track row.key) {
          <tr><td><code>{{ row.cssVar }}</code></td>
            <td [style.font-family]="'var(' + row.cssVar + ')'">Aa Bb Cc 0123456789 — 12 345,67 €</td>
            <td class="muted"><code>{{ row.value }}</code></td></tr>
        }
      </tbody>
    </table>
  `,
  styles: [PAGE_STYLES],
})
export class DocTypographyComponent {
  private readonly rows = (prefix: string) =>
    keysOf(prefix).map((key) => ({ key, cssVar: cssVarOf(key), value: light[key] }));
  protected readonly sizes = this.rows('font.size.');
  protected readonly weights = this.rows('font.weight.');
  protected readonly lineHeights = this.rows('font.line-height.');
  protected readonly families = this.rows('font.family.');
}

/** Espacements, rayons, épaisseurs et hauteurs de contrôle. */
@Component({
  selector: 'lc-doc-spacing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Spacing</h2>
    <p class="lead">A 4 px based scale used for padding, gaps and margins. Layout components (<code>lc-stack</code>, <code>lc-grid</code>) take these steps.</p>
    <table>
      <tbody>
        @for (row of spaces; track row.key) {
          <tr><td><code>{{ row.cssVar }}</code></td><td class="muted">{{ row.value }}</td>
            <td><span class="bar" [style.width]="'var(' + row.cssVar + ')'"></span></td></tr>
        }
      </tbody>
    </table>

    <h2>Radius</h2>
    <div class="radii">
      @for (row of radii; track row.key) {
        <div><span class="box" [style.border-radius]="'var(' + row.cssVar + ')'"></span><code>{{ row.cssVar }}</code><span class="muted">{{ row.value }}</span></div>
      }
    </div>

    <h2>Control heights</h2>
    <p class="lead">Buttons and fields share the same heights per <code>size</code>, so they align in a row.</p>
    <div class="radii">
      @for (row of controls; track row.key) {
        <div><span class="control" [style.height]="'var(' + row.cssVar + ')'">{{ label(row.key) }}</span><code>{{ row.cssVar }}</code><span class="muted">{{ row.value }}</span></div>
      }
    </div>
  `,
  styles: [
    PAGE_STYLES,
    `
    .bar { display: block; height: 16px; min-width: 1px; background: var(--lc-sys-color-primary); border-radius: var(--lc-sys-radius-sm); }
    .radii { display: flex; flex-wrap: wrap; gap: var(--lc-sys-space-6); }
    .radii > div { display: grid; gap: var(--lc-sys-space-1); justify-items: start; font-size: var(--lc-sys-font-size-xs); }
    .box { width: 72px; height: 72px; background: var(--lc-sys-color-primary-container); border: var(--lc-sys-border-width-thick) solid var(--lc-sys-color-primary); }
    .control { display: inline-flex; align-items: center; padding-inline: var(--lc-sys-space-4); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border-strong); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-raised); }
    `,
  ],
})
export class DocSpacingComponent {
  private readonly rows = (prefix: string) =>
    keysOf(prefix).map((key) => ({ key, cssVar: cssVarOf(key), value: light[key] }));
  protected readonly spaces = this.rows('space.');
  protected readonly radii = this.rows('radius.');
  protected readonly controls = this.rows('control.height.');
  protected label(key: string): string {
    return { sm: 'small', md: 'medium', lg: 'large' }[lastSegment(key)] ?? lastSegment(key);
  }
}

/** Ombres et plans de superposition. */
@Component({
  selector: 'lc-doc-elevation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Elevation</h2>
    <p class="lead">Four shadow levels, from resting cards to dialogs. Levels 1 and 2 are two-layer relief shadows; a card adds the hairline <code>--lc-sys-color-line</code> as an inset first layer. Dark theme shadows are tuned separately.</p>
    <div class="shadows">
      @for (row of shadows; track row.key) {
        <div class="card" [style.box-shadow]="'inset 0 0 0 1px var(--lc-sys-color-line), var(' + row.cssVar + ')'"><strong>{{ row.cssVar }}</strong></div>
      }
    </div>

    <h2>Layers</h2>
    <table>
      <tbody>
        @for (row of layers; track row.key) {
          <tr><td><code>{{ row.cssVar }}</code></td><td class="muted">{{ row.value }}</td></tr>
        }
      </tbody>
    </table>
  `,
  styles: [
    PAGE_STYLES,
    `
    .shadows { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--lc-sys-space-6); padding: var(--lc-sys-space-4); background: var(--lc-sys-color-surface-sunken); border-radius: var(--lc-sys-radius-xl); }
    .card { padding: var(--lc-sys-space-8) var(--lc-sys-space-4); background: var(--lc-sys-color-surface-raised); border-radius: var(--lc-sys-radius-xl); font-size: var(--lc-sys-font-size-xs); }
    `,
  ],
})
export class DocElevationComponent {
  private readonly rows = (prefix: string) =>
    keysOf(prefix).map((key) => ({ key, cssVar: cssVarOf(key), value: light[key] }));
  protected readonly shadows = this.rows('shadow.');
  protected readonly layers = this.rows('z.');
}

