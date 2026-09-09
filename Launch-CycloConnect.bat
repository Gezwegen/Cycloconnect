@echo off
title CycloConnect Desktop
cd /d "%~dp0"

echo ========================================================
echo   Starting CycloConnect (Mio Cyclo GPS Desktop Hub)...
echo ========================================================
echo.

if exist "%~dp0release\win-unpacked\CycloConnect.exe" (
    echo Launching compiled CycloConnect application...
    start "" "%~dp0release\win-unpacked\CycloConnect.exe"
    exit /b 0
)

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js LTS from https://nodejs.org/ to run from source,
    echo or run "npm run package" to build the standalone executable.
    pause
    exit /b 1
)

echo Launching via Electron runtime...
npm start
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Application encountered an error while launching.
    pause
)

