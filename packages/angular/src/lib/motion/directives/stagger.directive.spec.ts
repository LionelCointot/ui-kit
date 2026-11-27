import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LcRevealDirective } from './reveal.directive';
import { LcStaggerDirective, type LcStaggerPace } from './stagger.directive';

@Component({
  imports: [LcRevealDirective, LcStaggerDirective],
  template: `
    <section id="default" lcStagger><b lcReveal></b></section>
    <section id="empty" lcStagger=""><b lcReveal></b></section>
    <section id="paced" [lcStagger]="pace()">
      <b lcReveal></b>
      <section id="inner" lcStagger="fine"><b lcReveal data-nested></b><b lcReveal data-nested></b></section>
      <b lcReveal></b>
    </section>
  `,
})
class HostComponent {
  readonly pace = signal<LcStaggerPace>('cards');
}

describe('LcStaggerDirective', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const section = (id: string) => fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    return { fixture, pace: (id: string) => section(id).style.getPropertyValue('--lc-stagger-pace'), section };
  };

  it('le rythme par défaut (sans valeur ou lcStagger vide) est normal', () => {
    const { pace } = setup();
    expect(pace('default')).toBe('var(--lc-sys-motion-stagger-normal)');
    expect(pace('empty')).toBe('var(--lc-sys-motion-stagger-normal)');
  });

  it('le rythme lit le token --lc-sys-motion-stagger-<rythme>, et suit son entrée', () => {
    const { fixture, pace } = setup();
    expect(pace('paced')).toBe('var(--lc-sys-motion-stagger-cards)');
    fixture.componentInstance.pace.set('fine');
    fixture.detectChanges();
    expect(pace('paced')).toBe('var(--lc-sys-motion-stagger-fine)');
  });

  it('chaque lcStagger compte ses propres éléments : le plus proche fait foi', () => {
    const { section } = setup();
    const rank = (el: Element) => (el as HTMLElement).style.getPropertyValue('--lc-reveal-rank');
    expect([...section('inner').children].map(rank)).toEqual(['0', '1']);
    expect([...section('paced').querySelectorAll(':scope > b')].map(rank)).toEqual(['0', '1']);
    expect(rank(section('default').firstElementChild!)).toBe('0');
  });
});
