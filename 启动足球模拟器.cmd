@echo off
setlocal EnableExtensions EnableDelayedExpansion

cd /d "%~dp0"
title Football Career Simulator

if not exist "package.json" (
  echo [ERROR] package.json was not found.
  echo Put this launcher in the FootballSimulator project root.
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found.
  echo Install Node.js 24 or later, then run this launcher again.
  pause
  exit /b 1
)

where pnpm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] pnpm was not found.
  echo Run corepack enable or install pnpm 11, then try again.
  pause
  exit /b 1
)

if not exist "node_modules\.pnpm" (
  echo [INFO] Installing project dependencies for the first run...
  call pnpm install --frozen-lockfile
  if errorlevel 1 (
    echo [ERROR] Dependency installation failed.
    pause
    exit /b 1
  )
)

set "LAN_IP="
for /f "tokens=2 delims=:" %%I in ('ipconfig ^| findstr "IPv4"') do set "LAN_IP=%%I"
set "LAN_IP=!LAN_IP: =!"
if not defined LAN_IP set "LAN_IP=check your network settings"

echo.
echo ========================================
echo   Football Career Simulator is starting
echo ========================================
echo Computer: http://127.0.0.1:5173/
echo Phone/LAN: http://!LAN_IP!:5173/
echo Connect your phone and computer to the same Wi-Fi.
echo Close the minimized server window to stop the service.
echo.

start "Football Simulator Server" /min cmd /c "pnpm dev:lan"
timeout /t 2 /nobreak >nul
start "" http://127.0.0.1:5173/

echo Browser opened. Keep this window open to see the access address.
pause
endlocal