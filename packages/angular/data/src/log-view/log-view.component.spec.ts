import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LcLogLine, LcLogViewComponent } from './log-view.component';

@Component({
  imports: [LcLogViewComponent],
  template: `<lc-log-view ariaLabel="Journal de la tâche" [lines]="lines()" [maxLines]="maxLines()" [live]="live()"
    [copyable]="copyable()" [wrap]="wrap()" height="8rem" [(following)]="following" (copied)="copied.push($event)" />`,
})
class LogViewHostComponent {
  readonly lines = signal<readonly LcLogLine[]>([]);
  readonly maxLines = signal<number>(500);
  readonly live = signal<'off' | 'polite'>('off');
  readonly copyable = signal(true);
  readonly wrap = signal(true);
  readonly following = signal(true);
  readonly copied: string[] = [];
}

@Component({
  imports: [LcLogViewComponent],
  template: `<lc-log-view ariaLabel="J" [lines]="lines" [maxLines]="1" emptyText="Vide" copyLabel="Copie" resumeLabel="Fin" [truncatedLabel]="truncated" [following]="false" />`,
})
class CustomLabelsHostComponent {
  lines: readonly LcLogLine[] = [{ id: 1, text: 'a' }, { id: 2, text: 'b' }];
  truncated = (count: number) => `${count} masquée(s)`;
}

const make = (count: number, from = 1): LcLogLine[] =>
  Array.from({ length: count }, (_, index) => ({ id: from + index, text: `ligne ${from + index}` }));

