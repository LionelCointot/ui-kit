import {
  EMPTY_ZONES, MaskChange, Zone, Zones, clear, fromIso, maxDay, neighbor, parsePaste, render, settle, step, toIso,
  typeDigit, zoneAt, zoneOrder,
} from './date-mask';

const FR = zoneOrder('fr-FR');
const US = zoneOrder('en-US');
const LETTERS = { day: 'jj', month: 'mm', year: 'aaaa' };
const TODAY: Zones = { day: '19', month: '11', year: '2026' };

/** Frappe une suite de chiffres depuis une zone ; rend le dernier changement, et le texte affiché. */
function typed(digits: string, order: readonly Zone[] = FR, from: Zones = EMPTY_ZONES, zone: Zone = order[0]) {
  let state: MaskChange = { zones: from, zone };
  const clamps: unknown[] = [];
  for (const digit of digits) {
    state = typeDigit(state.zones, state.zone, digit, order);
    if (state.clamped) clamps.push(state.clamped);
  }
  return { ...state, clamps, text: render(state.zones, order, LETTERS).text };
}

describe('date-mask : ordre et affichage', () => {
  it('lit l’ordre des zones dans la locale', () => {
    expect(FR).toEqual(['day', 'month', 'year']);
    expect(US).toEqual(['month', 'day', 'year']);
  });

  it('zones vides : lettres des libellés ; positions de chaque zone', () => {
    const { text, ranges } = render(EMPTY_ZONES, FR, LETTERS);
    expect(text).toBe('jj/mm/aaaa');
    expect(ranges).toEqual({ day: [0, 2], month: [3, 5], year: [6, 10] });
    expect(render(EMPTY_ZONES, US, { day: 'dd', month: 'mm', year: 'yyyy' }).text).toBe('mm/dd/yyyy');
    expect(zoneAt(ranges, FR, 0)).toBe('day');
    expect(zoneAt(ranges, FR, 4)).toBe('month');
    expect(zoneAt(ranges, FR, 9)).toBe('year');
  });

  it('un chiffre de jour ou de mois en attente s’affiche « 0n »', () => {
    expect(typed('1').text).toBe('01/mm/aaaa');
  });

  it('toIso et fromIso', () => {
    expect(toIso(fromIso('2026-11-12'))).toBe('2026-11-12');
    expect(toIso({ day: '12', month: '', year: '' })).toBeNull();
    expect(fromIso('2026-02-31')).toEqual(EMPTY_ZONES);
    expect(fromIso('0050-06-15')).toEqual(EMPTY_ZONES);
    expect(fromIso(null)).toEqual(EMPTY_ZONES);
  });
});

describe('date-mask : frappe', () => {
  it('1, 2, 1, 1, 2, 0, 2, 6 donne 12/11/2026', () => {
    const result = typed('12112026');
    expect(result.text).toBe('12/11/2026');
    expect(toIso(result.zones)).toBe('2026-11-12');
  });

  it('passage automatique : jour 4 à 9, mois 2 à 9 ; 1 à 3 (jour) et 0 à 1 (mois) attendent', () => {
    expect(typed('5').zone).toBe('month');
    expect(typed('5').zones.day).toBe('05');
    expect(typed('3').zone).toBe('day');
    expect(typed('0').zone).toBe('day');
    expect(typed('13').zone).toBe('month');
    expect(typed('123').zone).toBe('year');
    expect(typed('123').zones.month).toBe('03');
    expect(typed('121').zone).toBe('month');
    expect(typed('1210').zone).toBe('year');
  });

  it('l’année s’arrête à quatre chiffres et reste dans sa zone', () => {
    const result = typed('1211202');
    expect(result.zone).toBe('year');
    expect(result.zones.year).toBe('202');
    const full = typed('12112026');
    expect(full.zone).toBe('year');
    expect(typeDigit(full.zones, 'year', '7', FR).zones.year).toBe('7');
  });

  it('chiffre fautif ignoré : jour 00, 32 à 39, mois 00 et 13 à 19, année 0000 ou commençant par 0', () => {
    expect(typed('00').zones.day).toBe('0');
    expect(typed('32').zones.day).toBe('03');
    expect(typed('39').zones.day).toBe('03');
    expect(typed('1200').zones.month).toBe('0');
    expect(typed('1213').zones.month).toBe('01');
    expect(typed('1219').zones.month).toBe('01');
    const year = typed('0', FR, { day: '12', month: '11', year: '' }, 'year');
    expect(year.zones.year).toBe('');
    expect(typed('0000', FR, { day: '12', month: '11', year: '' }, 'year').zones.year).toBe('');
    expect(typed('05', FR, { day: '12', month: '11', year: '' }, 'year').zones.year).toBe('5');
  });

  it('mois rempli : un jour trop grand est ignoré (février 2026, 2 puis 9 laisse 02)', () => {
    const base = { day: '', month: '02', year: '2026' };
    expect(typed('29', FR, base).zones.day).toBe('02');
    expect(typed('29', FR, base).text).toBe('02/02/2026');
    expect(typed('28', FR, base).zones.day).toBe('28');
    expect(typed('29', FR, { ...base, year: '2024' }).zones.day).toBe('29');
    expect(typed('31', FR, { day: '', month: '04', year: '2026' }).zones.day).toBe('03');
    expect(typed('29', FR, { day: '', month: '02', year: '' }).zones.day).toBe('29');
  });

  it('jour rempli avant le mois ou l’année : ramené au dernier jour du mois', () => {
    const feb = typed('3102');
    expect(feb.zones).toMatchObject({ day: '29', month: '02' });
    const final = typed('31022026');
    expect(final.text).toBe('28/02/2026');
    // Année encore inconnue : février garde 29 jours, puis l'année 2026 le ramène à 28.
    expect(final.clamps).toEqual([{ day: 29, month: 2 }, { day: 28, month: 2 }]);
    expect(typed('29022025').text).toBe('28/02/2025');
    expect(typed('29022024').text).toBe('29/02/2024');
    expect(typed('31042026').text).toBe('30/04/2026');
    expect(typed('29022025').clamps).toEqual([{ day: 28, month: 2 }]);
  });

  it('en en-US : mois d’abord, le jour se règle sur le mois déjà rempli', () => {
    expect(typed('022', US).zones).toMatchObject({ month: '02', day: '2' });
    expect(typed('02292026', US).text).toBe('02/28/2026');
    expect(typed('0229', US, { day: '', month: '', year: '2026' }).zones.day).toBe('02');
    expect(typed('11122026', US).text).toBe('11/12/2026');
  });

  it('un nouveau chiffre dans une zone complète la remplace', () => {
    expect(typeDigit(fromIso('2026-11-12'), 'day', '2', FR).zones.day).toBe('2');
  });
});

