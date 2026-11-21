import { splitLinks } from './message-thread-links';

const links = (text: string) => splitLinks(text).filter((p) => p.type === 'link').map((p) => [p.text, p.href]);
const joined = (text: string) => splitLinks(text).map((p) => p.text).join('');

describe('splitLinks', () => {
  it('texte seul : un morceau', () => expect(splitLinks('bonjour')).toEqual([{ type: 'text', text: 'bonjour' }]));
  it('chaîne vide : aucun morceau', () => expect(splitLinks('')).toEqual([]));

  it('adresse au milieu du texte, ponctuation finale exclue', () => {
    expect(splitLinks('Suivi : https://exemple.fr/suivi/1234.')).toEqual([
      { type: 'text', text: 'Suivi : ' }, { type: 'link', text: 'https://exemple.fr/suivi/1234', href: 'https://exemple.fr/suivi/1234' }, { type: 'text', text: '.' },
    ]);
    expect(links('voir http://a.test/x?y=1, puis http://b.test!')).toEqual([['http://a.test/x?y=1', 'http://a.test/x?y=1'], ['http://b.test', 'http://b.test/']]);
  });

  it.each(['.', ',', ';', ':', '!', '?'])('ponctuation « %s » finale exclue', (p) => {
    expect(links(`https://x.test/a${p}`)).toEqual([['https://x.test/a', 'https://x.test/a']]);
  });

  it('parenthèses : non appariée exclue, appariée gardée', () => {
    expect(links('(https://x.test/a)')).toEqual([['https://x.test/a', 'https://x.test/a']]);
    expect(links('https://en.wikipedia.org/wiki/Foo_(bar)')).toEqual([['https://en.wikipedia.org/wiki/Foo_(bar)', 'https://en.wikipedia.org/wiki/Foo_(bar)']]);
    expect(links('(voir https://en.wikipedia.org/wiki/Foo_(bar)).')).toEqual([['https://en.wikipedia.org/wiki/Foo_(bar)', 'https://en.wikipedia.org/wiki/Foo_(bar)']]);
  });

  it('chevrons et guillemets exclus ; deux adresses, deux liens', () => {
    expect(links('<https://x.test/a>')).toEqual([['https://x.test/a', 'https://x.test/a']]);
    expect(links('"https://x.test/a" \'https://y.test/b\'').map((l) => l[0])).toEqual(['https://x.test/a', 'https://y.test/b']);
    expect(links('https://a.test https://b.test').length).toBe(2);
  });

  it('href normalisé par URL, schéma en majuscules accepté, texte conservé', () => {
    expect(splitLinks('HTTP://EXAMPLE.COM/a')).toEqual([{ type: 'link', text: 'HTTP://EXAMPLE.COM/a', href: 'http://example.com/a' }]);
  });

  it.each([
    'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'java script:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)', 'javascript&colon;alert(1)',
    'data:text/html,<b>x</b>', 'DATA:text/html,x', 'vbscript:x', 'file:///etc/passwd', 'ftp://x.test/a', '//evil.test', 'www.example.com', 'http:/x', 'https://', 'http://', 'xhttps://a.test',
  ])('« %s » reste du texte', (text) => {
    expect(links(text)).toEqual([]);
    expect(joined(text)).toBe(text);
  });

  it('le texte est restitué à l\'identique (retours à la ligne compris)', () => {
    const text = 'ligne 1\nhttps://x.test/a.\n\n<b>"&amp;"</b> fin';
    expect(joined(text)).toBe(text);
  });

  it('corpus aléatoire (graine fixe) : tout lien rendu est en http(s), le texte est conservé', () => {
    let seed = 42;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const alphabet = ['http://', 'https://', 'HtTp://', 'javascript:', 'data:', '(', ')', '<', '>', '"', ' ', '\n', '\t', '.', ',', 'a', 'b.test', '/', '%', '&', ':', '\u0000'];
    for (let i = 0; i < 600; i++) {
      let text = '';
      for (let n = rnd() * 12; n > 0; n--) text += alphabet[Math.floor(rnd() * alphabet.length)];
      expect(joined(text)).toBe(text);
      for (const p of splitLinks(text)) if (p.type === 'link') expect(p.href).toMatch(/^https?:\/\//);
    }
  });

  it('adresse de 200 000 caractères et motifs adverses : découpe linéaire', () => {
    for (const text of [`https://x.test/${'a'.repeat(200_000)}`, `https://x.test/${')'.repeat(200_000)}`, `https://${'.'.repeat(200_000)}`, `${'http://'.repeat(30_000)}`]) {
      const start = performance.now();
      splitLinks(text);
      expect(performance.now() - start).toBeLessThan(50);
    }
  });
});
