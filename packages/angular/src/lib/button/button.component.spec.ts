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
  });
