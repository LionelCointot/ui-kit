import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Component, type Type } from '@angular/core';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import * as dataApi from '../public-api';
import { LcKpiCardComponent } from './kpi-card.component';

/** Le chiffre compte pendant `--lc-count-up-duration` (horloge fictive) : on avance au-delà avant de lire la valeur finale. */
const settle = () => vi.advanceTimersByTime(2000);

describe('LcKpiCardComponent', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] }));
  afterEach(() => vi.useRealTimers());

  it('entre seule en tilt, au rythme des cartes, et compte jusqu\'à la valeur', async () => {
    // jsdom n'a pas `getAnimations` : on simule une animation d'entrée en cours pour que la classe de la variante reste posée.
    Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [{}] });
    const fixture = TestBed.createComponent(LcKpiCardComponent);
    fixture.componentRef.setInput('label', 'Mensualité');
    fixture.componentRef.setInput('value', 1200);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).className).toContain('lc-reveal lc-reveal--tilt');
    delete (Element.prototype as { getAnimations?: unknown }).getAnimations;
    const value = (fixture.nativeElement as HTMLElement).querySelector('.lc-kpi-card__value')!;
    expect(value.textContent).toBe((0).toLocaleString('fr-FR', { minimumFractionDigits: 2 }));
    settle();
    expect(value.textContent).toBe((1200).toLocaleString('fr-FR', { minimumFractionDigits: 2 }));
  });

  it('affiche la valeur formatée et une variation avec signe et icône', async () => {
    const fixture = TestBed.createComponent(LcKpiCardComponent);
    fixture.componentRef.setInput('label', 'Mensualité');
    fixture.componentRef.setInput('value', 1159.92);
    fixture.componentRef.setInput('format', 'money');
    fixture.componentRef.setInput('delta', { value: -2.5, format: 'percent', trend: 'down', sentiment: 'positive' });
    await fixture.whenStable();
    settle();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.lc-kpi-card__value')!.textContent!.replace(/\s/g, ' ')).toContain('1 159,92');
    const delta = element.querySelector('.lc-kpi-card__delta')!;
    expect(delta.textContent!.replace(/\s/g, ' ')).toContain('−2,50 %');
    expect(delta.querySelector('lc-icon')).not.toBeNull();
    expect(delta.classList).toContain('lc-kpi-card__delta--positive');
  });

  it('affiche un tiret sans valeur et un squelette pendant le chargement', async () => {
    const fixture = TestBed.createComponent(LcKpiCardComponent);
    fixture.componentRef.setInput('label', 'Coût total');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.lc-kpi-card__value')!.textContent).toBe('—');
    fixture.componentRef.setInput('loading', true);
    await fixture.whenStable();
    expect(element.querySelector('lc-skeleton')).not.toBeNull();
    expect(element.getAttribute('aria-busy')).toBe('true');
  });

  it('valueText remplace la valeur formatée et nomme la carte', async () => {
    const fixture = TestBed.createComponent(LcKpiCardComponent);
    fixture.componentRef.setInput('label', 'Point d\'équilibre');
    fixture.componentRef.setInput('value', 88);
    fixture.componentRef.setInput('format', 'money');
    fixture.componentRef.setInput('valueText', '7 ans et 4 mois');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.lc-kpi-card__value')!.textContent).toBe('7 ans et 4 mois');
    expect(element.getAttribute('role')).toBe('group');
    expect(element.getAttribute('aria-label')).toBe('Point d\'équilibre : 7 ans et 4 mois');
    fixture.componentRef.setInput('valueText', null);
    await fixture.whenStable();
    settle();
    expect(element.querySelector('.lc-kpi-card__value')!.textContent!.replace(/\s/g, ' ')).toContain('88');
    expect(element.getAttribute('aria-label')).toContain('88');
  });

  it('un texte libre sans valeur numérique reste affiché (« Aucun »)', async () => {
    const fixture = TestBed.createComponent(LcKpiCardComponent);
    fixture.componentRef.setInput('label', 'Équilibre');
    fixture.componentRef.setInput('valueText', 'Aucun');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.lc-kpi-card__value')!.textContent).toBe('Aucun');
  });

  describe('relief : mot de tendance, variantes', () => {
    const render = async (inputs: Record<string, unknown>) => {
      const fixture = TestBed.createComponent(LcKpiCardComponent);
      fixture.componentRef.setInput('label', 'Mensualité');
      fixture.componentRef.setInput('value', 10);
      Object.entries(inputs).forEach(([key, value]) => fixture.componentRef.setInput(key, value));
      await fixture.whenStable();
      return fixture.nativeElement as HTMLElement;
    };
    const trend = (element: HTMLElement) => element.querySelector('.lc-kpi-card__trend')?.textContent;

    it.each([
      ['up', 'hausse'],
      ['down', 'baisse'],
      ['flat', 'stable'],
    ] as const)('dit « %s » en français, aussi pour une variation nulle', async (kind, word) => {
      const element = await render({ delta: { value: kind === 'flat' ? 0 : 1, format: 'percent', trend: kind, sentiment: 'neutral' } });
      expect(trend(element)).toBe(word);
    });

    it('dit la tendance en anglais avec le jeu anglais', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const element = await render({ delta: { value: 1, format: 'percent', trend: 'up', sentiment: 'positive' } });
      expect(trend(element)).toBe('up');
    });

    it('n\'affiche aucun mot sans variation', async () => {
      expect(trend(await render({ hint: 'Sur 12 mois' }))).toBeUndefined();
    });

    it('pose les classes de variante et de disposition (contour, vertical, neutre par défaut)', async () => {
      const element = await render({});
      expect(element.classList).toContain('lc-kpi-card--outline');
      expect(element.classList).toContain('lc-kpi-card--vertical');
      expect(element.classList).toContain('lc-kpi-card--neutral');
      expect(element.classList).toContain('lc-kpi-card');
    });

    it('pose la tuile pleine de la couleur demandée, en disposition horizontale', async () => {
      const element = await render({ fillMode: 'solid', themeColor: 'primary', layout: 'horizontal' });
      expect(element.classList).toContain('lc-kpi-card--solid');
      expect(element.classList).toContain('lc-kpi-card--primary');
      expect(element.classList).toContain('lc-kpi-card--horizontal');
    });
  });
});

