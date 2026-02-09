# 🧠 OpenAI Connector

## 📋 Vue d'ensemble

Le **OpenAI Connector** est un service central optionnel de la plateforme pour l'interaction avec OpenAI (GPT-3.5, GPT-4, etc.). Il fournit une interface REST unifiée alternative au Mistral Connector, permettant aux agents de choisir entre différents fournisseurs d'IA.

### Objectif

Offrir une alternative ou un complément à Mistral AI pour :
- Exploiter les modèles GPT d'OpenAI
- Comparer les performances entre fournisseurs
- Permettre le fallback entre plusieurs IA
- Supporter les cas d'usage spécifiques à OpenAI

### Capacités

- 💬 **Chat Completion** : Conversations avec GPT-3.5, GPT-4, etc.
- 🔢 **Embeddings** : Vectorisation avec text-embedding-ada-002
- 📊 **Gestion des modèles** : Liste des modèles OpenAI disponibles
- 🔐 **Authentification flexible** : Clé globale ou par requête

## 🏗️ Architecture

### Structure du service

```
core/openai-connector/
├── app/
│   ├── main.py              # Application FastAPI principale
│   ├── config.py            # Configuration et variables d'environnement
│   ├── models/
│   │   └── openai_models.py    # Schémas Pydantic
│   ├── services/
│   │   └── openai_service.py   # Logique métier et client OpenAI
│   └── routers/
│       └── openai.py        # Endpoints API REST
├── tests/
│   └── test_openai.py
├── Dockerfile
└── requirements.txt
```

### Dépendances

```python
# requirements.txt
fastapi==0.100+           # Framework web
uvicorn==0.23+            # Serveur ASGI
openai==1.0+              # SDK officiel OpenAI
pydantic==2.0+            # Validation de données
python-dotenv==1.0+       # Variables d'environnement
```

### Flux de communication

```
┌──────────┐     HTTP/REST      ┌─────────────────┐
│  Agent   │ ──────────────────> │   OpenAI        │
│  ou Tool │                     │  Connector      │
└──────────┘                     └────────┬────────┘
                                          │
                                          │ SDK OpenAI
                                          │
                                   ┌──────▼──────┐
                                   │  OpenAI API │
                                   └─────────────┘
```

## 🔌 API REST

### Endpoints disponibles

#### **1. Chat Completion**

```http
POST /api/v1/openai/chat
Content-Type: application/json
X-API-Key: optional_custom_key

{
  "messages": [
    {"role": "system", "content": "Tu es un assistant utile"},
    {"role": "user", "content": "Explique la photosynthèse"}
  ],
  "model": "gpt-3.5-turbo",
  "temperature": 0.7,
  "max_tokens": 1024,
  "top_p": 1.0,
  "frequency_penalty": 0.0,
  "presence_penalty": 0.0
}
```

**Réponse:**
```json
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "La photosynthèse est le processus...",
    "model": "gpt-3.5-turbo"
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
POST /api/v1/openai/embeddings
Content-Type: application/json

{
  "input": [
    "Premier texte à vectoriser",
    "Deuxième texte"
  ],
  "model": "text-embedding-ada-002"
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
  "model": "text-embedding-ada-002",
  "usage": {
    "total_tokens": 42
  }
}
```

#### **3. Liste des modèles**

```http
GET /api/v1/openai/models
```

**Réponse:**
```json
{
  "success": true,
  "models": [
    {
      "id": "gpt-3.5-turbo",
      "description": "Rapide et économique"
    },
    {
      "id": "gpt-4",
      "description": "Plus puissant et précis"
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
  "service": "openai-connector",
  "version": "1.0.0",
  "openai_configured": true
}
```

### Modèles disponibles

| Modèle | Tokens max | Cas d'usage | Coût relatif |
|--------|-----------|-------------|--------------|
| `gpt-3.5-turbo` | 16K | Usage général, rapide | ⭐ |
| `gpt-3.5-turbo-16k` | 16K | Contexte étendu | ⭐⭐ |
| `gpt-4` | 8K | Raisonnement avancé, précision | ⭐⭐⭐⭐ |
| `gpt-4-turbo` | 128K | Contexte très étendu | ⭐⭐⭐⭐⭐ |
| `gpt-4o` | 128K | Optimisé pour vitesse et coût | ⭐⭐⭐ |
| `text-embedding-ada-002` | 8K | Vectorisation, recherche | ⭐ |

## 🚀 Utilisation

### Configuration

1. **Créer le fichier `.env`** (racine du projet)

```bash
# Ajouter dans le .env principal
OPENAI_API_KEY=sk-your_openai_api_key_here
OPENAI_ENVIRONMENT=production
OPENAI_CORS_ORIGINS=*
OPENAI_DEFAULT_MODEL=gpt-3.5-turbo
OPENAI_DEFAULT_MAX_TOKENS=1024
OPENAI_DEFAULT_TEMPERATURE=0.7
```

2. **Obtenir une clé API OpenAI**

Visitez https://platform.openai.com/api-keys et créez une clé API.

### Démarrage

#### Via Docker Compose (recommandé)

```bash
# Depuis la racine du projet
docker-compose up -d openai-connector

# Vérifier les logs
docker-compose logs -f openai-connector

# Tester le service
curl http://localhost:8006/health
```

#### En développement local

