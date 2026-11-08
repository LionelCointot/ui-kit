import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcIconComponent } from './icon.component';
import { provideLcIcons } from './icons';

@Component({
  imports: [LcIconComponent],
  template: '<lc-icon [name]="name()" [label]="label()" size="large" />',
})
class IconHostComponent {
  readonly name = signal('check');
  readonly label = signal<string | undefined>(undefined);
}

describe('LcIconComponent', () => {
  it('rend une icône du jeu par défaut, décorative sans libellé', async () => {
    const fixture = TestBed.createComponent(IconHostComponent);
    await fixture.whenStable();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('lc-icon')!;
    expect(icon.querySelector('svg path')).not.toBeNull();
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.getAttribute('role')).toBeNull();
    expect(icon.classList).toContain('lc-icon--large');
  });

  it('porte role="img" et aria-label avec un libellé', async () => {
    const fixture = TestBed.createComponent(IconHostComponent);
    fixture.componentInstance.label.set('Validé');
    await fixture.whenStable();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('lc-icon')!;
    expect(icon.getAttribute('role')).toBe('img');
    expect(icon.getAttribute('aria-label')).toBe('Validé');
    expect(icon.getAttribute('aria-hidden')).toBeNull();
  });

  it('utilise les icônes enregistrées par provideLcIcons (le dernier enregistrement l\'emporte)', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideLcIcons({ custom: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/></svg>' }),
        provideLcIcons({ check: '<svg viewBox="0 0 24 24"><rect width="4" height="4"/></svg>' }),
      ],
    });
    const fixture = TestBed.createComponent(IconHostComponent);
    await fixture.whenStable();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('lc-icon')!;
    expect(icon.querySelector('rect')).not.toBeNull();
    fixture.componentInstance.name.set('custom');
    await fixture.whenStable();
    expect(icon.querySelector('circle')).not.toBeNull();
  });

  it('ne rend rien et avertit pour un nom inconnu', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = TestBed.createComponent(IconHostComponent);
    fixture.componentInstance.name.set('inconnue');
    await fixture.whenStable();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('lc-icon')!;
    expect(icon.querySelector('svg')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
