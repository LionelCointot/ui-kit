import { lcFilterOptions, lcHighlightSegments, lcNormalizeSearchText } from './search-text';

describe('lcNormalizeSearchText', () => {
  it.each([
    ['Rhône', 'rhone'],
    ['  Côte-d’Or  ', 'cote d or'],
    ["Val-d'Oise", 'val d oise'],
    ['Haute   Savoie', 'haute savoie'],
    ['CŒUR', 'coeur'],
    ['2A', '2a'],
    ['', ''],
  ])('« %s » devient « %s »', (input, expected) => {
    expect(lcNormalizeSearchText(input)).toBe(expected);
  });
});

describe('lcFilterOptions', () => {
  const items = ['Ain', 'Aisne', 'Rhône', 'Haute-Savoie', 'Savoie', 'Territoire de Belfort', 'Bas-Rhin'];
  const keys = (item: string) => [item];

  it('renvoie les premiers éléments quand le texte est vide', () => {
    expect(lcFilterOptions(items, '  ', keys, 3)).toEqual(['Ain', 'Aisne', 'Rhône']);
  });

  it('ignore la casse et les diacritiques', () => {
    expect(lcFilterOptions(items, 'RHONE', keys)).toEqual(['Rhône']);
  });

  it('trie : égalité, préfixe de clé, préfixe de mot, sous-chaîne', () => {
    const list = ['Bas-Rhin', 'Rhin', 'Rhône-Alpes', 'Les Rhinocéros', 'Brhin'];
    expect(lcFilterOptions(list, 'rhin', keys)).toEqual(['Rhin', 'Bas-Rhin', 'Les Rhinocéros', 'Brhin']);
  });

  it('conserve l\'ordre d\'origine à rang égal', () => {
    expect(lcFilterOptions(items, 'ai', keys)).toEqual(['Ain', 'Aisne']);
  });

  it('compare plusieurs clés (code et nom)', () => {
    const departments = [
      { code: '69', name: 'Rhône' },
      { code: '2A', name: 'Corse-du-Sud' },
      { code: '974', name: 'La Réunion' },
    ];
    const byKeys = (d: { code: string; name: string }) => [d.code, d.name, `${d.code} ${d.name}`];
    expect(lcFilterOptions(departments, '2a', byKeys).map((d) => d.code)).toEqual(['2A']);
    expect(lcFilterOptions(departments, '974', byKeys).map((d) => d.name)).toEqual(['La Réunion']);
    expect(lcFilterOptions(departments, '69 rhone', byKeys).map((d) => d.code)).toEqual(['69']);
  });

  it('limite le nombre de résultats', () => {
    expect(lcFilterOptions(items, 'a', keys, 2)).toHaveLength(2);
  });

  it('ne renvoie rien sans correspondance', () => {
    expect(lcFilterOptions(items, 'zzz', keys)).toEqual([]);
  });
});

describe('lcHighlightSegments', () => {
  it('entoure la correspondance sans tenir compte des accents', () => {
    expect(lcHighlightSegments('Auvergne-Rhône-Alpes', 'rhone')).toEqual([
      { text: 'Auvergne-', match: false },
      { text: 'Rhône', match: true },
      { text: '-Alpes', match: false },
    ]);
  });

  it('renvoie un seul segment sans terme ni correspondance', () => {
    expect(lcHighlightSegments('Lyon', '')).toEqual([{ text: 'Lyon', match: false }]);
    expect(lcHighlightSegments('Lyon', 'xyz')).toEqual([{ text: 'Lyon', match: false }]);
  });

  it('surligne toutes les occurrences', () => {
    const segments = lcHighlightSegments('Lalala', 'la');
    expect(segments.filter((s) => s.match)).toHaveLength(3);
    expect(segments.map((s) => s.text).join('')).toBe('Lalala');
  });

  it('garde les positions d\'origine avec les ligatures', () => {
    expect(lcHighlightSegments('Cœur de Lion', 'oe')).toEqual([
      { text: 'C', match: false },
      { text: 'œ', match: true },
      { text: 'ur de Lion', match: false },
    ]);
  });
});
