import { TestBed } from '@angular/core/testing';
import { LcFormatService, isoToLocalDate, localDateToIso } from './format.service';
import { provideLcUiKit } from './provide-ui-kit';

const NNBSP = ' ';
const NBSP = ' ';

describe('LcFormatService', () => {
  let format: LcFormatService;

  beforeEach(() => {
    format = TestBed.inject(LcFormatService);
  });

  it('formate un montant en euros avec des espaces insécables', () => {
    expect(format.money(1159.92)).toBe(`1${NNBSP}159,92${NBSP}€`);
    expect(format.money(250000)).toBe(`250${NNBSP}000,00${NBSP}€`);
  });

  it('formate un montant sans décimales ou compact', () => {
    expect(format.money(250000, { decimals: 0 })).toBe(`250${NNBSP}000${NBSP}€`);
    expect(format.money(250000, { compact: true })).toBe(`250${NBSP}k${NBSP}€`);
  });

  it('garde une décimale compacte quand elle existe, sans zéro superflu', () => {
    expect(format.money(1250000, { compact: true })).toBe(`1,3${NBSP}M${NBSP}€`);
    expect(format.compactNumber(250000)).toBe(`250${NBSP}k`);
    expect(format.compactNumber(1250000)).toBe(`1,3${NBSP}M`);
  });

  it('affiche un tiret pour une valeur absente', () => {
    expect(format.money(null)).toBe('—');
    expect(format.percent(undefined)).toBe('—');
    expect(format.number(Number.NaN)).toBe('—');
    expect(format.date('')).toBe('—');
  });

  it('formate un pourcentage exprimé en points (3.5 → 3,50 %)', () => {
    // Espace insécable avant « % » (fine ou normale selon la version d'ICU).
    expect(format.percent(3.5)).toMatch(/^3,50[\u00a0\u202f]%$/);
    expect(format.percent(3.456, 3)).toMatch(/^3,456[\u00a0\u202f]%$/);
  });

  it('formate un nombre avec ou sans décimales fixes', () => {
    expect(format.number(250000)).toBe(`250${NNBSP}000`);
    expect(format.number(12, 2)).toBe('12,00');
    expect(format.number(1234.5)).toBe(`1${NNBSP}234,5`);
  });

  it('lit les dates ISO sans décalage de fuseau', () => {
    expect(format.date('2026-01-01')).toBe('01/01/2026');
    expect(format.date('2026-12-31', 'long')).toBe('31 décembre 2026');
    expect(format.date('2026-03-15', 'month')).toBe('mars 2026');
  });

  it('exprime une durée en mois en années et mois', () => {
    expect(format.months(240)).toBe('20 ans');
    expect(format.months(63)).toBe('5 ans et 3 mois');
    expect(format.months(12)).toBe('1 an');
    expect(format.months(7)).toBe('7 mois');
    expect(format.months(0)).toBe('0 mois');
  });

  it('formate selon un format nommé ou une fonction', () => {
    expect(format.format(1159.92, 'money')).toBe(`1${NNBSP}159,92${NBSP}€`);
    expect(format.format(42, 'integer')).toBe('42');
    expect(format.format('abc', 'text')).toBe('abc');
    expect(format.format(2, (value) => `x${String(value)}`)).toBe('x2');
    expect(format.format(null, 'money')).toBe('—');
  });

  it('respecte la locale et la devise configurées', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideLcUiKit({ locale: 'en-US', currency: 'USD' })] });
    const english = TestBed.inject(LcFormatService);
    expect(english.money(1159.92)).toBe('$1,159.92');
    expect(english.percent(3.5)).toBe('3.50%');
  });
});

describe('dates ISO', () => {
  it('convertit sans passer par UTC dans les deux sens', () => {
    const date = isoToLocalDate('2026-01-31');
    expect(date?.getDate()).toBe(31);
    expect(date?.getMonth()).toBe(0);
    expect(localDateToIso(date as Date)).toBe('2026-01-31');
  });

  it('renvoie null pour une chaîne non ISO', () => {
    expect(isoToLocalDate('31/01/2026')).toBeNull();
  });
});

describe('LcFormatService (parties de nombre)', () => {
  it('expose le séparateur décimal et le symbole de la devise', () => {
    const format = TestBed.inject(LcFormatService);
    expect(format.decimalSeparator).toBe(',');
    expect(format.currencySymbol).toBe('€');
  });
});
