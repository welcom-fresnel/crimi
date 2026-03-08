@echo off
REM Launch Frontend and Backend
REM Auto-detect IP and start both services

SETLOCAL ENABLEDELAYEDEXPANSION

echo.
echo ========================================
echo  Launching Securit Afrique Hub
echo ========================================
echo.

REM Check if .env files exist
if not exist "backend\.env" (
    echo ERROR: backend\.env not found
    echo Run setup-network.bat first
    pause
    exit /b 1
)

if not exist "frontend\.env" (
    echo ERROR: frontend\.env not found
    echo Run setup-network.bat first
    pause
    exit /b 1
)

REM Detect current local IP
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /i "IPv4"') do (
    set "CURRENT_IP=%%A"
    goto :found_current_ip
)

echo ERROR: Cannot determine current IP address
pause
exit /b 1

:found_current_ip
set "CURRENT_IP=!CURRENT_IP: =!"

REM Extract configured IP from backend .env
for /f "tokens=2 delims==" %%A in ('findstr /b "BACKEND_IP=" backend\.env') do (
    set "CONFIG_IP=%%A"
)

if not "!CURRENT_IP!"=="!CONFIG_IP!" (
    echo.
    echo WARNING: Network change detected
    echo Current IP   : !CURRENT_IP!
    echo Configured IP: !CONFIG_IP!
    echo.
    choice /C YN /M "Run setup-network.bat now to regenerate .env files?"
    if !errorlevel! equ 1 (
        call setup-network.bat
        if !errorlevel! neq 0 (
            echo ERROR: setup-network.bat failed
            pause
            exit /b 1
        )
    ) else (
        echo Continuing with existing configuration...
    )
)

echo Configuration found. Starting services...
echo.

REM Check PostgreSQL
echo Checking PostgreSQL...
sc query postgresql-x64-18 | find "RUNNING" >nul
if !errorlevel! equ 0 (
    echo OK PostgreSQL is running
) else (
    echo Starting PostgreSQL...
    net start postgresql-x64-18
)
echo.

REM Extract IP from backend .env
for /f "tokens=2 delims==" %%A in ('findstr "BACKEND_IP" backend\.env') do (
    set "IP=%%A"
)

echo IP: !IP!
echo.

REM Start Backend
echo Starting Backend (Port 5000)...
start "Backend - Securit Afrique Hub" cmd /k "cd backend && npm run dev"
timeout /t 5 /nobreak

REM Start Frontend
echo Starting Frontend (Port 8080)...
start "Frontend - Securit Afrique Hub" cmd /k "cd frontend && npm run dev"
timeout /t 3 /nobreak

echo.
echo ========================================
echo  Services Started
echo ========================================
echo.
echo Access addresses:
echo   Backend API: http://!IP!:5000/api
echo   WebSocket:   ws://!IP!:5000
echo   Frontend:    http://!IP!:8080
echo.
echo From another device:
echo   Open: http://!IP!:8080
echo.
echo Two windows have opened for Backend and Frontend.
echo Close them to stop the services.
echo.
