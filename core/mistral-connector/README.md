# 🤖 Mistral AI Connector

Connecteur central et standard pour Mistral AI sur la plateforme agent-pf.

## 📋 Description

Ce service fournit une interface unifiée et centralisée pour que tous les agents de la plateforme puissent interagir avec Mistral AI. Il expose une API REST complète permettant :

- 💬 **Chat Completion** : Conversations contextuelles avec l'IA
- 🔢 **Embeddings** : Transformation de texte en vecteurs numériques
- 📊 **Gestion des modèles** : Liste et informations sur les modèles disponibles

## 🚀 Démarrage rapide

### Prérequis

- Docker et Docker Compose
- Une clé API Mistral AI ([obtenir une clé](https://console.mistral.ai/))

### Installation

1. **Configurer la clé API**

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env et ajouter votre clé API
MISTRAL_API_KEY=your_actual_api_key_here
```

2. **Démarrer le service**

```bash
# Via Docker Compose (depuis la racine du projet)
docker-compose up -d mistral-connector

# Ou en développement local
pip install -r requirements.txt
uvicorn app.main:app --reload
```

3. **Vérifier que le service fonctionne**

```bash
curl http://localhost:8005/health
```

## 📚 Utilisation

### Accéder à la documentation

- **Swagger UI** : http://localhost:8005/docs
- **ReDoc** : http://localhost:8005/redoc

### Exemples d'utilisation

#### Chat Completion

```bash
curl -X POST "http://localhost:8005/api/v1/mistral/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Explique-moi la photosynthèse en termes simples"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
  }'
```

#### Conversation multi-tours

```bash
curl -X POST "http://localhost:8005/api/v1/mistral/chat" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "system", "content": "Tu es un expert en physique"},
      {"role": "user", "content": "Qu'\''est-ce qu'\''un trou noir ?"},
      {"role": "assistant", "content": "Un trou noir est une région de l'\''espace..."},
      {"role": "user", "content": "Comment se forment-ils ?"}
    ],
    "model": "mistral-medium-latest"
  }'
```

#### Génération d'embeddings

```bash
curl -X POST "http://localhost:8005/api/v1/mistral/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "input": [
      "Premier document à vectoriser",
      "Deuxième document à comparer"
    ]
  }'
```

#### Liste des modèles disponibles

```bash
curl http://localhost:8005/api/v1/mistral/models
```

### Utilisation avec une clé API personnalisée

Vous pouvez fournir une clé API différente pour chaque requête via le header `X-API-Key` :

```bash
curl -X POST "http://localhost:8005/api/v1/mistral/chat" \
  -H "X-API-Key: your_custom_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## 🐍 Utilisation depuis Python

### Installation du client

```bash
pip install httpx
```

### Exemple de code

```python
import httpx

# Chat simple
response = httpx.post(
    "http://localhost:8005/api/v1/mistral/chat",
    json={
        "messages": [
            {"role": "user", "content": "Bonjour, comment vas-tu ?"}
        ],
        "temperature": 0.7
    }
)

result = response.json()
if result["success"]:
    print(result["message"]["content"])
else:
    print(f"Erreur: {result['error']}")

# Embeddings
response = httpx.post(
    "http://localhost:8005/api/v1/mistral/embeddings",
    json={
        "input": ["Texte à vectoriser", "Autre texte"]
    }
)

embeddings = response.json()
if embeddings["success"]:
    print(f"Vecteurs générés: {len(embeddings['embeddings'])}")
```

## 🎯 Modèles disponibles

| Modèle | Description | Cas d'usage |
|--------|-------------|-------------|
| `mistral-tiny` | Rapide et économique | Tâches simples, classification |
| `mistral-small-latest` | Équilibré (par défaut) | Usage général |
| `mistral-medium-latest` | Plus puissant | Tâches complexes |
| `mistral-large-latest` | Le plus performant | Raisonnement avancé |
| `mistral-embed` | Embeddings | Recherche sémantique, similarité |

## ⚙️ Configuration

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `MISTRAL_API_KEY` | Clé API Mistral (obligatoire) | - |
| `ENVIRONMENT` | Environnement (production/development) | production |
| `CORS_ORIGINS` | Origines CORS autorisées | * |
| `DEFAULT_MODEL` | Modèle par défaut | mistral-small-latest |
| `DEFAULT_MAX_TOKENS` | Nombre max de tokens | 1024 |
| `DEFAULT_TEMPERATURE` | Température par défaut | 0.7 |

### Paramètres de requête

#### Chat Completion

- `messages` (obligatoire) : Liste des messages de la conversation
- `model` (optionnel) : Modèle à utiliser
- `temperature` (0.0-2.0) : Contrôle la créativité
- `max_tokens` : Limite de tokens pour la réponse
- `top_p` (0.0-1.0) : Top-p sampling
- `safe_prompt` (bool) : Active le mode safe prompt

#### Embeddings

- `input` (obligatoire) : Liste des textes à vectoriser
- `model` (optionnel) : Modèle d'embedding (défaut: mistral-embed)

## 🏗️ Architecture

```
services/mistral-connector/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration
│   ├── models/
│   │   ├── __init__.py
│   │   └── mistral_models.py   # Schémas Pydantic
│   ├── services/
│   │   ├── __init__.py
│   │   └── mistral_service.py  # Logique métier
│   └── routers/
│       ├── __init__.py
│       └── mistral.py       # Endpoints API
├── tests/
│   ├── __init__.py
│   └── test_mistral.py
├── docs/
│   └── API.md
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

## 🧪 Tests

```bash
# Installer les dépendances de test
pip install -r requirements.txt

# Exécuter les tests
pytest tests/

# Avec couverture
pytest tests/ --cov=app --cov-report=html
```

## 🔒 Sécurité

- ✅ Clé API stockée en variable d'environnement
- ✅ Support de clés API par requête
- ✅ Validation des entrées via Pydantic
- ✅ Gestion des erreurs complète
- ✅ Logs détaillés
- ✅ Utilisateur non-root dans Docker

## 🐛 Dépannage

### Le service ne démarre pas

1. Vérifiez que la clé API est configurée dans `.env`
2. Vérifiez les logs : `docker-compose logs mistral-connector`
3. Vérifiez que le port 8005 n'est pas déjà utilisé

### Erreur "Client Mistral non initialisé"

La clé API n'est pas configurée. Vérifiez votre fichier `.env` ou fournissez une clé via le header `X-API-Key`.

### Erreur de timeout

Augmentez le timeout dans votre client HTTP ou réduisez `max_tokens`.

## 📝 Licence

Voir le fichier LICENSE à la racine du projet.

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez suivre le processus standard de PR.

## 📞 Support

Pour toute question ou problème, ouvrez une issue sur le dépôt GitHub.

---

Développé avec ❤️ pour la plateforme agent-pf
