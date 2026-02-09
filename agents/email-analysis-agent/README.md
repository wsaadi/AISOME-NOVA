# Agent d'Analyse d'Emails

Agent autonome qui analyse les emails entrants et crée automatiquement des tâches dans WeKan.

## Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Gmail (IMAP)   │────▶│  Email Analysis  │────▶│     WeKan        │
│                  │     │      Agent       │     │   (Kanban)       │
└──────────────────┘     └────────┬─────────┘     └──────────────────┘
                                  │
                         ┌────────▼─────────┐
                         │     Ollama       │
                         │   (Gemma 3 4B)   │
                         └──────────────────┘
```

## Fonctionnement

1. **Polling IMAP** - L'agent vérifie les nouveaux emails toutes les 30 secondes
2. **Analyse IA** - Chaque email est analysé par Gemma 3 (via Ollama) pour identifier les tâches
3. **Création de cartes** - Les tâches identifiées sont créées comme cartes WeKan dans la colonne "À faire"
4. **Marquage** - Les emails traités sont marqués comme lus

## Prérequis

- Docker & Docker Compose
- Compte Gmail avec accès IMAP
- ~8 Go d'espace disque pour le modèle Gemma 3

## Installation Rapide

### 1. Configurer Gmail

Suivez le guide ci-dessous pour configurer votre compte Gmail.

### 2. Configurer les variables d'environnement

Créez ou modifiez le fichier `.env` à la racine du projet :

```bash
# Gmail IMAP Configuration
IMAP_SERVER=imap.gmail.com
IMAP_PORT=993
IMAP_USERNAME=votre.email@gmail.com
IMAP_PASSWORD=xxxx xxxx xxxx xxxx  # App Password (voir guide ci-dessous)

# WeKan Configuration
WEKAN_USERNAME=admin
WEKAN_PASSWORD=admin

# Email Agent Configuration (sera complété après le premier démarrage)
EMAIL_AGENT_WEKAN_BOARD_ID=
EMAIL_AGENT_WEKAN_TODO_LIST_ID=
EMAIL_AGENT_POLLING_INTERVAL=30
EMAIL_AGENT_POLLING_ENABLED=true
EMAIL_AGENT_LLM_MODEL=gemma3:4b
```

### 3. Démarrer les services

```bash
# Démarrer uniquement les services de l'agent email
docker compose up -d ollama wekan-db wekan ollama-connector wekan-tool imap-tool email-analysis-agent

# Vérifier les logs
docker compose logs -f email-analysis-agent
```

### 4. Télécharger le modèle Gemma 3

```bash
# Se connecter au container Ollama et télécharger Gemma 3
docker exec -it agent-pf-ollama ollama pull gemma3:4b
```

### 5. Configurer WeKan

1. Accédez à WeKan : http://localhost:8085
2. Créez un compte admin (première connexion)
3. Créez un board "Email Tasks"
4. Ajoutez 3 colonnes : "À faire", "En cours", "Fait"
5. Récupérez les IDs du board et de la liste "À faire" (via l'API ou l'URL)
6. Mettez à jour les variables d'environnement et redémarrez l'agent

---

## Guide de Configuration Gmail IMAP

### Étape 1 : Activer IMAP dans Gmail

1. Connectez-vous à Gmail
2. Cliquez sur l'icône engrenage ⚙️ (en haut à droite)
3. Sélectionnez **"Voir tous les paramètres"**
4. Allez dans l'onglet **"Transfert et POP/IMAP"**
5. Dans la section IMAP, sélectionnez **"Activer IMAP"**
6. Cliquez sur **"Enregistrer les modifications"**

### Étape 2 : Activer la validation en deux étapes

> ⚠️ **Obligatoire** : Nécessaire pour créer un mot de passe d'application

1. Allez sur https://myaccount.google.com/security
2. Faites défiler jusqu'à **"Comment vous connecter à Google"**
3. Cliquez sur **"Validation en deux étapes"**
4. Suivez les instructions pour l'activer (téléphone, app d'authentification, etc.)

### Étape 3 : Créer un mot de passe d'application

1. Allez sur https://myaccount.google.com/apppasswords
2. Si nécessaire, connectez-vous et confirmez votre identité
3. Dans le champ "Nom de l'application", entrez : `Email Analysis Agent`
4. Cliquez sur **"Créer"**
5. **Copiez le mot de passe de 16 caractères** affiché (format: `xxxx xxxx xxxx xxxx`)

> ⚠️ **Important** : Ce mot de passe ne sera affiché qu'une seule fois. Conservez-le en lieu sûr.

### Étape 4 : Configurer l'agent

Utilisez ce mot de passe d'application dans votre fichier `.env` :

```bash
IMAP_USERNAME=votre.email@gmail.com
IMAP_PASSWORD=xxxx xxxx xxxx xxxx
```

### Tester la connexion

```bash
# Vérifier que l'outil IMAP peut se connecter
curl http://localhost:8042/api/v1/imap/test-connection
```

---

## API de l'Agent

### Endpoints disponibles

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/health` | GET | État de santé |
| `/status` | GET | Statut détaillé (services, statistiques) |
| `/start` | POST | Démarrer le polling |
| `/stop` | POST | Arrêter le polling |
| `/process-now` | POST | Forcer un traitement immédiat |
| `/process-email` | POST | Traiter un email spécifique |
| `/stats` | GET | Statistiques de traitement |

