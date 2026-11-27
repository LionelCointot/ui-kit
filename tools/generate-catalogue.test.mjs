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

test('collectEntryPoint : suit les réexportations d\'un index de dossier, filtre à travers lui, sans boucler', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'catalogue-'));
  try {
    mkdirSync(path.join(dir, 'motion'));
    writeFileSync(path.join(dir, 'motion', 'a.ts'), SRC);
    writeFileSync(path.join(dir, 'motion', 'index.ts'), `export * from './a';\nexport * from './index';`);
    const api = path.join(dir, 'public-api.ts');
    writeFileSync(api, `export * from './motion';`);
    assert.equal(collectEntryPoint(api).length, 4);
    writeFileSync(api, `export { LcDemoPipe } from './motion';`);
    assert.deepEqual(collectEntryPoint(api).map((d) => d.className), ['LcDemoPipe']);
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

const BASES = `
@Directive()
export abstract class Root {
  readonly value = model(0);
  readonly disabled = input(false);
  readonly touch = output<void>();
}

@Directive()
export abstract class Mid extends Root {
  readonly min = input<number | null>(null);
  readonly disabled = input(true, { alias: 'off' });
}
`;

const entry = (name) => (d) => d.className === name;

test('héritage : une base, une chaîne de deux bases, membre redéclaré une fois, bases d\'abord', () => {
  const src = `${BASES}
@Component({ selector: 'lc-leaf' })
export class Leaf<T extends object> extends Mid {
  readonly step = input(1);
  override readonly value = model<number | null>(null);
  readonly touch = output<string>();
}
@Component({ selector: 'lc-single' })
export class Single extends Root {
  readonly own = input(1);
}
`;
  const decls = extractDeclarations(src);
  const leaf = decls.find(entry('Leaf'));
  assert.deepEqual(leaf.inputs.map((i) => i.name), ['value', 'off', 'min', 'step']);
  assert.deepEqual(leaf.outputs.map((o) => o.name), ['touch']);
  assert.deepEqual(decls.find(entry('Single')).inputs.map((i) => i.name), ['value', 'disabled', 'own']);
  assert.equal(decls.length, 2);
});

test('héritage : base non exportée par le public-api, dans un autre fichier', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'catalogue-'));
  try {
    writeFileSync(path.join(dir, 'base.ts'), BASES);
    writeFileSync(path.join(dir, 'leaf.ts'), `@Component({ selector: 'lc-leaf' })\nexport class Leaf extends Mid {}\n`);
    const api = path.join(dir, 'public-api.ts');
    writeFileSync(api, `export * from './leaf';`);
    const [leaf] = collectEntryPoint(api);
    assert.deepEqual(leaf.inputs.map((i) => i.name), ['value', 'off', 'min']);
    assert.deepEqual(leaf.outputs.map((o) => o.name), ['touch']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('déclaration sur plusieurs lignes lue ; membre protected ignoré', () => {
  const src = `@Component({ selector: 'lc-ml' })
export class Ml {
  readonly a =
    input<string>('x');
  readonly b = input<
    'p' | 'q'
  >('p');
  protected readonly c = input(1);
}
`;
  assert.deepEqual(extractDeclarations(src)[0].inputs.map((i) => i.name), ['a', 'b']);
});
