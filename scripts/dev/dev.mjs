#!/usr/bin/env node
// Moteur « installer / construire / lancer » générique, identique dans les 4 repos du simulateur.
// Il lit dev.config.json à la racine du repo. Aucune dépendance npm, ESM, multiplateforme.
//
// Usage : node scripts/dev/dev.mjs <install|build|start> [--no-neighbors]
//   install : repos voisins (clonage + build), étapes d'installation, étapes de build
//   build   : étapes d'installation puis de build de CE repo (utilisé par les repos qui en dépendent)
//   start   : lance les processus déclarés, attend leur santé, ouvre le navigateur, arrête tout sur Ctrl+C
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIN_NODE = [24, 15];
const GITHUB_OWNER = 'LionelCointot';

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
const palette = { cyan: 36, magenta: 35, yellow: 33, green: 32, blue: 34, red: 31, gray: 90 };
const paint = (color, text) => (useColor ? `\u001b[${palette[color] ?? 0}m${text}\u001b[0m` : text);

class DevError extends Error {}
const fail = (message) => { throw new DevError(message); };
const info = (message) => console.log(paint('gray', `[dev] ${message}`));
const title = (message) => console.log(`\n${paint('green', '==>')} ${message}`);

// ---------------------------------------------------------------- configuration

function loadConfig() {
  const file = path.join(root, 'dev.config.json');
  if (!existsSync(file)) fail(`Fichier dev.config.json introuvable dans ${root}.`);
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    return fail(`dev.config.json invalide : ${error.message}`);
  }
}

function checkNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < MIN_NODE[0] || (major === MIN_NODE[0] && minor < MIN_NODE[1])) {
    fail(`Node ${MIN_NODE.join('.')} ou plus récent est requis (version actuelle : ${process.versions.node}). Relancez via installer.command / installer.cmd.`);
  }
}

const resolveIn = (base, relative) => path.resolve(base, relative ?? '.');
const quote = (value) => `"${value}"`;

// ---------------------------------------------------------------- exécution de commandes

/** Exécute une commande dans un shell en héritant de la sortie ; lève une erreur nommant la commande fautive. */
function runCommand(command, cwd, label, env = {}) {
  console.log(paint('gray', `$ ${command}`) + paint('gray', `   (${path.relative(root, cwd) || '.'})`));
  const result = spawnSync(command, { cwd, shell: true, stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.error) fail(`${label} : impossible de lancer « ${command} » (${result.error.message}).`);
  if (result.status !== 0) fail(`${label} : la commande « ${command} » a échoué (code ${result.status ?? result.signal}).`);
}

function commandExists(name) {
  const probe = spawnSync(isWindows ? 'where' : 'which', [name], { stdio: 'ignore' });
  return probe.status === 0;
}

// ---------------------------------------------------------------- étapes d'installation et de build

function runStep(step, base) {
  const label = step.name ?? step.type;
  const cwd = resolveIn(base, step.cwd);
  const optional = step.optional === true;

  switch (step.type) {
    case 'dotnet': {
      const target = resolveIn(base, step.path);
      if (!existsSync(target)) return skip(label, optional, `${step.path} n'existe pas`);
      title(`${label} (.NET)`);
      runCommand(`dotnet restore ${quote(target)}`, base, label);
      runCommand(`dotnet build ${quote(target)} --no-restore`, base, label);
      return undefined;
    }
    case 'npm': {
      if (!existsSync(path.join(cwd, 'package.json'))) return skip(label, optional, `pas de package.json dans ${step.cwd ?? '.'}`);
      title(`${label} (npm)`);
      // « ci » seulement si demandé et si un verrou existe ; les dépendances « file: » exigent « install ».
      const useCi = step.mode === 'ci' && existsSync(path.join(cwd, 'package-lock.json'));
      runCommand(useCi ? 'npm ci' : 'npm install', cwd, label);
      return undefined;
    }
    case 'command': {
      if (!existsSync(cwd)) return skip(label, optional, `le dossier ${step.cwd ?? '.'} n'existe pas`);
      if (step.requires && !existsSync(resolveIn(cwd, step.requires))) return skip(label, optional, `${step.requires} est absent`);
      title(label);
      runCommand(step.command, cwd, label);
      return undefined;
    }
    default:
      return fail(`Étape « ${label} » : type inconnu « ${step.type} » (dotnet, npm ou command attendu).`);
  }
}

function skip(label, optional, reason) {
  if (!optional) fail(`Étape « ${label} » impossible : ${reason}.`);
  info(`Étape « ${label} » ignorée : ${reason}.`);
}

function runSteps(steps = [], base = root) {
  for (const step of steps) runStep(step, base);
}

// ---------------------------------------------------------------- repos voisins

function ensureNeighbors(config) {
  for (const neighbor of config.neighbors ?? []) {
    const name = typeof neighbor === 'string' ? neighbor : neighbor.name;
    const directory = path.resolve(root, '..', name);
    title(`Repo voisin ${name}`);
    if (!existsSync(directory)) {
      if (!commandExists('git')) {
        fail(`Le repo voisin « ${name} » est absent de ${path.dirname(directory)} et git n'est pas installé. Installez git (https://git-scm.com/downloads) ou clonez-le à la main : https://github.com/${GITHUB_OWNER}/${name}.git`);
      }
      runCommand(`git clone https://github.com/${GITHUB_OWNER}/${name}.git ${quote(directory)}`, path.dirname(directory), `clonage de ${name}`);
    } else {
      info(`${name} présent : ${directory}`);
    }

    const engine = path.join(directory, 'scripts', 'dev', 'dev.mjs');
    if (existsSync(engine)) {
      runCommand(`${quote(process.execPath)} ${quote(engine)} build --no-neighbors`, directory, `build de ${name}`);
    } else {
      info(`${name} n'a pas encore de scripts/dev/dev.mjs : son build est ignoré (copiez les scripts dans ce repo).`);
    }
  }
}

// ---------------------------------------------------------------- lancement

const children = [];
let stopping = false;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => server.close(() => resolve(true)));
    server.listen(port, '127.0.0.1');
  });
}

