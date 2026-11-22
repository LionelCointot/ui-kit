import { LC_LABELS_EN, LC_LABELS_FR } from './labels';

describe('libellés du fil d\'étapes', () => {
  it('stepOf et stepBack en français', () => {
    expect(LC_LABELS_FR.stepOf(2, 5)).toBe('Étape 2 sur 5');
    expect(LC_LABELS_FR.stepBack('Revenu')).toBe('Revenir à : Revenu');
  });

  it('stepOf et stepBack en anglais', () => {
    expect(LC_LABELS_EN.stepOf(2, 5)).toBe('Step 2 of 5');
    expect(LC_LABELS_EN.stepBack('Income')).toBe('Back to: Income');
  });
});

describe('libellés du fil d\'étapes v2 (CA-11, CA-14)', () => {
  it('stepGoTo, stepInvalid, stepOptionalHidden et stepOptional en français', () => {
    expect(LC_LABELS_FR.stepGoTo(2, 'Revenu')).toBe("Aller à l'étape 2 : Revenu");
    expect(LC_LABELS_FR.stepInvalid).toBe('(à corriger)');
    expect(LC_LABELS_FR.stepOptionalHidden).toBe('(facultative)');
    expect(LC_LABELS_FR.stepOptional).toBe('Facultative');
  });

  it('stepGoTo, stepInvalid, stepOptionalHidden et stepOptional en anglais', () => {
    expect(LC_LABELS_EN.stepGoTo(2, 'Income')).toBe('Go to step 2: Income');
    expect(LC_LABELS_EN.stepInvalid).toBe('(to fix)');
    expect(LC_LABELS_EN.stepOptionalHidden).toBe('(optional)');
    expect(LC_LABELS_EN.stepOptional).toBe('Optional');
  });
});

describe('libellés du fil de messages', () => {
  it('français et anglais', () => {
    expect([LC_LABELS_FR.threadLabel, LC_LABELS_FR.threadToday, LC_LABELS_FR.threadYesterday]).toEqual(['Échanges', 'Aujourd\'hui', 'Hier']);
    expect(LC_LABELS_FR.threadAttachmentOpen('a.png')).toBe('Ouvrir la pièce jointe : a.png');
    expect([LC_LABELS_EN.threadLabel, LC_LABELS_EN.threadToday, LC_LABELS_EN.threadYesterday]).toEqual(['Messages', 'Today', 'Yesterday']);
    expect(LC_LABELS_EN.threadAttachmentOpen('a.png')).toBe('Open attachment: a.png');
  });
});
