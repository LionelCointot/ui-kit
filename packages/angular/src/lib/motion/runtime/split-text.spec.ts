import { describe, expect, it } from 'vitest';
import { lcSplitGraphemes } from './split-text';

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const words = (text: string) => lcSplitGraphemes(text, segmenter).map((p) => ('word' in p ? p.word : p.space));

describe('lcSplitGraphemes', () => {
  it('garde e + accent combinant, emoji famille et drapeau entiers (un graphème chacun)', () => {
    expect(words('Café')).toEqual([['C', 'a', 'f', 'é']]);
    expect(words('\u{1F468}‍\u{1F469}‍\u{1F467}‍\u{1F466}')).toHaveLength(1);
    expect((words('\u{1F1EB}\u{1F1F7}')[0] as string[]).length).toBe(1);
  });

  it('un mot par suite de non-espaces, les espaces restent hors des mots', () => {
    expect(words('Un  deux ')).toEqual([['U', 'n'], '  ', ['d', 'e', 'u', 'x'], ' ']);
  });

  it('texte vide : rien', () => {
    expect(words('')).toEqual([]);
  });
});
