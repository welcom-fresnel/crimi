@echo off
REM Setup Network Configuration - Auto-detect IP and configure frontend/backend
REM For Windows Command Prompt

SETLOCAL ENABLEDELAYEDEXPANSION

echo.
echo ========================================
echo  Network Auto-Detection
echo  Securit Afrique Hub
echo ========================================
echo.

REM Get local IP (non-localhost)
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /i "IPv4"') do (
    set "IP=%%A"
    goto :found_ip
)

echo ERROR: Cannot determine IP address
exit /b 1

:found_ip
set "IP=!IP: =!"

echo IP detected: !IP!
echo.

REM Create backend .env
echo Configuring backend/.env...
(
    echo # Database Configuration
    echo DATABASE_URL="postgresql://postgres:je ne sais pas@localhost:5432/securit_afrique_db?schema=public"
    echo.
    echo # Server Configuration
    echo PORT=5000
    echo NODE_ENV=development
    echo.
    echo # JWT Configuration
    echo JWT_SECRET=securit_afrique_jwt_secret_key_2024_change_in_production
    echo JWT_EXPIRES_IN=24h
    echo.
    echo # CORS Configuration - Auto-Detected IP
    echo CORS_ORIGIN=http://!IP!:8080
    echo BACKEND_IP=!IP!
) > backend\.env

echo OK backend\.env

REM Create frontend .env
echo Configuring frontend/.env...
(
    echo # API Configuration - Auto-Detected IP
    echo VITE_API_URL=http://!IP!:5000/api
    echo VITE_WS_URL=http://!IP!:5000
    echo VITE_BACKEND_IP=!IP!
    echo.
    echo # Poste Configuration
    echo VITE_POST_ID=POSTE_PRINCIPAL
) > frontend\.env

echo OK frontend/.env
echo.

REM Check PostgreSQL
echo Checking PostgreSQL...
sc query postgresql-x64-18 | find "RUNNING" >nul
if !errorlevel! equ 0 (
    echo OK PostgreSQL is running
) else (
    echo WARNING: PostgreSQL is not running
    echo         Try: net start postgresql-x64-18
)
echo.

REM Display summary
echo ========================================
echo  Configuration Successful
echo ========================================
echo.
echo IP detected: !IP!
echo.
echo Access addresses:
echo   Backend API: http://!IP!:5000/api
echo   WebSocket:   ws://!IP!:5000
echo   Frontend:    http://!IP!:8080
echo.
echo From another device on network:
echo   Open: http://!IP!:8080
echo.
echo Next steps:
echo   1. cd backend ^&^& npm install
echo   2. cd ..\frontend ^&^& npm install
echo   3. launch-app.bat
echo.
echo TIP: Run this script when you change networks!
echo.
pause
