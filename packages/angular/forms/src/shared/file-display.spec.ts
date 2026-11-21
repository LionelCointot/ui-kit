import { announcedName, cleanFileName, fileSizeText, isSafePreviewUrl } from './file-display';

const BASE = 'https://app.example/page';

describe('file-display', () => {
  it('cleanFileName retire contrôles et marqueurs bidi, garde le reste', () => {
    expect(cleanFileName('facture‮fdp.exe')).toBe('facturefdp.exe');
    expect(cleanFileName('a\u0007b‏c.pdf')).toBe('abc.pdf');
    expect(cleanFileName('<b>é.png</b>')).toBe('<b>é.png</b>');
  });

  it('announcedName plafonne à 80 caractères, « … » compris', () => {
    expect(announcedName('court.png')).toBe('court.png');
    const long = announcedName(`${'a'.repeat(300)}.png`);
    expect(Array.from(long)).toHaveLength(80);
    expect(long.endsWith('…')).toBe(true);
    expect(announcedName('a'.repeat(80))).toHaveLength(80);
  });

  it.each([
    ['blob:https://app.example/1', true],
    ['data:image/png;base64,AAAA', true],
    ['DATA:IMAGE/png;base64,AAAA', true],
    ['/img/a.png', true],
    ['https://app.example/a.png', true],
    ['javascript:alert(1)', false],
    ['data:text/html,<script>1</script>', false],
    ['https://evil.example/x.png', false],
    ['//evil.example/x.png', false],
  ])('isSafePreviewUrl(%s) = %s', (url, expected) => {
    expect(isSafePreviewUrl(url, BASE)).toBe(expected);
  });

  it('fileSizeText change d\'unité à 1 000 arrondi', () => {
    const units = ['o', 'Ko', 'Mo', 'Go'];
    const fmt = (n: number) => String(n);
    expect(fileSizeText(512, units, fmt)).toBe('512\u00A0o');
    expect(fileSizeText(2048, units, fmt)).toBe('2\u00A0Ko');
    expect(fileSizeText(999_999, units, fmt)).toBe('1\u00A0Mo');
    expect(fileSizeText(Number.NaN, units, fmt)).toBe('0\u00A0o');
  });
});
