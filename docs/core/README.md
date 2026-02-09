# 🔧 Core Connectors - Documentation

## Vue d'ensemble

Les **Core Connectors** sont les services centraux de la plateforme qui fournissent l'accès aux différents fournisseurs d'IA générative. Ils exposent des API REST standardisées permettant aux agents de communiquer avec Mistral AI, OpenAI et d'autres providers.

## Connecteurs disponibles

### 1. [Mistral AI Connector](./MISTRAL_CONNECTOR.md)
**Port:** 8005
**Statut:** Principal et recommandé

Connecteur central pour Mistral AI offrant :
- Chat Completion (mistral-small, medium, large)
- Embeddings (mistral-embed)
- Support vision multimodale (pixtral)
- Gestion des modèles
- Authentification globale ou par requête

**Utilisation:**
```bash
curl -X POST "http://localhost:8005/api/v1/mistral/chat" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}]}'
```

### 2. [OpenAI Connector](./OPENAI_CONNECTOR.md)
**Port:** 8006
**Statut:** Optionnel

Connecteur alternatif pour OpenAI offrant :
- Chat Completion (GPT-3.5, GPT-4, GPT-4-turbo)
- Embeddings (text-embedding-ada-002)
- Support multi-modèles
- Compatible avec l'écosystème OpenAI

**Utilisation:**
```bash
curl -X POST "http://localhost:8006/api/v1/openai/chat" \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello!"}], "model": "gpt-4"}'
```

## Architecture des connectors

### Conception commune

Tous les connecteurs suivent la même architecture :

```
core/{connector-name}/
├── app/
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration
│   ├── models/              # Schémas Pydantic
│   ├── services/            # Logique métier
│   └── routers/             # Endpoints API
├── tests/
├── Dockerfile
└── requirements.txt
```

### Principes de conception

1. **Interface unifiée** : API REST standardisée pour tous les providers
2. **Authentification flexible** : Clé globale ou par requête via header `X-API-Key`
3. **Validation stricte** : Pydantic pour toutes les entrées/sorties
4. **Gestion d'erreurs** : Réponses standardisées en cas d'échec
5. **Logs détaillés** : Traçabilité complète des requêtes

## Configuration

### Variables d'environnement

Chaque connector nécessite sa propre configuration :

#### Mistral Connector
```bash
MISTRAL_API_KEY=your_mistral_key        # Obligatoire
MISTRAL_DEFAULT_MODEL=mistral-small-latest
MISTRAL_DEFAULT_TEMPERATURE=0.7
ENVIRONMENT=production
CORS_ORIGINS=*
```

#### OpenAI Connector
```bash
OPENAI_API_KEY=your_openai_key          # Obligatoire
OPENAI_DEFAULT_MODEL=gpt-3.5-turbo
OPENAI_DEFAULT_TEMPERATURE=0.7
ENVIRONMENT=production
CORS_ORIGINS=*
```

### Démarrage

```bash
# Démarrer tous les connectors
docker-compose up -d mistral-connector openai-connector

# Ou individuellement
docker-compose up -d mistral-connector

# Vérifier l'état
docker-compose ps | grep connector

# Tester les services
curl http://localhost:8005/health
curl http://localhost:8006/health
```

## Utilisation

### Depuis Python

```python
import httpx

async def use_mistral():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8005/api/v1/mistral/chat",
            json={
                "messages": [
                    {"role": "user", "content": "Bonjour!"}
                ]
            }
        )
        return response.json()

async def use_openai():
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8006/api/v1/openai/chat",
            json={
                "messages": [
                    {"role": "user", "content": "Hello!"}
                ],
                "model": "gpt-4"
            }
        )
        return response.json()
```

### Depuis un agent

Les agents utilisent les connectors pour leurs opérations IA :

```python
# Agent utilisant Mistral
mistral_response = await httpx.post(
    "http://mistral-connector:8000/api/v1/mistral/chat",
    json={"messages": conversation_history}
)

# Fallback vers OpenAI si besoin
if not mistral_response.json()["success"]:
    openai_response = await httpx.post(
        "http://openai-connector:8000/api/v1/openai/chat",
        json={"messages": conversation_history}
    )
```

## Comparaison des providers

| Critère | Mistral AI | OpenAI |
|---------|-----------|--------|
| **Coût** | Généralement moins cher | Plus cher (GPT-4) |
| **Vitesse** | Très rapide | Variable |
| **Français** | Excellent | Bon |
| **Contexte** | 32K tokens | Jusqu'à 128K |
| **Open Source** | Modèles ouverts disponibles | Propriétaire |
| **Recommandé pour** | Usage général, français | Cas spécifiques, anglais |

## Monitoring

### Health checks

```bash
# Mistral Connector
curl http://localhost:8005/health
# Retourne: {"status": "healthy", "mistral_configured": true}

# OpenAI Connector
curl http://localhost:8006/health
# Retourne: {"status": "healthy", "openai_configured": true}
```

### Logs

```bash
# Logs en temps réel
docker-compose logs -f mistral-connector
docker-compose logs -f openai-connector

# Logs des dernières erreurs
docker-compose logs --tail=100 mistral-connector | grep ERROR
```

## Troubleshooting

### Problèmes courants

#### Service ne démarre pas
```bash
# Vérifier les logs
docker-compose logs mistral-connector

# Vérifier la clé API
cat .env | grep API_KEY

# Rebuild
docker-compose up -d --build mistral-connector
```

#### Erreur 401 (Unauthorized)
```bash
# La clé API est invalide ou manquante
# Vérifier et mettre à jour dans .env
echo "MISTRAL_API_KEY=nouvelle_cle" >> .env
docker-compose restart mistral-connector
```

#### Timeout
```python
# Augmenter le timeout client
async with httpx.AsyncClient(timeout=60.0) as client:
    response = await client.post(...)
```

## Sécurité

### Bonnes pratiques

1. ✅ **Clés API** : Toujours dans .env, jamais dans le code
2. ✅ **CORS** : Restreindre en production (`CORS_ORIGINS=https://votredomaine.com`)
3. ✅ **HTTPS** : Utiliser un reverse proxy en production
4. ✅ **Rate limiting** : Implémenter des limites par utilisateur
5. ✅ **Monitoring** : Surveiller l'usage et les coûts

## Documentation détaillée

- [Mistral AI Connector - Documentation complète](./MISTRAL_CONNECTOR.md)
- [OpenAI Connector - Documentation complète](./OPENAI_CONNECTOR.md)
- [Documentation plateforme](../platform/PLATFORM.md)

## Liens externes

- [Mistral AI Documentation](https://docs.mistral.ai/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)

---

**Dernière mise à jour** : Janvier 2026
