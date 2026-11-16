@echo off
chcp 65001 >nul
cd /d "%~dp0.."
title FretMaster Studio - Setup Android (Capacitor)
echo ===============================================================
echo   FretMaster Studio - Inicializador Android Nativo
echo ===============================================================
where node >nul 2>nul
if %errorlevel% neq 0 (
  echo [!] Instala Node.js LTS desde https://nodejs.org primero.
  pause
  exit /b 1
)
call npm install || exit /b 1
if not exist android ( call npx cap add android )
call npx @capacitor/assets generate --android
call npx cap sync android
echo [OK] Plataforma Android lista. Abriendo en Android Studio...
call npx cap open android
pause
