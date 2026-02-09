# 🤖 Mistral AI Connector

## 📋 Vue d'ensemble

Le **Mistral AI Connector** est le service central de la plateforme pour l'interaction avec Mistral AI. Il fournit une interface REST unifiée permettant à tous les agents et outils de la plateforme d'exploiter les capacités de l'IA générative Mistral.

### Objectif

Centraliser et standardiser l'accès à Mistral AI pour :
- Éviter la duplication de code d'intégration
- Gérer de manière centralisée l'authentification API
- Offrir une abstraction cohérente pour tous les agents
- Faciliter la maintenance et les mises à jour

### Capacités

- 💬 **Chat Completion** : Conversations contextuelles multi-tours
- 🔢 **Embeddings** : Vectorisation de texte pour recherche sémantique
- 📊 **Gestion des modèles** : Liste et informations des modèles disponibles
- 🔐 **Authentification flexible** : Clé globale ou par requête

## 🏗️ Architecture

### Structure du service

```
core/mistral-connector/
├── app/
│   ├── main.py              # Application FastAPI principale
│   ├── config.py            # Configuration et variables d'environnement
│   ├── models/
│   │   └── mistral_models.py   # Schémas Pydantic (requêtes/réponses)
│   ├── services/
│   │   └── mistral_service.py  # Logique métier et client Mistral
│   └── routers/
│       └── mistral.py       # Endpoints API REST
├── tests/
│   └── test_mistral.py
├── docs/
│   └── API.md
├── Dockerfile               # Image Docker
├── requirements.txt         # Dépendances Python
├── .env.example            # Template de configuration
└── README.md
```

### Dépendances

```python
# requirements.txt
fastapi==0.100+           # Framework web
uvicorn==0.23+            # Serveur ASGI
mistralai==0.1+           # SDK officiel Mistral AI
pydantic==2.0+            # Validation de données
python-dotenv==1.0+       # Gestion des variables d'environnement
```

### Flux de communication

```
┌──────────┐     HTTP/REST      ┌─────────────────┐
│  Agent   │ ──────────────────> │ Mistral         │
│  ou Tool │                     │ Connector       │
└──────────┘                     └────────┬────────┘
                                          │
                                          │ SDK Mistral
                                          │
                                   ┌──────▼──────┐
                                   │  Mistral AI │
                                   │     API     │
                                   └─────────────┘
```

### Conception du service

#### 1. **Configuration (`config.py`)**
Gère les variables d'environnement via Pydantic Settings :
- Clé API Mistral
- Modèles par défaut
- Paramètres CORS
- Configuration environnement

#### 2. **Modèles de données (`mistral_models.py`)**
Définit les schémas Pydantic pour :
- Requêtes (ChatRequest, EmbeddingRequest)
- Réponses (ChatResponse, EmbeddingResponse)
- Validation automatique des données

#### 3. **Service métier (`mistral_service.py`)**
Encapsule la logique d'interaction avec l'API Mistral :
- Initialisation du client Mistral
- Gestion des erreurs
- Transformation des réponses

#### 4. **Routeur API (`mistral.py`)**
Expose les endpoints REST :
- `/api/v1/mistral/chat` - Chat completion
- `/api/v1/mistral/embeddings` - Génération d'embeddings
- `/api/v1/mistral/models` - Liste des modèles

## 🔌 API REST

### Endpoints disponibles

#### **1. Chat Completion**

```http
POST /api/v1/mistral/chat
Content-Type: application/json
X-API-Key: optional_custom_key

{
  "messages": [
    {"role": "system", "content": "Tu es un assistant utile"},
    {"role": "user", "content": "Explique la photosynthèse"}
  ],
  "model": "mistral-small-latest",
  "temperature": 0.7,
  "max_tokens": 1024,
  "top_p": 1.0,
  "safe_prompt": false
}
```

**Réponse:**
```json
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "La photosynthèse est le processus...",
    "model": "mistral-small-latest"
  },
  "usage": {
    "prompt_tokens": 25,
    "completion_tokens": 150,
    "total_tokens": 175
  }
}
```

#### **2. Embeddings**

```http
POST /api/v1/mistral/embeddings
Content-Type: application/json

{
  "input": [
    "Premier texte à vectoriser",
    "Deuxième texte"
  ],
  "model": "mistral-embed"
}
```

