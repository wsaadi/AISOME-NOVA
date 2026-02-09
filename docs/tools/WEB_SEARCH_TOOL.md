# 🔧 Web Search Tool

## 📋 Vue d'ensemble

Le Web Search Tool est une API REST pour effectuer des recherches web et extraire du contenu de pages internet. Il supporte plusieurs moteurs de recherche (DuckDuckGo, Google, Bing) avec configuration flexible du nombre de résultats, du langage et de la sécurité du contenu.

**Capacités principales :**
- Recherche web sur DuckDuckGo, Google, Bing
- Configuration du nombre de résultats
- Support multilingue
- Safe search configurable
- Extraction de texte des pages web
- Extraction de liens et images
- Récupération des métadonnées
- Timeout configurable pour les requêtes

## 🏗️ Architecture

```
web-search-tool/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application FastAPI
│   ├── models/
│   │   ├── __init__.py
│   │   └── search_models.py # Modèles Pydantic
│   ├── routers/
│   │   ├── __init__.py
│   │   └── search.py        # Endpoints API
│   ├── services/
│   │   ├── __init__.py
│   │   └── search_service.py # Logique métier
│   └── middleware/
│       ├── __init__.py
│       └── auth.py          # Authentification
├── tests/
├── docs/
│   └── API.md               # Documentation détaillée
├── Dockerfile
├── requirements.txt
└── README.md
```

**Dépendances principales :**
- FastAPI 0.104+
- httpx 0.25+
- BeautifulSoup4 4.12+
- Pydantic 2.5+

## 🔌 API REST

### Recherche web

```bash
# POST /api/v1/search
curl -X POST "http://localhost:8002/api/v1/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "FastAPI tutorial",
    "engine": "duckduckgo",
    "max_results": 5,
    "safe_search": true,
    "lang": "en"
  }'

# Réponse JSON
{
  "success": true,
  "query": "FastAPI tutorial",
  "engine": "duckduckgo",
  "results": [
    {
      "title": "FastAPI - Modern Python Web Framework",
      "url": "https://fastapi.tiangolo.com",
      "snippet": "FastAPI is a modern, fast...",
      "rank": 1
    }
  ],
  "total_results": 5
}
```

```python
# Python
import requests

response = requests.post(
    "http://localhost:8002/api/v1/search",
    json={
        "query": "Python web development",
        "engine": "duckduckgo",
        "max_results": 5
    }
)

results = response.json()
for result in results["results"]:
    print(f"{result['title']}")
    print(f"{result['url']}")
    print()
```

### Extraction de contenu de page web

```bash
# POST /api/v1/search/extract
curl -X POST "http://localhost:8002/api/v1/search/extract" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "extract_text": true,
    "extract_links": true,
    "extract_images": true,
    "extract_metadata": true
  }'

# Réponse JSON
{
  "success": true,
  "url": "https://example.com",
  "metadata": {
    "title": "Example Domain",
    "description": "Example Domain. This domain...",
    "og_image": "https://example.com/image.jpg"
  },
  "text": "Example Domain\nThis domain is for use...",
  "links": [
    {
      "text": "More information",
      "url": "https://www.iana.org/domains/example"
    }
  ],
  "images": [
    {
      "src": "https://example.com/img.png",
      "alt": "Example image"
    }
  ]
}
```

### Recherche avec extraction intégrée

```bash
# POST /api/v1/search/with-extraction
curl -X POST "http://localhost:8002/api/v1/search/with-extraction" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Python best practices",
    "engine": "duckduckgo",
    "max_results": 3,
    "extract_from_results": true
  }'

# Réponse avec contenu extrait de chaque résultat
{
  "success": true,
  "query": "Python best practices",
  "results": [
    {
      "title": "PEP 8 Style Guide",
      "url": "https://pep8.org",
      "snippet": "...",
      "extracted_content": {
        "text": "...",
        "links": [...]
      }
    }
  ]
}
```

## 🚀 Utilisation

### Installation locale

```bash
# Naviguer au répertoire
cd /home/user/agent-pf/tools/web-search-tool

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
```

### Déploiement Docker

```bash
# Build l'image
docker build -t web-search-tool .

# Lancer le container
docker run -p 8002:8000 web-search-tool

# Ou via docker-compose
docker-compose up -d web-search-tool
```

### Documentation interactive

- **Swagger UI** : http://localhost:8002/docs
- **ReDoc** : http://localhost:8002/redoc
- **OpenAPI JSON** : http://localhost:8002/openapi.json

## ⚙️ Configuration

### Variables d'environnement

```env
# Environnement
ENVIRONMENT=production
API_PORT=8002

# Authentification
SKIP_AUTH=false
AUTHENTIK_URL=http://authentik-server:9000

# CORS
CORS_ORIGINS=*

# Search
DEFAULT_ENGINE=duckduckgo  # duckduckgo, google, bing
DEFAULT_TIMEOUT=10
MAX_RESULTS=50
```

### Moteurs de recherche supportés

- **DuckDuckGo** (recommandé) - Plus tolérant aux requêtes automatisées
- **Google** - Peut bloquer les requêtes de scraping
- **Bing** - Performance acceptable

### Mode développement

```bash
export ENVIRONMENT=development
export SKIP_AUTH=true
```

## 🐛 Troubleshooting

### Recherche sans résultats

```bash
# Essayer un moteur différent
curl -X POST "http://localhost:8002/api/v1/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "votre requête",
    "engine": "bing"
  }'

# Essayer avec moins de résultats
{
  "query": "votre requête",
  "max_results": 3
}
```

### Service bloqué par le moteur

Les moteurs comme Google et Bing peuvent bloquer les requêtes automatisées. Solutions :

1. Utiliser DuckDuckGo (recommandé)
2. Réduire la fréquence des requêtes
3. Utiliser un proxy ou VPN
4. Augmenter le timeout

```bash
# Essayer avec DuckDuckGo
{
  "query": "votre requête",
  "engine": "duckduckgo"
}
```

### Timeout sur extraction de contenu

```bash
# Augmenter le timeout
{
  "url": "https://example.com",
  "timeout": 30  # secondes
}

# Ou réduire les extractions demandées
{
  "url": "https://example.com",
  "extract_text": true,
  "extract_links": false,
  "extract_images": false
}
```

### Extraction de contenu vide

- Le site peut être protégé (JavaScript, etc.)
- Le site peut bloquer les bots
- Le contenu peut être dans des iframes

```bash
# Vérifier que le site est accessible
curl -I https://example.com

# Essayer avec un User-Agent personnalisé
# (intégré automatiquement dans les requêtes)
```

### Authentification refusée

```bash
# Vérifier le token Bearer
curl -X POST "http://localhost:8002/api/v1/search" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

## 📝 Exemples pratiques

### Recherche d'actualités

```python
import requests

response = requests.post(
    "http://localhost:8002/api/v1/search",
    json={
        "query": "Python 3.12 release",
        "engine": "duckduckgo",
        "max_results": 10,
        "safe_search": True
    }
)

for result in response.json()["results"]:
    print(f"- {result['title']}")
    print(f"  {result['url']}")
```

### Extraction et analyse

```python
import requests

# Extraire du contenu de documentation
response = requests.post(
    "http://localhost:8002/api/v1/search/extract",
    json={
        "url": "https://docs.python.org",
        "extract_text": True,
        "extract_links": True
    }
)

content = response.json()
print(f"Titre: {content['metadata']['title']}")
print(f"Nombre de liens: {len(content['links'])}")
```

---

**Service** : Web Search Tool
**Port** : 8002
**Environnement** : Production / Développement
**Authentification** : Bearer Token / Authentik
