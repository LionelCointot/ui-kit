import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { collectEntryPoint, extractDeclarations, parseExports, renderCatalogue } from './generate-catalogue.mjs';

const SRC = `
@Component({
  selector: 'lc-demo',
  host: { class: 'x' },
})
export class LcDemoComponent<T> {
  private readonly hidden = input(1);
  readonly label = input.required<string>();
  readonly size = input<'a' | 'b'>('a', { alias: 'demoSize' });
  readonly value = model(0);
  readonly picked = output<T>();
  protected readonly inner = output<void>();
}

@Directive({ selector: 'button[lcDemo]' })
export class LcDemoDirective {}

@Directive({ selector: 'a[lcA], b[lcB]' })
export class LcMultiDirective {}

@Pipe({ name: 'lcDemo' })
export class LcDemoPipe {}

@Directive()
export abstract class LcBase {}

@Directive({ selector: '[lcLocal]' })
class LcNotExported {}
`;

test('extractDeclarations : sélecteurs, genres, entrées et sorties', () => {
  const byName = Object.fromEntries(extractDeclarations(SRC).map((d) => [d.className, d]));
  assert.deepEqual(Object.keys(byName), ['LcDemoComponent', 'LcDemoDirective', 'LcMultiDirective', 'LcDemoPipe']);
  const c = byName.LcDemoComponent;
  assert.equal(c.kind, 'composant');
  assert.deepEqual(c.inputs, [
    { name: 'label', alias: undefined, required: true, model: false },
    { name: 'demoSize', alias: 'size', required: false, model: false },
    { name: 'value', alias: undefined, required: false, model: true },
  ]);
  assert.deepEqual(c.outputs.map((o) => o.name), ['picked']);
  assert.equal(byName.LcDemoDirective.selector, 'button[lcDemo]');
  assert.equal(byName.LcMultiDirective.selector, 'a[lcA], b[lcB]');
  assert.equal(byName.LcDemoPipe.kind, 'pipe');
  assert.equal(byName.LcDemoPipe.selector, 'lcDemo');
});

test('parseExports : export étoile, nommé, alias et type ignorés', () => {
  const src = `export * from './a';\nexport { X, type Y, Z as W } from './b';\nexport type { T } from './c';\nexport const k = 1;`;
  assert.deepEqual(parseExports(src), [
    { from: './a', names: null },
    { from: './b', names: ['X', 'Z'] },
  ]);
});

test('collectEntryPoint : suit les exports, filtre les noms, échoue sur fichier absent', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'catalogue-'));
  try {
    writeFileSync(path.join(dir, 'a.ts'), SRC);
    const api = path.join(dir, 'public-api.ts');
    writeFileSync(api, `export { LcDemoPipe, LcDemoDirective } from './a';`);
    // Tri par sélecteur : 'button[lcDemo]' avant 'lcDemo'.
    assert.deepEqual(collectEntryPoint(api).map((d) => d.className), ['LcDemoDirective', 'LcDemoPipe']);
    writeFileSync(api, `export * from './a';`);
    assert.equal(collectEntryPoint(api).length, 4);
    writeFileSync(api, `export * from './missing';`);
    assert.throws(() => collectEntryPoint(api), /missing\.ts/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('renderCatalogue : reproductible, version écrite, pas de date', () => {
  const decls = extractDeclarations(SRC);
  const a = renderCatalogue('1.2.3', [{ name: '@x/y', decls }]);
  assert.equal(a, renderCatalogue('1.2.3', [{ name: '@x/y', decls }]));
  assert.match(a, /version 1\.2\.3/);
  assert.match(a, /\| `lc-demo` \| LcDemoComponent \| composant \| label \(requis\), demoSize \(alias de size\), value \(model\) \| picked \|/);
});
