// Fidélité du mouvement (spec 2026-12-mouvement-v2) : CA-1 (courbes et durées des tokens = démos), CA-20 (story du kit = démo du catalogue), part de CA-38 (démo citée sans story = échec).
//   node tools/qa/motion-fidelity.mjs --record [dNN ...]   relève l'empreinte des démos citées en §5.4.1 et §5.4.2 dans docs/design/explorations/2026-12-mouvement-v2/catalogue.html
//                                                          et écrit fidelite.json (versionné) ; 1280 px, 390 px pour d53 à d63
//   node tools/qa/motion-fidelity.mjs [dNN ...]            compare la story du kit de chaque démo à son empreinte (Storybook statique : STORYBOOK_DIR ou dist/storybook)
//   node tools/qa/motion-fidelity.mjs --self [dNN ...]     compare le catalogue à son empreinte (reproductibilité du relevé)
// Contrat des stories (à respecter par les stories Animation) : la démo dNN est dans `[data-demo="dNN"]`, son bouton « Rejouer » est dans cet élément,
// et, pour les démos pilotées en JavaScript, l'élément dont on échantillonne la valeur porte `data-sample`.
// Tolérances de CA-20 : durée et délai ±0,5 ms, courbe à 1e-3 près (CA-1), valeurs à 0/25/50/75/100 % à ±1 % de l'amplitude ou ±0,5 px, ordre et décalage des cascades ±0,5 ms
// (démos en rAF : temps à progression égale ±16,7 ms ; origine des temps : le clic, posé dans le même `evaluate` que lui ; pour survol, glissement et touche, le premier changement de valeur).
// Le relevé met chaque animation en pause à sa première apparition (currentTime fixé), puis lit l'état calculé.
// Choix assumés : d12 est exclu volontairement (le kit garde un indicateur qui glisse alors que Talmo ne fait pas glisser le trait, §5.4.1) ;
// les cascades sont comparées par délai trié, sans l'identité des cibles (l'ordre du DOM et le nom des éléments diffèrent entre le catalogue et les stories).
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = path.join(root, 'docs', 'design', 'explorations', '2026-12-mouvement-v2');
const catalogueUrl = `file://${path.join(dir, 'catalogue.html')}`;
const fidelityFile = path.join(dir, 'fidelite.json');
const storybookDir = process.env.STORYBOOK_DIR ?? path.join(root, 'dist', 'storybook');
const { chromium } = require('playwright');

