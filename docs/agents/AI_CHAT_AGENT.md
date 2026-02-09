# 🤖 AI Chat Agent

## 📋 Vue d'ensemble

L'**AI Chat Agent** est un agent orchestrateur qui fournit une interface de chat IA gouvernée et sécurisée. Il combine modération de contenu, classification professionnelle et génération de réponses IA pour offrir une expérience similaire à ChatGPT mais contrôlée pour un usage professionnel.

### Objectif

Fournir un chat IA professionnel avec :
- **Gouvernance stricte** : Modération et classification systématiques
- **Multimodal** : Support texte, images (JPG, PNG, GIF) et documents
- **Multi-providers** : Compatible Mistral AI et OpenAI
- **Contexte maintenu** : Historique de conversation avec fichiers

### Capacités

- 💬 **Chat multimodal** : Texte, images, documents (TXT, MD, JSON, CSV)
- 🛡️ **Modération** : Détection de contenu inapproprié
- 🎯 **Classification** : Validation du caractère professionnel
- 👁️ **Vision** : Analyse d'images avec modèles vision (Pixtral)
- 📚 **Historique** : Maintien du contexte conversationnel

## 🏗️ Architecture

### Workflow de traitement

```
┌─────────────────────────────────────────────────────┐
│ 1. GATEKEEPER : Classification rapide              │
│    [Content Classification Tool]                    │
│    → Petit modèle rapide                           │
│    → Bloque si non professionnel                   │
└──────────────────────┬──────────────────────────────┘
                       │ Si professionnel
┌──────────────────────▼──────────────────────────────┐
│ 2. MODÉRATION : Vérification approfondie           │
│    [Prompt Moderation Tool]                         │
│    → Détecte insultes, contenu sensible            │
│    → Analyse en profondeur                         │
└──────────────────────┬──────────────────────────────┘
                       │ Si approuvé
┌──────────────────────▼──────────────────────────────┐
│ 3. GÉNÉRATION : Réponse IA                         │
│    [Mistral/OpenAI Connector]                       │
│    → Génère réponse contextuelle                   │
└─────────────────────────────────────────────────────┘
```

### Dépendances

- **Content Classification Tool** (port 8014) - Classification professionnelle
- **Prompt Moderation Tool** (port 8013) - Modération de contenu
- **Mistral Connector** (port 8005) - Provider IA principal
- **OpenAI Connector** (port 8006) - Provider IA alternatif

### Structure du service

```
agents/ai-chat-agent/
├── app/
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration
│   ├── models/
│   │   └── chat_models.py   # Schémas requêtes/réponses
│   ├── services/
│   │   ├── orchestrator.py  # Logique d'orchestration
│   │   ├── moderation.py    # Client modération
│   │   └── classification.py # Client classification
│   └── routers/
│       └── chat.py          # Endpoints API
├── Dockerfile
├── requirements.txt
└── README.md
```

## 🔌 API REST

### Endpoint principal

#### **POST /api/v1/chat/completions**

Chat avec modération et classification.

