# 🔧 Content Classification Tool

## 📋 Vue d'ensemble

Le Content Classification Tool est une API REST pour la classification intelligente de contenu et la détection d'utilisation professionnelle. Il analyse les prompts et catégorise automatiquement le type de requête (analyse, rédaction, recherche, etc.) et le domaine métier (commercial, technique, légal, RH, etc.), tout en fournissant un score d'utilisation professionnelle.

**Capacités principales :**
- Classification de type de requête (11 types supportés)
- Classification de domaine métier (11 domaines supportés)
- Score d'utilisation professionnelle (0-100)
- Extraction des mots-clés correspondants
- Support des documents attachés
- Détection des types de requête multiples avec scores
- Analyse de confiance pour les classifications

## 🏗️ Architecture

```
content-classification-tool/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration
│   ├── models/
│   │   ├── __init__.py
│   │   └── classification_models.py  # Modèles Pydantic
│   ├── routers/
│   │   ├── __init__.py
│   │   └── classification.py # Endpoints API
│   ├── services/
│   │   ├── __init__.py
│   │   └── classification_service.py # Logique de classification
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
- Pydantic 2.5+
- python-dotenv

## 🔌 API REST

### Classifier un prompt

```bash
# POST /api/v1/classify
curl -X POST "http://localhost:8014/api/v1/classify" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Pouvez-vous analyser notre rapport de ventes Q4 et identifier les tendances principales?",
    "documents": null
  }'

# Réponse JSON
{
  "success": true,
  "request_type": "analysis",
  "business_domain": "commercial",
  "professional_score": 95.0,
  "is_professional": true,
  "confidence": 0.98,
  "all_request_types": [
    {
      "category": "analysis",
      "score": 0.98,
      "matched_keywords": ["analyser", "tendances", "rapport"]
    },
    {
      "category": "research",
      "score": 0.45,
      "matched_keywords": ["identifier"]
    }
  ],
  "all_domains": [
    {
      "category": "commercial",
      "score": 0.96,
      "matched_keywords": ["ventes", "rapport"]
    },
    {
      "category": "finance",
      "score": 0.52,
      "matched_keywords": ["Q4"]
    }
  ],
  "message": "Requête d'analyse commerciale hautement professionnelle"
}
```

```python
# Python
import requests

response = requests.post(
    "http://localhost:8014/api/v1/classify",
    json={
        "prompt": "Analyser les données de ventes et identifier les tendances",
        "documents": None
    }
)

classification = response.json()
print(f"Type: {classification['request_type']}")
print(f"Domaine: {classification['business_domain']}")
print(f"Score professionnel: {classification['professional_score']}%")
print(f"Confiance: {classification['confidence']:.2f}")
print(f"Message: {classification['message']}")
```

### Classifier avec documents attachés

```bash
# POST /api/v1/classify (avec documents)
curl -X POST "http://localhost:8014/api/v1/classify" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Pouvez-vous extraire les données clés du rapport?",
    "documents": [
      {
        "name": "rapport_2024.pdf",
        "type": "application/pdf",
        "content": "Contenu du PDF..."
      }
    ]
  }'
```

## Types de requêtes supportés

| Type | Description |
|------|-------------|
| `analysis` | Analyser, examiner, interpréter des données |
| `writing` | Écrire, rédiger, composer du contenu |
| `research` | Rechercher, explorer, investiguer |
| `calculation` | Calculer, estimer, quantifier |
| `translation` | Traduire, convertir entre langues |
| `summarization` | Résumer, condenser, synthétiser |
| `coding` | Coder, programmer, développer |
| `planning` | Planifier, organiser, structurer |
| `review` | Réviser, vérifier, évaluer |
| `question` | Poser une question, demander info |
| `other` | Autres types de requête |

## Domaines métier supportés

| Domaine | Description |
|---------|-------------|
| `commercial` | Ventes, compte client, pipeline |
| `technical` | Architecture, infrastruc, tech stack |
| `legal` | Contrats, compliance, litige |
| `hr` | RH, paie, recrutement, formation |
| `finance` | Budget, trésorerie, reporting |
| `marketing` | Campagnes, brand, contenu |
| `operations` | Processus, supply chain, logistics |
| `strategy` | Vision, roadmap, objectifs |
| `it` | IT, cybersécurité, support |
| `customer_service` | Support client, satisfaction |
| `general` | Contenu général, non-métier |

## 🚀 Utilisation

### Installation locale

```bash
# Naviguer au répertoire
cd /home/user/agent-pf/tools/content-classification-tool

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
uvicorn app.main:app --host 0.0.0.0 --port 8014 --reload
```

### Déploiement Docker

```bash
# Build l'image
docker build -t content-classification-tool .

