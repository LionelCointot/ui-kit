import { describe, expect, it } from 'vitest';
import sysTokens from '../../../../tokens/src/sys/default.tokens.json';
import { LC_MOTION_DURATIONS, LC_MOTION_EASINGS } from './motion.types';

// Les types de rôles sont le contrat de `lcAnimate` : un rôle ajouté ou retiré dans les tokens doit l'être ici aussi.
describe('rôles de mouvement et tokens sys', () => {
  it('LcMotionDuration couvre exactement sys.duration.*', () => {
    expect([...LC_MOTION_DURATIONS].sort()).toEqual(Object.keys(sysTokens.sys.duration).sort());
  });

  it('LcMotionEasing couvre exactement sys.easing.*, hors emphasized', () => {
    expect([...LC_MOTION_EASINGS].sort()).toEqual(Object.keys(sysTokens.sys.easing).filter((name) => name !== 'emphasized').sort());
  });
});
