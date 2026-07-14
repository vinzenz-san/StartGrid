@echo off
title Firefox + Brave - Simultaneous Dev Server
echo ==========================================
echo    STARTPAGE ADDON - LIVE DEV MODE (BOTH TARGETS)
echo ==========================================
echo.
echo Watching for file changes... 
echo Any code save will update both dist/firefox/ and dist/chrome/ instantly.
echo.

:: Ruft direkt die pnpm-Befehle im parallelen Modus auf
call npx concurrently "npx pnpm build:firefox --watch" "npx pnpm build:chrome --watch"

echo.
echo Der Dev-Server wurde gestoppt.
pause