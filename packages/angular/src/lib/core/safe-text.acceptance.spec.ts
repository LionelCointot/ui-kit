import { isSafePreviewUrl, lcStripUnsafeChars } from './safe-text';

// Acceptation de docs/specs/2026-11-fil-de-messages.md (F0), écrite avant le code : CA-T16 (nettoyage) et CA-T6 (aperçu admis).
// Contrat : lcStripUnsafeChars(text) et isSafePreviewUrl(url, base) exportés par ./safe-text (points d'entrée principal).

describe('CA-T16 lcStripUnsafeChars', () => {
  it('retire contrôles C0/C1, marqueurs bidi et invisibles', () => {
    expect(lcStripUnsafeChars('A\u0000B‮C‏D\u0007E⁦F⁩G؜H\u0085I﻿J​K')).toBe('ABCDEFGHIJK');
  });
  it('garde le texte normal : accents, arabe, emoji, espaces', () => {
    for (const s of ['Élodie Dupont', 'محمد علي', '😀 Zoé', 'Jean-Pierre  Martin']) expect(lcStripUnsafeChars(s)).toBe(s);
  });
});

describe('CA-T6 isSafePreviewUrl', () => {
  const base = 'https://app.test/page';
  it.each(['blob:https://app.test/0b1c', 'data:image/png;base64,AAAA', 'https://app.test/a.png', '/a.png', 'a.png'])('admet %s', (u) => {
    expect(isSafePreviewUrl(u, base)).toBe(true);
  });
  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,<b>x</b>', 'https://other.test/a.png', 'http://app.test/a.png', 'vbscript:x', 'file:///etc/passwd', '//other.test/a.png'])('refuse %s', (u) => {
    expect(isSafePreviewUrl(u, base)).toBe(false);
  });
});
