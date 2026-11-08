#!/usr/bin/env bash
# Prépare Node et .NET (installés dans le dossier utilisateur, sans droits administrateur) puis délègue à dev.mjs.
# Usage : bash scripts/dev/bootstrap.sh <install|build|start|admin>   (admin : panneau des serveurs, finance-hub seulement)
# Variables facultatives : SIMULATEUR_DEV_HOME (défaut ~/.local/share/simulateur-dev), SIMULATEUR_DOTNET_DIR (défaut ~/.dotnet).
set -euo pipefail

NODE_VERSION="24.22.2"
NODE_MIN_MAJOR=24
NODE_MIN_MINOR=15
DEV_HOME="${SIMULATEUR_DEV_HOME:-$HOME/.local/share/simulateur-dev}"
DOTNET_DIR="${SIMULATEUR_DOTNET_DIR:-$HOME/.dotnet}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMMAND="${1:-}"

step() { printf '\n==> %s\n' "$1"; }
info() { printf '    %s\n' "$1"; }
die() { printf '\nERREUR : %s\n' "$1" >&2; exit 1; }

case "$COMMAND" in
  install | build | start | admin) ;;
  *) die "Usage : bash scripts/dev/bootstrap.sh <install|build|start|admin>" ;;
esac

download() { # url fichier
  if command -v curl >/dev/null 2>&1; then curl -fsSL "$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then wget -q "$1" -O "$2"
  else die "Ni curl ni wget n'est disponible : impossible de télécharger $1."
  fi
}

sha256_of() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | cut -d' ' -f1
  else shasum -a 256 "$1" | cut -d' ' -f1
  fi
}

node_is_recent_enough() { # chemin de node
  local version
  version="$("$1" -p 'process.versions.node' 2>/dev/null)" || return 1
  local major="${version%%.*}" rest="${version#*.}"
  local minor="${rest%%.*}"
  [ "$major" -gt "$NODE_MIN_MAJOR" ] || { [ "$major" -eq "$NODE_MIN_MAJOR" ] && [ "$minor" -ge "$NODE_MIN_MINOR" ]; }
}

install_node() {
  local os arch
  case "$(uname -s)" in
    Darwin) os="darwin" ;;
    Linux) os="linux" ;;
    *) die "Système non pris en charge ($(uname -s)). Sous Windows, utilisez installer.cmd." ;;
  esac
  case "$(uname -m)" in
    arm64 | aarch64) arch="arm64" ;;
    x86_64 | amd64) arch="x64" ;;
    *) die "Architecture non prise en charge ($(uname -m))." ;;
  esac

  local name="node-v${NODE_VERSION}-${os}-${arch}"
  local target="$DEV_HOME/node/$name"
  if [ ! -x "$target/bin/node" ]; then
    info "Téléchargement de Node v${NODE_VERSION} (${os}-${arch}) depuis nodejs.org…"
    local base="https://nodejs.org/dist/v${NODE_VERSION}" work
    work="$(mktemp -d)"
    download "$base/$name.tar.gz" "$work/$name.tar.gz"
    download "$base/SHASUMS256.txt" "$work/SHASUMS256.txt"
    local expected actual
    expected="$(grep " $name.tar.gz\$" "$work/SHASUMS256.txt" | cut -d' ' -f1)"
    [ -n "$expected" ] || die "Somme de contrôle introuvable pour $name.tar.gz dans SHASUMS256.txt."
    actual="$(sha256_of "$work/$name.tar.gz")"
    [ "$expected" = "$actual" ] || die "Somme SHA-256 de Node incorrecte (attendue $expected, obtenue $actual). Téléchargement abandonné."
    info "Somme SHA-256 vérifiée."
    mkdir -p "$DEV_HOME/node"
    tar -xzf "$work/$name.tar.gz" -C "$work"
    rm -rf "$target"
    mv "$work/$name" "$target"
    rm -rf "$work"
  fi
  export PATH="$target/bin:$PATH"
}

has_dotnet_10() { # chemin de dotnet
  "$1" --list-sdks 2>/dev/null | grep -q '^10\.'
}

install_dotnet() {
  local work
  work="$(mktemp -d)"
  info "Téléchargement du script officiel dotnet-install (https://dot.net/v1/dotnet-install.sh)…"
  download "https://dot.net/v1/dotnet-install.sh" "$work/dotnet-install.sh"
  info "Installation du SDK .NET 10 dans $DOTNET_DIR (quelques minutes)…"
  bash "$work/dotnet-install.sh" --channel 10.0 --install-dir "$DOTNET_DIR" --no-path
  rm -rf "$work"
}

step "Node.js (version $NODE_MIN_MAJOR.$NODE_MIN_MINOR ou plus récente)"
if command -v node >/dev/null 2>&1 && node_is_recent_enough "$(command -v node)"; then
  info "Node $(node -p 'process.versions.node') détecté : $(command -v node)"
else
  install_node
  node_is_recent_enough "$(command -v node)" || die "Node installé mais inutilisable."
  info "Node $(node -p 'process.versions.node') prêt (dossier utilisateur)."
fi

step "SDK .NET 10"
if command -v dotnet >/dev/null 2>&1 && has_dotnet_10 "$(command -v dotnet)"; then
  info "SDK .NET détecté : $(command -v dotnet)"
else
  if [ ! -x "$DOTNET_DIR/dotnet" ] || ! has_dotnet_10 "$DOTNET_DIR/dotnet"; then
    install_dotnet
  fi
  has_dotnet_10 "$DOTNET_DIR/dotnet" || die "Le SDK .NET 10 n'est pas utilisable dans $DOTNET_DIR."
  export DOTNET_ROOT="$DOTNET_DIR"
  export PATH="$DOTNET_DIR:$PATH"
  info "SDK .NET $(dotnet --version) prêt : $DOTNET_DIR"
fi
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1

cd "$ROOT"
if [ "$COMMAND" = "admin" ]; then
  [ -f scripts/dev/admin.mjs ] || die "Le panneau des serveurs n'existe que dans finance-hub."
  step "node scripts/dev/admin.mjs"
  exec node scripts/dev/admin.mjs
fi
step "node scripts/dev/dev.mjs $COMMAND"
exec node scripts/dev/dev.mjs "$COMMAND"
