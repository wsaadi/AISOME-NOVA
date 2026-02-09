# AISOME NOVA - Plateforme d'Agents IA

> Plateforme cloud-native d'agents intelligents avec architecture microservices, moteur d'execution universel et support multi-LLM.

## Caracteristiques

- **Architecture microservices** : Backend Python FastAPI + Frontend Angular 20
- **Moteur d'agents universel** : Agent Runtime remplace les services agents individuels
- **Multi-LLM** : 8 connecteurs (Mistral, OpenAI, Anthropic, Gemini, Perplexity, NVIDIA NIM, Ollama, Dolibarr)
- **Agent Builder** : Creation et configuration d'agents via interface graphique
- **Securite** : CORS hardening, security headers, rate limiting, hachage des mots de passe
- **Containerise** : Docker Compose pour un deploiement simple

## Installation rapide

### Prerequis

- Docker >= 20.10
- Docker Compose >= 2.0
- Au moins une cle API LLM (Mistral, OpenAI, Anthropic, Gemini, Perplexity ou NVIDIA NIM)

### Deploiement

```bash
# Cloner le projet
git clone <votre-repo>
cd AISOME-NOVA

# Copier le fichier d'environnement
cp .env.example .env

# Configurer vos cles API dans le fichier .env
# MISTRAL_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, etc.

# Demarrer tous les services
docker-compose up -d
```

## Services et ports

