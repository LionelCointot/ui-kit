import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LcHighlightComponent } from './highlight.component';

@Component({
  imports: [LcHighlightComponent],
  template: '<span [lcHighlight]="label" [lcHighlightTerm]="term"></span>',
})
class HighlightHostComponent {
  label = '<b>Rhône</b> & Alpes';
  term = 'rhone';
}

describe('LcHighlightComponent', () => {
  it('entoure les correspondances de <mark> et échappe le texte', async () => {
    const fixture = TestBed.createComponent(HighlightHostComponent);
    await fixture.whenStable();
    const host = (fixture.nativeElement as HTMLElement).querySelector('span')!;
    expect(host.querySelectorAll('mark')).toHaveLength(1);
    expect(host.querySelector('mark')!.textContent).toBe('Rhône');
    expect(host.textContent).toBe('<b>Rhône</b> & Alpes');
    expect(host.querySelector('b')).toBeNull();
  });
});
