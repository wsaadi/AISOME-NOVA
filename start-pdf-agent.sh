#!/bin/bash

# Script de diagnostic et démarrage pour l'agent PDF Extraction
# Usage: ./start-pdf-agent.sh

set -e

echo "🔍 Diagnostic de l'agent PDF Extraction"
echo "========================================"
echo ""

# 1. Vérifier que le fichier YAML existe
echo "1️⃣ Vérification du fichier YAML..."
if [ -f "/home/user/AIsome-plateforme/agents/agent-runtime/app/storage/agents/pdf-extraction-agent.yaml" ]; then
    echo "   ✅ Fichier YAML trouvé"
    echo "   📄 Taille: $(wc -c < /home/user/AIsome-plateforme/agents/agent-runtime/app/storage/agents/pdf-extraction-agent.yaml) bytes"
else
    echo "   ❌ Fichier YAML manquant!"
    exit 1
fi
echo ""

# 2. Valider le YAML
echo "2️⃣ Validation du YAML..."
python3 << 'PYTHON_EOF'
import yaml
import sys

try:
    with open('/home/user/AIsome-plateforme/agents/agent-runtime/app/storage/agents/pdf-extraction-agent.yaml', 'r') as f:
        data = yaml.safe_load(f)

    identity = data.get('identity', {})
    print(f"   ✅ YAML valide")
    print(f"   📌 Nom: {identity.get('name')}")
    print(f"   🔗 Slug: {identity.get('slug')}")
    print(f"   📊 Statut: {identity.get('status')}")
    print(f"   📂 Catégorie: {identity.get('category')}")

    if identity.get('status') != 'active':
        print(f"   ⚠️ Attention: Le statut n'est pas 'active'")
        sys.exit(1)

except Exception as e:
    print(f"   ❌ Erreur YAML: {e}")
    sys.exit(1)
PYTHON_EOF
echo ""

# 3. Vérifier Docker
echo "3️⃣ Vérification de Docker..."
if command -v docker &> /dev/null; then
    echo "   ✅ Docker disponible"
    cd /home/user/AIsome-plateforme

    # Vérifier si les containers existent
    if docker ps -a --format '{{.Names}}' | grep -q "agent-pf-agent-runtime"; then
        echo "   📦 Container agent-runtime trouvé"

        # Vérifier s'il tourne
        if docker ps --format '{{.Names}}' | grep -q "agent-pf-agent-runtime"; then
            echo "   🟢 Container agent-runtime en cours d'exécution"
        else
            echo "   🔴 Container agent-runtime arrêté"
        fi
    else
        echo "   ⚠️ Container agent-runtime non trouvé"
    fi

    if docker ps -a --format '{{.Names}}' | grep -q "agent-pf-data-export-tool"; then
        echo "   📦 Container data-export-tool trouvé"

        if docker ps --format '{{.Names}}' | grep -q "agent-pf-data-export-tool"; then
            echo "   🟢 Container data-export-tool en cours d'exécution"
        else
            echo "   🔴 Container data-export-tool arrêté"
        fi
    else
        echo "   ⚠️ Container data-export-tool non trouvé"
    fi
else
    echo "   ❌ Docker non disponible"
    echo "   💡 Les commandes Docker doivent être exécutées manuellement"
fi
echo ""

# 4. Instructions de démarrage
echo "4️⃣ Instructions de démarrage"
echo "=============================="
echo ""
echo "Pour démarrer l'agent PDF Extraction, exécutez les commandes suivantes:"
echo ""
echo "cd /home/user/AIsome-plateforme"
echo ""
echo "# Option 1: Redémarrer uniquement les services nécessaires"
echo "docker-compose restart agent-runtime data-export-tool"
echo ""
echo "# Option 2: Reconstruire et redémarrer (si changements de code)"
echo "docker-compose up -d --build data-export-tool agent-runtime"
echo ""
echo "# Option 3: Redémarrer tous les services"
echo "docker-compose down && docker-compose up -d"
echo ""
echo "5️⃣ Vérification après démarrage"
echo "================================"
echo ""
echo "# Attendre 10 secondes que les services démarrent"
echo "sleep 10"
echo ""
echo "# Vérifier la santé de data-export-tool"
echo "curl -s http://localhost:8027/health | jq ."
echo ""
echo "# Vérifier la santé de agent-runtime"
echo "curl -s http://localhost:8025/health | jq ."
echo ""
echo "# Lister tous les agents"
echo "curl -s http://localhost:8025/api/v1/agents | jq '.agents[] | {name, slug, status, category}'"
echo ""
echo "# Obtenir l'agent PDF extraction spécifiquement"
echo "curl -s http://localhost:8025/api/v1/agents/slug/pdf-extraction-agent | jq '.identity'"
echo ""
echo "6️⃣ Accès frontend"
echo "=================="
echo ""
echo "Frontend: http://localhost:4200"
echo "Catalogue: http://localhost:4200/agents-catalog"
echo "Agent direct: http://localhost:4200/agent-runtime/pdf-extraction-agent"
echo ""
echo "API Docs data-export: http://localhost:8027/docs"
echo "API Docs agent-runtime: http://localhost:8025/docs"
echo ""
echo "✅ Diagnostic terminé!"
