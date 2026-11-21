import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, Injector, afterNextRender, inject, signal, viewChild, viewChildren } from '@angular/core';
import { StoryMotionNoticeComponent, pressButton, prefersReducedMotion, replayable, tokenMs } from '@lc/storybook';
import { LcButtonComponent, LcRevealDirective } from '@lionelcointot/ui-angular';
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

const PAGE_STYLES = `
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
    <p class="lead">Four shadow levels, from resting cards to dialogs. Dark theme shadows are tuned separately.</p>
    <div class="shadows">
      @for (row of shadows; track row.key) {
        <div class="card" [style.box-shadow]="'var(' + row.cssVar + ')'"><strong>{{ row.cssVar }}</strong></div>
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
    .shadows { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--lc-sys-space-6); padding: var(--lc-sys-space-4); background: var(--lc-sys-color-background); border-radius: var(--lc-sys-radius-lg); }
    .card { padding: var(--lc-sys-space-8) var(--lc-sys-space-4); background: var(--lc-sys-color-surface-raised); border-radius: var(--lc-sys-radius-lg); font-size: var(--lc-sys-font-size-xs); }
    `,
  ],
})
export class DocElevationComponent {
  private readonly rows = (prefix: string) =>
    keysOf(prefix).map((key) => ({ key, cssVar: cssVarOf(key), value: light[key] }));
  protected readonly shadows = this.rows('shadow.');
  protected readonly layers = this.rows('z.');
}

const MOTION_VALUES = [
  { key: 'duration.fast', use: 'Button press, closing fades' },
  { key: 'duration.normal', use: 'Panels and menus opening' },
  { key: 'duration.long', use: 'Each item of a list appearing one after another (`lcReveal` directive)' },
  { key: 'duration.move', use: 'Things moving to a new place: list rows, tab and nav indicators' },
  { key: 'motion.stagger', use: 'Delay between two items of such a list' },
  { key: 'motion.offset', use: 'How far an element travels when it appears' },
].map(({ key, use }) => ({ key, cssVar: cssVarOf(key), value: light[key], use }));

const MOTION_CURVES = [
  { name: 'standard', use: 'A fixed curve that eases in and out: for fades and things appearing.' },
  { name: 'spring', use: 'A physical spring that settles without going past its target; with its longer duration it reads as a glide: for things that move to a new place.' },
].map(({ name, use }) => ({ name, cssVar: cssVarOf(`easing.${name}`), value: light[`easing.${name}`], use }));

const MOTION_OFF_CSS = `:root {
  --lc-sys-duration-fast: 0ms;
  --lc-sys-duration-normal: 0ms;
  --lc-sys-duration-long: 0ms;
  --lc-sys-duration-move: 0ms;
  --lc-sys-motion-stagger: 0ms;
}`;

interface CurveTrace { path: string; mid: number }
const CURVE_SAMPLES = 60;
const LIST_ITEMS = ['Projet', 'Tâches', 'Équipe', 'Fichiers', 'Paramètres'];

