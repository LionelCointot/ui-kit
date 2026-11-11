import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LC_LABELS, LC_LABELS_EN } from '@lionelcointot/ui-angular';
import { LC_CODE_BLOCK_MAX_CHARS, LcCodeBlockComponent } from './code-block.component';

@Component({
  imports: [LcCodeBlockComponent],
  template: `<lc-code-block [code]="code()" ariaLabel="Journal d'exécution" [wrap]="wrap()" [lineNumbers]="lineNumbers()"
    [copyable]="copyable()" [maxHeight]="maxHeight()" />`,
})
class CodeBlockHostComponent {
  readonly code = signal('ligne 1\nligne 2');
  readonly wrap = signal(false);
  readonly lineNumbers = signal(false);
  readonly copyable = signal(true);
  readonly maxHeight = signal('20rem');
}

describe('LcCodeBlockComponent', () => {
  async function setup(code?: string) {
    const fixture = TestBed.createComponent(CodeBlockHostComponent);
    if (code !== undefined) fixture.componentInstance.code.set(code);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const block = element.querySelector('lc-code-block') as HTMLElement;
    const codeElement = () => block.querySelector('pre code') as HTMLElement;
    const copyButton = () => block.querySelector<HTMLButtonElement>('button.lc-code-block__copy');
    const status = () => block.querySelector('[role=status]')!.textContent!;
    const update = async (change: (host: CodeBlockHostComponent) => void) => {
      change(fixture.componentInstance);
      await fixture.whenStable();
    };
    return { fixture, block, codeElement, copyButton, status, update };
  }

  function stubClipboard(writeText: (text: string) => Promise<void>) {
    const spy = vi.fn(writeText);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: spy } });
    return spy;
  }

  afterEach(() => {
    vi.useRealTimers();
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('rend le texte dans <pre><code>, dans une région focusable nommée', async () => {
    const { block, codeElement } = await setup();
    const region = block.querySelector('[role=region]') as HTMLElement;
    expect(region.getAttribute('tabindex')).toBe('0');
    expect(region.getAttribute('aria-label')).toBe('Journal d\'exécution');
    expect(region.contains(block.querySelector('pre'))).toBe(true);
    expect(codeElement().textContent).toBe('ligne 1\nligne 2');
  });

  it('maxHeight s\'applique à la région défilante (défaut 20rem)', async () => {
    const { block, update } = await setup();
    const region = block.querySelector<HTMLElement>('[role=region]')!;
    expect(region.style.maxBlockSize).toBe('20rem');
    await update((host) => host.maxHeight.set('8rem'));
    expect(region.style.maxBlockSize).toBe('8rem');
  });

  // CA-K7.1
  describe('CA-K7.1 : contenu non fiable affiché littéralement', () => {
    const payloads = [
      '<img src=x onerror=window.__pwned=true>',
      '<script>window.__pwned = true</script>',
      '<svg onload=window.__pwned=true></svg>',
      '"><b onclick=window.__pwned=true>x</b>',
      '{{ constructor.constructor("window.__pwned=true")() }}',
    ];

    it.each(payloads)('%s est un simple texte, sans élément injecté ni exécution', async (payload) => {
      Reflect.deleteProperty(window, '__pwned');
      const { block, codeElement } = await setup(payload);
      expect(codeElement().textContent).toBe(payload);
      expect(codeElement().children.length).toBe(0);
      expect(block.querySelector('img, script, svg[onload], b')).toBeNull();
      expect(block.querySelector('[onerror], [onclick], [onload]')).toBeNull();
      expect((window as unknown as Record<string, unknown>)['__pwned']).toBeUndefined();
    });

    it('idem avec les numéros de ligne', async () => {
      const { block, update } = await setup('<img src=x onerror=window.__pwned=true>\n<b>gras</b>');
      await update((host) => host.lineNumbers.set(true));
      const lines = [...block.querySelectorAll('.lc-code-block__line')];
      expect(lines.map((line) => line.textContent)).toEqual(['<img src=x onerror=window.__pwned=true>', '<b>gras</b>']);
      expect(block.querySelector('img, b')).toBeNull();
    });
  });

  // CA-K7.2
  describe('copie', () => {
    it('CA-K7.2 : copie le texte intégral et annonce « Copié » (role="status")', async () => {
      const writeText = stubClipboard(() => Promise.resolve());
      const { fixture, copyButton, status } = await setup('a\nb\n<c>');
      expect(copyButton()!.getAttribute('aria-label')).toBe('Copier');
      expect(status()).toBe('');
      copyButton()!.click();
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      expect(writeText).toHaveBeenCalledExactlyOnceWith('a\nb\n<c>');
      expect(status()).toBe('Copié');
    });

    it('la confirmation disparaît après 2 s', async () => {
      stubClipboard(() => Promise.resolve());
      const { fixture, copyButton, status } = await setup();
      vi.useFakeTimers();
      copyButton()!.click();
      await vi.advanceTimersByTimeAsync(0);
      fixture.detectChanges();
      expect(status()).toBe('Copié');
      await vi.advanceTimersByTimeAsync(2000);
      fixture.detectChanges();
      expect(status()).toBe('');
    });

    it('échec du presse-papiers : « Copie impossible » annoncé, aucune exception', async () => {
      const writeText = stubClipboard(() => Promise.reject(new DOMException('refusé', 'NotAllowedError')));
      const { fixture, copyButton, status } = await setup();
      copyButton()!.click();
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      expect(writeText).toHaveBeenCalledTimes(1);
      expect(status()).toBe('Copie impossible');
    });

    it('presse-papiers indisponible (navigator.clipboard absent) : « Copie impossible »', async () => {
      const { fixture, copyButton, status } = await setup();
      expect(navigator.clipboard).toBeUndefined();
      copyButton()!.click();
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      expect(status()).toBe('Copie impossible');
    });

    it('un succès après un échec remplace le message', async () => {
      let succeed = false;
      stubClipboard(() => (succeed ? Promise.resolve() : Promise.reject(new Error('non'))));
      const { fixture, copyButton, status } = await setup();
      copyButton()!.click();
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      expect(status()).toBe('Copie impossible');
      succeed = true;
      copyButton()!.click();
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      expect(status()).toBe('Copié');
    });

    it('copyable=false : pas de bouton, la région d\'annonce reste vide', async () => {
      const { copyButton, status, update } = await setup();
      await update((host) => host.copyable.set(false));
      expect(copyButton()).toBeNull();
      expect(status()).toBe('');
    });

    it('libellés anglais', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      stubClipboard(() => Promise.resolve());
      const { fixture, copyButton, status } = await setup();
      expect(copyButton()!.getAttribute('aria-label')).toBe('Copy');
      copyButton()!.click();
      await fixture.whenStable();
      await Promise.resolve();
      await fixture.whenStable();
      expect(status()).toBe('Copied');
    });
  });

  // CA-K7.3
  describe('wrap et numéros de ligne', () => {
    it('CA-K7.3 : wrap pose la classe de retour à la ligne, absente par défaut', async () => {
      const { block, update } = await setup();
      expect(block.classList).not.toContain('lc-code-block--wrap');
      await update((host) => host.wrap.set(true));
      expect(block.classList).toContain('lc-code-block--wrap');
    });

    it('CA-K7.3 : lineNumbers rend une ligne par saut de ligne (LF, CRLF, CR) sans insérer les numéros dans le texte', async () => {
      const { block, update } = await setup('a\r\nb\rc\nd');
      expect(block.classList).not.toContain('lc-code-block--line-numbers');
      await update((host) => host.lineNumbers.set(true));
      expect(block.classList).toContain('lc-code-block--line-numbers');
      const lines = [...block.querySelectorAll('.lc-code-block__line')].map((line) => line.textContent);
      expect(lines).toEqual(['a', 'b', 'c', 'd']);
      // Les numéros sont du contenu généré (CSS ::before, user-select: none) : jamais dans le texte sélectionnable ni copié.
      expect(block.querySelector('pre')!.textContent).toBe('abcd');
    });

    it('les numéros de ligne ne modifient pas le texte copié', async () => {
      const writeText = stubClipboard(() => Promise.resolve());
      const { fixture, copyButton, update } = await setup('x\ny');
      await update((host) => host.lineNumbers.set(true));
      copyButton()!.click();
      await fixture.whenStable();
      expect(writeText).toHaveBeenCalledWith('x\ny');
    });

    it('lignes vides conservées avec les numéros (une ligne par saut)', async () => {
      const { block, update } = await setup('a\n\nb\n');
      await update((host) => host.lineNumbers.set(true));
      expect(block.querySelectorAll('.lc-code-block__line').length).toBe(4);
    });
  });

  // CA-K7.3 (troncature)
  describe('troncature à 100 000 caractères', () => {
    it('une limite de 100 000 caractères', () => {
      expect(LC_CODE_BLOCK_MAX_CHARS).toBe(100_000);
    });

    it('exactement 100 000 caractères : rien n\'est tronqué, pas de mention', async () => {
      const { block, codeElement } = await setup('x'.repeat(100_000));
      expect(codeElement().textContent!.length).toBe(100_000);
      expect(block.querySelector('.lc-code-block__notice')).toBeNull();
    });

    it('100 001 caractères : affichage tronqué à 100 000 et mention signalée', async () => {
      const { block, codeElement } = await setup('x'.repeat(100_001));
      expect(codeElement().textContent!.length).toBe(100_000);
      expect(block.querySelector('.lc-code-block__notice')!.textContent).toBe('Texte tronqué aux 100000 premiers caractères');
    });

    it('le texte intégral reste copiable même tronqué à l\'affichage', async () => {
      const full = `${'y'.repeat(100_000)}FIN`;
      const writeText = stubClipboard(() => Promise.resolve());
      const { fixture, copyButton } = await setup(full);
      copyButton()!.click();
      await fixture.whenStable();
      expect(writeText).toHaveBeenCalledWith(full);
    });

    it('ne coupe pas une paire de substitution (emoji) à la limite', async () => {
      const text = `${'a'.repeat(99_999)}😀suite`;
      const { codeElement } = await setup(text);
      const shown = codeElement().textContent!;
      expect(shown.length).toBe(99_999);
      expect(shown).toBe('a'.repeat(99_999));
    });

    it('la troncature s\'applique aussi avec les numéros de ligne', async () => {
      const { block, update } = await setup(`${'z'.repeat(100_000)}\nreste`);
      await update((host) => host.lineNumbers.set(true));
      expect(block.querySelectorAll('.lc-code-block__line').length).toBe(1);
      expect(block.querySelector('.lc-code-block__notice')).not.toBeNull();
    });
  });

  it('code vide : région et bouton présents, aucun texte, aucune mention', async () => {
    const { block, codeElement, copyButton, update } = await setup('');
    expect(codeElement().textContent).toBe('');
    expect(block.querySelector('.lc-code-block__notice')).toBeNull();
    expect(copyButton()).not.toBeNull();
    await update((host) => host.lineNumbers.set(true));
    expect(block.querySelectorAll('.lc-code-block__line').length).toBe(1);
  });
});
