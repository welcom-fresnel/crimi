@echo off
REM Check network/API synchronization for a police workstation

SETLOCAL ENABLEDELAYEDEXPANSION

echo.
echo ========================================
echo  Sync Check - Securit Afrique Hub
echo ========================================
echo.

if not exist "frontend\.env" (
    echo ERROR: frontend\.env not found
    echo Run setup-network.bat first
    exit /b 1
)

for /f "tokens=2 delims==" %%A in ('findstr /b "VITE_API_URL=" frontend\.env') do (
    set "API_URL=%%A"
)

if "!API_URL!"=="" (
    echo ERROR: VITE_API_URL not found in frontend\.env
    exit /b 1
)

echo API URL: !API_URL!
echo.

for /f "tokens=1-3 delims=/: " %%A in ("!API_URL!") do (
    set "SCHEME=%%A"
    set "HOST_PORT=%%C"
)

for /f "tokens=1,2 delims=:" %%A in ("!HOST_PORT!") do (
    set "HOST=%%A"
    set "PORT=%%B"
)

if "!PORT!"=="" set "PORT=5000"

echo Testing TCP connectivity to !HOST!:!PORT! ...
powershell -NoProfile -Command "if (Test-NetConnection -ComputerName '!HOST!' -Port !PORT! -InformationLevel Quiet) { exit 0 } else { exit 1 }"
if !errorlevel! neq 0 (
    echo ERROR: TCP connection failed to !HOST!:!PORT!
    echo Check firewall/routing and backend service state.
    exit /b 1
)
echo OK TCP connectivity
echo.

echo Testing backend health endpoint...
curl -s -f "!API_URL!/health" >nul
if !errorlevel! neq 0 (
    echo ERROR: Backend health check failed
    echo Try: !API_URL!/health in browser
    exit /b 1
)

echo OK Backend health endpoint reachable
echo.
echo ========================================
echo  Sync check successful
echo ========================================
echo.
echo Next:
echo   1. If this is a new network, run setup-network.bat
echo   2. Start services with launch-app.bat
echo.
