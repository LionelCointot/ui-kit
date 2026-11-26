// Acceptation navigateur de docs/specs/2026-12-mouvement-v2.md, tâche T2 : CA-19 (`lcAnimate`) et CA-4 (préférence de mouvement réduit changée en cours de session).
// Chrome réel (Playwright, channel chrome) sur le Storybook statique (`npm run build-storybook`, dist/storybook ; STORYBOOK_DIR pour une autre construction).
//   node tools/qa/motion-runtime-browser.mjs
// Story : QA/Motion/Runtime (packages/angular/src/lib/motion/stories/motion-runtime.acceptance.qa.stories.ts). Les valeurs attendues viennent de la spec (§5.2). Code de sortie 1 au moindre échec.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const server = await new Promise((ok) => { const s = createServer(async (rq, rs) => { let body; let f; try { f = path.join(dir, path.normalize(decodeURIComponent(new URL(rq.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')); body = await readFile(f); } catch { rs.writeHead(404).end(); return; } rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }).end(body); }); s.listen(0, '127.0.0.1', () => ok(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${name}${ok ? '' : ` : ${detail}`}`); };
const bezier = (s) => (/^cubic-bezier\(([^)]*)\)$/.exec(s)?.[1] ?? '').split(',').map(Number);
const sameBezier = (actual, expected) => { const a = bezier(actual); return a.length === 4 && a.every((n, i) => Math.abs(n - expected[i]) <= 1e-3); };

/** Lance `lcAnimate` sur un élément de la story et renvoie ce qu'on en observe (même `evaluate` : rien ne se passe entre l'appel et la lecture). */
const RUN = ({ selector, duration, easing }) => {
  const lcAnimate = window.__qaLcAnimate;
  if (typeof lcAnimate !== 'function') return { missing: true };
  const el = document.querySelector(selector);
  const anim = lcAnimate(el, [{ opacity: 0 }, { opacity: 1 }], { duration, easing });
  const timing = anim.effect?.getTiming();
  const out = { playState: anim.playState, duration: timing?.duration ?? null, easing: timing?.easing ?? null, hasFinished: typeof anim.finished?.then === 'function' };
  anim.cancel();
  return out;
};

async function open(ctx) {
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/iframe.html?id=qa-motion-runtime--animate&viewMode=story`);
  await page.waitForSelector('#qa-default', { state: 'attached', timeout: 20000 });
  page.errors = errors;
  return page;
}
const run = (page, args) => page.evaluate(RUN, args);

try {
  // ---------- CA-19 : lecture des tokens par nom de rôle (mouvement normal) ----------
  const normal = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
  {
    const page = await open(normal);
    const first = await run(page, { selector: '#qa-default', duration: 'enter', easing: 'entrance' });
    check('CA-19 lcAnimate est exporté par @lionelcointot/ui-angular', !first.missing, 'window.__qaLcAnimate absent : l\'export `lcAnimate` n\'existe pas');
    if (!first.missing) {
      check('CA-19 durée « enter » = 450 ms (§5.2)', first.duration === 450, String(first.duration));
      check('CA-19 courbe « entrance » = cubic-bezier(0.16, 1, 0.3, 1) (§5.2)', sameBezier(first.easing, [0.16, 1, 0.3, 1]), String(first.easing));
      check('CA-19 mouvement normal : l\'animation n\'est pas déjà finie', first.playState === 'running' || first.playState === 'pending', first.playState);
      const other = await run(page, { selector: '#qa-default', duration: 'draw', easing: 'pop' });
      check('CA-19 autre rôle : « draw » = 900 ms, « pop » = cubic-bezier(0.34, 1.7, 0.64, 1)', other.duration === 900 && sameBezier(other.easing, [0.34, 1.7, 0.64, 1]), JSON.stringify(other));
      const own = await run(page, { selector: '#qa-override', duration: 'enter', easing: 'entrance' });
      check('CA-19 tokens posés sur l\'élément : 123 ms et cubic-bezier(0.1, 0.2, 0.3, 0.4)', own.duration === 123 && sameBezier(own.easing, [0.1, 0.2, 0.3, 0.4]), JSON.stringify(own));
      const inherited = await run(page, { selector: '#qa-inherit', duration: 'slow', easing: 'out' });
      check('CA-19 tokens hérités d\'un ancêtre : 77 ms et cubic-bezier(0.4, 0.5, 0.6, 0.7)', inherited.duration === 77 && sameBezier(inherited.easing, [0.4, 0.5, 0.6, 0.7]), JSON.stringify(inherited));
      await page.evaluate(() => document.querySelector('#qa-default').style.setProperty('--lc-sys-duration-enter', '321ms'));
      const reread = await run(page, { selector: '#qa-default', duration: 'enter', easing: 'entrance' });
      check('CA-19 les tokens sont relus à chaque appel (321 ms après changement)', reread.duration === 321, String(reread.duration));
    }
    await page.close();
  }

  // ---------- CA-19 : sans Element.animate ----------
  {
    const page = await open(normal);
    const result = await page.evaluate(async () => {
      const lcAnimate = window.__qaLcAnimate;
      if (typeof lcAnimate !== 'function') return { missing: true };
      delete Element.prototype.animate;
      try {
        const anim = lcAnimate(document.querySelector('#qa-default'), [{ opacity: 0 }, { opacity: 1 }], { duration: 'enter', easing: 'entrance' });
        const state = anim.playState;
        await anim.finished;
        return { state };
      } catch (error) { return { error: String(error) }; }
    });
    check('CA-19 sans Element.animate : aucune exception, animation déjà finie', !result.missing && result.state === 'finished', JSON.stringify(result));
    await page.close();
  }
  await normal.close();

  // ---------- CA-19 : mouvement réduit ----------
  {
    const reduced = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const page = await open(reduced);
    const result = await page.evaluate(async () => {
      const lcAnimate = window.__qaLcAnimate;
      if (typeof lcAnimate !== 'function') return { missing: true };
      const el = document.querySelector('#qa-default');
      const anim = lcAnimate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 'enter', easing: 'entrance' });
      const state = anim.playState;
      await anim.finished;
      return { state, running: el.getAnimations().filter((a) => a.playState === 'running' || a.playState === 'pending').length };
    });
    check('CA-19 mouvement réduit : animation déjà finie, aucune animation en cours sur l\'élément', !result.missing && result.state === 'finished' && result.running === 0, JSON.stringify(result));
    await page.close();
    await reduced.close();
  }

  // ---------- CA-4 : la préférence change en cours de session, sans rechargement ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'no-preference' });
    const page = await open(ctx);
    const steps = ['no-preference', 'reduce', 'no-preference', 'reduce', 'no-preference'];
    for (const [index, reducedMotion] of steps.entries()) {
      await page.emulateMedia({ reducedMotion });
      const out = await run(page, { selector: '#qa-default', duration: 'enter', easing: 'entrance' });
      const finished = out.playState === 'finished';
      const expectFinished = reducedMotion === 'reduce';
      const ok = !out.missing && finished === expectFinished && (expectFinished || out.duration === 450);
      check(`CA-4 étape ${index + 1}/${steps.length} : ${reducedMotion} → ${expectFinished ? 'animation finie' : 'animation jouée (450 ms)'} au déclenchement suivant`, ok, out.missing ? 'lcAnimate absent' : JSON.stringify(out));
    }
    await page.close();
    await ctx.close();
  }
} finally { await browser.close(); server.close(); }
console.log(failures ? `${failures} échec(s)` : 'tout est vert');
process.exit(failures > 0 ? 1 : 0);