/** Table `dNN → story id (future), sélecteurs, déclencheur`. `story` : id Storybook attendu (les ids de composants sans story Animation aujourd'hui sont ceux que T3 à T16 doivent créer). */
const rejouer = (id) => ({ name: 'Rejouer', mode: 'anim', cat: `[data-replay="${id}"]`, story: `[data-demo="${id}"] >> button:has-text("Rejouer")` });
/** Déclencheur autre que « Rejouer » (quand « Rejouer » ne lance pas le mouvement) : côté story, l'élément porte `data-trigger`. `action` : 'click' (défaut), 'hover', { drag: dx } ou { key }. */
const acting = (id, name, cat, action = 'click') => ({ name, mode: 'anim', action, cat, story: `[data-demo="${id}"] [data-trigger]` });
const sampled = (id, name, cat, read, catTrigger) => ({ name, mode: 'raf', cat: catTrigger ?? `[data-replay="${id}"]`, story: `[data-demo="${id}"] >> button:has-text("Rejouer")`, sampler: { cat, story: `[data-demo="${id}"] [data-sample]`, read } });
const DEMOS = {
  d01: ['layout-page--animation', 'lc-page : titre lcSplitText'],
  d02: ['layout-page--animation', 'lc-page : trait sous le titre'],
  d03: ['data-kpi-card--animation', 'lc-kpi-card : entrée tilt'],
  d05: ['layout-app-shell--animation', 'lc-app-shell : entrée de la barre du haut'],
  d06: ['data-activity-feed--animation', 'lc-activity-feed, lc-tree-table, lc-description-list : cascade (lcStagger)'],
  d07: ['data-data-table--animation', 'lc-data-table, lc-table : lignes en cascade ; cascade de lc-activity-feed'],
  d08: ['data-data-table--animation', 'lc-data-table : changement de filtre'],
  d09: ['feedback-progress-bar--animation', 'lc-progress-bar : lcFill'],
  d10: ['navigation-tabs--animation', 'lc-tabs, lc-nav-list : indicateur à deux bords'],
  d13: ['navigation-stepper--animation', 'lc-stepper : barres tracées'],
  d14: ['data-kpi-card--animation', 'lc-kpi-card : lcCountUp (rAF)', [sampled('d14', 'Rejouer (échantillonné)', '#d14s [data-cu]', 'text')]],
  d15: ['data-kpi-card--animation', 'lc-kpi-card : aucun effet au survol'],
  d16: ['data-kpi-card--animation', 'lc-kpi-card : lcFlash'],
  d17: ['feedback-status-badge--animation', 'lc-status-badge : aucun mouvement'],
  d19: ['charts-sparkline--animation', 'lc-chart : sparkline 1 000 ms', [rejouer('d19'), sampled('d19', 'Rejouer (échantillonné)', '#d19s path.draw', 'css:stroke-dashoffset')]],
  d21: ['feedback-progress-bar--animation', 'lc-timeline-bar, barres de lc-file-upload et lc-message-composer : lcFill'],
  d24: ['charts-bar-chart--animation', 'lc-chart : re-calcul 480 ms, décalage 20 ms', [rejouer('d24'), sampled('d24', 'Changer la période (échantillonné)', '#d24svg rect', 'attr:height', '#d24btn')]],
  d25: ['overlays-drawer--animation', 'lc-drawer'],
  d26: ['overlays-dialog--animation', 'lc-dialog : ouverture depuis le déclencheur'],
  d28: ['navigation-menu--animation', 'lc-menu, liste de lc-combobox, calendriers : pop depuis l\'ancrage', [acting('d28', 'Ouvrir le menu', '#d28btn')]], // Rejouer du catalogue ouvre puis referme aussitôt (le clic hors du menu le ferme)
  d29: ['feedback-toast--animation', 'lc-toast'],
  d31: ['layout-card--animation', 'lc-card : .lc-lift au survol', [rejouer('d31'), acting('d31', 'Survol de la carte', '#d31s .lift-card', 'hover')]],
  d33: ['data-data-table--animation', 'lc-data-table : suppression, voisines qui glissent', [acting('d33', 'Glisser la barre A (les suivantes suivent)', '#d33a', { drag: 120 })]],
  d36: ['data-data-table--animation', 'lc-data-table : tri, lignes qui glissent', [acting('d36', 'Flèche droite sur la barre', '#d36bar', { key: 'ArrowRight' })]],
  d37: ['buttons-theme-toggle--animation', 'lc-theme-toggle : révélation circulaire'],
  d39: ['overlays-toggletip--animation', 'lc-toggletip : popover'],
  d41: ['forms-date-input--animation', 'calendrier : anneau de sélection (aucun mouvement), changement de mois'],
  d42: ['feedback-spinner--animation', 'lc-spinner : valeurs recalées sur les tokens'],
  d44: ['feedback-status-badge--animation', 'lc-status-badge : changement de statut, aucun mouvement'],
  d45: ['navigation-tabs--animation', 'lc-tabs : cascade du panneau à la première ouverture'],
  d46: ['forms-switch--animation', 'lc-switch : bouton qui glisse'],
  d48: ['layout-disclosure--animation', 'lc-disclosure, lc-nav-group : ouverture et fermeture'],
  d50: ['overlays-tooltip--animation', 'lc-tooltip, survol de barre : aucun mouvement'],
  d51: ['navigation-stepper--animation', 'lc-stepper : pastille courante en pop'],
  d53: ['layout-app-shell--animation', 'téléphone : empilement iOS'],
  d54: ['overlays-sheet--animation', 'lc-sheet : feuille auto-hauteur'],
  d55: ['overlays-sheet--animation', 'lc-sheet : feuille à contenu long'],
  d56: ['overlays-sheet--animation', 'lc-dialog présenté en lc-sheet'],
  d57: ['layout-app-shell--animation', 'téléphone : barre d\'onglets du bas'],
  d59: ['layout-app-shell--animation', 'téléphone : titre de l\'en-tête au défilement'],
  d60: ['feedback-toast--animation', 'téléphone : lc-toast au-dessus de la barre d\'onglets'],
  d61: ['forms-date-input--animation', 'calendrier : glissement du changement de mois'],
  d62: ['forms-segmented-control--animation', 'lc-segmented-control : pastille à deux bords'],
  d63: ['forms-segmented-control--animation', 'lc-segmented-control à 360 px'],
};
const TABLE = Object.fromEntries(Object.entries(DEMOS).map(([id, [story, label, triggers]]) => [id, {
  story, label, viewport: +id.slice(1) >= 53 && +id.slice(1) <= 63 ? 390 : 1280,
  catalogue: `#${id}`, storySelector: `[data-demo="${id}"]`, triggers: triggers ?? [rejouer(id)],
}]));

