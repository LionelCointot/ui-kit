import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LcSplitTextDirective } from './split-text.directive';

@Component({ imports: [LcSplitTextDirective], template: `<h1 [lcSplitText]="text()">x</h1>` })
class HostComponent {
  readonly text = signal('Un titre');
}

const render = (platform: 'browser' | 'server' = 'browser') => {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.detectChanges();
  return { fixture, h1: fixture.nativeElement.querySelector('h1') as HTMLElement };
};
const letters = (h1: HTMLElement) => [...h1.querySelectorAll('span.lc-split-char')].map((s) => s.textContent);

describe('LcSplitTextDirective', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('découpe : un mot masque par mot, lettres aria-hidden numérotées, aria-label = texte complet', () => {
    const { h1 } = render();
    expect(h1.getAttribute('aria-label')).toBe('Un titre');
    expect(h1.querySelectorAll('.lc-split-word')).toHaveLength(2);
    expect(letters(h1)).toEqual([...'Untitre']);
    expect([...h1.querySelectorAll('.lc-split-char')].every((l) => l.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect((h1.querySelectorAll('.lc-split-char')[3] as HTMLElement).style.getPropertyValue('--lc-split-rank')).toBe('3');
  });

  it('changer le texte met tout à jour, sans lettre résiduelle', () => {
    const { fixture, h1 } = render();
    fixture.componentInstance.text.set('Rapports');
    fixture.detectChanges();
    expect(letters(h1)).toEqual([...'Rapports']);
    expect(h1.getAttribute('aria-label')).toBe('Rapports');
  });

  it('rendu serveur simulé : texte brut, aucun span, aucun aria-label', () => {
    const { h1 } = render('server');
    expect(h1.querySelectorAll('span')).toHaveLength(0);
    expect(h1.textContent).toBe('Un titre');
    expect(h1.hasAttribute('aria-label')).toBe(false);
  });

  it('mouvement réduit : texte brut, aucun span, aucun aria-label', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { h1 } = render();
    expect(h1.querySelectorAll('span')).toHaveLength(0);
    expect(h1.textContent).toBe('Un titre');
    expect(h1.hasAttribute('aria-label')).toBe(false);
  });
});
