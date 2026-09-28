#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Gera todos os ícones do site/PWA a partir de logo.png (raiz do projeto).
# Requer ImageMagick (convert). Uso:  bash scripts/make-icons.sh [arquivo]
# ---------------------------------------------------------------------------
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:-logo.png}"
[ -f "$SRC" ] || { echo "Arquivo não encontrado: $SRC"; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# 1. Recorta a área útil (fundo transparente) e adiciona folga de 4%.
convert "$SRC" -fuzz 3% -trim +repage \
  -bordercolor none -border 4%x4% "$WORK/emblem.png"

EW=$(identify -format "%w" "$WORK/emblem.png")
EH=$(identify -format "%h" "$WORK/emblem.png")
echo "arte útil (com folga): ${EW}x${EH}"

# quadrado <saída> <lado> <preencher 0|1> <fill> — fill = maior lado da arte / lado
square() {
  local out="$1" size="$2" opaque="$3" fill="$4" bg="none" box
  [ "$opaque" = "1" ] && bg="black"
  box=$(awk -v s="$size" -v f="$fill" -v e="$EW" -v h="$EH" \
    'BEGIN{m=(e>h?e:h); t=s*f; if(e>=h){w=t; hh=t*h/e} else {hh=t; w=t*e/h}
           printf "%dx%d", w+0.5, hh+0.5}')
  convert "$WORK/emblem.png" -resize "$box" -background "$bg" -gravity center \
    -extent "${size}x${size}" "$out"
}

# 2. Ícones do manifesto/PWA — fundo preto (combina com o splash #000000).
#    "any" ocupa quase todo o quadrado; maskable respeita a zona segura (62%).
square public/icon-192.png          192 1 0.90
square public/icon-512.png          512 1 0.90
square public/icon-maskable-512.png 512 1 0.62
square public/apple-touch-icon.png  180 1 0.88

# 3. Ícone da aba do navegador (fundo transparente, vários tamanhos).
square "$WORK/f48.png" 48 0 0.98
square "$WORK/f32.png" 32 0 0.98
square "$WORK/f16.png" 16 0 0.98
convert "$WORK/f16.png" "$WORK/f32.png" "$WORK/f48.png" public/favicon.ico

# 4. Logo usada dentro do sistema (barra lateral, login, portal) — translúcida.
convert "$WORK/emblem.png" -resize 640x640 public/images/logo.png

echo "OK — ícones gerados:"
ls -la public/icon-*.png public/apple-touch-icon.png public/favicon.ico public/images/logo.png
