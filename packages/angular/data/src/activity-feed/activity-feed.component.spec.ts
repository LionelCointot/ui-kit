import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcActivityFeedComponent } from './activity-feed.component';
import { LcActivityItemComponent } from './activity-item.component';

interface Entry { heading: string; icon?: string; date?: string; dateTime?: string; content?: string }

@Component({
  imports: [LcActivityFeedComponent, LcActivityItemComponent],
  template: `
    <ol lcActivityFeed [density]="density()">
      @for (entry of entries(); track entry.heading) {
        <li lcActivityItem [heading]="entry.heading" [icon]="entry.icon" [date]="entry.date" [dateTime]="entry.dateTime">
          @if (entry.content) { <span class="payload">{{ entry.content }}</span> }
        </li>
      }
    </ol>
  `,
})
class FeedHostComponent {
  readonly density = signal<'comfortable' | 'compact'>('comfortable');
  readonly entries = signal<Entry[]>([
    { heading: 'Étape validée', icon: 'check', date: '12 mars', dateTime: '2026-03-12', content: 'Terminé' },
    { heading: 'Valeur modifiée', icon: 'pencil', date: '10 mars', content: 'Avant puis après' },
    { heading: 'Élément créé' },
  ]);
}

describe('LcActivityFeedComponent et LcActivityItemComponent (D2)', () => {
  async function setup(entries?: Entry[]) {
    const fixture = TestBed.createComponent(FeedHostComponent);
    if (entries) fixture.componentInstance.entries.set(entries);
    await fixture.whenStable();
    const feed = (fixture.nativeElement as HTMLElement).querySelector('ol')!;
    const items = () => Array.from(feed.querySelectorAll<HTMLElement>(':scope > li'));
    return { fixture, feed, items };
  }

  describe('structure', () => {
    it('CA-D2 : l\'hôte est un <ol> avec role="list" et chaque élément un <li>', async () => {
      const { feed, items } = await setup();
      expect(feed.tagName).toBe('OL');
      expect(feed.getAttribute('role')).toBe('list');
      expect(feed.classList).toContain('lc-activity-feed');
      expect(items()).toHaveLength(3);
      for (const item of items()) {
        expect(item.tagName).toBe('LI');
        expect(item.classList).toContain('lc-activity-item');
      }
    });

    it('CA-D2 : deux densités : confortable par défaut, compacte sur demande, et retour', async () => {
      const { fixture, feed } = await setup();
      expect(feed.classList).not.toContain('lc-activity-feed--compact');
      fixture.componentInstance.density.set('compact');
      await fixture.whenStable();
      expect(feed.classList).toContain('lc-activity-feed--compact');
      fixture.componentInstance.density.set('comfortable');
      await fixture.whenStable();
      expect(feed.classList).not.toContain('lc-activity-feed--compact');
    });
  });

  describe('contenu d\'un élément', () => {
    it('CA-D2 : titre, icône, contenu projeté et date sont rendus', async () => {
      const { items } = await setup();
      const first = items()[0];
      expect(first.querySelector('.lc-activity-item__heading')!.textContent).toBe('Étape validée');
      expect(first.querySelector('.lc-activity-item__dot lc-icon svg')).not.toBeNull();
      expect(first.querySelector('.lc-activity-item__content .payload')!.textContent).toBe('Terminé');
      expect(first.querySelector('time')!.textContent).toBe('12 mars');
    });

    it('CA-D2 : l\'icône est décorative (aria-hidden) ; sans icône, la pastille est vide', async () => {
      const { items } = await setup();
      expect(items()[0].querySelector('.lc-activity-item__dot lc-icon')!.getAttribute('aria-hidden')).toBe('true');
      const bare = items()[2];
      expect(bare.querySelector('.lc-activity-item__dot')).not.toBeNull();
      expect(bare.querySelector('.lc-activity-item__dot lc-icon')).toBeNull();
      expect(bare.querySelector('svg')).toBeNull();
    });

    it('CA-D2 : l\'icône suit son nom (deux noms, deux dessins)', async () => {
      const { items } = await setup();
      const shapes = items().slice(0, 2).map((item) => item.querySelector('lc-icon svg')!.innerHTML);
      expect(shapes[0]).not.toBe('');
      expect(shapes[0]).not.toBe(shapes[1]);
    });

    it('CA-D2 : <time> n\'existe que si `date` est fourni', async () => {
      const { items } = await setup();
      expect(items()[0].querySelector('time')).not.toBeNull();
      expect(items()[2].querySelector('time')).toBeNull();
    });

    it('CA-D2 : `datetime` est posé seulement si `dateTime` est fourni', async () => {
      const { items } = await setup();
      expect(items()[0].querySelector('time')!.getAttribute('datetime')).toBe('2026-03-12');
      expect(items()[1].querySelector('time')!.hasAttribute('datetime')).toBe(false);
      expect(items()[1].querySelector('time')!.textContent).toBe('10 mars');
    });

    it('CA-D2 : sans contenu projeté, la zone de contenu est vide', async () => {
      const { items } = await setup();
      const content = items()[2].querySelector('.lc-activity-item__content')!;
      expect(content.children).toHaveLength(0);
      expect(content.textContent).toBe('');
    });

    it('CA-D2 : l\'icône, la date et le contenu se mettent à jour avec les entrées', async () => {
      const { fixture, items } = await setup();
      fixture.componentInstance.entries.set([{ heading: 'Étape validée', date: '13 mars', dateTime: '2026-03-13' }]);
      await fixture.whenStable();
      expect(items()[0].querySelector('lc-icon')).toBeNull();
      expect(items()[0].querySelector('time')!.getAttribute('datetime')).toBe('2026-03-13');
    });
  });

  describe('cas limites (structure seulement : le trait de liaison se vérifie sur le rendu réel)', () => {
    it('CA-D2 : un fil vide est une liste sans élément', async () => {
      const { feed, items } = await setup([]);
      expect(feed.getAttribute('role')).toBe('list');
      expect(items()).toHaveLength(0);
      expect(feed.querySelector('time, lc-icon, .lc-activity-item__dot')).toBeNull();
    });

    it('CA-D2 : un seul élément est à la fois premier et dernier enfant', async () => {
      const { items } = await setup([{ heading: 'Élément créé', icon: 'history' }]);
      expect(items()).toHaveLength(1);
      expect(items()[0].matches(':first-child:last-child')).toBe(true);
    });

    it('CA-D2 : seul le dernier élément d\'un fil de trois est :last-child', async () => {
      const { items } = await setup();
      expect(items().map((item) => item.matches(':last-child'))).toEqual([false, false, true]);
    });

    it('CA-D2 : un titre sans espace très long est rendu en entier (le retour à la ligne se vérifie sur le rendu réel)', async () => {
      const long = 'X'.repeat(300);
      const { items } = await setup([{ heading: long, content: long }]);
      expect(items()[0].querySelector('.lc-activity-item__heading')!.textContent).toBe(long);
      expect(items()[0].querySelector('.payload')!.textContent).toBe(long);
    });
  });
});