// Acceptation de docs/specs/2026-12-relief.md (CA-6, CA-5 c d). Les valeurs viennent de la spec ; la directive est lue par la sortie publique du point d'entrée.
const DIRECTIVE = 'LcKpiCardLinkDirective';

describe('LcKpiCardComponent : mot de tendance et forme lien (relief)', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] }));
  afterEach(() => vi.useRealTimers());

  const render = async (delta?: unknown, labels?: unknown) => {
    if (labels) TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: labels }] });
    const fixture = TestBed.createComponent(LcKpiCardComponent);
    fixture.componentRef.setInput('label', 'Impayés');
    fixture.componentRef.setInput('value', 12);
    fixture.componentRef.setInput('format', 'integer');
    fixture.componentRef.setInput('delta', delta);
    await fixture.whenStable();
    vi.advanceTimersByTime(2000);
    return fixture.nativeElement as HTMLElement;
  };

  it.each([['up', 3, 'hausse'], ['down', -3, 'baisse'], ['flat', 0, 'stable'], ['flat', 1, 'stable']] as const)('CA-6 : trend %s (variation %s) affiche « %s »', async (trend, value, word) => {
    const element = await render({ value, format: 'integer', trend, sentiment: 'neutral' });
    expect(element.querySelector('.lc-kpi-card__delta')!.textContent).toContain(word);
  });

  it('CA-6 : le mot suit LC_LABELS (anglais fourni, distinct du français)', async () => {
    const en = LC_LABELS_EN as unknown as Record<string, string>;
    expect([en['kpiTrendUp'], en['kpiTrendDown'], en['kpiTrendFlat']].every((w) => !!w && !['hausse', 'baisse', 'stable'].includes(w))).toBe(true);
    const element = await render({ value: 3, format: 'integer', trend: 'up', sentiment: 'positive' }, LC_LABELS_EN);
    expect(element.querySelector('.lc-kpi-card__delta')!.textContent).toContain(en['kpiTrendUp']);
  });

  it('CA-6 : sans delta, aucun mot de tendance', async () => {
    const text = (await render(undefined)).textContent!;
    expect(text).not.toMatch(/hausse|baisse|stable/);
  });

  it('CA-5 c d : avec a[lcKpiCardLink], chevron en plus, nom sur l\'ancre, plus de role group ni d\'aria-label sur la carte', async () => {
    // Absente tant que T3 n'est pas faite : l'ancre n'est alors pas projetée et le test échoue sur ce constat.
    const link = (dataApi as unknown as Record<string, Type<unknown> | undefined>)[DIRECTIVE];
    @Component({
      imports: [LcKpiCardComponent, ...(link ? [link] : [])],
      template: `<lc-kpi-card label="Impayés" [value]="12" format="integer" hint="depuis lundi" [delta]="{ value: 3, format: 'integer', trend: 'up', sentiment: 'negative' }"><a lcKpiCardLink href="#liste">Voir</a></lc-kpi-card>`,
    })
    class Host {}
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    vi.advanceTimersByTime(2000);
    const card = (fixture.nativeElement as HTMLElement).querySelector('lc-kpi-card')!;
    const anchor = card.querySelector('a[lcKpiCardLink]');
    expect(anchor, 'l\'ancre doit être projetée dans la carte').not.toBeNull();
    expect(anchor!.getAttribute('aria-label')).toMatch(/^Impayés : 12, .*hausse.*, depuis lundi$/);
    expect(card.getAttribute('role')).toBeNull();
    expect(card.getAttribute('aria-label')).toBeNull();
    expect(card.querySelectorAll('lc-icon').length, 'icône de tendance + chevron').toBe(2);
  });
});
