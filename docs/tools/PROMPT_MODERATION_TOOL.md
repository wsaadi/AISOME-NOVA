# 🔧 Prompt Moderation Tool

## 📋 Vue d'ensemble

Le Prompt Moderation Tool est une API REST pour la modération et la sécurisation des prompts utilisateurs. Il détecte et signale les contenus potentiellement problématiques (profanité, données sensibles, contenu confidentiel, contenu inapproprié), analyse les risques associés et peut fournir une version désinfectée du prompt pour un usage sûr.

**Capacités principales :**
- Détection de profanité et langage offensant
- Identification d'utilisation personnelle vs professionnelle
- Détection de données sensibles (emails, numéros, données perso)
- Détection de contenu confidentiel
- Détection de contenu inapproprié
- Modération en mode strict configurable
- Classification des risques (safe, low, medium, high)
- Génération de prompts désinfectés
- Rapports détaillés avec patterns correspondants

## 🏗️ Architecture

```
prompt-moderation-tool/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application FastAPI
│   ├── config.py            # Configuration
│   ├── models/
│   │   ├── __init__.py
│   │   └── moderation_models.py # Modèles Pydantic
│   ├── routers/
│   │   ├── __init__.py
│   │   └── moderation.py    # Endpoints API
│   ├── services/
│   │   ├── __init__.py
│   │   └── moderation_service.py # Logique de modération
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

### Modérer un prompt

```bash
# POST /api/v1/moderate
curl -X POST "http://localhost:8013/api/v1/moderate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Pouvez-vous analyser les données dans le fichier C:\\Users\\John\\Confidential\\report.pdf?",
    "strict_mode": true
  }'

# Réponse JSON
{
  "success": true,
  "approved": false,
  "flags": [
    {
      "reason": "sensitive_data",
      "severity": "high",
      "details": "Chemin de fichier local détecté contenant des informations potentiellement sensibles",
      "matched_patterns": ["C:\\Users\\John\\Confidential\\"]
    },
    {
      "reason": "confidential_content",
      "severity": "medium",
      "details": "Référence à un contenu marqué comme confidentiel",
      "matched_patterns": ["Confidential"]
    }
  ],
  "overall_risk_level": "high",
  "message": "Le prompt contient des données sensibles et un contenu confidentiel. Approbation refusée.",
  "sanitized_prompt": "Pouvez-vous analyser les données dans le fichier [FICHIER SUPPRIMÉ]?"
}
```

```python
# Python
import requests

response = requests.post(
    "http://localhost:8013/api/v1/moderate",
    json={
        "prompt": "Pouvez-vous analyser mon mot de passe 'SecurePass123'?",
        "strict_mode": True
    }
)

moderation = response.json()
print(f"Approuvé: {moderation['approved']}")
print(f"Niveau de risque: {moderation['overall_risk_level']}")
print(f"Message: {moderation['message']}")

if not moderation['approved']:
    print(f"Prompt désinfecté: {moderation['sanitized_prompt']}")
```

### Modération en mode normal

```bash
# Mode normal (moins strict)
curl -X POST "http://localhost:8013/api/v1/moderate" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Comment créer une présentation PowerPoint?",
    "strict_mode": false
  }'

# Réponse
{
  "success": true,
  "approved": true,
  "flags": [],
  "overall_risk_level": "safe",
  "message": "Prompt approuvé sans problèmes détectés.",
  "sanitized_prompt": null
}
```

## Raisons de modération

| Raison | Description | Sévérité |
|--------|-------------|----------|
| `profanity` | Langage offensant, insultes, termes péjoratifs | Variable |
| `personal_use` | Indicateurs d'utilisation personnelle | Variable |
| `sensitive_data` | Données personnelles, emails, numéros | High |
| `confidential_content` | Marqueurs de contenu confidentiel | Medium |
| `inappropriate_content` | Contenu explicite ou offensant | High |

## Niveaux de risque

| Niveau | Description |
|--------|-------------|
| `safe` | Aucun risque détecté |
| `low` | Risque minimal, approbation recommandée |
| `medium` | Risques modérés, vérification recommandée |
| `high` | Risques significatifs, approbation refusée |

## 🚀 Utilisation

### Installation locale

```bash
# Naviguer au répertoire
cd /home/user/agent-pf/tools/prompt-moderation-tool

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
uvicorn app.main:app --host 0.0.0.0 --port 8013 --reload
```

### Déploiement Docker

```bash
# Build l'image
docker build -t prompt-moderation-tool .

# Lancer le container
docker run -p 8013:8013 prompt-moderation-tool

# Ou via docker-compose
docker-compose up -d prompt-moderation-tool
```

### Documentation interactive

- **Swagger UI** : http://localhost:8013/docs
- **ReDoc** : http://localhost:8013/redoc

## ⚙️ Configuration

### Variables d'environnement

```env
# Application
APP_NAME=Prompt Moderation Tool
VERSION=1.0.0
ENVIRONMENT=production

