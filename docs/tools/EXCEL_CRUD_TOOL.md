# 🔧 Excel CRUD Tool

## 📋 Vue d'ensemble

Le Excel CRUD Tool est une API REST pour la manipulation complète de fichiers Excel (.xlsx). Il permet de créer des classeurs avec multiples feuilles, lire et modifier les données, gérer les colonnes et lignes, et effectuer des recherches dans les classeurs Excel.

**Capacités principales :**
- Création de fichiers Excel avec plusieurs feuilles
- Lecture de toutes les feuilles ou feuilles spécifiques
- Modification de cellules individuelles
- Ajout et suppression de lignes et colonnes
- Recherche de contenu dans le classeur
- Gestion des métadonnées (auteur, titre)
- Support du format .xlsx uniquement

## 🏗️ Architecture

```
excel-crud-tool/
├── app/
│   ├── __init__.py
│   ├── main.py              # Application FastAPI
│   ├── models/
│   │   ├── __init__.py
│   │   └── excel_models.py  # Modèles Pydantic
│   ├── routers/
│   │   ├── __init__.py
│   │   └── excel.py         # Endpoints API
│   ├── services/
│   │   ├── __init__.py
│   │   └── excel_service.py # Logique métier
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
- openpyxl 3.1+
- pandas 2.1+
- xlsxwriter 3.1+

## 🔌 API REST

### Créer un fichier Excel

```bash
# POST /api/v1/excel/create
curl -X POST "http://localhost:8004/api/v1/excel/create" \
  -H "Content-Type: application/json" \
  -d '{
    "sheets": {
      "Ventes": [
        ["Produit", "Quantité", "Prix"],
        ["Laptop", 5, 1200],
        ["Souris", 15, 25]
      ],
      "Clients": [
        ["Nom", "Ville"],
        ["Alice", "Paris"],
        ["Bob", "Lyon"]
      ]
    },
    "metadata": {
      "title": "Rapport Mensuel",
      "author": "John Doe"
    }
  }' \
  --output workbook.xlsx
```

```python
# Python
import requests

response = requests.post(
    "http://localhost:8004/api/v1/excel/create",
    json={
        "sheets": {
            "Données": [
                ["Colonne1", "Colonne2"],
                ["Valeur1", "Valeur2"],
                ["Valeur3", "Valeur4"]
            ]
        },
        "metadata": {
            "title": "Mon Classeur",
            "author": "John Doe"
        }
    }
)

with open("workbook.xlsx", "wb") as f:
    f.write(response.content)
```

### Lire un fichier Excel

```bash
# POST /api/v1/excel/read
curl -X POST "http://localhost:8004/api/v1/excel/read" \
  -F "file=@workbook.xlsx"

# Réponse JSON
{
  "sheets": {
    "Ventes": [
      ["Produit", "Quantité", "Prix"],
      ["Laptop", 5, 1200]
    ]
  },
  "total_sheets": 2
}
```

### Lire une feuille spécifique

```bash
# POST /api/v1/excel/read/sheet
curl -X POST "http://localhost:8004/api/v1/excel/read/sheet" \
  -F "file=@workbook.xlsx" \
  -F "sheet_name=Ventes"

# Réponse
{
  "sheet_name": "Ventes",
  "data": [
    ["Produit", "Quantité", "Prix"],
    ["Laptop", 5, 1200]
  ],
  "rows": 2,
  "columns": 3
}
```

### Modifier une cellule

```bash
# PUT /api/v1/excel/cell
curl -X PUT "http://localhost:8004/api/v1/excel/cell" \
  -F "file=@workbook.xlsx" \
  -F "sheet_name=Ventes" \
  -F "row=2" \
  -F "column=2" \
  -F "value=10" \
  --output workbook_modified.xlsx
```

### Ajouter une feuille

```bash
# POST /api/v1/excel/sheet
curl -X POST "http://localhost:8004/api/v1/excel/sheet" \
  -F "file=@workbook.xlsx" \
  -F "sheet_name=Nouvelles" \
  --output workbook_modified.xlsx
