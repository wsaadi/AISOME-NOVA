# 🔧 PowerPoint CRUD Tool

## 📋 Vue d'ensemble

Le PowerPoint CRUD Tool est une API REST pour la création et la gestion de présentations PowerPoint (.pptx). Il permet de créer des présentations avec des diapositives multiples, ajouter du contenu structuré avec des bullet points à différents niveaux, et gérer les métadonnées de la présentation.

**Capacités principales :**
- Création de présentations PowerPoint (.pptx)
- Support de multiples layouts de diapositives
- Ajout de bullet points avec niveaux d'indentation
- Gestion des métadonnées (auteur, titre)
- API RESTful simple et intuitive
- Support des caractères spéciaux et formatting

## 🏗️ Architecture

```
pptx-crud-tool/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application FastAPI
│   ├── models/
│   │   ├── __init__.py
│   │   └── pptx_models.py   # Modèles Pydantic
│   ├── routers/
│   │   ├── __init__.py
│   │   └── pptx.py          # Endpoints API
│   ├── services/
│   │   ├── __init__.py
│   │   └── pptx_service.py  # Logique métier
│   └── middleware/
│       ├── __init__.py
│       └── auth.py          # Authentification
├── tests/
├── Dockerfile
├── requirements.txt
└── README.md
```

**Dépendances principales :**
- FastAPI 0.104+
- python-pptx 0.6+
- Pydantic 2.5+
- Uvicorn 0.24+

## 🔌 API REST

### Créer une présentation

```bash
# POST /api/v1/pptx/create
curl -X POST "http://localhost:8011/api/v1/pptx/create" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Présentation Annuelle",
    "author": "John Doe",
    "slides": [
      {
        "title": "Titre de la diapositive 1",
        "bullet_points": [
          {
            "text": "Point principal",
            "level": 0
          },
          {
            "text": "Sous-point",
            "level": 1
          },
          {
            "text": "Détail supplémentaire",
            "level": 2
          }
        ]
      },
      {
        "title": "Titre de la diapositive 2",
        "bullet_points": [
          {
            "text": "Autre point",
            "level": 0
          }
        ]
      }
    ]
  }' \
  --output presentation.pptx
```

```python
# Python
import requests

data = {
    "title": "Ma Présentation",
    "author": "John Doe",
    "slides": [
        {
            "title": "Slide 1",
            "bullet_points": [
                {"text": "Point 1", "level": 0},
                {"text": "Sub-point", "level": 1}
            ]
        }
    ]
}

response = requests.post(
    "http://localhost:8011/api/v1/pptx/create",
    json=data
)

with open("presentation.pptx", "wb") as f:
    f.write(response.content)
```

### Structure des diapositives

```json
{
  "title": "Titre de la diapositive",
  "bullet_points": [
    {
      "text": "Point de niveau 0 (principal)",
      "level": 0
    },
    {
      "text": "Point de niveau 1 (sous-point)",
      "level": 1
    },
    {
      "text": "Point de niveau 2 (détail)",
      "level": 2
    }
  ]
}
```

## 🚀 Utilisation

### Installation locale

```bash
# Naviguer au répertoire
cd /home/user/agent-pf/tools/pptx-crud-tool

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
python -m app.main
# ou
uvicorn app.main:app --host 0.0.0.0 --port 8011 --reload
```

### Déploiement Docker

```bash
# Build l'image
docker build -t pptx-crud-tool .

# Lancer le container
docker run -p 8011:8011 pptx-crud-tool

# Ou via docker-compose
docker-compose up -d pptx-crud-tool
```

### Documentation interactive

- **Swagger UI** : http://localhost:8011/docs
- **ReDoc** : http://localhost:8011/redoc
- **OpenAPI JSON** : http://localhost:8011/openapi.json

## ⚙️ Configuration

### Variables d'environnement

```env
# Environnement
ENVIRONMENT=production
PPTX_API_PORT=8011

# Authentification (optionnel)
SKIP_AUTH=false

# CORS
CORS_ORIGINS=*
```

### Niveaux de bullet points

Les bullet points supportent jusqu'à 3 niveaux d'indentation :
- **Niveau 0** : Point principal (pas d'indentation)
- **Niveau 1** : Sous-point (indentation simple)
- **Niveau 2** : Détail (indentation double)

## 🐛 Troubleshooting

### Le fichier PPTX n'est pas créé

Vérifier la structure JSON :

```bash
# Format minimal requis
{
  "title": "Titre",
  "author": "Auteur",
  "slides": [
    {
      "title": "Slide Title",
      "bullet_points": [
        {"text": "Point", "level": 0}
      ]
    }
  ]
}
```

### Erreur de format de diapositive

- Vérifier que chaque slide a un titre (string)
- Vérifier que bullet_points est un array
- Vérifier que level est un nombre (0, 1 ou 2)
- Vérifier que text est une string

### Caractères spéciaux non affichés

```bash
# Ajouter le header Content-Type
curl -X POST "http://localhost:8011/api/v1/pptx/create" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{...}'
```

### API inaccessible

```bash
# Vérifier que le service est en cours d'exécution
curl http://localhost:8011/health

# Vérifier les logs
docker-compose logs pptx-crud-tool

# Redémarrer le service
docker-compose restart pptx-crud-tool
```

### Présentation mal formatée

- Limiter le nombre de diapositives (max 100 recommandé)
- Garder les titres courts (< 100 caractères)
- Limiter les bullet points par diapositive (< 20 recommandé)
- Garder le texte lisible

### Erreur de mémoire

Pour les grandes présentations :

```bash
# Augmenter la mémoire allouée au container
docker run -m 2g -p 8011:8011 pptx-crud-tool

# Ou dans docker-compose.yml
services:
  pptx-crud-tool:
    ...
    mem_limit: 2g
```

## 📝 Exemples complets

### Présentation simple

```python
import requests

simple_presentation = {
    "title": "Ma Présentation",
    "author": "Jane Smith",
    "slides": [
        {
            "title": "Titre",
            "bullet_points": [
                {"text": "Introduction", "level": 0}
            ]
        },
        {
            "title": "Contenu",
            "bullet_points": [
                {"text": "Point A", "level": 0},
                {"text": "Détail A1", "level": 1}
            ]
        }
    ]
}

response = requests.post(
    "http://localhost:8011/api/v1/pptx/create",
    json=simple_presentation
)

with open("simple.pptx", "wb") as f:
    f.write(response.content)
```

### Présentation structurée

```python
complex_presentation = {
    "title": "Présentation Stratégique",
    "author": "Management",
    "slides": [
        {
            "title": "Vue d'ensemble",
            "bullet_points": [
                {"text": "Objectifs annuels", "level": 0},
                {"text": "Croissance revenue 20%", "level": 1},
                {"text": "Expansion international", "level": 1}
            ]
        },
        {
            "title": "Stratégie",
            "bullet_points": [
                {"text": "Digital transformation", "level": 0},
                {"text": "Cloud migration", "level": 1},
                {"text": "Phase 1: Infrastructure", "level": 2},
                {"text": "Phase 2: Applications", "level": 2},
                {"text": "Agile methodology", "level": 1}
            ]
        }
    ]
}

response = requests.post(
    "http://localhost:8011/api/v1/pptx/create",
    json=complex_presentation
)

with open("strategy.pptx", "wb") as f:
    f.write(response.content)
```

---

**Service** : PowerPoint CRUD Tool
**Port** : 8011
**Environnement** : Production / Développement
**Authentification** : Optionnel
