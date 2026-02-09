# 📚 Documentation complète - Agent Platform

> Documentation technique professionnelle de la plateforme d'agents intelligents

## 🎯 Vue d'ensemble

Cette documentation couvre l'ensemble des composants de la plateforme Agent Platform, une solution cloud-native basée sur une architecture microservices.

## 📖 Table des matières

### 1. 🏗️ [Architecture de la plateforme](./platform/PLATFORM.md)
Documentation complète de l'architecture, des concepts et de l'utilisation globale de la plateforme.

### 2. 🔧 Core Connectors
Services centraux de connexion aux IA :
- [Mistral Connector](./core/MISTRAL_CONNECTOR.md) - Connecteur pour Mistral AI
- [OpenAI Connector](./core/OPENAI_CONNECTOR.md) - Connecteur pour OpenAI

### 3. 🤖 Agents
Agents orchestrateurs intelligents :
- [AI Chat Agent](./agents/AI_CHAT_AGENT.md) - Agent de conversation IA
- [Document Analyzer](./agents/DOCUMENT_ANALYZER.md) - Agent d'analyse de documents
- [Appointment Scheduler](./agents/APPOINTMENT_SCHEDULER.md) - Agent de planification de rendez-vous

### 4. 🛠️ Tools
Outils et briques de base :

**Traitement de documents**
- [Word CRUD Tool](./tools/WORD_CRUD_TOOL.md) - Manipulation de documents Word
- [PDF CRUD Tool](./tools/PDF_CRUD_TOOL.md) - Manipulation de documents PDF
- [Excel CRUD Tool](./tools/EXCEL_CRUD_TOOL.md) - Manipulation de fichiers Excel
- [PowerPoint CRUD Tool](./tools/PPTX_CRUD_TOOL.md) - Manipulation de présentations PowerPoint
- [Document Extractor Tool](./tools/DOCUMENT_EXTRACTOR_TOOL.md) - Extraction de contenu de documents

**Services web et fichiers**
- [Web Search Tool](./tools/WEB_SEARCH_TOOL.md) - Recherche sur le web
- [File Upload Tool](./tools/FILE_UPLOAD_TOOL.md) - Upload et gestion de fichiers

**IA et modération**
- [Prompt Moderation Tool](./tools/PROMPT_MODERATION_TOOL.md) - Modération de prompts IA
- [Content Classification Tool](./tools/CONTENT_CLASSIFICATION_TOOL.md) - Classification de contenu

### 5. 🎨 Interface Utilisateur

**[Composants UI](./ui/COMPONENTS.md)**
- Composants réutilisables
- Briques graphiques
- Pages applicatives

## 🚀 Démarrage rapide

### Installation

```bash
# Cloner le projet
git clone <votre-repo>
cd agent-pf

# Configuration
cp .env.example .env
# Éditer .env et ajouter votre clé API Mistral

# Démarrage
docker-compose up -d
```

### Accès rapide

| Service | URL | Documentation |
|---------|-----|---------------|
| Frontend | http://localhost:4200 | [UI Docs](./ui/COMPONENTS.md) |
| Mistral Connector | http://localhost:8005/docs | [Docs](./core/MISTRAL_CONNECTOR.md) |
| AI Chat Agent | http://localhost:8012/docs | [Docs](./agents/AI_CHAT_AGENT.md) |

## 📐 Conventions de documentation

Chaque documentation suit une structure standardisée :

1. **Vue d'ensemble** - Description et objectif du composant
2. **Architecture** - Conception technique et dépendances
3. **API/Interface** - Endpoints, paramètres, réponses
4. **Utilisation** - Exemples pratiques et cas d'usage
5. **Configuration** - Variables d'environnement et paramètres
6. **Déploiement** - Instructions de mise en production
7. **Troubleshooting** - Problèmes courants et solutions

## 🔗 Liens utiles

- [README principal](../README.md)
- [Guide de déploiement](./platform/PLATFORM.md#déploiement)
- [Architecture complète](./platform/PLATFORM.md#architecture)

## 📝 Contribution

Pour contribuer à cette documentation :

1. Suivre la structure standardisée
2. Utiliser un langage professionnel et concis
3. Inclure des exemples pratiques
4. Maintenir les liens à jour

---

**Dernière mise à jour** : Janvier 2026