**Réponse:**
```json
{
  "success": true,
  "embeddings": [
    [0.123, -0.456, 0.789, ...],
    [-0.321, 0.654, -0.987, ...]
  ],
  "model": "mistral-embed",
  "usage": {
    "total_tokens": 42
  }
}
```

#### **3. Liste des modèles**

```http
GET /api/v1/mistral/models
```

**Réponse:**
```json
{
  "success": true,
  "models": [
    {
      "id": "mistral-tiny",
      "description": "Rapide et économique"
    },
    {
      "id": "mistral-small-latest",
      "description": "Équilibré (par défaut)"
    }
  ]
}
```

#### **4. Health check**

```http
GET /health
```

**Réponse:**
```json
{
  "status": "healthy",
  "service": "mistral-connector",
  "version": "1.0.0",
  "mistral_configured": true
}
```

### Modèles disponibles

| Modèle | Tokens max | Cas d'usage | Coût relatif |
|--------|-----------|-------------|--------------|
| `mistral-tiny` | 32K | Classification, extraction simple | ⭐ |
| `mistral-small-latest` | 32K | Usage général, équilibré | ⭐⭐ |
| `mistral-medium-latest` | 32K | Tâches complexes, raisonnement | ⭐⭐⭐ |
| `mistral-large-latest` | 32K | Raisonnement avancé, précision max | ⭐⭐⭐⭐ |
| `mistral-embed` | - | Vectorisation, recherche sémantique | ⭐ |

## 🚀 Utilisation

### Configuration

1. **Créer le fichier `.env`**

```bash
cd core/mistral-connector
cp .env.example .env
```

2. **Configurer les variables**

```bash
# core/mistral-connector/.env
MISTRAL_API_KEY=your_mistral_api_key_here
ENVIRONMENT=production
CORS_ORIGINS=*
DEFAULT_MODEL=mistral-small-latest
DEFAULT_MAX_TOKENS=1024
DEFAULT_TEMPERATURE=0.7
```

3. **Obtenir une clé API Mistral**

Visitez https://console.mistral.ai/ et créez une clé API.

### Démarrage

#### Via Docker Compose (recommandé)

```bash
# Depuis la racine du projet
docker-compose up -d mistral-connector

# Vérifier les logs
docker-compose logs -f mistral-connector

# Tester le service
curl http://localhost:8005/health
```

#### En développement local

```bash
cd core/mistral-connector

# Installer les dépendances
pip install -r requirements.txt

# Lancer le serveur
uvicorn app.main:app --reload --port 8000

# Le service sera disponible sur http://localhost:8000
```

### Exemples d'intégration

#### Depuis Python

```python
import httpx

# Configuration
MISTRAL_CONNECTOR_URL = "http://localhost:8005"

# Chat simple
async def chat_simple():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MISTRAL_CONNECTOR_URL}/api/v1/mistral/chat",
            json={
                "messages": [
                    {"role": "user", "content": "Bonjour!"}
                ]
            }
        )
        result = response.json()
        if result["success"]:
            print(result["message"]["content"])
        else:
            print(f"Erreur: {result.get('error')}")

# Conversation multi-tours
async def chat_conversation():
    conversation = [
        {"role": "system", "content": "Tu es un expert en Python"},
        {"role": "user", "content": "C'est quoi une liste ?"},
    ]

    async with httpx.AsyncClient() as client:
        # Premier échange
        response = await client.post(
            f"{MISTRAL_CONNECTOR_URL}/api/v1/mistral/chat",
            json={"messages": conversation}
        )
        result = response.json()

        # Ajouter la réponse à la conversation
        conversation.append(result["message"])
        conversation.append({
            "role": "user",
            "content": "Donne-moi un exemple"
        })

        # Deuxième échange
        response = await client.post(
            f"{MISTRAL_CONNECTOR_URL}/api/v1/mistral/chat",
            json={"messages": conversation}
        )

# Génération d'embeddings
async def generate_embeddings():
    documents = [
        "Le chat dort sur le canapé",
        "Le chien joue dans le jardin",
        "L'oiseau chante dans l'arbre"
    ]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MISTRAL_CONNECTOR_URL}/api/v1/mistral/embeddings",
            json={"input": documents}
        )
        result = response.json()

        if result["success"]:
            embeddings = result["embeddings"]
            print(f"Générés {len(embeddings)} vecteurs")
            print(f"Dimension: {len(embeddings[0])}")

# Avec clé API personnalisée
async def chat_with_custom_key():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{MISTRAL_CONNECTOR_URL}/api/v1/mistral/chat",
            headers={"X-API-Key": "custom_mistral_key"},
            json={
                "messages": [{"role": "user", "content": "Hello"}]
            }
        )
```

