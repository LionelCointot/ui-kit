import { TestBed } from '@angular/core/testing';
import { LcGeoDataSource, LcGeoRequestError } from './geo-data-source';
import { provideLcGeo } from './provide-lc-geo';

type FetchCall = { url: URL; init: RequestInit };

/** Faux `fetch` : aucun appel réseau dans les tests. */
function stubFetch(handler: (url: URL, init: RequestInit) => Response | Promise<Response>): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  vi.stubGlobal('fetch', async (input: string, init: RequestInit) => {
    const url = new URL(input);
    calls.push({ url, init });
    return handler(url, init);
  });
  return { calls };
}

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, ...init });
const signal = () => new AbortController().signal;

const DEPARTMENTS_BODY = [
  { code: '21', nom: 'Côte-d\'Or', codeRegion: '27' },
  { code: '2B', nom: 'Haute-Corse', codeRegion: '94' },
  { code: '974', nom: 'La Réunion', codeRegion: '04' },
  { code: '19', nom: 'Corrèze', codeRegion: '75' },
  { code: '2A', nom: 'Corse-du-Sud', codeRegion: '94' },
  { code: '01', nom: 'Ain', codeRegion: '84' },
];

describe('LcGouvGeoDataSource', () => {
  function create(options?: Parameters<typeof provideLcGeo>[0]): LcGeoDataSource {
    TestBed.configureTestingModule({ providers: [provideLcGeo(options)] });
    return TestBed.inject(LcGeoDataSource);
  }

  afterEach(() => vi.unstubAllGlobals());

  describe('régions et départements', () => {
    it('demande la liste complète à l\'API officielle, sans cookie ni referer, sans aucun texte saisi', async () => {
      const { calls } = stubFetch(() => json(DEPARTMENTS_BODY));
      await create().departments(signal());
      expect(calls).toHaveLength(1);
      expect(calls[0].url.origin + calls[0].url.pathname).toBe('https://geo.api.gouv.fr/departements');
      expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({ fields: 'nom,code,codeRegion' });
      expect(calls[0].init.credentials).toBe('omit');
      expect(calls[0].init.referrerPolicy).toBe('no-referrer');
    });

    it('trie par code : 2A et 2B entre 19 et 21', async () => {
      stubFetch(() => json(DEPARTMENTS_BODY));
      const departments = await create().departments(signal());
      expect(departments.map((d) => d.code)).toEqual(['01', '19', '2A', '2B', '21', '974']);
      expect(departments[2]).toEqual({ code: '2A', name: 'Corse-du-Sud', regionCode: '94' });
    });

    it('une seule requête par session pour plusieurs appelants', async () => {
      const { calls } = stubFetch(() => json(DEPARTMENTS_BODY));
      const source = create();
      await Promise.all([source.departments(signal()), source.departments(signal()), source.departments(signal())]);
      await source.departments(signal());
      expect(calls).toHaveLength(1);
    });

    it('les régions viennent de /regions', async () => {
      const { calls } = stubFetch(() => json([{ code: '84', nom: 'Auvergne-Rhône-Alpes' }, { code: '11', nom: 'Île-de-France' }]));
      const regions = await create().regions(signal());
      expect(calls[0].url.pathname).toBe('/regions');
      expect(regions).toEqual([{ code: '11', name: 'Île-de-France' }, { code: '84', name: 'Auvergne-Rhône-Alpes' }]);
    });

    it('après un échec, la promesse est oubliée : le nouvel essai relance l\'appel', async () => {
      let fail = true;
      const { calls } = stubFetch(() => (fail ? new Response('', { status: 503 }) : json(DEPARTMENTS_BODY)));
      const source = create();
      await expect(source.departments(signal())).rejects.toMatchObject({ kind: 'http', status: 503 });
      fail = false;
      expect(await source.departments(signal())).toHaveLength(6);
      expect(calls).toHaveLength(2);
    });

    it('un signal annulé par un champ n\'annule pas le chargement partagé', async () => {
      let release: (response: Response) => void = () => undefined;
      let requestSignal: AbortSignal | undefined;
      const { calls } = stubFetch((_url, init) => {
        requestSignal = init.signal ?? undefined;
        return new Promise<Response>((resolve) => (release = resolve));
      });
      const source = create();
      const first = new AbortController();
      const cancelled = source.departments(first.signal);
      const other = source.departments(signal());
      first.abort();
      await expect(cancelled).rejects.toMatchObject({ name: 'AbortError' });
      expect(requestSignal?.aborted).toBe(false);
      release(json(DEPARTMENTS_BODY));
      expect(await other).toHaveLength(6);
      expect(calls).toHaveLength(1);
    });

    it('ignore les éléments incomplets', async () => {
      stubFetch(() => json([{ code: '69', nom: 'Rhône', codeRegion: '84' }, { code: '70' }, null, { nom: 'X', codeRegion: '1' }]));
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const departments = await create().departments(signal());
      expect(departments.map((d) => d.code)).toEqual(['69']);
      expect(warn).toHaveBeenCalled();
    });

    it('un corps qui n\'est pas une liste est invalide', async () => {
      stubFetch(() => json({ message: 'oups' }));
      await expect(create().departments(signal())).rejects.toMatchObject({ kind: 'invalid-response' });
    });

    it('un corps qui n\'est pas du JSON est invalide', async () => {
      stubFetch(() => new Response('<html>', { status: 200 }));
      await expect(create().regions(signal())).rejects.toMatchObject({ kind: 'invalid-response' });
    });

    it('HTTP 429 : rate-limited', async () => {
      stubFetch(() => new Response('', { status: 429 }));
      const error = await create().regions(signal()).catch((e: unknown) => e);
      expect(error).toBeInstanceOf(LcGeoRequestError);
      expect(error).toMatchObject({ kind: 'rate-limited', status: 429 });
    });

    it('réseau coupé : signale une erreur de type « network »', async () => {
      stubFetch(() => Promise.reject(new TypeError('Failed to fetch')));
      await expect(create().regions(signal())).rejects.toMatchObject({ kind: 'network' });
    });

    it('délai dépassé : signale une erreur de type « timeout »', async () => {
      stubFetch((_url, init) => new Promise<Response>((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      }));
      await expect(create({ timeoutMs: 20 }).regions(signal())).rejects.toMatchObject({ kind: 'timeout' });
    });

    it('l\'URL de base est configurable', async () => {
      const { calls } = stubFetch(() => json([]));
      await create({ geoApiBaseUrl: 'https://proxy.example/geo' }).regions(signal());
      expect(calls[0].url.href.startsWith('https://proxy.example/geo/regions?')).toBe(true);
    });
  });

  describe('communes', () => {
    const LYON = { nom: 'Lyon', code: '69123', codesPostaux: ['69001', '69002', '69003'], codeDepartement: '69', codeRegion: '84', population: 522250 };

    it('un code postal de 5 chiffres interroge par codePostal et renseigne postalCode', async () => {
      const { calls } = stubFetch(() => json([LYON]));
      const communes = await create().searchCommunes({ text: '69003' }, signal());
      expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({
        codePostal: '69003', fields: 'nom,code,codesPostaux,codeDepartement,codeRegion,population',
      });
      expect(communes).toEqual([{
        code: '69123', name: 'Lyon', postalCodes: ['69001', '69002', '69003'], postalCode: '69003',
        departmentCode: '69', regionCode: '84', population: 522250,
      }]);
    });

    it('un nom interroge par nom avec boost, limite et département', async () => {
      const { calls } = stubFetch(() => json([LYON]));
      const [commune] = await create().searchCommunes({ text: '  Lyon ', departmentCode: '69' }, signal());
      expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({
        nom: 'Lyon', fields: 'nom,code,codesPostaux,codeDepartement,codeRegion,population', boost: 'population', limit: '10', codeDepartement: '69',
      });
      expect(commune.postalCode).toBeNull();
    });

    it('construit l\'URL avec URLSearchParams (caractères spéciaux encodés) et tronque à 200 caractères', async () => {
      const { calls } = stubFetch(() => json([]));
      await create().searchCommunes({ text: `Saint-Étienne & Cie ${'x'.repeat(300)}` }, signal());
      expect(calls[0].url.searchParams.get('nom')).toHaveLength(200);
      expect(calls[0].url.href).toContain('Saint-%C3%89tienne+%26+Cie');
    });

    it('texte vide : aucun appel', async () => {
      const { calls } = stubFetch(() => json([]));
      expect(await create().searchCommunes({ text: '   ' }, signal())).toEqual([]);
      expect(calls).toHaveLength(0);
    });

    it('population absente : null ; commune incomplète ignorée', async () => {
      stubFetch(() => json([{ ...LYON, population: undefined }, { nom: 'Sans code' }]));
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const communes = await create().searchCommunes({ text: 'ly' }, signal());
      expect(communes).toHaveLength(1);
      expect(communes[0].population).toBeNull();
    });

    it('met en cache les recherches identiques (une seule requête)', async () => {
      const { calls } = stubFetch(() => json([LYON]));
      const source = create();
      await source.searchCommunes({ text: 'Lyon' }, signal());
      await source.searchCommunes({ text: 'lyon' }, signal());
      expect(calls).toHaveLength(1);
    });

    it('cache LRU de 50 entrées : la plus ancienne est évincée', async () => {
      const { calls } = stubFetch(() => json([LYON]));
      const source = create();
      for (let i = 0; i < 51; i++) await source.searchCommunes({ text: `ville${i}` }, signal());
      expect(calls).toHaveLength(51);
      await source.searchCommunes({ text: 'ville50' }, signal());
      expect(calls).toHaveLength(51);
      await source.searchCommunes({ text: 'ville0' }, signal());
      expect(calls).toHaveLength(52);
    });

    it('une recherche annulée n\'est pas mise en cache', async () => {
      const { calls } = stubFetch(() => json([LYON]));
      const source = create();
      const controller = new AbortController();
      const pending = source.searchCommunes({ text: 'Lyon' }, controller.signal);
      controller.abort();
      await expect(pending).rejects.toBeDefined();
      await source.searchCommunes({ text: 'Lyon' }, signal());
      expect(calls).toHaveLength(2);
    });
  });

  describe('adresses', () => {
    const FEATURE = {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [2.295695, 49.894171] },
      properties: {
        id: '80021_6590_00008', label: '8 Boulevard du Port 80000 Amiens', type: 'housenumber', housenumber: '8',
        name: '8 Boulevard du Port', street: 'Boulevard du Port', postcode: '80000', citycode: '80021', city: 'Amiens',
        context: '80, Somme, Hauts-de-France', score: 0.97,
      },
    };

    it('interroge l\'API Adresse de la Géoplateforme et convertit les coordonnées', async () => {
      const { calls } = stubFetch(() => json({ type: 'FeatureCollection', features: [FEATURE] }));
      const [address] = await create().searchAddresses({ text: '8 bd du port', postalCode: '80000', kind: 'housenumber' }, signal());
      expect(calls[0].url.origin + calls[0].url.pathname).toBe('https://data.geopf.fr/geocodage/search');
      expect(Object.fromEntries(calls[0].url.searchParams)).toEqual({
        q: '8 bd du port', autocomplete: '1', index: 'address', limit: '8', type: 'housenumber', postcode: '80000',
      });
      expect(address).toEqual({
        id: '80021_6590_00008', label: '8 Boulevard du Port 80000 Amiens', kind: 'housenumber', houseNumber: '8',
        street: 'Boulevard du Port', postalCode: '80000', cityCode: '80021', city: 'Amiens', departmentCode: '80',
        latitude: 49.894171, longitude: 2.295695, score: 0.97,
      });
    });

    it('moins de 3 caractères ou premier caractère non alphanumérique : aucun appel', async () => {
      const { calls } = stubFetch(() => json({ features: [] }));
      const source = create();
      expect(await source.searchAddresses({ text: '8 ' }, signal())).toEqual([]);
      expect(await source.searchAddresses({ text: '...' }, signal())).toEqual([]);
      expect(calls).toHaveLength(0);
    });

    it('une rue prend son nom dans `name` ; une adresse incomplète est ignorée', async () => {
      const street = { ...FEATURE, properties: { ...FEATURE.properties, type: 'street', housenumber: undefined, street: undefined, name: 'Boulevard du Port' } };
      const broken = { ...FEATURE, properties: { ...FEATURE.properties, id: undefined } };
      stubFetch(() => json({ features: [street, broken] }));
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const addresses = await create().searchAddresses({ text: 'boulevard du port' }, signal());
      expect(addresses).toHaveLength(1);
      expect(addresses[0]).toMatchObject({ kind: 'street', street: 'Boulevard du Port', houseNumber: null });
    });

    it('réponse sans features : invalid-response', async () => {
      stubFetch(() => json({ error: 'x' }));
      await expect(create().searchAddresses({ text: 'rue' }, signal())).rejects.toMatchObject({ kind: 'invalid-response' });
    });

    it('HTTP 429 : rate-limited', async () => {
      stubFetch(() => new Response('', { status: 429 }));
      await expect(create().searchAddresses({ text: 'rue' }, signal())).rejects.toMatchObject({ kind: 'rate-limited' });
    });
  });
});
