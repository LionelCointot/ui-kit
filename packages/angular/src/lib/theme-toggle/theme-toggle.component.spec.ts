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
    const buttons = () => Array.from(element.querySelectorAll<HTMLButtonElement>('button'));
    return { fixture, element, buttons, service: TestBed.inject(LcThemeService), labels: TestBed.inject(LC_LABELS) };
  }

  it('offre trois choix nommés par LC_LABELS, dans un groupe nommé', async () => {
    const { element, buttons, labels } = await setup();
    expect(element.querySelector('lc-button-group')?.getAttribute('aria-label')).toBe(labels.themeToggle.group);
    expect(buttons().map((b) => b.getAttribute('aria-label'))).toEqual([labels.themeToggle.light, labels.themeToggle.dark, labels.themeToggle.system]);
    expect(buttons().map((b) => b.title)).toEqual(buttons().map((b) => b.getAttribute('aria-label')));
  });

  it('marque le choix courant par aria-pressed (système par défaut)', async () => {
    const { buttons } = await setup();
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'false', 'true']);
  });

  it('un clic appelle setChoice et déplace aria-pressed', async () => {
    const { fixture, buttons, service } = await setup();
    buttons()[1].click();
    await fixture.whenStable();
    expect(service.choice()).toBe('dark');
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false']);
    buttons()[0].click();
    await fixture.whenStable();
    expect(service.choice()).toBe('light');
  });

  it('suit un changement de choix fait ailleurs', async () => {
    const { fixture, buttons, service } = await setup();
    service.setChoice('light');
    await fixture.whenStable();
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('true');
  });
});