```

### Supprimer une feuille

```bash
# DELETE /api/v1/excel/sheet
curl -X DELETE "http://localhost:8004/api/v1/excel/sheet" \
  -F "file=@workbook.xlsx" \
  -F "sheet_name=Archive" \
  --output workbook_modified.xlsx
```

### Ajouter une ligne

```bash
# POST /api/v1/excel/row
curl -X POST "http://localhost:8004/api/v1/excel/row" \
  -F "file=@workbook.xlsx" \
  -F "sheet_name=Ventes" \
  -F "row_index=3" \
  -F 'row_data=["Clavier",8,75]' \
  --output workbook_modified.xlsx
```

### Ajouter une colonne

```bash
# POST /api/v1/excel/column
curl -X POST "http://localhost:8004/api/v1/excel/column" \
  -F "file=@workbook.xlsx" \
  -F "sheet_name=Ventes" \
  -F "column_index=4" \
  -F 'column_name=Remise' \
  --output workbook_modified.xlsx
```

### Rechercher dans le fichier

```bash
# POST /api/v1/excel/search
curl -X POST "http://localhost:8004/api/v1/excel/search" \
  -F "file=@workbook.xlsx" \
  -F 'search_request={
    "search_term": "Paris",
    "case_sensitive": false
  }'

# Réponse
{
  "results": [
    {
      "sheet": "Clients",
      "row": 2,
      "column": 2,
      "value": "Paris"
    }
  ],
  "total_matches": 1
}
```

## 🚀 Utilisation

### Installation locale

```bash
# Naviguer au répertoire
cd /home/user/agent-pf/tools/excel-crud-tool

# Installer les dépendances
pip install -r requirements.txt

# Lancer l'API
uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload
```

### Déploiement Docker

```bash
# Build l'image
docker build -t excel-crud-tool .

# Lancer le container
docker run -p 8004:8000 excel-crud-tool

# Ou via docker-compose
docker-compose up -d excel-crud-tool
```

### Documentation interactive

- **Swagger UI** : http://localhost:8004/docs
- **ReDoc** : http://localhost:8004/redoc
- **OpenAPI JSON** : http://localhost:8004/openapi.json

## ⚙️ Configuration

### Variables d'environnement

```env
# Environnement
ENVIRONMENT=production
API_PORT=8004

# Authentification
SKIP_AUTH=false
AUTHENTIK_URL=http://authentik-server:9000

# CORS
CORS_ORIGINS=*

# Excel
MAX_FILE_SIZE=50000000  # 50 MB
MAX_ROWS=100000
```

### Mode développement

```bash
export ENVIRONMENT=development
export SKIP_AUTH=true
```

## 🐛 Troubleshooting

### Le fichier n'est pas créé correctement

- Vérifier que les données sont bien formatées (arrays de arrays)
- S'assurer que toutes les lignes ont le même nombre de colonnes
- Vérifier les types de données (string, number, boolean)

### Format .xls non supporté

- Convertir le fichier en .xlsx avant d'utiliser l'API
- Utiliser des outils externes pour convertir .xls en .xlsx
- Les anciennes versions Excel ne sont pas supportées

### Erreur de modification de cellule

```bash
# Vérifier les indices (commencent à 1)
# Exemple : row=1 pour la première ligne, column=1 pour la première colonne

curl -X PUT "http://localhost:8004/api/v1/excel/cell" \
  -F "file=@workbook.xlsx" \
  -F "sheet_name=Données" \
  -F "row=1" \
  -F "column=1" \
  -F "value=Nouvelle Valeur"
```

### Recherche sans résultat

- Vérifier l'orthographe du terme cherché
- Essayer sans case sensitivity (case_sensitive=false)
- Vérifier que le fichier contient les données attendues

### Authentification refusée

- Vérifier le token Bearer
- En développement, mettre SKIP_AUTH=true
- Vérifier que Authentik est opérationnel

---

**Service** : Excel CRUD Tool
**Port** : 8004
**Environnement** : Production / Développement
**Authentification** : Bearer Token / Authentik
