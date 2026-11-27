import * as layout from '../public-api';

// Acceptation de docs/specs/2026-12-mouvement-v2.md, T13a, CA-32 (partie « fonction pure du sens », §5.4.3). Un cas par ligne de §5.4.3.
// CONTRAT fixé par qa-engineer (la spec ne nomme pas la fonction), à exporter de `layout/src/public-api.ts` (`@internal`) :
//   lcPathLevel(url: string): number                 niveau = nombre de segments non vides du chemin (sans ?query ni #fragment), au moins 1
//   lcNavStep(history, step, order): { direction, history }
//     history: { urls: readonly string[]; index: number }   pile d'historique (chemins seuls) ; départ : { urls: [], index: -1 }
//     step:    { url: string; trigger: 'imperative' | 'popstate'; replace?: boolean }   url = URL FINALE (après redirections)
//     order:   readonly string[]   URL des rubriques du registre dans l'ordre de l'écran (vide au rendu serveur et avec navMode='none')
//   direction: 'none' | 'forward' | 'back' | 'same'
// Règles : pile vide = premier affichage = 'none' ; 'imperative' : plus profond = forward, moins profond = back, même niveau = selon l'ordre des rubriques
// (rubrique d'un chemin = première entrée de `order` égale au chemin ou préfixe de segment ; plus bas = forward, plus haut = back, identique ou
// introuvable = same) ; 'imperative' sans replace empile après `index` (coupe l'avance) ; 'popstate' : on cherche `url` dans la pile (la plus proche
// avant `index` = back, sinon la plus proche après = forward, `index` se déplace), introuvable = comparaison de niveau ; `replace` remplace l'entrée courante.
type Direction = 'none' | 'forward' | 'back' | 'same';
type History = { urls: readonly string[]; index: number };
type Step = { url: string; trigger: 'imperative' | 'popstate'; replace?: boolean };
const api = layout as unknown as Record<string, unknown>;
const lcPathLevel = (url: string): number => (api['lcPathLevel'] as (u: string) => number)(url);
const lcNavStep = (h: History, s: Step, o: readonly string[]) =>
  (api['lcNavStep'] as (h: History, s: Step, o: readonly string[]) => { direction: Direction; history: History })(h, s, o);

const push = (url: string): Step => ({ url, trigger: 'imperative' });
const pop = (url: string): Step => ({ url, trigger: 'popstate' });
const replace = (url: string): Step => ({ url, trigger: 'imperative', replace: true });
/** Joue les étapes et rend les sens, plus la pile finale. */
function run(steps: Step[], order: string[] = []) {
  let history: History = { urls: [], index: -1 };
  const directions: Direction[] = [];
  for (const step of steps) {
    const r = lcNavStep(history, step, order);
    directions.push(r.direction);
    history = r.history;
  }
  return { directions, history };
}

describe('CA-32 : lcPathLevel', () => {
  it.each([['/credit', 1], ['/credit/detail', 2], ['/credit/detail/7', 3], ['/credit/detail?x=1#haut', 2], ['/', 1]])('%s : niveau %i', (url, level) => {
    expect(lcPathLevel(url)).toBe(level);
  });
});

describe('CA-32 : fonction pure du sens (§5.4.3)', () => {
  it('lien direct ou premier affichage : aucune animation, la pile démarre', () => {
    const { directions, history } = run([push('/credit/detail')]);
    expect(directions).toEqual(['none']);
    expect(history).toEqual({ urls: ['/credit/detail'], index: 0 });
  });

  it('navigation dans l’application vers une page plus profonde : avancer', () => {
    expect(run([push('/credit'), push('/credit/detail')]).directions).toEqual(['none', 'forward']);
  });

  it('navigation dans l’application vers une page moins profonde : reculer', () => {
    expect(run([push('/credit'), push('/credit/detail'), push('/credit')]).directions).toEqual(['none', 'forward', 'back']);
  });

  it('retour du navigateur : reculer', () => {
    expect(run([push('/credit'), push('/credit/detail'), pop('/credit')]).directions).toEqual(['none', 'forward', 'back']);
  });

  it('retour du navigateur vers une page plus profonde : reculer (position dans la pile, pas le niveau)', () => {
    // pile [detail, credit] ; le retour du navigateur rejoint detail, plus profond que credit
    const { directions, history } = run([push('/credit/detail'), push('/credit'), pop('/credit/detail')]);
    expect(directions).toEqual(['none', 'back', 'back']);
    expect(history.index).toBe(0);
  });

  it('avance du navigateur : avancer, même vers une page moins profonde', () => {
    // pile [detail, credit], retour sur detail puis avance sur credit (moins profond)
    expect(run([push('/credit/detail'), push('/credit'), pop('/credit/detail'), pop('/credit')]).directions).toEqual(['none', 'back', 'back', 'forward']);
  });

  it('avance du navigateur vers une page plus profonde : avancer', () => {
    expect(run([push('/credit'), push('/credit/detail'), pop('/credit'), pop('/credit/detail')]).directions).toEqual(['none', 'forward', 'back', 'forward']);
  });

  it('une navigation après un retour coupe l’avance ; une URL inconnue de la pile se juge au niveau', () => {
    const { directions, history } = run([push('/a'), push('/a/b'), pop('/a'), push('/c'), pop('/a/b')]);
    expect(history.urls).toEqual(['/a', '/c']);
    expect(directions).toEqual(['none', 'forward', 'back', 'same', 'forward']);
  });

  it('replaceUrl : le sens se calcule normalement, l’entrée courante est remplacée (pas d’entrée en plus)', () => {
    const { directions, history } = run([push('/credit'), replace('/credit/detail'), replace('/credit')]);
    expect(directions).toEqual(['none', 'forward', 'back']);
    expect(history).toEqual({ urls: ['/credit'], index: 0 });
  });

  it('redirection (redirectTo, garde) : le sens se calcule sur l’URL finale reçue', () => {
    // /ancien → redirigé vers /credit/detail : seul l’URL finale est passée
    expect(run([push('/credit'), push('/credit/detail')]).directions[1]).toBe('forward');
    // garde qui renvoie /prive vers /credit depuis /credit/detail
    const { directions, history } = run([push('/credit/detail'), push('/credit')]);
    expect(directions[1]).toBe('back');
    expect(history.urls).toEqual(['/credit/detail', '/credit']);
  });

  describe('même niveau : ordre des rubriques du registre', () => {
    const order = ['/credit', '/budget', '/aide'];
    it('rubrique plus bas : avancer', () => expect(run([push('/credit'), push('/budget')], order).directions[1]).toBe('forward'));
    it('rubrique plus haut : reculer', () => expect(run([push('/aide'), push('/credit')], order).directions[1]).toBe('back'));
    it('même rubrique, page différente de même niveau : fondu', () => {
      expect(run([push('/credit/a'), push('/credit/b')], order).directions[1]).toBe('same');
    });
    it('registre vide (rendu serveur, navMode none) : fondu', () => {
      expect(run([push('/credit'), push('/budget')], []).directions[1]).toBe('same');
    });
    it('rubrique absente du registre : fondu', () => {
      expect(run([push('/credit'), push('/inconnue')], order).directions[1]).toBe('same');
    });
    it('une sous-page se rattache à sa rubrique par préfixe de segment (/credit-auto n’est pas /credit)', () => {
      expect(run([push('/budget/a'), push('/credit/b')], order).directions[1]).toBe('back');
      expect(run([push('/credit-auto'), push('/aide')], order).directions[1]).toBe('same');
    });
  });
});
