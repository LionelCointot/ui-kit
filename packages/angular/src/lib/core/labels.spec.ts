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

describe('libellés du journal (lc-log-view)', () => {
  it('français', () => {
    expect(LC_LABELS_FR.logCopy).toBe('Copier le journal');
    expect(LC_LABELS_FR.logResume).toBe('Revenir en bas');
    expect(LC_LABELS_FR.logEmpty).toBe('Aucune sortie pour l\'instant.');
    expect(LC_LABELS_FR.logLevelError).toBe('err');
    expect(LC_LABELS_FR.logLevelInfo).toBe('info');
    expect(LC_LABELS_FR.logTruncated(1)).toBe('1 ligne plus ancienne masquée');
    expect(LC_LABELS_FR.logTruncated(12)).toBe('12 lignes plus anciennes masquées');
  });

  it('anglais', () => {
    expect(LC_LABELS_EN.logCopy).toBe('Copy the log');
    expect(LC_LABELS_EN.logResume).toBe('Back to bottom');
    expect(LC_LABELS_EN.logEmpty).toBe('No output yet.');
    expect(LC_LABELS_EN.logLevelError).toBe('err');
    expect(LC_LABELS_EN.logLevelInfo).toBe('info');
    expect(LC_LABELS_EN.logTruncated(1)).toBe('1 older line hidden');
    expect(LC_LABELS_EN.logTruncated(12)).toBe('12 older lines hidden');
  });
});