#### Depuis un autre service FastAPI

```python
from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI()

MISTRAL_URL = "http://mistral-connector:8000"

@app.post("/analyze-text")
async def analyze_text(text: str):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{MISTRAL_URL}/api/v1/mistral/chat",
                json={
                    "messages": [
                        {
                            "role": "system",
                            "content": "Analyse le sentiment du texte"
                        },
                        {
                            "role": "user",
                            "content": text
                        }
                    ],
                    "temperature": 0.3
                },
                timeout=30.0
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Erreur lors de l'appel à Mistral: {str(e)}"
            )
```

#### Depuis JavaScript/TypeScript

```typescript
// Service Angular
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

@Injectable({ providedIn: 'root' })
export class MistralService {
  private baseUrl = 'http://localhost:8005/api/v1/mistral';

  constructor(private http: HttpClient) {}

  chat(request: ChatRequest): Observable<any> {
    return this.http.post(`${this.baseUrl}/chat`, request);
  }

  embeddings(texts: string[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/embeddings`, {
      input: texts
    });
  }

  chatWithCustomKey(request: ChatRequest, apiKey: string): Observable<any> {
    const headers = new HttpHeaders({
      'X-API-Key': apiKey
    });
    return this.http.post(`${this.baseUrl}/chat`, request, { headers });
  }
}

// Utilisation dans un composant
export class ChatComponent {
  constructor(private mistralService: MistralService) {}

