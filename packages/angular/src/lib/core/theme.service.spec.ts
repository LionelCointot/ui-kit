import { TestBed } from '@angular/core/testing';
import type { LcThemeDefinition } from '@lionelcointot/ui-tokens/theme';
import { LcThemeService } from './theme.service';

const teal: LcThemeDefinition = { name: 'teal', extends: 'default', overrides: { 'color.primary': '#0b5f5a' } };
const night: LcThemeDefinition = { name: 'night', extends: 'dark', overrides: { 'color.primary': '#5fcbc2' } };
const html = (): HTMLElement => document.documentElement;
const runtimeStyle = (): HTMLStyleElement | null => document.querySelector<HTMLStyleElement>('style#lc-runtime-themes');

describe('LcThemeService', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    runtimeStyle()?.remove();
    html().removeAttribute('style');
    html().removeAttribute('data-theme');
  });

  function setup(): LcThemeService {
    const service = TestBed.inject(LcThemeService);
    TestBed.tick();
    return service;
  }

  describe('API existante', () => {
    it('applique data-theme et color-scheme selon le choix', () => {
      const service = setup();
      service.setChoice('dark');
      TestBed.tick();
      expect(html().getAttribute('data-theme')).toBe('dark');
      expect(html().style.colorScheme).toBe('dark');
      expect(localStorage.getItem('lc-theme-choice')).toBe('dark');
      service.setChoice('light');
      TestBed.tick();
      expect(html().getAttribute('data-theme')).toBe('default');
    });
  });

  describe('registerThemes et setCustomTheme', () => {
    it('génère une seule feuille de style avec les thèmes valides', () => {
      const service = setup();
      service.registerThemes([teal, night]);
      const sheets = document.querySelectorAll('style#lc-runtime-themes');
      expect(sheets.length).toBe(1);
      expect(sheets[0].textContent).toContain('[data-theme="teal"]');
      expect(sheets[0].textContent).toContain('[data-theme="night"]');
      expect(sheets[0].textContent).toContain('--lc-sys-color-primary: #0b5f5a;');
      service.registerThemes([teal]);
      expect(document.querySelectorAll('style#lc-runtime-themes').length).toBe(1);
      expect(runtimeStyle()?.textContent).not.toContain('night');
      service.registerThemes([]);
      expect(runtimeStyle()).toBeNull();
    });

    it('ignore et signale les thèmes invalides ou en double, sans rien écrire dans le DOM (critère 3)', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const service = setup();
      const hostile: LcThemeDefinition = { name: 'hostile', extends: 'default', overrides: { 'color.primary': 'red;}body{display:none' } };
      service.registerThemes([hostile, { ...teal, name: 'default' }, teal, teal]);
      expect(runtimeStyle()?.textContent).toContain('[data-theme="teal"]');
      expect(runtimeStyle()?.textContent).not.toContain('hostile');
      expect(runtimeStyle()?.textContent).not.toContain('display:none');
      expect(warn).toHaveBeenCalledTimes(3);
    });

    it('active un thème : data-theme et color-scheme de sa base, puis retour au choix (critère 4)', () => {
      const service = setup();
      service.setChoice('light');
      service.registerThemes([teal, night]);
      service.setCustomTheme('night');
      TestBed.tick();
      expect(service.customTheme()).toBe('night');
      expect(html().getAttribute('data-theme')).toBe('night');
      expect(html().style.colorScheme).toBe('dark');
      expect(service.resolvedScheme()).toBe('dark');
      service.setCustomTheme('teal');
      TestBed.tick();
      expect(html().getAttribute('data-theme')).toBe('teal');
      expect(html().style.colorScheme).toBe('light');
      service.setCustomTheme(null);
      TestBed.tick();
      expect(html().getAttribute('data-theme')).toBe('default');
      expect(service.customTheme()).toBeNull();
    });

    it('ne persiste rien et ignore un nom inconnu', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const service = setup();
      service.registerThemes([teal]);
      service.setCustomTheme('teal');
      service.setCustomTheme('inconnu');
      expect(service.customTheme()).toBe('teal');
      expect(localStorage.getItem('lc-theme-choice')).toBeNull();
    });

    it('désactive le thème actif quand il disparaît de la liste enregistrée', () => {
      const service = setup();
      service.registerThemes([teal]);
      service.setCustomTheme('teal');
      service.registerThemes([night]);
      expect(service.customTheme()).toBeNull();
    });
  });

  describe('preview', () => {
    function frames(): { flush: () => void; spy: ReturnType<typeof vi.fn> } {
      const queue = new Map<number, FrameRequestCallback>();
      let id = 0;
      const spy = vi.fn((callback: FrameRequestCallback) => {
        queue.set(++id, callback);
        return id;
      });
      vi.stubGlobal('requestAnimationFrame', spy);
      vi.stubGlobal('cancelAnimationFrame', (handle: number) => queue.delete(handle));
      return {
        spy,
        flush: () => {
          const callbacks = [...queue.values()];
          queue.clear();
          callbacks.forEach((callback) => callback(0));
        },
      };
    }

    it('pose le thème de base et les surcharges en variables inline, regroupées par image', () => {
      const raf = frames();
      const service = setup();
      const setProperty = vi.spyOn(html().style, 'setProperty');
      service.preview(night);
      service.preview({ ...night, overrides: { 'color.primary': '#112233', 'radius.md': '12px' } });
      TestBed.tick();
      expect(setProperty).not.toHaveBeenCalled();
      expect(html().style.getPropertyValue('--lc-sys-color-primary')).toBe('');
      expect(html().getAttribute('data-theme')).toBe('dark');
      raf.flush();
      expect(html().style.getPropertyValue('--lc-sys-color-primary')).toBe('#112233');
      expect(html().style.getPropertyValue('--lc-sys-radius-md')).toBe('12px');
      expect(setProperty).toHaveBeenCalledTimes(2);
      service.preview({ ...night, overrides: { 'radius.md': '4px' } });
      raf.flush();
      expect(html().style.getPropertyValue('--lc-sys-color-primary')).toBe('');
      expect(html().style.getPropertyValue('--lc-sys-radius-md')).toBe('4px');
    });

    it('preview(null) restaure l’état précédent et laisse <html> sans variable inline (critère 5)', () => {
      const raf = frames();
      const service = setup();
      service.setChoice('light');
      service.preview(night);
      raf.flush();
      service.preview(null);
      TestBed.tick();
      expect(html().getAttribute('style') ?? '').not.toContain('--lc-sys');
      expect(html().style.length === 0 || html().style.colorScheme !== '').toBe(true);
      expect(html().getAttribute('data-theme')).toBe('default');
      service.preview(teal);
      service.preview(null);
      raf.flush();
      expect(html().getAttribute('style') ?? '').not.toContain('--lc-sys');
    });

    it('l’emporte sur un thème personnalisé actif, qui revient avec preview(null)', () => {
      const raf = frames();
      const service = setup();
      service.registerThemes([teal]);
      service.setCustomTheme('teal');
      service.preview(night);
      raf.flush();
      TestBed.tick();
      expect(html().getAttribute('data-theme')).toBe('dark');
      expect(service.resolvedScheme()).toBe('dark');
      service.preview(null);
      TestBed.tick();
      expect(html().getAttribute('data-theme')).toBe('teal');
      expect(service.customTheme()).toBe('teal');
    });

    it('refuse une prévisualisation invalide sans toucher au DOM', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const raf = frames();
      const service = setup();
      service.preview({ ...teal, overrides: { 'color.primary': 'red;}body{display:none' } });
      raf.flush();
      expect(warn).toHaveBeenCalled();
      expect(html().getAttribute('style') ?? '').not.toContain('display:none');
      expect(html().getAttribute('style') ?? '').not.toContain('--lc-sys');
    });

    it('applique tout de suite sans requestAnimationFrame', () => {
      vi.stubGlobal('requestAnimationFrame', undefined);
      const service = setup();
      service.preview(teal);
      expect(html().style.getPropertyValue('--lc-sys-color-primary')).toBe('#0b5f5a');
      service.preview(null);
      expect(html().style.getPropertyValue('--lc-sys-color-primary')).toBe('');
    });
  });

  describe('revision', () => {
    it('est incrémentée à chaque changement de thème', () => {
      const service = setup();
      const start = service.revision();
      service.setChoice('dark');
      expect(service.revision()).toBeGreaterThan(start);
      const afterChoice = service.revision();
      service.registerThemes([teal]);
      service.setCustomTheme('teal');
      expect(service.revision()).toBeGreaterThan(afterChoice + 1);
      const afterCustom = service.revision();
      service.preview(night);
      expect(service.revision()).toBeGreaterThan(afterCustom);
    });
  });
});