/** Durées, courbes, distance et petites démos du mouvement, chacune avec son « Rejouer ». */
@Component({
  selector: 'lc-doc-motion',
  imports: [LcButtonComponent, LcRevealDirective, StoryMotionNoticeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2>Motion</h2>
    <p class="lead">Every animation in the kit reads the <code>--lc-sys-*</code> tokens below, so a theme changes the feel of all components at once.</p>
    <lc-story-motion-notice />

    <h2>Durations and distance</h2>
    <div class="scroll">
      <table>
        <tbody>
          @for (row of values; track row.key) {
            <tr><td class="nowrap"><code>{{ row.cssVar }}</code></td><td class="muted nowrap">{{ row.value }}</td><td class="muted">{{ row.use }}</td></tr>
          }
        </tbody>
      </table>
    </div>

    <h2>Curves</h2>
    <p class="lead">A curve says how fast something goes at each moment. Both curves below go from 0 to 1 in the same time; the dot marks half of the time. They are close: what makes a move feel different from a fade is mostly its longer duration (500ms instead of 200ms).</p>
    <div class="curves">
      <figure class="both">
        <span class="axis">progress ↑</span>
        <svg viewBox="-4 -4 108 108" role="img" aria-label="Both curves on the same graph: standard and spring">
          <path class="axes" d="M0 0 V100 H100" />
          <path class="halfway" d="M50 0 V100" />
          @for (curve of curves; track curve.name) {
            <path [class]="'trace ' + curve.name" [attr.d]="traces()[curve.name]?.path" />
            <circle [class]="'dot ' + curve.name" cx="50" [attr.cy]="traces()[curve.name]?.mid" r="3" />
          }
        </svg>
        <span class="axis end">time →</span>
        <figcaption>
          @for (curve of curves; track curve.name) { <span><i [class]="'key ' + curve.name"></i>{{ curve.name }}</span> }
        </figcaption>
      </figure>
      @for (curve of curves; track curve.name) {
        <figure>
          <span class="axis">progress ↑</span>
          <svg viewBox="-4 -4 108 108" role="img" [attr.aria-label]="'Curve ' + curve.name + ': progress over time'">
            <path class="axes" d="M0 0 V100 H100" />
            <path class="halfway" d="M50 0 V100" />
            <path [class]="'trace ' + curve.name" [attr.d]="traces()[curve.name]?.path" />
            <circle [class]="'dot ' + curve.name" cx="50" [attr.cy]="traces()[curve.name]?.mid" r="3" />
          </svg>
          <span class="axis end">time →</span>
          <figcaption><strong>{{ curve.name }}</strong><span>{{ curve.use }}</span><code>{{ curve.cssVar }}</code></figcaption>
        </figure>
      }
    </div>
    <span #probe class="probe"></span>

    <h2>Demos</h2>
    <div class="demos">
      <section>
        <h3>Panel appears <button lcButton fillMode="outline" size="small" (click)="panel.replay(host)">Rejouer</button></h3>
        @for (key of panel.keys(); track key) { <div class="panel">Renommer<br />Dupliquer<br />Supprimer</div> }
      </section>
      <section>
        <h3>Cascade of 4 rows <button lcButton fillMode="outline" size="small" (click)="cascadeDemo.replay(host)">Rejouer</button></h3>
        @for (key of cascadeDemo.keys(); track key) {
          @for (row of cascade; track row) { <div lcReveal [lcRevealIndex]="row" class="row">Ligne {{ row + 1 }}</div> }
        }
      </section>
      <section>
        <h3>Button press <button lcButton fillMode="outline" size="small" (click)="playPress()">Rejouer</button></h3>
        <button lcButton #press>Enregistrer</button>
      </section>
      <section>
        <h3>List reorders <button lcButton fillMode="outline" size="small" (click)="reverseList()">Rejouer</button></h3>
        <ul>
          @for (item of items(); track item) { <li #row [attr.data-id]="item" class="row">{{ item }}</li> }
        </ul>
      </section>
    </div>

    <h2>Turning motion off</h2>
    <h3>For people using an app</h3>
    <p class="lead">Turn on the system accessibility setting "Reduce motion". Every animation stops by itself: nothing to configure.</p>
    <h3>For developers and themes</h3>
    <p class="lead">Set the durations to <code>0ms</code> in your theme stylesheet or in the global styles of your application.
      The curves and the distance do not need to change.</p>
    <pre><code>{{ offCss }}</code></pre>
  `,
  styles: [
    PAGE_STYLES,
    `
    h3 { display: flex; align-items: center; justify-content: space-between; gap: var(--lc-sys-space-2); font-size: var(--lc-sys-font-size-sm); font-weight: var(--lc-sys-font-weight-medium); color: var(--lc-sys-color-on-surface-muted); margin: 0 0 var(--lc-sys-space-2); }
    .scroll { overflow-x: auto; }
    .nowrap, code { white-space: nowrap; }
    pre { overflow-x: auto; }
    pre code { white-space: pre; }
    td:last-child { min-width: 16rem; }
    pre { margin: 0; padding: var(--lc-sys-space-3) var(--lc-sys-space-4); overflow-x: auto; background: var(--lc-sys-color-surface-raised); border-radius: var(--lc-sys-radius-md); }
    .curves { display: flex; flex-wrap: wrap; gap: var(--lc-sys-space-6); }
    figure { margin: 0; width: 14rem; max-width: 100%; }
    figure.both { width: 18rem; }
    figcaption { display: grid; gap: var(--lc-sys-space-1); margin-top: var(--lc-sys-space-2); font-size: var(--lc-sys-font-size-sm); }
    figure.both figcaption { display: flex; gap: var(--lc-sys-space-4); }
    .axis { display: block; font-size: var(--lc-sys-font-size-xs); color: var(--lc-sys-color-on-surface-muted); }
    .axis.end { text-align: end; }
    svg { display: block; width: 100%; background: var(--lc-sys-color-surface-raised); border-radius: var(--lc-sys-radius-md); }
    svg path { fill: none; vector-effect: non-scaling-stroke; }
    .axes { stroke: var(--lc-sys-color-border-strong); stroke-width: 1; }
    .halfway { stroke: var(--lc-sys-color-border); stroke-width: 1; stroke-dasharray: 4 4; }
    .trace { stroke-width: 2; }
    .trace.standard { stroke: var(--lc-sys-color-primary); }
    .trace.spring { stroke: var(--lc-sys-color-highlight); }
    .dot.standard, .key.standard { fill: var(--lc-sys-color-primary); background: var(--lc-sys-color-primary); }
    .dot.spring, .key.spring { fill: var(--lc-sys-color-highlight); background: var(--lc-sys-color-highlight); }
    .key { display: inline-block; width: var(--lc-sys-space-3); height: var(--lc-sys-space-3); border-radius: var(--lc-sys-radius-full); margin-inline-end: var(--lc-sys-space-1); }
    .probe { position: absolute; visibility: hidden; }
    .demos { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(13rem, 100%), 1fr)); gap: var(--lc-sys-space-6); align-items: start; }
    ul { margin: 0; padding: 0; list-style: none; display: grid; gap: var(--lc-sys-space-2); }
    .row, .panel { padding: var(--lc-sys-space-2) var(--lc-sys-space-3); border: var(--lc-sys-border-width-thin) solid var(--lc-sys-color-border); border-radius: var(--lc-sys-radius-md); background: var(--lc-sys-color-surface-raised); }
    .demos section > .row + .row { margin-top: var(--lc-sys-space-2); }
    .panel { line-height: var(--lc-sys-font-line-height-relaxed); box-shadow: var(--lc-sys-shadow-2);
      animation: panel-enter var(--lc-sys-duration-normal) var(--lc-sys-easing-standard) both; }
    @keyframes panel-enter { from { opacity: 0; transform: translateY(calc(-1 * var(--lc-sys-motion-offset))); } }
    `,
  ],
})
export class DocMotionComponent {
  private readonly injector = inject(Injector);
  protected readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly probe = viewChild.required<ElementRef<HTMLElement>>('probe');
  private readonly press = viewChild.required('press', { read: ElementRef });
  private readonly rows = viewChildren<ElementRef<HTMLElement>>('row');
  protected readonly values = MOTION_VALUES;
  protected readonly curves = MOTION_CURVES;
  protected readonly offCss = MOTION_OFF_CSS;
  protected readonly cascade = [0, 1, 2, 3];
  protected readonly items = signal(LIST_ITEMS);
  protected readonly traces = signal<Record<string, CurveTrace>>({});
  protected readonly panel = replayable({ destroyRef: inject(DestroyRef) });
  protected readonly cascadeDemo = replayable({ destroyRef: inject(DestroyRef) });

  constructor() {
    // Each curve is sampled from the browser itself (a paused animation of opacity), so any `cubic-bezier()` or `linear()` value is drawn as it runs.
    afterNextRender(() => {
      const probe = this.probe().nativeElement;
      const traces: Record<string, CurveTrace> = {};
      for (const { name, value } of MOTION_CURVES) {
        const animation = probe.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1000, easing: value, fill: 'both' });
        animation.pause();
        const ys = Array.from({ length: CURVE_SAMPLES + 1 }, (_, i) => {
          animation.currentTime = (i / CURVE_SAMPLES) * 1000;
          return 100 - Number(getComputedStyle(probe).opacity) * 100;
        });
        animation.cancel();
        traces[name] = { path: `M${ys.map((y, i) => `${((i / CURVE_SAMPLES) * 100).toFixed(1)} ${y.toFixed(1)}`).join(' L')}`, mid: ys[CURVE_SAMPLES / 2] };
      }
      this.traces.set(traces);
    });
  }

  protected playPress(): void {
    pressButton(this.press().nativeElement);
  }

  /** FLIP: rows are measured, the order is reversed, then each row travels from its old place with the move duration and the spring. */
  protected reverseList(): void {
    const before = new Map(this.rows().map(({ nativeElement: row }) => [row.dataset['id'], row.getBoundingClientRect().top]));
    this.items.update((list) => [...list].reverse());
    afterNextRender(
      () => {
        if (prefersReducedMotion()) return;
        for (const { nativeElement: row } of this.rows()) {
          const shift = (before.get(row.dataset['id']) ?? 0) - row.getBoundingClientRect().top;
          if (!shift) continue;
          row.animate([{ transform: `translateY(${shift}px)` }, { transform: 'none' }], {
            duration: tokenMs(row, '--lc-sys-duration-move'),
            easing: getComputedStyle(row).getPropertyValue('--lc-sys-easing-spring').trim(),
          });
        }
      },
      { injector: this.injector },
    );
  }
}
