# 🔧 File Upload Tool

## 📋 Vue d'ensemble

Le File Upload Tool est une API REST pour l'upload et la gestion de fichiers multiples. Il supporte une grande variété de formats (Word, Excel, PDF, images, texte, etc.), génère des IDs uniques et des checksums MD5 pour chaque fichier, et offre des opérations complètes de gestion (upload, téléchargement, suppression).

**Capacités principales :**
- Upload de fichiers multiples en une seule requête
- Support de 13+ formats de fichiers
- Limite de 50 MB par fichier
- Génération d'ID unique (UUID) pour chaque fichier
- Calcul de checksum MD5 pour l'intégrité
- Liste des fichiers uploadés
- Téléchargement par ID
- Récupération des métadonnées
- Suppression simple ou par lot

## 🏗️ Architecture

```
file-upload-tool/
├── app/
│   ├── main.py                 # Point d'entrée FastAPI
│   ├── models/
│   │   └── upload_models.py    # Modèles Pydantic
│   ├── routers/
│   │   └── upload.py           # Endpoints API
│   ├── services/
│   │   └── upload_service.py   # Logique métier
│   └── middleware/
│       └── auth.py             # Authentification
├── tests/                      # Tests unitaires
├── Dockerfile
├── requirements.txt
└── README.md
```

**Dépendances principales :**
- FastAPI 0.104+
- aiofiles (opérations fichiers asynchrones)
- Pydantic 2.5+

## 🔌 API REST

### Upload de fichiers

```bash
# POST /api/v1/upload/files
curl -X POST "http://localhost:8007/api/v1/upload/files" \
  -H "Authorization: Bearer <token>" \
  -F "files=@document1.pdf" \
  -F "files=@spreadsheet.xlsx" \
  -F "files=@image.png"

# Réponse JSON
{
  "success": true,
  "message": "3 fichier(s) uploadé(s) avec succès",
  "files": [
    {
      "file_id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "document1.pdf",
      "content_type": "application/pdf",
      "size": 245632,
      "upload_date": "2025-01-15T10:30:00",
      "file_path": "/tmp/file-uploads/550e8400-e29b-41d4-a716-446655440000.pdf"
    }
  ],
  "total_files": 3
}
```

```python
# Python
import requests

files = [
    ("files", open("document1.pdf", "rb")),
    ("files", open("spreadsheet.xlsx", "rb")),
    ("files", open("image.png", "rb"))
]

response = requests.post(
    "http://localhost:8007/api/v1/upload/files",
    headers={"Authorization": "Bearer YOUR_TOKEN"},
    files=files
)

for file_info in response.json()["files"]:
    print(f"ID: {file_info['file_id']}")
    print(f"Filename: {file_info['filename']}")
    print(f"Size: {file_info['size']} bytes")
```

### Lister les fichiers

```bash
# GET /api/v1/upload/files
curl -X GET "http://localhost:8007/api/v1/upload/files" \
  -H "Authorization: Bearer <token>"

# Réponse
{
  "success": true,
  "files": [
    {
      "file_id": "550e8400-e29b-41d4-a716-446655440000",
      "filename": "document1.pdf",
      "content_type": "application/pdf",
      "size": 245632,
      "upload_date": "2025-01-15T10:30:00"
    }
  ],
  "total_files": 1
}
```

### Télécharger un fichier

```bash
# GET /api/v1/upload/files/{file_id}
curl -X GET "http://localhost:8007/api/v1/upload/files/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>" \
  -o downloaded_file.pdf
```

### Récupérer les métadonnées

```bash
# GET /api/v1/upload/files/{file_id}/metadata
curl -X GET "http://localhost:8007/api/v1/upload/files/550e8400-e29b-41d4-a716-446655440000/metadata" \
  -H "Authorization: Bearer <token>"

# Réponse
{
  "file_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "document1.pdf",
  "content_type": "application/pdf",
  "size": 245632,
  "upload_date": "2025-01-15T10:30:00",
  "file_extension": ".pdf",
  "checksum": "5d41402abc4b2a76b9719d911017c592"
}
```

### Supprimer un fichier

```bash
# DELETE /api/v1/upload/files/{file_id}
curl -X DELETE "http://localhost:8007/api/v1/upload/files/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"

# Réponse
{
  "success": true,
  "message": "Fichier supprimé avec succès"
}
```

### Supprimer plusieurs fichiers

