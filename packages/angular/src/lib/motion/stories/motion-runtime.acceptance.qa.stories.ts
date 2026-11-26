import { Component } from '@angular/core';
import { moduleMetadata, type Meta, type StoryObj } from '@storybook/angular-vite';
import * as kit from '@lionelcointot/ui-angular';

/**
 * Support des critères CA-4 et CA-19 de la spec 2026-12-mouvement-v2 (tâche T2) ; piloté par `node tools/qa/motion-runtime-browser.mjs`.
 * `lcAnimate` est lu par espace de noms pour que l'absence de l'export fasse échouer le test (et pas la compilation de Storybook).
 */
@Component({
  selector: 'lc-qa-animate',
  template: `
    <div id="qa-default" style="inline-size:40px;block-size:40px;background:currentColor"></div>
    <div id="qa-override" style="inline-size:40px;block-size:40px;background:currentColor;--lc-sys-duration-enter:123ms;--lc-sys-easing-entrance:cubic-bezier(0.1, 0.2, 0.3, 0.4)"></div>
    <div id="qa-wrap" style="--lc-sys-duration-slow:77ms;--lc-sys-easing-out:cubic-bezier(0.4, 0.5, 0.6, 0.7)">
      <div id="qa-inherit" style="inline-size:40px;block-size:40px;background:currentColor"></div>
    </div>
  `,
})
class QaAnimateComponent {
  constructor() {
    (window as unknown as Record<string, unknown>)['__qaLcAnimate'] = (kit as Record<string, unknown>)['lcAnimate'];
  }
}

const meta: Meta = {
  title: 'QA/Motion/Runtime',
  tags: ['!autodocs'],
  decorators: [moduleMetadata({ imports: [QaAnimateComponent] })],
  render: () => ({ template: '<lc-qa-animate />' }),
};
export default meta;
export const Animate: StoryObj = {};
