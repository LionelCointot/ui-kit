import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { LC_LABELS, LC_LABELS_EN, LC_LABELS_FR, LC_LOCALE, LC_DEFAULT_ICONS, LcIconComponent } from '@lionelcointot/ui-angular';
import { LcFormFieldComponent } from '../form-field/form-field.component';
import { LcFileUploadComponent, LcFileUploadItem, LcFileUploadRejection } from './file-upload.component';

@Component({
  imports: [LcFileUploadComponent],
  template: `<lc-file-upload ariaLabel="Pièces" [items]="items()" [accept]="accept()" [multiple]="multiple()"
    [maxFiles]="maxFiles()" [disabled]="disabled()"
    (filesAdded)="added.push($event)" (rejected)="rejections.push($event)" (remove)="removed.push($event)" (retry)="retried.push($event)" />`,
})
class UploadHostComponent {
  readonly items = signal<readonly LcFileUploadItem[]>([]);
  readonly accept = signal('');
  readonly multiple = signal(true);
  readonly maxFiles = signal<number | null>(null);
  readonly disabled = signal(false);
  readonly added: File[][] = [];
  readonly rejections: LcFileUploadRejection[][] = [];
  readonly removed: string[] = [];
  readonly retried: string[] = [];
}

@Component({
  imports: [LcFormFieldComponent, LcFileUploadComponent],
  template: `<lc-form-field label="Pièces jointes" hint="Trois au plus" [errors]="errors()">
    <lc-file-upload [items]="items" />
  </lc-form-field>`,
})
class UploadInFieldHostComponent {
  readonly items: readonly LcFileUploadItem[] = [{ id: 'a', name: 'a.pdf', size: 10, status: 'done' }];
  readonly errors = signal<readonly string[]>([]);
}

const item = (id: string, change: Partial<LcFileUploadItem> = {}): LcFileUploadItem =>
  ({ id, name: `${id}.pdf`, size: 1500, status: 'done', ...change });

const file = (name: string, type = ''): File => new File(['x'], name, { type });

/** jsdom n'a ni `DataTransfer` ni `files` modifiable : une liste factice suffit au composant (`length`, itération). */
const fileList = (files: File[]): FileList => Object.assign(files.slice(), { item: (i: number) => files[i] ?? null }) as unknown as FileList;

async function setup(init?: (host: UploadHostComponent) => void) {
  const fixture = TestBed.createComponent(UploadHostComponent);
  init?.(fixture.componentInstance);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const settle = () => fixture.whenStable();
  return {
    fixture,
    host: fixture.componentInstance,
    root,
    settle,
    zone: () => root.querySelector<HTMLElement>('.lc-file-upload__zone')!,
    native: () => root.querySelector<HTMLInputElement>('input[type=file]')!,
    choose: () => root.querySelector<HTMLButtonElement>('.lc-file-upload__choose')!,
    rows: () => Array.from(root.querySelectorAll<HTMLElement>('.lc-file-upload__row')),
    removeButtons: () => Array.from(root.querySelectorAll<HTMLButtonElement>('.lc-file-upload__row > button')),
    status: () => root.querySelector('[role=status]')!.textContent!.trim(),
  };
}