describe('LcLogViewComponent', () => {
  // jsdom ne calcule aucune mise en page : toute zone fait 100 px de haut pour 1 000 px de contenu (défilement max. 900),
  // et scrollTop est borné comme dans un navigateur.
  const positions = new WeakMap<Element, number>();
  const saved = ['scrollHeight', 'clientHeight', 'scrollTop'].map((name) => [name, Object.getOwnPropertyDescriptor(Element.prototype, name)] as const);
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'scrollHeight', { configurable: true, get: () => 1000 });
    Object.defineProperty(Element.prototype, 'clientHeight', { configurable: true, get: () => 100 });
    Object.defineProperty(Element.prototype, 'scrollTop', {
      configurable: true,
      get(this: Element) { return positions.get(this) ?? 0; },
      set(this: Element, value: number) { positions.set(this, Math.max(0, Math.min(value, 900))); },
    });
  });
  afterEach(() => saved.forEach(([name, descriptor]) => Object.defineProperty(Element.prototype, name, descriptor!)));

  async function setup(lines: readonly LcLogLine[] = []) {
    const fixture = TestBed.createComponent(LogViewHostComponent);
    const host = fixture.componentInstance;
    host.lines.set(lines);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const scroller = root.querySelector<HTMLElement>('[role=log]')!;
    const scrollTo = async (value: number) => {
      scroller.scrollTop = value;
      scroller.dispatchEvent(new Event('scroll'));
      await fixture.whenStable();
    };
    const update = async (change: (instance: LogViewHostComponent) => void) => {
      change(host);
      await fixture.whenStable();
    };
    return {
      fixture, host, root, scroller, scrollTo, update,
      rows: () => root.querySelectorAll('.lc-log-view__line'),
      notice: () => root.querySelector('.lc-log-view__notice')?.textContent,
      resume: () => root.querySelector<HTMLButtonElement>('.lc-log-view__resume'),
      copyButton: () => root.querySelector<HTMLButtonElement>('.lc-log-view__bar button')!,
      status: () => root.querySelector('[role=status]')?.textContent,
    };
  }

  function stubClipboard(writeText: (text: string) => Promise<void>) {
    const spy = vi.fn(writeText);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: spy } });
    return spy;
  }
  afterEach(() => Reflect.deleteProperty(navigator, 'clipboard'));

  describe('CA-5 : rôle, nom, live, état vide', () => {
    it('role="log" focusable, nommé, aria-live="off" par défaut puis "polite"', async () => {
      const { scroller, update } = await setup(make(1));
      expect(scroller.getAttribute('tabindex')).toBe('0');
      expect(scroller.getAttribute('aria-label')).toBe('Journal de la tâche');
      expect(scroller.getAttribute('aria-live')).toBe('off');
      expect(scroller.style.blockSize).toBe('8rem');
      await update((host) => host.live.set('polite'));
      expect(scroller.getAttribute('aria-live')).toBe('polite');
    });

    it('état vide : message par défaut (fr), aucune ligne', async () => {
      const { root, rows } = await setup();
      expect(rows()).toHaveLength(0);
      expect(root.querySelector('.lc-log-view__empty')!.textContent).toBe('Aucune sortie pour l\'instant.');
    });

    it('copyable=false retire la barre de copie ; wrap pilote la classe d\'hôte', async () => {
      const { root, update } = await setup(make(1));
      const host = root.querySelector('lc-log-view')!;
      expect(host.classList).toContain('lc-log-view--wrap');
      await update((instance) => { instance.copyable.set(false); instance.wrap.set(false); });
      expect(root.querySelector('.lc-log-view__bar')).toBeNull();
      expect(host.classList).not.toContain('lc-log-view--wrap');
    });
  });

  describe('CA-6 : suivi de la fin, pause, reprise', () => {
    it('un ajout en bas suit la fin tant que following est vrai', async () => {
      const { scroller, update } = await setup(make(3));
      expect(scroller.scrollTop).toBe(900);
      scroller.scrollTop = 0;
      await update((host) => host.lines.update((lines) => [...lines, ...make(1, 4)]));
      expect(scroller.scrollTop).toBe(900);
    });

    it('défiler vers le haut met le suivi en pause, affiche « Revenir en bas » et ne bouge plus', async () => {
      const { host, scroller, scrollTo, update, resume } = await setup(make(3));
      expect(resume()).toBeNull();
      await scrollTo(300);
      expect(host.following()).toBe(false);
      expect(resume()!.textContent).toContain('Revenir en bas');
      await update((instance) => instance.lines.update((lines) => [...lines, ...make(1, 4)]));
      expect(scroller.scrollTop).toBe(300);
    });

    it('le bouton rétablit le suivi, descend et redonne le focus à la zone', async () => {
      const { host, scroller, scrollTo, resume, fixture } = await setup(make(3));
      await scrollTo(300);
      resume()!.click();
      await fixture.whenStable();
      expect(host.following()).toBe(true);
      expect(scroller.scrollTop).toBe(900);
      expect(resume()).toBeNull();
      expect(document.activeElement).toBe(scroller);
    });

    it('arriver en bas (touche Fin, défilement manuel) rétablit le suivi, tolérance de 2 px', async () => {
      const { host, scrollTo, resume } = await setup(make(3));
      await scrollTo(300);
      await scrollTo(898); // 1000 - 898 - 100 = 2 px du bas
      expect(host.following()).toBe(true);
      expect(resume()).toBeNull();
    });

    it('un défilement vers le bas hors de la fin ne rétablit pas le suivi', async () => {
      const { host, scrollTo } = await setup(make(3));
      await scrollTo(300);
      await scrollTo(500);
      expect(host.following()).toBe(false);
    });

    it('le suivi est aussi pilotable de l\'extérieur (following=false : pas de défilement)', async () => {
      const { scroller, update } = await setup(make(3));
      scroller.scrollTop = 0;
      await update((host) => { host.following.set(false); host.lines.update((lines) => [...lines, ...make(1, 4)]); });
      expect(scroller.scrollTop).toBe(0);
    });
  });

  describe('CA-7 : maxLines, avis, copie', () => {
    it('au-delà de maxLines, les plus anciennes sont retirées du DOM et l\'avis s\'affiche', async () => {
      const { rows, notice, update } = await setup(make(5));
      await update((host) => host.maxLines.set(3));
      expect(rows()).toHaveLength(3);
      expect([...rows()].map((row) => row.textContent!.trim())).toEqual(['ligne 3', 'ligne 4', 'ligne 5']);
      expect(notice()).toBe('2 lignes plus anciennes masquées');
    });

    it('avis au singulier ; aucun avis sous le plafond ou à égalité', async () => {
      const { notice, update } = await setup(make(3));
      await update((host) => host.maxLines.set(2));
      expect(notice()).toBe('1 ligne plus ancienne masquée');
      await update((host) => host.maxLines.set(3));
      expect(notice()).toBeUndefined();
    });

    it('le plafond par défaut est de 500 lignes', async () => {
      const { rows, notice } = await setup(make(501));
      expect(rows()).toHaveLength(500);
      expect(notice()).toBe('1 ligne plus ancienne masquée');
    });

    it.each([0, NaN])('maxLines invalide (%s) : retour au plafond par défaut de 500', async (invalid) => {
      const { rows, update } = await setup(make(501));
      await update((host) => host.maxLines.set(invalid));
      expect(rows()).toHaveLength(500);
    });

    it('maxLines décimal est arrondi à l\'entier inférieur', async () => {
      const { rows, update } = await setup(make(5));
      await update((host) => host.maxLines.set(2.9));
      expect(rows()).toHaveLength(2);
    });

    it('copie les lignes présentes avec repère de niveau et préfixe, émet copied, annonce « Copié »', async () => {
      const writeText = stubClipboard(() => Promise.resolve());
      const { host, copyButton, status, fixture } = await setup([
        { id: 1, text: 'trop ancienne' },
        { id: 2, text: 'compilation', prefix: 'build' },
        { id: 3, text: 'échec', prefix: 'build', kind: 'err' },
        { id: 4, text: 'fin', kind: 'info' },
      ]);
      host.maxLines.set(3);
      await fixture.whenStable();
      copyButton().click();
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      const expected = 'build compilation\nerr build échec\ninfo fin';
      expect(writeText).toHaveBeenCalledWith(expected);
      expect(host.copied).toEqual([expected]);
      expect(status()).toBe('Copié');
    });

    it('échec de copie : « Copie impossible » annoncée, copied non émis', async () => {
      stubClipboard(() => Promise.reject(new Error('refusé')));
      const { host, copyButton, status, fixture } = await setup(make(2));
      copyButton().click();
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      expect(status()).toBe('Copie impossible');
      expect(host.copied).toEqual([]);
    });

    it('presse-papiers absent : « Copie impossible », sans exception', async () => {
      const { copyButton, status, fixture } = await setup(make(2));
      expect(navigator.clipboard).toBeUndefined();
      copyButton().click();
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      expect(status()).toBe('Copie impossible');
    });
  });

  describe('CA-8 : repères de niveau non portés par la seule couleur', () => {
    it('err et info portent un repère texte ; out n\'en porte pas', async () => {
      const { rows } = await setup([
        { id: 1, text: 'a', kind: 'out' },
        { id: 2, text: 'b', kind: 'err', prefix: 'étape' },
        { id: 3, text: 'c', kind: 'info' },
        { id: 4, text: 'd' },
      ]);
      const levels = [...rows()].map((row) => row.querySelector('.lc-log-view__level')?.textContent ?? null);
      expect(levels).toEqual([null, 'err', 'info', null]);
      expect(rows()[1].classList).toContain('lc-log-view__line--err');
      expect(rows()[2].classList).toContain('lc-log-view__line--info');
      expect(rows()[1].querySelector('.lc-log-view__prefix')!.textContent).toBe('étape');
    });
  });

  describe('Sécurité : texte inséré comme texte', () => {
    it('aucun HTML interprété dans le texte, le préfixe ou le niveau', async () => {
      const html = '<img src=x onerror="window.__xss=1"><b>gras</b>';
      const { root, rows } = await setup([{ id: 1, text: html, prefix: '<i>p</i>', kind: 'err' }]);
      expect(rows()[0].querySelector('.lc-log-view__text')!.textContent).toBe(html);
      expect(rows()[0].querySelector('.lc-log-view__prefix')!.textContent).toBe('<i>p</i>');
      expect(root.querySelector('.lc-log-view__scroller img, .lc-log-view__scroller b, .lc-log-view__scroller i')).toBeNull();
    });
  });

  describe('Libellés', () => {
    it('anglais : libellés fournis par LC_LABELS', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const { root, copyButton, update, notice } = await setup();
      expect(root.querySelector('.lc-log-view__empty')!.textContent).toBe('No output yet.');
      expect(copyButton().textContent).toContain('Copy the log');
      await update((host) => {
        host.lines.set([{ id: 1, text: 'a', kind: 'info' }, { id: 2, text: 'b' }]);
        host.maxLines.set(1);
      });
      expect(notice()).toBe('1 older line hidden');
    });

    it('copyLabel, resumeLabel et truncatedLabel remplacent les libellés par défaut', async () => {
      const fixture = TestBed.createComponent(CustomLabelsHostComponent);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      expect(root.querySelector('.lc-log-view__bar button')!.textContent).toContain('Copie');
      expect(root.querySelector('.lc-log-view__resume')!.textContent).toContain('Fin');
      expect(root.querySelector('.lc-log-view__notice')!.textContent).toBe('1 masquée(s)');
    });

    it('emptyText remplace le message d\'état vide', async () => {
      const fixture = TestBed.createComponent(CustomLabelsHostComponent);
      fixture.componentInstance.lines = [];
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector('.lc-log-view__empty')!.textContent).toBe('Vide');
    });
  });
});
