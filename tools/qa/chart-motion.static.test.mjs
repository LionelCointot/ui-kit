// Acceptation de docs/specs/2026-12-mouvement-v2.md, T11 (CA-38 pour lc-chart, CA-28 : aucune durée en dur, contrat des stories d19 et d24 de fidelite.json).
// Lancer : node --test tools/qa/chart-motion.static.test.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const charts = resolve(import.meta.dirname, '../../packages/angular/charts/src');
const read = (rel) => (existsSync(join(charts, rel)) ? readFileSync(join(charts, rel), 'utf8') : '');
const strip = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('lc-chart : stories Animation (CA-38) selon la table dNN → story de fidelite.json', () => {
  for (const [file, demo] of [['stories/sparkline.stories.ts', 'd19'], ['stories/bar-chart.stories.ts', 'd24']]) {
    test(`${file} : export Animation, démo ${demo}, Rejouer, bandeau de réduction, point d'échantillonnage`, () => {
      const code = read(file);
      assert.match(code, /export const Animation\b/, 'story Animation absente');
      assert.match(code, new RegExp(`data-demo="${demo}"`), `conteneur [data-demo="${demo}"] absent`);
      assert.match(code, /Rejouer/, 'bouton « Rejouer » absent');
      assert.match(code, /lc-story-motion-notice/, 'bandeau de mouvement réduit absent');
      assert.match(code, /data-sample/, 'élément [data-sample] absent (échantillonnage de motion-fidelity)');
    });
  }

  test('une story de QA (*.qa.stories.ts, titre QA/…, hors autodocs) existe pour les graphiques', () => {
    const files = readdirSync(join(charts, 'stories')).filter((f) => f.endsWith('.qa.stories.ts'));
    assert.ok(files.length > 0, 'aucun fichier *.qa.stories.ts dans charts/src/stories');
    const code = read(`stories/${files[0]}`);
    assert.match(code, /title:\s*'QA\//);
    assert.match(code, /'!autodocs'/);
  });
});

describe('lc-chart : aucune durée d\'animation en dur dans le code de production (CA-28)', () => {
  test('pas de animationDuration* / animationDelay* littéral', () => {
    const offenders = [];
    for (const f of readdirSync(charts, { recursive: true, withFileTypes: true })) {
      if (!f.isFile() || !/\.ts$/.test(f.name) || /\.(spec|stories)\.ts$/.test(f.name)) continue;
      const file = join(f.parentPath, f.name);
      for (const m of strip(readFileSync(file, 'utf8')).matchAll(/animation(?:Duration|Delay)(?:Update)?\s*:\s*\d+/g)) offenders.push(`${file.replace(charts, '')} : ${m[0]}`);
    }
    assert.deepEqual(offenders, []);
  });
});
