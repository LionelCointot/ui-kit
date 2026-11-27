import type { LcNavEntry } from '@lionelcointot/ui-angular';
import { lcActiveTab, lcPrimaryEntries, lcTabbarTabs } from './tabbar-tabs';

const entry = (url: string, primary = true): LcNavEntry => ({ url, label: url, icon: undefined, primary });

describe('lcTabbarTabs', () => {
  it('garde les rubriques primary, dans l\'ordre, sans doublon d\'adresse', () => {
    const items = [entry('/a'), entry('/b', false), entry('/a'), entry('/c'), entry('', true)];
    expect(lcTabbarTabs(items).map((tab) => tab.url)).toEqual(['/a', '/c']);
  });

  it('au plus 4 onglets', () => {
    const items = ['/1', '/2', '/3', '/4', '/5', '/6'].map((url) => entry(url));
    expect(lcTabbarTabs(items)).toHaveLength(4);
    expect(lcPrimaryEntries(items)).toHaveLength(6);
  });

  it('aucune rubrique primary : aucun onglet', () => {
    expect(lcTabbarTabs([entry('/a', false)])).toEqual([]);
  });
});

describe('lcActiveTab', () => {
  const tabs = [entry('/'), entry('/credit'), entry('/credit/nouveau'), entry('/budget')];

  it('la racine ne correspond qu\'à elle-même', () => {
    expect(lcActiveTab(tabs, '/')).toBe(0);
    expect(lcActiveTab(tabs, '/autre')).toBe(-1);
  });

  it('une sous-page active l\'onglet parent ; le plus spécifique gagne', () => {
    expect(lcActiveTab(tabs, '/credit/42')).toBe(1);
    expect(lcActiveTab(tabs, '/credit/nouveau/etape')).toBe(2);
    expect(lcActiveTab(tabs, '/budget?x=1#y')).toBe(3);
  });

  it('un préfixe de segment n\'est pas un parent (/credits ≠ /credit)', () => {
    expect(lcActiveTab(tabs, '/credits')).toBe(-1);
  });

  it('page hors des onglets : -1 (« Plus » actif)', () => {
    expect(lcActiveTab(tabs, '/parametres')).toBe(-1);
  });
});
