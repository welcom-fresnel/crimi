#!/bin/bash

# Script de vérification de la configuration d'un poste
# Usage: ./check-config.sh

echo "═══════════════════════════════════════════════════"
echo "🔍 Vérification de la configuration"
echo "═══════════════════════════════════════════════════"
echo ""

ERRORS=0
WARNINGS=0

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "backend" ]; then
    echo "❌ Erreur: Ce script doit être exécuté à la racine du projet"
    exit 1
fi

cd backend

# Vérifier que .env existe
if [ ! -f ".env" ]; then
    echo "❌ Erreur: Le fichier .env n'existe pas"
    echo "   Créez-le en copiant .env.example"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ Fichier .env trouvé"
fi

# Charger les variables d'environnement
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Vérifier les variables requises
echo ""
echo "📋 Vérification des variables d'environnement:"
echo ""

# PORT
if [ -z "$PORT" ]; then
    echo "❌ PORT n'est pas défini"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ PORT=$PORT"
    
    # Vérifier si le port est utilisé
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  Le port $PORT est déjà utilisé"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL n'est pas défini"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ DATABASE_URL est défini"
    
    # Tester la connexion à la base de données
    echo "   Test de connexion à la base de données..."
    if psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ Connexion à la base de données réussie"
    else
        echo "❌ Impossible de se connecter à la base de données"
        ERRORS=$((ERRORS + 1))
    fi
fi

# JWT_SECRET
if [ -z "$JWT_SECRET" ]; then
    echo "❌ JWT_SECRET n'est pas défini"
    ERRORS=$((ERRORS + 1))
else
    if [ "$JWT_SECRET" = "your-secret-key-change-this" ] || [ "$JWT_SECRET" = "votre-secret-jwt-super-securise-changez-moi-en-production" ]; then
        echo "⚠️  JWT_SECRET utilise la valeur par défaut (INSÉCURISÉ)"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "✅ JWT_SECRET est défini"
    fi
fi

# CORS_ORIGIN
if [ -z "$CORS_ORIGIN" ]; then
    echo "❌ CORS_ORIGIN n'est pas défini"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ CORS_ORIGIN=$CORS_ORIGIN"
fi

# POST_ID
if [ -z "$POST_ID" ]; then
    echo "⚠️  POST_ID n'est pas défini (optionnel mais recommandé)"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ POST_ID=$POST_ID"
fi

# Vérifier Prisma
echo ""
echo "📦 Vérification de Prisma:"
echo ""

if command -v npx >/dev/null 2>&1; then
    if npx prisma --version > /dev/null 2>&1; then
        echo "✅ Prisma est installé"
        
        # Vérifier que le client est généré
        if [ -d "node_modules/.prisma/client" ]; then
            echo "✅ Client Prisma généré"
        else
            echo "⚠️  Client Prisma non généré (exécutez: npm run prisma:generate)"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo "❌ Prisma n'est pas installé"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo "❌ npx n'est pas disponible"
    ERRORS=$((ERRORS + 1))
fi

# Résumé
echo ""
echo "═══════════════════════════════════════════════════"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ Configuration valide !"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Configuration valide avec $WARNINGS avertissement(s)"
    exit 0
else
    echo "❌ Configuration invalide: $ERRORS erreur(s), $WARNINGS avertissement(s)"
    exit 1
fi

