import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcIconComponent } from './icon.component';
import { LC_DEFAULT_ICONS } from './default-icons';
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
  describe('jeu par défaut', () => {
    it('rend une icône du jeu par défaut, décorative sans libellé', async () => {
      const fixture = TestBed.createComponent(IconHostComponent);
      await fixture.whenStable();
      const icon = (fixture.nativeElement as HTMLElement).querySelector('lc-icon')!;
      expect(icon.querySelector('svg path')).not.toBeNull();
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.getAttribute('role')).toBeNull();
      expect(icon.classList).toContain('lc-icon--large');
    });

    it.each(['user', 'users', 'user-plus', 'user-pen', 'log-in', 'log-out', 'lock', 'lock-open', 'key-round', 'shield-check'])(
      'fournit l\'icône de profil « %s » dans le jeu par défaut',
      (name) => {
        expect(LC_DEFAULT_ICONS[name]).toMatch(/^<svg [^>]*viewBox="0 0 24 24"[^>]*>.+<\/svg>$/);
      },
    );

    it.each(['play', 'square', 'circle-dashed', 'clock'])('CA-11 : lc-icon résout l\'icône d\'état « %s »', async (name) => {
      const fixture = TestBed.createComponent(IconHostComponent);
      fixture.componentInstance.name.set(name);
      await fixture.whenStable();
      const icon = (fixture.nativeElement as HTMLElement).querySelector('lc-icon')!;
      expect(LC_DEFAULT_ICONS[name]).toMatch(/^<svg [^>]*viewBox="0 0 24 24"[^>]*>.+<\/svg>$/);
      expect(icon.querySelector('svg')).not.toBeNull();
    });
  });

  describe('accessibilité', () => {
    it('porte role="img" et aria-label avec un libellé', async () => {
      const fixture = TestBed.createComponent(IconHostComponent);
      fixture.componentInstance.label.set('Validé');
      await fixture.whenStable();
      const icon = (fixture.nativeElement as HTMLElement).querySelector('lc-icon')!;
      expect(icon.getAttribute('role')).toBe('img');
      expect(icon.getAttribute('aria-label')).toBe('Validé');
      expect(icon.getAttribute('aria-hidden')).toBeNull();
    });
  });

  describe('enregistrement et noms inconnus', () => {
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

  describe('icônes du jeu par défaut', () => {
    it('fournit l\'icône « scale » (balance, menu du module Acheter ou louer)', async () => {
      const fixture = TestBed.createComponent(IconHostComponent);
      fixture.componentInstance.name.set('scale');
      await fixture.whenStable();
      expect(LC_DEFAULT_ICONS['scale']).toContain('<svg');
      expect((fixture.nativeElement as HTMLElement).querySelector('lc-icon svg')).not.toBeNull();
    });
    // CA-K9.1
    it.each(['git-branch', 'git-commit-horizontal', 'activity', 'refresh-cw'])(
      'CA-K9.1 : « %s » rend un SVG via <lc-icon>, sans avertissement, avec le style des autres icônes',
      async (name) => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const fixture = TestBed.createComponent(IconHostComponent);
        fixture.componentInstance.name.set(name);
        await fixture.whenStable();
        const icon = (fixture.nativeElement as HTMLElement).querySelector('lc-icon')!;
        const svg = icon.querySelector('svg')!;
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
        expect(svg.getAttribute('stroke')).toBe('currentColor');
        expect(svg.getAttribute('stroke-width')).toBe(LC_DEFAULT_ICONS['check'].match(/stroke-width="([^"]+)"/)![1]);
        expect(svg.querySelectorAll('path, circle, line, polyline, rect').length).toBeGreaterThan(0);
        expect(icon.getAttribute('aria-hidden')).toBe('true');
        expect(warn).not.toHaveBeenCalled();
        warn.mockRestore();
      },
    );

    it('CA-K9.1 : les icônes des rôles de statut (activity, minus, circle-x, triangle-alert...) existent toutes dans le jeu par défaut', () => {
      for (const name of ['circle-check', 'circle-x', 'triangle-alert', 'activity', 'info', 'minus', 'copy', 'check', 'chevron-left', 'chevron-right', 'chevron-down']) {
        expect(LC_DEFAULT_ICONS[name], name).toMatch(/^<svg /);
      }
    });
  });
  });