/** Simule un choix par le sélecteur natif : `files` est remplacé, les écritures de `value` sont enregistrées. */
function pick(input: HTMLInputElement, files: File[]): string[] {
  const valueWrites: string[] = [];
  Object.defineProperty(input, 'files', { value: fileList(files), configurable: true });
  Object.defineProperty(input, 'value', { get: () => '', set: (v: string) => valueWrites.push(v), configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return valueWrites;
}

function dragEvent(type: string, types: string[], files: File[] = []): DragEvent {
  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent;
  Object.defineProperty(event, 'dataTransfer', { value: { types, files: fileList(files), dropEffect: 'move' } });
  return event;
}

describe('LcFileUploadComponent', () => {
  describe('choix par le sélecteur (CA-L2-3, CA-L2-4)', () => {
    it('le bouton ouvre le sélecteur natif, qui reçoit accept et multiple', async () => {
      const { host, native, choose, settle } = await setup((h) => { h.accept.set('image/*,.pdf'); });
      expect(native().getAttribute('accept')).toBe('image/*,.pdf');
      expect(native().multiple).toBe(true);
      host.multiple.set(false);
      await settle();
      expect(native().multiple).toBe(false);
      const click = vi.spyOn(native(), 'click');
      choose().click();
      expect(click).toHaveBeenCalledTimes(1);
    });

    it('sans accept, aucun attribut accept n\'est posé', async () => {
      const { native } = await setup();
      expect(native().hasAttribute('accept')).toBe(false);
    });

    it.each([
      ['type MIME exact', 'image/png', file('a.png', 'image/png'), file('a.jpg', 'image/jpeg')],
      ['type MIME générique', 'image/*', file('a.jpg', 'image/jpeg'), file('a.pdf', 'application/pdf')],
      ['extension', '.pdf', file('a.pdf', 'application/pdf'), file('a.png', 'image/png')],
      ['extension sans type MIME', '.pdf', file('a.pdf'), file('a.txt')],
      ['extension insensible à la casse', '.pdf', file('SCAN.PDF'), file('scan.pdfx')],
      ['accept en majuscules', 'IMAGE/PNG, .PDF', file('a.png', 'image/png'), file('a.gif', 'image/gif')],
      ['liste avec espaces', 'image/png , .pdf', file('b.pdf'), file('b.doc')],
    ])('accept : %s retient le bon fichier et refuse l\'autre (raison type)', async (_name, accept, good, bad) => {
      const { host, native, settle } = await setup((h) => { h.accept.set(accept); });
      pick(native(), [good, bad]);
      await settle();
      expect(host.added).toEqual([[good]]);
      expect(host.rejections).toEqual([[{ file: bad, reason: 'type' }]]);
    });

    it('sans accept, tous les fichiers sont acceptés et rejected n\'émet rien', async () => {
      const { host, native, settle } = await setup();
      const files = [file('a.xyz'), file('b', 'application/octet-stream')];
      pick(native(), files);
      await settle();
      expect(host.added).toEqual([files]);
      expect(host.rejections).toEqual([]);
    });

    it('sans multiple, un seul fichier est retenu et les autres sont refusés', async () => {
      const { host, native, settle } = await setup((h) => { h.multiple.set(false); });
      const [a, b] = [file('a.pdf'), file('b.pdf')];
      pick(native(), [a, b]);
      await settle();
      expect(host.added).toEqual([[a]]);
      expect(host.rejections).toEqual([[{ file: b, reason: 'count' }]]);
    });

    it('maxFiles : seule la place restante est prise, le reste est refusé (count), types refusés d\'abord', async () => {
      const { host, native, settle } = await setup((h) => {
        h.maxFiles.set(3);
        h.accept.set('image/*');
        h.items.set([item('1'), item('2')]);
      });
      const [a, txt, c] = [file('a.png', 'image/png'), file('n.txt', 'text/plain'), file('c.png', 'image/png')];
      pick(native(), [a, txt, c]);
      await settle();
      expect(host.added).toEqual([[a]]);
      expect(host.rejections).toEqual([[{ file: txt, reason: 'type' }, { file: c, reason: 'count' }]]);
    });

    it('rien n\'est émis pour rejected quand tout est accepté, ni pour filesAdded quand tout est refusé', async () => {
      const { host, native, settle } = await setup((h) => { h.accept.set('.pdf'); h.maxFiles.set(5); });
      pick(native(), [file('a.pdf'), file('b.pdf')]);
      await settle();
      expect(host.rejections).toEqual([]);
      pick(native(), [file('c.png')]);
      await settle();
      expect(host.added.length).toBe(1);
      expect(host.rejections.length).toBe(1);
    });

    it('un choix vide n\'émet rien', async () => {
      const { host, native, settle } = await setup();
      pick(native(), []);
      await settle();
      expect(host.added).toEqual([]);
      expect(host.rejections).toEqual([]);
    });

    it('le champ natif est remis à vide après chaque choix (le même fichier peut être rechoisi)', async () => {
      const { native } = await setup();
      expect(pick(native(), [file('a.pdf')])).toEqual(['']);
    });

    it('désactivé, un choix natif n\'émet rien', async () => {
      const { host, native, settle } = await setup((h) => { h.disabled.set(true); });
      pick(native(), [file('a.pdf')]);
      await settle();
      expect(host.added).toEqual([]);
      expect(host.rejections).toEqual([]);
    });
  });

  describe('glisser-déposer (CA-L2-3)', () => {
    it('dragover ne retient que les fichiers : sinon pas de preventDefault ni d\'état actif', async () => {
      const { zone, settle } = await setup();
      const text = dragEvent('dragover', ['text/plain']);
      zone().dispatchEvent(text);
      await settle();
      expect(text.defaultPrevented).toBe(false);
      expect(zone().classList).not.toContain('lc-file-upload__zone--active');
    });

    it('dragover avec des fichiers active la zone, annule le comportement du navigateur et annonce une copie ; dragleave la désactive', async () => {
      const { zone, settle } = await setup();
      const over = dragEvent('dragover', ['Files']);
      zone().dispatchEvent(over);
      await settle();
      expect(over.defaultPrevented).toBe(true);
      expect(over.dataTransfer!.dropEffect).toBe('copy');
      expect(zone().classList).toContain('lc-file-upload__zone--active');
      zone().dispatchEvent(dragEvent('dragleave', ['Files']));
      await settle();
      expect(zone().classList).not.toContain('lc-file-upload__zone--active');
    });

    it('un dépôt émet filesAdded et rejected comme le sélecteur, et désactive la zone', async () => {
      const { host, zone, settle } = await setup((h) => { h.accept.set('image/*'); });
      const [a, b] = [file('a.png', 'image/png'), file('b.pdf', 'application/pdf')];
      zone().dispatchEvent(dragEvent('dragover', ['Files']));
      const drop = dragEvent('drop', ['Files'], [a, b]);
      zone().dispatchEvent(drop);
      await settle();
      expect(drop.defaultPrevented).toBe(true);
      expect(host.added).toEqual([[a]]);
      expect(host.rejections).toEqual([[{ file: b, reason: 'type' }]]);
      expect(zone().classList).not.toContain('lc-file-upload__zone--active');
    });

    it('un dépôt qui ne contient pas de fichiers est ignoré', async () => {
      const { host, zone } = await setup();
      const drop = dragEvent('drop', ['text/plain']);
      zone().dispatchEvent(drop);
      expect(drop.defaultPrevented).toBe(false);
      expect(host.added).toEqual([]);
    });

    it('désactivé : rien n\'est accepté, la zone ne s\'active pas (effet « none »), mais le navigateur n\'ouvre pas le fichier', async () => {
      const { host, zone, settle } = await setup((h) => { h.disabled.set(true); });
      const over = dragEvent('dragover', ['Files']);
      zone().dispatchEvent(over);
      zone().dispatchEvent(dragEvent('drop', ['Files'], [file('a.pdf')]));
      await settle();
      expect(over.defaultPrevented).toBe(true);
      expect(over.dataTransfer!.dropEffect).toBe('none');
      expect(zone().classList).not.toContain('lc-file-upload__zone--active');
      expect(host.added).toEqual([]);
    });

    it('plein : aucun fichier n\'est accepté, tous sont refusés avec la raison count', async () => {
      const { host, zone, settle } = await setup((h) => { h.maxFiles.set(1); h.items.set([item('1')]); });
      const over = dragEvent('dragover', ['Files']);
      zone().dispatchEvent(over);
      const dropped = file('a.pdf');
      zone().dispatchEvent(dragEvent('drop', ['Files'], [dropped]));
      await settle();
      expect(over.dataTransfer!.dropEffect).toBe('none');
      expect(zone().classList).not.toContain('lc-file-upload__zone--active');
      expect(host.added).toEqual([]);
      expect(host.rejections).toEqual([[{ file: dropped, reason: 'count' }]]);
    });
  });

  describe('maximum atteint et désactivé (CA-L2-5)', () => {
    it('au maximum : aria-disabled, texte visible relié par aria-describedby, bouton atteignable, clic sans effet', async () => {
      const { root, host, native, choose, settle } = await setup((h) => { h.maxFiles.set(2); h.items.set([item('1'), item('2')]); });
      const limit = root.querySelector<HTMLElement>('.lc-file-upload__limit')!;
      expect(limit.textContent!.trim()).toBe('Maximum atteint : 2 fichiers. Vous ne pouvez plus en ajouter.');
      expect(choose().getAttribute('aria-disabled')).toBe('true');
      expect(choose().disabled).toBe(false);
      expect(choose().getAttribute('aria-describedby')).toBe(limit.id);
      const click = vi.spyOn(native(), 'click');
      choose().click();
      expect(click).not.toHaveBeenCalled();
      pick(native(), [file('a.pdf')]);
      await settle();
      expect(host.added).toEqual([]);
    });

    it('limite de 1 : le texte est au singulier ; sous la limite, ni texte ni aria-disabled', async () => {
      const { root, host, choose, settle } = await setup((h) => { h.maxFiles.set(1); h.items.set([item('1')]); });
      expect(root.querySelector('.lc-file-upload__limit')!.textContent).toContain('1 fichier.');
      host.items.set([]);
      await settle();
      expect(root.querySelector('.lc-file-upload__limit')).toBeNull();
      expect(choose().hasAttribute('aria-disabled')).toBe(false);
      expect(choose().hasAttribute('aria-describedby')).toBe(false);
    });

    it('désactivé : le bouton est inactif, le groupe aria-disabled, le clic n\'ouvre rien', async () => {
      const { root, native, choose } = await setup((h) => { h.disabled.set(true); });
      const click = vi.spyOn(native(), 'click');
      choose().click();
      expect(choose().disabled).toBe(true);
      expect(click).not.toHaveBeenCalled();
      expect(root.querySelector('lc-file-upload')!.getAttribute('aria-disabled')).toBe('true');
    });
  });

  describe('lignes (CA-L2-6)', () => {
    it('une ligne par état : libellé d\'état, icône, barre seulement en cours, alerte seulement en erreur', async () => {
      const { root, rows, settle, host } = await setup();
      host.items.set([
        item('p', { status: 'pending' }),
        item('u', { status: 'uploading', progress: 30 }),
        item('d', { status: 'done' }),
        item('e', { status: 'error' }),
      ]);
      await settle();
      const [pending, uploading, done, error] = rows();
      expect(pending.querySelector('.lc-file-upload__meta')!.textContent).toContain('En attente');
      expect(pending.querySelector('[role=progressbar]')).toBeNull();
      expect(uploading.querySelector('.lc-file-upload__meta')!.textContent).toContain('Envoi en cours… 30 %');
      expect(uploading.querySelector('[role=progressbar]')).not.toBeNull();
      expect(done.querySelector('.lc-file-upload__meta')!.textContent).toContain('Terminé');
      expect(done.querySelector('[role=progressbar]')).toBeNull();
      expect(done.querySelector('[role=alert]')).toBeNull();
      expect(error.querySelector('[role=alert]')).not.toBeNull();
      expect(error.querySelector('.lc-file-upload__meta')!.textContent).not.toContain('Terminé');
      expect(root.querySelectorAll('[role=alert]').length).toBe(1);
    });

    it('la liste est un ul nommé, une ligne est un li ; aucune liste sans élément', async () => {
      const { root, host, settle } = await setup();
      expect(root.querySelector('ul')).toBeNull();
      host.items.set([item('a')]);
      await settle();
      const list = root.querySelector('ul')!;
      expect(list.getAttribute('aria-label')).toBe('Fichiers sélectionnés');
      expect(list.querySelectorAll(':scope > li').length).toBe(1);
    });

    it.each([
      [45, '45'],
      [45.6, '46'],
      [45.4, '45'],
      [0, '0'],
      [100, '100'],
      [150, '100'],
      [-20, '0'],
    ])('progression %s : aria-valuenow arrondi et borné à %s', async (progress, expected) => {
      const { root, host, settle } = await setup();
      host.items.set([item('u', { status: 'uploading', progress })]);
      await settle();
      const bar = root.querySelector<HTMLElement>('[role=progressbar]')!;
      expect(bar.getAttribute('aria-valuenow')).toBe(expected);
      expect(bar.getAttribute('aria-valuemin')).toBe('0');
      expect(bar.getAttribute('aria-valuemax')).toBe('100');
      expect(bar.classList).not.toContain('lc-file-upload__bar--indeterminate');
      expect(root.querySelector<HTMLElement>('.lc-file-upload__bar-fill')!.style.width).toBe(`${expected}%`);
    });

    it.each([[undefined], [null], [Number.NaN]])('progression %s : barre indéterminée sans aria-valuenow', async (progress) => {
      const { root, host, settle } = await setup();
      host.items.set([item('u', { name: 'photo.jpg', status: 'uploading', progress })]);
      await settle();
      const bar = root.querySelector<HTMLElement>('[role=progressbar]')!;
      expect(bar.hasAttribute('aria-valuenow')).toBe(false);
      expect(bar.classList).toContain('lc-file-upload__bar--indeterminate');
      expect(bar.getAttribute('aria-label')).toBe('Envoi de photo.jpg');
      expect(root.querySelector('.lc-file-upload__meta')!.textContent).toContain('Envoi en cours…');
      expect(root.querySelector('.lc-file-upload__meta')!.textContent).not.toContain('%');
    });

    it('message d\'erreur par défaut, puis message fourni par l\'application', async () => {
      const { root, host, settle } = await setup();
      host.items.set([item('e', { status: 'error' })]);
      await settle();
      expect(root.querySelector('[role=alert]')!.textContent!.trim()).toBe('Échec de l\'envoi');
      host.items.set([item('e', { status: 'error', errorMessage: 'Trop volumineux.' })]);
      await settle();
      expect(root.querySelector('[role=alert]')!.textContent!.trim()).toBe('Trop volumineux.');
    });

    it('statusLabel remplace le texte d\'état hors erreur', async () => {
      const { root, host, settle } = await setup();
      host.items.set([item('u', { status: 'uploading', progress: 10, statusLabel: 'Réduction de l\'image' })]);
      await settle();
      const meta = root.querySelector('.lc-file-upload__meta')!.textContent!;
      expect(meta).toContain('Réduction de l\'image');
      expect(meta).not.toContain('Envoi en cours');
    });

    it.each([
      [0, '0 o'],
      [980, '980 o'],
      [999, '999 o'],
      [1500, '1,5 Ko'],
      [640_000, '640 Ko'],
      [2_300_000, '2,3 Mo'],
      [12_400_000, '12,4 Mo'],
      [150_000_000, '150 Mo'],
      [1_500_000_000, '1,5 Go'],
    ])('taille de %s octets lue en français : %s', async (size, text) => {
      const { root, host, settle } = await setup();
      host.items.set([item('a', { size })]);
      await settle();
      expect(root.querySelector('.lc-file-upload__meta')!.textContent).toContain(`${text.replace(' ', ' ')} · Terminé`); // espace insécable entre le nombre et l'unité
    });

    it('taille en anglais : unités et séparateur décimal de la langue', async () => {
      TestBed.configureTestingModule({
        providers: [
          { provide: LC_LABELS, useValue: LC_LABELS_EN },
          { provide: LC_LOCALE, useValue: { locale: 'en-US', currency: 'USD' } },
        ],
      });
      const { root, host, settle } = await setup();
      host.items.set([item('a', { size: 2_300_000 }), item('b', { size: 640_000 }), item('c', { size: 12 })]);
      await settle();
      const metas = Array.from(root.querySelectorAll('.lc-file-upload__meta')).map((meta) => meta.textContent!.replace(/\s+/g, ' ').trim());
      expect(metas).toEqual(['2.3 MB · Done', '640 KB · Done', '12 B · Done']);
    });

    it('aperçu fourni : image décorative ; sans aperçu : icône de fichier', async () => {
      const { root, host, settle, fixture } = await setup();
      host.items.set([item('a', { previewUrl: 'data:image/png;base64,AAAA' }), item('b')]);
      await settle();
      const [withPreview, without] = Array.from(root.querySelectorAll<HTMLElement>('.lc-file-upload__preview'));
      const img = withPreview.querySelector('img')!;
      expect(img.getAttribute('src')).toBe('data:image/png;base64,AAAA');
      expect(img.getAttribute('alt')).toBe('');
      expect(without.querySelector('img')).toBeNull();
      const iconIn = (element: HTMLElement) =>
        fixture.debugElement.queryAll(By.directive(LcIconComponent)).find((d) => element.contains(d.nativeElement))?.componentInstance.name();
      expect(iconIn(withPreview)).toBeUndefined();
      expect(iconIn(without)).toBe('file-text');
    });

    it('un aperçu qui ne se charge pas est remplacé par l\'icône « image indisponible »', async () => {
      const { root, host, settle, fixture } = await setup();
      host.items.set([item('a', { previewUrl: 'https://exemple.invalid/x.png' })]);
      await settle();
      root.querySelector('.lc-file-upload__preview img')!.dispatchEvent(new Event('error'));
      await settle();
      const preview = root.querySelector<HTMLElement>('.lc-file-upload__preview')!;
      expect(preview.querySelector('img')).toBeNull();
      const icon = fixture.debugElement.queryAll(By.directive(LcIconComponent)).find((d) => preview.contains(d.nativeElement))!;
      expect(icon.componentInstance.name()).toBe('image-off');
    });

    it('nom : radical et extension séparés, nom entier en titre ; pas de séparation sans vraie extension', async () => {
      const { root, host, settle } = await setup();
      host.items.set([
        item('1', { name: 'rapport-final.pdf' }),
        item('2', { name: 'archive' }),
        item('3', { name: '.gitignore' }),
        item('4', { name: 'fichier.uneextensiontroplongue' }),
      ]);
      await settle();
      const parts = Array.from(root.querySelectorAll('.lc-file-upload__name')).map((name) => [
        name.querySelector('.lc-file-upload__stem')!.textContent,
        name.querySelector('.lc-file-upload__extension')!.textContent,
        name.getAttribute('title'),
      ]);
      expect(parts).toEqual([
        ['rapport-final', '.pdf', 'rapport-final.pdf'],
        ['archive', '', 'archive'],
        ['.gitignore', '', '.gitignore'],
        ['fichier.uneextensiontroplongue', '', 'fichier.uneextensiontroplongue'],
      ]);
    });

    it('un nom de 200 caractères reste entier dans le DOM et dans le nom accessible de « Retirer »', async () => {
      const name = `${'a'.repeat(196)}.png`;
      const { root, host, settle, removeButtons } = await setup();
      host.items.set([item('l', { name })]);
      await settle();
      expect(root.querySelector('.lc-file-upload__stem')!.textContent).toBe('a'.repeat(196));
      expect(removeButtons()[0].getAttribute('aria-label')).toBe(`Retirer ${name}`);
    });
  });

  describe('retirer et réessayer (CA-L2-7)', () => {
    it('« Retirer » porte le nom accessible « Retirer {nom} » et émet l\'identifiant, sans modifier items', async () => {
      const { host, removeButtons, settle } = await setup((h) => { h.items.set([item('a'), item('b')]); });
      expect(removeButtons().map((button) => button.getAttribute('aria-label'))).toEqual(['Retirer a.pdf', 'Retirer b.pdf']);
      removeButtons()[1].click();
      await settle();
      expect(host.removed).toEqual(['b']);
      expect(host.items().map((i) => i.id)).toEqual(['a', 'b']);
    });

    it('« Réessayer » n\'existe qu\'en erreur, se nomme « Réessayer {nom} », affiche « Réessayer » et émet l\'identifiant', async () => {
      const { root, host, settle } = await setup((h) => { h.items.set([item('a'), item('e', { status: 'error' })]); });
      const retries = Array.from(root.querySelectorAll<HTMLButtonElement>('.lc-file-upload__retry'));
      expect(retries.length).toBe(1);
      expect(retries[0].getAttribute('aria-label')).toBe('Réessayer e.pdf');
      expect(retries[0].textContent!.trim()).toBe('Réessayer');
      retries[0].click();
      await settle();
      expect(host.retried).toEqual(['e']);
      expect(host.items().length).toBe(2);
    });

    it('désactivé : « Retirer » et « Réessayer » sont inertes', async () => {
      const { root, host, removeButtons } = await setup((h) => {
        h.items.set([item('e', { status: 'error' })]);
        h.disabled.set(true);
      });
      const retry = root.querySelector<HTMLButtonElement>('.lc-file-upload__retry')!;
      expect(retry.disabled).toBe(true);
      expect(removeButtons()[0].disabled).toBe(true);
      retry.click();
      removeButtons()[0].click();
      expect(host.retried).toEqual([]);
      expect(host.removed).toEqual([]);
    });
  });

  describe('focus après un retrait (CA-L2-8)', () => {
    const three = () => [item('a'), item('b'), item('c')];
    const without = (id: string) => three().filter((i) => i.id !== id);

    async function removeAndRerender(id: string, remaining: LcFileUploadItem[], index: number, focusRemove = true) {
      const ctx = await setup((h) => { h.items.set(three()); });
      const external = document.createElement('input');
      document.body.appendChild(external);
      if (focusRemove) ctx.removeButtons()[index].focus();
      else external.focus();
      ctx.removeButtons()[index].click();
      ctx.host.items.set(remaining);
      await ctx.settle();
      return { ...ctx, external, cleanup: () => external.remove() };
    }

    it('retrait d\'une ligne du milieu : le focus va à la ligne suivante', async () => {
      const { removeButtons, cleanup } = await removeAndRerender('b', without('b'), 1);
      expect(document.activeElement).toBe(removeButtons()[1]);
      expect(removeButtons()[1].getAttribute('aria-label')).toBe('Retirer c.pdf');
      cleanup();
    });

    it('retrait de la première ligne : le focus va à la nouvelle première', async () => {
      const { removeButtons, cleanup } = await removeAndRerender('a', without('a'), 0);
      expect(document.activeElement).toBe(removeButtons()[0]);
      expect(removeButtons()[0].getAttribute('aria-label')).toBe('Retirer b.pdf');
      cleanup();
    });

    it('retrait de la dernière ligne : le focus va à la précédente', async () => {
      const { removeButtons, cleanup } = await removeAndRerender('c', without('c'), 2);
      expect(document.activeElement).toBe(removeButtons()[1]);
      expect(removeButtons()[1].getAttribute('aria-label')).toBe('Retirer b.pdf');
      cleanup();
    });

    it('retrait de la seule ligne : le focus va au bouton de choix', async () => {
      const ctx = await setup((h) => { h.items.set([item('a')]); });
      ctx.removeButtons()[0].focus();
      ctx.removeButtons()[0].click();
      ctx.host.items.set([]);
      await ctx.settle();
      expect(document.activeElement).toBe(ctx.choose());
    });

    it('le focus n\'est pas volé s\'il était ailleurs', async () => {
      const { external, cleanup } = await removeAndRerender('b', without('b'), 1, false);
      expect(document.activeElement).toBe(external);
      cleanup();
    });

    it('sans retrait demandé, une ligne qui disparaît ne déplace pas le focus', async () => {
      const ctx = await setup((h) => { h.items.set(three()); });
      ctx.host.items.set(without('b'));
      await ctx.settle();
      expect(document.activeElement).toBe(document.body);
    });

    it('un retrait refusé par l\'application (la ligne reste) ne déplace rien', async () => {
      const ctx = await setup((h) => { h.items.set(three()); });
      ctx.removeButtons()[1].focus();
      ctx.removeButtons()[1].click();
      await ctx.settle();
      expect(document.activeElement).toBe(ctx.removeButtons()[1]);
    });
  });

  describe('annonces (CA-L2-8)', () => {
    it('aucune annonce au rendu initial ; la zone est un role=status poli', async () => {
      const { root, status } = await setup((h) => { h.items.set([item('u', { status: 'uploading', progress: 10 })]); });
      expect(status()).toBe('');
      expect(root.querySelector('[role=status]')!.getAttribute('aria-live')).toBe('polite');
    });

    it('début d\'envoi, puis fin d\'envoi', async () => {
      const { host, status, settle } = await setup((h) => { h.items.set([item('u', { name: 'photo.jpg', status: 'pending' })]); });
      host.items.set([item('u', { name: 'photo.jpg', status: 'uploading', progress: 0 })]);
      await settle();
      expect(status()).toBe('Envoi de photo.jpg');
      host.items.set([item('u', { name: 'photo.jpg', status: 'done' })]);
      await settle();
      expect(status()).toBe('photo.jpg : envoi terminé');
    });

    it('un nouveau fichier ajouté directement en cours d\'envoi est annoncé', async () => {
      const { host, status, settle } = await setup();
      host.items.set([item('u', { name: 'neuf.png', status: 'uploading', progress: null })]);
      await settle();
      expect(status()).toBe('Envoi de neuf.png');
    });

    it('jamais d\'annonce à chaque pourcentage', async () => {
      const { host, status, settle } = await setup((h) => { h.items.set([item('u', { name: 'photo.jpg', status: 'pending' })]); });
      host.items.set([item('u', { name: 'photo.jpg', status: 'uploading', progress: 0 })]);
      await settle();
      const announced = status();
      const seen = new Set<string>();
      for (let progress = 5; progress <= 95; progress += 5) {
        host.items.set([item('u', { name: 'photo.jpg', status: 'uploading', progress })]);
        await settle();
        seen.add(status());
      }
      expect([...seen]).toEqual([announced]);
      expect(announced).not.toMatch(/\d/);
    });

    it('un retrait demandé puis effectué est annoncé', async () => {
      const { host, status, removeButtons, settle } = await setup((h) => { h.items.set([item('a', { name: 'a.pdf' }), item('b')]); });
      removeButtons()[0].click();
      host.items.set([item('b')]);
      await settle();
      expect(status()).toBe('a.pdf retiré');
    });

    it('la limite atteinte est annoncée une seule fois, au passage', async () => {
      const { host, status, settle } = await setup((h) => { h.maxFiles.set(2); h.items.set([item('a', { status: 'pending' })]); });
      host.items.set([item('a', { status: 'pending' }), item('b', { status: 'pending' })]);
      await settle();
      expect(status()).toBe('Maximum atteint : 2 fichiers. Vous ne pouvez plus en ajouter.');
    });

    it('l\'erreur est annoncée par le role=alert de sa ligne, pas par la zone de statut', async () => {
      const { root, host, status, settle } = await setup((h) => { h.items.set([item('u', { status: 'uploading', progress: 50 })]); });
      host.items.set([item('u', { status: 'error', errorMessage: 'Raté.' })]);
      await settle();
      expect(root.querySelector('[role=alert]')!.textContent).toContain('Raté.');
      expect(status()).not.toContain('Raté');
    });
  });

  describe('dans lc-form-field (CA-L2-9)', () => {
    async function setupField() {
      const fixture = TestBed.createComponent(UploadInFieldHostComponent);
      await fixture.whenStable();
      const root = fixture.nativeElement as HTMLElement;
      return { fixture, root, group: root.querySelector<HTMLElement>('lc-file-upload')!, label: root.querySelector<HTMLLabelElement>('label')! };
    }

    it('le libellé du champ nomme le groupe (aria-labelledby), sans for ni aria-label', async () => {
      const { group, label } = await setupField();
      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
      expect(group.hasAttribute('aria-label')).toBe(false);
      expect(label.hasAttribute('for')).toBe(false);
    });

    it('l\'aide puis l\'erreur sont reliées par aria-describedby', async () => {
      const { fixture, root, group } = await setupField();
      const hint = root.querySelector('.lc-form-field__hint')!;
      expect(group.getAttribute('aria-describedby')).toBe(hint.id);
      fixture.componentInstance.errors.set(['Un fichier est requis.']);
      await fixture.whenStable();
      const errors = root.querySelector('.lc-form-field__errors')!;
      expect(group.getAttribute('aria-describedby')).toBe(`${hint.id} ${errors.id}`);
    });

    it('l\'état invalide colore le groupe', async () => {
      const { fixture, group } = await setupField();
      expect(group.classList).not.toContain('lc-file-upload--invalid');
      fixture.componentInstance.errors.set(['Un fichier est requis.']);
      await fixture.whenStable();
      expect(group.classList).toContain('lc-file-upload--invalid');
    });

    it('un clic sur le libellé met le focus sur le bouton de choix', async () => {
      const { root, label } = await setupField();
      label.click();
      expect(document.activeElement).toBe(root.querySelector('.lc-file-upload__choose'));
    });

    it('hors du champ, ariaLabel nomme le groupe', async () => {
      const { root } = await setup();
      const group = root.querySelector('lc-file-upload')!;
      expect(group.getAttribute('aria-label')).toBe('Pièces');
      expect(group.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('hors du champ et sans ariaLabel, avertit en développement', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      @Component({ imports: [LcFileUploadComponent], template: '<lc-file-upload />' })
      class BareHostComponent {}
      const fixture = TestBed.createComponent(BareHostComponent);
      await fixture.whenStable();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('ariaLabel'));
      warn.mockRestore();
    });
  });

  describe('libellés et sécurité (CA-L2-2, CA-L2-10)', () => {
    it('libellés français par défaut sur le bouton, la zone et le pluriel', async () => {
      const { root, choose, host, settle } = await setup();
      expect(choose().textContent!.trim()).toBe('Choisir des fichiers');
      expect(root.querySelector('.lc-file-upload__hint')!.textContent).toBe('Glissez vos fichiers ici, ou');
      host.multiple.set(false);
      await settle();
      expect(choose().textContent!.trim()).toBe('Choisir un fichier');
    });

    it('libellés anglais fournis', async () => {
      TestBed.configureTestingModule({ providers: [{ provide: LC_LABELS, useValue: LC_LABELS_EN }] });
      const { root, choose, host, settle } = await setup((h) => { h.items.set([item('e', { name: 'a.pdf', status: 'error' })]); });
      expect(choose().textContent!.trim()).toBe('Choose files');
      expect(root.querySelector('[role=alert]')!.textContent!.trim()).toBe('Upload failed');
      expect(root.querySelector('ul')!.getAttribute('aria-label')).toBe('Selected files');
      expect(root.querySelector('.lc-file-upload__row > button')!.getAttribute('aria-label')).toBe('Remove a.pdf');
      expect(root.querySelector('.lc-file-upload__retry')!.getAttribute('aria-label')).toBe('Retry a.pdf');
      expect(root.querySelector('.lc-file-upload__retry')!.textContent!.trim()).toBe('Retry');
      host.maxFiles.set(1);
      await settle();
      expect(root.querySelector('.lc-file-upload__limit')!.textContent).toBe('Limit reached: 1 file. You cannot add more.');
    });

    it('les libellés FR et EN ont la même forme (aucun libellé de dépôt oublié)', () => {
      const keys = Object.keys(LC_LABELS_FR).filter((key) => key.startsWith('fileUpload') || key === 'fileSizeUnits');
      expect(keys.length).toBe(15);
      expect(Object.keys(LC_LABELS_EN).filter((key) => key.startsWith('fileUpload') || key === 'fileSizeUnits').sort()).toEqual(keys.sort());
    });

    it('un nom de fichier contenant du HTML est rendu comme du texte', async () => {
      const { root, host, settle } = await setup();
      host.items.set([item('x', { name: '<img src=x onerror=alert(1)>.png', errorMessage: '<b>gras</b>', status: 'error' })]);
      await settle();
      expect(root.querySelector('.lc-file-upload__row img')).toBeNull();
      expect(root.querySelector('.lc-file-upload__stem')!.textContent).toBe('<img src=x onerror=alert(1)>');
      expect(root.querySelector('[role=alert] b')).toBeNull();
    });
  });

  describe('icônes (CA-L2-1)', () => {
    it('image-off et circle-off sont au registre par défaut et s\'affichent par lc-icon', async () => {
      expect(Object.keys(LC_DEFAULT_ICONS)).toEqual(expect.arrayContaining(['image-off', 'circle-off']));
      @Component({ imports: [LcIconComponent], template: '<lc-icon name="image-off" /><lc-icon name="circle-off" />' })
      class IconsHostComponent {}
      const fixture = TestBed.createComponent(IconsHostComponent);
      await fixture.whenStable();
      const icons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('lc-icon'));
      expect(icons.map((icon) => icon.querySelector('svg') !== null)).toEqual([true, true]);
    });
  });
});
