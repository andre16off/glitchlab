@echo off
title GLITCHLAB Server
color 0A

echo.
echo  GLITCHLAB v3.0
echo  ══════════════════════════════
echo.

:: Check Node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERROR: Node.js no encontrado.
    echo  Descargalo en https://nodejs.org
    pause
    exit /b 1
)

:: Install deps if needed
if not exist node_modules (
    echo  Instalando dependencias...
    call npm install
    echo.
)

echo  Arrancando servidor...
echo  Abre el browser en http://localhost:3000
echo  En TouchDesigner: WebSocket DAT → localhost:3000
echo.

node server/index.js

pause
