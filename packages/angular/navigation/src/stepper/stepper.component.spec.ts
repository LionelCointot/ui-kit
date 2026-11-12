import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcStep, LcStepperComponent } from './stepper.component';

const STEPS: readonly LcStep[] = [
  { id: 's1', label: 'Un', state: 'done' },
  { id: 's2', label: 'Deux', state: 'done' },
  { id: 's3', label: 'Trois', state: 'current' },
  { id: 's4', label: 'Quatre', state: 'upcoming' },
];

async function setup(steps: readonly LcStep[] = STEPS, compact?: 'auto' | boolean) {
  const fixture = TestBed.createComponent(LcStepperComponent);
  fixture.componentRef.setInput('steps', steps);
  fixture.componentRef.setInput('ariaLabel', 'Progression');
  if (compact !== undefined) fixture.componentRef.setInput('compact', compact);
  const emitted: string[] = [];
  fixture.componentInstance.stepSelect.subscribe((id) => emitted.push(id));
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  return { fixture, element, emitted };
}

describe('LcStepperComponent', () => {
  it('CA-3 : rend un nav[aria-label] contenant un ol, un li par étape', async () => {
    const { element } = await setup();
    const nav = element.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Progression');
    expect(nav.querySelector('ol')).not.toBeNull();
    expect(nav.querySelectorAll('ol > li').length).toBe(4);
  });

  it('CA-3 : seule l\'étape en cours porte aria-current="step"', async () => {
    const { element } = await setup();
    const current = element.querySelectorAll('[aria-current]');
    expect(current.length).toBe(1);
    expect(current[0].getAttribute('aria-current')).toBe('step');
    expect(current[0].textContent).toContain('Trois');
  });

  it('CA-3 : une étape faite est un button nommé « Revenir à : {nom} »', async () => {
    const { element } = await setup();
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('ol button'));
    expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual(['Revenir à : Un', 'Revenir à : Deux']);
    expect(buttons.every((button) => button.type === 'button')).toBe(true);
  });

  it('CA-3 : les étapes en cours et à venir n\'ont aucun élément focalisable', async () => {
    const { element } = await setup();
    const items = element.querySelectorAll('ol > li');
    for (const index of [2, 3]) {
      expect(items[index].querySelector('button, a[href], input, select, textarea, [tabindex]')).toBeNull();
    }
  });

  it('CA-3 : stepSelect émet l\'id d\'une étape faite au clic', async () => {
    const { element, emitted } = await setup();
    element.querySelectorAll<HTMLButtonElement>('ol button')[1].click();
    element.querySelectorAll<HTMLButtonElement>('ol button')[0].click();
    expect(emitted).toEqual(['s2', 's1']);
  });

  it('CA-3 : stepSelect n\'émet jamais pour une étape en cours ou à venir', async () => {
    const { element, emitted } = await setup();
    const items = element.querySelectorAll<HTMLElement>('ol > li');
    for (const index of [2, 3]) {
      items[index].click();
      items[index].querySelector<HTMLElement>('.lc-stepper__step')!.click();
    }
    expect(emitted).toEqual([]);
  });

  it('CA-3 : le nom accessible du bouton suit la langue (LC_LABELS en)', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
    const { element } = await setup();
    expect(element.querySelector('ol button')!.getAttribute('aria-label')).toBe('Back to: Un');
  });

  it('CA-3 : le numéro d\'une étape non faite est son rang (décoratif, masqué aux lecteurs)', async () => {
    const { element } = await setup();
    const badge = element.querySelectorAll('ol > li')[3].querySelector('.lc-stepper__badge')!;
    expect(badge.textContent!.trim()).toBe('4');
    expect(badge.getAttribute('aria-hidden')).toBe('true');
  });

  it('CA-4 : forme compacte « Étape n sur N : nom » pour l\'étape en cours', async () => {
    const { element } = await setup(STEPS, true);
    expect(element.classList).toContain('lc-stepper--compact');
    expect(element.querySelector('.lc-stepper__summary-text')!.textContent).toBe('Étape 3 sur 4 : Trois');
  });

  it('CA-4 : (CSS) compact vrai masque la liste et montre le résumé ; faux montre la liste et masque le résumé', async () => {
    const compact = await setup(STEPS, true);
    expect(getComputedStyle(compact.element.querySelector('.lc-stepper__list')!).display).toBe('none');
    expect(getComputedStyle(compact.element.querySelector('.lc-stepper__summary')!).display).not.toBe('none');
    const full = await setup(STEPS, false);
    expect(getComputedStyle(full.element.querySelector('.lc-stepper__list')!).display).not.toBe('none');
    expect(getComputedStyle(full.element.querySelector('.lc-stepper__summary')!).display).toBe('none');
  });

  it('CA-4 : compact faux force la liste complète (classe --full, pas --compact)', async () => {
    const { element } = await setup(STEPS, false);
    expect(element.classList).toContain('lc-stepper--full');
    expect(element.classList).not.toContain('lc-stepper--compact');
  });

  it('CA-4 : compact "auto" (défaut) ne pose ni --compact ni --full (le seuil 768 px est en CSS)', async () => {
    const { element } = await setup();
    expect(element.classList).not.toContain('lc-stepper--compact');
    expect(element.classList).not.toContain('lc-stepper--full');
  });

  it('CA-4 : la piste décorative est masquée aux lecteurs d\'écran et proportionnelle à l\'avancement', async () => {
    const { element } = await setup(STEPS, true);
    expect(element.querySelector('.lc-stepper__track')!.getAttribute('aria-hidden')).toBe('true');
    expect(element.querySelector<HTMLElement>('.lc-stepper__track-fill')!.style.inlineSize).toBe('75%');
  });

  it('CA-4 : sans étape en cours, la forme compacte montre la première étape non faite', async () => {
    const steps: LcStep[] = [
      { id: 'a', label: 'A', state: 'done' },
      { id: 'b', label: 'B', state: 'upcoming' },
      { id: 'c', label: 'C', state: 'upcoming' },
    ];
    const { element } = await setup(steps, true);
    expect(element.querySelector('.lc-stepper__summary-text')!.textContent).toBe('Étape 2 sur 3 : B');
  });

  it('CA-4 : sans étape en cours ni à venir, la forme compacte montre la dernière étape', async () => {
    const steps: LcStep[] = [
      { id: 'a', label: 'A', state: 'done' },
      { id: 'b', label: 'B', state: 'done' },
    ];
    const { element } = await setup(steps, true);
    expect(element.querySelector('.lc-stepper__summary-text')!.textContent).toBe('Étape 2 sur 2 : B');
    expect(element.querySelector('[aria-current]')).toBeNull();
  });

  it('liste vide : aucun li, texte compact vide, pas d\'erreur', async () => {
    const { element } = await setup([], true);
    expect(element.querySelectorAll('ol > li').length).toBe(0);
    expect(element.querySelector('.lc-stepper__summary-text')!.textContent).toBe('');
    expect(element.querySelector<HTMLElement>('.lc-stepper__track-fill')!.style.inlineSize).toBe('0%');
  });

  it('l\'état d\'une étape se met à jour (étape en cours devenue faite)', async () => {
    const { fixture, element } = await setup();
    fixture.componentRef.setInput('steps', STEPS.map((step) => (step.id === 's3' ? { ...step, state: 'done' as const } : step)));
    await fixture.whenStable();
    expect(element.querySelectorAll('ol button').length).toBe(3);
  });
});