```bash
cd core/openai-connector

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

OPENAI_CONNECTOR_URL = "http://localhost:8006"

# Chat avec GPT-4
async def chat_gpt4():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{OPENAI_CONNECTOR_URL}/api/v1/openai/chat",
            json={
                "messages": [
                    {"role": "user", "content": "Explique la relativité"}
                ],
                "model": "gpt-4",
                "temperature": 0.7
            }
        )
        result = response.json()
        if result["success"]:
            print(result["message"]["content"])

# Génération d'embeddings
async def generate_embeddings():
    documents = [
        "Machine learning is a subset of AI",
        "Deep learning uses neural networks",
        "Natural language processing handles text"
    ]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{OPENAI_CONNECTOR_URL}/api/v1/openai/embeddings",
            json={
                "input": documents,
                "model": "text-embedding-ada-002"
            }
        )
        result = response.json()
        if result["success"]:
            embeddings = result["embeddings"]
            print(f"Dimension: {len(embeddings[0])}")

# Comparaison avec Mistral
async def compare_providers():
    prompt = "Qu'est-ce que l'intelligence artificielle ?"

    # OpenAI
    openai_response = await client.post(
        "http://localhost:8006/api/v1/openai/chat",
        json={"messages": [{"role": "user", "content": prompt}]}
    )

    # Mistral
    mistral_response = await client.post(
        "http://localhost:8005/api/v1/mistral/chat",
        json={"messages": [{"role": "user", "content": prompt}]}
    )

    print("OpenAI:", openai_response.json()["message"]["content"])
    print("Mistral:", mistral_response.json()["message"]["content"])
```

#### Depuis JavaScript/TypeScript

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OpenAIService {
  private baseUrl = 'http://localhost:8006/api/v1/openai';

  constructor(private http: HttpClient) {}

  chatGPT4(messages: any[]) {
    return this.http.post(`${this.baseUrl}/chat`, {
      messages,
      model: 'gpt-4',
      temperature: 0.7
    });
  }

  generateEmbeddings(texts: string[]) {
    return this.http.post(`${this.baseUrl}/embeddings`, {
      input: texts,
      model: 'text-embedding-ada-002'
    });
  }
}
```

## ⚙️ Configuration avancée

### Variables d'environnement

| Variable | Description | Défaut | Obligatoire |
|----------|-------------|--------|-------------|
| `OPENAI_API_KEY` | Clé API OpenAI | - | ✅ |
| `ENVIRONMENT` | Environnement | production | ❌ |
| `CORS_ORIGINS` | Origines CORS | * | ❌ |
| `DEFAULT_MODEL` | Modèle par défaut | gpt-3.5-turbo | ❌ |
| `DEFAULT_MAX_TOKENS` | Limite de tokens | 1024 | ❌ |
| `DEFAULT_TEMPERATURE` | Température | 0.7 | ❌ |

### Paramètres de requête

#### Chat Completion

| Paramètre | Type | Description | Défaut |
|-----------|------|-------------|--------|
| `messages` | Array | **Obligatoire**. Messages | - |
| `model` | String | Modèle OpenAI | gpt-3.5-turbo |
| `temperature` | Float (0-2) | Créativité | 0.7 |
| `max_tokens` | Integer | Limite de tokens | 1024 |
| `top_p` | Float (0-1) | Nucleus sampling | 1.0 |
| `frequency_penalty` | Float (-2 à 2) | Pénalité fréquence | 0.0 |
| `presence_penalty` | Float (-2 à 2) | Pénalité présence | 0.0 |

## 🐛 Troubleshooting

### Problèmes courants

#### 1. Erreur "Invalid API Key"

**Solutions:**
```bash
# Vérifier la clé dans .env
cat .env | grep OPENAI_API_KEY

# Tester la clé directement
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Générer une nouvelle clé sur platform.openai.com
```

#### 2. Erreur 429 (Rate Limit)

**Cause:** Quota dépassé ou trop de requêtes

**Solutions:**
- Vérifier votre usage sur platform.openai.com/usage
- Passer à un tier supérieur
- Implémenter un système de retry avec backoff
- Utiliser un cache pour les requêtes répétitives

#### 3. Timeout

**Solutions:**
```python
# Augmenter le timeout
async with httpx.AsyncClient(timeout=120.0) as client:
    response = await client.post(...)

# Réduire max_tokens
{"messages": [...], "max_tokens": 500}
```

## 🔒 Sécurité

### Bonnes pratiques

1. ✅ Clé API en variable d'environnement
2. ✅ Validation Pydantic
3. ✅ CORS configuré
4. ✅ Gestion d'erreurs complète
5. ✅ Logs structurés

### Recommandations production

- [ ] HTTPS avec certificats SSL/TLS
- [ ] Restreindre CORS_ORIGINS
- [ ] Rate limiting
- [ ] Secrets Docker pour la clé API
- [ ] Monitoring (coût, usage, performance)

## 📊 Comparaison Mistral vs OpenAI

| Critère | Mistral | OpenAI |
|---------|---------|--------|
| **Coût** | Généralement moins cher | Plus cher (surtout GPT-4) |
| **Vitesse** | Très rapide | Variable selon modèle |
| **Multilingue** | Excellent en français | Bon mais moins performant |
| **Contexte** | 32K tokens | Jusqu'à 128K (GPT-4-turbo) |
| **Open source** | Modèles ouverts disponibles | Propriétaire |
| **Disponibilité** | Récent, en croissance | Mature, très stable |

## 📚 Ressources

### Documentation officielle

- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [OpenAI Models](https://platform.openai.com/docs/models)
- [OpenAI Pricing](https://openai.com/pricing)

### Liens internes

- [Documentation plateforme](../platform/PLATFORM.md)
- [Mistral Connector](./MISTRAL_CONNECTOR.md)
- [Documentation agents](../agents/)

---

**Service** : openai-connector
**Port** : 8006
**Version** : 1.0.0
**Dernière mise à jour** : Janvier 2026
