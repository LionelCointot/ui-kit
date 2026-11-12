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
