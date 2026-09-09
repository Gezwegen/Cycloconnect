@echo off
title Upload CycloConnect to GitHub
cd /d "%~dp0"

echo ========================================================
echo   Uploading CycloConnect to GitHub...
echo   Repository: https://github.com/Gezwegen/Cycloconnect
echo ========================================================
echo.

git push -u origin main

echo.
if %ERRORLEVEL% EQU 0 (
    echo ========================================================
    echo   [SUCCESS] Successfully uploaded to GitHub!
    echo ========================================================
) else (
    echo [ERROR] Git push encountered an issue. See message above.
)
echo.
pause
