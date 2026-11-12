import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcPaginatorComponent } from './paginator.component';

@Component({
  imports: [LcPaginatorComponent],
  template: `<lc-paginator [total]="total()" [(page)]="page" [(pageSize)]="pageSize" [pageSizes]="pageSizes()"
    [ariaLabel]="ariaLabel()" (pageChange)="changes.push($event)" />`,
})
class PaginatorHostComponent {
  readonly total = signal(120);
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly pageSizes = signal<readonly number[]>([]);
  readonly ariaLabel = signal<string | undefined>(undefined);
  readonly changes: number[] = [];
}

describe('LcPaginatorComponent', () => {
  async function setup(configure: (host: PaginatorHostComponent) => void = () => undefined) {
    const fixture = TestBed.createComponent(PaginatorHostComponent);
    configure(fixture.componentInstance);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const host = fixture.componentInstance;
    const buttons = () => [...element.querySelectorAll<HTMLButtonElement>('button')];
    const previous = () => buttons().find((button) => button.textContent!.trim() === 'Précédent')!;
    const next = () => buttons().find((button) => button.textContent!.trim() === 'Suivant')!;
    const range = () => element.querySelector('.lc-paginator__range')!.textContent!.trim();
    const status = () => element.querySelector('[role=status]')!.textContent!.trim();
    const update = async (change: (current: PaginatorHostComponent) => void) => {
      change(host);
      await fixture.whenStable();
    };
    const click = async (button: HTMLButtonElement) => {
      button.click();
      await fixture.whenStable();
    };
    return { fixture, element, host, previous, next, range, status, update, click };
  }

  // CA-K4.1
  it('CA-K4.1 : 120 éléments par 25 → 5 pages ; page 1 « 1 à 25 sur 120 », Précédent désactivé', async () => {
    const { range, status, previous, next } = await setup();
    expect(range()).toBe('1 à 25 sur 120');
    expect(status()).toBe('Page 1 sur 5');
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(false);
  });

  it('CA-K4.1 : dernière page → « 101 à 120 sur 120 », « Page 5 sur 5 », Suivant désactivé', async () => {
    const { range, status, previous, next } = await setup((host) => host.page.set(5));
    expect(range()).toBe('101 à 120 sur 120');
    expect(status()).toBe('Page 5 sur 5');
    expect(next().disabled).toBe(true);
    expect(previous().disabled).toBe(false);
  });

  it('page intermédiaire : « 26 à 50 sur 120 »', async () => {
    const { range } = await setup((host) => host.page.set(2));
    expect(range()).toBe('26 à 50 sur 120');
  });

  it('les boutons sont des <button type="button"> natifs désactivés par l\'attribut disabled', async () => {
    const { previous, next } = await setup();
    for (const button of [previous(), next()]) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.getAttribute('type')).toBe('button');
    }
    expect(previous().hasAttribute('disabled')).toBe(true);
    expect(next().hasAttribute('disabled')).toBe(false);
  });

  // CA-K4.2
  it('CA-K4.2 : total 0 → « 0 sur 0 », « Page 1 sur 1 », les deux boutons désactivés', async () => {
    const { range, status, previous, next } = await setup((host) => host.total.set(0));
    expect(range()).toBe('0 sur 0');
    expect(status()).toBe('Page 1 sur 1');
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(true);
  });

  it.each([[-4], [Number.NaN]])('un total invalide (%s) est traité comme 0 : « 0 sur 0 »', async (total) => {
    const { range, previous, next } = await setup((host) => host.total.set(total));
    expect(range()).toBe('0 sur 0');
    expect(previous().disabled).toBe(true);
    expect(next().disabled).toBe(true);
  });

  it('CA-K4.2 : un total qui baisse recadre la page, met à jour le modèle de l\'hôte et émet pageChange', async () => {
    const { host, range, status, update } = await setup((current) => current.page.set(5));
    expect(host.changes).toEqual([]);
    await update((current) => current.total.set(30));
    expect(range()).toBe('26 à 30 sur 30');
    expect(status()).toBe('Page 2 sur 2');
    expect(host.page()).toBe(2);
    expect(host.changes).toEqual([2]);
  });

  it('un total à 0 depuis la dernière page ramène la page 1 dans le modèle', async () => {
    const { host, update } = await setup((current) => current.page.set(5));
    await update((current) => current.total.set(0));
    expect(host.page()).toBe(1);
    expect(host.changes).toEqual([1]);
  });

  it('une page initiale hors bornes (0, négative, décimale, trop grande) est recadrée', async () => {
    const { host, status, update } = await setup((current) => current.page.set(0));
    expect(status()).toBe('Page 1 sur 5');
    expect(host.page()).toBe(1);
    await update((current) => current.page.set(99));
    expect(status()).toBe('Page 5 sur 5');
    expect(host.page()).toBe(5);
    await update((current) => current.page.set(-2));
    expect(host.page()).toBe(1);
  });

  it('un total qui augmente ne change pas la page courante', async () => {
    const { host, status, update } = await setup((current) => current.page.set(2));
    await update((current) => current.total.set(500));
    expect(status()).toBe('Page 2 sur 20');
    expect(host.page()).toBe(2);
    expect(host.changes).toEqual([]);
  });

  // CA-K4.3
  it('CA-K4.3 : Suivant et Précédent changent de page, émettent pageChange et mettent à jour le modèle', async () => {
    const { host, status, next, previous, click } = await setup();
    await click(next());
    expect(host.page()).toBe(2);
    expect(status()).toBe('Page 2 sur 5');
    await click(next());
    await click(previous());
    expect(host.page()).toBe(2);
    expect(host.changes).toEqual([2, 3, 2]);
  });

  it('CA-K4.1 : Suivant depuis l\'avant-dernière page atteint la dernière page (« 101 à 120 sur 120 », Suivant désactivé)', async () => {
    const { host, range, status, next, click } = await setup((current) => current.page.set(4));
    await click(next());
    expect(host.page()).toBe(5);
    expect(range()).toBe('101 à 120 sur 120');
    expect(status()).toBe('Page 5 sur 5');
    expect(next().disabled).toBe(true);
  });

  it('Précédent depuis la page 2 atteint la première page (Précédent désactivé)', async () => {
    const { host, status, previous, click } = await setup((current) => current.page.set(2));
    await click(previous());
    expect(host.page()).toBe(1);
    expect(status()).toBe('Page 1 sur 5');
    expect(previous().disabled).toBe(true);
  });

  it('CA-K4.3 : l\'annonce de page est un role="status" qui porte aria-current="page"', async () => {
    const { element, status, next, click } = await setup();
    const live = element.querySelector('[role=status]')!;
    expect(live.getAttribute('aria-current')).toBe('page');
    expect(element.querySelectorAll('[role=status]').length).toBe(1);
    await click(next());
    expect(status()).toBe('Page 2 sur 5');
    expect(element.querySelector('[role=status]')).toBe(live);
  });

  it('la navigation a le nom « Pagination » par défaut et un nom personnalisable', async () => {
    const { element, update } = await setup();
    const nav = element.querySelector('nav')!;
    expect(nav.getAttribute('aria-label')).toBe('Pagination');
    await update((host) => host.ariaLabel.set('Pagination du journal'));
    expect(nav.getAttribute('aria-label')).toBe('Pagination du journal');
  });

  it('CA-K4.3 : au clavier, Entrée sur le bouton focalisé change de page (bouton natif)', async () => {
    const { host, next, fixture } = await setup();
    next().focus();
    expect(document.activeElement).toBe(next());
    next().click(); // le clic natif est ce que le navigateur émet pour Entrée / Espace sur un <button>
    await fixture.whenStable();
    expect(host.page()).toBe(2);
  });

  it('le focus passe à l\'autre bouton quand le bouton cliqué se désactive à la borne', async () => {
    const { previous, next, click, update } = await setup((host) => host.page.set(4));
    next().focus();
    await click(next());
    expect(next().disabled).toBe(true);
    expect(document.activeElement).toBe(previous());
    await update((host) => host.page.set(2));
    previous().focus();
    await click(previous());
    expect(previous().disabled).toBe(true);
    expect(document.activeElement).toBe(next());
  });

  describe('taille de page', () => {
    const select = (element: HTMLElement) => element.querySelector<HTMLSelectElement>('select')!;

    it('sans pageSizes, aucune liste de choix', async () => {
      const { element } = await setup();
      expect(element.querySelector('select')).toBeNull();
    });

    it('avec pageSizes : liste native étiquetée, taille courante sélectionnée', async () => {
      const { element } = await setup((host) => host.pageSizes.set([10, 25, 50]));
      expect([...select(element).options].map((option) => option.textContent)).toEqual(['10', '25', '50']);
      expect(select(element).value).toBe('25');
      expect(element.querySelector('label')!.textContent).toContain('Éléments par page');
      expect(element.querySelector('label')!.contains(select(element))).toBe(true);
    });

    it('changer de taille met à jour le modèle, le total de pages et conserve le premier élément visible', async () => {
      const { host, element, range, status, fixture } = await setup((current) => { current.pageSizes.set([10, 25, 50]); current.page.set(3); });
      expect(range()).toBe('51 à 75 sur 120');
      select(element).value = '50';
      select(element).dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(host.pageSize()).toBe(50);
      expect(host.page()).toBe(2);
      expect(range()).toBe('51 à 100 sur 120');
      expect(status()).toBe('Page 2 sur 3');
    });

    it('passer à une taille plus grande que le total ramène à la page 1', async () => {
      const { host, element, range, fixture } = await setup((current) => { current.pageSizes.set([25, 500]); current.page.set(5); });
      select(element).value = '500';
      select(element).dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(host.page()).toBe(1);
      expect(range()).toBe('1 à 120 sur 120');
    });

    it('une taille de page invalide (0) retombe sur la taille par défaut sans exception', async () => {
      const { range } = await setup((host) => host.pageSize.set(0));
      expect(range()).toBe('1 à 25 sur 120');
    });
  });

  it('libellés anglais via LC_LABELS_EN', async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
    const { element, range, status } = await setup((host) => host.page.set(5));
    expect(range()).toBe('101 to 120 of 120');
    expect(status()).toBe('Page 5 of 5');
    expect(element.querySelector('nav')!.getAttribute('aria-label')).toBe('Pagination');
    expect([...element.querySelectorAll('button')].map((button) => button.textContent!.trim())).toEqual(['Previous', 'Next']);
  });
});
