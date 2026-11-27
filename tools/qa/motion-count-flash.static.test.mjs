// Acceptation de docs/specs/2026-12-mouvement-v2.md, tâche T5 : contrat public de lcCountUp / lcFlash (§5.1, §5.3), aucune valeur de mouvement en dur (CA-1), rAF annulé (CA-14).
// Lancer : node --test tools/qa/motion-count-flash.static.test.mjs
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, test } from 'node:test';

const motion = join(resolve(import.meta.dirname, '../..'), 'packages/angular/src/lib/motion');
const strip = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const source = (file) => {
  const path = join(motion, 'directives', file);
  assert.ok(existsSync(path), `${file} absent de lib/motion/directives`);
  return strip(readFileSync(path, 'utf8'));
};

describe('lcCountUp et lcFlash (T5)', () => {
  test('index.ts exporte count-up.directive et flash.directive', () => {
    const index = readFileSync(join(motion, 'index.ts'), 'utf8');
    assert.match(index, /directives\/count-up\.directive/);
    assert.match(index, /directives\/flash\.directive/);
  });

  test('sélecteurs et entrées de §5.3', () => {
    const count = source('count-up.directive.ts');
    assert.match(count, /selector:\s*['"]\[lcCountUp\]['"]/);
    assert.match(count, /class\s+LcCountUpDirective\b/);
    assert.match(count, /lcCountUpFormat/);
    assert.match(count, /LcFormatService/, 'le texte est formaté par LcFormatService');
    const flash = source('flash.directive.ts');
    assert.match(flash, /selector:\s*['"]\[lcFlash\]['"]/);
    assert.match(flash, /class\s+LcFlashDirective\b/);
  });

  test('count-up : rAF annulé, aucun aria-live ni innerHTML', () => {
    const count = source('count-up.directive.ts');
    assert.match(count, /cancelAnimationFrame/);
    assert.doesNotMatch(count, /aria-live|ariaLive|innerHTML/);
  });

  for (const file of ['count-up.directive.ts', 'flash.directive.ts']) {
    test(`${file} : aucune durée, courbe ni couleur en dur, aucun import de point d'entrée secondaire ni d'@angular/animations`, () => {
      const code = source(file);
      assert.doesNotMatch(code, /\b\d+(\.\d+)?\s*ms\b|cubic-bezier\(|#[0-9a-f]{3,8}\b|rgba?\(/i);
      assert.doesNotMatch(code, /@angular\/animations|@lionelcointot\/ui-angular\/(forms|feedback|overlay|layout|navigation|data|charts|geo|theme-builder)/);
    });
  }
});
