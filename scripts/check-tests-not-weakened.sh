#!/usr/bin/env bash
# Échoue si le diff par rapport à la branche de base désactive, isole ou ignore un test.
# Usage : scripts/check-tests-not-weakened.sh [base]   (base par défaut : origin/main, sinon main)
# Lit les lignes ajoutées, dans les fichiers de test seulement. Une exception voulue se note dans CONSTRAINTS.md
# et se marque sur la ligne par le commentaire « test-weakening-allowed ».
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

base="${1:-}"
if [ -z "$base" ]; then
  if git rev-parse --verify --quiet origin/main >/dev/null; then base=origin/main; else base=main; fi
fi
merge_base="$(git merge-base "$base" HEAD 2>/dev/null || echo "$base")"

# Motifs : Vitest / Jest / Playwright, puis xUnit / NUnit / MSTest, puis un test C# mis hors compilation (#if false).
pattern='\.(skip|only|fixme|todo)\(|\b(xit|xdescribe|xtest|fit|fdescribe)\(|Skip *=|\[Ignore|\[Explicit|#if +(false|! *true)\b'

found="$(git diff "$merge_base" --unified=0 -- \
    '*.spec.ts' '*.test.ts' '*.spec.tsx' '*.test.tsx' '*Tests.cs' '*Test.cs' '**/e2e/**' '**/tests/**' \
  | grep -E '^\+[^+]' | grep -Ev 'test-weakening-allowed' | grep -E "$pattern" || true)"

if [ -n "$found" ]; then
  echo "Tests désactivés, isolés ou ignorés dans le diff (base : $base) :" >&2
  echo "$found" >&2
  exit 1
fi
echo "Aucun test désactivé ni isolé dans le diff (base : $base)."