  async sendMessage(userMessage: string) {
    const request: ChatRequest = {
      messages: [
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7
    };

    this.mistralService.chat(request).subscribe({
      next: (response) => {
        if (response.success) {
          console.log('Réponse:', response.message.content);
        }
      },
      error: (error) => {
        console.error('Erreur:', error);
      }
    });
  }
}
```

## ⚙️ Configuration avancée

### Variables d'environnement

| Variable | Description | Défaut | Obligatoire |
|----------|-------------|--------|-------------|
| `MISTRAL_API_KEY` | Clé API Mistral AI | - | ✅ |
| `ENVIRONMENT` | Environnement (production/development) | production | ❌ |
| `CORS_ORIGINS` | Origines CORS autorisées (séparées par virgule) | * | ❌ |
| `DEFAULT_MODEL` | Modèle Mistral par défaut | mistral-small-latest | ❌ |
| `DEFAULT_MAX_TOKENS` | Limite de tokens par défaut | 1024 | ❌ |
| `DEFAULT_TEMPERATURE` | Température par défaut | 0.7 | ❌ |

### Paramètres de requête

#### Chat Completion

| Paramètre | Type | Description | Défaut |
|-----------|------|-------------|--------|
| `messages` | Array | **Obligatoire**. Liste des messages | - |
| `model` | String | Modèle à utiliser | mistral-small-latest |
| `temperature` | Float (0-2) | Contrôle la créativité | 0.7 |
| `max_tokens` | Integer | Limite de tokens générés | 1024 |
| `top_p` | Float (0-1) | Nucleus sampling | 1.0 |
| `safe_prompt` | Boolean | Active le mode safe prompt | false |

#### Embeddings

| Paramètre | Type | Description | Défaut |
|-----------|------|-------------|--------|
| `input` | Array[String] | **Obligatoire**. Textes à vectoriser | - |
| `model` | String | Modèle d'embedding | mistral-embed |

### Gestion des erreurs

Le service retourne toujours une structure standardisée :

```json
{
  "success": false,
  "error": "Description de l'erreur",
  "error_type": "TypeException"
}
```

Codes HTTP retournés :
- `200` : Succès
- `400` : Erreur de validation des paramètres
- `401` : Clé API invalide
- `500` : Erreur interne du serveur
- `503` : API Mistral indisponible

## 🐛 Troubleshooting

### Problèmes courants

#### 1. Service ne démarre pas

**Symptômes:**
```bash
docker-compose ps
# mistral-connector: Exit 1
```

**Solutions:**
```bash
# Vérifier les logs
docker-compose logs mistral-connector

# Vérifier la clé API
cat .env | grep MISTRAL_API_KEY

# Vérifier que le port 8005 est libre
netstat -tuln | grep 8005

# Rebuild
docker-compose up -d --build mistral-connector
```

#### 2. Erreur "Client Mistral non initialisé"

**Cause:** Clé API non configurée ou invalide

**Solutions:**
```bash
# Vérifier le .env
cat core/mistral-connector/.env

# Tester la clé manuellement
curl -H "Authorization: Bearer $MISTRAL_API_KEY" \
  https://api.mistral.ai/v1/models

# Recréer le .env
cp core/mistral-connector/.env.example core/mistral-connector/.env
nano core/mistral-connector/.env
```

#### 3. Timeout sur les requêtes

**Causes:** Requête trop longue, max_tokens trop élevé

**Solutions:**
```python
# Augmenter le timeout du client
async with httpx.AsyncClient(timeout=60.0) as client:
    response = await client.post(...)

# Réduire max_tokens
{
    "messages": [...],
    "max_tokens": 500  # Au lieu de 2000
}
```

#### 4. Erreur CORS

**Symptômes:** Erreur dans le navigateur "CORS policy blocked"

**Solutions:**
```bash
# Configurer CORS_ORIGINS dans .env
CORS_ORIGINS=http://localhost:4200,http://localhost:3000

# Ou autoriser tout (développement seulement)
CORS_ORIGINS=*

# Redémarrer le service
docker-compose restart mistral-connector
```

#### 5. Erreur 429 (Rate Limit)

**Cause:** Trop de requêtes vers l'API Mistral

**Solutions:**
- Implémenter un système de retry avec backoff exponentiel
- Réduire la fréquence des appels
- Vérifier votre quota sur console.mistral.ai
- Passer à un plan supérieur si nécessaire

### Debugging

```bash
# Logs en temps réel
docker-compose logs -f mistral-connector

# Logs détaillés
docker-compose logs --tail=500 mistral-connector

# Accéder au container
docker-compose exec mistral-connector /bin/bash

# Tester depuis le container
docker-compose exec mistral-connector curl http://localhost:8000/health

# Vérifier les variables d'environnement
docker-compose exec mistral-connector env | grep MISTRAL
```

## 🔒 Sécurité

### Bonnes pratiques implémentées

1. ✅ **Clé API sécurisée** : Stockée dans .env, jamais committée
2. ✅ **Validation des entrées** : Pydantic pour toutes les requêtes
3. ✅ **CORS configuré** : Restreindre les origines en production
4. ✅ **Logs structurés** : Traçabilité des requêtes
5. ✅ **Gestion d'erreurs** : Pas de fuite d'informations sensibles
6. ✅ **User non-root** : Container Docker avec utilisateur limité

### Recommandations pour la production

- [ ] Utiliser HTTPS avec certificats SSL/TLS
- [ ] Restreindre CORS_ORIGINS aux domaines autorisés uniquement
- [ ] Implémenter un rate limiting
- [ ] Utiliser des secrets Docker pour MISTRAL_API_KEY
- [ ] Activer les logs JSON structurés
- [ ] Mettre en place un monitoring (Prometheus, Grafana)
- [ ] Configurer des alertes sur les erreurs
- [ ] Implémenter un circuit breaker pour l'API Mistral

## 📊 Monitoring et observabilité

### Métriques à surveiller

- Nombre de requêtes par seconde
- Temps de réponse moyen
- Taux d'erreurs (4xx, 5xx)
- Utilisation de tokens
- Disponibilité de l'API Mistral

### Health checks

```bash
# Health check simple
curl http://localhost:8005/health

# Health check avec détails
curl http://localhost:8005/health | jq

# Intégration dans docker-compose.yml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 3s
  retries: 3
```

## 📚 Ressources

### Documentation officielle

- [Mistral AI Documentation](https://docs.mistral.ai/)
- [Mistral AI API Reference](https://docs.mistral.ai/api/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)

### Liens internes

- [Documentation plateforme](../platform/PLATFORM.md)
- [Documentation agents](../agents/)
- [Guide d'architecture](../platform/PLATFORM.md#architecture)

---

**Service** : mistral-connector
**Port** : 8005
**Version** : 1.0.0
**Dernière mise à jour** : Janvier 2026
