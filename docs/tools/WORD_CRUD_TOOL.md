# 🔧 Word CRUD Tool

## 📋 Vue d'ensemble

Le Word CRUD Tool est une API REST complète pour la manipulation profesionnelle de documents Microsoft Word (.docx). Il offre un ensemble d'opérations CRUD (Create, Read, Update, Delete) pour créer, lire, modifier et supprimer du contenu dans les documents Word avec support complet des styles, du formatage et des métadonnées.

**Capacités principales :**
- Création de documents Word avec paragraphes stylisés
- Extraction du contenu et des métadonnées
- Modification de paragraphes et formatage (gras, italique, souligné)
- Manipulation de tableaux
- Recherche et remplacement de texte
- Gestion complète des métadonnées (auteur, titre, sujet)

## 🏗️ Architecture

```
word-crud-tool/
├── app/
│   ├── __init__.py
│   ├── main.py                 # Application FastAPI
│   ├── models/
│   │   ├── __init__.py
│   │   └── word_models.py      # Modèles Pydantic
│   ├── routers/
│   │   ├── __init__.py
│   │   └── word.py             # Endpoints API
│   ├── services/
│   │   ├── __init__.py
│   │   └── word_service.py     # Logique métier
│   └── middleware/
│       ├── __init__.py
│       └── auth.py             # Authentification Keycloak
├── tests/
├── Dockerfile
├── requirements.txt
└── README.md
```

**Dépendances principales :**
- FastAPI 0.104+
- python-docx 0.8+
- Pydantic 2.5+
- Uvicorn 0.24+

## 🔌 API REST

### Créer un document Word

```bash
# Curl
curl -X POST "http://localhost:8001/api/v1/word/create" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Rapport Annuel",
    "paragraphs": [
      {
        "text": "Introduction",
        "style": "Heading 1",
        "bold": true
      },
      {
        "text": "Contenu du rapport...",
        "style": "Normal"
      }
    ]
  }' \
  --output rapport.docx
```

```python
# Python
import requests

response = requests.post(
    "http://localhost:8001/api/v1/word/create",
    json={
        "title": "Rapport Annuel",
        "paragraphs": [
            {
                "text": "Introduction",
                "style": "Heading 1",
                "bold": True
            },
            {"text": "Contenu...", "style": "Normal"}
        ]
    }
)

with open("rapport.docx", "wb") as f:
    f.write(response.content)
```

### Lire le contenu d'un document

```bash
# POST /api/v1/word/read
curl -X POST "http://localhost:8001/api/v1/word/read" \
  -F "file=@document.docx"

# Réponse JSON
{
  "paragraphs": [
    {
      "index": 0,
      "text": "Titre principal",
      "style": "Heading 1"
    }
  ],
  "total_paragraphs": 2
}
```

### Modifier un paragraphe

```bash
# PUT /api/v1/word/update/paragraph
curl -X PUT "http://localhost:8001/api/v1/word/update/paragraph" \
  -F "file=@document.docx" \
  -F "paragraph_index=0" \
  -F "new_text=Nouveau titre" \
  -F "bold=true" \
  --output document_modifie.docx
```

### Ajouter un paragraphe

```bash
# POST /api/v1/word/add/paragraph
curl -X POST "http://localhost:8001/api/v1/word/add/paragraph" \
  -F "file=@document.docx" \
  -F 'paragraph={
    "text": "Nouveau paragraphe",
    "style": "Normal"
  }' \
  --output document_modifie.docx
```

### Ajouter un tableau

```bash
# POST /api/v1/word/add/table
curl -X POST "http://localhost:8001/api/v1/word/add/table" \
  -F "file=@document.docx" \
  -F 'table_data={
    "rows": 3,
    "cols": 2,
    "data": [
      ["Colonne 1", "Colonne 2"],
      ["Données 1", "Données 2"],
      ["Données 3", "Données 4"]
    ]
  }' \
  --output document_modifie.docx
```

### Rechercher et remplacer du texte

```bash
# POST /api/v1/word/replace
curl -X POST "http://localhost:8001/api/v1/word/replace" \
  -F "file=@document.docx" \
  -F 'replace_data={
    "old_text": "ancien texte",
    "new_text": "nouveau texte",
    "case_sensitive": false
  }' \
  --output document_modifie.docx
```

### Récupérer les métadonnées

```bash
# GET /api/v1/word/metadata
curl -X GET "http://localhost:8001/api/v1/word/metadata" \
  -F "file=@document.docx"

# Réponse
{
  "author": "John Doe",
  "title": "Mon Document",
  "subject": "Rapport",
  "keywords": "rapport, 2024"
}
```

### Supprimer un paragraphe

```bash
# DELETE /api/v1/word/delete/paragraph/{paragraph_index}
curl -X DELETE "http://localhost:8001/api/v1/word/delete/paragraph/1" \
  -F "file=@document.docx" \
  --output document_modifie.docx
```

## 🚀 Utilisation

### Installation locale

```bash
# Cloner et naviguer
cd /home/user/agent-pf/tools/word-crud-tool

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Déploiement Docker

```bash
# Depuis la racine du projet
docker-compose up -d word-crud-tool

# Vérifier l'état
docker-compose ps word-crud-tool

# Voir les logs
docker-compose logs -f word-crud-tool
```

### Documentation interactive

Une fois lancée, accédez à :
- **Swagger UI** : http://localhost:8001/docs
- **ReDoc** : http://localhost:8001/redoc
- **OpenAPI JSON** : http://localhost:8001/openapi.json

## ⚙️ Configuration

### Variables d'environnement

```env
# Authentification Keycloak
WORD_CRUD_ENVIRONMENT=production
WORD_CRUD_CLIENT_ID=word-crud-tool
WORD_CRUD_CLIENT_SECRET=your-secret

# CORS
WORD_CRUD_CORS_ORIGINS=https://app.dev.local

# API
WORD_CRUD_API_PORT=8001
```

### Styles de paragraphes supportés

- `Normal` - Paragraphe normal
- `Heading 1` - Titre niveau 1
- `Heading 2` - Titre niveau 2
- `Heading 3` - Titre niveau 3
- `Title` - Titre du document
- `Subtitle` - Sous-titre

## 🐛 Troubleshooting

### Le service ne démarre pas

```bash
# Vérifier les logs
docker-compose logs word-crud-tool

# Reconstruire l'image
docker-compose build --no-cache word-crud-tool

# Redémarrer le service
docker-compose up -d --force-recreate word-crud-tool
```

### Service inaccessible via Traefik

1. Vérifier que Traefik est opérationnel :
   ```bash
   docker-compose ps traefik
   ```

2. Vérifier la configuration Traefik :
   ```bash
   docker-compose logs traefik | grep word-crud
   ```

3. Ajouter le domaine à `/etc/hosts` si nécessaire :
   ```bash
   echo "127.0.0.1 word-crud.dev.local" | sudo tee -a /etc/hosts
   ```

### Erreur d'authentification

Si vous rencontrez des erreurs d'authentification :
- Vérifier que Keycloak est opérationnel
- Vérifier que le client OAuth2 est correctement configuré
- En développement, désactiver l'authentification dans docker-compose

### Problème de taille de fichier

La limite de taille est généralement configurée au niveau de Traefik. Pour augmenter :
- Modifier la configuration Traefik dans docker-compose.yml
- Augmenter le maxRequestBodySize

---

**Service** : Word CRUD Tool
**Port** : 8001
**Environnement** : Production / Développement
**Authentification** : Keycloak OAuth2 (optionnel)
