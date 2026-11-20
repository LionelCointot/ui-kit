import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcTooltipDirective } from './tooltip.directive';

@Component({ imports: [LcTooltipDirective], template: '<button id="b" lcTooltip="Dupliquer le scénario">Copier</button>' })
class TooltipHostComponent {}

describe('LcTooltipDirective', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.querySelector('.cdk-overlay-container')?.replaceChildren();
  });

  it('apparaît après 500 ms au focus, relié par aria-describedby, disparaît sur Échap', async () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(TooltipHostComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#b')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    vi.advanceTimersByTime(499);
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    const tip = document.querySelector('[role="tooltip"]')!;
    expect(tip.textContent).toContain('Dupliquer le scénario');
    expect(button.getAttribute('aria-describedby')).toBe(tip.id);
    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
    expect(button.getAttribute('aria-describedby')).toBeNull();
  });

  // Défaut trouvé par la QA de lc-data-table : le focus rendu à un entonnoir puis la destruction du tableau dans les 500 ms levaient NG0205.
  it('détruit avant la fin du délai : n\'ouvre rien et ne lève aucune erreur', () => {
    vi.useFakeTimers();
    const fixture = TestBed.createComponent(TooltipHostComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#b')!;
    button.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.destroy();
    expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    expect(document.querySelector('[role="tooltip"]')).toBeNull();
  });
  describe('survolable (WCAG 1.4.13)', () => {
    async function open() {
      vi.useFakeTimers();
      const fixture = TestBed.createComponent(TooltipHostComponent);
      fixture.detectChanges();
      const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#b')!;
      button.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(500);
      fixture.detectChanges();
      return { fixture, button, tip: document.querySelector<HTMLElement>('[role="tooltip"]')! };
    }

    it('la bulle reçoit le pointeur (pas de pointer-events: none)', async () => {
      const { tip } = await open();
      expect(getComputedStyle(tip).pointerEvents).not.toBe('none');
    });

    it('la sortie du déclencheur laisse un court délai de grâce, puis ferme', async () => {
      const { fixture, button } = await open();
      button.dispatchEvent(new MouseEvent('mouseleave'));
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    it('le pointeur passé sur la bulle la garde ouverte ; en sortir la ferme', async () => {
      const { fixture, button, tip } = await open();
      button.dispatchEvent(new MouseEvent('mouseleave'));
      tip.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(1000);
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
      expect(button.getAttribute('aria-describedby')).toBe(tip.id);
      tip.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(300);
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    it('revenir sur le déclencheur pendant le délai de grâce garde la bulle ouverte', async () => {
      const { fixture, button } = await open();
      button.dispatchEvent(new MouseEvent('mouseleave'));
      button.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(1000);
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    });

    it('sortie avant l\'affichage puis retour dans le délai de grâce : la bulle s\'affiche quand même', async () => {
      vi.useFakeTimers();
      const fixture = TestBed.createComponent(TooltipHostComponent);
      fixture.detectChanges();
      const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('#b')!;
      button.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(300);
      button.dispatchEvent(new MouseEvent('mouseleave'));
      vi.advanceTimersByTime(50);
      button.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(500);
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
    });

    it('Échap ferme une bulle ouverte au seul survol (focus ailleurs) ; l\'écoute est retirée ensuite', async () => {
      const { fixture } = await open();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });

    it('la destruction retire l\'écoute d\'Échap du document', async () => {
      const { fixture } = await open();
      const remove = vi.spyOn(document, 'removeEventListener');
      fixture.destroy();
      expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
    });

    it('Échap et la perte du focus ferment sans délai, même pointeur sur la bulle', async () => {
      const { fixture, button, tip } = await open();
      tip.dispatchEvent(new MouseEvent('mouseenter'));
      button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      fixture.detectChanges();
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });
  });
});
