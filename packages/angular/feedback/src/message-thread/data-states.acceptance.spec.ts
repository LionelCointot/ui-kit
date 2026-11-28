import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { LC_LABELS } from '@lionelcointot/ui-angular';
import { LcMessageThreadComponent } from './message-thread.component';
import type { LcThreadMessage } from './message-thread.model';

// Spec 2026-12-squelette-automatique, CA-2 à CA-5 et CA-7, composant 12 (§5.3). Un seul composant : `describe.each` sur la forme de la donnée vide.
const messages: LcThreadMessage[] = [{ id: '1', authorId: 'a', authorName: 'Alice', mine: false, sentAt: new Date(2026, 10, 18, 9, 0).toISOString(), text: 'Bonjour Alice' }];
const BUBBLE = '.lc-message-thread__bubble';
const STALE = 'lc-message-thread--stale';

async function render(inputs: Record<string, unknown>) {
  const fixture = TestBed.createComponent(LcMessageThreadComponent);
  await set(fixture, inputs);
  return { fixture, host: fixture.nativeElement as HTMLElement };
}
async function set(fixture: ComponentFixture<unknown>, inputs: Record<string, unknown>) {
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  await fixture.whenStable();
}
const text = (host: HTMLElement) => host.textContent!.replace(/\s+/g, ' ');
const busy = (host: HTMLElement) => host.getAttribute('aria-busy');

describe('états de données : 12 lc-message-thread', () => {
  const noData = () => TestBed.inject(LC_LABELS).noData;

  function expectSkeleton(host: HTMLElement) {
    expect(host.querySelectorAll('lc-skeleton').length).toBeGreaterThan(0);
    expect(host.querySelectorAll(BUBBLE).length).toBe(0);
    expect(text(host)).not.toContain(noData());
    expect(text(host)).not.toContain('—');
    expect(text(host)).not.toContain('Bonjour Alice');
    expect(busy(host)).toBe('true');
  }
  function expectEmpty(host: HTMLElement, message = noData()) {
    expect(text(host)).toContain(message);
    expect(host.querySelector('lc-skeleton')).toBeNull();
    expect(host.hasAttribute('aria-busy')).toBe(false);
    expect(host.querySelectorAll(BUBBLE).length).toBe(0);
  }

  it('CA-2 : undefined affiche le squelette, ni texte vide, ni bulle, aria-busy', async () => {
    expectSkeleton((await render({ messages: undefined })).host);
  });

  it.each([['null', null], ['[]', []]])('CA-3a CA-3b CA-3d : %s affiche l\'état vide, sans squelette ni aria-busy', async (_, value) => {
    expectEmpty((await render({ messages: value })).host);
  });

  it('CA-3a : emptyMessage remplace noData, une chaîne vide retombe sur noData', async () => {
    const { fixture, host } = await render({ messages: null, emptyMessage: 'Rien ici' });
    expectEmpty(host, 'Rien ici');
    await set(fixture, { emptyMessage: '' });
    expectEmpty(host);
  });

  it('CA-4 : loading avec des messages affiche le squelette, pas les bulles', async () => {
    const { fixture, host } = await render({ messages });
    expect(host.querySelectorAll(BUBBLE).length).toBe(1);
    expect(host.hasAttribute('aria-busy')).toBe(false);
    await set(fixture, { loading: true });
    expectSkeleton(host);
  });

  it('CA-5 CA-7 : stale garde les bulles, aria-busy et classe, sans squelette ; undefined : squelette sans classe ; séquence valeurs, undefined, valeurs', async () => {
    const { fixture, host } = await render({ messages });
    expect(host.classList).not.toContain(STALE);
    await set(fixture, { stale: true });
    expect(host.querySelectorAll(BUBBLE).length).toBe(1);
    expect(busy(host)).toBe('true');
    expect(host.classList).toContain(STALE);
    expect(host.querySelector('lc-skeleton')).toBeNull();
    await set(fixture, { messages: undefined });
    expectSkeleton(host);
    expect(host.classList).not.toContain(STALE);
    await set(fixture, { messages });
    expect(host.querySelectorAll(BUBBLE).length).toBe(1);
    expect(host.querySelector('lc-skeleton')).toBeNull();
    await set(fixture, { stale: false });
    expect(host.hasAttribute('aria-busy')).toBe(false);
  });
});