```bash
# POST /api/v1/upload/files/delete-multiple
curl -X POST "http://localhost:8007/api/v1/upload/files/delete-multiple" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "file_ids": [
      "550e8400-e29b-41d4-a716-446655440000",
      "660e8400-e29b-41d4-a716-446655440001"
    ]
  }'

# Réponse
{
  "success": true,
  "message": "2 fichier(s) supprimé(s)",
  "deleted_count": 2
}
```

### Supprimer tous les fichiers

```bash
# DELETE /api/v1/upload/files
curl -X DELETE "http://localhost:8007/api/v1/upload/files" \
  -H "Authorization: Bearer <token>"

# Réponse
{
  "success": true,
  "message": "Tous les fichiers ont été supprimés",
  "deleted_count": 5
}
```

## 🚀 Utilisation

### Installation locale

```bash
# Naviguer au répertoire
cd /home/user/agent-pf/tools/file-upload-tool

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
uvicorn app.main:app --host 0.0.0.0 --port 8007 --reload
```

### Déploiement Docker

```bash
# Build l'image
docker build -t file-upload-tool .

# Lancer le container
docker run -p 8007:8007 file-upload-tool

# Ou via docker-compose
docker-compose up -d file-upload-tool
```

### Documentation interactive

- **Swagger UI** : http://localhost:8007/docs
- **ReDoc** : http://localhost:8007/redoc

## ⚙️ Configuration

### Variables d'environnement

```env
# Authentification
SKIP_AUTH=false
AUTHENTIK_URL=http://authentik-server:9000

# CORS
CORS_ORIGINS=*

# API
API_PORT=8007

# Fichiers
MAX_FILE_SIZE=52428800  # 50 MB
UPLOAD_DIR=/tmp/file-uploads
```

### Extensions supportées

- **Documents** : `.pdf`, `.docx`, `.doc`, `.xlsx`, `.xls`
- **Texte** : `.txt`, `.csv`, `.json`, `.xml`
- **Images** : `.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`

### Mode développement

```bash
export SKIP_AUTH=true
```

## 🐛 Troubleshooting

### Erreur "File too large"

- Vérifier la taille du fichier (max 50 MB)
- Compresser le fichier si possible
- Diviser le fichier en plusieurs parties

```bash
# Vérifier la taille
ls -lh document.pdf

# Compresser
gzip document.pdf
```

### Extension non supportée

- Convertir le fichier vers un format supporté
- Vérifier la liste des extensions autorisées

```bash
# Format non supporté : document.pages
# Solution : convertir en PDF ou DOCX
```

### Authentification refusée

```bash
# Vérifier le token Bearer
curl -X GET "http://localhost:8007/api/v1/upload/files" \
  -H "Authorization: Bearer YOUR_TOKEN"

# En développement, mettre SKIP_AUTH=true
```

### Fichier non trouvé après upload

- Vérifier que l'upload a réussi (status 200)
- Vérifier le file_id retourné
- Vérifier que le disque a assez d'espace

```bash
# Vérifier l'espace disque
df -h /tmp

# Vérifier les fichiers uploadés
ls -la /tmp/file-uploads/
```

### Erreur de checksum

- Le fichier peut être corrompu
- Réuploader le fichier
- Vérifier l'intégrité avec MD5

```bash
# Calculer le MD5 local
md5sum document.pdf

# Comparer avec le checksum retourné par l'API
```

## 📝 Exemples pratiques

### Télécharger plusieurs fichiers

```python
import requests
import os

# Préparer les fichiers
files = [
    ("files", open(f, "rb"))
    for f in ["doc1.pdf", "doc2.xlsx", "image.png"]
]

# Upload
response = requests.post(
    "http://localhost:8007/api/v1/upload/files",
    headers={"Authorization": "Bearer TOKEN"},
    files=files
)

# Sauvegarder les IDs
file_ids = [f["file_id"] for f in response.json()["files"]]
print(f"Uploaded {len(file_ids)} files")
```

### Gérer les fichiers

```python
import requests

# Lister
response = requests.get(
    "http://localhost:8007/api/v1/upload/files",
    headers={"Authorization": "Bearer TOKEN"}
)
files = response.json()["files"]
print(f"Total files: {len(files)}")

# Supprimer les anciens fichiers
for f in files:
    if should_delete(f["upload_date"]):
        requests.delete(
            f"http://localhost:8007/api/v1/upload/files/{f['file_id']}",
            headers={"Authorization": "Bearer TOKEN"}
        )
```

---

**Service** : File Upload Tool
**Port** : 8007
**Environnement** : Production / Développement
**Authentification** : Bearer Token / Authentik