// ---------- Code exécuté dans la page ----------

/** Avant le déclencheur : mémorise les animations déjà présentes (boucles infinies comprises) et l'instant zéro. Avec `el` (clic), le clic part dans le même appel : l'origine des temps est exacte. */
const startScan = (el) => { window.__fid = { before: new Set(document.getAnimations()), t0: performance.now() }; el?.click(); };

/** Après le déclencheur : relève chaque nouvelle animation à sa première apparition (puis la met en pause à 0), ou échantillonne `sampler` en rAF. */
const finishScan = async ({ mode, sampler, scope }) => {
  const { before, t0 } = window.__fid;
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve)); // résout avec l'horodatage de l'image
  const r3 = (n) => Math.round(n * 1000) / 1000;
  const SKIP = new Set(['offset', 'computedOffset', 'easing', 'composite']);
  const FAMILY = new Set(['transform', 'translate', 'scale', 'rotate', 'opacity']);
  const MIN_MS = 700, QUIET_MS = 1600, MAX_MS = 8000; // 1,6 s de calme : certains « Rejouer » enchaînent (d61 : 300 ms puis 1,4 s ; d63 : 1,2 s)
  let lastNew = performance.now();

  if (mode === 'raf') {
    const num = (s) => parseFloat(String(s).replace(/[\s  ]/g, '').replace(',', '.'));
    const series = [];
    let previous;
    // Temps pris sur l'horodatage de l'image (multiples exacts de la période d'affichage), pas sur `performance.now()` : la gigue d'une image fausserait la tolérance de 16,7 ms.
    for (let now = await frame(); now - t0 < MAX_MS; now = await frame()) {
      const el = document.querySelector(sampler.sel);
      if (el) {
        const raw = sampler.read === 'text' ? el.textContent : sampler.read.startsWith('attr:') ? el.getAttribute(sampler.read.slice(5)) : getComputedStyle(el).getPropertyValue(sampler.read.slice(4));
        const value = num(raw);
        if (value !== previous) { series.push([r3(now - t0), r3(value)]); previous = value; lastNew = now; }
      }
      if (now - t0 > MIN_MS && now - lastNew > QUIET_MS) break;
    }
    return { series };
  }

  const recs = [];
  const seen = new Set();
  const kind = (a) => (a instanceof CSSTransition ? 'transition' : a instanceof CSSAnimation ? 'animation' : 'waapi');
  const describe = (el) => `${el.localName}${el.id ? `#${el.id}` : ''}${typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/).join('.')}` : ''}`;
  const rootEl = scope ? document.querySelector(scope) : null;
  while (performance.now() - t0 < MAX_MS) {
    for (const a of document.getAnimations()) {
      if (before.has(a) || seen.has(a) || !a.effect?.target) continue;
      seen.add(a);
      const { target, pseudoElement } = a.effect;
      if (rootEl && !rootEl.contains(target) && !pseudoElement) continue;
      const timing = a.effect.getComputedTiming();
      // Une CSSAnimation porte sa courbe sur ses keyframes (animation-timing-function), l'effet reste `linear` : on retient la courbe effective.
      const frames = a.effect.getKeyframes();
      const easing = timing.easing === 'linear' && frames[0]?.easing && frames[0].easing !== 'linear' ? frames[0].easing : timing.easing;
      const keyframes = a.effect.getKeyframes().map((k) => Object.fromEntries(Object.entries(k).filter(([p]) => p !== 'computedOffset').map(([p, v]) => [p, typeof v === 'number' ? r3(v) : String(v)])));
      const props = [...new Set(keyframes.flatMap((k) => Object.keys(k)))].filter((p) => !SKIP.has(p));
      recs.push({ a, target, pseudo: pseudoElement ?? '', rec: { type: kind(a), name: a.animationName ?? a.transitionProperty ?? null, target: describe(target) + (pseudoElement ?? ''), seenAtMs: r3(performance.now() - t0), delay: r3(timing.delay), duration: r3(timing.duration), endDelay: r3(timing.endDelay), iterations: timing.iterations, direction: timing.direction, easing, props, keyframes } });
      a.pause();
      lastNew = performance.now();
    }
    if (performance.now() - t0 > MIN_MS && performance.now() - lastNew > QUIET_MS) break;
    await frame();
  }
  const len = (v, ref) => (v.endsWith('%') ? (parseFloat(v) / 100) * ref : parseFloat(v));
  const state = ({ target, pseudo, rec }) => {
    const out = {};
    if (!target.isConnected) return out; // cellule remplacée pendant la chaîne de « Rejouer » : plus de style calculé
    const cs = getComputedStyle(target, pseudo || null);
    if (rec.props.some((p) => FAMILY.has(p) && p !== 'opacity')) {
      const m = new DOMMatrix();
      const w = target.offsetWidth || 0, h = target.offsetHeight || 0;
      if (cs.translate !== 'none') { const [x = '0', y = '0'] = cs.translate.split(' '); m.translateSelf(len(x, w), len(y, h)); }
      if (cs.rotate !== 'none') m.rotateSelf(parseFloat(cs.rotate));
      if (cs.scale !== 'none') { const [x, y = x] = cs.scale.split(' ').map(parseFloat); m.scaleSelf(x, y); }
      if (cs.transform !== 'none') m.multiplySelf(new DOMMatrix(cs.transform));
      out.m = [m.a, m.b, m.c, m.d, m.e, m.f].map(r3);
    }
    if (rec.props.includes('opacity') && Number.isFinite(parseFloat(cs.opacity))) out.opacity = r3(parseFloat(cs.opacity)); // élément détaché en cours de relevé : pas de valeur
    for (const p of rec.props) if (!FAMILY.has(p)) out[p] = cs.getPropertyValue(p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`));
    return out;
  };
  for (const entry of recs) entry.rec.values = [];
  for (const pct of [0, 25, 50, 75, 100]) {
    for (const { a, rec } of recs) a.currentTime = rec.delay + (pct / 100) * rec.duration - (pct === 100 ? 0.01 : 0);
    for (const entry of recs) entry.rec.values.push(state(entry));
  }
  return { animations: recs.map((e) => e.rec) };
};

/** Attend une image, puis 250 ms sans animation finie en cours (la lecture automatique du catalogue part 150 ms après l'apparition de la démo ; une boucle infinie ne se termine pas, une animation `fill: forwards` terminée reste dans `getAnimations()` : ni l'une ni l'autre n'est attendue). */
const settle = async () => {
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  const running = () => document.getAnimations().some((a) => Number.isFinite(a.effect?.getComputedTiming().endTime) && (a.playState === 'running' || a.pending));
  await frame();
  const end = performance.now() + 15000;
  let calmSince = performance.now();
  while (performance.now() < end) {
    if (running()) calmSince = performance.now();
    else if (performance.now() - calmSince >= 250) return true;
    await frame();
  }
  return false;
};

// ---------- Relevé et comparaison ----------

async function measure(browser, url, viewport, entry, trigger, { scope, catalogue }) {
  const context = await browser.newContext({ viewport: { width: viewport, height: 900 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(url);
  const rootSel = catalogue ? entry.catalogue : entry.storySelector;
  await page.waitForSelector(rootSel, { state: 'attached', timeout: 20000 });
  await page.locator(rootSel).first().scrollIntoViewIfNeeded().catch(() => {});
  if (!(await page.evaluate(settle))) throw new Error('animations finies encore en cours après 15 s, avant le déclencheur');
  const selector = catalogue ? trigger.cat : trigger.story;
  // d37 : la position du cercle se compare au centre du bouton, pas en px absolus (la mise en page de la story n'est pas celle du catalogue).
  const toggle = catalogue ? null : await page.locator(`${rootSel} lc-theme-toggle button`).first().boundingBox().catch(() => null);
  const sampler = trigger.sampler ? { sel: catalogue ? trigger.sampler.cat : trigger.sampler.story, read: trigger.sampler.read } : null;
  const target = page.locator(selector).first();
  const action = trigger.action ?? 'click';
  if (action.key) await target.focus();
  if (action === 'click') await target.evaluate(startScan);
  else {
    await page.evaluate(startScan);
    if (action === 'hover') await target.hover();
    else if (action.key) await page.keyboard.press(action.key);
    else {
      const box = await target.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + action.drag, box.y + box.height / 2, { steps: 8 });
      await page.mouse.up();
    }
  }
  const result = await page.evaluate(finishScan, { mode: trigger.mode, sampler, scope: catalogue ? scope : null });
  // Survol, glissement, touche : la latence de Playwright n'est pas celle de la démo, l'origine est le premier changement de valeur (2e échantillon : le 1er est la valeur au repos).
  if (result.series && action !== 'click' && result.series.length > 1) { const [origin] = result.series[1]; result.series = result.series.map(([t, v]) => [t - origin, v]); }
  await context.close();
  return { ...result, errors, toggle: toggle && { x: toggle.x + toggle.width / 2, y: toggle.y + toggle.height / 2, width: viewport, height: 900 } };
}

const near = (a, b, tol) => Math.abs(a - b) <= tol;
const BEZIER = { linear: [0, 0, 1, 1], ease: [0.25, 0.1, 0.25, 1], 'ease-in': [0.42, 0, 1, 1], 'ease-out': [0, 0, 0.58, 1], 'ease-in-out': [0.42, 0, 0.58, 1] };
const bezier = (easing) => BEZIER[easing] ?? (/^cubic-bezier\(/.test(easing) ? easing.match(/-?[\d.]+/g).map(Number) : null);
const numbers = (s) => String(s).match(/-?\d*\.?\d+(?:e-?\d+)?/g)?.map(Number) ?? [];

const PCT = [0, 25, 50, 75, 100];
const spread = (xs) => { const ok = xs.filter(Number.isFinite); return ok.length ? Math.max(...ok) - Math.min(...ok) : 0; };
/** CA-20 : ±1 % de l'amplitude (relevée sur les 5 valeurs attendues) ou ±`floor`, le plus grand des deux. */
const tolerance = (xs, floor) => Math.max(0.01 * spread(xs), floor);

function compareValue(expected, got, tag, problems) {
  const list = (v) => [...(v.m ?? []).map((x, i) => [`m${i}`, x, i < 4 ? 0.005 : 0.5]), ...(v.opacity === undefined ? [] : [['opacity', v.opacity, 0.005]])];
  const family = expected.map((v) => Object.fromEntries(list(v)));
  expected.forEach((e, i) => {
    const g = got[i];
    if (!g) { problems.push(`${tag} valeur ${i} absente`); return; }
    const gotFamily = Object.fromEntries(list(g));
    for (const [key, x, floor] of list(e)) {
      const y = gotFamily[key];
      if (y === undefined || !near(x, y, tolerance(family.map((f) => f[key]), floor))) problems.push(`${tag} ${PCT[i]} % ${key} = ${y} attendu ${x}`);
    }
    for (const key of Object.keys(e).filter((k) => !['m', 'opacity'].includes(k))) {
      const a = numbers(e[key]), b = numbers(g[key] ?? '');
      const floor = /px/.test(e[key]) ? 0.5 : 0.005;
      const ok = a.length === 0 ? e[key] === g[key] : a.length === b.length && a.every((x, j) => near(x, b[j], tolerance(expected.map((v) => numbers(v[key])[j]), floor)));
      if (!ok) problems.push(`${tag} ${PCT[i]} % ${key} = "${g[key]}" attendu "${e[key]}"`);
    }
  });
}

function compareAnimations(expected, got) {
  const problems = [];
  const order = (list) => list.map((a, i) => [a, i]).sort((x, y) => x[0].delay - y[0].delay || x[1] - y[1]).map(([a]) => a);
  if (expected.length !== got.length) problems.push(`${got.length} animation(s) au lieu de ${expected.length}`);
  const [e, g] = [order(expected), order(got)];
  for (let i = 0; i < Math.min(e.length, g.length); i += 1) {
    const tag = `#${i + 1} ${e[i].target}`;
    if (!near(e[i].duration, g[i].duration, 0.5)) problems.push(`${tag} durée ${g[i].duration} attendu ${e[i].duration}`);
    if (!near(e[i].delay, g[i].delay, 0.5)) problems.push(`${tag} délai ${g[i].delay} attendu ${e[i].delay}`);
    const times = (a) => a.iterations ?? Infinity; // JSON écrit Infinity en null
    if (times(e[i]) !== times(g[i])) problems.push(`${tag} itérations ${times(g[i])} attendu ${times(e[i])}`);
    if (e[i].direction !== g[i].direction) problems.push(`${tag} direction ${g[i].direction} attendu ${e[i].direction}`);
    const [be, bg] = [bezier(e[i].easing), bezier(g[i].easing)];
    if (!(be && bg ? be.every((x, j) => near(x, bg[j], 1e-3)) : e[i].easing === g[i].easing)) problems.push(`${tag} courbe ${g[i].easing} attendu ${e[i].easing}`);
    compareValue(e[i].values, g[i].values, tag, problems);
  }
  return problems;
}

