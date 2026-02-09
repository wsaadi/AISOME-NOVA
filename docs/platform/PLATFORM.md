# 🏗️ Documentation de la plateforme Agent Platform

## 📋 Vue d'ensemble

Agent Platform est une plateforme cloud-native conçue pour orchestrer des agents intelligents dans une architecture microservices. Elle permet de créer, déployer et gérer des agents IA capables d'interagir avec différents outils et services.

### Objectifs

- **Modularité** : Architecture en microservices permettant l'ajout facile de nouveaux composants
- **Scalabilité** : Chaque service peut être mis à l'échelle indépendamment
- **Simplicité** : Déploiement rapide via Docker Compose, sans dépendances complexes
- **Interopérabilité** : Communication standardisée via API REST entre les services

## 🏛️ Architecture

### Principes architecturaux

La plateforme suit une architecture en couches :

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer                             │
│                Frontend Angular 20                      │
│                   (Port 4200)                          │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────┐
│                      │   Core Layer                     │
│           ┌──────────▼──────────┐                       │
│           │  Mistral Connector  │  OpenAI Connector     │
│           │    (Port 8005)      │    (Port 8006)        │
│           └──────────┬──────────┘                       │
└──────────────────────┼──────────────────────────────────┘
                       │
┌──────────────────────┼──────────────────────────────────┐
│                      │   Agents Layer                   │
│           ┌──────────▼──────────┐                       │
│           │    AI Chat Agent    │  Document Analyzer    │
│           │    (Port 8012)      │    (Port 8009)        │
│           │                     │  Appointment Scheduler│
│           │                     │    (Port 8010)        │
│           └──────────┬──────────┘                       │
└──────────────────────┼──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                    Tools Layer                          │
│  Word │ PDF │ Excel │ PPTX │ Web Search │ File Upload  │
│  8001 │ 8003│ 8004  │ 8011 │   8002     │    8007      │
│                                                         │
│  Document Extractor │ Prompt Moderation │ Content      │
│       8008          │      8013         │ Classif 8014 │
└─────────────────────────────────────────────────────────┘
```

### Couches applicatives

#### 1. UI Layer (Interface utilisateur)
- **Frontend Angular 20** : Application web moderne et réactive
- **Port** : 4200
- **Rôle** : Interface utilisateur pour interagir avec les agents et services

#### 2. Core Layer (Services centraux)
- **Mistral Connector** : Connecteur principal vers Mistral AI
- **OpenAI Connector** : Connecteur vers OpenAI (optionnel)
- **Rôle** : Fournir l'accès aux modèles d'IA pour les agents

#### 3. Agents Layer (Agents orchestrateurs)
- **AI Chat Agent** : Agent conversationnel intelligent
- **Document Analyzer** : Analyse automatique de documents
- **Appointment Scheduler** : Planification de rendez-vous
- **Rôle** : Orchestrer plusieurs outils pour accomplir des tâches complexes

#### 4. Tools Layer (Outils de base)
- **Outils de traitement documentaire** : Word, PDF, Excel, PowerPoint
- **Services web** : Recherche web, upload de fichiers
- **Services IA** : Modération, classification, extraction
- **Rôle** : Fournir des fonctionnalités atomiques réutilisables

## 🔧 Conception technique

### Communication inter-services

- **Protocole** : HTTP/REST
- **Format** : JSON
- **Documentation** : OpenAPI/Swagger pour chaque service
- **CORS** : Configuré pour permettre la communication entre services

### Containerisation

```yaml
Technologie: Docker + Docker Compose
Base images: Python 3.11 (backend), Node 20 (frontend)
Réseau: Bridge network partagé (agent-pf-network)
Volumes: Persistance des données si nécessaire
```

### Healthchecks

Chaque service expose un endpoint `/health` pour :
- Monitoring de disponibilité
- Orchestration Docker Compose
- Détection de pannes

### Variables d'environnement

Structure standardisée :
```bash
{SERVICE}_ENVIRONMENT=production
{SERVICE}_CORS_ORIGINS=*
{SERVICE}_SPECIFIC_CONFIG=value
```

## 📊 Stack technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Frontend | Angular | 20 |
| Backend | FastAPI (Python) | 0.100+ |
| Runtime | Docker | 20.10+ |
| Orchestration | Docker Compose | 2.0+ |
| IA principale | Mistral AI | API v1 |
| IA secondaire | OpenAI | API v1 |

## 🚀 Utilisation

### Installation initiale

```bash
# 1. Cloner le projet
git clone <repository-url>
cd agent-pf

