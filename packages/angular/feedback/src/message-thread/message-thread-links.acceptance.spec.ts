import { splitLinks } from './message-thread-links';

// Acceptation de docs/specs/2026-11-fil-de-messages.md (F0), écrite avant le code : CA-T8, CA-T14, CA-T15 (découpeur de liens, fonction pure).
// Contrat fixé par QA (à confirmer par le développeur) : fichier ./message-thread-links.ts, splitLinks(text: string): LcTextPart[]
//   avec LcTextPart = { type: 'text'; text: string } | { type: 'link'; text: string; href: string }.
//   Invariant : la concaténation des `text` redonne exactement l'entrée (rien n'est perdu, retours à la ligne compris) ;
//   `text` d'un lien est l'adresse brute (sans ponctuation finale), `href` = new URL(text).href.

const links = (s: string) => splitLinks(s).filter((p) => p.type === 'link');
const joined = (s: string) => splitLinks(s).map((p) => p.text).join('');

describe('CA-T14 liens déguisés', () => {
  const DISGUISED = [
    'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)',
    '\u0000javascript:alert(1)', 'java\u0000script:alert(1)', '&#106;avascript:alert(1)', '&#x6A;avascript:alert(1)', '&#104;ttps://x.test/a',
    'data:text/html,<b>x</b>', 'DATA:text/html;base64,AAAA', 'Data:image/png;base64,AAAA', 'vbscript:msgbox(1)', 'file:///etc/passwd', 'ftp://x.test/a',
    '//evil.test/a', 'www.example.com', 'http:/x', 'https:x', 'https://',
  ];
  it.each(DISGUISED)('%j reste du texte', (s) => {
    expect(links(s)).toEqual([]);
    expect(joined(s)).toBe(s);
  });

  it('HTTP://EXAMPLE.COM/a est un lien dont href est normalisé par new URL()', () => {
    const l = links('HTTP://EXAMPLE.COM/a');
    expect(l).toHaveLength(1);
    expect(l[0]).toMatchObject({ href: 'http://example.com/a' });
    expect(l[0].href).toBe(new URL('HTTP://EXAMPLE.COM/a').href);
  });

  it('corpus aléatoire à graine fixe (≥ 500 chaînes) : tout lien est http(s) et rien n\'est perdu', () => {
    let seed = 0xc0ffee;
    const rnd = () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const FRAGS = ['http://', 'https://', 'HTTPS://', 'javascript:', 'JAVASCRIPT:', 'data:', 'vbscript:', 'file:', 'ftp://', '//', 'www.', 'x.test', 'example.com/a', '/path', '?q=1&b=2', '#h', '(', ')', '.', ',', ';', ':', '!', '?', '<', '>', '"', "'", '&#106;', '&amp;', ' ', '\t', '\n', '\u0000', '\u202E', 'é', '😀', 'alert(1)', '%20', '[', ']'];
    let count = 0;
    for (; count < 800; count += 1) {
      const n = 1 + Math.floor(rnd() * 9);
      let s = '';
      for (let i = 0; i < n; i += 1) s += FRAGS[Math.floor(rnd() * FRAGS.length)];
      const parts = splitLinks(s);
      expect(parts.map((p) => p.text).join(''), JSON.stringify(s)).toBe(s);
      for (const p of parts) {
        if (p.type !== 'link') continue;
        expect(p.href, JSON.stringify(s)).toMatch(/^https?:\/\//);
        expect(p.text, JSON.stringify(s)).toMatch(/^https?:\/\//i);
        expect(p.text, JSON.stringify(s)).not.toMatch(/[\s\u0000-\u001F<>"]/);
        expect(p.href).toBe(new URL(p.text).href);
      }
    }
    expect(count).toBeGreaterThanOrEqual(500);
  });
});

describe('CA-T8 / CA-T15 ponctuation, appariement, plusieurs adresses', () => {
  it.each(['.', ',', ';', ':', '!', '?'])('la ponctuation finale %s n\'entre pas dans le lien', (p) => {
    const parts = splitLinks(`Voir https://x.test/a${p}`);
    expect(parts.filter((x) => x.type === 'link').map((x) => x.text)).toEqual(['https://x.test/a']);
    expect(parts.at(-1)).toMatchObject({ type: 'text', text: p });
  });
  it('(https://x.test/a) : parenthèses hors du lien', () => {
    expect(links('(https://x.test/a)').map((x) => x.text)).toEqual(['https://x.test/a']);
  });
  it('parenthèse appariée dans l\'adresse conservée, finale non appariée retirée', () => {
    expect(links('https://en.wikipedia.org/wiki/Foo_(bar)').map((x) => x.text)).toEqual(['https://en.wikipedia.org/wiki/Foo_(bar)']);
    expect(links('https://en.wikipedia.org/wiki/Foo_(bar).').map((x) => x.text)).toEqual(['https://en.wikipedia.org/wiki/Foo_(bar)']);
    expect(links('(voir https://en.wikipedia.org/wiki/Foo_(bar))').map((x) => x.text)).toEqual(['https://en.wikipedia.org/wiki/Foo_(bar)']);
  });
  it('chevrons et guillemets exclus', () => {
    expect(links('<https://x.test/a>').map((x) => x.text)).toEqual(['https://x.test/a']);
    expect(links('"https://x.test/a"').map((x) => x.text)).toEqual(['https://x.test/a']);
  });
  it('deux adresses : deux liens ; retours à la ligne conservés ; & dans la requête gardé', () => {
    const s = 'a https://x.test/1\nb http://y.test/?a=1&b=2 fin';
    expect(links(s).map((x) => x.text)).toEqual(['https://x.test/1', 'http://y.test/?a=1&b=2']);
    expect(joined(s)).toBe(s);
  });
  it('texte sans adresse : un seul morceau texte ; chaîne vide : aucun lien', () => {
    expect(splitLinks('Bonjour\nle monde')).toEqual([{ type: 'text', text: 'Bonjour\nle monde' }]);
    expect(links('')).toEqual([]);
  });
});

describe('CA-T15 longueur : motifs adverses découpés en moins de 50 ms', () => {
  const ADVERSE: Record<string, string> = {
    'adresse de 200 000 caractères': `https://${'a'.repeat(200_000)}`,
    'parenthèses ouvrantes': `https://x.test/${'('.repeat(200_000)}`,
    'parenthèses fermantes': `https://x.test/${')'.repeat(200_000)}`,
    'ponctuation finale': `https://x.test/${'.'.repeat(200_000)}`,
    'a. répété': `https://x.test/${'a.'.repeat(100_000)}`,
    'préfixes sans fin': 'http://'.repeat(30_000),
    'texte sans adresse': 'a'.repeat(200_000),
    'texte puis adresse': `${'a '.repeat(100_000)}https://x`,
  };
  it.each(Object.keys(ADVERSE))('%s', (k) => {
    // Meilleur de 3 essais : la préemption CPU ne fait que rallonger une durée, une complexité non linéaire dépasserait la borne à chaque essai.
    let dt = Infinity;
    let parts = splitLinks('');
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      parts = splitLinks(ADVERSE[k]);
      dt = Math.min(dt, performance.now() - t);
    }
    expect(dt).toBeLessThan(50);
    expect(parts.map((p) => p.text).join('')).toBe(ADVERSE[k]);
  });
});