/** Temps (ms) où la série atteint 25, 50, 75 et 100 % de sa variation, par interpolation. */
function timeAtProgress(raw) {
  const series = raw.length > 2 && raw[0][1] === raw.at(-1)[1] ? raw.slice(1) : raw; // 1re valeur lue avant la remise à zéro du compteur
  const [v0, vN] = [series[0][1], series.at(-1)[1]];
  return [25, 50, 75, 100].map((p) => {
    const target = v0 + ((vN - v0) * p) / 100;
    const k = series.findIndex(([, v]) => (vN >= v0 ? v >= target : v <= target));
    if (k <= 0) return series[Math.max(k, 0)][0];
    const [t1, a] = series[k - 1], [t2, b] = series[k];
    return t1 + ((t2 - t1) * (target - a)) / (b - a || 1);
  });
}

function compareSeries(expected, got) {
  if (got.length < 2) return [`échantillons en rAF : ${got.length} valeur(s) distincte(s)`];
  const [e, g] = [timeAtProgress(expected), timeAtProgress(got)];
  const problems = e.flatMap((t, i) => (near(t, g[i], 16.7) ? [] : [`temps à ${[25, 50, 75, 100][i]} % : ${g[i].toFixed(1)} ms attendu ${t.toFixed(1)} ms (±16,7)`]));
  if (!near(expected.at(-1)[1], got.at(-1)[1], Math.abs(expected.at(-1)[1] - expected[0][1]) * 0.01)) problems.push(`valeur finale ${got.at(-1)[1]} attendu ${expected.at(-1)[1]}`);
  return problems;
}

