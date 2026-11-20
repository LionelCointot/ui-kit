// Tests du générateur de code affiché. Lancer : npm run snippets:test (node --test, sans navigateur ni Storybook).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeTemplate, buildSnippet, formatValue, hoistLoopLiterals, reindentTemplate, selectorMatches } from './code-snippet.ts';

const noSignal = () => false;
const data = {
  kit: {
    LcButtonComponent: { module: '@lionelcointot/ui-angular', selectors: ['button[lcButton]', 'a[lcButton]'] },
    LcIconComponent: { module: '@lionelcointot/ui-angular', selectors: ['lc-icon'] },
    LcTableComponent: { module: '@lionelcointot/ui-angular/data', selectors: ['lc-table'] },
    LcStatusKind: { module: '@lionelcointot/ui-angular' },
  },
  files: {
    'demo.stories.ts': {
      imports: { signal: '@angular/core', input: '@angular/core', LcButtonComponent: '@lionelcointot/ui-angular', LcStatusKind: '@lionelcointot/ui-angular' },
      locals: [
        { names: ['KINDS'], text: "const KINDS: readonly LcStatusKind[] = ['info'];", uses: ['LcStatusKind'] },
        { names: ['DemoComponent'], text: "@Component({ selector: 'demo-x', template: '' })\nclass DemoComponent { kinds = KINDS; }", selectors: ['demo-x'], uses: ['Component', 'KINDS'] },
      ],
      stories: { Typed: { rows: { text: 'ROWS', uses: [], args: false, literal: false }, sort: { text: "{ id: 'a' }", uses: [], args: false, literal: true } } },
    },
  },
};
const build = (input) => buildSnippet({ props: {}, data, isSignal: noSignal, ...input });

test('le Playground reflète les valeurs courantes des contrôles (CA-12)', () => {
  const template = '<button lcButton [fillMode]="fillMode">Enregistrer</button>';
  assert.match(build({ template, props: { fillMode: 'solid' } }), /readonly fillMode = 'solid';/);
  assert.match(build({ template, props: { fillMode: 'outline' } }), /readonly fillMode = 'outline';/);
});

test("n'importe que ce que le gabarit utilise, groupé par point d'entrée", () => {
  const code = build({ template: '<button lcButton>Ok</button><lc-table [data]="rows" />', props: { rows: [1] } });
  assert.match(code, /import \{ Component \} from '@angular\/core';/);
  assert.match(code, /import \{ LcButtonComponent \} from '@lionelcointot\/ui-angular';/);
  assert.match(code, /import \{ LcTableComponent \} from '@lionelcointot\/ui-angular\/data';/);
  assert.match(code, /imports: \[LcButtonComponent, LcTableComponent\]/);
  assert.doesNotMatch(code, /LcIconComponent/);
});

test("un champ à choix prend le type union de ses options, un objet garde ses littéraux", () => {
  const code = build({ template: '<lc-table [a]="mode" [b]="obj" />', props: { mode: 'client', obj: { size: 'small' } }, options: { mode: ['client', 'external'] } });
  assert.match(code, /readonly mode: 'client' \| 'external' = 'client';/);
  assert.match(code, /readonly obj = \{ size: 'small' \} as const;/);
});

test('une valeur écrite dans la story est recopiée, avec ses déclarations locales', () => {
  const code = build({ template: '<demo-x [rows]="rows" [sort]="sort" />', props: { rows: [() => 1], sort: { id: 'a' } }, fileName: './demo.stories.ts', storyName: 'Typed' });
  assert.match(code, /readonly rows = ROWS;/);
  assert.match(code, /readonly sort = \{ id: 'a' \} as const;/);
  assert.match(code, /const KINDS: readonly LcStatusKind\[\]/);
  assert.match(code, /imports: \[DemoComponent\]/);
  assert.match(code, /import \{ LcStatusKind \} from '@lionelcointot\/ui-angular';/);
});

