/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('DESIGN.md : vocabulaire d\'actions', () => {
  const design = readFileSync(resolve(process.cwd(), 'DESIGN.md'), 'utf8');
  const rows = design.split('\n').filter((line) => line.startsWith('|'));
  const row = (label: string) => rows.find((line) => line.startsWith(`| ${label}`));

  it.each([
    ['Continuer', '`chevron-right`'],
    ['Aller à une section', '`arrow-down`'],
    ['Gérer <objets>', '`settings`'],
    ['Essayer', '`calculator`'],
    ['Revenir à <valeur>', '`rotate-ccw`'],
  ])('la ligne « %s » est présente avec l\'icône %s', (label, icon) => {
    expect(row(label)).toContain(icon);
  });

  it('les lignes d\'actions ajoutées ne citent ni lc-section-nav ni circle-help', () => {
    const added = ['Continuer', 'Aller à une section', 'Gérer <objets>', 'Essayer', 'Revenir à <valeur>'].map((label) => row(label));
    for (const line of added) expect(line).not.toMatch(/lc-section-nav|circle-help/);
  });

  it('lc-section-nav n\'est mentionné nulle part', () => {
    expect(design).not.toContain('lc-section-nav');
  });
});
