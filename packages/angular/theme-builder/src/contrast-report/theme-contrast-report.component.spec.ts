import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { resolveTheme } from '@lionelcointot/ui-tokens/theme';
import { LcThemeContrastReportComponent } from './theme-contrast-report.component';

describe('LcThemeContrastReportComponent', () => {
  async function setup(overrides: Record<string, string> = {}, base: 'default' | 'dark' = 'default') {
    const fixture = TestBed.createComponent(LcThemeContrastReportComponent);
    fixture.componentRef.setInput('resolved', resolveTheme({ extends: base, overrides }));
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('liste les 24 paires du thème de base, toutes réussies', async () => {
    const element = await setup();
    expect(element.querySelectorAll('tbody tr').length).toBe(24);
    expect(element.querySelector('[role=status]')?.textContent).toContain('Les 24 paires respectent le contraste minimal.');
    expect(element.querySelectorAll('.lc-theme-contrast__row--fail').length).toBe(0);
  });

  it('signale les paires insuffisantes avec ratio, seuil et résultat textuel', async () => {
    const element = await setup({ 'color.primary': '#aaaaaa' });
    const failing = [...element.querySelectorAll('.lc-theme-contrast__row--fail')] as HTMLElement[];
    expect(failing.length).toBeGreaterThan(0);
    const row = failing.find((candidate) => candidate.querySelector('th')?.textContent?.includes('Texte sur couleur principale sur Couleur principale'));
    expect(row?.textContent).toContain('2.32:1');
    expect(row?.textContent).toContain('4.5:1');
    expect(row?.textContent).toContain('Échoué');
    expect(element.querySelector('[role=status]')?.textContent).toMatch(/paires? sur 24/);
  });

  it('table sémantique : en-têtes de colonne et de ligne', async () => {
    const element = await setup();
    expect(element.querySelectorAll('thead th[scope=col]').length).toBe(4);
    expect(element.querySelectorAll('tbody th[scope=row]').length).toBe(24);
    expect(element.querySelector('caption')?.textContent).toContain('Contraste des couleurs');
  });

  it('libellés anglais', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
    const element = await setup();
    expect(element.querySelector('[role=status]')?.textContent).toContain('All 24 pairs meet the minimum contrast.');
  });
});
