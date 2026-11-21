import { describe, expect, it } from 'vitest';
import { dragHasFiles, dragLeftZone, droppedFiles, filterFiles, matchesAccept } from './file-filter';

const file = (name: string, type = '', size = 1) => new File([new Uint8Array(size)], name, { type });
const names = (files: readonly File[]) => files.map((f) => f.name);

describe('matchesAccept', () => {
  it('vide : tout passe', () => expect(matchesAccept(file('a.bin'), ' , ')).toBe(true));
  it('type exact, type/* et extension, sans tenir compte de la casse', () => {
    expect(matchesAccept(file('a', 'image/png'), 'image/png')).toBe(true);
    expect(matchesAccept(file('a', 'image/webp'), 'image/*')).toBe(true);
    expect(matchesAccept(file('A.PDF'), '.pdf')).toBe(true);
    expect(matchesAccept(file('a.txt', 'text/plain'), 'image/*,.pdf')).toBe(false);
    // Le type déclaré fait foi autant que le nom : `accept` n'est pas un contrôle de sécurité.
    expect(matchesAccept(file('virus.exe', 'application/pdf'), '.pdf')).toBe(true);
  });
});

describe('filterFiles', () => {
  it('type d\'abord, puis place restante, dans l\'ordre reçu', () => {
    const { accepted, refused } = filterFiles(
      [file('a.png', 'image/png'), file('b.txt', 'text/plain'), file('c.png', 'image/png'), file('d.png', 'image/png')],
      { accept: 'image/*', room: 2, multiple: true });
    expect(names(accepted)).toEqual(['a.png', 'c.png']);
    expect(refused.map((r) => [r.file.name, r.reason])).toEqual([['b.txt', 'type'], ['d.png', 'count']]);
  });
  it('sans multiple : un seul fichier, les autres en « count »', () => {
    const { accepted, refused } = filterFiles([file('a'), file('b')], { accept: '', room: 5, multiple: false });
    expect(names(accepted)).toEqual(['a']);
    expect(refused.map((r) => r.reason)).toEqual(['count']);
  });
  it('place nulle : tout est refusé en « count »', () => {
    expect(filterFiles([file('a')], { accept: '', room: 0, multiple: true }).refused[0].reason).toBe('count');
  });
  it('skipEmpty ignore les fichiers de 0 octet, sans les refuser ; défaut : conservés', () => {
    const list = [file('vide', '', 0), file('plein')];
    const skipped = filterFiles(list, { accept: '', room: 5, multiple: true, skipEmpty: true });
    expect(names(skipped.accepted)).toEqual(['plein']);
    expect(skipped.refused).toEqual([]);
    expect(names(filterFiles(list, { accept: '', room: 5, multiple: true }).accepted)).toEqual(['vide', 'plein']);
  });
});

describe('glisser', () => {
  it('dragHasFiles : seulement si « Files » est présent', () => {
    expect(dragHasFiles({ dataTransfer: { types: ['Files'] } } as unknown as DragEvent)).toBe(true);
    expect(dragHasFiles({ dataTransfer: { types: ['text/plain'] } } as unknown as DragEvent)).toBe(false);
    expect(dragHasFiles({ dataTransfer: null } as unknown as DragEvent)).toBe(false);
  });
  it('dragLeftZone : faux vers un descendant, vrai vers l\'extérieur ou nulle part', () => {
    const zone = document.createElement('div');
    const child = zone.appendChild(document.createElement('span'));
    const outside = document.createElement('p');
    const event = (relatedTarget: Node | null) => ({ currentTarget: zone, relatedTarget }) as unknown as DragEvent;
    expect(dragLeftZone(event(child))).toBe(false);
    expect(dragLeftZone(event(outside))).toBe(true);
    expect(dragLeftZone(event(null))).toBe(true);
  });
  it('droppedFiles : écarte dossiers et éléments non fichiers ; repli sur files sans items', () => {
    const real = file('a');
    const item = (kind: string, f: File | null, directory = false) =>
      ({ kind, getAsFile: () => f, webkitGetAsEntry: () => ({ isDirectory: directory }) });
    const withItems = { items: [item('file', real), item('file', file('dossier'), true), item('string', null), item('file', null)], files: [] };
    expect(droppedFiles(withItems as unknown as DataTransfer)).toEqual([real]);
    expect(droppedFiles({ items: [], files: [real] } as unknown as DataTransfer)).toEqual([real]);
  });
});
