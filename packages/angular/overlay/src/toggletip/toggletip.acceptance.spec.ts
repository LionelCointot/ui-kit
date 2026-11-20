import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LcToggletipComponent, LcToggletipDirective } from '../public-api';

@Component({
  imports: [LcToggletipDirective, LcToggletipComponent],
  template: `
    <button id="out" type="button">hors</button>
    @if (show()) {
      <button id="b1" type="button" [lcToggletip]="d1">1</button>
    }
    <lc-toggletip #d1>Détail un <a id="lnk" href="#x">lien</a></lc-toggletip>
    <button id="b2" type="button" [lcToggletip]="d2">2</button>
    <lc-toggletip #d2>Détail deux</lc-toggletip>
  `,
})
class HostComponent {
  show = signal(true);
}

describe('lc-toggletip, acceptation K2', () => {
  let fixture: ComponentFixture<HostComponent>;
  const q = <T extends HTMLElement>(s: string) => (fixture.nativeElement as HTMLElement).querySelector<T>(s)!;
  const bubble = (b: HTMLElement) => {
    const id = b.getAttribute('aria-controls');
    return id ? document.getElementById(id) : null;
  };
  const settle = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const click = async (el: HTMLElement) => {
    el.click();
    await settle();
  };
  const isOpen = (b: HTMLElement) => b.getAttribute('aria-expanded') === 'true' && !!bubble(b);

  beforeEach(async () => {
    fixture = TestBed.createComponent(HostComponent);
    await settle();
  });
  afterEach(() => document.querySelector('.cdk-overlay-container')?.replaceChildren());

  it('CA-K2-1 ouvre au click, jamais au survol seul, ferme au second click', async () => {
    const b = q('#b1');
    b.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    b.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    await settle();
    expect(isOpen(b)).toBe(false);
    await click(b);
    expect(isOpen(b)).toBe(true);
    expect(bubble(b)!.textContent).toContain('Détail un');
    await click(b);
    expect(isOpen(b)).toBe(false);
  });

  it('CA-K2-1 Échap ferme et le focus reste sur le bouton', async () => {
    const b = q('#b1');
    b.focus();
    await click(b);
    expect(isOpen(b)).toBe(true);
    b.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await settle();
    expect(isOpen(b)).toBe(false);
    expect(document.activeElement).toBe(b);
  });

  it('CA-K2-1 un click hors du bouton et de la bulle ferme ; un click dans la bulle ne ferme pas', async () => {
    const b = q('#b1');
    await click(b);
    bubble(b)!.click();
    await settle();
    expect(isOpen(b)).toBe(true);
    await click(q('#out'));
    expect(isOpen(b)).toBe(false);
  });

  it('CA-K2-1 le focus qui sort du bouton et de la bulle ferme ; vers un lien de la bulle, non', async () => {
    const b = q('#b1');
    await click(b);
    const link = bubble(b)!.querySelector<HTMLElement>('#lnk')!;
    b.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: link }));
    await settle();
    expect(isOpen(b)).toBe(true);
    link.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: q('#out') }));
    await settle();
    expect(isOpen(b)).toBe(false);
  });

  it('CA-K2-2 ouvrir la seconde ferme la première', async () => {
    const [b1, b2] = [q('#b1'), q('#b2')];
    await click(b1);
    expect(isOpen(b1)).toBe(true);
    await click(b2);
    expect(isOpen(b2)).toBe(true);
    expect(b1.getAttribute('aria-expanded')).not.toBe('true');
    expect(document.querySelector('.cdk-overlay-container')!.textContent).not.toContain('Détail un');
    expect(document.querySelector('.cdk-overlay-container')!.textContent).toContain('Détail deux');
  });

  it('CA-K2-2 aria-controls vise un id existant ; région status : aucune bulle fermée (écart K2), remplie après ouverture', async () => {
    const b = q('#b1');
    expect(b.getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[role="status"]')).toBeNull();
    await click(b);
    const id = b.getAttribute('aria-controls')!;
    expect(id).toBeTruthy();
    expect(document.getElementById(id)).not.toBeNull();
    const status = document.querySelector('[role="status"]')!;
    expect(status.textContent).toContain('Détail un');
    await click(b);
    expect(document.querySelector('[role="status"]')?.textContent?.trim() ?? '').toBe('');
  });

  it('CA-K2-2 retirer le bouton du DOM ferme la bulle', async () => {
    await click(q('#b1'));
    expect(document.querySelector('[role="status"]')).not.toBeNull();
    fixture.componentInstance.show.set(false);
    await settle();
    expect(document.querySelector('[role="status"]')?.textContent?.trim() ?? '').toBe('');
    expect(document.body.textContent).not.toContain('Détail un');
  });
});