test('une sortie liée devient une méthode vide, un signal reste un signal', () => {
  const action = Object.assign(() => undefined, { isAction: true });
  const signalFn = Object.assign(() => 3, { sig: true });
  const code = build({ template: '<button lcButton (click)="open()">Ouvrir</button><lc-icon [name]="n()" />', props: { open: action, n: signalFn }, isSignal: (v) => v === signalFn });
  assert.match(code, /open\(\): void \{\n {4}\/\/ À compléter/);
  assert.match(code, /readonly n = signal\(3\);/);
  assert.match(code, /import \{ Component, signal \} from '@angular\/core';/);
});

test('une story sans gabarit reçoit un gabarit généré depuis le sélecteur du composant', () => {
  const code = build({ props: { size: 'small', other: 1 }, component: { selector: ['button[lcButton]'], inputs: ['size'], outputs: [] } });
  assert.match(code, /<button lcButton \[size\]="size"><\/button>/);
});

test('analyse : variables locales exclues, appels et affectations repérés', () => {
  const a = analyzeTemplate(`@for (item of items; track item.id) { <p (click)="count = count + 1; pick(item)">{{ item.name | uppercase }} {{ label }}</p> }`);
  assert.deepEqual(a.roots.sort(), ['count', 'items', 'label', 'pick']);
  assert.equal(a.called.get('pick'), 'item');
  assert.ok(a.mutated.has('count'));
  assert.ok(a.pipes.has('uppercase'));
});

test('sélecteurs : balise, attributs, valeurs statiques', () => {
  assert.ok(selectorMatches('button[lcButton]', 'button', { lcButton: '' }));
  assert.ok(!selectorMatches('button[lcButton]', 'a', { lcButton: '' }));
  assert.ok(selectorMatches('input[type=checkbox][lcCheckbox]', 'input', { type: 'checkbox', lcCheckbox: '' }));
  assert.ok(!selectorMatches('input[type=checkbox][lcCheckbox]', 'input', { type: 'radio', lcCheckbox: '' }));
});

test('littéraux : tableaux longs tronqués, chaînes et clés protégées', () => {
  assert.equal(formatValue(['a', "l'a"], noSignal), `['a', "l'a"]`);
  assert.match(formatValue(Array.from({ length: 12 }, (_, i) => i), noSignal), /\/\/ … 2 de plus/);
  assert.equal(formatValue({ 'a-b': undefined }, noSignal), '{ \'a-b\': undefined }');
});

test('gabarit : tableau littéral de @for remonté en champ, indentation recalée', () => {
  const hoisted = hoistLoopLiterals("@for (fill of ['solid','flat']; track fill) { <b>{{ fill }}</b> }");
  assert.equal(hoisted.template, '@for (fill of fillValues; track fill) { <b>{{ fill }}</b> }');
  assert.equal(hoisted.fields[0].code, "readonly fillValues = ['solid','flat'] as const;");
  assert.equal(reindentTemplate('<div>\n      <p></p>\n    </div>', '  '), '  <div>\n    <p></p>\n  </div>');
});

test("analyse : clés d'objet littéral et mots-clés de @defer ne sont pas des champs", () => {
  const a = analyzeTemplate(`<p [ngClass]="{active: isActive, 'is-off': off}">x</p> @defer (on viewport; prefetch on idle; when ready) { <b>y</b> }`);
  assert.deepEqual(a.roots.sort(), ['isActive', 'off', 'ready']);
});

test('un champ sans valeur est typé par les options, la table d\'API ou un type à renseigner', () => {
  const template = '<lc-table [a]="pressed" [b]="mode" [c]="min" />';
  const code = build({ template, props: { mode: undefined }, options: { mode: ['x', 'y'] }, types: { pressed: 'boolean' } });
  assert.match(code, /readonly pressed: boolean \| undefined = undefined;/);
  assert.match(code, /readonly mode: 'x' \| 'y' \| undefined = undefined;/);
  assert.match(code, /readonly min: any = undefined; \/\/ À renseigner/);
});

test('as const seulement pour un littéral qui contient du texte', () => {
  const code = build({ template: '<lc-table [a]="nums" [b]="words" />', props: { nums: [1, 2], words: ['a'] } });
  assert.match(code, /readonly nums = \[1, 2\];/);
  assert.match(code, /readonly words = \['a'\] as const;/);
});
