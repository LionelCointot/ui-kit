import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import type { ArgTypes } from '@storybook/angular-vite';

/**
 * Aides partagées par les stories (importées via l'alias `@lc/storybook`, jamais livrées dans le paquet).
 * L'extraction Angular ne déplie pas les unions nommées (`LcFillMode`…) : on déclare leurs options ici.
 */
export const themeColorOptions = ['primary', 'secondary', 'success', 'warning', 'error', 'highlight', 'neutral'] as const;
export const fillModeOptions = ['solid', 'outline', 'flat'] as const;
export const sizeOptions = ['small', 'medium', 'large'] as const;
export const roundedOptions = ['none', 'small', 'medium', 'large', 'full'] as const;

/** Contrôles de l'API commune (`themeColor`, `fillMode`, `size`, `rounded`) : ne garder que ceux que le composant expose. */
export const commonArgTypes = {
  themeColor: { control: 'select', options: themeColorOptions },
  fillMode: { control: 'inline-radio', options: fillModeOptions },
  size: { control: 'inline-radio', options: sizeOptions },
  rounded: { control: 'select', options: roundedOptions },
} satisfies ArgTypes;

/** Paramètres d'une story d'exemple figée : son gabarit ignore les args, le panneau Controls est donc masqué. */
export const fixedExample = { controls: { disable: true } } as const;

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/** True when the system asks to reduce motion. */
export const prefersReducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia(REDUCED_MOTION).matches;

/** Value of a time token (`--lc-sys-duration-move`…) in milliseconds, resolved on `element`. */
export const tokenMs = (element: Element, name: string): number => {
  const value = getComputedStyle(element).getPropertyValue(name).trim();
  return value.endsWith('ms') ? parseFloat(value) : parseFloat(value) * 1000;
};

/** Banner above an animation demo, shown while the system reduces motion and following its changes. */
@Component({
  selector: 'lc-story-motion-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (reduced()) {
    <p role="status">Les animations sont réduites par votre système : rien ne bouge dans cette démo.</p>
  }`,
  styles: `
    :host { display: block; }
    p { margin: 0 0 var(--lc-sys-space-4); padding: var(--lc-sys-space-3) var(--lc-sys-space-4); border-radius: var(--lc-sys-radius-md);
      background: var(--lc-sys-color-info-container); color: var(--lc-sys-color-on-info-container); font-size: var(--lc-sys-font-size-sm); }
  `,
})
export class StoryMotionNoticeComponent {
  protected readonly reduced = signal(prefersReducedMotion());

  constructor() {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia(REDUCED_MOTION);
    const update = (event: MediaQueryListEvent) => this.reduced.set(event.matches);
    query.addEventListener('change', update);
    inject(DestroyRef).onDestroy(() => query.removeEventListener('change', update));
  }
}

interface Replay {
  /** Runs at once, before the demo is reinserted: puts the state back to its starting point. */
  reset?: () => void;
  /** Runs `wait` ms later, once the new demo is rendered: `later(ms, step)` chains further steps; `root` wraps the demo. */
  play?: (later: (ms: number, step: () => void) => void, root: HTMLElement) => void;
  /** Delay before `play` (default 250 ms: enough for the first measurement of the reinserted demo). */
  wait?: number;
}

/** "Rejouer" state of a demo: `keys()` changes at every `replay(root)`, so `@for (key of keys(); track key)` reinserts the demo. */
export function replayable({ reset, play, wait = 250 }: Replay = {}) {
  const run = signal(0);
  let timers: ReturnType<typeof setTimeout>[] = [];
  const later = (ms: number, step: () => void) => void timers.push(setTimeout(step, ms));
  return {
    keys: computed(() => [run()]),
    replay: (root: HTMLElement) => {
      timers.forEach(clearTimeout);
      timers = [];
      reset?.();
      run.update((n) => n + 1);
      if (play) later(wait, () => play(later, root));
    },
  };
}

/** Plays the press of a `lcButton` by script (the real one only follows the pointer): same scale and duration tokens, nothing under reduced motion. */
export function pressButton(button: HTMLElement | null): void {
  if (!button || prefersReducedMotion()) return;
  const scale = getComputedStyle(button).getPropertyValue('--lc-button-press-scale').trim();
  const duration = tokenMs(button, '--lc-button-press-duration');
  const easing = getComputedStyle(button).getPropertyValue('--lc-sys-easing-standard').trim();
  if (!scale || !duration) return;
  button.animate(
    [{ transform: 'scale(1)' }, { transform: `scale(${scale})`, offset: 0.25 }, { transform: `scale(${scale})`, offset: 0.5 }, { transform: 'scale(1)' }],
    { duration: duration * 4, easing },
  );
}
