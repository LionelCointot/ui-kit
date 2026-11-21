import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { LcFileUploadItem } from '../file-upload/file-upload.component';
import type { LcFileRefusal } from '../shared/file-filter';
import { LcMessageComposerComponent } from './message-composer.component';

@Component({
  imports: [LcMessageComposerComponent],
  template: `
    <lc-message-composer [(value)]="text" ariaLabel="Message" [items]="items()" [attachments]="attachments()"
      [disabled]="disabled()" [accept]="accept()" [maxFiles]="maxFiles()"
      (filesAdded)="added.push($event)" (rejected)="refused.push($event)" (remove)="removed.push($event)" (retry)="retried.push($event)" />
  `,
})
class HostComponent {
  readonly text = signal('');
  readonly items = signal<readonly LcFileUploadItem[]>([]);
  readonly attachments = signal(true);
  readonly disabled = signal(false);
  readonly accept = signal('image/*,.pdf');
  readonly maxFiles = signal<number | null>(10);
  readonly added: File[][] = [];
  readonly refused: LcFileRefusal[][] = [];
  readonly removed: string[] = [];
  readonly retried: string[] = [];
}

const png = (name = 'a.png', size = 4) => new File([new Uint8Array(size)], name, { type: 'image/png' });
const item = (id: string, name: string, extra: Partial<LcFileUploadItem> = {}): LcFileUploadItem => ({ id, name, size: 2048, status: 'done', ...extra });

/** jsdom n'a ni DataTransfer ni DragEvent : un événement ordinaire porte ce que le composant lit. */
function dragEvent(type: string, files: File[], init: { relatedTarget?: EventTarget | null; types?: string[] } = {}): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperties(event, {
    dataTransfer: { value: { types: init.types ?? (files.length ? ['Files'] : []), files, dropEffect: 'move' } },
    relatedTarget: { value: init.relatedTarget ?? null },
  });
  return event;
}

const textDrag = (type: string) => dragEvent(type, [], { types: ['text/plain'] });

