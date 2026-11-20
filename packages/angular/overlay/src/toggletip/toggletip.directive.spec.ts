import { FlexibleConnectedPositionStrategy, Overlay } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcToggletipComponent } from './toggletip.component';
import { LcToggletipDirective } from './toggletip.directive';

@Component({
  imports: [LcToggletipDirective, LcToggletipComponent],
  template: `
    <p id="outside">Ailleurs</p>
    @if (shown()) {
      <button id="a" type="button" [lcToggletip]="a" [lcToggletipPosition]="position()">A</button>
      <lc-toggletip #a>Détail A <a id="link" href="#x">Lien</a></lc-toggletip>
    }
    <button id="b" type="button" [lcToggletip]="b">B</button>
    <lc-toggletip #b>Détail B</lc-toggletip>`,
})
class HostComponent {
  readonly shown = signal(true);
  readonly position = signal<'below' | 'above' | 'start' | 'end'>('below');
}

const panels = () => Array.from(document.querySelectorAll<HTMLElement>('.cdk-overlay-container [role="status"]'));
const filledTexts = () => panels().map((p) => p.textContent?.trim()).filter(Boolean);

describe('LcToggletipDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  const el = <T extends HTMLElement>(selector: string) => (fixture.nativeElement as HTMLElement).querySelector<T>(selector)!;
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const click = async (target: HTMLElement) => {
    target.click();
    await settle();
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });
  afterEach(() => {
    fixture.destroy();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  describe('ouverture et fermeture (CA-K2-1)', () => {
    it('s\'ouvre au click et jamais au survol seul', async () => {
      el('#a').dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      el('#a').dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await settle();
      expect(panels()).toHaveLength(0);
      await click(el('#a'));
      expect(filledTexts()).toEqual(['Détail A Lien']);
    });

    it('se ferme au second click', async () => {
      await click(el('#a'));
      await click(el('#a'));
      expect(panels()).toHaveLength(0);
    });

    it('se ferme sur Échap et rend le focus au bouton', async () => {
      await click(el('#a'));
      document.querySelector<HTMLElement>('#link')!.focus();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      await settle();
      expect(panels()).toHaveLength(0);
      expect(document.activeElement).toBe(el('#a'));
    });

    it('se ferme au clic hors du bouton et de la bulle, pas au clic dans la bulle', async () => {
      await click(el('#a'));
      await click(document.querySelector<HTMLElement>('.lc-toggletip__box')!);
      expect(panels()).toHaveLength(1);
      await click(el('#outside'));
      expect(panels()).toHaveLength(0);
    });

    it('se ferme quand le focus sort du bouton et de la bulle, pas quand il passe du bouton à un lien de la bulle', async () => {
      await click(el('#a'));
      const link = document.querySelector<HTMLElement>('#link')!;
      el('#a').dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
      await settle();
      expect(panels()).toHaveLength(1);
      link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: el('#outside') }));
      await settle();
      expect(panels()).toHaveLength(0);
    });
  });

  describe('état et accessibilité (CA-K2-2)', () => {
    it('ouvrir la seconde bulle ferme la première', async () => {
      await click(el('#a'));
      await click(el('#b'));
      expect(filledTexts()).toEqual(['Détail B']);
    });

    it('aria-expanded suit l\'état et aria-controls vise la région role="status" ouverte', async () => {
      const a = el('#a');
      expect(a.getAttribute('aria-expanded')).toBe('false');
      expect(a.hasAttribute('aria-controls')).toBe(false);
      await click(a);
      expect(a.getAttribute('aria-expanded')).toBe('true');
      expect(document.getElementById(a.getAttribute('aria-controls')!)).toBe(panels()[0]);
      await click(a);
      expect(a.getAttribute('aria-expanded')).toBe('false');
      expect(a.hasAttribute('aria-controls')).toBe(false);
    });

    it('ne pose jamais `--_arrow-offset` avec une valeur nulle (repli CSS 50 %)', async () => {
      await click(el('#a'));
      expect(document.querySelector<HTMLElement>('.lc-toggletip')!.getAttribute('style') ?? '').not.toContain('null');
    });

    it('aucune région remplie bulle fermée ; contenu présent à l\'ouverture, retiré à la fermeture', async () => {
      expect(filledTexts()).toEqual([]);
      await click(el('#a'));
      expect(panels()[0].textContent).toContain('Détail A');
      await click(el('#a'));
      expect(filledTexts()).toEqual([]);
    });

    it('retirer le bouton du DOM ferme la bulle', async () => {
      await click(el('#a'));
      fixture.componentInstance.shown.set(false);
      await settle();
      expect(panels()).toHaveLength(0);
    });
  });

  describe('positions (CA-K2-3, partie logique)', () => {
    const FALLBACK = { above: ['top', 'bottom', 'end', 'start'], below: ['bottom', 'top', 'end', 'start'], start: ['start', 'end', 'top', 'bottom'], end: ['end', 'start', 'top', 'bottom'] } as const;
    it.each(Object.keys(FALLBACK) as (keyof typeof FALLBACK)[])('« %s » : ordre de repli et poussée dans la fenêtre', async (requested) => {
      const create = vi.spyOn(TestBed.inject(Overlay), 'create');
      fixture.componentInstance.position.set(requested);
      await settle();
      await click(el('#a'));
      const config = create.mock.calls[0][0]!;
      const strategy = config.positionStrategy as FlexibleConnectedPositionStrategy;
      const axis = (p: { originX: string; originY: string }) => (p.originY === 'center' ? p.originX : p.originY);
      expect(strategy.positions.map(axis)).toEqual(FALLBACK[requested]);
      expect(strategy['_canPush']).toBe(true);
    });

    it('« below » est la position par défaut', async () => {
      const create = vi.spyOn(TestBed.inject(Overlay), 'create');
      await click(el('#b'));
      const strategy = create.mock.calls[0][0]!.positionStrategy as FlexibleConnectedPositionStrategy;
      expect(strategy.positions[0]).toMatchObject({ originY: 'bottom', overlayY: 'top' });
    });
  });

  it('avertit en développement si le déclencheur n\'est pas un button', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const other = TestBed.createComponent(NotAButtonComponent);
    other.detectChanges();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('<button>'));
    warn.mockRestore();
  });
});

@Component({ imports: [LcToggletipDirective, LcToggletipComponent], template: '<span [lcToggletip]="t">?</span><lc-toggletip #t>x</lc-toggletip>' })
class NotAButtonComponent {}
