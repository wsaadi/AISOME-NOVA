# 🔧 Document Extractor Tool

## 📋 Vue d'ensemble

Le Document Extractor Tool est une API REST pour l'extraction centralisée de contenu depuis des documents Word, PDF, Excel et texte. Il offre une interface unifiée pour extraire le texte, les métadonnées et les statistiques de différents types de documents, avec support du traitement par lot.

**Capacités principales :**
- Extraction de texte depuis Word (.docx, .doc)
- Extraction de texte depuis PDF (toutes les pages)
- Extraction de contenu Excel (.xlsx, .xls)
- Support des fichiers texte avec détection automatique d'encodage
- Extraction des métadonnées (auteur, titre, dates, etc.)
- Statistiques (mots, caractères, pages, feuilles)
- Traitement batch de multiples documents
- Gestion des erreurs par fichier

## 🏗️ Architecture

```
document-extractor-tool/
├── app/
│   ├── main.py                   # Point d'entrée FastAPI
│   ├── models/
│   │   └── extractor_models.py   # Modèles Pydantic
│   ├── routers/
│   │   └── extractor.py          # Endpoints API
│   ├── services/
│   │   └── extractor_service.py  # Logique d'extraction
│   └── middleware/
│       └── auth.py               # Authentification
├── tests/                        # Tests unitaires
├── Dockerfile
├── requirements.txt
└── README.md
```

**Dépendances principales :**
- FastAPI 0.104+
- python-docx (extraction Word)
- PyPDF2 (extraction PDF)
- openpyxl (extraction Excel)
- aiofiles (opérations fichiers asynchrones)

## 🔌 API REST

### Extraire un document

```bash
# POST /api/v1/extract/document
curl -X POST "http://localhost:8008/api/v1/extract/document" \
  -H "Authorization: Bearer <token>" \
  -F "file=@rapport.docx" \
  -F "extract_metadata=true"

# Réponse JSON
{
  "success": true,
  "message": "Contenu extrait avec succès de rapport.docx",
  "content": {
    "document_type": "word",
    "filename": "rapport.docx",
    "text_content": "Contenu complet du document...",
    "metadata": {
      "author": "John Doe",
      "title": "Rapport Annuel",
      "subject": "Finances",
      "created": "2025-01-15",
      "modified": "2025-01-20",
      "paragraphs_count": 45,
      "tables_count": 3
    },
    "word_count": 1250,
    "character_count": 7850
  },
  "error": null
}
```

```python
# Python
import requests

response = requests.post(
    "http://localhost:8008/api/v1/extract/document",
    headers={"Authorization": "Bearer YOUR_TOKEN"},
    files={"file": open("rapport.docx", "rb")},
    data={"extract_metadata": "true"}
)

content = response.json()["content"]
print(f"Type: {content['document_type']}")
print(f"Mots: {content['word_count']}")
print(f"Texte:\n{content['text_content'][:500]}...")
```

### Extraire plusieurs documents (Batch)

```bash
# POST /api/v1/extract/documents/batch
curl -X POST "http://localhost:8008/api/v1/extract/documents/batch" \
  -H "Authorization: Bearer <token>" \
  -F "files=@doc1.docx" \
  -F "files=@doc2.pdf" \
  -F "files=@sheet.xlsx" \
  -F "extract_metadata=true"

# Réponse
{
  "success": true,
  "message": "3 fichier(s) extrait(s) avec succès, 0 échec(s)",
  "total_files": 3,
  "successful_extractions": 3,
  "failed_extractions": 0,
  "contents": [
    {
      "document_type": "word",
      "filename": "doc1.docx",
      "text_content": "...",
      "metadata": {...},
      "word_count": 850,
      "character_count": 5200
    },
    {
      "document_type": "pdf",
      "filename": "doc2.pdf",
      "text_content": "=== Page 1 ===\n...\n\n=== Page 2 ===\n...",
      "page_count": 2,
      "word_count": 1200,
      "character_count": 7500
    },
    {
      "document_type": "excel",
      "filename": "sheet.xlsx",
      "text_content": "=== Feuille: Data ===\n...",
      "sheet_count": 2,
      "word_count": 450,
      "character_count": 2800
    }
  ],
  "errors": []
}
```

## 🚀 Utilisation

### Installation locale

```bash
# Naviguer au répertoire
cd /home/user/agent-pf/tools/document-extractor-tool

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
uvicorn app.main:app --host 0.0.0.0 --port 8008 --reload
```

### Déploiement Docker

```bash
# Build l'image
docker build -t document-extractor-tool .

# Lancer le container
docker run -p 8008:8008 document-extractor-tool

# Ou via docker-compose
docker-compose up -d document-extractor-tool
```

### Documentation interactive

- **Swagger UI** : http://localhost:8008/docs
- **ReDoc** : http://localhost:8008/redoc

## ⚙️ Configuration

### Variables d'environnement

```env
# Authentification
SKIP_AUTH=false
AUTHENTIK_URL=http://authentik-server:9000

# CORS
CORS_ORIGINS=*

# API
API_PORT=8008

# Extraction
MAX_FILE_SIZE=52428800  # 50 MB
EXTRACT_TIMEOUT=30
```

### Types de documents supportés

#### Word (.docx, .doc)
- Extraction de tous les paragraphes
- Extraction du contenu des tableaux
- Métadonnées : auteur, titre, sujet, dates
- Statistiques : paragraphes, tableaux, mots, caractères

