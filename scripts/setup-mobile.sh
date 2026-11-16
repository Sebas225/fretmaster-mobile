#!/bin/bash
set -e
cd "$(dirname "$0")/.."
echo "==============================================================="
echo "  FretMaster Studio - Inicializador Móvil (Android + iOS)"
echo "==============================================================="
if ! command -v node >/dev/null 2>&1; then
  echo "[!] Instala Node.js LTS desde https://nodejs.org primero."
  exit 1
fi
npm install
[ ! -d "android" ] && npx cap add android
if [ "$(uname)" = "Darwin" ] && [ ! -d "ios" ]; then
  npx cap add ios
fi
npx @capacitor/assets generate || true
npx cap sync
echo "[OK] Proyectos nativos listos. Ejecuta 'npm run open:android' o 'npm run open:ios'."
