@echo off
REM Script de démarrage rapide pour un poste de police (Windows)
REM Usage: start-poste.bat [POSTE_NAME] [BACKEND_PORT] [FRONTEND_PORT]

setlocal enabledelayedexpansion

set POSTE_NAME=%1
if "%POSTE_NAME%"=="" set POSTE_NAME=POSTE_A

set BACKEND_PORT=%2
if "%BACKEND_PORT%"=="" set BACKEND_PORT=5000

set FRONTEND_PORT=%3
if "%FRONTEND_PORT%"=="" set FRONTEND_PORT=8080

echo ===============================================================
echo 🚀 Démarrage du %POSTE_NAME%
echo ===============================================================
echo.

REM Vérifier que nous sommes dans le bon répertoire
if not exist "backend" (
    echo ❌ Erreur: Ce script doit être exécuté à la racine du projet
    exit /b 1
)

if not exist "frontend" (
    echo ❌ Erreur: Ce script doit être exécuté à la racine du projet
    exit /b 1
)

REM Vérifier que le fichier .env existe
if not exist "backend\.env" (
    echo ❌ Erreur: Le fichier backend\.env n'existe pas
    echo    Créez-le en copiant backend\.env.example
    exit /b 1
)

REM Créer le dossier logs s'il n'existe pas
if not exist "logs" mkdir logs

REM Démarrer le backend
echo 🔧 Démarrage du backend sur le port %BACKEND_PORT%...
start "Backend %POSTE_NAME%" cmd /k "cd backend && npm start"

REM Attendre que le backend démarre
timeout /t 5 /nobreak >nul

REM Démarrer le frontend
echo 🎨 Démarrage du frontend sur le port %FRONTEND_PORT%...
start "Frontend %POSTE_NAME%" cmd /k "cd frontend && npm run dev"

REM Attendre que le frontend démarre
timeout /t 5 /nobreak >nul

echo.
echo ===============================================================
echo ✅ %POSTE_NAME% démarré avec succès !
echo ===============================================================
echo.
echo 📍 Backend:  http://localhost:%BACKEND_PORT%
echo 📍 Frontend: http://localhost:%FRONTEND_PORT%
echo 📍 API Health: http://localhost:%BACKEND_PORT%/api/health
echo.
echo 🛑 Pour arrêter: Fermez les fenêtres "Backend" et "Frontend"
echo.

pause

