# Documentation de l'API Mistral Connector

## Vue d'ensemble

L'API Mistral Connector expose des endpoints REST pour interagir avec Mistral AI. Tous les endpoints sont préfixés par `/api/v1/mistral`.

## Authentification

### Méthode 1 : Configuration globale (recommandée)

Configurez la variable d'environnement `MISTRAL_API_KEY` :

```bash
export MISTRAL_API_KEY="votre_cle_api_mistral"
```

Tous les appels utiliseront automatiquement cette clé.

### Méthode 2 : Clé API par requête

Fournissez une clé API spécifique via le header `X-API-Key` :

```bash
curl -H "X-API-Key: votre_cle_api" ...
```

## Endpoints

### 1. Chat Completion

**POST** `/api/v1/mistral/chat`

Génère une réponse conversationnelle.

#### Requête

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explique-moi la théorie de la relativité"
    }
  ],
  "model": "mistral-small-latest",
  "temperature": 0.7,
  "max_tokens": 500,
  "top_p": 1.0,
  "safe_prompt": false
}
```

#### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `messages` | Array | ✅ | Liste des messages de conversation |
| `messages[].role` | String | ✅ | Rôle : "system", "user", ou "assistant" |
| `messages[].content` | String | ✅ | Contenu du message |
| `model` | String | ❌ | Modèle à utiliser (défaut: mistral-small-latest) |
| `temperature` | Float | ❌ | Créativité (0.0-2.0, défaut: 0.7) |
| `max_tokens` | Integer | ❌ | Limite de tokens (défaut: 1024) |
| `top_p` | Float | ❌ | Top-p sampling (0.0-1.0) |
| `safe_prompt` | Boolean | ❌ | Mode safe prompt (défaut: false) |

#### Réponse

```json
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "La théorie de la relativité, développée par Albert Einstein..."
  },
  "model": "mistral-small-latest",
  "usage": {
    "prompt_tokens": 15,
    "completion_tokens": 200,
    "total_tokens": 215
  },
  "finish_reason": "stop"
}
```

#### Exemples

**Conversation simple**

```bash
curl -X POST "http://localhost:8005/api/v1/mistral/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Bonjour !"}
    ]
  }'
```

**Conversation avec contexte**

```bash
curl -X POST "http://localhost:8005/api/v1/mistral/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "Tu es un expert en histoire"},
      {"role": "user", "content": "Qui était Napoléon ?"},
      {"role": "assistant", "content": "Napoléon Bonaparte était..."},
      {"role": "user", "content": "Quand est-il né ?"}
    ],
    "temperature": 0.5
  }'
```

**Avec clé API personnalisée**

```bash
curl -X POST "http://localhost:8005/api/v1/mistral/chat" \
  -H "X-API-Key: votre_cle_api" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### 2. Embeddings

**POST** `/api/v1/mistral/embeddings`

Génère des vecteurs numériques (embeddings) pour les textes fournis.

#### Requête

```json
{
  "input": [
    "Premier texte à vectoriser",
    "Deuxième texte à analyser"
  ],
  "model": "mistral-embed"
}
```

#### Paramètres

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `input` | Array[String] | ✅ | Liste des textes à transformer |
| `model` | String | ❌ | Modèle d'embedding (défaut: mistral-embed) |

#### Réponse

```json
{
  "success": true,
  "embeddings": [
    [0.123, 0.456, 0.789, ...],
    [0.321, 0.654, 0.987, ...]
  ],
  "model": "mistral-embed",
  "usage": {
    "total_tokens": 50
  }
}
```

#### Exemples

```bash
curl -X POST "http://localhost:8005/api/v1/mistral/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "input": [
      "Document important à indexer",
      "Autre document à comparer"
    ]
  }'
```

### 3. Liste des modèles

**GET** `/api/v1/mistral/models`

Récupère la liste des modèles Mistral disponibles.

#### Réponse

```json
{
  "success": true,
  "models": [
    {
      "id": "mistral-tiny",
      "object": "model",
      "created": 1234567890,
      "owned_by": "mistralai"
    },
    {
      "id": "mistral-small-latest",
      "object": "model",
      "created": 1234567891,
      "owned_by": "mistralai"
    }
  ]
}
```

#### Exemples

```bash
curl "http://localhost:8005/api/v1/mistral/models"
```

### 4. Health Check

**GET** `/health`

Vérifie l'état de santé du service.

#### Réponse

```json
{
  "status": "healthy",
  "service": "mistral-connector",
  "version": "1.0.0",
  "mistral_configured": true
}
```

#### Exemples

```bash
curl "http://localhost:8005/health"
```

## Codes de statut HTTP

| Code | Description |
|------|-------------|
| 200 | Succès |
| 422 | Erreur de validation des données |
| 500 | Erreur interne du serveur |

## Gestion des erreurs

En cas d'erreur, la réponse contient un champ `error` :

```json
{
  "success": false,
  "error": "Description de l'erreur"
}
```

### Erreurs communes

| Erreur | Cause | Solution |
|--------|-------|----------|
| "Client Mistral non initialisé" | Clé API manquante | Configurer MISTRAL_API_KEY ou fournir X-API-Key |
| "Unauthorized" | Clé API invalide | Vérifier la clé API |
| "Rate limit exceeded" | Trop de requêtes | Attendre ou augmenter les limites |
| "Invalid model" | Modèle inexistant | Vérifier le nom du modèle |

## Limites et quotas

Les limites dépendent de votre plan Mistral AI :

- **Tokens par minute** : Variable selon le plan
- **Requêtes par minute** : Variable selon le plan
- **Taille maximale du contexte** : Dépend du modèle

Consultez [la documentation Mistral](https://docs.mistral.ai/) pour plus de détails.

## Exemples d'intégration

### Python avec httpx

```python
import httpx
import json

# Configuration
BASE_URL = "http://localhost:8005"
API_KEY = "your_api_key"  # Optionnel si configuré globalement

# Client HTTP
client = httpx.Client(
    base_url=BASE_URL,
    headers={"X-API-Key": API_KEY} if API_KEY else {}
)

# Chat
response = client.post(
    "/api/v1/mistral/chat",
    json={
        "messages": [
            {"role": "user", "content": "Explique la photosynthèse"}
        ],
        "temperature": 0.7
    }
)

result = response.json()
if result["success"]:
    print(result["message"]["content"])

# Embeddings
response = client.post(
    "/api/v1/mistral/embeddings",
    json={
        "input": ["Texte 1", "Texte 2"]
    }
)

embeddings = response.json()
print(f"Vecteurs: {len(embeddings['embeddings'])}")
```

### JavaScript avec fetch

```javascript
const BASE_URL = 'http://localhost:8005';

// Chat
async function chat(messages) {
  const response = await fetch(`${BASE_URL}/api/v1/mistral/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'X-API-Key': 'your_api_key'  // Optionnel
    },
    body: JSON.stringify({
      messages: messages,
      temperature: 0.7
    })
  });

  const result = await response.json();
  return result;
}

// Utilisation
chat([
  { role: 'user', content: 'Bonjour !' }
]).then(result => {
  if (result.success) {
    console.log(result.message.content);
  }
});
```

## Support et documentation supplémentaire

- **Swagger UI** : http://localhost:8005/docs
- **ReDoc** : http://localhost:8005/redoc
- **Documentation Mistral** : https://docs.mistral.ai/
- **GitHub** : [Dépôt du projet]

---

Dernière mise à jour : 2024
