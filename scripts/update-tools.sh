#!/usr/bin/env bash
# Met à jour graphify, impeccable, ponytail, les skills superpowers, ui-ux-pro-max et les skills officiels Angular et .NET dans ce repo, puis remet la config des hooks Claude Code en forme portable.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
export PATH="$HOME/.local/bin:$PATH"

echo "==> graphify"
if command -v uv >/dev/null 2>&1 && uv tool list 2>/dev/null | grep -q '^graphifyy'; then
  uv tool upgrade graphifyy
fi
graphify install --project --platform claude >/dev/null
graphify hook install >/dev/null   # ré-épingle l'interpréteur après une mise à jour

echo "==> impeccable"
npx -y impeccable@latest update -y

echo "==> ponytail (skill seul, sans les hooks du plugin)"
ref="${PONYTAIL_REF:-main}"   # épingler une version : PONYTAIL_REF=<commit>
base="https://raw.githubusercontent.com/DietrichGebert/ponytail/$ref"
mkdir -p .claude/skills/ponytail
curl -fsSL "$base/skills/ponytail/SKILL.md" -o .claude/skills/ponytail/SKILL.md
curl -fsSL "$base/LICENSE" -o .claude/skills/ponytail/LICENSE
printf 'Origine : https://github.com/DietrichGebert/ponytail (MIT), skills/ponytail/SKILL.md\nVersion : %s (%s)\nRecopié tel quel ; mise à jour : scripts/update-tools.sh. Hooks du plugin non installés.\n' "$ref" "$(date +%F)" > .claude/skills/ponytail/VERSION

echo "==> superpowers (2 skills, sans les hooks du plugin)"
# Version figée et relue (7.0.2). Changer de version : relire le diff amont, puis modifier la référence.
sp_ref="${SUPERPOWERS_REF:-22f0b463e7a5e579904dd6211a520321035526f7}"
sp_tmp="$(mktemp -d)"
trap 'rm -rf "$sp_tmp" "${uxpm_tmp:-}"' EXIT   # nettoie aussi le clone ui-ux-pro-max ci-dessous
git clone --quiet https://github.com/obra/superpowers.git "$sp_tmp"
git -C "$sp_tmp" checkout --quiet "$sp_ref"
for s in systematic-debugging verification-before-completion; do
  [ -d ".claude/skills/$s" ] || continue   # seulement les skills présents dans ce repo
  rsync -a --delete "$sp_tmp/skills/$s/" ".claude/skills/$s/"
  cp "$sp_tmp/LICENSE" ".claude/skills/$s/LICENSE"
  printf 'Origine : https://github.com/obra/superpowers (MIT), skills/%s\nVersion : %s (%s)\nRecopié tel quel ; mise à jour : scripts/update-tools.sh. Hooks du plugin non installés.\n' "$s" "$sp_ref" "$(date +%F)" > ".claude/skills/$s/VERSION"
done

echo "==> skills officiels Angular et .NET (recopiés tels quels, seulement ceux présents dans ce repo)"
# Versions figées et relues. Changer de version : relire le diff amont, puis modifier la référence.
ang_ref="${ANGULAR_SKILLS_REF:-fbc89151249871a2663882f582ca7f21a4927b48}"
dn_ref="${DOTNET_SKILLS_REF:-2877c712edc20643b72f64e2983b168e6661d607}"
off_tmp="$(mktemp -d)"
trap 'rm -rf "$sp_tmp" "${uxpm_tmp:-}" "$off_tmp"' EXIT
copy_official() {   # <url> <ref> <chemin amont> <skill> <licence>
  [ -d ".claude/skills/$4" ] || return 0
  [ -d "$off_tmp/$(basename "$1")" ] || git clone --quiet "$1.git" "$off_tmp/$(basename "$1")"
  git -C "$off_tmp/$(basename "$1")" checkout --quiet "$2"
  rsync -a --delete "$off_tmp/$(basename "$1")/$3/" ".claude/skills/$4/"
  printf 'Origine : %s (%s), %s\nVersion : %s (%s)\nRecopié tel quel ; mise à jour : scripts/update-tools.sh. Les conventions du projet priment en cas de conflit.\n' "$1" "$5" "$3" "$2" "$(date +%F)" > ".claude/skills/$4/VERSION"
}
copy_official https://github.com/angular/skills "$ang_ref" angular-developer angular-developer "MIT, Google LLC"
copy_official https://github.com/dotnet/skills "$dn_ref" plugins/dotnet-aspnetcore/skills/dotnet-webapi dotnet-webapi "MIT, .NET Foundation"
copy_official https://github.com/dotnet/skills "$dn_ref" plugins/dotnet-data/skills/optimizing-ef-core-queries optimizing-ef-core-queries "MIT, .NET Foundation"

echo "==> normalisation des hooks Claude Code"
node scripts/lib/normalize-claude-settings.mjs

echo "==> scan des skills tiers (SkillSpector, analyse statique)"
if [ -x scripts/scan-skills.sh ]; then
  scripts/scan-skills.sh || echo "  Des constats nouveaux sont à relire avant de commiter (voir ci-dessus)."
fi

git status --short .claude CLAUDE.md
echo "Relisez le diff puis commitez : git commit -am 'chore: met à jour graphify, impeccable et ponytail'"
