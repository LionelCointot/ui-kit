// Acceptation navigateur de la tâche T9a de docs/specs/2026-12-mouvement-v2.md (Chromium, Storybook statique dist/storybook ; STORYBOOK_DIR pour une autre construction).
//   node tools/qa/overlays-motion-browser.mjs      CA-23 (présentation en lc-sheet à 767 / 768 px, origine du dialogue souris et clavier) + cascade du contenu du tiroir (§5.4.1)
// Story : QA/Overlays/Motion v2 (`qa-overlays-motion-v2--overlays`). Les valeurs attendues viennent de la spec (§5.4.1), pas du code.
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
const server = await new Promise((ok) => { const s = createServer(async (rq, rs) => { try { const f = path.join(dir, path.normalize(decodeURIComponent(new URL(rq.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '')); rs.writeHead(200, { 'content-type': TYPES[path.extname(f)] ?? 'application/octet-stream' }).end(await readFile(f)); } catch { rs.writeHead(404).end(); } }); s.listen(0, '127.0.0.1', () => ok(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
let failures = 0;
const check = (name, ok, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${name}${ok ? '' : ` : ${detail}`}`); };
const near = (a, b, eps = 0.5) => Math.abs(a - b) <= eps;
const STORY = 'qa-overlays-motion-v2--overlays';

async function open(width) {
  const context = await browser.newContext({ viewport: { width, height: 800 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${base}/iframe.html?id=${STORY}&viewMode=story`);
  await page.waitForSelector('#qa-open-dialog', { timeout: 20000 });
  return { context, page, errors };
}
const results = (page) => page.evaluate(() => (window.__qa?.results ?? []).map((r) => r.slice()));

// CA-23 : présentation. À 767 px le contenu est dans un `lc-sheet` ouvert ; à 768 px, aucun `lc-sheet` (carte ou panneau latéral).
for (const width of [767, 768]) {
  const sheet = width === 767;
  for (const [kind, button, ok, role] of [['dialog', '#qa-open-dialog', '#qa-dialog-ok', 'dialog'], ['drawer', '#qa-open-drawer', '#qa-drawer-ok', 'dialog'], ['confirm', '#qa-open-confirm', null, 'alertdialog']]) {
    const { context, page, errors } = await open(width);
    await page.click(button);
    await page.waitForSelector(`[role="${role}"]`, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(800);
    const got = await page.evaluate((s) => ({ sheets: document.querySelectorAll('lc-sheet').length, openSheet: document.querySelectorAll('lc-sheet dialog[open]').length, inSheet: s.ok ? !!document.querySelector(`lc-sheet dialog[open] ${s.ok}`) : null, alert: !!document.querySelector('lc-sheet [role="alertdialog"], lc-sheet[role="alertdialog"]'), anyAlert: !!document.querySelector('[role="alertdialog"]') }), { ok });
    if (sheet) check(`CA-23 ${width} px ${kind} : présenté dans un lc-sheet ouvert`, got.openSheet === 1 && (ok ? got.inSheet : true) && (role === 'alertdialog' ? got.alert : true), JSON.stringify(got));
    else check(`CA-23 ${width} px ${kind} : pas de lc-sheet (carte ou panneau latéral)`, got.sheets === 0 && (role === 'alertdialog' ? got.anyAlert : true), JSON.stringify(got));
    // La feuille rend la valeur à la fermeture (aucune donnée perdue) ; Échap ferme aussi.
    if (ok) {
      await page.click(ok);
      await page.waitForFunction(() => (window.__qa?.results.length ?? 0) > 0, null, { timeout: 4000 }).catch(() => {});
      check(`CA-23 ${width} px ${kind} : closed émis avec la valeur`, (await results(page))[0]?.[1] === `valeur-${kind === 'drawer' ? 'tiroir' : 'dialogue'}`, JSON.stringify(await results(page)));
    } else {
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => (window.__qa?.results.length ?? 0) > 0, null, { timeout: 4000 }).catch(() => {});
      check(`CA-23 ${width} px ${kind} : Échap résout la confirmation à false`, (await results(page))[0]?.[1] === false, JSON.stringify(await results(page)));
    }
    check(`CA-23 ${width} px ${kind} : sans erreur de page`, errors.length === 0, errors.join(' ; '));
    await context.close();
  }
}

// Code exécuté dans la page : relève, à la première image où elle apparaît, l'animation d'échelle du dialogue (cible dans la surcouche, hors fond), la met à sa fin et lit son origine.
const WATCH = () => {
  const w = (window.__origin = { rec: null });
  const loop = () => {
    for (const a of document.getAnimations()) {
      const t = a.effect?.target;
      if (w.rec || !t?.closest?.('.cdk-overlay-container') || t.classList.contains('cdk-overlay-backdrop')) continue;
      const end = a.effect.getComputedTiming().endTime;
      if (!Number.isFinite(end)) continue;
      a.pause(); a.currentTime = 0;
      const r0 = t.getBoundingClientRect();
      a.currentTime = end;
      const r1 = t.getBoundingClientRect();
      if (Math.abs(r0.width - r1.width) < 1) continue; // pas l'animation d'échelle
      const cs = getComputedStyle(t);
      const [ox, oy] = cs.transformOrigin.split(' ').map(parseFloat);
      w.rec = { ox, oy, left: r1.left, top: r1.top, d: a.effect.getComputedTiming().duration, scale0: r0.width / r1.width };
      document.getAnimations().forEach((x) => { try { x.finish(); } catch { /* boucle infinie */ } });
    }
    requestAnimationFrame(loop);
  };
  loop();
};

// CA-23 : origine de transformation = centre de l'élément déclencheur (souris, clavier), mesuré à 1280 px ; deux déclencheurs éloignés l'un de l'autre.
for (const [way, button] of [['souris', '#qa-open-dialog'], ['clavier', '#qa-open-dialog-b']]) {
  const { context, page, errors } = await open(1280);
  const r = await page.locator(button).boundingBox();
  await page.evaluate(WATCH);
  if (way === 'souris') await page.click(button);
  else { await page.focus(button); await page.keyboard.press('Enter'); }
  const rec = await page.waitForFunction(() => window.__origin.rec, null, { timeout: 5000 }).then((h) => h.jsonValue()).catch(() => null);
  const cx = r.x + r.width / 2 - (rec?.left ?? 0), cy = r.y + r.height / 2 - (rec?.top ?? 0);
  check(`CA-23 ${way} : origine de transformation = centre du déclencheur`, rec !== null && near(rec.ox, cx, 1) && near(rec.oy, cy, 1), `origine=${rec?.ox},${rec?.oy} attendu ${cx},${cy} (animation d'échelle ${rec ? 'trouvée' : 'absente'})`);
  check(`CA-23 ${way} : échelle de départ 0,86 en 500 ms`, rec !== null && near(rec.scale0, 0.86, 0.005) && near(rec.d, 500), `échelle=${rec?.scale0} durée=${rec?.d}`);
  check(`CA-23 ${way} : sans erreur de page`, errors.length === 0, errors.join(' ; '));
  await context.close();
}

// Tiroir (§5.4.1) : contenu en cascade, 450 ms, décalage 40 ms par rang, un `lcStagger` posé par lc-drawer.
{
  const { context, page, errors } = await open(1280);
  await page.evaluate(() => {
    const w = (window.__rows = new Map());
    const loop = () => { document.querySelectorAll('.qa-row').forEach((el, i) => { for (const a of el.getAnimations()) if (!w.has(a)) { const t = a.effect.getComputedTiming(); w.set(a, { i, delay: t.delay, duration: t.duration }); } }); requestAnimationFrame(loop); };
    loop();
  });
  await page.click('#qa-open-drawer');
  await page.waitForTimeout(1200);
  const rows = await page.evaluate(() => [...window.__rows.values()]);
  const byRow = [0, 1, 2, 3].map((i) => rows.filter((x) => x.i === i));
  check('Tiroir : chaque ligne s\'anime en 550 ms (lcReveal, spec v2 §13 : alignement Talmo) avec un décalage de 40 ms par rang', byRow.every((l, i) => l.some((x) => near(x.duration, 550) && near(x.delay, i * 40))), JSON.stringify(rows));
  check('Tiroir : sans erreur de page', errors.length === 0, errors.join(' ; '));
  await context.close();
}

await browser.close();
server.close();
console.log(failures ? `${failures} échec(s)` : 'tout est vert');
process.exit(failures > 0 ? 1 : 0);