describe('date-mask : flèches, effacement, sortie de zone', () => {
  const nov = fromIso('2026-11-12');

  it('haut et bas : plus ou moins un, en boucle, sans toucher les autres zones', () => {
    expect(step(fromIso('2026-01-31'), 'day', 1, TODAY).zones.day).toBe('01');
    expect(step(fromIso('2026-01-01'), 'day', -1, TODAY).zones.day).toBe('31');
    expect(step(fromIso('2026-02-01'), 'day', -1, TODAY).zones.day).toBe('28');
    expect(step(fromIso('2026-12-05'), 'month', 1, TODAY).zones).toMatchObject({ month: '01', day: '05' });
    expect(step(fromIso('2026-01-05'), 'month', -1, TODAY).zones.month).toBe('12');
    expect(step(nov, 'year', 1, TODAY).zones.year).toBe('2027');
    expect(step(fromIso('1000-05-05'), 'year', -1, TODAY).zones.year).toBe('9999');
  });

  it('une zone vide part d’aujourd’hui', () => {
    expect(step(EMPTY_ZONES, 'day', 1, TODAY).zones.day).toBe('19');
    expect(step(EMPTY_ZONES, 'year', -1, TODAY).zones.year).toBe('2026');
  });

  it('flèche qui rend le jour impossible : ramené, avec annonce', () => {
    const change = step(fromIso('2024-02-29'), 'year', 1, TODAY);
    expect(toIso(change.zones)).toBe('2025-02-28');
    expect(change.clamped).toEqual({ day: 28, month: 2 });
    expect(toIso(step(fromIso('2026-01-31'), 'month', 1, TODAY).zones)).toBe('2026-02-28');
  });

  it('effacer vide la zone ; la valeur n’est plus complète', () => {
    const cleared = clear(nov, 'month');
    expect(cleared).toEqual({ day: '12', month: '', year: '2026' });
    expect(toIso(cleared)).toBeNull();
  });

  it('quitter une zone met en forme : « 5 » devient 05, un « 0 » seul disparaît', () => {
    expect(settle({ day: '1', month: '', year: '' }, 'day').day).toBe('01');
    expect(settle({ day: '0', month: '', year: '' }, 'day').day).toBe('');
    expect(settle(nov, 'day')).toBe(nov);
  });

  it('zone voisine, sans boucle', () => {
    expect(neighbor(FR, 'day', 1)).toBe('month');
    expect(neighbor(FR, 'year', 1)).toBe('year');
    expect(neighbor(FR, 'day', -1)).toBe('day');
    expect(neighbor(US, 'month', 1)).toBe('day');
  });

  it('maxDay : 31 sans mois, 29 en février sans année, selon l’année sinon', () => {
    expect(maxDay(EMPTY_ZONES)).toBe(31);
    expect(maxDay({ day: '', month: '02', year: '' })).toBe(29);
    expect(maxDay({ day: '', month: '02', year: '2026' })).toBe(28);
    expect(maxDay({ day: '', month: '04', year: '2026' })).toBe(30);
  });
});

