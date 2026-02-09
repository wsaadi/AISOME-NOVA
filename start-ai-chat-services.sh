#!/bin/bash

# Script de démarrage des services backend nécessaires pour AI Chat
# Ce script démarre les services backend requis pour l'application AI Chat

set -e

echo "========================================"
echo "Démarrage des services AI Chat Backend"
echo "========================================"

# Couleurs pour les logs
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction pour vérifier si un port est utilisé
check_port() {
    local port=$1
    local service_name=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo -e "${GREEN}✓${NC} $service_name déjà démarré sur le port $port"
        return 0
    else
        echo -e "${YELLOW}⚠${NC} $service_name n'est pas démarré sur le port $port"
        return 1
    fi
}

# Fonction pour démarrer un service
start_service() {
    local service_path=$1
    local port=$2
    local service_name=$3

    echo -e "\n${YELLOW}Démarrage de $service_name...${NC}"

    # Vérifier que le répertoire existe
    if [ ! -d "$service_path" ]; then
        echo -e "${RED}✗${NC} Répertoire non trouvé: $service_path"
        return 1
    fi

    # Aller dans le répertoire du service
    cd "$service_path"

    # Installer les dépendances si nécessaire
    if [ -f "requirements.txt" ]; then
        echo "Installation des dépendances..."
        pip install -q -r requirements.txt || {
            echo -e "${RED}✗${NC} Erreur lors de l'installation des dépendances"
            return 1
        }
    fi

    # Démarrer le service avec uvicorn en arrière-plan
    echo "Démarrage d'uvicorn sur le port $port..."
    nohup uvicorn app.main:app --host 0.0.0.0 --port $port > "/tmp/${service_name}.log" 2>&1 &
    local pid=$!

    # Attendre un peu que le service démarre
    sleep 2

    # Vérifier que le processus est toujours actif
    if ps -p $pid > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service_name démarré (PID: $pid)"
        echo "   Logs: /tmp/${service_name}.log"
        return 0
    else
        echo -e "${RED}✗${NC} Erreur lors du démarrage de $service_name"
        echo "   Consultez les logs: /tmp/${service_name}.log"
        return 1
    fi
}

# Répertoire de base
BASE_DIR="/home/user/agent-pf"

echo -e "\n${YELLOW}Vérification de l'état des services...${NC}"
echo "========================================"

# Vérifier l'état actuel des services
check_port 8013 "Prompt Moderation Tool"
NEED_MODERATION=$?

check_port 8014 "Content Classification Tool"
NEED_CLASSIFICATION=$?

check_port 8005 "Mistral Connector"
NEED_MISTRAL=$?

check_port 8012 "AI Chat Agent"
NEED_CHAT=$?

# Démarrer les services manquants
echo -e "\n${YELLOW}Démarrage des services manquants...${NC}"
echo "========================================"

# 1. Prompt Moderation Tool (Port 8013)
if [ $NEED_MODERATION -ne 0 ]; then
    start_service "$BASE_DIR/tools/prompt-moderation-tool" 8000 "prompt-moderation-tool"
fi

# 2. Content Classification Tool (Port 8014)
if [ $NEED_CLASSIFICATION -ne 0 ]; then
    start_service "$BASE_DIR/tools/content-classification-tool" 8000 "content-classification-tool"
fi

# 3. Mistral Connector (Port 8005)
if [ $NEED_MISTRAL -ne 0 ]; then
    start_service "$BASE_DIR/services/mistral-connector" 8000 "mistral-connector"
fi

# 4. AI Chat Agent (Port 8012)
if [ $NEED_CHAT -ne 0 ]; then
    start_service "$BASE_DIR/tools/ai-chat-agent" 8012 "ai-chat-agent"
fi

echo -e "\n========================================"
echo -e "${GREEN}Tous les services sont maintenant actifs!${NC}"
echo "========================================"

echo -e "\nServices disponibles:"
echo "  - Prompt Moderation Tool:      http://localhost:8013"
echo "  - Content Classification Tool: http://localhost:8014"
echo "  - Mistral Connector:           http://localhost:8005"
echo "  - AI Chat Agent:               http://localhost:8012"

echo -e "\nPour vérifier l'état des services:"
echo "  curl http://localhost:8012/health"

echo -e "\nPour arrêter tous les services:"
echo "  pkill -f 'uvicorn app.main:app'"

echo -e "\n${GREEN}✓ Prêt à utiliser!${NC}"