# 2. Configuration
cp .env.example .env

# 3. Éditer .env et ajouter les clés API requises
nano .env
# Ajouter: MISTRAL_API_KEY=votre_clé_ici

# 4. Démarrer la plateforme
docker-compose up -d
```

### Vérification du déploiement

```bash
# Vérifier que tous les services sont up
docker-compose ps

# Vérifier les logs
docker-compose logs -f

# Tester le frontend
curl http://localhost:4200/health

# Tester le Mistral Connector
curl http://localhost:8005/health
```

### Accès aux services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:4200 | Interface web |
| Mistral Connector | http://localhost:8005/docs | API Mistral |
| OpenAI Connector | http://localhost:8006/docs | API OpenAI |
| AI Chat | http://localhost:8012/docs | Agent chat |
| Document Analyzer | http://localhost:8009/docs | Agent analyse |
| Appointment Scheduler | http://localhost:8010/docs | Agent rendez-vous |
| Word CRUD | http://localhost:8001/docs | API Word |
| PDF CRUD | http://localhost:8003/docs | API PDF |
| Excel CRUD | http://localhost:8004/docs | API Excel |
| PowerPoint CRUD | http://localhost:8011/docs | API PowerPoint |
| Web Search | http://localhost:8002/docs | API recherche web |
| File Upload | http://localhost:8007/docs | API upload |
| Document Extractor | http://localhost:8008/docs | API extraction |
| Prompt Moderation | http://localhost:8013/docs | API modération |
| Content Classification | http://localhost:8014/docs | API classification |

## ⚙️ Configuration

### Fichier .env

Le fichier `.env` centralise toutes les configurations :

```bash
# Core Connectors
MISTRAL_API_KEY=sk-...                    # OBLIGATOIRE
MISTRAL_ENVIRONMENT=production
MISTRAL_DEFAULT_MODEL=mistral-small-latest
MISTRAL_DEFAULT_TEMPERATURE=0.7

OPENAI_API_KEY=sk-...                     # Optionnel
OPENAI_ENVIRONMENT=production

# Agents
AI_CHAT_ENVIRONMENT=production
DOCUMENT_ANALYZER_ENVIRONMENT=production
APPOINTMENT_SCHEDULER_ENVIRONMENT=production

# Tools
WORD_CRUD_ENVIRONMENT=production
PDF_CRUD_ENVIRONMENT=production
# ... autres tools
```

### Configuration par service

Chaque service peut avoir sa propre configuration via :
1. Variables d'environnement (`.env`)
2. Fichiers de configuration internes (`config.py`, `settings.ts`)
3. Arguments de démarrage Docker

## 🔄 Gestion opérationnelle

### Commandes Docker Compose

```bash
# Démarrer tous les services
docker-compose up -d

# Démarrer un service spécifique
docker-compose up -d mistral-connector

# Arrêter tous les services
docker-compose down

# Redémarrer un service
docker-compose restart ai-chat-agent

# Voir les logs
docker-compose logs -f [service-name]

# Rebuild et redémarrer
docker-compose up -d --build

# Supprimer volumes et données
docker-compose down -v
```

### Monitoring

```bash
# État des services
docker-compose ps

# Utilisation des ressources
docker stats

# Logs en temps réel
docker-compose logs -f --tail=100

# Healthcheck d'un service
curl http://localhost:8005/health
```

### Scaling

```bash
# Scaler un service (ex: 3 instances du word-crud-tool)
docker-compose up -d --scale word-crud-tool=3