**Requête simple (texte):**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Analyse notre performance Q4"
    }
  ],
  "provider": "mistral",
  "model": "mistral-small-latest",
  "temperature": 0.7,
  "max_tokens": 4096,
  "strict_moderation": true,
  "minimum_professional_score": 60.0
}
```

**Requête multimodale (avec images):**
```json
{
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Analyse ce graphique de ventes"
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
          }
        }
      ]
    }
  ],
  "provider": "mistral",
  "model": "pixtral-12b-2409",
  "temperature": 0.7
}
```

**Réponse:**
```json
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "Voici l'analyse de vos ventes Q4...",
    "model": "mistral-small-latest"
  },
  "moderation": {
    "passed": true,
    "professional": true,
    "professional_score": 95.0,
    "warnings": []
  },
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 200,
    "total_tokens": 350
  }
}
```

**Réponse en cas de blocage:**
```json
{
  "success": false,
  "error": "Content blocked",
  "reason": "Non-professional content detected",
  "moderation": {
    "passed": false,
    "professional": false,
    "professional_score": 25.0,
    "warnings": ["Personal content detected"]
  }
}
```

### Paramètres de configuration

| Paramètre | Type | Description | Défaut |
|-----------|------|-------------|--------|
| `messages` | Array | **Obligatoire**. Messages de conversation | - |
| `provider` | String | Provider IA (`mistral` ou `openai`) | mistral |
| `model` | String | Modèle à utiliser | mistral-small-latest |
| `temperature` | Float (0-2) | Contrôle de créativité | 0.7 |
| `max_tokens` | Integer | Limite tokens réponse | 4096 |
| `strict_moderation` | Boolean | Mode modération stricte | true |
| `minimum_professional_score` | Float | Score minimum (0-100) | 60.0 |
| `skip_classification` | Boolean | Passer la classification | false |
| `skip_moderation` | Boolean | Passer la modération | false |

## 🚀 Utilisation

### Configuration

```bash
# Variables d'environnement (.env)
AI_CHAT_ENVIRONMENT=production
AI_CHAT_CORS_ORIGINS=*

# URLs des services
MISTRAL_CONNECTOR_URL=http://mistral-connector:8000
OPENAI_CONNECTOR_URL=http://openai-connector:8000
PROMPT_MODERATION_URL=http://prompt-moderation-tool:8000
CONTENT_CLASSIFICATION_URL=http://content-classification-tool:8000

# Configuration de modération
DEFAULT_MINIMUM_PROFESSIONAL_SCORE=60.0
DEFAULT_STRICT_MODERATION=true
```

### Démarrage

```bash
# Via Docker Compose
docker-compose up -d ai-chat-agent

# Logs
docker-compose logs -f ai-chat-agent

# Test
curl http://localhost:8012/health
```

### Exemples d'utilisation

#### Chat simple

```python
import httpx

async def chat_simple():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8012/api/v1/chat/completions",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": "Rédige un email professionnel"
                    }
                ],
                "provider": "mistral",
                "temperature": 0.7
            }
        )
        result = response.json()
        if result["success"]:
            print(result["message"]["content"])
        else:
            print(f"Bloqué: {result['reason']}")
```

#### Conversation multi-tours

```python
async def conversation():
    conversation_history = []

    # Premier message
    conversation_history.append({
        "role": "user",
        "content": "Explique le concept de microservices"
    })

    response1 = await client.post(
        "http://localhost:8012/api/v1/chat/completions",
        json={"messages": conversation_history}
    )

    # Ajouter la réponse
    if response1.json()["success"]:
        conversation_history.append(response1.json()["message"])

        # Question de suivi
        conversation_history.append({
            "role": "user",
            "content": "Quels sont les avantages ?"
        })

        response2 = await client.post(
            "http://localhost:8012/api/v1/chat/completions",
            json={"messages": conversation_history}
        )
```

#### Chat avec image

```python
import base64

async def chat_with_image(image_path: str):
    # Encoder l'image en base64
    with open(image_path, "rb") as image_file:
        encoded = base64.b64encode(image_file.read()).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8012/api/v1/chat/completions",
            json={
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Analyse cette image"
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{encoded}"
                                }
                            }
                        ]
                    }
                ],
                "provider": "mistral",
                "model": "pixtral-12b-2409"
            }
        )
```

#### Comparaison Mistral vs OpenAI

```python
async def compare_providers(prompt: str):
    # Mistral
    mistral_response = await client.post(
        "http://localhost:8012/api/v1/chat/completions",
        json={
            "messages": [{"role": "user", "content": prompt}],
            "provider": "mistral",
            "model": "mistral-small-latest"
        }
    )

    # OpenAI
    openai_response = await client.post(
        "http://localhost:8012/api/v1/chat/completions",
        json={
            "messages": [{"role": "user", "content": prompt}],
            "provider": "openai",
            "model": "gpt-4"
        }
    )

    print("Mistral:", mistral_response.json()["message"]["content"])
    print("OpenAI:", openai_response.json()["message"]["content"])
