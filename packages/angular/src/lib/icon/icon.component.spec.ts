/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

    it.each(['user', 'users', 'user-plus', 'user-pen', 'user-x', 'log-in', 'log-out', 'lock', 'lock-open', 'key-round', 'shield-check'])(
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

  describe('icônes de suivi de demandes (D1)', () => {
    // Noms de la spec §2 (D1), et jeu d'avant D1 (62 icônes) : listes écrites ici, pas lues dans le registre.
    const NEW_ICONS = [
      'bell', 'bell-off', 'inbox', 'message-square', 'send', 'history', 'building-2', 'layout-dashboard', 'arrow-right-left',
      'hourglass', 'timer', 'mail', 'image', 'image-plus', 'circle-help', 'sliders-horizontal', 'list', 'list-checks', 'file-text', 'wrench',
    ];
    const OLD_ICONS = [
      'check', 'x', 'chevron-down', 'chevron-up', 'chevron-left', 'chevron-right', 'plus', 'minus', 'pencil', 'copy', 'trash-2', 'save',
      'folder-open', 'download', 'upload', 'search', 'info', 'circle-check', 'circle-alert', 'triangle-alert', 'circle-x', 'menu',
      'ellipsis-vertical', 'settings', 'sun', 'moon', 'monitor', 'calendar', 'table', 'chart-line', 'eye', 'eye-off', 'external-link',
      'rotate-ccw', 'house', 'landmark', 'calculator', 'arrow-up', 'arrow-down', 'arrow-up-down', 'arrow-right', 'trending-up',
      'trending-down', 'user', 'users', 'user-plus', 'user-pen', 'log-in', 'log-out', 'lock', 'lock-open', 'key-round', 'shield-check',
      'scale', 'git-branch', 'git-commit-horizontal', 'activity', 'refresh-cw', 'play', 'square', 'circle-dashed', 'clock',
    ];
    /** Formes d'un SVG, sans espaces entre balises : compare le registre à la source Lucide indépendamment du générateur. */
    const shapes = (svg: string) =>
      /<svg[^>]*>([\s\S]*?)<\/svg>/.exec(svg)![1].replace(/\s*\n\s*/g, '').replace(/\s+\/>/g, '/>').trim();
    const lucide = (name: string) => readFileSync(resolve(process.cwd(), 'node_modules/lucide-static/icons', `${name}.svg`), 'utf8');

    it('compte 20 nouveaux noms et 62 anciens, sans doublon', () => {
      expect(new Set(NEW_ICONS).size).toBe(20);
      expect(new Set(OLD_ICONS).size).toBe(62);
      expect(OLD_ICONS.filter((name) => NEW_ICONS.includes(name))).toEqual([]);
    });

    it.each(NEW_ICONS)('CA-D1 : « %s » rend un SVG via <lc-icon>, sans avertissement, au style des autres icônes', async (name) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(IconHostComponent);
      fixture.componentInstance.name.set(name);
      await fixture.whenStable();
      const icon = (fixture.nativeElement as HTMLElement).querySelector('lc-icon')!;
      const svg = icon.querySelector('svg')!;
      expect(svg).not.toBeNull();
      expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
      expect(svg.getAttribute('stroke')).toBe('currentColor');
      expect(svg.getAttribute('stroke-width')).toBe('2');
      expect(svg.getAttribute('stroke-linecap')).toBe('round');
      expect(svg.getAttribute('stroke-linejoin')).toBe('round');
      expect(svg.getAttribute('fill')).toBe('none');
      expect(svg.querySelectorAll('path, circle, line, polyline, polygon, rect, ellipse').length).toBeGreaterThan(0);
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(warn).not.toHaveBeenCalled();
      warn.mockRestore();
    });

    it.each(NEW_ICONS)('CA-D1 : « %s » a les mêmes formes que la source lucide-static', (name) => {
      expect(shapes(LC_DEFAULT_ICONS[name])).toBe(shapes(lucide(name)));
    });

    it('« paperclip » est dans les icônes par défaut, formes de lucide-static', () => {
      expect(shapes(LC_DEFAULT_ICONS['paperclip'])).toBe(shapes(lucide('paperclip')));
    });

    it.each(OLD_ICONS)('CA-D1 : l\'icône existante « %s » est toujours là, inchangée par rapport à lucide-static', (name) => {
      expect(LC_DEFAULT_ICONS[name]).toBeDefined();
      expect(shapes(LC_DEFAULT_ICONS[name])).toBe(shapes(lucide(name)));
    });

    it('CA-D1 : aucune icône ajoutée ne contient de script ni de gestionnaire d\'événement', () => {
      for (const name of NEW_ICONS) {
        expect(LC_DEFAULT_ICONS[name], name).not.toMatch(/<script|\son[a-z]+=|javascript:/i);
      }
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
