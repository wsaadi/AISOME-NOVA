# 🔧 PDF CRUD Tool

## 📋 Vue d'ensemble

Le PDF CRUD Tool est une API REST pour la manipulation complète de fichiers PDF. Il permet de créer des PDFs, extraire du texte et des métadonnées, fusionner plusieurs documents, diviser des PDFs et effectuer des opérations avancées comme la rotation et la suppression de pages.

**Capacités principales :**
- Création de PDF avec contenu formaté
- Extraction de texte de toutes les pages
- Récupération des métadonnées du document
- Fusion de multiples PDFs
- Division et extraction de pages spécifiques
- Rotation de pages (90°, 180°, 270°)
- Suppression de pages
- Modification des métadonnées

## 🏗️ Architecture

```
pdf-crud-tool/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application FastAPI
│   ├── models/
│   │   ├── __init__.py
│   │   └── pdf_models.py    # Modèles Pydantic
│   ├── routers/
│   │   ├── __init__.py
│   │   └── pdf.py           # Endpoints API
│   ├── services/
│   │   ├── __init__.py
│   │   └── pdf_service.py   # Logique métier
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
- PyPDF2 3.0+
- pypdf 3.17+
- ReportLab 4.0+
- Pillow 10.1+

## 🔌 API REST

### Créer un PDF

```bash
# POST /api/v1/pdf/create
curl -X POST "http://localhost:8003/api/v1/pdf/create" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Mon Document",
    "content": [
      "Premier paragraphe du document",
      "Deuxième paragraphe avec contenu détaillé"
    ],
    "author": "John Doe"
  }' \
  --output document.pdf
```

```python
# Python
import requests

response = requests.post(
    "http://localhost:8003/api/v1/pdf/create",
    json={
        "title": "Mon Document",
        "content": ["Premier paragraphe", "Deuxième paragraphe"],
        "author": "John Doe"
    }
)

with open("document.pdf", "wb") as f:
    f.write(response.content)
```

### Lire un PDF

```bash
# POST /api/v1/pdf/read
curl -X POST "http://localhost:8003/api/v1/pdf/read" \
  -F "file=@document.pdf"

# Réponse JSON
{
  "total_pages": 5,
  "text": "=== Page 1 ===\nContenu de la page 1...",
  "metadata": {
    "title": "Mon Document",
    "author": "John Doe"
  }
}
```

### Fusionner des PDFs

```bash
# POST /api/v1/pdf/merge
curl -X POST "http://localhost:8003/api/v1/pdf/merge" \
  -F "files=@doc1.pdf" \
  -F "files=@doc2.pdf" \
  -F "files=@doc3.pdf" \
  --output merged.pdf
```

### Diviser un PDF

```bash
# POST /api/v1/pdf/split
curl -X POST "http://localhost:8003/api/v1/pdf/split" \
  -F "file=@document.pdf" \
  -F "start_page=1" \
  -F "end_page=5" \
  --output pages_1-5.pdf
```

### Extraire des pages spécifiques

```bash
# POST /api/v1/pdf/extract
curl -X POST "http://localhost:8003/api/v1/pdf/extract" \
  -F "file=@document.pdf" \
  -F "pages=1,3,5" \
  --output extracted.pdf
```

### Rotation de pages

```bash
# POST /api/v1/pdf/rotate
curl -X POST "http://localhost:8003/api/v1/pdf/rotate" \
  -F "file=@document.pdf" \
  -F "page_number=1" \
  -F "angle=90" \
  --output rotated.pdf
```

### Supprimer des pages

```bash
# DELETE /api/v1/pdf/pages
curl -X DELETE "http://localhost:8003/api/v1/pdf/pages" \
  -F "file=@document.pdf" \
  -F "pages=2,4,6" \
  --output modified.pdf
```

### Récupérer les métadonnées

```bash
# GET /api/v1/pdf/metadata
curl -X GET "http://localhost:8003/api/v1/pdf/metadata" \
  -F "file=@document.pdf"

# Réponse
{
  "title": "Mon Document",
  "author": "John Doe",
  "subject": "Rapport",
  "pages": 10,
  "creation_date": "2025-01-15"
}
```

## 🚀 Utilisation

### Installation locale

```bash
# Naviguer au répertoire
cd /home/user/agent-pf/tools/pdf-crud-tool

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
```

### Déploiement Docker

```bash
# Build l'image
docker build -t pdf-crud-tool .

# Lancer le container
docker run -p 8003:8000 pdf-crud-tool

# Ou via docker-compose depuis la racine
docker-compose up -d pdf-crud-tool
```

### Documentation interactive

- **Swagger UI** : http://localhost:8003/docs
- **ReDoc** : http://localhost:8003/redoc
- **OpenAPI JSON** : http://localhost:8003/openapi.json

## ⚙️ Configuration

### Variables d'environnement

```env
# Environnement
ENVIRONMENT=production
API_PORT=8003

# Authentification
SKIP_AUTH=false
AUTHENTIK_URL=http://authentik-server:9000

# CORS
CORS_ORIGINS=*

# PDF
MAX_FILE_SIZE=50000000  # 50 MB
```

### Mode développement

```bash
# Désactiver l'authentification
export ENVIRONMENT=development
export SKIP_AUTH=true
```

## 🐛 Troubleshooting

### Le PDF n'est pas créé correctement

- Vérifier le format des données JSON
- S'assurer que le contenu est bien formaté
- Vérifier la taille du fichier de sortie

### Erreur lors de la fusion de PDFs

```bash
# Vérifier que les fichiers PDF sont valides
file doc1.pdf doc2.pdf

# Recréer un PDF simple pour tester
curl -X POST "http://localhost:8003/api/v1/pdf/create" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","content":["Test"]}'
```

### Authentification refusée

- Vérifier le token Bearer fourni
- Vérifier que Authentik est opérationnel
- En développement, mettre SKIP_AUTH=true

### Problème de performance sur gros PDFs

- Augmenter la mémoire allouée au container
- Utiliser le multipart/form-data pour les uploads
- Diviser les PDFs volumineux

### Erreur de module manquant

```bash
# Réinstaller les dépendances
pip install --upgrade -r requirements.txt

# Reconstruire l'image Docker
docker-compose build --no-cache pdf-crud-tool
```

---

**Service** : PDF CRUD Tool
**Port** : 8003
**Environnement** : Production / Développement
**Authentification** : Bearer Token / Authentik
