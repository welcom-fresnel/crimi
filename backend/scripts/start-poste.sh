#!/bin/bash

# Script de démarrage rapide pour un poste de police
# Usage: ./start-poste.sh [POSTE_NAME] [BACKEND_PORT] [FRONTEND_PORT]

POSTE_NAME=${1:-"POSTE_A"}
BACKEND_PORT=${2:-5000}
FRONTEND_PORT=${3:-8080}

echo "═══════════════════════════════════════════════════"
echo "🚀 Démarrage du $POSTE_NAME"
echo "═══════════════════════════════════════════════════"
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Erreur: Ce script doit être exécuté à la racine du projet"
    exit 1
fi

# Vérifier que le fichier .env existe
if [ ! -f "backend/.env" ]; then
    echo "❌ Erreur: Le fichier backend/.env n'existe pas"
    echo "   Créez-le en copiant backend/.env.example"
    exit 1
fi

# Vérifier que PostgreSQL est accessible
echo "🔍 Vérification de la base de données..."
cd backend
if ! npm run prisma:generate > /dev/null 2>&1; then
    echo "⚠️  Avertissement: Impossible de générer le client Prisma"
fi
cd ..

# Démarrer le backend
echo ""
echo "🔧 Démarrage du backend sur le port $BACKEND_PORT..."
cd backend
npm start > ../logs/backend-$POSTE_NAME.log 2>&1 &
BACKEND_PID=$!
cd ..

# Attendre que le backend démarre
sleep 3

# Vérifier que le backend est démarré
if ! curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null; then
    echo "❌ Erreur: Le backend n'a pas démarré correctement"
    echo "   Vérifiez les logs: logs/backend-$POSTE_NAME.log"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo "✅ Backend démarré (PID: $BACKEND_PID)"

# Démarrer le frontend
echo ""
echo "🎨 Démarrage du frontend sur le port $FRONTEND_PORT..."
cd frontend
npm run dev > ../logs/frontend-$POSTE_NAME.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Attendre que le frontend démarre
sleep 3

echo "✅ Frontend démarré (PID: $FRONTEND_PID)"
echo ""
echo "═══════════════════════════════════════════════════"
echo "✅ $POSTE_NAME démarré avec succès !"
echo "═══════════════════════════════════════════════════"
echo ""
echo "📍 Backend:  http://localhost:$BACKEND_PORT"
echo "📍 Frontend: http://localhost:$FRONTEND_PORT"
echo "📍 API Health: http://localhost:$BACKEND_PORT/api/health"
echo ""
echo "📋 Logs:"
echo "   - Backend:  logs/backend-$POSTE_NAME.log"
echo "   - Frontend: logs/frontend-$POSTE_NAME.log"
echo ""
echo "🛑 Pour arrêter:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Créer le dossier logs s'il n'existe pas
mkdir -p logs

# Attendre la fin (Ctrl+C pour arrêter)
trap "echo ''; echo '⏳ Arrêt en cours...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait

