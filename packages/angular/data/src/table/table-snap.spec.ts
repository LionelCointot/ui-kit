/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// jsdom ne fait pas de mise en page : on vérifie la présence des règles dans la feuille du composant.
describe('Tableaux : défilement par colonne sous 600 px', () => {
  const css = readFileSync(resolve(process.cwd(), 'packages/angular/data/src/table/table.component.css'), 'utf8');
  const block = css.match(/@media \(max-width: 37\.5rem\) \{([\s\S]*?)\n\}/)?.[1] ?? '';

  it('une requête max-width 600 px (37.5rem) porte les règles de snap', () => {
    expect(block).not.toBe('');
  });

  it('le conteneur de défilement cale en x et réserve la place de la première colonne collante', () => {
    expect(block).toMatch(/\.lc-table__scroll\s*\{[^}]*scroll-snap-type:\s*x mandatory/);
    expect(block).toMatch(/scroll-padding-inline-start:\s*var\(--lc-table-sticky-start-size/);
  });

  it('les colonnes autres que la première s\'alignent au début ; la première prend la largeur du token', () => {
    expect(block).toMatch(/tr > :not\(:first-child\)\s*\{[^}]*scroll-snap-align:\s*start/);
    expect(block).toMatch(/tr > :first-child\s*\{[^}]*inline-size:\s*var\(--lc-table-sticky-start-size/);
  });

  it('le token --lc-table-sticky-start-size a un repli (aucune largeur imposée par défaut)', () => {
    expect(css).toMatch(/--lc-table-sticky-start-size,\s*0px\)/);
    expect(css).toMatch(/--lc-table-sticky-start-size,\s*auto\)/);
  });
});