describe('LcMessageComposerComponent : pièces jointes', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    document.body.append(fixture.nativeElement);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const query = <T extends HTMLElement>(selector: string) => element.querySelector<T>(selector);
    const settle = () => fixture.whenStable();
    return { fixture, host: fixture.componentInstance, element, query, settle, box: query('.lc-message-composer__box')!, textarea: query<HTMLTextAreaElement>('textarea')! };
  }

  it('rend un aperçu seulement pour une adresse admise, sinon l\'icône', async () => {
    const { host, element, settle } = await setup();
    host.items.set([
      item('1', 'a.png', { previewUrl: 'data:image/png;base64,AAAA' }),
      item('2', 'b.png', { previewUrl: 'javascript:alert(1)' }),
      item('3', 'c.png', { previewUrl: 'https://evil.example/x.png' }),
      item('4', 'd.png', { previewUrl: '/favicon.svg' }),
    ]);
    await settle();
    const thumbs = Array.from(element.querySelectorAll('[role="list"] > li'));
    expect(thumbs.map((t) => t.querySelector('img') !== null)).toEqual([true, false, false, true]);
    element.querySelector('img')!.dispatchEvent(new Event('error'));
    await settle();
    expect(element.querySelector('[role="list"] > li img[src^="data:"]')).toBeNull();
  });

  it('affiche le nom nettoyé en texte, isolé, avec un nom accessible plafonné', async () => {
    const { host, element, settle } = await setup();
    const long = `${'a'.repeat(300)}.png`;
    host.items.set([item('1', '<img src=x onerror=alert(1)>.png'), item('2', 'facture‮fdp.exe'), item('3', long)]);
    await settle();
    const thumbs = Array.from(element.querySelectorAll('[role="list"] > li'));
    expect(element.querySelector('lc-message-composer img[onerror]')).toBeNull();
    expect(thumbs[0].querySelector('bdi')!.textContent).toBe('<img src=x onerror=alert(1)>.png');
    expect(thumbs[1].querySelector('bdi')!.textContent).toBe('facturefdp.exe');
    expect(thumbs[1].querySelector('[title]')!.getAttribute('title')).toBe('facturefdp.exe');
    const label = thumbs[2].querySelector('button')!.getAttribute('aria-label')!;
    expect(label.length).toBeLessThanOrEqual('Retirer '.length + 80);
    expect(thumbs[2].querySelector('bdi')!.textContent).toBe(long);
  });

  it('émet remove et retry, montre l\'avancement et l\'échec', async () => {
    const { host, element, settle } = await setup();
    host.items.set([item('u', 'up.pdf', { status: 'uploading', progress: 62 }), item('e', 'bad.pdf', { status: 'error' })]);
    await settle();
    expect(element.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')).toBe('62');
    const buttons = Array.from(element.querySelectorAll<HTMLButtonElement>('[role="list"] button'));
    buttons.find((b) => b.getAttribute('aria-label') === 'Réessayer bad.pdf')!.click();
    buttons.find((b) => b.getAttribute('aria-label') === 'Retirer up.pdf')!.click();
    expect(host.retried).toEqual(['e']);
    expect(host.removed).toEqual(['u']);
  });

  it('après un retrait, le focus va à la vignette suivante, sinon au champ', async () => {
    const { host, element, textarea, settle } = await setup();
    host.items.set([item('a', 'a.png'), item('b', 'b.png')]);
    await settle();
    const remove = (name: string) => element.querySelector<HTMLButtonElement>(`button[aria-label="Retirer ${name}"]`)!;
    remove('a.png').focus();
    remove('a.png').click();
    host.items.set([item('b', 'b.png')]);
    await settle();
    expect(element.querySelector('[role="list"] > li')!.contains(document.activeElement)).toBe(true);
    remove('b.png').focus();
    remove('b.png').click();
    host.items.set([]);
    await settle();
    expect(document.activeElement).toBe(textarea);
  });

  describe('dépôt', () => {
    it('allume le calque pour un glisser avec fichier, l\'éteint à la sortie et au lâcher, sans clignoter entre enfants', async () => {
      const { host, box, settle, query } = await setup();
      const lit = () => box.classList.contains('lc-message-composer__box--dragging');
      const over = dragEvent('dragover', [png()]);
      query('textarea')!.dispatchEvent(over);
      await settle();
      expect(over.defaultPrevented).toBe(true);
      expect(lit()).toBe(true);
      query('textarea')!.dispatchEvent(dragEvent('dragleave', [png()], { relatedTarget: query('button') }));
      await settle();
      expect(lit()).toBe(true);
      box.dispatchEvent(dragEvent('dragleave', [png()], { relatedTarget: document.body }));
      await settle();
      expect(lit()).toBe(false);
      box.dispatchEvent(dragEvent('dragenter', [png()]));
      box.dispatchEvent(dragEvent('drop', [png('a.png')]));
      await settle();
      expect(lit()).toBe(false);
      expect(host.added.map((l) => l.map((f) => f.name))).toEqual([['a.png']]);
    });

    it('ignore un glisser sans fichier', async () => {
      const { box } = await setup();
      const event = textDrag('dragover');
      box.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(false);
      expect(box.classList.contains('lc-message-composer__box--dragging')).toBe(false);
    });

    it.each([['disabled'], ['attachments']] as const)('%s : rien d\'éclairé ni d\'émis, mais le navigateur n\'ouvre pas le fichier', async (what) => {
      const { host, box, settle } = await setup();
      if (what === 'disabled') host.disabled.set(true); else host.attachments.set(false);
      await settle();
      const over = dragEvent('dragover', [png()]);
      box.dispatchEvent(over);
      const drop = dragEvent('drop', [png()]);
      box.dispatchEvent(drop);
      expect(over.defaultPrevented && drop.defaultPrevented).toBe(true);
      expect(box.classList.contains('lc-message-composer__box--dragging')).toBe(false);
      expect(host.added).toEqual([]);
    });

    it('ignore fichiers vides et éléments non fichiers, sans refus', async () => {
      const { host, box, settle } = await setup();
      box.dispatchEvent(dragEvent('drop', [png('vide.png', 0)]));
      await settle();
      expect(host.added).toEqual([]);
      expect(host.refused).toEqual([]);
    });

    it('un fichier lâché hors du rectangle est annulé sans être ajouté, un texte non ; écouteurs retirés à la destruction', async () => {
      const { fixture, host, settle } = await setup();
      const file = dragEvent('drop', [png()]);
      document.body.dispatchEvent(file);
      const text = textDrag('dragover');
      document.body.dispatchEvent(text);
      expect(file.defaultPrevented).toBe(true);
      expect(text.defaultPrevented).toBe(false);
      expect(host.added).toEqual([]);
      fixture.destroy();
      await settle();
      const after = dragEvent('dragover', [png()]);
      document.body.dispatchEvent(after);
      expect(after.defaultPrevented).toBe(false);
    });
  });

  describe('collage', () => {
    const paste = (target: HTMLElement, files: File[]) => {
      const event = new Event('paste', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clipboardData', { value: { files } });
      target.dispatchEvent(event);
      return event;
    };

    it('un fichier collé est ajouté sans insérer de texte ; sans fichier, le collage reste natif', async () => {
      const { host, textarea } = await setup();
      expect(paste(textarea, [png('p.png')]).defaultPrevented).toBe(true);
      expect(host.added.map((l) => l.map((f) => f.name))).toEqual([['p.png']]);
      expect(paste(textarea, []).defaultPrevented).toBe(false);
    });

    it.each([['disabled'], ['attachments']] as const)('%s : aucun fichier ajouté', async (what) => {
      const { host, textarea, settle } = await setup();
      if (what === 'disabled') host.disabled.set(true); else host.attachments.set(false);
      await settle();
      paste(textarea, [png()]);
      expect(host.added).toEqual([]);
      expect(host.refused).toEqual([]);
    });
  });

  describe('refus', () => {
    it('affiche un message par raison dans un role=alert, le litéralement nommé, et émet rejected', async () => {
      const { host, element, box, settle } = await setup();
      host.maxFiles.set(2);
      host.items.set([item('1', '1.png')]);
      await settle();
      const drop = new File(['x'], '<script>.txt', { type: 'text/plain' });
      box.dispatchEvent(dragEvent('drop', [png('a.png'), png('b.png'), drop]));
      await settle();
      const alert = element.querySelector('[role="alert"]')!;
      expect(alert.textContent).toContain('<script>.txt');
      expect(alert.textContent).toContain('b.png');
      expect(alert.querySelector('script')).toBeNull();
      expect(host.refused[0].map((r) => r.reason).sort()).toEqual(['count', 'type']);
      expect(box.classList.contains('lc-message-composer__box--shake')).toBe(true);
    });

    it('disparaît à la saisie, au retrait et au prochain ajout', async () => {
      const { host, element, box, textarea, settle } = await setup();
      host.items.set([item('a', 'a.png')]);
      const refuse = async () => {
        box.dispatchEvent(dragEvent('drop', [new File(['x'], 'x.txt', { type: 'text/plain' })]));
        await settle();
        expect(element.querySelector('[role="alert"]')).not.toBeNull();
      };
      await refuse();
      textarea.value = 'a';
      textarea.dispatchEvent(new Event('input'));
      await settle();
      expect(element.querySelector('[role="alert"]')).toBeNull();
      await refuse();
      element.querySelector<HTMLButtonElement>('button[aria-label="Retirer a.png"]')!.click();
      await settle();
      expect(element.querySelector('[role="alert"]')).toBeNull();
      await refuse();
      box.dispatchEvent(dragEvent('drop', [png('ok.png')]));
      await settle();
      expect(element.querySelector('[role="alert"]')).toBeNull();
    });

    it('maxFiles null : sans limite', async () => {
      const { host, box, settle } = await setup();
      host.maxFiles.set(null);
      host.items.set(Array.from({ length: 20 }, (_, i) => item(`${i}`, `${i}.png`)));
      await settle();
      box.dispatchEvent(dragEvent('drop', [png()]));
      expect(host.added).toHaveLength(1);
      expect(host.refused).toEqual([]);
    });
  });

  it('n\'écrit ni nom de fichier ni texte dans la console', async () => {
    const { host, box, settle } = await setup();
    const spies = (['log', 'warn', 'error', 'info', 'debug'] as const).map((m) => vi.spyOn(console, m));
    host.items.set([item('1', 'SECRET-NOM.png')]);
    await settle();
    box.dispatchEvent(dragEvent('drop', [new File(['x'], 'SECRET-REFUS.txt', { type: 'text/plain' })]));
    await settle();
    expect(spies.flatMap((s) => s.mock.calls).join('|')).not.toContain('SECRET');
    spies.forEach((s) => s.mockRestore());
  });
});