### Exemples

```bash
# Vérifier le statut
curl http://localhost:8043/status

# Forcer un traitement immédiat
curl -X POST http://localhost:8043/process-now

# Voir les statistiques
curl http://localhost:8043/stats

# Arrêter le polling
curl -X POST http://localhost:8043/stop

# Redémarrer le polling
curl -X POST http://localhost:8043/start
```

---

## Configuration Avancée

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `OLLAMA_URL` | URL du connecteur Ollama | `http://ollama-connector:8000` |
| `WEKAN_URL` | URL de l'outil WeKan | `http://wekan-tool:8000` |
| `IMAP_URL` | URL de l'outil IMAP | `http://imap-tool:8000` |
| `WEKAN_BOARD_ID` | ID du board WeKan | - |
| `WEKAN_TODO_LIST_ID` | ID de la liste "À faire" | - |
| `POLLING_INTERVAL_SECONDS` | Intervalle de polling | `30` |
| `POLLING_ENABLED` | Activer le polling auto | `true` |
| `LLM_MODEL` | Modèle Ollama | `gemma3:4b` |
| `LLM_TEMPERATURE` | Température du LLM | `0.3` |
| `LLM_MAX_TOKENS` | Tokens maximum | `2048` |

### Changer de modèle LLM

Vous pouvez utiliser d'autres modèles Ollama :

```bash
# Télécharger un autre modèle
docker exec -it agent-pf-ollama ollama pull llama3:8b

# Mettre à jour la configuration
EMAIL_AGENT_LLM_MODEL=llama3:8b
```

Modèles recommandés :
- `gemma3:4b` - Léger, rapide (recommandé pour Mac M4)
- `gemma3:12b` - Plus précis, nécessite plus de RAM
- `llama3:8b` - Alternative performante
- `mistral:7b` - Bon compromis qualité/performance

---

## Dépannage

### L'agent ne se connecte pas à Gmail

1. Vérifiez que l'IMAP est activé dans Gmail
2. Vérifiez que vous utilisez un App Password (pas votre mot de passe Gmail)
3. Testez la connexion : `curl http://localhost:8042/api/v1/imap/test-connection`

### Ollama est lent au premier démarrage

Normal : le modèle doit être téléchargé (~2-4 Go). Vérifiez avec :
```bash
docker logs agent-pf-ollama
```

### Les cartes ne sont pas créées dans WeKan

1. Vérifiez que `WEKAN_BOARD_ID` et `WEKAN_TODO_LIST_ID` sont configurés
2. Vérifiez que l'utilisateur WeKan a les droits sur le board
3. Consultez les logs : `docker logs agent-pf-email-analysis-agent`

### Récupérer les IDs WeKan

Via l'API :
```bash
# Lister les boards
curl http://localhost:8041/api/v1/wekan/boards

# Lister les listes d'un board
curl http://localhost:8041/api/v1/wekan/boards/{board_id}/lists
```

---

## Ports exposés

| Service | Port | URL |
|---------|------|-----|
| Ollama | 11434 | http://localhost:11434 |
| Ollama Connector | 8040 | http://localhost:8040 |
| WeKan | 8085 | http://localhost:8085 |
| WeKan Tool | 8041 | http://localhost:8041 |
| IMAP Tool | 8042 | http://localhost:8042 |
| Email Analysis Agent | 8043 | http://localhost:8043 |

---

## Licence

Ce projet fait partie de la plateforme AIsome.
