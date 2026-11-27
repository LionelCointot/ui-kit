import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LcPageComponent } from './page.component';

function mount() {
  const fixture = TestBed.createComponent(LcPageComponent);
  fixture.componentRef.setInput('title', 'Tableau de bord');
  fixture.detectChanges();
  const host = fixture.nativeElement as HTMLElement;
  const end = (target: Element, animationName: string) => {
    target.dispatchEvent(Object.assign(new Event('animationend', { bubbles: true }), { animationName }));
    fixture.detectChanges();
  };
  return { fixture, host, end };
}

describe('lc-page : entrée de page (couches de délai)', () => {
  it('porte lc-page--entering jusqu\'à la fin de la fenêtre, puis plus : aucun délai de couche ensuite', () => {
    const { host, end } = mount();
    expect(host.classList).toContain('lc-page--entering');
    end(host.querySelector('.lc-page__line')!, 'lc-title-line-in'); // l'animation d'un enfant ne la termine pas
    expect(host.classList).toContain('lc-page--entering');
    end(host, 'lc-page-entering');
    expect(host.classList).not.toContain('lc-page--entering');
  });

  it('chaque nouvelle page (changement de page) repart d\'une entrée', () => {
    const first = mount();
    first.end(first.host, 'lc-page-entering');
    expect(first.host.classList).not.toContain('lc-page--entering');
    expect(mount().host.classList).toContain('lc-page--entering');
  });
});
