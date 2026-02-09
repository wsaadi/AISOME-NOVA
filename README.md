# Agent Platform - Plateforme d'Agents Intelligents

> Plateforme cloud-native simple et légère avec architecture microservices.

## ✨ Caractéristiques

- 🏗️ **Architecture microservices** : Backend Python FastAPI + Frontend Angular 20
- 🐳 **Containerisé** : Docker Compose pour un déploiement simple
- ⚡ **Simple et rapide** : Architecture épurée sans dépendances complexes (pas d'Authentik/Traefik)
- 🚀 **Prêt à l'emploi** : Lancez et utilisez immédiatement

## 🚀 Installation rapide (< 2 minutes)

### Prérequis

- Docker >= 20.10
- Docker Compose >= 2.0
- Clé API Mistral ([obtenir une clé](https://console.mistral.ai/))

### Déploiement

```bash
# Cloner le projet
git clone <votre-repo>
cd agent-pf

# Copier le fichier d'environnement
cp .env.example .env

# Ajouter votre clé API Mistral dans le fichier .env
echo "MISTRAL_API_KEY=votre_clé_api_ici" >> .env

# Démarrer tous les services
docker-compose up -d

# C'est tout ! 🎉
```

### Accéder aux services

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:4200 | Application Angular |
| **Mistral AI Connector** | http://localhost:8005/docs | Connecteur Mistral AI - Service central |
| **Word CRUD API** | http://localhost:8001/docs | API Word - Documentation Swagger |
| **Web Search API** | http://localhost:8002/docs | API Web Search - Documentation Swagger |
| **PDF CRUD API** | http://localhost:8003/docs | API PDF - Documentation Swagger |
| **Excel CRUD API** | http://localhost:8004/docs | API Excel - Documentation Swagger |
| **File Upload API** | http://localhost:8007/docs | API File Upload - Documentation Swagger |
| **Document Extractor API** | http://localhost:8008/docs | API Document Extractor - Documentation Swagger |
| **Document Analyzer Agent** | http://localhost:8009/docs | Agent d'analyse de documents |
| **Appointment Scheduler Agent** | http://localhost:8010/docs | Agent de planification de rendez-vous |
| **PowerPoint CRUD API** | http://localhost:8011/docs | API PowerPoint - Documentation Swagger |
| **AI Chat Agent** | http://localhost:8012/docs | Agent de chat IA |
| **Prompt Moderation API** | http://localhost:8013/docs | API Modération de prompts |
| **Content Classification API** | http://localhost:8014/docs | API Classification de contenu |

## 📚 Stack technique

- **Angular** 20 - Framework frontend
- **FastAPI** - Framework backend Python
- **Mistral AI** - Service d'IA générative
- **Docker** - Containerisation

## 🏗️ Architecture

### Structure simplifiée

```
agent-pf/
├── ui/                          # 🎨 Interface utilisateur
│   └── frontend/                # Application Angular
│
├── core/                        # 🔧 Services centraux
│   ├── mistral-connector/       # Connecteur Mistral AI
│   └── openai-connector/        # Connecteur OpenAI
│
├── agents/                      # 🤖 Agents orchestrateurs
│   ├── ai-chat-agent/           # Agent de chat IA
│   ├── document-analyzer-tool/  # Agent d'analyse de documents
│   └── appointment-scheduler-tool/ # Agent de planification
│
├── tools/                       # 🛠️ Outils et briques de base
│   ├── word-crud-tool/          # CRUD Word
│   ├── pdf-crud-tool/           # CRUD PDF
│   ├── excel-crud-tool/         # CRUD Excel
│   ├── pptx-crud-tool/          # CRUD PowerPoint
│   ├── web-search-tool/         # Recherche web
│   ├── file-upload-tool/        # Upload de fichiers
│   ├── document-extractor-tool/ # Extraction de documents
│   ├── prompt-moderation-tool/  # Modération de prompts
│   └── content-classification-tool/ # Classification de contenu
│
├── docker-compose.yml           # Configuration Docker
└── .env.example                 # Variables d'environnement
```

### Diagramme d'architecture

```
┌──────────────────────────────────────────────────────────┐
│                    UI Layer (Port 4200)                  │
│                    Frontend Angular                      │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────┐
│                    │        Core Layer                   │
│         ┌──────────▼──────────┐  ┌──────────────────┐   │
│         │ Mistral Connector   │  │ OpenAI Connector │   │
│         │    (Port 8005)      │  │    (Port 8006)   │   │
│         └──────────┬──────────┘  └──────────────────┘   │
└────────────────────┼─────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────┐
│                    │      Agents Layer                   │
│         ┌──────────▼──────────┐  ┌──────────────────┐   │
│         │ AI Chat Agent       │  │ Document Analyzer│   │
│         │   (Port 8012)       │  │   (Port 8009)    │   │
│         └─────────────────────┘  └──────────────────┘   │
│         ┌─────────────────────┐                         │
│         │Appointment Scheduler│                         │
│         │   (Port 8010)       │                         │
│         └──────────┬──────────┘                         │
└────────────────────┼─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│                    Tools Layer                           │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Word CRUD  │ │ PDF CRUD │ │Excel CRUD│ │PPTX CRUD │  │
│  │(Port 8001)│ │(Port 8003│ │(Port 8004│ │(Port 8011│  │
│  └───────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │Web Search │ │File Upload│ │Doc Extract│ │Prompt Mod│  │
│  │(Port 8002)│ │(Port 8007)│ │(Port 8008)│ │(Port 8013│  │
│  └───────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌───────────┐                                          │
│  │Content    │                                          │
│  │Classif.   │                                          │
│  │(Port 8014)│                                          │
│  └───────────┘                                          │
└──────────────────────────────────────────────────────────┘
```

## 🐳 Gestion Docker

```bash
# Démarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Voir les logs d'un service spécifique
docker-compose logs -f frontend
docker-compose logs -f ai-chat-agent

# Redémarrer un service
docker-compose restart frontend

# Arrêter tous les services
docker-compose down

# Rebuild et redémarrer
docker-compose up -d --build
```

## 🛠️ Configuration

Le fichier `.env` contient les variables d'environnement pour tous les services.

### Variables importantes :

**Mistral AI Connector** (Service central)
- `MISTRAL_API_KEY` : ⚠️ **OBLIGATOIRE** - Clé API Mistral ([obtenir une clé](https://console.mistral.ai/))
- `MISTRAL_ENVIRONMENT` : Environnement (production/development)
- `MISTRAL_DEFAULT_MODEL` : Modèle par défaut (mistral-small-latest)
- `MISTRAL_DEFAULT_TEMPERATURE` : Température de génération (0.7)

**Autres services**
- Chaque outil/agent a ses propres variables d'environnement
- Format : `{SERVICE}_ENVIRONMENT`, `{SERVICE}_CORS_ORIGINS`

## 📝 Développement

### Ajouter un nouveau tool

1. Créer un nouveau dossier dans `tools/`
2. Ajouter le service dans `docker-compose.yml`
3. Exposer un nouveau port
4. Ajouter les variables d'environnement dans `.env.example`

### Ajouter un nouveau agent

1. Créer un nouveau dossier dans `agents/`
2. L'agent orchestre plusieurs tools/services
3. Ajouter le service dans `docker-compose.yml`
4. Configurer les dépendances dans le `depends_on`

### Ajouter un nouveau service core

1. Créer un nouveau dossier dans `core/`
2. Les services core sont utilisés par les agents
3. Ajouter le service dans `docker-compose.yml`

## 🆘 Support

- Issues : Créez une issue sur GitHub
- Documentation : Consultez les fichiers `.md` du projet

**Développé avec ❤️ pour la simplicité et la clarté**
