import { TestBed } from '@angular/core/testing';
import { LC_DATE_PICKER, resolveDatePickerMode } from './date-picker-mode';

const doc = (matchMedia: unknown) => ({ defaultView: { matchMedia } }) as unknown as Document;

describe('resolveDatePickerMode', () => {
  it('auto : pointeur précis qui survole donne le calendrier, et la requête est lue une fois', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    expect(resolveDatePickerMode('auto', doc(matchMedia))).toBe('calendar');
    expect(matchMedia).toHaveBeenCalledExactlyOnceWith('(pointer: fine) and (hover: hover)');
  });

  it('auto : requête fausse, matchMedia absent, vue absente ou qui lève donnent le natif', () => {
    expect(
      resolveDatePickerMode(
        'auto',
        doc(() => ({ matches: false })),
      ),
    ).toBe('native');
    expect(resolveDatePickerMode('auto', doc(undefined))).toBe('native');
    expect(resolveDatePickerMode('auto', { defaultView: null } as unknown as Document)).toBe(
      'native',
    );
    expect(
      resolveDatePickerMode(
        'auto',
        doc(() => {
          throw new Error('indisponible');
        }),
      ),
    ).toBe('native');
  });

  it('modes forcés : matchMedia n’est pas lu', () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    expect(resolveDatePickerMode('native', doc(matchMedia))).toBe('native');
    expect(
      resolveDatePickerMode(
        'calendar',
        doc(() => ({ matches: false })),
      ),
    ).toBe('calendar');
    expect(matchMedia).not.toHaveBeenCalled();
  });

  it('le jeton vaut auto par défaut', () => {
    expect(TestBed.inject(LC_DATE_PICKER)).toBe('auto');
  });
});
