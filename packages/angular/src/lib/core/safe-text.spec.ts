import { isSafePreviewUrl, lcStripUnsafeChars } from './safe-text';

describe('lcStripUnsafeChars', () => {
  it('retire contrôles C0/C1, marqueurs bidi et invisibles, garde \\n et \\t', () => {
    expect(lcStripUnsafeChars('a\u0007b\u0085c\u007Fd')).toBe('abcd');
    expect(lcStripUnsafeChars('x‮y​z⁦﻿؜')).toBe('xyz');
    expect(lcStripUnsafeChars('l1\nl2\tc\r\n')).toBe('l1\nl2\tc\n');
  });
  it('garde accents, emoji et HTML tels quels', () => {
    expect(lcStripUnsafeChars('<b>é 👍</b>')).toBe('<b>é 👍</b>');
  });
});

describe('isSafePreviewUrl', () => {
  it('base facultative : blob et data:image acceptés, schémas exécutables refusés', () => {
    expect(isSafePreviewUrl('blob:abc')).toBe(true);
    expect(isSafePreviewUrl('javascript:alert(1)')).toBe(false);
    expect(isSafePreviewUrl('data:text/html,x')).toBe(false);
  });
  it('même origine seulement', () => {
    expect(isSafePreviewUrl('/a.png', 'https://x.test/')).toBe(true);
    expect(isSafePreviewUrl('https://evil.test/a.png', 'https://x.test/')).toBe(false);
  });
});
