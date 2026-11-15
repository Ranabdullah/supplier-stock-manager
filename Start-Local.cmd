@echo off
title Supplier Stock Manager - local workspace
cd /d "%~dp0"
echo Opens Supplier Stock Manager on this PC. Saves records in your browser.
echo First run downloads pinned dependencies. No business records are uploaded. Keep this window open.
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 22+ from https://nodejs.org/en/download then try again.
 pause
 exit /b 1
)
if not exist "dist\index.html" (
 echo First run: installing the pinned build tools and preparing the app.
 call npm ci
 if errorlevel 1 exit /b 1
 call npm run build
 if errorlevel 1 exit /b 1
)
node local-server.cjs --open
pause
