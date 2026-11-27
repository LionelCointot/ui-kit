// Attentes sur condition pour les harnais navigateur (remplacent les pauses fixes) : `calm` = plus aucune animation finie en cours pendant `ms`.
// Les boucles infinies ne finissent jamais et une animation `fill: forwards` terminée reste dans `getAnimations()` : ni l'une ni l'autre n'est attendue.

/** Attend `ms` de calme (une animation qui démarre dans cette fenêtre la prolonge) ; faux après `timeout` ms. */
export const calm = (page, ms = 250, timeout = 15000) => page.evaluate(async ({ ms, timeout }) => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const running = () => document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending));
  const end = performance.now() + timeout;
  let calmSince = performance.now();
  await frame();
  while (performance.now() < end) {
    if (running()) calmSince = performance.now();
    else if (performance.now() - calmSince >= ms) return true;
    await frame();
  }
  return false;
}, { ms, timeout });

/** Attend que la boîte de `selector` ne bouge plus pendant 5 images (un élément à animation longue ou infinie, comme un toast). */
export const stable = (page, selector, timeout = 15000) => page.evaluate(async ({ selector, timeout }) => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const key = () => JSON.stringify(document.querySelector(selector)?.getBoundingClientRect());
  const end = performance.now() + timeout;
  let last = key(), same = 0;
  while (performance.now() < end) {
    await frame();
    const now = key();
    same = now === last ? same + 1 : 0;
    last = now;
    if (same >= 5) return true;
  }
  return false;
}, { selector, timeout });
