@echo off
title Addon - Multi-Target Production Build
echo ==========================================
echo    STARTPAGE ADDON - COMPLETE PRODUCTION BUILD
echo ==========================================
echo.

echo [1/4] Cleaning old dist folder...
if exist dist (
    rmdir /s /q dist
)

echo [2/4] Creating fresh dist folder...
mkdir dist

echo [3/4] Building Firefox Target...
call npx pnpm build:firefox
if %ERRORLEVEL% NEQ 0 goto build_failed

echo [4/4] Building Chrome/Brave Target...
call npx pnpm build:chrome
if %ERRORLEVEL% NEQ 0 goto build_failed

echo.
echo ==========================================
echo    BUILD SUCCESSFUL!
echo    Outputs are ready in:
echo    - dist/firefox/  (For your Firefox)
echo    - dist/chrome/   (For Brave)
echo ==========================================
goto end

:build_failed
echo.
echo xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
echo    BUILD FAILED! Check the errors above.
echo xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
echo.

:end
pause