### Interface utilisateur

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | [4200](http://localhost:4200) | Application Angular 20 |

### Moteur d'agents

| Service | Port | Description |
|---------|------|-------------|
| **Agent Runtime** | [8025](http://localhost:8025/docs) | Moteur d'execution universel des agents |
| **Agent Builder** | [8026](http://localhost:8026/docs) | Creation et configuration d'agents |

### Connecteurs LLM (Core)

| Service | Port | Description |
|---------|------|-------------|
| **Mistral** | [8005](http://localhost:8005/docs) | Connecteur Mistral AI |
| **OpenAI** | [8006](http://localhost:8006/docs) | Connecteur OpenAI (GPT-4o, etc.) |
| **Perplexity** | [8022](http://localhost:8022/docs) | Connecteur Perplexity (Sonar) |
| **Gemini** | [8023](http://localhost:8023/docs) | Connecteur Google Gemini |
| **Anthropic** | [8024](http://localhost:8024/docs) | Connecteur Anthropic (Claude) |
| **NVIDIA NIM** | [8028](http://localhost:8028/docs) | Connecteur NVIDIA NIM (Llama, etc.) |
| **Ollama** | [8040](http://localhost:8040/docs) | Connecteur Ollama (inference locale) |
| **Dolibarr** | [8015](http://localhost:8015/docs) | Connecteur ERP Dolibarr |

### Outils (Tools)

| Service | Port | Description |
|---------|------|-------------|
| **Word CRUD** | [8001](http://localhost:8001/docs) | Gestion de documents Word |
| **Web Search** | [8002](http://localhost:8002/docs) | Recherche web |
| **PDF CRUD** | [8003](http://localhost:8003/docs) | Gestion de documents PDF |
| **Excel CRUD** | [8004](http://localhost:8004/docs) | Gestion de fichiers Excel |
| **File Upload** | [8007](http://localhost:8007/docs) | Upload de fichiers |
| **Document Extractor** | [8008](http://localhost:8008/docs) | Extraction de contenu de documents |
| **PPTX CRUD** | [8011](http://localhost:8011/docs) | Gestion de presentations PowerPoint |
| **Prompt Moderation** | [8013](http://localhost:8013/docs) | Moderation de prompts |
| **Content Classification** | [8014](http://localhost:8014/docs) | Classification de contenu |
| **EML Parser** | [8020](http://localhost:8020/docs) | Analyse de fichiers email (.eml) |
| **Data Export** | [8027](http://localhost:8027/docs) | Export de donnees |

### Outils NVIDIA specialises

| Service | Port | Description |
|---------|------|-------------|
| **NeMo Guardrails** | [8029](http://localhost:8029/docs) | Garde-fous IA (safety) |
| **NVIDIA Multimodal** | [8030](http://localhost:8030/docs) | Analyse multimodale |
| **NVIDIA Vista 3D** | [8031](http://localhost:8031/docs) | Segmentation 3D medicale |
| **Multi-LLM Search** | [8032](http://localhost:8032/docs) | Recherche multi-LLM |
| **FourCastNet** | [8033](http://localhost:8033/docs) | Previsions meteorologiques |
| **OpenFold3** | [8034](http://localhost:8034/docs) | Prediction de structures proteiques |
| **Grounding DINO** | [8035](http://localhost:8035/docs) | Detection d'objets zero-shot |

### Infrastructure email et Kanban

| Service | Port | Description |
|---------|------|-------------|
| **Ollama** | 11434 | Inference LLM locale |
| **WeKan** | [8085](http://localhost:8085) | Tableau Kanban |
| **WeKan Tool** | [8041](http://localhost:8041/docs) | API WeKan |
| **IMAP Tool** | [8042](http://localhost:8042/docs) | Lecture d'emails IMAP |
| **Email Analysis Agent** | [8043](http://localhost:8043/docs) | Agent d'analyse d'emails |

## Architecture

### Structure du projet

```
AISOME-NOVA/
├── ui/frontend/                     # Interface utilisateur Angular 20
├── core/                            # Connecteurs LLM
│   ├── mistral-connector/
│   ├── openai-connector/
│   ├── anthropic-connector/
│   ├── gemini-connector/
│   ├── perplexity-connector/
│   ├── nvidia-nim-connector/
│   ├── ollama-connector/
│   └── dolibarr-connector/
├── agents/                          # Agents
│   ├── agent-runtime/               # Moteur d'execution universel
│   ├── agent-builder/               # Constructeur d'agents
│   └── email-analysis-agent/        # Agent d'analyse d'emails
├── shared/                          # Code partage (auth, security, etc.)
├── docs/                            # Documentation detaillee
└── docker-compose.yml
```

### Diagramme d'architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Frontend Angular (Port 4200)                   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
         ┌─────────────────────┼──────────────────────┐
         │                     │                      │
         ▼                     ▼                      ▼
┌─────────────────┐  ┌─────────────────┐  ┌──────────────────────┐
│  Agent Runtime   │  │  Agent Builder   │  │ Email Analysis Agent │
│   (Port 8025)    │  │   (Port 8026)    │  │     (Port 8043)      │
└────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘
         │                     │                       │
         └─────────┬───────────┘                       │
                   │                                   │
    ┌──────────────┼───────────────────────────────────┤
    │              │                                   │
    ▼              ▼                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Connecteurs LLM (Core)                         │
│  Mistral   OpenAI   Anthropic   Gemini   Perplexity   NVIDIA NIM   │
│  (8005)    (8006)   (8024)      (8023)   (8022)       (8028)       │
│                        Ollama (8040)    Dolibarr (8015)             │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Outils (Tools)                             │
│  Word    PDF    Excel   PPTX   Web Search   File Upload   Doc Ext  │
│  (8001)  (8003) (8004)  (8011) (8002)       (8007)        (8008)   │
│  Prompt Mod  Content Class  EML Parser  Data Export                 │
│  (8013)      (8014)         (8020)      (8027)                     │
│  NeMo Guardrails  NVIDIA Multimodal  Multi-LLM Search  ...        │
│  (8029)           (8030)             (8032)                        │
└─────────────────────────────────────────────────────────────────────┘
```

## Stack technique

- **Angular 20** - Framework frontend
- **FastAPI** (Python) - Framework backend pour tous les microservices
- **Docker / Docker Compose** - Containerisation et orchestration
- **Ollama** - Inference LLM locale
- **WeKan** - Gestion de taches Kanban
- **MongoDB** - Base de donnees (WeKan)

### Fournisseurs LLM supportes

| Fournisseur | Modeles par defaut | Usage |
|-------------|-------------------|-------|
| Mistral | mistral-small-latest | Chat, analyse de documents |
| OpenAI | gpt-4o-mini | Chat, vision |
| Anthropic | claude-3-5-sonnet | Chat, raisonnement |
| Gemini | gemini-2.0-flash-exp | Chat, multimodal |
| Perplexity | sonar | Recherche augmentee |
| NVIDIA NIM | llama-3.1-8b-instruct | Inference haute performance |
| Ollama | gemma3:4b | Inference locale, hors-ligne |

## Securite

La plateforme integre plusieurs couches de securite :

- **CORS hardening** : Configuration stricte des origines autorisees
- **Security headers** : Headers HTTP de securite sur toutes les reponses
- **Rate limiting** : Limitation du nombre de requetes par client
- **Hachage des mots de passe** : Stockage securise des credentials
- **Moderation de prompts** : Filtrage automatique des contenus inappropries
- **Classification de contenu** : Detection de contenu non professionnel
- **NeMo Guardrails** : Garde-fous IA NVIDIA pour la securite des agents

## Gestion Docker

```bash
# Demarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Logs d'un service specifique
docker-compose logs -f agent-runtime

# Redemarrer un service
docker-compose restart agent-runtime

# Arreter tous les services
docker-compose down

# Rebuild et redemarrer
docker-compose up -d --build
```

## Configuration

Le fichier `.env` contient les variables d'environnement. Principales variables :

```env
# Cles API LLM (configurer celles dont vous avez besoin)
MISTRAL_API_KEY=votre_cle
OPENAI_API_KEY=votre_cle
ANTHROPIC_API_KEY=votre_cle
GEMINI_API_KEY=votre_cle
PERPLEXITY_API_KEY=votre_cle
NVIDIA_NIM_API_KEY=votre_cle

# Dolibarr ERP
DOLIBARR_URL=http://localhost:8081
DOLIBARR_API_KEY=votre_cle

# Email (pour l'agent d'analyse d'emails)
IMAP_SERVER=imap.gmail.com
IMAP_USERNAME=votre_email
IMAP_PASSWORD=votre_mot_de_passe
```

## Developpement

Pour plus de details sur l'architecture et le developpement, consultez la documentation dans le dossier `docs/` :

- `docs/ARCHITECTURE_AGENTS_TOOLS.md` - Architecture detaillee des agents et outils
- `docs/core/` - Documentation des connecteurs LLM
- `docs/tools/` - Documentation de chaque outil
- `docs/agents/` - Documentation des agents
- `docs/platform/` - Documentation de la plateforme

Voir egalement :

- `MULTI_LLM_FEATURES.md` - Configuration multi-LLM et detection de documents professionnels
- `I18N.md` - Guide d'internationalisation (fr, en, es)
- `doc_fonctionnelle.md` - Specifications fonctionnelles

## Support

- Issues : Creez une issue sur GitHub
- Documentation : Consultez les fichiers dans `docs/`