describe('date-mask : texte collé', () => {
  const iso = (text: string, order = FR) => {
    const change = parsePaste(text, order);
    return change ? toIso(change.zones) : null;
  };

  it('formes acceptées', () => {
    for (const text of ['12/11/2026', '12.11.2026', '12-11-2026', '2026-11-12', ' 12/11/2026 '])
      expect(iso(text)).toBe('2026-11-12');
    expect(iso('1/2/2026')).toBe('2026-02-01');
    expect(iso('01/02/2026')).toBe('2026-02-01');
  });

  it('l’ordre de la locale décide : 11/12/2026 en en-US vaut le 12 novembre', () => {
    expect(iso('11/12/2026', US)).toBe('2026-11-12');
    expect(iso('2026-11-12', US)).toBe('2026-11-12');
  });

  it('jour impossible : ramené au dernier jour du mois, avec annonce', () => {
    const change = parsePaste('31/02/2026', FR)!;
    expect(toIso(change.zones)).toBe('2026-02-28');
    expect(change.clamped).toEqual({ day: 28, month: 2 });
    expect(iso('29/02/2025')).toBe('2025-02-28');
    expect(iso('29/02/2024')).toBe('2024-02-29');
  });

  it('illisible : null (année sur deux chiffres, mot, jour 0, mois 13, année commençant par 0)', () => {
    for (const text of ['12/11/26', 'demain', '00/11/2026', '12/13/2026', '12/11/0999', '12/11/0026', '2026-13-01', ''])
      expect(parsePaste(text, FR), text).toBeNull();
  });
});

describe('date-mask : zone jamais bloquée en attente', () => {
  it('février 2026 : 3 donne 03 et passe à l’année (le mois rempli est sauté)', () => {
    const base = { day: '', month: '02', year: '' };
    const result = typed('3', FR, base);
    expect(result.zones.day).toBe('03');
    expect(result.zone).toBe('year');
    expect(typed('32026', FR, base).text).toBe('03/02/2026');
  });

  it('mois de 30 jours : 3 attend, 0 donne 30 ; 1 est ignoré et la zone se complète en 03', () => {
    const base = { day: '', month: '04', year: '2026' };
    expect(typed('3', FR, base).zone).toBe('day');
    expect(typed('30', FR, base).zones.day).toBe('30');
    const impossible = typed('31', FR, base);
    expect(impossible.zones.day).toBe('03');
    expect(impossible.zone).toBe('month');
  });

  it('second chiffre impossible : la zone se complète, les chiffres d’après vont à la zone vide suivante', () => {
    expect(typed('312026', FR, { day: '', month: '04', year: '' }).text).toBe('03/04/2026');
    expect(typed('3126', FR, { day: '', month: '04', year: '' }).text).toBe('03/04/26');
    const month = typed('13', FR, { day: '12', month: '', year: '' }, 'month');
    expect(month.zones.month).toBe('01');
    expect(month.zone).toBe('year');
    expect(typed('29', FR, { day: '', month: '02', year: '2026' }).text).toBe('02/02/2026');
  });

  it('un 0 seul s’affiche « 0j » ou « 0m », sans valeur ; sans second chiffre la zone redevient vide', () => {
    expect(typed('0').text).toBe('0j/mm/aaaa');
    expect(typed('10').text).toBe('10/mm/aaaa');
    expect(typed('120').text).toBe('12/0m/aaaa');
    expect(typed('0', US).text).toBe('0m/jj/aaaa');
    expect(toIso({ day: '0', month: '11', year: '2026' })).toBeNull();
    expect(settle({ day: '0', month: '11', year: '2026' }, 'day').day).toBe('');
    expect(typed('00').text).toBe('0j/mm/aaaa');
  });

  it('un jour ou un mois en attente compte comme rempli pour la valeur ; un 0 seul non', () => {
    expect(toIso({ day: '2', month: '02', year: '2026' })).toBe('2026-02-02');
    expect(toIso({ day: '15', month: '1', year: '2026' })).toBe('2026-01-15');
    expect(toIso({ day: '0', month: '02', year: '2026' })).toBeNull();
    expect(toIso({ day: '15', month: '02', year: '202' })).toBeNull();
  });

  it('collage : jour au-dessus de 31 ou mois au-dessus de 12 est illisible, 31/04 est ramené', () => {
    expect(parsePaste('45/11/2026', FR)).toBeNull();
    expect(parsePaste('32/01/2026', FR)).toBeNull();
    expect(parsePaste('12/13/2026', FR)).toBeNull();
    expect(toIso(parsePaste('31/04/2026', FR)!.zones)).toBe('2026-04-30');
  });
});