function killTree(child) {
  if (child.exitCode !== null || child.pid === undefined) return;
  if (isWindows) {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { /* déjà arrêté */ }
  }
}

function forceKillTree(child) {
  if (child.exitCode !== null || isWindows || child.pid === undefined) return;
  try { process.kill(-child.pid, 'SIGKILL'); } catch { /* déjà arrêté */ }
}

async function stopAll(code) {
  if (stopping) return;
  stopping = true;
  console.log(paint('gray', '\n[dev] Arrêt des processus…'));
  children.forEach((entry) => killTree(entry.child));
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline && children.some((entry) => entry.child.exitCode === null && entry.child.signalCode === null)) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  children.forEach((entry) => forceKillTree(entry.child));
  process.exit(code);
}

function pipeWithPrefix(stream, prefix, target) {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    pending += chunk;
    const lines = pending.split(/\r?\n/);
    pending = lines.pop() ?? '';
    for (const line of lines) target.write(`${prefix} ${line}\n`);
  });
  stream.on('end', () => { if (pending) target.write(`${prefix} ${pending}\n`); });
}

function startProcess(spec, index) {
  const colors = ['cyan', 'magenta', 'yellow', 'blue'];
  const prefix = paint(spec.color ?? colors[index % colors.length], `[${spec.name}]`);
  const cwd = resolveIn(root, spec.cwd);
  const child = spawn(spec.command, {
    cwd,
    shell: true,
    detached: !isWindows,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0', ...spec.env },
  });
  const entry = { spec, child };
  children.push(entry);
  pipeWithPrefix(child.stdout, prefix, process.stdout);
  pipeWithPrefix(child.stderr, prefix, process.stderr);
  child.on('error', (error) => {
    console.error(`${prefix} impossible de lancer « ${spec.command} » : ${error.message}`);
    void stopAll(1);
  });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(paint('red', `[dev] « ${spec.command} » (${spec.name}) s'est arrêté (code ${code ?? signal}).`));
    void stopAll(code === 0 ? 0 : 1);
  });
  return entry;
}

