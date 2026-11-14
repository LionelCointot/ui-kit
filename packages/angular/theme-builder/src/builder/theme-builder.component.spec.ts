import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN, LcThemeService } from '@lionelcointot/ui-angular';
import { LC_ECHARTS_ENGINE } from '@lionelcointot/ui-angular/charts';
import { renderThemeCss, toDtcg } from '@lionelcointot/ui-tokens/theme';
import { LC_THEME_BUILDER_INITIAL, LcThemeBuilderComponent } from './theme-builder.component';

class FakeResizeObserver {
  observe(): void {}
  disconnect(): void {}
}

const html = (): HTMLElement => document.documentElement;
const buttonByText = (root: HTMLElement, text: string): HTMLButtonElement =>
  [...root.querySelectorAll('button')].find((button) => button.textContent?.includes(text)) as HTMLButtonElement;

describe('LcThemeBuilderComponent', () => {
  let downloads: { name: string; type: string; content: string }[];

  beforeEach(() => {
    downloads = [];
    vi.stubGlobal('ResizeObserver', FakeResizeObserver);
    TestBed.configureTestingModule({
      providers: [{ provide: LC_ECHARTS_ENGINE, useValue: { init: () => ({ setOption: vi.fn(), resize: vi.fn(), dispose: vi.fn(), dispatchAction: vi.fn(), on: vi.fn() }) } }],
    });
    window.URL.createObjectURL = vi.fn((blob: Blob) => {
      const entry = { name: '', type: blob.type, content: '' };
      downloads.push(entry);
      void blob.text().then((content) => (entry.content = content));
      return 'blob:test';
    }) as never;
    window.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads[downloads.length - 1].name = this.download;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    html().removeAttribute('style');
    html().removeAttribute('data-theme');
  });

  async function setup(): Promise<ComponentFixture<LcThemeBuilderComponent>> {
    const fixture = TestBed.createComponent(LcThemeBuilderComponent);
    await fixture.whenStable();
    return fixture;
  }

  async function importJson(fixture: ComponentFixture<LcThemeBuilderComponent>, text: string, size = text.length): Promise<void> {
    const input = (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>('input[type=file]')!;
    const file = { size, text: () => Promise.resolve(text) };
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();
  }

  describe('affichage et aperçu', () => {
    it('affiche l’éditeur, le rapport de contraste et l’aperçu', async () => {
      const element = (await setup()).nativeElement as HTMLElement;
      expect(element.querySelector('lc-theme-editor')).not.toBeNull();
      expect(element.querySelector('lc-theme-contrast-report')).not.toBeNull();
      expect(element.querySelector('lc-theme-preview')).not.toBeNull();
    });

    it('prévisualise le thème sur le document tant qu’il est affiché, puis restaure à la destruction (critère 5)', async () => {
      const fixture = await setup();
      const themes = TestBed.inject(LcThemeService);
      vi.stubGlobal('requestAnimationFrame', undefined);
      fixture.componentRef.setInput('theme', { ...LC_THEME_BUILDER_INITIAL, overrides: { 'color.primary': '#0b5f5a' } });
      await fixture.whenStable();
      expect(html().style.getPropertyValue('--lc-sys-color-primary')).toBe('#0b5f5a');
      expect(themes.revision()).toBeGreaterThan(0);
      fixture.destroy();
      expect(html().getAttribute('style') ?? '').not.toContain('--lc-sys');
    });
  });

  describe('export', () => {
    it('exporte le .tokens.json (contenu DTCG) et le .css identique à renderThemeCss', async () => {
      const fixture = await setup();
      const theme = { name: 'teal', extends: 'default' as const, overrides: { 'color.primary': '#0b5f5a', 'radius.md': '12px' } };
      fixture.componentRef.setInput('theme', theme);
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      buttonByText(element, 'Exporter .tokens.json').click();
      buttonByText(element, 'Exporter .css').click();
      await new Promise((resolve) => setTimeout(resolve));
      expect(downloads.map((download) => download.name)).toEqual(['teal.tokens.json', 'teal.css']);
      expect(JSON.parse(downloads[0].content)).toEqual(toDtcg(theme));
      expect(downloads[1].content).toBe(renderThemeCss(theme));
      expect(downloads[1].type).toBe('text/css');
    });

    it('bloque l’export tant que le nom est invalide et signale l’erreur sur le champ', async () => {
      const fixture = await setup();
      fixture.componentRef.setInput('theme', { ...LC_THEME_BUILDER_INITIAL, name: 'Default' });
      await fixture.whenStable();
      const element = fixture.nativeElement as HTMLElement;
      expect(buttonByText(element, 'Exporter .tokens.json').disabled).toBe(true);
      expect(buttonByText(element, 'Exporter .css').disabled).toBe(true);
      expect(buttonByText(element, 'Copier').disabled).toBe(true);
      expect(element.querySelector('.lc-form-field__error')?.textContent).toContain('Le nom doit commencer');
      buttonByText(element, 'Exporter .css').click();
      expect(downloads.length).toBe(0);
    });

    it('copie le thème au format DTCG dans le presse-papiers', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
      const fixture = await setup();
      buttonByText(fixture.nativeElement, 'Copier').click();
      await fixture.whenStable();
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
      expect(writeText).toHaveBeenCalledWith(`${JSON.stringify(toDtcg(LC_THEME_BUILDER_INITIAL), null, 2)}\n`);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Thème copié');
    });
  });

  describe('import', () => {
    it('importe un fichier DTCG valide', async () => {
      const fixture = await setup();
      await importJson(fixture, JSON.stringify({ sys: { color: { primary: { $value: '#0b5f5a', $type: 'color' } } } }));
      expect(fixture.componentInstance.theme().overrides).toEqual({ 'color.primary': '#0b5f5a' });
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Thème importé : 1 surcharge.');
    });

    it('refuse un import invalide : jetons inconnus avec suggestion, valeurs refusées, JSON illisible, fichier trop gros', async () => {
      const fixture = await setup();
      const before = fixture.componentInstance.theme();
      await importJson(fixture, JSON.stringify({ sys: { color: { primay: { $value: '#fff' }, primary: { $value: 'red;}body{display:none' } } } }));
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Import refusé');
      expect(text).toContain('color.primary');
      expect(text).toContain('Valeur refusée');
      expect(fixture.componentInstance.theme()).toBe(before);
      await importJson(fixture, '{ pas du json');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('JSON valide');
      await importJson(fixture, '{}', 10 * 1024 * 1024);
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('trop volumineux');
      expect(fixture.componentInstance.theme()).toBe(before);
    });

    it('accepte l’import d’un thème qui ne surcharge rien', async () => {
      const fixture = await setup();
      await importJson(fixture, '{}');
      expect(fixture.componentInstance.theme().overrides).toEqual({});
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('aucune surcharge');
    });
  });

  describe('réinitialisation et libellés', () => {
    it('réinitialise le thème en gardant la base ; bascule la base et le mode', async () => {
      const fixture = await setup();
      const element = fixture.nativeElement as HTMLElement;
      fixture.componentRef.setInput('theme', { name: 'x', extends: 'dark', overrides: { 'color.primary': '#5fcbc2' } });
      await fixture.whenStable();
      buttonByText(element, 'Réinitialiser').click();
      await fixture.whenStable();
      expect(fixture.componentInstance.theme()).toEqual({ ...LC_THEME_BUILDER_INITIAL, extends: 'dark' });
      (element.querySelector('[role=radio][aria-checked=false]') as HTMLElement).click();
      await fixture.whenStable();
      const advanced = [...element.querySelectorAll('[role=radio]')].find((radio) => radio.textContent?.includes('Avancé')) as HTMLElement;
      advanced.click();
      await fixture.whenStable();
      expect(element.querySelectorAll('lc-theme-editor [role=tab]').length).toBe(8);
    });

    it('libellés anglais', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const element = (await setup()).nativeElement as HTMLElement;
      expect(buttonByText(element, 'Export .tokens.json')).toBeTruthy();
      expect(buttonByText(element, 'Import')).toBeTruthy();
    });
  });
  });
