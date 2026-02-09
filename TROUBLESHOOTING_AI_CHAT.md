# Diagnostic et résolution des problèmes AI Chat

## Problème : Erreur HTTP 0 - Connexion réseau échouée

### Symptômes
Lorsque vous essayez d'utiliser la fonctionnalité AI Chat (par exemple, analyser un PDF CCTP), vous obtenez l'erreur suivante :

```
Erreur de connexion réseau

La connexion au serveur a échoué.
Status: 0
Type: HttpErrorResponse
```

### Cause

L'erreur HTTP 0 indique que le navigateur n'a pas pu établir de connexion avec le serveur backend. Cela se produit généralement parce que **les services backend ne sont pas démarrés**.

L'application AI Chat nécessite plusieurs services backend :

1. **AI Chat Agent** (port 8012) - Service principal qui orchestre les requêtes
2. **Prompt Moderation Tool** (port 8013) - Valide que les prompts sont appropriés
3. **Content Classification Tool** (port 8014) - Classe le contenu comme professionnel ou non
4. **Mistral Connector** (port 8005) - Connecteur vers l'API Mistral AI

### Solutions

#### Solution 1 : Démarrer avec Docker Compose (Recommandé)

Si vous avez Docker installé, c'est la méthode la plus simple :

```bash
# Démarrer tous les services nécessaires
docker-compose up -d ai-chat-agent prompt-moderation-tool content-classification-tool mistral-connector

# Vérifier que les services sont démarrés
docker-compose ps

# Consulter les logs si nécessaire
docker-compose logs -f ai-chat-agent
```

#### Solution 2 : Script de démarrage manuel

Si vous n'avez pas Docker ou préférez lancer les services manuellement :

```bash
# Utiliser le script fourni
bash start-ai-chat-services.sh
```

Le script va :
- Vérifier quels services sont déjà démarrés
- Installer les dépendances Python nécessaires
- Démarrer les services manquants
- Afficher les logs de démarrage

#### Solution 3 : Démarrage manuel des services

Si vous préférez un contrôle total :

```bash
# 1. Prompt Moderation Tool (port 8013)
cd tools/prompt-moderation-tool
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# 2. Content Classification Tool (port 8014)
cd tools/content-classification-tool
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# 3. Mistral Connector (port 8005)
cd services/mistral-connector
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 &

# 4. AI Chat Agent (port 8012)
cd tools/ai-chat-agent
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8012 &
```

### Vérification

Une fois les services démarrés, vérifiez qu'ils fonctionnent :

```bash
# Vérifier le service principal
curl http://localhost:8012/health

# Vérifier les services de support
curl http://localhost:8013/health
curl http://localhost:8014/health
curl http://localhost:8005/health
```

Vous devriez obtenir une réponse JSON avec le statut "healthy" pour chaque service.

### Test de l'application

1. Rafraîchissez la page web de l'application
2. Allez dans la section AI Chat
3. Essayez d'envoyer un message ou de charger un document
4. L'erreur HTTP 0 ne devrait plus apparaître

### Arrêter les services

Pour arrêter tous les services :

```bash
# Si démarrés avec Docker
docker-compose down

# Si démarrés manuellement
pkill -f 'uvicorn app.main:app'
```

## Problèmes courants

### Les services démarrent mais l'erreur persiste

1. **Vérifiez les ports** : Assurez-vous qu'aucun autre processus n'utilise les ports 8012, 8013, 8014, 8005

```bash
lsof -i :8012
lsof -i :8013
lsof -i :8014
lsof -i :8005
```

2. **Vérifiez les CORS** : Le frontend est configuré pour se connecter à `http://localhost:8012`. Assurez-vous que les services acceptent les connexions cross-origin.

3. **Consultez les logs** : Les erreurs détaillées sont dans les logs des services

```bash
# Logs Docker
docker-compose logs ai-chat-agent

# Logs manuels
tail -f /tmp/ai-chat-agent.log
```

### Erreur "Module not found" lors du démarrage

Installez les dépendances Python :

```bash
cd tools/ai-chat-agent
pip install -r requirements.txt
```

### Les services se ferment immédiatement

Vérifiez que :
- Python 3.8+ est installé
- Les variables d'environnement nécessaires sont définies (clés API, etc.)
- Les ports ne sont pas déjà utilisés par d'autres applications

## Configuration

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# Clés API (optionnelles, peuvent être fournies via l'interface)
MISTRAL_API_KEY=your_mistral_api_key_here

# Configuration des services
AI_CHAT_ENVIRONMENT=development
AI_CHAT_CORS_ORIGINS=*
MISTRAL_ENVIRONMENT=development
MISTRAL_CORS_ORIGINS=*
```

### Configuration frontend

Le frontend est configuré dans `frontend/src/environments/environment.ts` :

```typescript
export const environment = {
  production: false,
  api: {
    aiChat: 'http://localhost:8012'
  }
};
```

Si vous changez le port du service AI Chat, mettez à jour cette configuration.

## Support

Si le problème persiste après avoir suivi ce guide :

1. Vérifiez que tous les services requis sont bien démarrés
2. Consultez les logs de chaque service pour identifier les erreurs
3. Vérifiez votre configuration réseau et firewall
4. Assurez-vous que les clés API Mistral/OpenAI sont valides

## Améliorations apportées

Ce guide de diagnostic a été créé suite à l'analyse du problème récurrent d'erreur HTTP 0. Les améliorations suivantes ont été implémentées :

1. **Message d'erreur amélioré** : Le message d'erreur dans l'interface affiche maintenant des instructions claires pour démarrer les services

2. **Script de démarrage** : Un script `start-ai-chat-services.sh` a été créé pour simplifier le démarrage de tous les services

3. **Documentation** : Ce guide de diagnostic pour aider à résoudre rapidement les problèmes de connexion

## Historique

- **2026-01-06** : Création du guide de diagnostic suite à l'erreur HTTP 0 récurrente