# Lancer le container
docker run -p 8014:8014 content-classification-tool

# Ou via docker-compose
docker-compose up -d content-classification-tool
```

### Documentation interactive

- **Swagger UI** : http://localhost:8014/docs
- **ReDoc** : http://localhost:8014/redoc

## ⚙️ Configuration

### Variables d'environnement

```env
# Application
APP_NAME=Content Classification Tool
VERSION=1.0.0
ENVIRONMENT=production

# API
API_PORT=8014

# CORS
CORS_ORIGINS=*

# Classification
PROFESSIONAL_THRESHOLD=70.0
CONFIDENCE_THRESHOLD=0.7
```

## 🐛 Troubleshooting

### Classification imprécise

- Vérifier que le prompt est suffisamment détaillé
- Ajouter des mots-clés pertinents
- Utiliser la langue appropriée (français/anglais)

```bash
# Prompt trop vague
{
  "prompt": "Aide-moi"
}

# Prompt amélioré
{
  "prompt": "Analyser les données de ventes du Q4 et identifier les tendances principales par région"
}
```

### Score professionnel bas

- Ajouter plus de contexte professionnel
- Utiliser une terminologie métier
- Être plus spécifique sur l'objectif

```bash
# Score bas
{
  "prompt": "C'est quoi une stratégie?"
}

# Score élevé
{
  "prompt": "Proposer une stratégie de digital transformation pour notre entreprise"
}
```

### Confiance faible

- Utiliser des termes de classification clairs
- Fournir plus de détails sur le contexte
- Ajouter des documents pour supporter la classification

```bash
# Avec confiance faible
{
  "prompt": "Truc"
}

# Avec confiance élevée
{
  "prompt": "Préparer une stratégie de croissance annuelle basée sur l'analyse du marché"
}
```

## 📝 Exemples pratiques

### Classification commerciale

```python
import requests

response = requests.post(
    "http://localhost:8014/api/v1/classify",
    json={
        "prompt": "Analyser notre pipeline commercial et identifier les opportunities de closing ce trimestre"
    }
)

result = response.json()
# Type: analysis
# Domaine: commercial
# Score professionnel: 98%
# is_professional: true
```

### Classification RH

```python
import requests

response = requests.post(
    "http://localhost:8014/api/v1/classify",
    json={
        "prompt": "Créer un plan de formation pour 2025 pour améliorer les compétences en digital marketing de notre équipe"
    }
)

result = response.json()
# Type: planning
# Domaine: hr
# Score professionnel: 92%
# is_professional: true
```

### Classification technique

```python
import requests

response = requests.post(
    "http://localhost:8014/api/v1/classify",
    json={
        "prompt": "Concevoir l'architecture d'une API REST scalable avec FastAPI et PostgreSQL"
    }
)

result = response.json()
# Type: coding
# Domaine: technical
# Score professionnel: 94%
# is_professional: true
```

### Filtrage de contenu non-professionnel

```python
import requests

# Contenu non-professionnel
response = requests.post(
    "http://localhost:8014/api/v1/classify",
    json={
        "prompt": "Blague du jour: comment appelle-t-on un crocodile?"
    }
)

result = response.json()
# is_professional: false
# professional_score: 5%
# message: "Ce contenu ne semble pas être une utilisation professionnelle"
```

---

**Service** : Content Classification Tool
**Port** : 8014
**Environnement** : Production / Développement
**Authentification** : CORS configurable
