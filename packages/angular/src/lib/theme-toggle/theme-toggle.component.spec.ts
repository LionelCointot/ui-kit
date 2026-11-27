import { TestBed } from '@angular/core/testing';
import { LC_LABELS } from '../core/labels';
import { LcThemeService } from '../core/theme.service';
import { LcThemeToggleComponent } from './theme-toggle.component';

describe('LcThemeToggleComponent', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('style');
  });

  async function setup() {
    const fixture = TestBed.createComponent(LcThemeToggleComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const buttons = () => element.querySelectorAll('button');
    const button = () => element.querySelector('button') as HTMLButtonElement;
    const icon = () => element.querySelector('lc-icon')?.getAttribute('ng-reflect-name') ?? element.querySelector('lc-icon svg')?.innerHTML ?? '';
    return { fixture, buttons, button, icon, service: TestBed.inject(LcThemeService), t: TestBed.inject(LC_LABELS).themeToggle };
  }

  it('est un seul bouton, sans aria-pressed', async () => {
    const { buttons, button } = await setup();
    expect(buttons().length).toBe(1);
    expect(button().hasAttribute('aria-pressed')).toBe(false);
  });

  it('nomme l’état courant et l’action, aussi en title (système par défaut)', async () => {
    const { button, t } = await setup();
    const expected = t.name(t.system, t.light);
    expect(expected).toBe('Thème : système. Passer au thème clair.');
    expect(button().getAttribute('aria-label')).toBe(expected);
    expect(button().title).toBe(expected);
  });

  it('un clic fait tourner clair, sombre, système, clair', async () => {
    const { fixture, button, service, t } = await setup();
    const seen: string[] = [];
    for (let i = 0; i < 4; i++) {
      button().click();
      await fixture.whenStable();
      seen.push(service.choice());
    }
    expect(seen).toEqual(['light', 'dark', 'auto', 'light']);
    expect(button().getAttribute('aria-label')).toBe(t.name(t.light, t.dark));
  });

  it('montre une icône différente par choix', async () => {
    const { fixture, icon, service } = await setup();
    const svgs = new Set<string>();
    for (const choice of ['light', 'dark', 'auto'] as const) {
      service.setChoice(choice);
      await fixture.whenStable();
      svgs.add(icon());
    }
    expect(svgs.size).toBe(3);
  });

  it('suit un changement de choix fait ailleurs', async () => {
    const { fixture, button, service, t } = await setup();
    service.setChoice('dark');
    await fixture.whenStable();
    expect(button().getAttribute('aria-label')).toBe(t.name(t.dark, t.system));
  });

  describe('View Transitions', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      delete (document as { startViewTransition?: unknown }).startViewTransition;
    });

    it('sans l’API : bascule directe, data-theme à jour', async () => {
      const { fixture, button, service } = await setup();
      service.setChoice('light');
      await fixture.whenStable();
      button().click();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('sous mouvement réduit : aucun appel à startViewTransition', async () => {
      const start = vi.fn();
      (document as { startViewTransition?: unknown }).startViewTransition = start;
      vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
      const { button } = await setup();
      button().click();
      expect(start).not.toHaveBeenCalled();
    });

    it('avec l’API : un appel, thème posé dans le rappel, cercle animé dans ready, fondus retirés à la fin', async () => {
      const animate = vi.fn();
      (Element.prototype as { animate?: unknown }).animate = animate;
      vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
      let finish!: () => void;
      const finished = new Promise<void>((r) => (finish = r));
      const start = vi.fn((update: () => void) => {
        update();
        return { ready: Promise.resolve(), finished };
      });
      (document as { startViewTransition?: unknown }).startViewTransition = start;
      const { fixture, button, service } = await setup();
      service.setChoice('light');
      await fixture.whenStable();
      vi.spyOn(button(), 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, width: 20, height: 20 } as DOMRect);

      button().click();
      expect(start).toHaveBeenCalledTimes(1);
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(document.documentElement.hasAttribute('data-lc-theme-switch')).toBe(true);
      await Promise.resolve();
      const { clientWidth: w, clientHeight: h } = document.documentElement;
      const [keyframes, options] = animate.mock.calls[0];
      expect(keyframes).toEqual([{ clipPath: 'circle(0px at 20px 30px)' }, { clipPath: `circle(${Math.hypot(Math.max(20, w - 20), Math.max(30, h - 30))}px at 20px 30px)` }]);
      expect(options.pseudoElement).toBe('::view-transition-new(root)');
      finish();
      await finished;
      await Promise.resolve();
      expect(document.documentElement.hasAttribute('data-lc-theme-switch')).toBe(false);
    });
  });
});