# Note: Nécessite un load balancer pour la distribution
```

## 🛡️ Sécurité

### Bonnes pratiques implémentées

1. **Clés API** : Stockées dans `.env`, jamais committées
2. **CORS** : Configuré par service pour restreindre les accès
3. **Healthchecks** : Détection rapide des services défaillants
4. **Network isolation** : Services sur un réseau Docker dédié
5. **Restart policy** : `unless-stopped` pour la résilience

### Recommandations de production

- [ ] Utiliser HTTPS (reverse proxy Nginx/Traefik)
- [ ] Implémenter l'authentification (JWT, OAuth)
- [ ] Restreindre CORS_ORIGINS aux domaines autorisés
- [ ] Utiliser des secrets Docker pour les clés API
- [ ] Mettre en place des rate limits
- [ ] Activer les logs structurés (JSON)
- [ ] Configurer des alertes sur les healthchecks

## 📈 Extension de la plateforme

### Ajouter un nouveau Tool

```bash
# 1. Créer le dossier
mkdir -p tools/mon-nouveau-tool/src

# 2. Implémenter le service FastAPI
# tools/mon-nouveau-tool/src/main.py

# 3. Créer le Dockerfile
# tools/mon-nouveau-tool/Dockerfile

# 4. Ajouter dans docker-compose.yml
services:
  mon-nouveau-tool:
    build:
      context: ./tools/mon-nouveau-tool
    ports:
      - "8015:8000"
    environment:
      - ENVIRONMENT=${MON_TOOL_ENVIRONMENT:-production}
    networks:
      - agent-pf-network

# 5. Documenter dans docs/tools/MON_NOUVEAU_TOOL.md
```

### Ajouter un nouveau Agent

```bash
# 1. Créer le dossier
mkdir -p agents/mon-agent/src

# 2. Implémenter l'agent (orchestration de tools)
# agents/mon-agent/src/main.py

# 3. Définir les dépendances dans docker-compose.yml
services:
  mon-agent:
    depends_on:
      - mistral-connector
      - tool-requis-1
      - tool-requis-2

# 4. Documenter dans docs/agents/MON_AGENT.md
```

### Ajouter un nouveau Core Connector

```bash
# 1. Créer le dossier
mkdir -p core/nouveau-connector/src

# 2. Implémenter le connecteur vers l'API externe
# core/nouveau-connector/src/main.py

# 3. Ajouter dans docker-compose.yml
# 4. Documenter dans docs/core/NOUVEAU_CONNECTOR.md
```

## 🐛 Troubleshooting

### Problèmes courants

#### Services ne démarrent pas
```bash
# Vérifier les logs
docker-compose logs [service-name]

# Vérifier les ports en conflit
netstat -tulpn | grep LISTEN

# Rebuild complet
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Erreur "Connection refused"
```bash
# Vérifier le réseau Docker
docker network ls
docker network inspect agent-pf-network

# Vérifier le healthcheck
docker-compose ps
```

#### Clé API invalide
```bash
# Vérifier le .env
cat .env | grep API_KEY

# Redémarrer le service concerné
docker-compose restart mistral-connector
```

### Logs et debugging

```bash
# Logs détaillés d'un service
docker-compose logs -f --tail=500 ai-chat-agent

# Accéder au shell d'un container
docker-compose exec ai-chat-agent /bin/bash

# Inspecter les variables d'environnement
docker-compose exec ai-chat-agent env
```

## 📚 Ressources

### Documentation technique
- [Documentation Core Connectors](../core/)
- [Documentation Agents](../agents/)
- [Documentation Tools](../tools/)
- [Documentation UI](../ui/)

### Liens externes
- [FastAPI](https://fastapi.tiangolo.com/)
- [Angular](https://angular.io/)
- [Docker](https://docs.docker.com/)
- [Mistral AI](https://docs.mistral.ai/)

## 📝 Maintenance

### Mises à jour

```bash
# Mise à jour des images Docker
docker-compose pull

# Rebuild avec les dernières dépendances
docker-compose build --pull

# Redémarrage avec les nouvelles versions
docker-compose up -d
```

### Backup

```bash
# Sauvegarder les données (si volumes persistants)
docker run --rm -v agent-pf-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data

# Sauvegarder la configuration
cp .env .env.backup-$(date +%Y%m%d)
```

---

**Maintenu par** : L'équipe Agent Platform
**Dernière mise à jour** : Janvier 2026
**Version de la plateforme** : 1.0.0