// ---------- Relevé (--record) ----------

function format(data) {
  const line = (o) => JSON.stringify(o);
  const fingerprints = Object.entries(data.fingerprints).map(([id, f]) => ` ${JSON.stringify(id)}: {"viewport": ${f.viewport}, "triggers": [\n${f.triggers.map((t) => `   ${line({ ...t, animations: undefined, series: undefined })}`.replace(/}$/, `, "animations": ${t.animations ? `[\n${t.animations.map((a) => `    ${line(a)}`).join(',\n')}\n   ]` : 'null'}, "series": ${t.series ? line(t.series) : 'null'}}`)).join(',\n')}\n ]}`);
  return `{\n"meta": ${line(data.meta)},\n"table": {\n${Object.entries(data.table).map(([id, t]) => ` ${JSON.stringify(id)}: ${line(t)}`).join(',\n')}\n},\n"fingerprints": {\n${fingerprints.join(',\n')}\n}\n}\n`;
}

async function record(browser, ids) {
  const previous = ids.length === 0 ? null : JSON.parse(await readFile(fidelityFile, 'utf8'));
  const fingerprints = previous ? { ...previous.fingerprints } : {};
  const notRecorded = {};
  for (const id of ids.length ? ids : Object.keys(TABLE)) {
    const entry = TABLE[id];
    const triggers = [];
    for (const trigger of entry.triggers) {
      try {
        const got = await measure(browser, catalogueUrl, entry.viewport, entry, trigger, { scope: entry.catalogue, catalogue: true });
        const t = { name: trigger.name, mode: trigger.mode, animations: got.animations ?? null, series: got.series ?? null };
        triggers.push(t);
        const what = t.animations ? `${t.animations.length} animation(s)` : `${t.series.length} échantillon(s) rAF`;
        console.log(`${id} ${entry.viewport}px ${trigger.name} : ${what}${got.errors.length ? ` ; erreurs page : ${got.errors.join(' | ')}` : ''}`);
        if ((t.animations?.length === 0 || (t.series && t.series.length < 2)) && !/aucun/.test(entry.label)) notRecorded[`${id} ${trigger.name}`] = 'aucune animation observée après le déclencheur';
      } catch (error) {
        notRecorded[`${id} ${trigger.name}`] = error.message.split('\n')[0];
        console.log(`${id} ${trigger.name} : NON RELEVÉ, ${error.message.split('\n')[0]}`);
      }
    }
    if (triggers.length) fingerprints[id] = { viewport: entry.viewport, triggers };
  }
  const data = { meta: { source: 'catalogue.html', chrome: browser.version(), tolerances: 'CA-20 : durée, délai ±0,5 ms ; courbe 1e-3 ; valeurs ±1 % de l\'amplitude ou ±0,5 px ; rAF ±16,7 ms', notRecorded: ids.length ? { ...Object.fromEntries(Object.entries(previous.meta.notRecorded).filter(([k]) => !ids.includes(k.slice(0, 3)))), ...notRecorded } : notRecorded }, table: TABLE, fingerprints };
  await writeFile(fidelityFile, format(data));
  console.log(`\n${Object.keys(fingerprints).length} démo(s) dans fidelite.json ; ${Object.keys(notRecorded).length} déclencheur(s) sans animation observée ou en erreur`);
  for (const [k, v] of Object.entries(notRecorded)) console.log(`  non relevé : ${k} : ${v}`);
  return 0;
}