# API
API_PORT=8013

# CORS
CORS_ORIGINS=*

# Modération
STRICT_MODE_DEFAULT=true
PROFANITY_DETECTION=true
SENSITIVE_DATA_DETECTION=true
CONFIDENTIAL_DETECTION=true
```

## 🐛 Troubleshooting

### Faux positifs élevés

- Ajuster les patterns de détection
- Utiliser le mode normal au lieu du mode strict
- Whitelist certains termes

```bash
# Mode normal pour moins de faux positifs
{
  "prompt": "Où acheter un logiciel confidentiel de bonne qualité?",
  "strict_mode": false
}
```

### Contenu dangereux non détecté

- Augmenter la sensibilité avec strict_mode
- Vérifier les patterns de détection
- Ajouter des signatures supplémentaires

```bash
# Mode strict pour plus de sensibilité
{
  "prompt": "Contenu à vérifier",
  "strict_mode": true
}
```

### API inaccessible

```bash
# Vérifier que le service est en cours d'exécution
curl http://localhost:8013/health

# Vérifier les logs
docker-compose logs prompt-moderation-tool

# Redémarrer le service
docker-compose restart prompt-moderation-tool
```

## 📝 Exemples pratiques

### Filtrer les données sensibles

```python
import requests

# Prompt contenant une adresse email
response = requests.post(
    "http://localhost:8013/api/v1/moderate",
    json={
        "prompt": "Contactez mon manager à john.doe@company.com",
        "strict_mode": True
    }
)

result = response.json()
# approved: false
# overall_risk_level: high
# reason: sensitive_data
# sanitized_prompt: "Contactez mon manager à [EMAIL SUPPRIMÉ]"
```

### Vérifier la conformité

```python
import requests

prompts = [
    "Créer un rapport de ventes",
    "Mon mot de passe est XYZ",
    "Analyser les données de Q4",
    "Contenu confidentiel à ne pas partager"
]

for prompt in prompts:
    response = requests.post(
        "http://localhost:8013/api/v1/moderate",
        json={"prompt": prompt, "strict_mode": True}
    )

    result = response.json()
    print(f"'{prompt}'")
    print(f"  Approuvé: {result['approved']}")
    print(f"  Risque: {result['overall_risk_level']}")
    print()
```

### Pipeline de modération sécurisé

```python
import requests

# 1. Modérer le prompt
moderation = requests.post(
    "http://localhost:8013/api/v1/moderate",
    json={"prompt": user_input, "strict_mode": True}
).json()

# 2. Vérifier l'approbation
if not moderation['approved']:
    print(f"Prompt rejeté: {moderation['message']}")
    exit(1)

# 3. Utiliser le prompt désinfecté si disponible
safe_prompt = moderation.get('sanitized_prompt', user_input)

# 4. Classifier le contenu
classification = requests.post(
    "http://localhost:8014/api/v1/classify",
    json={"prompt": safe_prompt}
).json()

# 5. Procéder au traitement
if classification['is_professional']:
    process(safe_prompt)
else:
    print("Contenu non-professionnel détecté")
```

### Enregistrement des violations

```python
import requests
import json
from datetime import datetime

violations = []

def moderate_and_log(prompt):
    response = requests.post(
        "http://localhost:8013/api/v1/moderate",
        json={"prompt": prompt, "strict_mode": True}
    ).json()

    if not response['approved']:
        violations.append({
            "timestamp": datetime.now().isoformat(),
            "prompt": prompt[:100],  # Stocker les premiers 100 chars
            "risk_level": response['overall_risk_level'],
            "flags": len(response['flags'])
        })

    return response['approved']

# Enregistrer les violations pour audit
with open("violations.log", "w") as f:
    json.dump(violations, f, indent=2)
```

## 📊 Cas d'usage

### Sécurisation d'une plateforme SaaS

```python
# Valider tous les inputs utilisateurs
request_payload = {
    "prompt": user_prompt,
    "strict_mode": True
}

moderation = requests.post(
    "http://localhost:8013/api/v1/moderate",
    json=request_payload
).json()

if not moderation['approved']:
    log_security_incident(moderation)
    return {"error": "Request blocked by security policy"}
```

### Conformité RGPD

```python
# Détecter et supprimer les données personnelles
moderation = requests.post(
    "http://localhost:8013/api/v1/moderate",
    json={"prompt": user_input, "strict_mode": True}
).json()

# Utiliser le prompt désinfecté pour la conformité
sanitized = moderation.get('sanitized_prompt', user_input)
store_for_logging(sanitized)  # Sauf les données perso
```

---

**Service** : Prompt Moderation Tool
**Port** : 8013
**Environnement** : Production / Développement
**Authentification** : CORS configurable
