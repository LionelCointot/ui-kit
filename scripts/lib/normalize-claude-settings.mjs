#!/usr/bin/env node
// Normalise la config des hooks Claude Code après une installation ou une mise à jour de graphify / impeccable.
//
// 1. graphify écrit ses hooks avec un chemin absolu propre à la machine (/Users/.../graphify) :
//    on les remplace par une forme portable qui ne fait rien si graphify est absent.
// 2. impeccable écrit ses hooks dans .claude/settings.local.json (non versionné) :
//    on les déplace dans .claude/settings.json pour que tous les clones en profitent.
//
// Idempotent : peut être relancé sans risque.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? process.cwd();
const sharedPath = join(root, '.claude', 'settings.json');
const localPath = join(root, '.claude', 'settings.local.json');

const read = (p) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {});
const write = (p, data) => writeFileSync(p, JSON.stringify(data, null, 2) + '\n');

const GRAPHIFY_GUARD = /(?:^|[\s;])(?:\S*\/)?graphify hook-guard (\w+)/;
const portableGraphify = (mode) =>
  `export PATH="$HOME/.local/bin:$PATH"; command -v graphify >/dev/null 2>&1 || exit 0; graphify hook-guard ${mode}`;
const isImpeccable = (cmd) => cmd.includes('skills/impeccable/scripts/impeccable');

const shared = read(sharedPath);
const local = read(localPath);
shared.hooks ??= {};

// 1. graphify : forme portable
for (const groups of Object.values(shared.hooks)) {
  for (const group of groups) {
    for (const hook of group.hooks ?? []) {
      const match = hook.command?.match(GRAPHIFY_GUARD);
      if (match) hook.command = portableGraphify(match[1]);
    }
  }
}

// 2. impeccable : déplacer les hooks de settings.local.json vers settings.json
let moved = 0;
for (const [event, groups] of Object.entries(local.hooks ?? {})) {
  const keep = [];
  for (const group of groups) {
    const impeccableHooks = (group.hooks ?? []).filter((h) => isImpeccable(h.command ?? ''));
    if (impeccableHooks.length === 0) {
      keep.push(group);
      continue;
    }
    shared.hooks[event] ??= [];
    const alreadyThere = shared.hooks[event].some(
      (g) => g.matcher === group.matcher && (g.hooks ?? []).some((h) => isImpeccable(h.command ?? '')),
    );
    if (!alreadyThere) {
      shared.hooks[event].push({ ...group, hooks: impeccableHooks });
      moved++;
    }
    const others = (group.hooks ?? []).filter((h) => !isImpeccable(h.command ?? ''));
    if (others.length) keep.push({ ...group, hooks: others });
  }
  if (keep.length) local.hooks[event] = keep;
  else delete local.hooks[event];
}

write(sharedPath, shared);
if (existsSync(localPath)) {
  if (local.hooks && Object.keys(local.hooks).length === 0) delete local.hooks;
  delete local.description;
  write(localPath, local);
}
console.log(`settings.json normalisé (${moved} groupe(s) de hooks impeccable déplacé(s)).`);