```

## ⚙️ Configuration avancée

### Niveaux de modération

#### Modération stricte (par défaut)
```json
{
  "strict_moderation": true,
  "minimum_professional_score": 60.0
}
```
- Bloque contenu personnel
- Exige score professionnel ≥ 60
- Détecte données sensibles

#### Modération souple
```json
{
  "strict_moderation": false,
  "minimum_professional_score": 40.0
}
```
- Avertissements seulement
- Seuil professionnel plus bas
- Plus permissif

#### Sans modération (déconseillé)
```json
{
  "skip_moderation": true,
  "skip_classification": true
}
```
- Aucune vérification
- Réservé au développement

### Modèles supportés

**Mistral AI:**
- `mistral-small-latest` - Texte, rapide
- `mistral-medium-latest` - Texte, équilibré
- `mistral-large-latest` - Texte, précis
- `pixtral-12b-2409` - Vision multimodale

**OpenAI:**
- `gpt-3.5-turbo` - Texte, rapide
- `gpt-4` - Texte, précis
- `gpt-4-turbo` - Texte, contexte étendu
- `gpt-4o` - Multimodal

## 🐛 Troubleshooting

### Erreurs courantes

#### Content blocked

**Message:** "Non-professional content detected"

**Solutions:**
- Reformuler le prompt en termes professionnels
- Réduire `minimum_professional_score`
- Utiliser `skip_classification=true` (dev seulement)

#### Service unavailable

**Cause:** Tool de modération/classification indisponible

**Solutions:**
```bash
# Vérifier les services dépendants
docker-compose ps | grep moderation
docker-compose ps | grep classification

# Redémarrer si nécessaire
docker-compose restart prompt-moderation-tool
docker-compose restart content-classification-tool
```

#### Timeout

**Solutions:**
```python
# Augmenter timeout client
async with httpx.AsyncClient(timeout=120.0) as client:
    response = await client.post(...)

# Réduire max_tokens
{"max_tokens": 1000}  # Au lieu de 4096
```

## 🔒 Sécurité

### Fonctionnalités de sécurité

1. ✅ **Double filtrage** : Classification + Modération
2. ✅ **Détection données sensibles** : Mots de passe, cartes, etc.
3. ✅ **Logs d'audit** : Traçabilité des requêtes
4. ✅ **Validation stricte** : Pydantic pour toutes les entrées
5. ✅ **Isolation** : Chaque tool dans son container

### Recommandations

- [ ] Activer `strict_moderation` en production
- [ ] Configurer `minimum_professional_score ≥ 60`
- [ ] Implémenter rate limiting par utilisateur
- [ ] Logger toutes les requêtes bloquées
- [ ] Monitorer les taux de blocage

## 📊 Cas d'usage

### ✅ Cas d'usage professionnels acceptés

- Rédaction de documents professionnels
- Analyse de données métier
- Support technique
- Génération de code
- Traduction de documents
- Résumé de réunions

### ❌ Cas d'usage bloqués

- Conversations personnelles
- Contenu inapproprié
- Données sensibles (mots de passe, CB)
- Contenu non professionnel
- Spam ou abus

## 📚 Ressources

### Liens internes

- [Mistral Connector](../core/MISTRAL_CONNECTOR.md)
- [OpenAI Connector](../core/OPENAI_CONNECTOR.md)
- [Prompt Moderation Tool](../tools/PROMPT_MODERATION_TOOL.md)
- [Content Classification Tool](../tools/CONTENT_CLASSIFICATION_TOOL.md)

### Documentation externe

- [Mistral AI Docs](https://docs.mistral.ai/)
- [OpenAI Docs](https://platform.openai.com/docs/)

---

**Service** : ai-chat-agent
**Port** : 8012
**Version** : 1.0.0
**Dernière mise à jour** : Janvier 2026
