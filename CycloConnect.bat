@echo off
title CycloConnect
cd /d "%~dp0"

if exist "%~dp0release\win-unpacked\CycloConnect.exe" (
    start "" "%~dp0release\win-unpacked\CycloConnect.exe"
    exit /b 0
)

echo Starting CycloConnect via npm...
npm start
