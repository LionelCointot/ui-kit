import { TestBed } from '@angular/core/testing';
import { LcCalendarPanelComponent } from './calendar-panel.component';

async function setup(selection: string | null, level?: 'month' | 'year') {
  const fixture = TestBed.createComponent(LcCalendarPanelComponent);
  document.body.append(fixture.nativeElement);
  fixture.componentRef.setInput('today', '2026-11-19');
  fixture.componentRef.setInput('selection', { from: selection, to: null });
  await fixture.whenStable();
  const el = fixture.nativeElement as HTMLElement;
  const picked = vi.fn();
  fixture.componentInstance.picked.subscribe(picked);
  const settle = () => fixture.whenStable();
  const title = () => el.querySelector('button.lc-calendar__title') as HTMLButtonElement;
  const label = () => el.querySelector('[aria-live="polite"]')!.textContent;
  const nav = (name: RegExp) => [...el.querySelectorAll<HTMLButtonElement>('button.lc-calendar__nav')].find((b) => name.test(b.getAttribute('aria-label')!))!;
  const click = async (target: Element, detail = 1) => {
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
    await settle();
  };
  if (level) {
    await click(title());
    if (level === 'year') await click(title());
  }
  return { el, picked, title, label, nav, click, settle };
}

describe('calendar-panel, corrections après la QA', () => {
  afterEach(() => document.body.replaceChildren());

  it('double clic sur un mois : le second clic ne choisit aucun jour', async () => {
    const { el, picked, click, label } = await setup('2026-11-12', 'month');
    await click(el.querySelector('td[data-date="2026-05-01"]')!);
    expect(label()).toBe('mai 2026');
    await click(el.querySelector('td[data-date="2026-05-01"]')!, 2);
    expect(picked).not.toHaveBeenCalled();
  });

  it('double clic sur une année : le second clic ne choisit rien non plus', async () => {
    const { el, picked, click } = await setup('2026-11-12', 'year');
    await click(el.querySelector('td[data-date="2024-01-01"]')!);
    await click(el.querySelector('td[data-date="2024-03-01"]')!, 2);
    expect(picked).not.toHaveBeenCalled();
  });

  it('un double clic sur un jour le choisit une seule fois, un clic simple aussi', async () => {
    const { el, picked, click } = await setup('2026-11-12');
    await click(el.querySelector('td[data-date="2026-11-20"]')!, 1);
    await click(el.querySelector('td[data-date="2026-11-20"]')!, 2);
    await click(el.querySelector('td[data-date="2026-11-20"]')!, 3);
    expect(picked).toHaveBeenCalledExactlyOnceWith('2026-11-20');
  });

  it('l’hôte est focalisable par un clic (tabindex -1) : Échap et le piège restent actifs', async () => {
    const { el } = await setup(null);
    expect(el.getAttribute('tabindex')).toBe('-1');
  });

  it('années : la première page est « 1000 à 1011 », précédent désactivé ; la dernière « 9988 à 9999 », suivant désactivé', async () => {
    const { el, label, nav, click } = await setup('2026-11-12', 'year');
    for (let step = 0; step < 200 && !nav(/précédentes/).disabled; step++) await click(nav(/précédentes/));
    expect(label()).toBe('1000 à 1011');
    expect(nav(/précédentes/).disabled).toBe(true);
    expect(Math.min(...[...el.querySelectorAll('td[data-date]')].map((c) => Number(c.getAttribute('data-date')!.slice(0, 4))))).toBe(1000);
    for (let step = 0; step < 1000 && !nav(/suivantes/).disabled; step++) await click(nav(/suivantes/));
    expect(label()).toBe('9988 à 9999');
    expect(nav(/suivantes/).disabled).toBe(true);
  });

  it('mois : précédent désactivé en 1000, suivant en 9999 ; jours : janvier 1000 et décembre 9999', async () => {
    const first = await setup('1000-03-10', 'month');
    expect(first.nav(/précédente/).disabled).toBe(true);
    expect(first.nav(/suivante/).disabled).toBe(false);
    document.body.replaceChildren();
    const last = await setup('9999-03-10', 'month');
    expect(last.nav(/suivante/).disabled).toBe(true);
    document.body.replaceChildren();
    const january = await setup('1000-01-15');
    expect(january.nav(/précédent/).disabled).toBe(true);
    document.body.replaceChildren();
    const december = await setup('9999-12-15');
    expect(december.nav(/suivant/).disabled).toBe(true);
    expect(december.nav(/précédent/).disabled).toBe(false);
  });

  it('au clavier, on ne sort pas de 1000 à 9999', async () => {
    const { el, settle, label } = await setup('1000-01-01');
    const active = () => el.querySelector<HTMLElement>('td[tabindex="0"]')!;
    active().dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
    await settle();
    expect(active().dataset['date']).toBe('1000-01-01');
    expect(label()).toBe('janvier 1000');
  });
});
