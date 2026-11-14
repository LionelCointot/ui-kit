/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideLcUiKit } from '../core/provide-ui-kit';
import { LcThemeColor } from '../core/types';
import { LcIconComponent } from '../icon/icon.component';
import { LcButtonGroupComponent } from './button-group.component';
import { LcButtonComponent } from './button.component';

@Component({
  imports: [LcButtonComponent, LcIconComponent, LcButtonGroupComponent],
  template: `
    <lc-button-group ariaLabel="Actions" attached>
      <button lcButton id="save" [loading]="loading()" [themeColor]="color()" (click)="clicks.set(clicks() + 1)">
        <lc-icon name="save" /> Enregistrer
      </button>
      <button lcButton id="icon" iconOnly aria-label="Supprimer" fillMode="flat" size="small">
        <lc-icon name="trash-2" />
      </button>
    </lc-button-group>
    <a lcButton id="link" href="https://example.org" target="_blank" aria-disabled="true" (click)="linkClicks.set(linkClicks() + 1)">Lien</a>
  `,
})
class ButtonHostComponent {
  readonly loading = signal(false);
  readonly color = signal<LcThemeColor | undefined>(undefined);
  readonly clicks = signal(0);
  readonly linkClicks = signal(0);
}

@Component({
  imports: [LcButtonComponent],
  template: `<button lcButton themeColor="highlight" [fillMode]="fillMode()" [disabled]="disabled()">Relief</button>`,
})
class HighlightButtonHostComponent {
  readonly fillMode = signal<'solid' | 'outline' | 'flat'>('solid');
  readonly disabled = signal(false);
}

describe('LcButtonComponent', () => {
  async function setup() {
    const fixture = TestBed.createComponent(ButtonHostComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    return { fixture, element, save: element.querySelector<HTMLButtonElement>('#save')! };
  }

  describe('variantes', () => {
    it('applique les variantes par défaut (LC_DEFAULTS) puis les entrées', async () => {
      const { fixture, save } = await setup();
      expect(save.classList).toContain('lc-button');
      expect(save.classList).toContain('lc-button--solid');
      expect(save.classList).toContain('lc-button--primary');
      expect(save.classList).toContain('lc-button--medium');
      fixture.componentInstance.color.set('error');
      await fixture.whenStable();
      expect(save.classList).toContain('lc-button--error');
      expect(save.classList).not.toContain('lc-button--primary');
    });

    // CA-K2.2
    it.each(['solid', 'outline', 'flat'] as const)('CA-K2.2 : themeColor="highlight" avec le remplissage « %s » (bouton natif, état désactivé conservé)', async (fillMode) => {
      const fixture = TestBed.createComponent(HighlightButtonHostComponent);
      fixture.componentInstance.fillMode.set(fillMode);
      await fixture.whenStable();
      const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
      expect(button.classList).toContain('lc-button--highlight');
      expect(button.classList).toContain(`lc-button--${fillMode}`);
      expect(button.classList).not.toContain('lc-button--primary');
      fixture.componentInstance.disabled.set(true);
      await fixture.whenStable();
      expect(button.disabled).toBe(true);
      expect(button.classList).toContain('lc-button--highlight');
    });

    it('suit les valeurs par défaut globales de provideLcUiKit', async () => {
      TestBed.configureTestingModule({ providers: [provideLcUiKit({ defaults: { fillMode: 'outline', size: 'large' } })] });
      const { save } = await setup();
      expect(save.classList).toContain('lc-button--outline');
      expect(save.classList).toContain('lc-button--large');
    });
  });

  describe('état et interactions', () => {
    it('en chargement : aria-busy et clics ignorés', async () => {
      const { fixture, save } = await setup();
      save.click();
      expect(fixture.componentInstance.clicks()).toBe(1);
      fixture.componentInstance.loading.set(true);
      await fixture.whenStable();
      expect(save.getAttribute('aria-busy')).toBe('true');
      expect(save.classList).toContain('lc-button--loading');
      save.click();
      expect(fixture.componentInstance.clicks()).toBe(1);
    });

    it('bloque le clic d\'un lien aria-disabled et sécurise target="_blank"', async () => {
      const { fixture, element } = await setup();
      const link = element.querySelector<HTMLAnchorElement>('#link')!;
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      link.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.linkClicks()).toBe(0);
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
    });
  });

  describe('accessibilité', () => {
    it('rend un groupe accessible et une icône décorative', async () => {
      const { element } = await setup();
      const group = element.querySelector('lc-button-group')!;
      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-label')).toBe('Actions');
      expect(group.classList).toContain('lc-button-group--attached');
      const icon = element.querySelector('#save lc-icon')!;
      expect(icon.getAttribute('aria-hidden')).toBe('true');
      expect(icon.querySelector('svg')).not.toBeNull();
      expect(element.querySelector('#icon')!.classList).toContain('lc-button--icon-only');
    });

    it('avertit en développement pour un bouton iconOnly sans nom accessible', async () => {
      @Component({ imports: [LcButtonComponent], template: '<button lcButton iconOnly>x</button>' })
      class UnnamedHostComponent {}
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const fixture = TestBed.createComponent(UnnamedHostComponent);
      await fixture.whenStable();
      expect(warn).toHaveBeenCalled();
      warn.mockRestore();
    });
  });

  describe('zone de frappe de 44 px (B4, lecture de la feuille : jsdom ne fait pas de mise en page)', () => {
    const css = () => readFileSync(resolve(process.cwd(), 'packages/angular/src/lib/button/button.component.css'), 'utf8');
    /** Bloc `{ … }` qui commence à `start`. */
    const blockAt = (source: string, start: number) => source.slice(start, source.indexOf('}', start) + 1);

    it(':host::before est posé sur l\'hôte lui-même, sans condition de taille (small, icône seule et moyen la reçoivent)', () => {
      const source = css();
      expect(source).toContain('\n:host::before {');
      expect(source).not.toMatch(/:host\(\.lc-button--(small|icon-only)[^)]*\)::before/);
      expect(source).toMatch(/:host\s*\{[^}]*position:\s*relative/);
      const rule = blockAt(source, source.indexOf('\n:host::before {') + 1);
      expect(rule).toContain("content: ''");
      expect(rule).toContain('position: absolute');
    });

    it('la zone fait 44 px par défaut, réglable par --lc-button-hit-size, dans les deux axes', () => {
      const source = css();
      const rule = blockAt(source, source.indexOf('\n:host::before {') + 1);
      expect(rule).toMatch(/inset-block:[^;]*var\(--lc-button-hit-size, 44px\)/);
      expect(rule).toMatch(/inset-inline:[^;]*var\(--lc-button-hit-size, 44px\)/);
    });

    it('un bouton déjà plus grand que la zone ne déborde pas (inset plafonné à 0)', () => {
      const rule = blockAt(css(), css().indexOf('\n:host::before {') + 1);
      expect(rule).toMatch(/inset-block:\s*min\(0px,/);
      expect(rule).toMatch(/inset-inline:\s*min\(0px,/);
    });

    it('chargement : l\'anneau ::after est inchangé (centré, taille de l\'icône, ::before non touché)', () => {
      const source = css();
      const rule = blockAt(source, source.indexOf('\n:host(.lc-button--loading)::after {') + 1);
      expect(rule).toContain("content: ''");
      expect(rule).toContain('position: absolute');
      expect(rule).toContain('inset: 0');
      expect(rule).toContain('width: var(--lc-icon-size)');
      expect(rule).toContain('animation: lc-button-spin');
      expect(source).not.toMatch(/--lc-button--loading\)::before/);
    });
  });
  });