// ---------- Comparaison ----------

/** d37 (décision T12) : seul le cercle `::view-transition-new(root)` est comparé (le fondu par défaut du groupe est neutralisé en CSS, hors CA-5). Durée, délai et courbe sont comparés tels quels ; centre = centre du bouton, rayon = coin le plus éloigné : les valeurs attendues sont les rapports r/R de l'empreinte du catalogue appliqués au rayon de la story. */
function circleProblems(expected, got, toggle) {
  const only = (list) => list.filter((a) => /view-transition-new\(root\)/.test(a.target));
  const [e] = only(expected), [g] = only(got);
  if (!toggle) return ['d37 : bouton de bascule introuvable dans la story'];
  if (!e || !g) return [`d37 : animation du cercle absente (${only(got).length} côté story, ${only(expected).length} attendue)`];
  const radius = Math.hypot(Math.max(toggle.x, toggle.width - toggle.x), Math.max(toggle.y, toggle.height - toggle.y));
  const end = Number(numbers(e.values[4].clipPath)[0]);
  const wanted = e.values.map((v) => ({ clipPath: `circle(${(Number(numbers(v.clipPath)[0]) / end) * radius}px at ${toggle.x}px ${toggle.y}px)` }));
  const problems = compareAnimations([{ ...e, values: wanted }], [g]);
  return got.length === 1 ? problems : [...problems, `${got.length} animations au lieu de 1 (hors cercle : ${got.filter((a) => a !== g).map((a) => a.target).join(', ')})`];
}

