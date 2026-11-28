// Relief et carte de chiffre (docs/specs/2026-12-relief.md §9) en navigateur réel, un passage par thème : CA-1 et CA-3 (rendu), CA-2, CA-4, CA-5 a b, CA-7, CA-8 (surcharges).
//   node tools/qa/relief-browser.mjs        Storybook statique (STORYBOOK_DIR ou dist/storybook)
// Stories attendues, dans packages/angular/data/src/stories/kpi-card.stories.ts (titre « Data/KPI card ») :
//   data-kpi-card--relief     : `lc-app-shell` dont le `main` contient `lc-card` (élévation 1 par défaut, classe lc-card--elevation-1), `lc-card elevation="0"`
//                               (classe lc-card--elevation-0), un `lc-kpi-card` (sans lien), un `button[lcButton]` et un `input[lcInput]`
//   data-kpi-card--filled     : 7 `lc-kpi-card[data-color="<themeColor>"]` en fillMode="solid", chacun avec `delta` et `hint`
//   data-kpi-card--link       : `button#before`, `lc-kpi-card` avec `a[lcKpiCardLink][href="#opened"]`, `button#after`
//   data-kpi-card--horizontal : un `lc-kpi-card` layout="horizontal"
//   data-kpi-card--row        : 4 `lc-kpi-card` de contenus de hauteurs différentes, dont une pleine
// Classes de lc-kpi-card lues : `.lc-kpi-card__label`, `.lc-kpi-card__value`, `.lc-kpi-card__footer` (variation, mot de tendance et précision).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticServer } from './static-server.mjs';
import { calm } from './wait.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const dir = process.env.STORYBOOK_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'dist', 'storybook');
const server = await staticServer(dir);
const browser = await chromium.launch({ channel: 'chrome' }).catch(() => chromium.launch());
let failures = 0;
const check = (ok, label, detail = '') => { if (!ok) failures += 1; console.log(`${ok ? 'OK ' : 'KO '} ${label}${ok ? '' : ` : ${detail}`}`); };

// P(propriété, valeur) : valeur calculée par le navigateur d'une déclaration posée sur un élément de test (résout les var() du document).
const INIT = () => {
  window.P = (prop, value) => { const e = document.createElement('div'); e.style[prop] = value; document.body.append(e); const v = getComputedStyle(e)[prop]; e.remove(); return v; };
  window.lum = (c) => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
};
async function open(story, theme) {
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  await page.addInitScript(INIT);
  await page.goto(`${server.base}/iframe.html?id=data-kpi-card--${story}&viewMode=story&globals=theme:${theme}`);
  await page.waitForSelector('lc-kpi-card', { timeout: 20000 });
  await calm(page);
  return page;
}

