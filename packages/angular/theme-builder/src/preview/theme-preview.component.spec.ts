import { TestBed } from '@angular/core/testing';
import { LC_ECHARTS_ENGINE } from '@lionelcointot/ui-angular/charts';
import { LcThemePreviewComponent } from './theme-preview.component';

class FakeResizeObserver {
  observe(): void {}
  disconnect(): void {}
}

describe('LcThemePreviewComponent', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    TestBed.configureTestingModule({
      providers: [{ provide: LC_ECHARTS_ENGINE, useValue: { init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), dispatchAction: vi.fn(), on: vi.fn() }) } }],
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('affiche la galerie : boutons de tous les rôles et remplissages, champs, alertes, badges, tableau, onglets, graphique', async () => {
    const fixture = TestBed.createComponent(LcThemePreviewComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    for (const color of ['primary', 'secondary', 'success', 'warning', 'error', 'neutral']) {
      for (const fill of ['solid', 'outline', 'flat']) {
        expect(element.querySelector(`button.lc-button--${fill}.lc-button--${color}`), `${fill} ${color}`).not.toBeNull();
      }
    }
    expect(element.querySelectorAll('lc-alert').length).toBe(4);
    expect(element.querySelectorAll('lc-badge').length).toBeGreaterThanOrEqual(5);
    expect(element.querySelector('input.lc-input')).not.toBeNull();
    expect(element.querySelector('lc-number-input')).not.toBeNull();
    expect(element.querySelector('table')).not.toBeNull();
    expect(element.querySelector('[role=tablist]')).not.toBeNull();
    expect(element.querySelector('lc-line-chart')).not.toBeNull();
  });

  it('textes issus de LC_LABELS, sans couleur en dur dans le rendu', async () => {
    const fixture = TestBed.createComponent(LcThemePreviewComponent);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Exemple de tableau');
    expect(element.querySelectorAll('[style*="#"]').length).toBe(0);
  });
});