async function compare(browser, ids, self) {
  const data = JSON.parse(await readFile(fidelityFile, 'utf8'));
  const index = self ? null : JSON.parse(await readFile(path.join(storybookDir, 'index.json'), 'utf8'));
  const server = self ? null : await staticServer(storybookDir);
  const base = server?.base;
  let failures = 0;
  const report = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };
  for (const id of ids.length ? ids : Object.keys(TABLE)) {
    const entry = data.table[id];
    const fingerprint = data.fingerprints[id];
    if (!entry) { report(false, `CA-20 ${id}`, 'aucune ligne dans la table'); continue; }
    if (!fingerprint) { report(false, `CA-20 ${id}`, 'aucune empreinte : lancer --record'); continue; }
    if (!self && !index.entries[entry.story]) { report(false, `CA-20 ${id} story ${entry.story}`, 'démo citée sans story dans l\'index de Storybook'); continue; }
    for (const [i, trigger] of entry.triggers.entries()) {
      const expected = fingerprint.triggers[i];
      if (!expected) { report(false, `CA-20 ${id} ${trigger.name}`, 'déclencheur sans empreinte'); continue; }
      try {
        const url = self ? catalogueUrl : `${base}/iframe.html?id=${entry.story}&viewMode=story`;
        const got = await measure(browser, url, entry.viewport, entry, trigger, { scope: entry.catalogue, catalogue: self });
        const problems = id === 'd37' && !self ? circleProblems(expected.animations, got.animations ?? [], got.toggle) : expected.animations ? compareAnimations(expected.animations, got.animations ?? []) : compareSeries(expected.series, got.series ?? []);
        if (got.errors.length) problems.push(`erreurs page : ${got.errors.join(' | ')}`);
        report(problems.length === 0, `CA-20 ${id} ${entry.story} ${trigger.name}`, problems.slice(0, 6).join(' ; ') + (problems.length > 6 ? ` ; … (${problems.length} écarts)` : ''));
      } catch (error) {
        report(false, `CA-20 ${id} ${entry.story} ${trigger.name}`, error.message.split('\n')[0]);
      }
    }
  }
  server?.close();
  return failures;
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const ids = args.filter((a) => /^d\d\d$/.test(a));
const browser = await chromium.launch({ channel: 'chrome' });
let failures = 0;
try {
  failures = flags.has('--record') ? await record(browser, ids) : await compare(browser, ids, flags.has('--self'));
} finally {
  await browser.close();
}
process.exit(failures > 0 ? 1 : 0);