try {
  for (const theme of ['default', 'dark']) {
    const t = (label) => `[${theme}] ${label}`;
    const run = async (name, fn) => { try { await fn(); } catch (e) { check(false, t(`${name} : exception`), String(e.message).split('\n')[0]); } };

    await run('Relief', async () => {
      const page = await open('relief', theme);
      const r = await page.evaluate(() => {
        const cs = (e) => getComputedStyle(e), q = (s) => document.querySelector(s);
        const card = q('lc-card.lc-card--elevation-1'), flat = q('lc-card.lc-card--elevation-0'), kpi = q('lc-kpi-card');
        let bg = q('main'); while (bg && cs(bg).backgroundColor === 'rgba(0, 0, 0, 0)') bg = bg.parentElement;
        // CA-8 : chaque jeton posé sur l'hôte change la valeur calculée visée.
        const label = kpi.querySelector('.lc-kpi-card__label'), value = kpi.querySelector('.lc-kpi-card__value');
        const O = [['shadow', '0 0 0 3px rgb(1, 2, 3)', kpi, 'boxShadow', 'rgb(1, 2, 3)'], ['border-color', 'rgb(4, 5, 6)', kpi, 'boxShadow', 'rgb(4, 5, 6)'], ['radius', '7px', kpi, 'borderTopLeftRadius', '7px'],
          ['background', 'rgb(7, 8, 9)', kpi, 'backgroundColor', 'rgb(7, 8, 9)'], ['color', 'rgb(10, 11, 12)', kpi, 'color', 'rgb(10, 11, 12)'], ['label-color', 'rgb(13, 14, 15)', label, 'color', 'rgb(13, 14, 15)'],
          ['label-weight', '100', label, 'fontWeight', '100'], ['value-weight', '200', value, 'fontWeight', '200'], ['value-letter-spacing', '3px', value, 'letterSpacing', '3px']];
        const notRead = O.filter(([token, v, el, prop, wanted]) => { kpi.style.setProperty(`--lc-kpi-card-${token}`, v); const ok = String(cs(el)[prop]).includes(wanted); kpi.style.removeProperty(`--lc-kpi-card-${token}`); return !ok; }).map(([token]) => token);
        card.style.setProperty('--lc-card-line-color', 'rgb(4, 5, 6)'); const lineRead = cs(card).boxShadow.includes('rgb(4, 5, 6)'); card.style.removeProperty('--lc-card-line-color');
        return { relief: P('boxShadow', 'inset 0 0 0 1px var(--lc-sys-color-line), var(--lc-sys-shadow-1)'), card: cs(card).boxShadow, kpi: cs(kpi).boxShadow, cardBorder: cs(card).borderTopWidth, kpiBorder: cs(kpi).borderTopWidth,
          flatShadow: cs(flat).boxShadow, flatBorder: cs(flat).borderTopWidth, flatColor: cs(flat).borderTopColor, border: P('color', 'var(--lc-sys-color-border)'),
          shell: lum(cs(bg).backgroundColor), raised: lum(P('backgroundColor', 'var(--lc-sys-color-surface-raised)')),
          radii: [card, kpi, q('button[lcButton]'), q('input[lcInput]')].map((e) => cs(e).borderTopLeftRadius), notRead, lineRead };
      });
      check(r.card === r.relief && r.kpi === r.relief && r.cardBorder === '0px' && r.kpiBorder === '0px', t('CA-1 lc-card et lc-kpi-card : filet inset puis shadow-1, sans bord'), JSON.stringify(r));
      check(r.flatShadow === 'none' && r.flatBorder !== '0px' && r.flatColor === r.border, t('CA-1 elevation 0 : bord sys.color.border, sans ombre'), JSON.stringify(r));
      check(r.shell < r.raised, t('CA-2 fond de la zone de contenu plus sombre que surface-raised'), JSON.stringify(r));
      check(r.radii.join() === '16px,16px,12px,12px', t('CA-3 rayons : cartes 16 px, bouton et champ 12 px'), r.radii.join());
      check(!r.notRead.length && r.lineRead, t('CA-8 surcharge de chaque jeton de lc-kpi-card et de card.line-color'), `${r.notRead} ${r.lineRead}`);
    });

    await run('Filled', async () => {
      const page = await open('filled', theme);
      const bad = await page.evaluate(() => {
        const tiles = [...document.querySelectorAll('lc-kpi-card[data-color]')], out = [];
        for (const k of tiles) {
          const c = k.dataset.color, on = P('color', `var(--lc-sys-color-on-${c})`);
          if (getComputedStyle(k).backgroundColor !== P('color', `var(--lc-sys-color-${c})`)) out.push(`${c} fond`);
          const texts = [...k.querySelectorAll('*')].filter((e) => e.localName === 'lc-icon' || [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
          for (const e of texts) if (getComputedStyle(e).color !== on) out.push(`${c} ${e.localName}.${e.className}`);
        }
        return tiles.length === 7 ? out : ['7 tuiles attendues'];
      });
      check(!bad.length, t('CA-4 tuile pleine : fond <couleur>, tous les textes et icônes en on-<couleur> (7 themeColor)'), bad.join(', '));
    });

    await run('Link', async () => {
      const page = await open('link', theme);
      const box = await page.locator('lc-kpi-card').boundingBox();
      const hits = [];
      for (const [dx, dy] of [[6, 6], [box.width - 6, 6], [6, box.height - 6], [box.width - 6, box.height - 6]]) {
        await page.evaluate(() => { location.hash = ''; });
        await page.mouse.click(box.x + dx, box.y + dy);
        hits.push(await page.evaluate(() => location.hash));
      }
      check(hits.every((h) => h === '#opened'), t('CA-5a un clic aux quatre coins de la carte suit le lien'), hits.join());
      await page.focus('#before');
      const stops = [];
      for (let i = 0; i < 6 && stops.at(-1)?.id !== 'after'; i += 1) {
        await page.keyboard.press('Tab');
        stops.push(await page.evaluate(() => { const a = document.activeElement, k = a.closest('lc-kpi-card'), o = k && getComputedStyle(k); return { id: a.id, link: a.matches('a[lcKpiCardLink]'), outline: !!k && o.outlineStyle !== 'none' && parseFloat(o.outlineWidth) > 0 }; }));
      }
      const inCard = stops.filter((s) => s.link);
      check(stops.at(-1)?.id === 'after' && inCard.length === 1 && inCard[0].outline && stops.filter((s) => !s.id && !s.link).length === 0, t('CA-5b Tab atteint la carte une seule fois, focus visible sur la carte'), JSON.stringify(stops));
    });

    await run('Horizontal', async () => {
      const page = await open('horizontal', theme);
      const x = await page.evaluate(() => ['.lc-kpi-card__label', '.lc-kpi-card__value'].map((s) => document.querySelector(`lc-kpi-card ${s}`).getBoundingClientRect().left));
      check(x[1] > x[0], t('CA-7 layout horizontal : abscisse du chiffre supérieure à celle du libellé'), x.join());
    });

    await run('Row', async () => {
      const page = await open('row', theme);
      const bottoms = await page.evaluate(() => [...document.querySelectorAll('lc-kpi-card')].map((k) => k.querySelector('.lc-kpi-card__footer')?.getBoundingClientRect().bottom));
      check(bottoms.length === 4 && bottoms.every((b) => b !== undefined && Math.abs(b - bottoms[0]) <= 1), t('CA-7 Row : bas des pieds des 4 tuiles alignés à 1 px'), bottoms.join());
    });
  }
} finally { await browser.close(); server.close(); }
console.log(failures ? `${failures} échec(s)` : 'tout est vert');
process.exit(failures > 0 ? 1 : 0);
