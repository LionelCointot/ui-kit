import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { type LcThemeDefinition, validateTheme } from '@lionelcointot/ui-tokens/theme';
import { LcThemeEditorComponent } from './theme-editor.component';

@Component({
  imports: [LcThemeEditorComponent],
  template: `<lc-theme-editor [(theme)]="theme" [mode]="mode()" />`,
})
class HostComponent {
  readonly theme = signal<LcThemeDefinition>({ name: 'essai', extends: 'default', overrides: {} });
  readonly mode = signal<'simple' | 'advanced'>('simple');
}

function tabNames(fixture: ComponentFixture<HostComponent>): string[] {
  return [...fixture.nativeElement.querySelectorAll('[role=tab]')].map((tab) => (tab as HTMLElement).textContent?.trim() ?? '');
}

/** Champ (lc-form-field) dont le libellé commence par `label`. */
function field(fixture: ComponentFixture<HostComponent>, label: string): HTMLElement {
  const found = [...fixture.nativeElement.querySelectorAll('lc-theme-token-field')].find((element) =>
    (element as HTMLElement).querySelector('label')?.textContent?.trim().startsWith(label));
  if (!found) throw new Error(`Champ introuvable : ${label}`);
  return found as HTMLElement;
}

async function type(fixture: ComponentFixture<HostComponent>, input: HTMLInputElement, text: string): Promise<void> {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
}

describe('LcThemeEditorComponent', () => {
  async function setup(mode: 'simple' | 'advanced' = 'simple') {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.mode.set(mode);
    await fixture.whenStable();
    return fixture;
  }

  it('mode simple : seulement les groupes qui ont des réglages essentiels', async () => {
    const fixture = await setup();
    expect(tabNames(fixture)).toEqual(['Couleurs de marque', 'Surfaces et texte', 'Typographie', 'Formes (arrondis)', 'Espacements']);
    expect(field(fixture, 'Couleur principale')).toBeTruthy();
  });

  it('mode avancé : les huit groupes et tous les tokens du groupe', async () => {
    const fixture = await setup('advanced');
    expect(tabNames(fixture).length).toBe(8);
    expect(fixture.nativeElement.querySelectorAll('lc-theme-token-field').length).toBe(10);
  });

  it('une couleur valide met à jour le thème et ses dérivations', async () => {
    const fixture = await setup();
    const input = field(fixture, 'Couleur principale').querySelector<HTMLInputElement>('input[type=text]')!;
    await type(fixture, input, '#0b5f5a');
    const { overrides } = fixture.componentInstance.theme();
    expect(overrides['color.primary']).toBe('#0b5f5a');
    expect(overrides['color.primary-container']).toMatch(/^#[0-9a-f]{6}$/);
    expect(validateTheme(fixture.componentInstance.theme()).valid).toBe(true);
    expect(field(fixture, 'Texte sur couleur principale').querySelector<HTMLInputElement>('input[type=text]')!.value).toBe('#ffffff');
    // Les couleurs calculées sont liées : champ en lecture seule.
    expect(field(fixture, 'Texte sur couleur principale').querySelector<HTMLInputElement>('input[type=text]')!.readOnly).toBe(true);
  });

  it('une saisie invalide garde la dernière valeur valide et affiche l’erreur', async () => {
    const fixture = await setup();
    const input = field(fixture, 'Couleur principale').querySelector<HTMLInputElement>('input[type=text]')!;
    await type(fixture, input, '#0b5f5a');
    const valid = fixture.componentInstance.theme();
    await type(fixture, input, 'red;}body{display:none');
    expect(fixture.componentInstance.theme()).toBe(valid);
    expect(field(fixture, 'Couleur principale').textContent).toContain('Valeur refusée');
    expect(field(fixture, 'Couleur principale').querySelector('lc-form-field')?.classList.contains('lc-form-field--invalid')).toBe(true);
  });

  it('délier une couleur calculée la rend modifiable et la protège des changements de sa source', async () => {
    const fixture = await setup();
    const onPrimary = field(fixture, 'Texte sur couleur principale');
    onPrimary.querySelector<HTMLButtonElement>('button[aria-pressed]')!.click();
    await fixture.whenStable();
    const text = field(fixture, 'Texte sur couleur principale').querySelector<HTMLInputElement>('input[type=text]')!;
    expect(text.readOnly).toBe(false);
    await type(fixture, text, '#111111');
    await type(fixture, field(fixture, 'Couleur principale').querySelector<HTMLInputElement>('input[type=text]')!, '#0b5f5a');
    expect(fixture.componentInstance.theme().overrides['color.on-primary']).toBe('#111111');
    expect(fixture.componentInstance.theme().overrides['color.primary-container']).toBeDefined();
  });

  it('un thème importé dont une couleur diffère de la dérivation la garde déliée', async () => {
    const fixture = await setup();
    fixture.componentInstance.theme.set({ name: 'essai', extends: 'default', overrides: { 'color.primary': '#0b5f5a', 'color.on-primary': '#222222' } });
    await fixture.whenStable();
    expect(field(fixture, 'Texte sur couleur principale').querySelector<HTMLInputElement>('input[type=text]')!.readOnly).toBe(false);
    await type(fixture, field(fixture, 'Couleur principale').querySelector<HTMLInputElement>('input[type=text]')!, '#1c5cab');
    expect(fixture.componentInstance.theme().overrides['color.on-primary']).toBe('#222222');
  });

  it('densité : le sélecteur modifie l’échelle d’espacement', async () => {
    const fixture = await setup();
    const tab = [...fixture.nativeElement.querySelectorAll('[role=tab]')].find((element) => (element as HTMLElement).textContent?.includes('Espacements')) as HTMLElement;
    tab.click();
    await fixture.whenStable();
    const compact = [...fixture.nativeElement.querySelectorAll('[role=radio]')].find((element) => (element as HTMLElement).textContent?.includes('Compacte')) as HTMLElement;
    compact.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.theme().overrides['space.4']).toBe('12px');
  });

  it('libellés anglais', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
    const fixture = await setup();
    expect(tabNames(fixture)[0]).toBe('Brand colors');
  });
});