#### PDF (.pdf)
- Extraction du texte de toutes les pages
- Format : `=== Page N ===` suivi du contenu
- Métadonnées : titre, auteur, sujet, créateur, date
- Statistiques : pages, mots, caractères

#### Excel (.xlsx, .xls)
- Extraction de toutes les feuilles
- Format : `=== Feuille: NomFeuille ===` suivi des données
- Cellules séparées par ` | `
- Métadonnées : liste des feuilles
- Statistiques : feuilles, mots, caractères

#### Texte (.txt)
- Détection automatique d'encodage (UTF-8, Latin-1, CP1252)
- Fallback vers UTF-8 avec gestion des erreurs
- Statistiques : mots, caractères

## 🐛 Troubleshooting

### Erreur "File type not supported"

- Vérifier l'extension du fichier
- S'assurer que le fichier est valide pour son type
- Formats supportés : docx, doc, pdf, xlsx, xls, txt

```bash
# Vérifier le type de fichier
file rapport.docx

# Convertir vers un format supporté si nécessaire
```

### Extraction vide ou incomplète

- Vérifier que le fichier n'est pas corrompu
- Vérifier que le fichier contient réellement du contenu
- Essayer avec un petit fichier de test

```bash
# Créer un petit fichier de test
echo "Test content" > test.txt

# Extraire
curl -X POST "http://localhost:8008/api/v1/extract/document" \
  -F "file=@test.txt"
```

### Erreur d'encodage dans les fichiers texte

- Le tool détecte automatiquement l'encodage
- S'il échoue, il utilise UTF-8 avec gestion des erreurs
- Convertir le fichier en UTF-8 si nécessaire

```bash
# Convertir en UTF-8
iconv -f ISO-8859-1 -t UTF-8 input.txt > output.txt
```

### Métadonnées non disponibles

- Les métadonnées ne sont pas toujours présentes dans les documents
- Vérifier que extract_metadata=true est défini
- Certains PDFs ne contiennent pas de métadonnées

```bash
# Extraire sans métadonnées si nécessaire
curl -X POST "http://localhost:8008/api/v1/extract/document" \
  -F "file=@document.pdf" \
  -F "extract_metadata=false"
```

### Timeout sur gros fichiers

- Augmenter le timeout
- Diviser les gros fichiers
- Utiliser le traitement batch avec des fichiers plus petits

```bash
# Augmenter le timeout
export EXTRACT_TIMEOUT=60

# Ou modifier EXTRACT_TIMEOUT en variable d'environnement
```

### Authentification refusée

```bash
# En développement
export SKIP_AUTH=true

# En production, vérifier le token
curl -X POST "http://localhost:8008/api/v1/extract/document" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@document.docx"
```

## 📝 Exemples pratiques

### Extraire et analyser un document

```python
import requests

response = requests.post(
    "http://localhost:8008/api/v1/extract/document",
    headers={"Authorization": "Bearer TOKEN"},
    files={"file": open("rapport.docx", "rb")},
    data={"extract_metadata": "true"}
)

content = response.json()["content"]

# Analyser le contenu
print(f"Titre: {content['metadata']['title']}")
print(f"Auteur: {content['metadata']['author']}")
print(f"Mots: {content['word_count']}")
print(f"Caractères: {content['character_count']}")

# Traiter le texte
text = content["text_content"]
print(f"Premiers 100 caractères: {text[:100]}")
```

### Traitement batch de documents

```python
import requests
import os

# Préparer les fichiers
documents = [
    ("files", open("doc1.docx", "rb")),
    ("files", open("doc2.pdf", "rb")),
    ("files", open("sheet.xlsx", "rb"))
]

# Extraire tous les documents
response = requests.post(
    "http://localhost:8008/api/v1/extract/documents/batch",
    headers={"Authorization": "Bearer TOKEN"},
    files=documents,
    data={"extract_metadata": "true"}
)

result = response.json()
print(f"Réussi: {result['successful_extractions']}")
print(f"Échoué: {result['failed_extractions']}")

# Traiter les résultats
for content in result["contents"]:
    print(f"\n{content['filename']}:")
    print(f"  Type: {content['document_type']}")
    print(f"  Mots: {content['word_count']}")
```

### Pipeline d'indexation

```python
import requests

# Lister les fichiers uploadés
upload_response = requests.get(
    "http://localhost:8007/api/v1/upload/files",
    headers={"Authorization": "Bearer TOKEN"}
)

# Extraire le contenu de chaque fichier
for file_info in upload_response.json()["files"]:
    file_id = file_info["file_id"]

    # Télécharger le fichier
    download = requests.get(
        f"http://localhost:8007/api/v1/upload/files/{file_id}",
        headers={"Authorization": "Bearer TOKEN"}
    )

    # Extraire le contenu
    extract = requests.post(
        "http://localhost:8008/api/v1/extract/document",
        headers={"Authorization": "Bearer TOKEN"},
        files={"file": download.content},
        data={"extract_metadata": "true"}
    )

    # Indexer le contenu
    content = extract.json()["content"]
    print(f"Indexé: {file_info['filename']}")
```

---

**Service** : Document Extractor Tool
**Port** : 8008
**Environnement** : Production / Développement
**Authentification** : Bearer Token / Authentik