async function waitForUrl(url, entry, timeoutSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  while (Date.now() < deadline) {
    if (stopping) return;
    if (entry.child.exitCode !== null) fail(`« ${entry.spec.command} » s'est arrêté avant d'être prêt.`);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (response.status < 500) return;
    } catch { /* pas encore prêt */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  fail(`${url} ne répond pas après ${timeoutSeconds} s (processus « ${entry.spec.name} »).`);
}

function openBrowser(url) {
  const command = isWindows ? 'cmd' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = isWindows ? ['/c', 'start', '""', url] : [url];
  const opener = spawn(command, args, { stdio: 'ignore', detached: true });
  opener.on('error', () => info(`Impossible d'ouvrir le navigateur : ouvrez ${url} à la main.`));
  opener.unref();
}

async function start(config) {
  const section = config.start ?? {};
  const specs = [];
  for (const spec of section.processes ?? []) {
    const cwd = resolveIn(root, spec.cwd);
    if (!existsSync(cwd) || (spec.requires && !existsSync(resolveIn(cwd, spec.requires)))) {
      if (spec.optional) { info(`Processus « ${spec.name} » ignoré : ${spec.cwd ?? '.'} (ou ${spec.requires}) est absent.`); continue; }
      fail(`Processus « ${spec.name} » impossible : ${spec.cwd ?? '.'} est absent.`);
    }
    specs.push(spec);
  }
  if (specs.length === 0) fail('Aucun processus à lancer (voir start.processes dans dev.config.json).');

  title('Vérification des ports');
  for (const spec of specs.filter((candidate) => candidate.port)) {
    if (!(await isPortFree(spec.port))) {
      fail(`Le port ${spec.port} (« ${spec.name} ») est déjà utilisé. Fermez l'application qui l'occupe (une session précédente encore ouverte ?) puis relancez.`);
    }
    info(`Port ${spec.port} libre (${spec.name}).`);
  }

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => void stopAll(0));
  process.on('exit', () => children.forEach((entry) => killTree(entry.child)));

  title('Démarrage');
  const started = specs.map((spec, index) => startProcess(spec, index));
  for (const entry of started.filter((candidate) => candidate.spec.health)) {
    info(`Attente de ${entry.spec.health} …`);
    await waitForUrl(entry.spec.health, entry, entry.spec.healthTimeoutSeconds ?? 240);
    console.log(paint('green', `[dev] ${entry.spec.name} est prêt : ${entry.spec.health}`));
  }

  const target = (section.open ?? []).find((candidate) => !candidate.process || started.some((entry) => entry.spec.name === candidate.process));
  if (target) {
    openBrowser(target.url);
    console.log(paint('green', `\n[dev] Application disponible : ${target.url}`));
  }
  console.log(paint('gray', '[dev] Ctrl+C (ou fermeture de cette fenêtre) arrête tout.'));
  await new Promise(() => { /* reste actif tant que les processus tournent ; stopAll quitte */ });
}

// ---------------------------------------------------------------- point d'entrée

async function main() {
  const [command, ...flags] = process.argv.slice(2);
  if (!['install', 'build', 'start'].includes(command ?? '')) {
    fail('Usage : node scripts/dev/dev.mjs <install|build|start> [--no-neighbors]');
  }
  checkNodeVersion();
  const config = loadConfig();
  const withNeighbors = !flags.includes('--no-neighbors');

  if (command === 'install') {
    if (withNeighbors) ensureNeighbors(config);
    runSteps(config.install);
    runSteps(config.build);
    console.log(paint('green', `\n[dev] Installation terminée pour ${config.name ?? path.basename(root)}.`));
  } else if (command === 'build') {
    runSteps(config.install);
    runSteps(config.build);
    console.log(paint('green', `\n[dev] Build terminé pour ${config.name ?? path.basename(root)}.`));
  } else {
    await start(config);
  }
}

main().catch((error) => {
  console.error(paint('red', `\n[dev] ÉCHEC : ${error instanceof DevError ? error.message : error.stack}`));
  if (children.length > 0) void stopAll(1);
  else process.exit(1);
});
