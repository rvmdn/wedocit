@echo off
title WeDocIt Studio Desktop Launcher
cd /d "%~dp0"

echo ========================================================
echo  WeDocIt Studio Desktop v3.0 - Unit Test Documentation
echo ========================================================
echo.

echo [WeDocIt] Memeriksa server latar belakang...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4400/api/ping' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }"
if %errorlevel% equ 0 (
    echo [WeDocIt] Server sudah berjalan aktif. Membuka jendela aplikasi...
    goto OpenApp
)

echo [WeDocIt] Menjalankan server lokal mandiri di latar belakang...
start /b "" node server.js

:WaitForServer
timeout /t 1 /nobreak >nul
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://127.0.0.1:4400/api/ping' -TimeoutSec 1 -UseBasicParsing; exit 0 } catch { exit 1 }"
if %errorlevel% neq 0 goto WaitForServer

:OpenApp
echo [WeDocIt] Membuka jendela Studio Desktop...
start "" msedge.exe --app=http://127.0.0.1:4400 --window-size=1366,768
if %errorlevel% neq 0 (
    start "" chrome.exe --app=http://127.0.0.1:4400 --window-size=1366,768
)
if %errorlevel% neq 0 (
    start http://127.0.0.1:4400
)

exit
